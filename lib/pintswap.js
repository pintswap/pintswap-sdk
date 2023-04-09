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
exports.Pintswap = exports.PintswapTrade = void 0;
const protocol_1 = require("./protocol");
const p2p_1 = require("./p2p");
const ethers_1 = require("ethers");
const it_pipe_1 = require("it-pipe");
const lp = __importStar(require("it-length-prefixed"));
const two_party_ecdsa_js_1 = require("@safeheron/two-party-ecdsa-js");
const events_1 = require("events");
const it_pushable_1 = __importDefault(require("it-pushable"));
const lodash_1 = require("lodash");
const trade_1 = require("./trade");
const bn_js_1 = __importDefault(require("bn.js"));
const trade_2 = require("./trade");
const peer_id_1 = __importDefault(require("peer-id"));
const logger_1 = require("./logger");
const permit = __importStar(require("./permit"));
const { getAddress, getCreateAddress, Contract, Transaction } = ethers_1.ethers;
const logger = (0, logger_1.createLogger)("pintswap");
class PintswapTrade extends events_1.EventEmitter {
    constructor() {
        super();
        this._deferred = (0, trade_2.defer)();
    }
    toPromise() {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this._deferred.promise;
        });
    }
    resolve(v) {
        this.emit("complete", v);
        this._deferred.resolve(v);
    }
    reject(err) {
        this.emit("error", err);
        this._deferred.reject(err);
    }
}
exports.PintswapTrade = PintswapTrade;
class Pintswap extends p2p_1.PintP2P {
    static initialize({ signer }) {
        return __awaiter(this, void 0, void 0, function* () {
            const peerId = yield peer_id_1.default.create();
            return new Pintswap({ signer, peerId });
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
                try {
                    this.logger.debug("handling order request from peer");
                    this.emit("pintswap/trade/peer", 2); // maker sees that taker is connected
                    let offerList = protocol_1.protocol.OfferList.encode({
                        offers: [...this.offers.values()].map((v) => (0, lodash_1.mapValues)(v, (v) => Buffer.from(ethers_1.ethers.toBeArray(v)))),
                    }).finish();
                    const messages = (0, it_pushable_1.default)();
                    (0, it_pipe_1.pipe)(messages, lp.encode(), stream.sink);
                    messages.push(offerList);
                    messages.end();
                }
                catch (e) {
                    this.logger.error(e);
                }
            });
            yield this.handle("/pintswap/0.1.0/create-trade", ({ stream, connection, protocol }) => __awaiter(this, void 0, void 0, function* () {
                const trade = new PintswapTrade();
                this.emit("trade:maker", trade);
                this.emit(`/pintswap/request/create-trade`);
                const context2 = yield two_party_ecdsa_js_1.TPCEcdsaKeyGen.P2Context.createContext();
                const messages = (0, it_pushable_1.default)();
                const self = this;
                (0, it_pipe_1.pipe)(stream.source, lp.decode(), function (source) {
                    return __awaiter(this, void 0, void 0, function* () {
                        try {
                            const { value: keygenMessage1 } = yield source.next();
                            self.emit("pintswap/trade/maker", 0); // maker sees that taker clicked "fulfill trade"
                            trade.emit("progress", 0);
                            self.logger.debug(`MAKER:: /event/ecdsa-keygen/party/2 handling message: 1`);
                            messages.push(context2.step1(keygenMessage1.slice()));
                            messages.push(Buffer.from(address.substr(2), "hex"));
                            self.logger.debug("MAKER: pushed context2.step1(message) + address");
                            const { value: keygenMessage3 } = yield source.next();
                            self.logger.debug(`MAKER:: /event/ecdsa-keygen/party/2 handling message: 3`);
                            context2.step2(keygenMessage3.slice());
                            // set keyshare and shared address
                            const keyshareJson = context2.exportKeyShare().toJsonObject();
                            const sharedAddress = (0, trade_2.keyshareToAddress)(keyshareJson);
                            const { value: offerHashBufList } = yield source.next();
                            const offerHashBuf = offerHashBufList.slice();
                            const offer = self.offers.get(offerHashBuf.toString());
                            self.emit(`pintswap/request/create-trade/fulfilling`, offerHashBuf.toString(), offer); // emits offer hash and offer object to frontend
                            trade.emit("fulfilling", {
                                hash: offerHashBuf,
                                offer,
                            });
                            const tx = yield self.approveTradeAsMaker(offer, sharedAddress);
                            if (tx.permitData) {
                                messages.push(permit.encode(tx.permitData));
                            }
                            else {
                                yield self.signer.provider.waitForTransaction(tx.hash);
                                messages.push(Buffer.from([]));
                            }
                            self.emit("pintswap/trade/maker", 1); // maker sees the taker signed tx
                            trade.emit("progress", 1);
                            self.logger.debug(`MAKER:: /event/approve-contract approved offer with offer hash: ${offerHashBuf.toString()}`);
                            self.logger.debug("MAKER: WAITING FOR APPROVE");
                            self.logger.debug("MAKER: GOT APPROVE");
                            self.logger.debug("SHOULD RECEIVE PERMITDATA");
                            const { value: takerPermitDataBytes } = yield source.next();
                            const takerPermitDataSlice = takerPermitDataBytes.slice();
                            const takerPermitData = takerPermitDataSlice.length &&
                                permit.decode(takerPermitDataSlice);
                            self.logger.debug("TAKERPERMITDATA: " + ethers_1.ethers.hexlify(takerPermitDataSlice));
                            self.logger.debug("SHOULD RECEIVE SERIALIZED");
                            const { value: serializedTxBufList } = yield source.next();
                            const serializedTx = serializedTxBufList.slice();
                            self.logger.debug("RECEIVED SERIALIZED");
                            self.logger.debug(ethers_1.ethers.hexlify(serializedTx.slice()));
                            const { value: _takerAddress } = yield source.next();
                            const takerAddress = ethers_1.ethers.getAddress(ethers_1.ethers.hexlify(_takerAddress.slice()));
                            self.logger.debug("RECEIVED TAKERADDRESS", takerAddress);
                            const serialized = ethers_1.ethers.hexlify(serializedTx);
                            self.logger.debug(`MAKER:: /event/ecdsa-sign/party/2/init received transaction: ${serialized}`);
                            const transaction = ethers_1.ethers.Transaction.from(serialized);
                            if (transaction.to) {
                                throw Error("transaction must not have a recipient");
                            }
                            self.logger.debug("comparing contract");
                            let contractPermitData = {};
                            if (takerPermitData)
                                contractPermitData.taker = takerPermitData;
                            if (tx.permitData)
                                contractPermitData.maker = tx.permitData;
                            if (!Object.keys(contractPermitData).length)
                                contractPermitData = null;
                            if (transaction.data !==
                                (0, trade_2.createContract)(offer, yield self.signer.getAddress(), takerAddress, (yield self.signer.provider.getNetwork()).chainId, contractPermitData))
                                throw Error("transaction data is not a pintswap");
                            self.logger.debug("MAKER: making signContext");
                            const signContext = yield two_party_ecdsa_js_1.TPCEcdsaSign.P2Context.createContext(JSON.stringify(keyshareJson, null, 4), new bn_js_1.default(transaction.unsignedHash.substr(2), 16));
                            const { value: signMessage1BufList } = yield source.next();
                            const signMessage1 = signMessage1BufList.slice();
                            self.logger.debug("MAKER: received signMessage1");
                            self.logger.debug(`MAKER:: /event/ecdsa-sign/party/2 handling message: 1`);
                            messages.push(signContext.step1(signMessage1));
                            self.logger.debug("MAKER: pushed signContext.step1(message)");
                            const { value: signMessage3BufList } = yield source.next();
                            const signMessage3 = signMessage3BufList.slice();
                            self.logger.debug(`MAKER:: /event/ecdsa-sign/party/2 handling message 2`);
                            self.emit("pintswap/trade/maker", 2); // maker: swap is complete
                            messages.push(signContext.step2(signMessage3));
                            messages.end();
                            trade.resolve();
                        }
                        catch (e) {
                            self.logger.error(e);
                            trade.reject(e);
                        }
                    });
                });
                try {
                    yield (0, it_pipe_1.pipe)(messages, lp.encode(), stream.sink);
                }
                catch (e) {
                    trade.reject(e);
                }
            }));
        });
    }
    // adds new offer to this.offers: Map<hash, IOffer>
    broadcastOffer(_offer) {
        this.logger.debug("trying to list new offer");
        const hash = (0, trade_2.hashOffer)(_offer);
        this.offers.set(hash, _offer);
        this.emit("pintswap/trade/broadcast", hash);
    }
    // Takes in a peerId and returns a list of exisiting trades
    getTradesByPeerId(peerId) {
        return __awaiter(this, void 0, void 0, function* () {
            let pid = peer_id_1.default.createFromB58String(peerId);
            this.emit("pintswap/trade/peer", 0); // start finding peer's orders
            const { stream } = yield this.dialProtocol(pid, "/pintswap/0.1.0/orders");
            this.emit("pintswap/trade/peer", 1); // peer found
            const decoded = (0, it_pipe_1.pipe)(stream.source, lp.decode());
            const { value: offerListBufferList } = yield decoded.next();
            const result = offerListBufferList.slice();
            this.emit("pintswap/trade/peer", 2); // got offers
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
                    const address = ethers_1.ethers.hexlify(ethers_1.ethers.decodeBase64(v));
                    return "0x" + (0, trade_2.leftZeroPad)(address.substr(2), 40);
                });
            });
            this.emit("pintswap/trade/peer", 3); // offers decoded and returning
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
            const token = new Contract(yield (0, trade_2.coerceToWeth)(ethers_1.ethers.getAddress(offer.givesToken), this.signer), trade_2.genericAbi, this.signer);
            this.logger.debug("MAKER ADDRESS", yield this.signer.getAddress());
            this.logger.debug("MAKER BALANCE BEFORE APPROVING " +
                ethers_1.ethers.formatEther(yield token.balanceOf(yield this.signer.getAddress())));
            if (offer.givesToken === ethers_1.ethers.ZeroAddress) {
                const { chainId } = yield this.signer.provider.getNetwork();
                yield new ethers_1.ethers.Contract((0, trade_1.toWETH)(chainId), ["function deposit()"], this.signer).deposit({ value: offer.givesAmount });
            }
            if (getAddress(offer.givesToken) === getAddress(permit.ASSETS.ETHEREUM.USDC)) {
                const expiry = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
                const permitData = yield permit.sign({
                    asset: offer.givesToken,
                    value: offer.givesAmount,
                    spender: tradeAddress,
                    owner: yield this.signer.getAddress(),
                    expiry,
                }, this.signer);
                return {
                    permitData,
                    wait() {
                        return __awaiter(this, void 0, void 0, function* () {
                            return {};
                        });
                    },
                };
            }
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
            const token = new Contract(yield (0, trade_2.coerceToWeth)(getAddress(offer.getsToken), this.signer), trade_2.genericAbi, this.signer);
            this.logger.debug("TAKER ADDRESS", yield this.signer.getAddress());
            this.logger.debug("TAKER BALANCE BEFORE APPROVING " +
                ethers_1.ethers.formatEther(yield token.balanceOf(yield this.signer.getAddress())));
            if (offer.getsToken === ethers_1.ethers.ZeroAddress) {
                const { chainId } = yield this.signer.provider.getNetwork();
                yield new ethers_1.ethers.Contract((0, trade_1.toWETH)(chainId), ["function deposit()"], this.signer).deposit({ value: offer.getsAmount });
            }
            if (getAddress(offer.getsToken) === getAddress(permit.ASSETS.ETHEREUM.USDC)) {
                const expiry = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
                const permitData = yield permit.sign({
                    asset: offer.getsToken,
                    value: offer.getsAmount,
                    spender: tradeAddress,
                    owner: yield this.signer.getAddress(),
                    expiry,
                }, this.signer);
                return {
                    permitData,
                    wait() {
                        return __awaiter(this, void 0, void 0, function* () {
                            return {};
                        });
                    },
                };
            }
            const tx = yield token.approve(tradeAddress, offer.getsAmount);
            this.logger.debug("TAKER BALANCE AFTER APPROVING " +
                ethers_1.ethers.formatEther(yield token.balanceOf(yield this.signer.getAddress())));
            return tx;
        });
    }
    prepareTransaction(offer, maker, sharedAddress, permitData) {
        return __awaiter(this, void 0, void 0, function* () {
            const contract = (0, trade_2.createContract)(offer, maker, yield this.signer.getAddress(), (yield this.signer.provider.getNetwork()).chainId, permitData);
            const gasPrice = (0, trade_2.toBigInt)(yield this.signer.provider.getGasPrice());
            const gasLimit = yield (() => __awaiter(this, void 0, void 0, function* () {
                do {
                    try {
                        return ((0, trade_2.toBigInt)(yield this.signer.provider.estimateGas({
                            data: contract,
                            from: sharedAddress,
                            //          gasPrice,
                        })) + BigInt(26000));
                    }
                    catch (e) {
                        yield new Promise((resolve) => setTimeout(resolve, 1000));
                    }
                } while (true);
            }))();
            this.logger.debug("GASLIMIT: " + String(Number(gasLimit)));
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
            let sharedAddressBalance = (0, trade_2.toBigInt)(yield this.signer.provider.getBalance(sharedAddress));
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
        const trade = new PintswapTrade();
        this.emit("trade:taker", trade);
        (() => __awaiter(this, void 0, void 0, function* () {
            this.logger.debug(`Acting on offer ${(0, trade_2.hashOffer)(offer)} with peer ${peer}`);
            this.emit("pintswap/trade/taker", 0); // start fulfilling trade
            const { stream } = yield this.dialProtocol(peer, [
                "/pintswap/0.1.0/create-trade",
            ]);
            const context1 = yield two_party_ecdsa_js_1.TPCEcdsaKeyGen.P1Context.createContext();
            const message1 = context1.step1();
            const messages = (0, it_pushable_1.default)();
            /*
             * Pintswap#approveAsMaker
             */
            const self = this;
            (0, it_pipe_1.pipe)(stream.source, lp.decode(), function (source) {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        messages.push(message1); // message 1
                        const { value: keygenMessage2BufList } = yield source.next(); // message 2
                        const keygenMessage2 = keygenMessage2BufList.slice();
                        self.logger.debug(keygenMessage2);
                        const { value: makerAddressBufList } = yield source.next(); // message 2
                        const makerAddress = ethers_1.ethers.getAddress(ethers_1.ethers.hexlify(makerAddressBufList.slice()));
                        self.logger.debug(makerAddress);
                        self.logger.debug(`TAKER:: /event/ecdsa-keygen/party/1 handling message: 1`);
                        messages.push(context1.step2(keygenMessage2));
                        const keyshareJson = context1.exportKeyShare().toJsonObject();
                        const sharedAddress = (0, trade_2.keyshareToAddress)(keyshareJson);
                        trade.emit("progress", 1);
                        self.emit("pintswap/trade/taker", 1); // taker approving token swap
                        // approve as maker
                        self.logger.debug(`TAKER:: /event/approve-contract approving offer: ${offer} of shared Address ${sharedAddress}`);
                        messages.push(Buffer.from((0, trade_2.hashOffer)(offer)));
                        const approveTx = yield self.approveTradeAsTaker(offer, sharedAddress);
                        if (!approveTx.permitData)
                            yield self.signer.provider.waitForTransaction(approveTx.hash);
                        self.logger.debug("TAKER APPROVED");
                        self.emit("pintswap/trade/taker", 2); // taker approved token swap
                        trade.emit("progress", 2);
                        self.logger.debug("PUSHING PERMITDATA");
                        if (approveTx.permitData)
                            messages.push(permit.encode(approveTx.permitData));
                        else
                            messages.push(Buffer.from([]));
                        self.logger.debug("PUSHED PERMITDATA");
                        self.logger.debug("SHOULD RECEIVE PERMITDATABYTES");
                        const { value: permitDataBytes } = yield source.next();
                        self.logger.debug("RECEIVED RECEIVE PERMITDATABYTES");
                        const permitDataSlice = permitDataBytes.slice();
                        const makerPermitData = permitDataSlice.length && permit.decode(permitDataSlice);
                        self.logger.debug("enter /event/build/tx");
                        self.emit("pintswap/trade/taker", 3); // building transaction
                        trade.emit("progress", 3);
                        self.logger.debug(`/event/build/tx funding sharedAddress ${sharedAddress}`);
                        let contractPermitData = {};
                        if (makerPermitData)
                            contractPermitData.maker = makerPermitData;
                        if (approveTx.permitData)
                            contractPermitData.taker = approveTx.permitData;
                        if (!Object.keys(contractPermitData).length)
                            contractPermitData = null;
                        const txParams = yield self.prepareTransaction(offer, makerAddress, sharedAddress, contractPermitData);
                        const ethTransaction = yield self.signer.sendTransaction({
                            to: sharedAddress,
                            value: txParams.gasPrice * txParams.gasLimit, // change to gasPrice * gasLimit
                        });
                        yield self.signer.provider.waitForTransaction(ethTransaction.hash);
                        self.logger.debug(`TAKER:: /event/build/tx building transaction with params: ${offer}, ${yield self.signer.getAddress()}, ${sharedAddress}`);
                        const tx = yield self.createTransaction(txParams, sharedAddress);
                        self.logger.debug(`TAKER:: /event/build/tx built transaction`);
                        const _uhash = tx.unsignedHash.slice(2);
                        const serialized = Buffer.from(ethers_1.ethers.toBeArray(tx.unsignedSerialized));
                        const signContext = yield two_party_ecdsa_js_1.TPCEcdsaSign.P1Context.createContext(JSON.stringify(keyshareJson, null, 4), new bn_js_1.default(_uhash, 16));
                        self.logger.debug(`TAKER:: /event/build/tx sending unsigned transaction hash & signing step 1`);
                        messages.push(serialized);
                        messages.push(Buffer.from(ethers_1.ethers.toBeArray(yield self.signer.getAddress())));
                        messages.push(signContext.step1());
                        self.logger.debug("TAKER: pushed signContext.step1()");
                        self.emit("pintswap/trade/taker", 4); // transaction built
                        trade.emit("progress", 4);
                        self.logger.debug("TAKER: WAITING FOR /event/build/tx");
                        self.logger.debug("TAKER: COMPLETED");
                        const { value: signMessage_2 } = yield source.next();
                        self.logger.debug("TAKER: GOT signMessage_2");
                        self.logger.debug(`TAKER:: /event/ecdsa-sign/party/1 handling message 2`);
                        messages.push(signContext.step2(signMessage_2.slice()));
                        self.logger.debug("TAKER: WAITING FOR /event/ecdsa-sign/party/1");
                        self.logger.debug("TAKER: COMPLETED");
                        const { value: signMessage_4 } = yield source.next();
                        self.logger.debug("TAKER: GOT signMessage_4");
                        self.logger.debug(`TAKER:: /event/ecdsa-sign/party/1 handling message 4`);
                        signContext.step3(signMessage_4.slice());
                        const [r, s, v] = signContext.exportSig();
                        tx.signature = ethers_1.ethers.Signature.from({
                            r: "0x" + (0, trade_2.leftZeroPad)(r.toString(16), 64),
                            s: "0x" + (0, trade_2.leftZeroPad)(s.toString(16), 64),
                            v: v + 27,
                        });
                        const txReceipt = typeof self.signer.provider.sendTransaction == "function"
                            ? yield self.signer.provider.sendTransaction(tx.serialized)
                            : yield self.signer.provider.broadcastTransaction(tx.serialized);
                        self.logger.debug(require("util").inspect(yield self.signer.provider.waitForTransaction(txReceipt.hash), {
                            colors: true,
                            depth: 15,
                        }));
                        messages.end();
                        stream.close();
                        self.emit("pintswap/trade/taker", 5); // transaction complete
                        trade.resolve(txReceipt);
                    }
                    catch (e) {
                        messages.end();
                        stream.close();
                        self.logger.error(e);
                        trade.reject(e);
                    }
                });
            });
            yield (0, it_pipe_1.pipe)(messages, lp.encode(), stream.sink);
        }))().catch((err) => trade.reject(err));
        return trade;
    }
}
exports.Pintswap = Pintswap;
//# sourceMappingURL=pintswap.js.map