import { protocol } from "./protocol";
import { PintP2P } from "./p2p";
import { ethers } from "ethers";
import { pipe } from "it-pipe";
import * as lp from "it-length-prefixed";
import {
  TPCEcdsaKeyGen as TPC,
  TPCEcdsaSign as TPCsign,
} from "@safeheron/two-party-ecdsa-js";
import { EventEmitter } from "events";
import pushable from "it-pushable";
import { mapValues } from "lodash";
import { toWETH } from "./trade";
import BN from "bn.js";
import {
  keyshareToAddress,
  createContract,
  leftZeroPad,
  hashOffer,
  toBigInt,
} from "./trade";
import { IOffer } from "./types";
import PeerId from "peer-id";
import { createLogger } from "./logger";

const logger = createLogger("pintswap");

const { getAddress, getCreateAddress, Contract, Transaction } = ethers;

const coerceToWeth = async (address, signer) => {
  if (address === ethers.ZeroAddress) {
    const { chainId } = await signer.provider.getNetwork();
    return toWETH(chainId);
  }
  return address;
};

const defer = () => {
  let resolve,
    reject,
    promise = new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });
  return {
    resolve,
    reject,
    promise,
  };
};

const transactionToObject = (tx) => ({
  nonce: tx.nonce,
  value: tx.value,
  from: tx.from,
  gasPrice: tx.gasPrice,
  gasLimit: tx.gasLimit,
  chainId: tx.chainId,
  data: tx.data,
  maxFeePerGas: tx.maxFeePerGas,
  maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
});

export class Pintswap extends PintP2P {
  public signer: any;
  public offers: Map<string, IOffer> = new Map();
  public logger: ReturnType<typeof createLogger>;

  static async initialize({ signer }) {
    return await new Promise(async (resolve, reject) => {
      try {
        let peerId = await PeerId.create();
        resolve(new Pintswap({ signer, peerId }));
      } catch (error) {
        reject(error);
      }
    });
  }

  constructor({ signer, peerId }) {
    super({ signer, peerId });
    this.signer = signer;
    this.logger = logger;
  }

  async startNode() {
    await this.handleBroadcastedOffers();
    await this.start();
    this.emit(`pintswap/node/status`, 1);
  }

  async stopNode() {
    await this.unhandle([
      "/pintswap/0.1.0/orders",
      "/pintswap/0.1.0/create-trade",
    ]);
    await this.stop();
    this.emit(`pintswap/node/status`, 0);
  }

