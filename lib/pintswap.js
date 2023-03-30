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
exports.Pintswap = void 0;
const protocol_1 = require("./protocol");
const p2p_1 = require("./p2p");
const ethers_1 = require("ethers");
const it_pipe_1 = require("it-pipe");
const lp = __importStar(require("it-length-prefixed"));
const two_party_ecdsa_js_1 = require("@safeheron/two-party-ecdsa-js");
const events_1 = require("events");
const it_pushable_1 = __importDefault(require("it-pushable"));
const bn_js_1 = __importDefault(require("bn.js"));
const trade_1 = require("./trade");
const peer_id_1 = __importDefault(require("peer-id"));
const { solidityPackedKeccak256, hexlify, getAddress, getCreateAddress, VoidSigner, Contract, Transaction, } = ethers_1.ethers;
class Pintswap extends p2p_1.PintP2P {
    static initialize({ signer }) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield new Promise((resolve, reject) => __awaiter(this, void 0, void 0, function* () {
                try {
                    let peerId = yield peer_id_1.default.create();
                    resolve(new Pintswap({ signer, peerId }));
                }
                catch (error) {
                    reject(error);
                }
            }));
        });
    }
    constructor({ signer, peerId }) {
        super({ signer, peerId });
        this.offers = new Map();
        this.signer = signer;
    }
    startNode() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.handleBroadcastedOffers();
            yield this.start();
            this.emit(`pintswap/node/status`, 1);
        });
    }
    stopNode() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.unhandle(["/pintswap/0.1.0/orders", "/pintswap/0.1.0/create-trade"]);
            yield this.stop();
            this.emit(`pintswap/node/status`, 0);
        });
    }
    handleBroadcastedOffers() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.handle("/pintswap/0.1.0/orders", (duplex) => {
                console.log('handling order request from peer');
                this.emit(`/pintswap/request/orders`);
                (0, it_pipe_1.pipe)(protocol_1.protocol.OfferList.encode({ offers: this.offers.values() }), lp.encode(), duplex.stream.sink);
            });
            yield this.handle("/pintswap/0.1.0/create-trade", ({ stream, connection, protocol }) => __awaiter(this, void 0, void 0, function* () {
                this.emit(`/pintswap/request/create-trade`);
                let context2 = yield two_party_ecdsa_js_1.TPCEcdsaKeyGen.P2Context.createContext();
                let messages = (0, it_pushable_1.default)();
                let _event = new events_1.EventEmitter();
                let sharedAddress = null;
                let keyshareJson = null;
                let signContext = null;
                _event.on('/event/ecdsa-keygen/party/2', (step, message) => {
                    switch (step) {
                        case 1:
                            console.log(`MAKER:: /event/ecdsa-keygen/party/2 handling message: ${step}`);
                            messages.push(context2.step1(message));
                            break;
                        case 3:
                            console.log(`MAKER:: /event/ecdsa-keygen/party/2 handling message: ${step}`);
                            context2.step2(message);
                            // set keyshare and shared address
                            keyshareJson = context2.exportKeyShare().toJsonObject();
                            sharedAddress = (0, trade_1.keyshareToAddress)(keyshareJson);
                            break;
                        default:
                            throw new Error("Unexpected message on event /ecdsa-keygen/party/2");
                            break;
                    }
                });
                _event.on('/event/approve-contract', (offerHashBuf) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        let offer = this.offers.get(offerHashBuf.toString());
                        this.emit(`pintswap/request/create-trade/fulfilling`, offerHashBuf.toString(), offer); // emits offer hash and offer object to frontend
                        yield this.approveTradeAsMaker(offer, sharedAddress);
                    }
                    catch (err) {
                        throw new Error("couldn't find offering");
                    }
                    console.log(`MAKER:: /event/approve-contract approved offer with offer hash: ${offerHashBuf.toString()}`);
                }));
                _event.on('/event/ecdsa-sign/party/2/init', (unsignedTxHash) => __awaiter(this, void 0, void 0, function* () {
                    console.log(`MAKER:: /event/ecdsa-sign/party/2/init received unsigned hash: ${unsignedTxHash.toString()}`);
                    signContext = yield two_party_ecdsa_js_1.TPCEcdsaSign.P2Context.createContext(JSON.stringify(keyshareJson, null, 4), new bn_js_1.default(unsignedTxHash.toString(), 16));
                }));
                _event.on('/event/ecdsa-sign/party/2', (step, message) => {
                    switch (step) {
                        case 1:
                            console.log(`MAKER:: /event/ecdsa-sign/party/2 handling message: ${step}`);
                            messages.push(signContext.step1(message));
                            break;
                        case 3:
                            console.log(`MAKER:: /event/ecdsa-sign/party/2 handling message ${step}`);
                            messages.push(signContext.step2(message));
                            messages.end();
                            break;
                        // safe to end message iterator
                        default:
                            throw new Error("Unexpeced message on event /ecdsa-sign/party/2");
                            break;
                    }
                });
                (0, it_pipe_1.pipe)(stream.source, lp.decode(), function (source) {
                    return __awaiter(this, void 0, void 0, function* () {
                        const { value: keygenMessage1 } = yield source.next();
                        _event.emit('/event/ecdsa-keygen/party/2', 1, keygenMessage1.slice());
                        const { value: keygenMessage3 } = yield source.next();
                        _event.emit('/event/ecdsa-keygen/party/2', 3, keygenMessage3.slice());
                        const { value: offerHashBuf } = yield source.next();
                        _event.emit('/event/approve-contract', offerHashBuf.slice());
                        const { value: unsignedTxHash } = yield source.next();
                        _event.emit('/event/ecdsa-sign/party/2/init', unsignedTxHash.slice());
                        const { value: signMessage1 } = yield source.next();
                        _event.emit('/event/ecdsa-sign/party/2', 1, signMessage1.slice());
                        const { value: signMessage3 } = yield source.next();
                        _event.emit('/event/ecdsa-sign/party/2', 3, signMessage3.slice());
                    });
                });
                yield (0, it_pipe_1.pipe)(messages, lp.encode(), stream.sink);
            }));
        });
    }
    // adds new offer to this.offers: Map<hash, IOffer>
    broadcastOffer(_offer) {
        console.log('trying to list new offer');
        this.offers.set((0, trade_1.hashOffer)(_offer), _offer);
    }
    // Takes in a peerId and returns a list of exisiting trades
    getTradesByPeerId(peerId) {
        return __awaiter(this, void 0, void 0, function* () {
            let pid = peer_id_1.default.createFromB58String(peerId);
            const { stream } = yield this.dialProtocol(pid, '/pintswap/0.1.0/orders');
            const result = (yield ((0, it_pipe_1.pipe)(stream.source, lp.decode()).next())).value;
            console.log("STREAM RESULT:", result);
            return result;
        });
    }
    getTradeAddress(sharedAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const address = getCreateAddress({
                nonce: yield this.signer.provider.getTransactionCount(sharedAddress),
                from: sharedAddress,
            });
            console.log('TRADE ADDRESS: ' + address);
            return address;
        });
    }
    approveTradeAsMaker(offer, sharedAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const tradeAddress = yield this.getTradeAddress(sharedAddress);
            const token = new Contract(offer.givesToken, ["function approve(address, uint256) returns (bool)", "function allowance(address, address) view returns (uint256)", "function balanceOf(address) view returns (uint256)"], this.signer);
            const tx = yield token.approve(tradeAddress, offer.givesAmount);
            console.log('MAKER BALANCE ' + ethers_1.ethers.formatEther(yield token.balanceOf(yield this.signer.getAddress())));
            console.log('MAKER APPROVED BALANCE ' + ethers_1.ethers.formatEther(yield token.allowance(yield this.signer.getAddress(), tradeAddress)));
            return tx;
        });
    }
    approveTradeAsTaker(offer, sharedAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const tradeAddress = yield this.getTradeAddress(sharedAddress);
            const token = new Contract(getAddress(offer.getsToken), ["function approve(address, uint256) returns (bool)", "function allowance(address, address) view returns (uint256)", "function balanceOf(address) view returns (uint256)"], this.signer);
            const tx = yield token.approve(tradeAddress, offer.getsAmount);
            console.log('TAKER BALANCE ' + ethers_1.ethers.formatEther(yield token.balanceOf(yield this.signer.getAddress())));
            console.log('TAKER APPROVED BALANCE ' + ethers_1.ethers.formatEther(yield token.allowance(yield this.signer.getAddress(), tradeAddress)));
            return tx;
        });
    }
    createTransaction(offer, maker, sharedAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`/internal/creating a new transaction`);
            const contract = (0, trade_1.createContract)(offer, maker, yield this.signer.getAddress());
            const gasPrice = (0, trade_1.toBigInt)(yield this.signer.provider.getGasPrice());
            const gasLimit = (0, trade_1.toBigInt)(yield this.signer.provider.estimateGas({
                data: contract,
                from: sharedAddress,
                gasPrice,
            }));
            let sharedAddressBalance = (0, trade_1.toBigInt)(yield this.signer.provider.getBalance(sharedAddress));
            console.log(`network ${(yield this.signer.provider.getNetwork()).chainId}`, sharedAddressBalance, gasPrice, gasLimit);
            return Object.assign(new Transaction(), {
                data: (0, trade_1.createContract)(offer, maker, yield this.signer.getAddress()),
                chainId: (yield this.signer.provider.getNetwork()).chainId,
                gasPrice,
                gasLimit,
                nonce: yield this.signer.provider.getTransactionCount(sharedAddress),
                value: sharedAddressBalance >= (gasPrice * gasLimit) ? (sharedAddressBalance) - (gasPrice * gasLimit) : BigInt(0), // check: balance >= ( gasPrice * gasLimit ) | resolves ( balance - (gasPrice * gasLimit) ) or 0
            });
        });
    }
    createTrade(peer, offer) {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`Acting on offer ${offer} with peer ${peer}`);
            let { stream } = yield this.dialProtocol(peer, [
                "/pintswap/0.1.0/create-trade",
            ]);
            let _event = new events_1.EventEmitter();
            let context1 = yield two_party_ecdsa_js_1.TPCEcdsaKeyGen.P1Context.createContext();
            let signContext = null;
            const message1 = context1.step1();
            const messages = (0, it_pushable_1.default)();
            let tx = null;
            let sharedAddress = null;
            let keyshareJson = null;
            _event.on('/event/ecdsa-keygen/party/1', (step, message) => {
                switch (step) {
                    case 2:
                        console.log(`TAKER:: /event/ecdsa-keygen/party/1 handling message: ${step}`);
                        messages.push(context1.step2(message));
                        keyshareJson = context1.exportKeyShare().toJsonObject();
                        sharedAddress = (0, trade_1.keyshareToAddress)(keyshareJson);
                        break;
                    default:
                        throw new Error("unexpected message on event /ecdsa-keygen/party/1");
                        break;
                }
            });
            /*
             * Pintswap#approveAsMaker
             */
            _event.on('/event/approve-contract', () => __awaiter(this, void 0, void 0, function* () {
                // approve as maker
                console.log(`TAKER:: /event/approve-contract approving offer: ${offer} of shared Address ${sharedAddress}`);
                messages.push(Buffer.from((0, trade_1.hashOffer)(offer)));
                yield this.approveTradeAsTaker(offer, sharedAddress);
            }));
            _event.on('/event/build/tx', () => __awaiter(this, void 0, void 0, function* () {
                console.log(`/event/build/tx funding sharedAddress ${sharedAddress}`);
                yield this.signer.sendTransaction({
                    to: sharedAddress,
                    value: ethers_1.ethers.parseEther("0.02") // change to gasPrice * gasLimit
                });
                console.log(`TAKER:: /event/build/tx building transaction with params: ${offer}, ${yield this.signer.getAddress()}, ${sharedAddress}`);
                tx = yield this.createTransaction(offer, yield this.signer.getAddress(), sharedAddress);
                console.log(`TAKER:: /event/build/tx built transaction`);
                let _uhash = tx.unsignedHash.slice(2);
                signContext = yield two_party_ecdsa_js_1.TPCEcdsaSign.P1Context.createContext(JSON.stringify(keyshareJson, null, 4), new bn_js_1.default(_uhash, 16));
                console.log(`TAKER:: /event/build/tx sending unsigned transaction hash & signing step 1`);
                messages.push(Buffer.from(_uhash));
                messages.push(signContext.step1());
            }));
            _event.on('/event/ecdsa-sign/party/1', (step, message) => __awaiter(this, void 0, void 0, function* () {
                switch (step) {
                    case 2:
                        console.log(`TAKER:: /event/ecdsa-sign/party/1 handling message ${step}`);
                        messages.push(signContext.step2(message));
                        break;
                    case 4:
                        console.log(`TAKER:: /event/ecdsa-sign/party/1 handling message ${step}`);
                        signContext.step3(message);
                        let [r, s, v] = signContext.exportSig();
                        tx.signature = ethers_1.ethers.Signature.from({
                            r: '0x' + r.toString(16),
                            s: '0x' + s.toString(16),
                            v: v + 27
                        });
                        let txReceipt = typeof this.signer.provider.sendTransaction == 'function' ? yield this.signer.provider.sendTransaction(tx.serialized) : yield this.signer.provider.broadcastTransaction(tx.serialized);
                        console.log(yield txReceipt.wait());
                        messages.end();
                        stream.close();
                        break;
                    default:
                        throw new Error("Unexpeced message on event /ecdsa-sign/party/2");
                        break;
                }
            }));
            let result = (0, it_pipe_1.pipe)(stream.source, lp.decode(), function (source) {
                return __awaiter(this, void 0, void 0, function* () {
                    messages.push(message1); // message 1
                    const { value: keygenMessage_2 } = yield source.next(); // message 2
                    _event.emit('/event/ecdsa-keygen/party/1', 2, keygenMessage_2.slice()); // message 3
                    _event.emit('/event/approve-contract');
                    _event.emit('/event/build/tx');
                    const { value: signMessage_2 } = yield source.next();
                    _event.emit('/event/ecdsa-sign/party/1', 2, signMessage_2.slice());
                    const { value: signMessage_4 } = yield source.next();
                    _event.emit('/event/ecdsa-sign/party/1', 4, signMessage_4.slice());
                });
            });
            yield (0, it_pipe_1.pipe)(messages, lp.encode(), stream.sink);
            return true;
        });
    }
}
exports.Pintswap = Pintswap;
//# sourceMappingURL=pintswap.js.map