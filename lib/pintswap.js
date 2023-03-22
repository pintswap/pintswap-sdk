"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pintswap = exports.hashOffer = exports.createContract = void 0;
const protocol_1 = require("./protocol");
const p2p_1 = require("./p2p");
const ethers_1 = require("ethers");
const it_pipe_1 = require("it-pipe");
const lp = __importStar(require("it-length-prefixed"));
const two_party_ecdsa_js_1 = require("@safeheron/two-party-ecdsa-js");
const emasm_1 = require("emasm");
const node_events_1 = require("node:events");
const it_pushable_1 = __importDefault(require("it-pushable"));
const bn_js_1 = __importDefault(require("bn.js"));
const { solidityPackedKeccak256, hexlify, getAddress, getCreateAddress, VoidSigner, Contract, Transaction, } = ethers_1.ethers;
const createContract = (offer, maker, taker) => {
    return (0, emasm_1.emasm)([
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
exports.createContract = createContract;
const hashOffer = (o) => {
    return solidityPackedKeccak256(["address", "address", "uint256", "uint256"], [
        getAddress(o.givesToken),
        getAddress(o.getsToken),
        o.givesAmount,
        o.getsAmount,
    ]);
};
exports.hashOffer = hashOffer;
function keyshareToAddress(keyshareJsonObject) {
    let { Q } = keyshareJsonObject;
    let prepend = new bn_js_1.default(Q.y, 16).mod(new bn_js_1.default(2)).isZero() ? "0x02" : "0x03";
    let derivedPubKey = prepend + new bn_js_1.default(Q.x, 16).toString(16);
    return ethers_1.ethers.computeAddress(derivedPubKey);
}
class Pintswap extends p2p_1.PintP2P {
    // public offers: IOffer[];
    static initialize({ signer }) {
        return __awaiter(this, void 0, void 0, function* () {
            let peerId = yield this.peerIdFromSeed(yield signer.getAddress());
            const self = new this({ signer, peerId });
            // self.on("/internal/ecdsa-keygen/context-1", (_event) => {
            //   _event.on('/internal/ecdsa-keygen/context-1', (step) => { console.log(`${step}`) } )
            //   _event.on('/internal/ecdsa-keygen/context-1/finish', (jsonKey) => {
            //   })
            // });
            // self.on("/internal/ecdsa-keygen/context-2", (_event) => {
            // });
            yield self.handle("/pintswap/0.1.0/orders", (duplex) => (0, it_pipe_1.pipe)(duplex.stream.sink, lp.encode(), protocol_1.protocol.OfferList.encode({ offers: self.offers.values() })));
            yield self.handle("/pintswap/0.1.0/create-trade", ({ stream, connection, protocol }) => __awaiter(this, void 0, void 0, function* () {
                let context2 = yield two_party_ecdsa_js_1.TPCEcdsaKeyGen.P2Context.createContext();
                let messages = (0, it_pushable_1.default)();
                let _event = new node_events_1.EventEmitter();
                _event.on('/internal/ecdsa/party2/inbound/msg/1', (message) => {
                    messages.push(context2.step1(message));
                });
                _event.on('/internal/ecdsa/party2/inbound/msg/3', (message) => {
                    messages.push(context2.step2(message));
                    let _keyshare = context2.exportKeyShare().toJsonObject();
                    let _address = keyshareToAddress(_keyshare);
                    console.log(`party2 finished keygen with ${_keyshare} ${_address}`);
                });
                (0, it_pipe_1.pipe)(stream.source, lp.decode(), function (source) {
                    return __awaiter(this, void 0, void 0, function* () {
                        const { value: message1 } = yield source.next();
                        _event.emit('/internal/ecdsa/party2/inbound/msg/1', message1.slice());
                        const { value: message3 } = yield source.next();
                        _event.emit('/internal/ecdsa/party2/inbound/msg/3', message3.slice());
                    });
                });
                yield (0, it_pipe_1.pipe)(messages, lp.encode(), stream.sink);
                // let [ sharedAddress, keyshare ] = await handleKeygen({ stream });
                // console.log(sharedAddress, "maker");
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
            }));
            yield self.start();
            return self;
        });
    }
    constructor({ signer, peerId }) {
        super({ signer, peerId });
        this.offers = new Map();
        this.signer = signer;
    }
    // adds new offer to this.offers: Map<hash, IOffer>
    listNewOffer(_offer) {
        this.offers.set((0, exports.hashOffer)(_offer), _offer);
    }
    getTradeAddress(sharedAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            return getCreateAddress({
                nonce: yield this.signer.provider.getTransactionCount(sharedAddress),
                from: sharedAddress,
            });
        });
    }
    approveTradeAsMaker(offer, sharedAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const tradeAddress = yield this.getTradeAddress(sharedAddress);
            return yield new Contract(offer.givesToken, ["function approve(address, uint256) returns (bool)"], this.signer).approve(tradeAddress, offer.givesAmount);
        });
    }
    approveTradeAsTaker(offer, sharedAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const tradeAddress = yield this.getTradeAddress(sharedAddress);
            return yield new Contract(getAddress(offer.getsToken), ["function approve(address, uint256) returns (bool)"], this.signer).approve(tradeAddress, offer.getsAmount);
        });
    }
    createTransaction(offer, maker, sharedAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const contract = (0, exports.createContract)(offer, maker, yield this.signer.getAddress());
            const gasPrice = ethers_1.ethers.toBigInt(yield this.signer.provider.send('eth_gasPrice', []));
            const gasLimit = yield this.signer.provider.estimateGas({
                data: contract,
                from: sharedAddress,
                gasPrice,
            });
            return Object.assign(new Transaction(), {
                data: (0, exports.createContract)(offer, maker, yield this.signer.getAddress()),
                gasPrice,
                gasLimit,
                nonce: yield this.signer.provider.getTransactionCount(sharedAddress),
                value: ((yield this.signer.provider.getBalance(sharedAddress)) - (gasPrice * gasLimit)),
            });
        });
    }
    createTrade(peer, offer) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Acting on offer ${offer} with peer ${peer}`);
            let _event = new node_events_1.EventEmitter();
            // generate 2p-ecdsa keyshare with indicated peer
            let { stream } = yield this.dialProtocol(peer, [
                "/pintswap/0.1.0/create-trade",
            ]);
            // try {
            //   let [ sharedAddress, keyshare ] = await initKeygen(stream);
            //   if (typeof sharedAddress == "string") await this.approveTradeAsTaker(offer, sharedAddress);
            //   const transaction = await this.createTransaction(
            //     offer,
            //     await this.signer.getAddress(),
            //     sharedAddress as string
            //   );
            // } catch (error) {
            //   throw error
            // }
            let context1 = yield two_party_ecdsa_js_1.TPCEcdsaKeyGen.P1Context.createContext();
            const message1 = context1.step1();
            const messages = (0, it_pushable_1.default)();
            _event.on('/internal/ecdsa-keygen/party/2/status/step1', () => {
                let _message1 = context1.step1();
                console.log(`step 1 with message`);
                messages.push(_message1);
            });
            _event.on('/internal/ecdsa/party1/inbound/msg/2', (message) => __awaiter(this, void 0, void 0, function* () {
                messages.push(context1.step2(message));
                let _keyshare = context1.exportKeyShare().toJsonObject();
                let _address = keyshareToAddress(_keyshare);
                let _tx = yield this.createTransaction(offer, yield this.signer.getAddress(), _address);
                console.log(_tx);
                console.log(_tx.data);
            }));
            (0, it_pipe_1.pipe)(stream.source, lp.decode(), function (source) {
                return __awaiter(this, void 0, void 0, function* () {
                    messages.push(message1);
                    const { value: message2 } = yield source.next();
                    _event.emit('/internal/ecdsa/party1/inbound/msg/2', message2.slice());
                    // const message3 = context1.step2(message2.slice());
                    // messages.push(message3);
                    // messages.end();
                });
            });
            yield (0, it_pipe_1.pipe)(messages, lp.encode(), stream.sink);
            // const keyshare = context1.exportKeyShare().toJsonObject();
            // const address = keyshareToAddress(keyshare);
            // return [address, keyshare]; 
        });
    }
}
exports.Pintswap = Pintswap;
//# sourceMappingURL=pintswap.js.map