  async handleBroadcastedOffers() {
    const address = await this.signer.getAddress();
    await this.handle("/pintswap/0.1.0/orders", ({ stream }) => {
      this.logger.debug("handling order request from peer");
      this.emit(`/pintswap/request/orders`);
      let _offerList = protocol.OfferList.encode({
        offers: [...this.offers.values()].map((v) =>
          mapValues(v, (v) => Buffer.from(ethers.toBeArray(v)))
        ),
      }).finish();
      pipe([_offerList], lp.encode(), stream.sink);
    });

    await this.handle(
      "/pintswap/0.1.0/create-trade",
      async ({ stream, connection, protocol }) => {
        this.emit(`/pintswap/request/create-trade`);
        let context2 = await TPC.P2Context.createContext();
        let messages = pushable();
        let _event = new EventEmitter();
        let sharedAddress = null;
        let takerAddress = null;
        let keyshareJson = null;
        let signContext = null;

        _event.on("/event/ecdsa-keygen/party/2", (step, message) => {
          switch (step) {
            case 1:
              this.logger.debug(
                `MAKER:: /event/ecdsa-keygen/party/2 handling message: ${step}`
              );
              messages.push(context2.step1(message));
              messages.push(Buffer.from(address.substr(2), "hex"));
              this.logger.debug(
                "MAKER: pushed context2.step1(message) + address"
              );
              break;
            case 3:
              this.logger.debug(
                `MAKER:: /event/ecdsa-keygen/party/2 handling message: ${step}`
              );
              context2.step2(message);
              // set keyshare and shared address
              keyshareJson = context2.exportKeyShare().toJsonObject();
              sharedAddress = keyshareToAddress(keyshareJson);
              break;
            default:
              throw new Error(
                "Unexpected message on event /ecdsa-keygen/party/2"
              );
              break;
          }
        });
        let offer = null;

        _event.on("/event/approve-contract", async (offerHashBuf) => {
          try {
            offer = this.offers.get(offerHashBuf.toString());
            this.emit(
              `pintswap/request/create-trade/fulfilling`,
              offerHashBuf.toString(),
              offer
            ); // emits offer hash and offer object to frontend
            await this.signer.provider.waitForTransaction(
              (
                await this.approveTradeAsMaker(offer, sharedAddress as string)
              ).hash
            );
            messages.push(Buffer.from("ack"));
          } catch (err) {
            this.logger.error(err);
            throw new Error("couldn't find offering");
          }
          this.logger.debug(
            `MAKER:: /event/approve-contract approved offer with offer hash: ${offerHashBuf.toString()}`
          );
        });
	let signContextPromise = defer();

        _event.on("/event/ecdsa-sign/party/2/init", async (serializedTx) => {
          try {
            const serialized = ethers.hexlify(serializedTx);
            this.logger.debug(
              `MAKER:: /event/ecdsa-sign/party/2/init received transaction: ${serialized}`
            );
            const transaction = ethers.Transaction.from(serialized);
            if (transaction.to) {
              throw Error("transaction must not have a recipient");
            }
	    this.logger.debug('comparing contract');
            if (
              transaction.data !==
              createContract(
                offer,
                await this.signer.getAddress(),
                takerAddress,
                (await this.signer.provider.getNetwork()).chainId
              )
            )
              throw Error("transaction data is not a pintswap");
	    this.logger.debug('MAKER: making signContext');
            signContext = await TPCsign.P2Context.createContext(
              JSON.stringify(keyshareJson, null, 4),
              new BN(transaction.unsignedHash.substr(2), 16)
            );
	    signContextPromise.resolve();
          } catch (e) {
            console.error(e);
            this.logger.error(e);
	    _event.emit('error', e);
          }
        });

        _event.on("/event/ecdsa-sign/party/2", (step, message) => {
          try {
            switch (step) {
              case 1:
                this.logger.debug(
                  `MAKER:: /event/ecdsa-sign/party/2 handling message: ${step}`
                );
                messages.push(signContext.step1(message));
                this.logger.debug("MAKER: pushed signContext.step1(message)");
                break;
              case 3:
                this.logger.debug(
                  `MAKER:: /event/ecdsa-sign/party/2 handling message ${step}`
                );
                messages.push(signContext.step2(message));
                messages.end();
                break;
              // safe to end message iterator
              default:
                throw new Error(
                  "Unexpeced message on event /ecdsa-sign/party/2"
                );
                break;
            }
          } catch (e) {
            this.logger.error(e);
            _event.emit("error", e);
          }
        });
        const self = this;

        pipe(stream.source, lp.decode(), async function (source) {
          const { value: keygenMessage1 } = await source.next();
          _event.emit("/event/ecdsa-keygen/party/2", 1, keygenMessage1.slice());
          const { value: keygenMessage3 } = await source.next();
          _event.emit("/event/ecdsa-keygen/party/2", 3, keygenMessage3.slice());

          const { value: offerHashBuf } = await source.next();
          _event.emit("/event/approve-contract", offerHashBuf.slice());

          self.logger.debug("SHOULD RECEIVE SERIALIZED");
          const { value: serializedTx } = await source.next();
          const { value: _takerAddress } = await source.next();
          takerAddress = ethers.getAddress(
            ethers.hexlify(_takerAddress.slice())
          );
          self.logger.debug("RECEIVED SERIALIZED", serializedTx.slice());
          _event.emit("/event/ecdsa-sign/party/2/init", serializedTx.slice());
	  await signContextPromise.promise;

          const { value: signMessage1 } = await source.next();
          self.logger.debug("MAKER: received signMessage1");
          _event.emit("/event/ecdsa-sign/party/2", 1, signMessage1.slice());
          const { value: signMessage3 } = await source.next();
          _event.emit("/event/ecdsa-sign/party/2", 3, signMessage3.slice());
        });

        await pipe(messages, lp.encode(), stream.sink);
      }
    );
  }

