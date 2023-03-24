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
            yield self.handle("/pintswap/0.1.0/orders", (duplex) => (0, it_pipe_1.pipe)(duplex.stream.sink, lp.encode(), protocol_1.protocol.OfferList.encode({ offers: self.offers.values() })));
            yield self.handle("/pintswap/0.1.0/create-trade", ({ stream, connection, protocol }) => __awaiter(this, void 0, void 0, function* () {
                let context2 = yield two_party_ecdsa_js_1.TPCEcdsaKeyGen.P2Context.createContext();
                let messages = (0, it_pushable_1.default)();
                let _event = new node_events_1.EventEmitter();
                let sharedAddress = null;
                let keyshareJson = null;
                let signContext = null;
                _event.on('/internal/ecdsa/party2/inbound/msg/1', (message) => {
                    messages.push(context2.step1(message));
                });
                _event.on('/internal/ecdsa/party2/inbound/msg/3', (message) => {
                    context2.step2(message);
                    keyshareJson = context2.exportKeyShare().toJsonObject();
                    sharedAddress = keyshareToAddress(keyshareJson);
                });
                _event.on('/pintswap/ecdsa/party2/unsigned-hash', (message) => __awaiter(this, void 0, void 0, function* () {
                    let [uHash, step1] = message;
                    signContext = yield two_party_ecdsa_js_1.TPCEcdsaSign.P2Context.createContext(JSON.stringify(keyshareJson, null, 4), new bn_js_1.default(uHash.toString(), 16));
                    messages.push(signContext.step1(step1));
                }));
                _event.on('/pintswap/ecdsa/party2/sign/msg/3', (message) => {
                    messages.push(signContext.step2(message));
                });
                (0, it_pipe_1.pipe)(stream.source, lp.decode(), function (source) {
                    return __awaiter(this, void 0, void 0, function* () {
                        const { value: message1 } = yield source.next();
                        _event.emit('/internal/ecdsa/party2/inbound/msg/1', message1.slice());
                        const { value: message3 } = yield source.next();
                        _event.emit('/internal/ecdsa/party2/inbound/msg/3', message3.slice());
                        const { value: unsignedHash } = yield source.next();
                        const { value: signMessage1 } = yield source.next();
                        _event.emit('/pintswap/ecdsa/party2/unsigned-hash', [unsignedHash.slice(), signMessage1.slice()]);
                        const { value: signMessage3 } = yield source.next();
                        _event.emit('/pintswap/ecdsa/party2/sign/msg/3', signMessage3.slice());
                    });
                });
                yield (0, it_pipe_1.pipe)(messages, lp.encode(), stream.sink);
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
                chainId: (yield this.signer.provider.getNetwork()).chainId,
                gasPrice,
                gasLimit,
                nonce: yield this.signer.provider.getTransactionCount(sharedAddress),
                value: (yield this.signer.provider.getBalance) >= (gasPrice * gasLimit) ? (yield this.signer.provider.getBalance(sharedAddress)) - (gasPrice * gasLimit) : BigInt(0), // check: balance >= ( gasPrice * gasLimit ) | resolves ( balance - (gasPrice * gasLimit) ) or 0
            });
        });
    }
    createTrade(peer, offer) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Acting on offer ${offer} with peer ${peer}`);
            let { stream } = yield this.dialProtocol(peer, [
                "/pintswap/0.1.0/create-trade",
            ]);
            let _event = new node_events_1.EventEmitter();
            let context1 = yield two_party_ecdsa_js_1.TPCEcdsaKeyGen.P1Context.createContext();
            let signContext = null;
            const message1 = context1.step1();
            const messages = (0, it_pushable_1.default)();
            let tx = null;
            let sharedAddress = null;
            let keyshareJson = null;
            _event.on('/internal/ecdsa-keygen/party/2/status/step1', () => {
                let _message1 = context1.step1();
                console.log(`step 1 with message`);
                messages.push(_message1);
            });
            // get keygen message 2 
            // generate keyshare and shared address as well as transaction
            _event.on('/internal/ecdsa/party1/inbound/msg/2', (message) => __awaiter(this, void 0, void 0, function* () {
                messages.push(context1.step2(message));
                keyshareJson = context1.exportKeyShare().toJsonObject();
                sharedAddress = keyshareToAddress(keyshareJson);
                //TODO: extract fund transaction logic to a class method
                let _fundTx = {
                    to: sharedAddress,
                    value: ethers_1.ethers.parseEther("0.02")
                };
                let fundResponse = yield this.signer.sendTransaction(_fundTx);
                // ----- 
                tx = yield this.createTransaction(offer, yield this.signer.getAddress(), sharedAddress);
                // convert unsignedHash to a Buffer for wire 
                let _uhash = tx.unsignedHash.slice(2);
                signContext = yield two_party_ecdsa_js_1.TPCEcdsaSign.P1Context.createContext(JSON.stringify(keyshareJson, null, 4), new bn_js_1.default(_uhash, 16));
                messages.push(Buffer.from(_uhash));
                messages.push(signContext.step1());
            }));
            // preform sign step2 with message 2
            _event.on('/internal/ecdsa/party1/sign/msg/2', (message) => {
                messages.push(signContext.step2(message));
            });
            // get message 4 and generate a Signature { r, s, v } to sign tx
            _event.on('/internal/ecdsa/party1/sign/msg/4', (message) => __awaiter(this, void 0, void 0, function* () {
                signContext.step3(message);
                let [r, s, v] = signContext.exportSig();
                let signature = ethers_1.ethers.Signature.from({
                    r: '0x' + r.toString(16),
                    s: '0x' + s.toString(16),
                    v: v + 27
                });
                // make tx a signed transaction
                tx.signature = signature;
                let response = yield this.signer.provider.broadcastTransaction(tx.serialized);
                console.log(yield response.wait());
            }));
            (0, it_pipe_1.pipe)(stream.source, lp.decode(), function (source) {
                return __awaiter(this, void 0, void 0, function* () {
                    messages.push(message1);
                    const { value: message2 } = yield source.next();
                    _event.emit('/internal/ecdsa/party1/inbound/msg/2', message2.slice());
                    const { value: signMessage2 } = yield source.next();
                    _event.emit('/internal/ecdsa/party1/sign/msg/2', signMessage2.slice());
                    const { value: signMessage4 } = yield source.next();
                    _event.emit('/internal/ecdsa/party1/sign/msg/4', signMessage4.slice());
                });
            });
            yield (0, it_pipe_1.pipe)(messages, lp.encode(), stream.sink);
        });
    }
}
exports.Pintswap = Pintswap;
//# sourceMappingURL=pintswap.js.map