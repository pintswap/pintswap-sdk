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
const lodash_1 = require("lodash");
const trade_1 = require("./trade");
const bn_js_1 = __importDefault(require("bn.js"));
const trade_2 = require("./trade");
const peer_id_1 = __importDefault(require("peer-id"));
const logger_1 = require("./logger");
const permit = __importStar(require("./permit"));
const { getAddress, getCreateAddress, Contract, Transaction } = ethers_1.ethers;
const logger = (0, logger_1.createLogger)("pintswap");
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
                try {
                    this.logger.debug("handling order request from peer");
                    this.emit("pintswap/trade/peer", 2); // maker sees that taker is connected
                    let _offerList = protocol_1.protocol.OfferList.encode({
                        offers: [...this.offers.values()].map((v) => (0, lodash_1.mapValues)(v, (v) => Buffer.from(ethers_1.ethers.toBeArray(v)))),
                    }).finish();
                    this.logger.debug("_offerList encoded:");
                    const messages = (0, it_pushable_1.default)();
                    (0, it_pipe_1.pipe)(messages, lp.encode(), stream.sink);
                    messages.push(_offerList);
                    messages.end();
                    this.logger.debug("piped");
                }
                catch (e) {
                    console.error(e);
                    this.logger.error(e);
                }
            });
            yield this.handle("/pintswap/0.1.0/create-trade", ({ stream, connection, protocol }) => __awaiter(this, void 0, void 0, function* () {
                this.emit(`/pintswap/request/create-trade`);
                let context2 = yield two_party_ecdsa_js_1.TPCEcdsaKeyGen.P2Context.createContext();
                let messages = (0, it_pushable_1.default)();
                let _event = new events_1.EventEmitter();
                let approveDeferred = (0, trade_2.defer)();
                _event.on("error", (e) => _event._deferred.reject(e));
                let sharedAddress = null;
                let takerAddress = null;
                let keyshareJson = null;
                let signContext = null;
                _event.on("/event/ecdsa-keygen/party/2", (step, message) => {
                    switch (step) {
                        case 1:
                            this.emit("pintswap/trade/maker", 0); // maker sees that taker clicked "fulfill trade"
                            this.logger.debug(`MAKER:: /event/ecdsa-keygen/party/2 handling message: ${step}`);
                            messages.push(context2.step1(message));
                            messages.push(Buffer.from(address.substr(2), "hex"));
                            this.logger.debug("MAKER: pushed context2.step1(message) + address");
                            break;
                        case 3:
                            this.logger.debug(`MAKER:: /event/ecdsa-keygen/party/2 handling message: ${step}`);
                            context2.step2(message);
                            // set keyshare and shared address
                            keyshareJson = context2.exportKeyShare().toJsonObject();
                            sharedAddress = (0, trade_2.keyshareToAddress)(keyshareJson);
                            break;
                        default:
                            throw new Error("Unexpected message on event /ecdsa-keygen/party/2");
                            break;
                    }
                });
                let offer = null;
                let permitData = null;
                _event.on("/event/approve-contract", (offerHashBuf) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        offer = this.offers.get(offerHashBuf.toString());
                        this.emit(`pintswap/request/create-trade/fulfilling`, offerHashBuf.toString(), offer); // emits offer hash and offer object to frontend
                        const tx = yield this.approveTradeAsMaker(offer, sharedAddress);
                        if (tx.permitData) {
                            permitData = tx.permitData;
                            messages.push(permit.encode(tx.permitData));
                        }
                        else {
                            yield this.signer.provider.waitForTransaction(tx.hash);
                            messages.push(Buffer.from([]));
                        }
                    }
                    catch (err) {
                        this.logger.error(err);
                        throw new Error("couldn't find offering");
                    }
                    this.emit("pintswap/trade/maker", 1); // maker sees the taker signed tx
                    this.logger.debug(`MAKER:: /event/approve-contract approved offer with offer hash: ${offerHashBuf.toString()}`);
                    approveDeferred.resolve();
                }));
                let takerPermitData = null;
                let signContextPromise = (0, trade_2.defer)();
                _event.on("/event/ecdsa-sign/party/2/init", (serializedTx) => __awaiter(this, void 0, void 0, function* () {
                    try {
                        const serialized = ethers_1.ethers.hexlify(serializedTx);
                        this.logger.debug(`MAKER:: /event/ecdsa-sign/party/2/init received transaction: ${serialized}`);
                        const transaction = ethers_1.ethers.Transaction.from(serialized);
                        if (transaction.to) {
                            throw Error("transaction must not have a recipient");
                        }
                        this.logger.debug("comparing contract");
                        let contractPermitData = {};
                        if (takerPermitData)
                            contractPermitData.taker = takerPermitData;
                        if (permitData)
                            contractPermitData.maker = permitData;
                        if (!Object.keys(contractPermitData).length)
                            contractPermitData = null;
                        if (transaction.data !==
                            (0, trade_2.createContract)(offer, yield this.signer.getAddress(), takerAddress, (yield this.signer.provider.getNetwork()).chainId, contractPermitData))
                            throw Error("transaction data is not a pintswap");
                        this.logger.debug("MAKER: making signContext");
                        signContext = yield two_party_ecdsa_js_1.TPCEcdsaSign.P2Context.createContext(JSON.stringify(keyshareJson, null, 4), new bn_js_1.default(transaction.unsignedHash.substr(2), 16));
                        signContextPromise.resolve();
                    }
                    catch (e) {
                        console.error(e);
                        this.logger.error(e);
                        _event.emit("error", e);
                    }
                }));
                _event.on("/event/ecdsa-sign/party/2", (step, message) => {
                    try {
                        switch (step) {
                            case 1:
                                this.logger.debug(`MAKER:: /event/ecdsa-sign/party/2 handling message: ${step}`);
                                messages.push(signContext.step1(message));
                                this.logger.debug("MAKER: pushed signContext.step1(message)");
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
                    }
                    catch (e) {
                        this.logger.error(e);
                        _event.emit("error", e);
                    }
                });
                const self = this;
                (0, it_pipe_1.pipe)(stream.source, lp.decode(), function (source) {
                    return __awaiter(this, void 0, void 0, function* () {
                        try {
                            const { value: keygenMessage1 } = yield source.next();
                            _event.emit("/event/ecdsa-keygen/party/2", 1, keygenMessage1.slice());
                            const { value: keygenMessage3 } = yield source.next();
                            _event.emit("/event/ecdsa-keygen/party/2", 3, keygenMessage3.slice());
                            const { value: offerHashBuf } = yield source.next();
                            _event.emit("/event/approve-contract", offerHashBuf.slice());
                            self.logger.debug('MAKER: WAITING FOR APPROVE');
                            self.logger.debug('MAKER: GOT APPROVE');
                            self.logger.debug("SHOULD RECEIVE PERMITDATA");
                            const { value: takerPermitDataBytes } = yield source.next();
                            const takerPermitDataSlice = takerPermitDataBytes.slice();
                            if (takerPermitDataSlice.length) {
                                takerPermitData = permit.decode(takerPermitDataSlice);
                            }
                            console.log('TAKERPERMITDATA', takerPermitDataSlice);
                            console.log(takerPermitData);
                            yield approveDeferred.promise;
                            self.logger.debug("SHOULD RECEIVE SERIALIZED");
                            const { value: serializedTx } = yield source.next();
                            self.logger.debug('RECEIVED SERIALIZED');
                            self.logger.debug(ethers_1.ethers.hexlify(serializedTx.slice()));
                            const { value: _takerAddress } = yield source.next();
                            takerAddress = ethers_1.ethers.getAddress(ethers_1.ethers.hexlify(_takerAddress.slice()));
                            self.logger.debug("RECEIVED TAKERADDRESS", takerAddress);
                            _event.emit("/event/ecdsa-sign/party/2/init", serializedTx.slice());
                            yield signContextPromise.promise;
                            const { value: signMessage1 } = yield source.next();
                            self.logger.debug("MAKER: received signMessage1");
                            _event.emit("/event/ecdsa-sign/party/2", 1, signMessage1.slice());
                            const { value: signMessage3 } = yield source.next();
                            _event.emit("/event/ecdsa-sign/party/2", 3, signMessage3.slice());
                            this.emit('pintswap/trade/maker', 2);
                        }
                        catch (e) {
                            console.error(e);
                        }
                    });
                });
                yield (0, it_pipe_1.pipe)(messages, lp.encode(), stream.sink);
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
            try {
                const tradeAddress = yield this.getTradeAddress(sharedAddress);
                const token = new Contract(yield (0, trade_2.coerceToWeth)(ethers_1.ethers.getAddress(offer.givesToken), this.signer), trade_2.genericAbi, this.signer);
                this.logger.debug("MAKER ADDRESS", yield this.signer.getAddress());
                logger.debug("MAKER BALANCE BEFORE APPROVING " +
                    ethers_1.ethers.formatEther(yield token.balanceOf(yield this.signer.getAddress())));
                if (offer.givesToken === ethers_1.ethers.ZeroAddress) {
                    const { chainId } = yield this.signer.provider.getNetwork();
                    yield new ethers_1.ethers.Contract((0, trade_1.toWETH)(chainId), ["function deposit()"], this.signer).deposit({ value: offer.givesAmount });
                }
                if (getAddress(offer.givesToken) === getAddress(permit.ASSETS.ETHEREUM.USDC)) {
                    const expiry = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
                    console.log('permit.sign');
                    const permitData = yield permit.sign({
                        asset: offer.givesToken,
                        value: offer.givesAmount,
                        spender: tradeAddress,
                        owner: yield this.signer.getAddress(),
                        expiry,
                    }, this.signer);
                    console.log('permitData', permitData);
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
            }
            catch (e) {
                console.error(e);
                throw e;
            }
        });
    }
    approveTradeAsTaker(offer, sharedAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const tradeAddress = yield this.getTradeAddress(sharedAddress);
            const token = new Contract(yield (0, trade_2.coerceToWeth)(getAddress(offer.getsToken), this.signer), trade_2.genericAbi, this.signer);
            this.logger.debug("TAKER ADDRESS", yield this.signer.getAddress());
            this.logger.debug("TAKER BALANCE BEFORE APPROVING " +
                ethers_1.ethers.formatEther(yield token.balanceOf(yield this.signer.getAddress())));
            console.log(offer);
            if (offer.getsToken === ethers_1.ethers.ZeroAddress) {
                const { chainId } = yield this.signer.provider.getNetwork();
                console.log(offer);
                console.log(chainId);
                console.log((0, trade_1.toWETH)(chainId));
                yield new ethers_1.ethers.Contract((0, trade_1.toWETH)(chainId), ["function deposit()"], this.signer).deposit({ value: offer.getsAmount });
                console.log('sent deposit()');
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
                        console.error(e);
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
        return __awaiter(this, void 0, void 0, function* () {
            this.logger.debug(`Acting on offer ${offer} with peer ${peer}`);
            this.emit("pintswap/trade/taker", 0); // start fulfilling trade
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
                    this._deferred = (0, trade_2.defer)();
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
                            sharedAddress = (0, trade_2.keyshareToAddress)(keyshareJson);
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
            let permitData = null;
            /*
             * Pintswap#approveAsMaker
             */
            let permitDataDeferred = (0, trade_2.defer)();
            _event.on("/event/approve-contract", () => __awaiter(this, void 0, void 0, function* () {
                this.emit("pintswap/trade/taker", 1); // taker approving token swap
                try {
                    // approve as maker
                    this.logger.debug(`TAKER:: /event/approve-contract approving offer: ${offer} of shared Address ${sharedAddress}`);
                    messages.push(Buffer.from((0, trade_2.hashOffer)(offer)));
                    const tx = yield this.approveTradeAsTaker(offer, sharedAddress);
                    permitData = tx.permitData;
                    permitDataDeferred.resolve();
                    if (!permitData)
                        yield this.signer.provider.waitForTransaction(tx.hash);
                    this.logger.debug("TAKER APPROVED");
                }
                catch (e) {
                    _event.emit("error", e);
                }
                _event.emit("tick");
                this.emit("pintswap/trade/taker", 2); // taker approved token swap
            }));
            let ethTransaction = null;
            _event.on("/event/build/tx", () => __awaiter(this, void 0, void 0, function* () {
                this.emit("pintswap/trade/taker", 3); // building transaction
                try {
                    this.logger.debug(`/event/build/tx funding sharedAddress ${sharedAddress}`);
                    let contractPermitData = {};
                    if (makerPermitData)
                        contractPermitData.maker = makerPermitData;
                    if (permitData)
                        contractPermitData.taker = permitData;
                    if (!Object.keys(contractPermitData).length)
                        contractPermitData = null;
                    const txParams = yield this.prepareTransaction(offer, makerAddress, sharedAddress, contractPermitData);
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
                    this.logger.debug("TAKER: pushed signContext.step1()");
                }
                catch (e) {
                    this.logger.error(e);
                    _event.emit("error", e);
                }
                _event.emit("tick");
                this.emit("pintswap/trade/taker", 4); // transaction built
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
                                r: "0x" + (0, trade_2.leftZeroPad)(r.toString(16), 64),
                                s: "0x" + (0, trade_2.leftZeroPad)(s.toString(16), 64),
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
            let makerPermitData = null;
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
                        yield permitDataDeferred.promise;
                        console.log('PUSHING PERMITDATA');
                        if (permitData)
                            messages.push(permit.encode(permitData));
                        else
                            messages.push(Buffer.from([]));
                        console.log('PUSHED PERMITDATA');
                        console.log('SHOULD RECEIVE PERMITDATABYTES');
                        const { value: permitDataBytes } = yield source.next();
                        console.log('RECEIVED RECEIVE PERMITDATABYTES');
                        const permitDataSlice = permitDataBytes.slice();
                        console.log('permitDataSlice', permitDataSlice);
                        if (permitDataSlice.length)
                            makerPermitData = permit.decode(permitDataSlice);
                        console.log('makerPermitData', makerPermitData);
                        /*
                    self.logger.debug('waiting one block');
                    await new Promise<void>((resolve) => {
                      const listener = () => {
                        self.signer.provider.removeListener('block', listener);
                        resolve();
                      };
                      self.signer.provider.on('block', listener);
                    });
                       */
                        self.logger.debug("enter /event/build/tx");
                        _event.emit("/event/build/tx");
                        self.logger.debug("TAKER: WAITING FOR /event/build/tx");
                        yield _event.wait();
                        self.logger.debug("TAKER: COMPLETED");
                        const { value: signMessage_2 } = yield source.next();
                        self.logger.debug("TAKER: GOT signMessage_2");
                        _event.emit("/event/ecdsa-sign/party/1", 2, signMessage_2.slice());
                        self.logger.debug("TAKER: WAITING FOR /event/ecdsa-sign/party/1");
                        yield _event.wait();
                        self.logger.debug("TAKER: COMPLETED");
                        const { value: signMessage_4 } = yield source.next();
                        self.logger.debug("TAKER: GOT signMessage_4");
                        _event.emit("/event/ecdsa-sign/party/1", 4, signMessage_4.slice());
                        yield _event.wait();
                    }
                    catch (e) {
                        self.logger.error(e);
                    }
                });
            });
            yield (0, it_pipe_1.pipe)(messages, lp.encode(), stream.sink);
            this.emit("pintswap/trade/taker", 5); // transaction complete
            return true;
        });
    }
}
exports.Pintswap = Pintswap;
//# sourceMappingURL=pintswap.js.map