  // adds new offer to this.offers: Map<hash, IOffer>
  broadcastOffer(_offer: IOffer) {
    this.logger.debug("trying to list new offer");
    this.offers.set(hashOffer(_offer), _offer);
  }

  // Takes in a peerId and returns a list of exisiting trades
  async getTradesByPeerId(peerId: string) {
    let pid = PeerId.createFromB58String(peerId);
    const { stream } = await this.dialProtocol(pid, "/pintswap/0.1.0/orders");
    const result = await pipe(
      stream.source,
      lp.decode(),
      async function collect(source) {
        const vals = [];
        for await (const val of source) {
          vals.push(val);
        }
        return vals[0].slice();
      }
    );
    let offerList = protocol.OfferList.toObject(
      protocol.OfferList.decode(result),
      {
        enums: String,
        longs: String,
        bytes: String,
        defaults: true,
        arrays: true,
        objects: true,
        oneofs: true,
      }
    );

    let remap = offerList.offers.map((v) => {
      return mapValues(v, (v) => {
        const address = ethers.hexlify(ethers.decodeBase64(v));
        return "0x" + leftZeroPad(address.substr(2), 40);
      });
    });

    return Object.assign(offerList, { offers: remap });
  }

  async getTradeAddress(sharedAddress: string) {
    const address = getCreateAddress({
      nonce: await this.signer.provider.getTransactionCount(sharedAddress),
      from: sharedAddress,
    });
    this.logger.debug("TRADE ADDRESS: " + address);
    return address;
  }
  async;

  async approveTradeAsMaker(offer: IOffer, sharedAddress: string) {
    const tradeAddress = await this.getTradeAddress(sharedAddress);
    const token = new Contract(
      await coerceToWeth(ethers.getAddress(offer.givesToken), this.signer),
      [
        "function approve(address, uint256) returns (bool)",
        "function allowance(address, address) view returns (uint256)",
        "function balanceOf(address) view returns (uint256)",
      ],
      this.signer
    );
    this.logger.debug("MAKER ADDRESS", await this.signer.getAddress());
    logger.debug(
      "MAKER BALANCE BEFORE APPROVING " +
        ethers.formatEther(
          await token.balanceOf(await this.signer.getAddress())
        )
    );
    if (offer.givesToken === ethers.ZeroAddress) {
      const { chainId } = await this.signer.provider.getNetwork();
      await new ethers.Contract(
        toWETH(chainId),
        ["function deposit()"],
        this.signer
      ).deposit({ value: offer.givesAmount });
    }
    const tx = await token.approve(tradeAddress, offer.givesAmount);
    this.logger.debug("TRADE ADDRESS", tradeAddress);
    this.logger.debug(
      "MAKER BALANCE AFTER APPROVING " +
        ethers.formatEther(
          await token.balanceOf(await this.signer.getAddress())
        )
    );
    this.logger.debug(
      "MAKER ALLOWANCE AFTER APPROVING " +
        ethers.formatEther(
          await token.allowance(await this.signer.getAddress(), tradeAddress)
        )
    );
    return tx;
  }

  async approveTradeAsTaker(offer: IOffer, sharedAddress: string) {
    const tradeAddress = await this.getTradeAddress(sharedAddress);
    const token = new Contract(
      await coerceToWeth(getAddress(offer.getsToken), this.signer),
      [
        "function approve(address, uint256) returns (bool)",
        "function allowance(address, address) view returns (uint256)",
        "function balanceOf(address) view returns (uint256)",
      ],
      this.signer
    );
    this.logger.debug("TAKER ADDRESS", await this.signer.getAddress());
    this.logger.debug(
      "TAKER BALANCE BEFORE APPROVING " +
        ethers.formatEther(
          await token.balanceOf(await this.signer.getAddress())
        )
    );
    if (offer.getsToken === ethers.ZeroAddress) {
      const { chainId } = await this.signer.provider.getNetwork();
      await new ethers.Contract(
        toWETH(chainId),
        ["function deposit()"],
        this.signer
      ).deposit({ value: offer.getsAmount });
    }
    const tx = await token.approve(tradeAddress, offer.getsAmount);
    this.logger.debug(
      "TAKER BALANCE AFTER APPROVING " +
        ethers.formatEther(
          await token.balanceOf(await this.signer.getAddress())
        )
    );
    return tx;
  }
  async prepareTransaction(
    offer: IOffer,
    maker: string,
    sharedAddress: string
  ) {
    const contract = createContract(
      offer,
      maker,
      await this.signer.getAddress(),
      (await this.signer.provider.getNetwork()).chainId
    );
    const gasPrice = toBigInt(await this.signer.provider.getGasPrice());

    const gasLimit =
      toBigInt(
        await this.signer.provider.estimateGas({
          data: contract,
          from: sharedAddress,
          gasPrice,
        })
      ) + BigInt(26000);
    this.logger.debug("GASLIMIT: " + String(Number(gasLimit)));
    return {
      data: contract,
      gasPrice,
      gasLimit,
    };
  }

