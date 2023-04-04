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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
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
const lodash_1 = require("lodash");
const bn_js_1 = __importDefault(require("bn.js"));
const trade_1 = require("./trade");
const peer_id_1 = __importDefault(require("peer-id"));
const logger_1 = require("./logger");
const logger = (0, logger_1.createLogger)("pintswap");
const { getAddress, getCreateAddress, Contract, Transaction } = ethers_1.ethers;
const defer = () => {
    let resolve, reject, promise = new Promise((_resolve, _reject) => {
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
        this.logger = logger;
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
            yield this.unhandle([
                "/pintswap/0.1.0/orders",
                "/pintswap/0.1.0/create-trade",
            ]);
            yield this.stop();
            this.emit(`pintswap/node/status`, 0);
        });
    }
    handleBroadcastedOffers() {
        return __awaiter(this, void 0, void 0, function* () {
            const address = yield this.signer.getAddress();
            yield this.handle("/pintswap/0.1.0/orders", ({ stream }) => {
                this.logger.debug("handling order request from peer");
                this.emit(`/pintswap/request/orders`);
                let _offerList = protocol_1.protocol.OfferList.encode({
                    offers: [...this.offers.values()].map((v) => (0, lodash_1.mapValues)(v, (v) => Buffer.from(ethers_1.ethers.toBeArray(v)))),
                }).finish();
                (0, it_pipe_1.pipe)([_offerList], lp.encode(), stream.sink);
            });
            yield this.handle("/pintswap/0.1.0/create-trade", ({ stream, connection, protocol }) => __awaiter(this, void 0, void 0, function* () {
                this.emit(`/pintswap/request/create-trade`);
                let context2 = yield two_party_ecdsa_js_1.TPCEcdsaKeyGen.P2Context.createContext();
                let messages = (0, it_pushable_1.default)();
                let _event = new events_1.EventEmitter();
                let sharedAddress = null;
                let takerAddress = null;
                let keyshareJson = null;
                let signContext = null;
                _event.on("/event/ecdsa-keygen/party/2", (step, message) => {
                    switch (step) {
                        case 1:
                            this.logger.debug(`MAKER:: /event/ecdsa-keygen/party/2 handling message: ${step}`);
                            messages.push(context2.step1(message));
                            messages.push(Buffer.from(address.substr(2), "hex"));
                            break;
                        case 3:
                            this.logger.debug(`MAKER:: /event/ecdsa-keygen/party/2 handling message: ${step}`);
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
                let offer = null;
                _event.on("/event/approve-contract", (offerHashBuf) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        offer = this.offers.get(offerHashBuf.toString());
                        this.emit(`pintswap/request/create-trade/fulfilling`, offerHashBuf.toString(), offer); // emits offer hash and offer object to frontend
                        yield this.signer.provider.waitForTransaction((yield this.approveTradeAsMaker(offer, sharedAddress)).hash);
                        messages.push(Buffer.from("ack"));
                    }
                    catch (err) {
                        this.logger.error(err);
                        throw new Error("couldn't find offering");
                    }
                    this.logger.debug(`MAKER:: /event/approve-contract approved offer with offer hash: ${offerHashBuf.toString()}`);
                }));
                _event.on("/event/ecdsa-sign/party/2/init", (serializedTx) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const serialized = ethers_1.ethers.hexlify(serializedTx);
                        this.logger.debug(`MAKER:: /event/ecdsa-sign/party/2/init received transaction: ${serialized}`);
                        const transaction = ethers_1.ethers.Transaction.from(serialized);
                        if (transaction.to) {
                            throw Error("transaction must not have a recipient");
                        }
                        if (transaction.data !==
                            (0, trade_1.createContract)(offer, yield this.signer.getAddress(), takerAddress))
                            throw Error("transaction data is not a pintswap");
                        signContext = yield two_party_ecdsa_js_1.TPCEcdsaSign.P2Context.createContext(JSON.stringify(keyshareJson, null, 4), new bn_js_1.default(transaction.unsignedHash.substr(2), 16));
                    }
                    catch (e) {
                        this.logger.error(e);
                    }
                }));
                _event.on("/event/ecdsa-sign/party/2", (step, message) => {
                    switch (step) {
                        case 1:
                            this.logger.debug(`MAKER:: /event/ecdsa-sign/party/2 handling message: ${step}`);
                            messages.push(signContext.step1(message));
                            break;
                        case 3:
                            this.logger.debug(`MAKER:: /event/ecdsa-sign/party/2 handling message ${step}`);
                            messages.push(signContext.step2(message));
                            messages.end();
                            break;
                        // safe to end message iterator
                        default:
                            throw new Error("Unexpeced message on event /ecdsa-sign/party/2");
                            break;
                    }
                });
                const self = this;
                (0, it_pipe_1.pipe)(stream.source, lp.decode(), function (source) {
                    return __awaiter(this, void 0, void 0, function* () {
                        const { value: keygenMessage1 } = yield source.next();
                        _event.emit("/event/ecdsa-keygen/party/2", 1, keygenMessage1.slice());
                        const { value: keygenMessage3 } = yield source.next();
                        _event.emit("/event/ecdsa-keygen/party/2", 3, keygenMessage3.slice());
                        const { value: offerHashBuf } = yield source.next();
                        _event.emit("/event/approve-contract", offerHashBuf.slice());
                        self.logger.debug("SHOULD RECEIVE SERIALIZED");
                        const { value: serializedTx } = yield source.next();
                        const { value: _takerAddress } = yield source.next();
                        takerAddress = ethers_1.ethers.getAddress(ethers_1.ethers.hexlify(_takerAddress.slice()));
                        self.logger.debug("RECEIVED SERIALIZED", serializedTx.slice());
                        _event.emit("/event/ecdsa-sign/party/2/init", serializedTx.slice());
                        const { value: signMessage1 } = yield source.next();
                        _event.emit("/event/ecdsa-sign/party/2", 1, signMessage1.slice());
                        const { value: signMessage3 } = yield source.next();
                        _event.emit("/event/ecdsa-sign/party/2", 3, signMessage3.slice());
                    });
                });
                yield (0, it_pipe_1.pipe)(messages, lp.encode(), stream.sink);
            }));
        });
    }
    // adds new offer to this.offers: Map<hash, IOffer>
    broadcastOffer(_offer) {
        this.logger.debug("trying to list new offer");
        this.offers.set((0, trade_1.hashOffer)(_offer), _offer);
    }
    // Takes in a peerId and returns a list of exisiting trades
    getTradesByPeerId(peerId) {
        return __awaiter(this, void 0, void 0, function* () {
            let pid = peer_id_1.default.createFromB58String(peerId);
            const { stream } = yield this.dialProtocol(pid, "/pintswap/0.1.0/orders");
            const result = yield (0, it_pipe_1.pipe)(stream.source, lp.decode(), function collect(source) {
                var _a, source_1, source_1_1;
                var _b, e_1, _c, _d;
                return __awaiter(this, void 0, void 0, function* () {
                    const vals = [];
                    try {
                        for (_a = true, source_1 = __asyncValues(source); source_1_1 = yield source_1.next(), _b = source_1_1.done, !_b;) {
                            _d = source_1_1.value;
                            _a = false;
                            try {
                                const val = _d;
                                vals.push(val);
                            }
                            finally {
                                _a = true;
                            }
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (!_a && !_b && (_c = source_1.return)) yield _c.call(source_1);
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    return vals[0].slice();
                });
            });
            let offerList = protocol_1.protocol.OfferList.toObject(protocol_1.protocol.OfferList.decode(result), {
                enums: String,
                longs: String,
                bytes: String,
                defaults: true,
                arrays: true,
                objects: true,
                oneofs: true,
            });
            let remap = offerList.offers.map((v) => {
                return (0, lodash_1.mapValues)(v, (v) => {
                    return ethers_1.ethers.hexlify(ethers_1.ethers.decodeBase64(v));
                });
            });
            return Object.assign(offerList, { offers: remap });
        });
    }
    getTradeAddress(sharedAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const address = getCreateAddress({
                nonce: yield this.signer.provider.getTransactionCount(sharedAddress),
                from: sharedAddress,
            });
            this.logger.debug("TRADE ADDRESS: " + address);
            return address;
        });
    }
    approveTradeAsMaker(offer, sharedAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const tradeAddress = yield this.getTradeAddress(sharedAddress);
            const token = new Contract(offer.givesToken, [
                "function approve(address, uint256) returns (bool)",
                "function allowance(address, address) view returns (uint256)",
                "function balanceOf(address) view returns (uint256)",
            ], this.signer);
            this.logger.debug("MAKER ADDRESS", yield this.signer.getAddress());
            logger.debug("MAKER BALANCE BEFORE APPROVING " +
                ethers_1.ethers.formatEther(yield token.balanceOf(yield this.signer.getAddress())));
            const tx = yield token.approve(tradeAddress, offer.givesAmount);
            this.logger.debug("TRADE ADDRESS", tradeAddress);
            this.logger.debug("MAKER BALANCE AFTER APPROVING " +
                ethers_1.ethers.formatEther(yield token.balanceOf(yield this.signer.getAddress())));
            this.logger.debug("MAKER ALLOWANCE AFTER APPROVING " +
                ethers_1.ethers.formatEther(yield token.allowance(yield this.signer.getAddress(), tradeAddress)));
            return tx;
        });
    }
    approveTradeAsTaker(offer, sharedAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const tradeAddress = yield this.getTradeAddress(sharedAddress);
            const token = new Contract(getAddress(offer.getsToken), [
                "function approve(address, uint256) returns (bool)",
                "function allowance(address, address) view returns (uint256)",
                "function balanceOf(address) view returns (uint256)",
            ], this.signer);
            this.logger.debug("TAKER ADDRESS", yield this.signer.getAddress());
            this.logger.debug("TAKER BALANCE BEFORE APPROVING " +
                ethers_1.ethers.formatEther(yield token.balanceOf(yield this.signer.getAddress())));
            const tx = yield token.approve(tradeAddress, offer.getsAmount);
            this.logger.debug("TAKER BALANCE AFTER APPROVING " +
                ethers_1.ethers.formatEther(yield token.balanceOf(yield this.signer.getAddress())));
            return tx;
        });
    }
    prepareTransaction(offer, maker, sharedAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const contract = (0, trade_1.createContract)(offer, maker, yield this.signer.getAddress());
            const gasPrice = (0, trade_1.toBigInt)(yield this.signer.provider.getGasPrice());
            const gasLimit = (0, trade_1.toBigInt)(yield this.signer.provider.estimateGas({
                data: contract,
                from: sharedAddress,
                gasPrice,
            })) + BigInt(26000);
            return {
                data: contract,
                gasPrice,
                gasLimit,
            };
        });
    }
    createTransaction(txParams, sharedAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const { gasLimit, gasPrice, data } = txParams;
            let sharedAddressBalance = (0, trade_1.toBigInt)(yield this.signer.provider.getBalance(sharedAddress));
            this.logger.debug(`network ${(yield this.signer.provider.getNetwork()).chainId}`, sharedAddressBalance, gasPrice, gasLimit);
            return Object.assign(new Transaction(), txParams, {
                chainId: (yield this.signer.provider.getNetwork()).chainId,
                nonce: yield this.signer.provider.getTransactionCount(sharedAddress),
                value: sharedAddressBalance >= gasPrice * gasLimit
                    ? sharedAddressBalance - gasPrice * gasLimit
                    : BigInt(0), // check: balance >= ( gasPrice * gasLimit ) | resolves ( balance - (gasPrice * gasLimit) ) or 0
            });
        });
    }
    createTrade(peer, offer) {
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.debug(`Acting on offer ${offer} with peer ${peer}`);
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
            let makerAddress = null;
            let keyshareJson = null;
            const emit = _event.emit;
            _event.emit = function (...args) {
                if (["tick", "error"].includes(args[0]))
                    this._deferred = defer();
                return emit.apply(this, args);
            };
            _event.wait = function () {
                return __awaiter(this, void 0, void 0, function* () {
                    if (!this._deferred)
                        return;
                    return yield this._deferred.promise;
                });
            };
            _event.on("tick", () => _event._deferred.resolve());
            _event.on("error", (e) => _event._deferred.reject(e));
            _event.on("/event/ecdsa-keygen/party/1", (step, message) => {
                try {
                    switch (step) {
                        case 2:
                            this.logger.debug(`TAKER:: /event/ecdsa-keygen/party/1 handling message: ${step}`);
                            messages.push(context1.step2(message));
                            keyshareJson = context1.exportKeyShare().toJsonObject();
                            sharedAddress = (0, trade_1.keyshareToAddress)(keyshareJson);
                            break;
                        default:
                            throw new Error("unexpected message on event /ecdsa-keygen/party/1");
                            break;
                    }
                }
                catch (e) {
                    _event.emit("error", e);
                }
                _event.emit("tick");
            });
            /*
             * Pintswap#approveAsMaker
             */
            _event.on("/event/approve-contract", () => __awaiter(this, void 0, void 0, function* () {
                try {
                    // approve as maker
                    this.logger.debug(`TAKER:: /event/approve-contract approving offer: ${offer} of shared Address ${sharedAddress}`);
                    messages.push(Buffer.from((0, trade_1.hashOffer)(offer)));
                    yield this.signer.provider.waitForTransaction((yield this.approveTradeAsTaker(offer, sharedAddress)).hash);
                    this.logger.debug("TAKER APPROVED");
                }
                catch (e) {
                    _event.emit("error", e);
                }
                _event.emit("tick");
            }));
            let ethTransaction = null;
            _event.on("/event/build/tx", () => __awaiter(this, void 0, void 0, function* () {
                try {
                    this.logger.debug(`/event/build/tx funding sharedAddress ${sharedAddress}`);
                    const txParams = yield this.prepareTransaction(offer, makerAddress, sharedAddress);
                    ethTransaction = yield this.signer.sendTransaction({
                        to: sharedAddress,
                        value: txParams.gasPrice * txParams.gasLimit, // change to gasPrice * gasLimit
                    });
                    yield this.signer.provider.waitForTransaction(ethTransaction.hash);
                    this.logger.debug(`TAKER:: /event/build/tx building transaction with params: ${offer}, ${yield this.signer.getAddress()}, ${sharedAddress}`);
                    tx = yield this.createTransaction(txParams, sharedAddress);
                    this.logger.debug(`TAKER:: /event/build/tx built transaction`);
                    let _uhash = tx.unsignedHash.slice(2);
                    const serialized = Buffer.from(ethers_1.ethers.toBeArray(tx.unsignedSerialized));
                    signContext = yield two_party_ecdsa_js_1.TPCEcdsaSign.P1Context.createContext(JSON.stringify(keyshareJson, null, 4), new bn_js_1.default(_uhash, 16));
                    this.logger.debug(`TAKER:: /event/build/tx sending unsigned transaction hash & signing step 1`);
                    messages.push(serialized);
                    messages.push(Buffer.from(ethers_1.ethers.toBeArray(yield this.signer.getAddress())));
                    messages.push(signContext.step1());
                }
                catch (e) {
                    this.logger.error(e);
                    _event.emit("error", e);
                }
                _event.emit("tick");
            }));
            _event.on("/event/ecdsa-sign/party/1", (step, message) => __awaiter(this, void 0, void 0, function* () {
                try {
                    switch (step) {
                        case 2:
                            this.logger.debug(`TAKER:: /event/ecdsa-sign/party/1 handling message ${step}`);
                            messages.push(signContext.step2(message));
                            break;
                        case 4:
                            this.logger.debug(`TAKER:: /event/ecdsa-sign/party/1 handling message ${step}`);
                            signContext.step3(message);
                            let [r, s, v] = signContext.exportSig();
                            tx.signature = ethers_1.ethers.Signature.from({
                                r: "0x" + (0, trade_1.leftZeroPad)(r.toString(16), 64),
                                s: "0x" + (0, trade_1.leftZeroPad)(s.toString(16), 64),
                                v: v + 27,
                            });
                            let txReceipt = typeof this.signer.provider.sendTransaction == "function"
                                ? yield this.signer.provider.sendTransaction(tx.serialized)
                                : yield this.signer.provider.broadcastTransaction(tx.serialized);
                            this.logger.debug(require("util").inspect(yield this.signer.provider.waitForTransaction(txReceipt.hash), {
                                colors: true,
                                depth: 15,
                            }));
                            messages.end();
                            stream.close();
                            break;
                        default:
                            throw new Error("Unexpeced message on event /ecdsa-sign/party/2");
                            break;
                    }
                    _event.emit("tick");
                }
                catch (e) {
                    _event.emit("error", e);
                }
            }));
            const self = this;
            let result = (0, it_pipe_1.pipe)(stream.source, lp.decode(), function (source) {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        messages.push(message1); // message 1
                        const { value: keygenMessage_2 } = yield source.next(); // message 2
                        self.logger.debug(keygenMessage_2.slice());
                        const { value: _makerAddress } = yield source.next(); // message 2
                        self.logger.debug(_makerAddress.slice());
                        makerAddress = ethers_1.ethers.getAddress(ethers_1.ethers.hexlify(_makerAddress.slice()));
                        _event.emit("/event/ecdsa-keygen/party/1", 2, keygenMessage_2.slice()); // message 3
                        yield _event.wait();
                        _event.emit("/event/approve-contract");
                        yield _event.wait();
                        yield source.next();
                        self.logger.debug("enter /event/build/tx");
                        _event.emit("/event/build/tx");
                        yield _event.wait();
                        const { value: signMessage_2 } = yield source.next();
                        _event.emit("/event/ecdsa-sign/party/1", 2, signMessage_2.slice());
                        yield _event.wait();
                        const { value: signMessage_4 } = yield source.next();
                        _event.emit("/event/ecdsa-sign/party/1", 4, signMessage_4.slice());
                        yield _event.wait();
                    }
                    catch (e) {
                        self.logger.error(e);
                    }
                });
            });
            yield (0, it_pipe_1.pipe)(messages, lp.encode(), stream.sink);
            return true;
        });
    }
}
exports.Pintswap = Pintswap;
//# sourceMappingURL=pintswap.js.map