import { protocol } from "./protocol";
import { PintP2P } from "./p2p";
import { ethers } from "ethers";
import { pipe } from "it-pipe";
import * as lp from "it-length-prefixed";
import { handleKeygen, initKeygen } from "./utils";
import { TPCEcdsaKeyGen } from "@safeheron/two-party-ecdsa-js";
import { emasm } from "emasm";

const {
  solidityPackedKeccak256,
  hexlify,
  getAddress,
  getCreateAddress,
  VoidSigner,
  Contract,
  Transaction,
} = ethers;

interface IOffer {
  givesToken: string;
  getsToken: string;
  givesAmount: any;
  getsAmount: any;
}

export const createContract = (offer: IOffer, maker: string, taker: string) => {
  return emasm([
    "pc",
    "returndatasize",
    "0x64",
    "returndatasize",
    "returndatasize",
    getAddress(offer.givesToken),
    "0x23b872dd00000000000000000000000000000000000000000000000000000000",
    "returndatasize",
    "mstore",
    getAddress(maker),
    "0x4",
    "mstore",
    getAddress(taker),
    "0x24",
    "mstore",
    hexlify(offer.givesAmount),
    "0x44",
    "mstore",
    "gas",
    "call",
    "0x0",
    "0x0",
    "0x64",
    "0x0",
    "0x0",
    getAddress(offer.getsToken),
    getAddress(taker),
    "0x4",
    "mstore",
    getAddress(maker),
    "0x24",
    "mstore",
    hexlify(offer.getsAmount),
    "0x44",
    "mstore",
    "gas",
    "call",
    "and",
    "failure",
    "jumpi",
    getAddress(maker),
    "selfdestruct",
    ["failure", ["0x0", "0x0", "revert"]],
  ]);
};

export const hashOffer = (o) => {
  return solidityPackedKeccak256(
    ["address", "address", "uint256", "uint256"],
    [
      getAddress(o.givesToken),
      getAddress(o.getsToken),
      o.givesAmount,
      o.getsAmount,
    ]
  );
};

export class Pintswap extends PintP2P {
  public signer: any;
  public offers: Map<string, IOffer> = new Map();
  // public offers: IOffer[];

  static async initialize({ signer }) {
    let peerId = await this.peerIdFromSeed(await signer.getAddress());
    const self = new this({ signer, peerId });
    await self.handle("/pintswap/0.1.0/orders", (duplex) =>
      pipe(
        duplex.stream.sink,
        lp.encode(),
        protocol.OfferList.encode({ offers: self.offers.values() })
      )
    );

    await self.handle(
      "/pintswap/0.1.0/create-trade",
      async ({ stream, connection, protocol }) => {
          let [ sharedAddress, keyshare ] = await handleKeygen({ stream });
          console.log(sharedAddress, "maker");
          // await self.approveTradeAsMaker(offer, sharedAddress as string);
          // try {
        // } catch (error) {
          // throw new Error("Failed to generate key share or compute shared address");
        // }

        // const transaction = await self.createTransaction(
        //   offer,
        //   self.signer.wallet,
        //   sharedAddress as string
        // );
        /*
     await this.approveTradeAsMaker(...)
     // wait for taker to approve
     const transaction = await this.createTransaction(offer, maker, taker);
     const signedTransaction = new Transaction({
       ...transaction,
       ...await sign(transaction)
     });
     const tx = await this.signer.provider.sendTransaction(signedTransaction);
    await tx.wait();
   */
      },
    );
    await self.start();
    return self;
  }

  constructor({ signer, peerId }) {
    super({ signer, peerId });
    this.signer = signer;
  }

  // adds new offer to this.offers: Map<hash, IOffer>
  listNewOffer(_offer: IOffer) {
    this.offers.set(hashOffer(_offer), _offer);
  }

  async getTradeAddress(sharedAddress: string) {
    return getCreateAddress({
      nonce: await this.signer.provider.getTransactionCount(sharedAddress), 
      from: sharedAddress, 
    });
  }
  async approveTradeAsMaker(offer: IOffer, sharedAddress: string) {
    const tradeAddress = await this.getTradeAddress(sharedAddress);
    return await new Contract(
      offer.givesToken,
      ["function approve(address, uint256) returns (bool)"],
      this.signer
    ).approve(tradeAddress, offer.givesAmount);
  }
  async approveTradeAsTaker(offer: IOffer, sharedAddress: string) {
    const tradeAddress = await this.getTradeAddress(sharedAddress);
    return await new Contract(
      getAddress(offer.getsToken),
      ["function approve(address, uint256) returns (bool)"],
      this.signer
    ).approve(tradeAddress, offer.getsAmount);
  }
  async createTransaction(offer: IOffer, maker: string, sharedAddress: string) {
    const contract = createContract(
      offer,
      maker,
      await this.signer.getAddress()
    );
    const gasPrice = await this.signer.provider.getGasPrice();
    const gasLimit = await this.signer.provider.estimateGas({
      data: contract,
      from: sharedAddress,
      gasPrice,
    });
    return Object.assign(new Transaction(), {
      data: createContract(offer, maker, await this.signer.getAddress()),
      gasPrice,
      gasLimit,
      nonce: await this.signer.provider.getTransactionCount(sharedAddress),
      value: (await this.signer.provider.getBalance(sharedAddress)).sub(
        gasPrice.mul(gasLimit)
      ),
    });
  }

  async createTrade(peer, offer) {
    // generate 2p-ecdsa keyshare with indicated peer
    let { stream } = await this.dialProtocol(peer, [
      "/pintswap/0.1.0/create-trade",
    ]);
      try {
        let [ sharedAddress, keyshare ] = await initKeygen(stream);
        if (typeof sharedAddress == "string") await this.approveTradeAsTaker(offer, sharedAddress);
        const transaction = await this.createTransaction(
          offer,
          this.signer.wallet,
          sharedAddress as string
        );
      } catch (error) {
        throw error
      }


  }

}