  async createTransaction(txParams: any, sharedAddress: string) {
    const { gasLimit, gasPrice, data } = txParams;

    let sharedAddressBalance = toBigInt(
      await this.signer.provider.getBalance(sharedAddress)
    );
    this.logger.debug(
      `network ${(await this.signer.provider.getNetwork()).chainId}`,
      sharedAddressBalance,
      gasPrice,
      gasLimit
    );
    return Object.assign(new Transaction(), txParams, {
      chainId: (await this.signer.provider.getNetwork()).chainId,
      nonce: await this.signer.provider.getTransactionCount(sharedAddress),
      value:
        sharedAddressBalance >= gasPrice * gasLimit
          ? sharedAddressBalance - gasPrice * gasLimit
          : BigInt(0), // check: balance >= ( gasPrice * gasLimit ) | resolves ( balance - (gasPrice * gasLimit) ) or 0
    });
  }

  async createTrade(peer, offer) {
    this.logger.debug(`Acting on offer ${offer} with peer ${peer}`);

    let { stream } = await this.dialProtocol(peer, [
      "/pintswap/0.1.0/create-trade",
    ]);

    let _event = new EventEmitter() as any;

    let context1 = await TPC.P1Context.createContext();
    let signContext = null;
    const message1 = context1.step1();
    const messages = pushable();
    let tx = null;
    let sharedAddress = null;
    let makerAddress = null;
    let keyshareJson = null;
    const emit = _event.emit;
    _event.emit = function (...args) {
      if (["tick", "error"].includes(args[0])) this._deferred = defer();
      return emit.apply(this, args);
    };
    _event.wait = async function () {
      if (!this._deferred) return;
      return await this._deferred.promise;
    };
    _event.on("tick", () => _event._deferred.resolve());
    _event.on("error", (e) => _event._deferred.reject(e));
    _event.on("/event/ecdsa-keygen/party/1", (step, message) => {
      try {
        switch (step) {
          case 2:
            this.logger.debug(
              `TAKER:: /event/ecdsa-keygen/party/1 handling message: ${step}`
            );

            messages.push(context1.step2(message));
            keyshareJson = context1.exportKeyShare().toJsonObject();
            sharedAddress = keyshareToAddress(keyshareJson);
            break;
          default:
            throw new Error(
              "unexpected message on event /ecdsa-keygen/party/1"
            );
            break;
        }
      } catch (e) {
        _event.emit("error", e);
      }
      _event.emit("tick");
    });

    /*
     * Pintswap#approveAsMaker
     */
    _event.on("/event/approve-contract", async () => {
      try {
        // approve as maker
        this.logger.debug(
          `TAKER:: /event/approve-contract approving offer: ${offer} of shared Address ${sharedAddress}`
        );
        messages.push(Buffer.from(hashOffer(offer)));
        await this.signer.provider.waitForTransaction(
          (
            await this.approveTradeAsTaker(offer, sharedAddress as string)
          ).hash
        );
        this.logger.debug("TAKER APPROVED");
      } catch (e) {
        _event.emit("error", e);
      }
      _event.emit("tick");
    });
    let ethTransaction = null;

    _event.on("/event/build/tx", async () => {
      try {
        this.logger.debug(
          `/event/build/tx funding sharedAddress ${sharedAddress}`
        );
        const txParams = await this.prepareTransaction(
          offer,
          makerAddress,
          sharedAddress
        );
        ethTransaction = await this.signer.sendTransaction({
          to: sharedAddress,
          value: txParams.gasPrice * txParams.gasLimit, // change to gasPrice * gasLimit
        });
        await this.signer.provider.waitForTransaction(ethTransaction.hash);

        this.logger.debug(
          `TAKER:: /event/build/tx building transaction with params: ${offer}, ${await this.signer.getAddress()}, ${sharedAddress}`
        );
        tx = await this.createTransaction(txParams, sharedAddress as string);
        this.logger.debug(`TAKER:: /event/build/tx built transaction`);

        let _uhash = (tx.unsignedHash as string).slice(2);
        const serialized = Buffer.from(ethers.toBeArray(tx.unsignedSerialized));
        signContext = await TPCsign.P1Context.createContext(
          JSON.stringify(keyshareJson, null, 4),
          new BN(_uhash, 16)
        );

        this.logger.debug(
          `TAKER:: /event/build/tx sending unsigned transaction hash & signing step 1`
        );

        messages.push(serialized);
        messages.push(
          Buffer.from(ethers.toBeArray(await this.signer.getAddress()))
        );
        messages.push(signContext.step1());
        this.logger.debug("TAKER: pushed signContext.step1()");
      } catch (e) {
        this.logger.error(e);
        _event.emit("error", e);
      }
      _event.emit("tick");
    });

    _event.on("/event/ecdsa-sign/party/1", async (step, message) => {
      try {
        switch (step) {
          case 2:
            this.logger.debug(
              `TAKER:: /event/ecdsa-sign/party/1 handling message ${step}`
            );
            messages.push(signContext.step2(message));
            break;
          case 4:
            this.logger.debug(
              `TAKER:: /event/ecdsa-sign/party/1 handling message ${step}`
            );
            signContext.step3(message);
            let [r, s, v] = signContext.exportSig();
            tx.signature = ethers.Signature.from({
              r: "0x" + leftZeroPad(r.toString(16), 64),
              s: "0x" + leftZeroPad(s.toString(16), 64),
              v: v + 27,
            });
            let txReceipt =
              typeof this.signer.provider.sendTransaction == "function"
                ? await this.signer.provider.sendTransaction(tx.serialized)
                : await this.signer.provider.broadcastTransaction(
                    tx.serialized
                  );
            this.logger.debug(
              require("util").inspect(
                await this.signer.provider.waitForTransaction(txReceipt.hash),
                {
                  colors: true,
                  depth: 15,
                }
              )
            );
            messages.end();
            stream.close();
            break;
          default:
            throw new Error("Unexpeced message on event /ecdsa-sign/party/2");
            break;
        }
        _event.emit("tick");
      } catch (e) {
        _event.emit("error", e);
      }
    });
    const self = this;
    let result = pipe(stream.source, lp.decode(), async function (source) {
      try {
        messages.push(message1); // message 1
        const { value: keygenMessage_2 } = await source.next(); // message 2
        self.logger.debug(keygenMessage_2.slice());
        const { value: _makerAddress } = await source.next(); // message 2
        self.logger.debug(_makerAddress.slice());
        makerAddress = ethers.getAddress(ethers.hexlify(_makerAddress.slice()));
        _event.emit("/event/ecdsa-keygen/party/1", 2, keygenMessage_2.slice()); // message 3
        await _event.wait();
        _event.emit("/event/approve-contract");
        await _event.wait();
        await source.next();
        self.logger.debug("enter /event/build/tx");
        _event.emit("/event/build/tx");
        self.logger.debug("TAKER: WAITING FOR /event/build/tx");
        await _event.wait();
        self.logger.debug("TAKER: COMPLETED");
        const { value: signMessage_2 } = await source.next();
        self.logger.debug("TAKER: GOT signMessage_2");
        _event.emit("/event/ecdsa-sign/party/1", 2, signMessage_2.slice());
        self.logger.debug("TAKER: WAITING FOR /event/ecdsa-sign/party/1");
        await _event.wait();
        self.logger.debug("TAKER: COMPLETED");
        const { value: signMessage_4 } = await source.next();
        self.logger.debug("TAKER: GOT signMessage_4");
        _event.emit("/event/ecdsa-sign/party/1", 4, signMessage_4.slice());
        await _event.wait();
      } catch (e) {
        self.logger.error(e);
      }
    });

    await pipe(messages, lp.encode(), stream.sink);

    return true;
  }
}
