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
exports.Pintswap = exports.NS_MULTIADDRS = exports.sumOffers = exports.toBigIntFromBytes = exports.scaleOffer = exports.decodeBatchFill = exports.encodeBatchFill = exports.PintswapTrade = exports.sendFlashbotsTransaction = void 0;
const protocol_1 = require("./protocol");
const p2p_1 = require("./p2p");
const ethers_1 = require("ethers");
const it_pipe_1 = require("it-pipe");
const lp = __importStar(require("it-length-prefixed"));
const two_party_ecdsa_js_1 = require("@safeheron/two-party-ecdsa-js");
const events_1 = require("events");
const permit2_sdk_1 = require("@uniswap/permit2-sdk");
const it_pushable_1 = __importDefault(require("it-pushable"));
const lodash_1 = require("lodash");
const trade_1 = require("./trade");
const bn_js_1 = __importDefault(require("bn.js"));
const trade_2 = require("./trade");
const peer_id_1 = __importDefault(require("peer-id"));
const logger_1 = require("./logger");
const permit = __importStar(require("./permit"));
const detect_permit_1 = require("./detect-permit");
const cross_fetch_1 = __importDefault(require("cross-fetch"));
const { getAddress, getCreateAddress, Contract, Transaction } = ethers_1.ethers;
const logger = (0, logger_1.createLogger)("pintswap");
const ln = (v) => (console.log(require("util").inspect(v, { colors: true, depth: 15 })), v);
const getGasPrice = (provider) => __awaiter(void 0, void 0, void 0, function* () {
    if (provider.getGasPrice)
        return yield provider.getGasPrice();
    return (yield provider.getFeeData()).gasPrice;
});
const signTypedData = (signer, ...args) => __awaiter(void 0, void 0, void 0, function* () {
    if (signer.signTypedData)
        return yield signer.signTypedData(...args);
    return yield signer._signTypedData(...args);
});
let id = 0;
function sendFlashbotsTransaction(data) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield (0, cross_fetch_1.default)("https://rpc.flashbots.net", {
            method: "POST",
            headers: {
                "content-type": "application/json",
                accept: "application/json",
            },
            body: JSON.stringify({
                id: id++,
                jsonrpc: "2.0",
                method: "eth_sendRawTransaction",
                params: [data],
            }),
        });
        return yield response.json();
    });
}
exports.sendFlashbotsTransaction = sendFlashbotsTransaction;
const getPermitData = (signatureTransfer) => {
    const { domain, types, values } = permit2_sdk_1.SignatureTransfer.getPermitData(signatureTransfer.permit, signatureTransfer.permit2Address, signatureTransfer.chainId);
    return [domain, types, values];
};
class PintswapTrade extends events_1.EventEmitter {
    constructor() {
        super();
        this._deferred = (0, trade_2.defer)();
        this.hashes = null;
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
function encodeBatchFill(o) {
    return protocol_1.protocol.BatchFill.encode({
        fills: o.map((v) => ({
            offerHash: Buffer.from(ethers_1.ethers.toBeArray(v.offerHash)),
            amount: Buffer.from(ethers_1.ethers.toBeArray(ethers_1.ethers.getUint(v.amount))),
        })),
    }).finish();
}
exports.encodeBatchFill = encodeBatchFill;
function decodeBatchFill(data) {
    const { fills } = protocol_1.protocol.BatchFill.toObject(protocol_1.protocol.BatchFill.decode(data), {
        enums: String,
        longs: String,
        bytes: String,
        defaults: true,
        arrays: true,
        objects: true,
        oneofs: true,
    });
    return fills.map((v) => ({
        offerHash: ethers_1.ethers.hexlify(ethers_1.ethers.decodeBase64(v.offerHash)),
        amount: ethers_1.ethers.getUint(ethers_1.ethers.hexlify(ethers_1.ethers.decodeBase64(v.amount))),
    }));
}
exports.decodeBatchFill = decodeBatchFill;
function scaleOffer(offer, amount) {
    if (ethers_1.ethers.getUint(amount) > ethers_1.ethers.getUint(offer.gets.amount))
        throw Error("fill amount exceeds order capacity");
    return {
        gives: {
            token: offer.gives.token,
            amount: ethers_1.ethers.hexlify(ethers_1.ethers.toBeArray((ethers_1.ethers.getUint(offer.gives.amount) * ethers_1.ethers.getUint(amount)) /
                ethers_1.ethers.getUint(offer.gets.amount))),
        },
        gets: {
            token: offer.gets.token,
            amount: ethers_1.ethers.hexlify(ethers_1.ethers.toBeArray(ethers_1.ethers.getUint(amount))),
        },
    };
}
exports.scaleOffer = scaleOffer;
function toBigIntFromBytes(b) {
    if (b === "0x" || b.length === 0)
        return BigInt(0);
    return ethers_1.ethers.toBigInt(b);
}
exports.toBigIntFromBytes = toBigIntFromBytes;
function sumOffers(offers) {
    return offers.reduce((r, v) => ({
        gets: {
            token: v.gets.token,
            amount: ethers_1.ethers.toBeHex(toBigIntFromBytes(v.gets.amount) + toBigIntFromBytes(r.gets.amount)),
        },
        gives: {
            token: v.gives.token,
            amount: ethers_1.ethers.toBeHex(toBigIntFromBytes(v.gives.amount) + toBigIntFromBytes(r.gives.amount)),
        },
    }), {
        gets: { amount: ethers_1.ethers.toBigInt(0) },
        gives: { amount: ethers_1.ethers.toBigInt(0) },
    });
}
exports.sumOffers = sumOffers;
exports.NS_MULTIADDRS = {
    DRIP: ["QmUtvU33iaHun99yD9HgiyLSrmPhWUbXVX2hAZRY4AEV2d"],
};
class Pintswap extends p2p_1.PintP2P {
    static initialize({ awaitReceipts, signer }) {
        return __awaiter(this, void 0, void 0, function* () {
            const peerId = yield peer_id_1.default.create();
            return new Pintswap({ signer, awaitReceipts, peerId });
        });
    }
    resolveName(name) {
        return __awaiter(this, void 0, void 0, function* () {
            const parts = name.split(".");
            const query = parts.slice(0, Math.max(parts.length - 1, 1)).join(".");
            const tld = parts.length === 1 ? "drip" : parts[parts.length - 1];
            const messages = (0, it_pushable_1.default)();
            const response = yield new Promise((resolve, reject) => {
                (() => __awaiter(this, void 0, void 0, function* () {
                    const nsHosts = exports.NS_MULTIADDRS[tld.toUpperCase()];
                    const { stream } = yield this.dialProtocol(peer_id_1.default.createFromB58String(nsHosts[Math.floor(nsHosts.length * Math.random())]), "/pintswap/0.1.0/ns/query");
                    (0, it_pipe_1.pipe)(messages, lp.encode(), stream.sink);
                    messages.push(protocol_1.protocol.NameQuery.encode({
                        name: query,
                    }).finish());
                    messages.end();
                    const it = (0, it_pipe_1.pipe)(stream.source, lp.decode());
                    const response = protocol_1.protocol.NameQueryResponse.decode((yield it.next()).value.slice());
                    resolve({
                        status: response.status,
                        result: response.result,
                    });
                }))().catch(reject);
            });
            if (response.status === 0)
                throw Error("no name registered");
            return response.result + (parts.length > 1 ? "" : "." + tld);
        });
    }
    registerName(name) {
        return __awaiter(this, void 0, void 0, function* () {
            let parts = name.split(".");
            const query = parts.slice(0, -1).join(".");
            const tld = parts[parts.length - 1];
            const messages = (0, it_pushable_1.default)();
            const response = yield new Promise((resolve, reject) => {
                (() => __awaiter(this, void 0, void 0, function* () {
                    const nsHosts = exports.NS_MULTIADDRS[tld.toUpperCase()];
                    const { stream } = yield this.dialProtocol(peer_id_1.default.createFromB58String(nsHosts[Math.floor(nsHosts.length * Math.random())]), "/pintswap/0.1.0/ns/register");
                    (0, it_pipe_1.pipe)(messages, lp.encode(), stream.sink);
                    messages.push(Buffer.from(query));
                    messages.end();
                    const it = yield (0, it_pipe_1.pipe)(stream.source, lp.decode());
                    const response = protocol_1.protocol.NameRegisterResponse.decode((yield it.next()).value.slice());
                    resolve({
                        status: response.status,
                    });
                }))().catch(reject);
            });
            return response;
        });
    }
    constructor({ awaitReceipts, signer, peerId, userData, offers }) {
        super({ signer, peerId });
        this.offers = new Map();
        this.signer = signer;
        this.logger = logger;
        this.peers = new Map();
        this.offers = offers || new Map();
        this.userData = userData || {
            bio: "",
            image: Buffer.from([]),
        };
        this._awaitReceipts = awaitReceipts || false;
    }
    setBio(s) {
        this.userData.bio = s;
    }
    setImage(b) {
        this.userData.image = b;
    }
    publishOffers() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.pubsub.publish("/pintswap/0.1.0/publish-orders", ethers_1.ethers.toBeArray(ethers_1.ethers.hexlify(this._encodeOffers())));
        });
    }
    startPublishingOffers(ms) {
        if (!ms)
            ms = 10000;
        let end = false;
        (() => __awaiter(this, void 0, void 0, function* () {
            while (!end) {
                try {
                    yield this.publishOffers();
                }
                catch (e) {
                    this.logger.error(e);
                }
                yield new Promise((resolve) => setTimeout(resolve, ms));
            }
        }))().catch((err) => this.logger.error(err));
        return {
            setInterval(_ms) {
                ms = _ms;
            },
            stop() {
                end = true;
            },
        };
    }
    subscribeOffers() {
        return __awaiter(this, void 0, void 0, function* () {
            this.pubsub.on("/pintswap/0.1.0/publish-orders", (message) => {
                this.logger.debug(`\n PUBSUB: TOPIC-${message.topicIDs[0]} \n FROM: PEER-${message.from}`);
                this.logger.info(message.data);
                const offers = this._decodeOffers(message.data).offers;
                let _offerhash = ethers_1.ethers.keccak256(message.data);
                const pair = [_offerhash, offers];
                this.logger.info(pair);
                if (this.peers.has(message.from)) {
                    if (this.peers.get(message.from)[0] == _offerhash)
                        return;
                    this.peers.set(message.from, pair);
                    this.emit("/pubsub/orderbook-update");
                    return;
                }
                this.peers.set(message.from, pair);
                this.emit("/pubsub/orderbook-update");
            });
            this.pubsub.subscribe("/pintswap/0.1.0/publish-orders");
        });
    }
    startNode() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.handleBroadcastedOffers();
            yield this.handleUserData();
            yield this.start();
            yield this.pubsub.start();
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
    toObject() {
        return {
            peerId: this.peerId.toJSON(),
            userData: {
                bio: this.userData.bio,
                image: this.userData.image.toString("base64"),
            },
            offers: [...this.offers.values()],
        };
    }
    static fromObject(o, signer) {
        return __awaiter(this, void 0, void 0, function* () {
            const initArg = Object.assign(Object.assign({}, o), { userData: o.userData && {
                    bio: o.userData.bio,
                    image: Buffer.from(o.userData.image, "base64"),
                }, offers: o.offers &&
                    new Map(o.offers.map((v) => [(0, trade_2.hashOffer)(v), v])), peerId: o.peerId && (yield peer_id_1.default.createFromJSON(o.peerId)), signer });
            return new Pintswap(initArg);
        });
    }
    _encodeOffers() {
        return protocol_1.protocol.OfferList.encode({
            offers: [...this.offers.values()].map((v) => (0, lodash_1.mapValues)(v, (v) => Buffer.from(ethers_1.ethers.toBeArray(v)))),
        }).finish();
    }
    _encodeUserData() {
        return protocol_1.protocol.UserData.encode({
            offers: [...this.offers.values()].map((v) => (0, lodash_1.mapValues)(v, (v) => Buffer.from(ethers_1.ethers.toBeArray(v)))),
            image: this.userData.image,
            bio: this.userData.bio,
        }).finish();
    }
    handleUserData() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.handle("/pintswap/0.1.0/userdata", ({ stream }) => {
                try {
                    this.logger.debug("handling userdata request");
                    this.emit("pintswap/trade/peer", 2);
                    let userData = this._encodeUserData();
                    const messages = (0, it_pushable_1.default)();
                    (0, it_pipe_1.pipe)(messages, lp.encode(), stream.sink);
                    messages.push(userData);
                    messages.end();
                }
                catch (e) {
                    this.logger.error(e);
                }
            });
        });
    }
    handleBroadcastedOffers() {
        return __awaiter(this, void 0, void 0, function* () {
            const address = yield this.signer.getAddress();
            yield this.handle("/pintswap/0.1.0/orders", ({ stream }) => {
                try {
                    this.logger.debug("handling order request from peer");
                    this.emit("pintswap/trade/peer", 2); // maker sees that taker is connected
                    let offerList = this._encodeOffers();
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
                        let offerHashHex, offer, offers, batchFill, originalOffers;
                        try {
                            const { value: batchFillBufList } = yield source.next();
                            batchFill = decodeBatchFill(batchFillBufList.slice());
                            ln("batch fill decode");
                            ln(batchFill);
                            originalOffers = batchFill.map((v) => self.offers.get(v.offerHash));
                            offers = batchFill.map((v, i) => (Object.assign({}, scaleOffer(originalOffers[i], v.amount))));
                            if ((0, lodash_1.uniq)(offers.map((v) => ethers_1.ethers.getAddress(v.gets.token)))
                                .length !== 1 ||
                                (0, lodash_1.uniq)(offers.map((v) => ethers_1.ethers.getAddress(v.gives.token)))
                                    .length !== 1)
                                throw Error("must fill orders for same trade pair");
                            offerHashHex = ethers_1.ethers.hexlify(batchFillBufList.slice());
                            offer = ln(sumOffers(ln(offers)));
                            offers.forEach((v, i) => {
                                self.offers.delete(batchFill[i].offerHash);
                            });
                            batchFill.forEach((v) => trade.emit("hash", v.offerHash));
                            trade.hashes = batchFill.map((v) => v.offerHash);
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
                            self.emit(`pintswap/request/create-trade/fulfilling`, offerHashHex, offer); // emits offer hash and offer object to frontend
                            trade.emit("fulfilling", {
                                hash: offerHashHex,
                                offer,
                            });
                            const tx = yield self.approveTradeAsMaker(offer, sharedAddress);
                            console.log("tx", tx);
                            if (tx.permitData) {
                                const encoded = permit.encode(tx.permitData);
                                messages.push(encoded);
                            }
                            else {
                                yield self.signer.provider.waitForTransaction(tx.hash);
                                messages.push(Buffer.from([]));
                            }
                            self.emit("pintswap/trade/maker", 1); // maker sees the taker signed tx
                            trade.emit("progress", 1);
                            self.logger.debug(`MAKER:: /event/approve-contract approved offer with offer hash: ${offerHashHex}`);
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
                            self.logger.debug("MAKER: RECEIVED SERIALIZED");
                            const { value: payCoinbaseAmountBufList } = yield source.next();
                            self.logger.debug("MAKER: RECEIVED PAYCOINBASEAMOUNT");
                            const payCoinbaseAmountBuffer = payCoinbaseAmountBufList.slice();
                            const payCoinbaseAmount = payCoinbaseAmountBuffer.length
                                ? ethers_1.ethers.hexlify(ethers_1.ethers.toBeArray("0x" + payCoinbaseAmountBuffer.toString("hex")))
                                : null;
                            self.logger.debug("MAKER: pay coinbase " + payCoinbaseAmount);
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
                            /*
                            if (
                              ethers.getUint(transaction.gasPrice) >
                              BigInt(500000) * BigInt(await getGasPrice(self.signer.provider))
                            ) {
                              throw Error("transaction.gasPrice is unrealistically high");
                            }
                       */
                            self.logger.debug("comparing contract");
                            let contractPermitData = {};
                            if (takerPermitData)
                                contractPermitData.taker = takerPermitData;
                            if (tx.permitData)
                                contractPermitData.maker = tx.permitData;
                            if (!Object.keys(contractPermitData).length)
                                contractPermitData = null;
                            if (transaction.data !==
                                (0, trade_2.createContract)(offer, yield self.signer.getAddress(), takerAddress, Number((yield self.signer.provider.getNetwork()).chainId), contractPermitData, payCoinbaseAmount))
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
                            if (offers && batchFill) {
                                originalOffers.forEach((offer) => {
                                    self.offers.set((0, trade_2.hashOffer)(offer), offer);
                                });
                            }
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
    getUserDataByPeerId(peerId) {
        return __awaiter(this, void 0, void 0, function* () {
            let pid = peer_id_1.default.createFromB58String(peerId);
            while (true) {
                try {
                    yield this.peerRouting.findPeer(pid);
                    break;
                }
                catch (e) {
                    this.logger.error(e);
                    yield new Promise((resolve) => setTimeout(resolve, 3000));
                }
            }
            this.emit("pintswap/trade/peer", 0); // start finding peer's orders
            const { stream } = yield this.dialProtocol(pid, "/pintswap/0.1.0/userdata");
            this.emit("pintswap/trade/peer", 1); // peer found
            const decoded = (0, it_pipe_1.pipe)(stream.source, lp.decode());
            const { value: userDataBufferList } = yield decoded.next();
            const result = userDataBufferList.slice();
            this.emit("pintswap/trade/peer", 2); // got offers
            const userData = this._decodeUserData(result);
            this.emit("pintswap/trade/peer", 3); // offers decoded and returning
            return userData;
        });
    }
    // Takes in a peerId and returns a list of exisiting trades
    getTradesByPeerId(peerId) {
        return __awaiter(this, void 0, void 0, function* () {
            let pid = peer_id_1.default.createFromB58String(peerId);
            while (true) {
                try {
                    yield this.peerRouting.findPeer(pid);
                    break;
                }
                catch (e) {
                    this.logger.error(e);
                    yield new Promise((resolve) => setTimeout(resolve, 3000));
                }
            }
            this.emit("pintswap/trade/peer", 0); // start finding peer's orders
            const { stream } = yield this.dialProtocol(pid, "/pintswap/0.1.0/orders");
            this.emit("pintswap/trade/peer", 1); // peer found
            const decoded = (0, it_pipe_1.pipe)(stream.source, lp.decode());
            const { value: offerListBufferList } = yield decoded.next();
            const result = offerListBufferList.slice();
            this.emit("pintswap/trade/peer", 2); // got offers
            const offerList = this._decodeOffers(result);
            this.emit("pintswap/trade/peer", 3); // offers decoded and returning
            return offerList;
        });
    }
    _decodeOffers(data) {
        let offerList = protocol_1.protocol.OfferList.toObject(protocol_1.protocol.OfferList.decode(data), {
            enums: String,
            longs: String,
            bytes: String,
            defaults: true,
            arrays: true,
            objects: true,
            oneofs: true,
        });
        let remap = offerList.offers
            .map((v) => {
            return {
                gets: v.gets[v.gets.data],
                gives: v.gives[v.gives.data],
            };
        })
            .map(({ gets, gives }) => {
            return Object.fromEntries([
                ["gets", gets],
                ["gives", gives],
            ].map(([key, value]) => (0, lodash_1.mapValues)(value, (v) => {
                const address = ethers_1.ethers.hexlify(ethers_1.ethers.decodeBase64(v));
                return "0x" + (0, trade_2.leftZeroPad)(address.substr(2), 40);
            })));
        });
        return Object.assign(offerList, { offers: remap });
    }
    _decodeUserData(data) {
        let userData = protocol_1.protocol.UserData.toObject(protocol_1.protocol.UserData.decode(data), {
            enums: String,
            longs: String,
            bytes: String,
            defaults: true,
            arrays: true,
            objects: true,
            oneofs: true,
        });
        const offers = userData.offers.map((v) => {
            return (0, lodash_1.mapValues)(v, (v) => {
                const address = ethers_1.ethers.hexlify(ethers_1.ethers.decodeBase64(v));
                return "0x" + (0, trade_2.leftZeroPad)(address.substr(2), 40);
            });
        });
        return {
            offers,
            image: Buffer.from(ethers_1.ethers.decodeBase64(userData.image)),
            bio: userData.bio,
        };
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
            const token = new Contract(yield (0, trade_2.coerceToWeth)(ethers_1.ethers.getAddress(offer.gives.token), this.signer), trade_2.genericAbi, this.signer);
            this.logger.debug("MAKER ADDRESS", yield this.signer.getAddress());
            this.logger.debug("MAKER BALANCE BEFORE APPROVING " +
                ethers_1.ethers.formatEther(yield token.balanceOf(yield this.signer.getAddress())));
            if (offer.gives.token === ethers_1.ethers.ZeroAddress) {
                const { chainId } = yield this.signer.provider.getNetwork();
                const weth = new ethers_1.ethers.Contract((0, trade_1.toWETH)(Number(chainId)), [
                    "function deposit()",
                    "function balanceOf(address) view returns (uint256)",
                ], this.signer);
                const depositTx = yield weth.deposit({ value: offer.gives.amount });
                if (this._awaitReceipts)
                    yield this.signer.provider.waitForTransaction(depositTx.hash);
                this.logger.debug("MAKER: WETH BALANCE " +
                    ethers_1.ethers.formatEther(yield weth.balanceOf(yield this.signer.getAddress())));
            }
            if (yield (0, detect_permit_1.detectPermit)(offer.gives.token, this.signer)) {
                const expiry = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
                const permitData = yield permit.sign({
                    asset: offer.gives.token,
                    value: offer.gives.amount,
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
            else if (Number((yield this.signer.provider.getNetwork()).chainId) === 1) {
                const tx = yield this.approvePermit2(offer.gives.token);
                if (tx && this._awaitReceipts)
                    yield this.signer.provider.waitForTransaction(tx.hash);
                const signatureTransfer = {
                    permit: {
                        permitted: {
                            token: yield (0, trade_2.coerceToWeth)(offer.gives.token, this.signer),
                            amount: offer.gives.amount,
                        },
                        spender: tradeAddress,
                        nonce: ethers_1.ethers.hexlify(ethers_1.ethers.toBeArray(ethers_1.ethers.getUint(Math.floor(Date.now() / 1000)))),
                        deadline: ethers_1.ethers.hexlify(ethers_1.ethers.toBeArray(ethers_1.ethers.getUint(Math.floor(Date.now() / 1000)) +
                            BigInt(60 * 60 * 24))),
                    },
                    permit2Address: permit2_sdk_1.PERMIT2_ADDRESS,
                    chainId: 1,
                };
                const signature = yield signTypedData(this.signer, ...getPermitData(signatureTransfer));
                return {
                    permitData: {
                        signatureTransfer: signatureTransfer.permit,
                        signature,
                    },
                    wait() {
                        return __awaiter(this, void 0, void 0, function* () {
                            return {};
                        });
                    },
                };
            }
            else {
                const tx = yield token.approve(tradeAddress, offer.gives.amount);
                this.logger.debug("TRADE ADDRESS", tradeAddress);
                this.logger.debug("MAKER BALANCE AFTER APPROVING " +
                    ethers_1.ethers.formatEther(yield token.balanceOf(yield this.signer.getAddress())));
                this.logger.debug("MAKER ALLOWANCE AFTER APPROVING " +
                    ethers_1.ethers.formatEther(yield token.allowance(yield this.signer.getAddress(), tradeAddress)));
                return tx;
            }
        });
    }
    approvePermit2(asset) {
        return __awaiter(this, void 0, void 0, function* () {
            const token = new Contract(yield (0, trade_2.coerceToWeth)(asset, this.signer), trade_2.genericAbi, this.signer);
            const allowance = yield token.allowance(yield this.signer.getAddress(), permit2_sdk_1.PERMIT2_ADDRESS);
            if (ethers_1.ethers.getUint(allowance) < ethers_1.ethers.getUint("0x0" + "f".repeat(63))) {
                return yield token.approve(permit2_sdk_1.PERMIT2_ADDRESS, ethers_1.ethers.MaxUint256);
            }
            return null;
        });
    }
    approveTradeAsTaker(offer, sharedAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const tradeAddress = yield this.getTradeAddress(sharedAddress);
            const address = yield (0, trade_2.coerceToWeth)(getAddress(offer.gets.token), this.signer);
            const token = new Contract(address, trade_2.genericAbi, this.signer);
            this.logger.debug("TAKER ADDRESS", yield this.signer.getAddress());
            this.logger.debug("TAKER BALANCE BEFORE APPROVING " +
                ethers_1.ethers.formatEther(yield token.balanceOf(yield this.signer.getAddress())));
            if (offer.gets.token === ethers_1.ethers.ZeroAddress) {
                const { chainId } = yield this.signer.provider.getNetwork();
                const weth = new ethers_1.ethers.Contract((0, trade_1.toWETH)(Number(chainId)), [
                    "function deposit()",
                    "function balanceOf(address) view returns (uint256)",
                ], this.signer);
                const depositTx = yield weth.deposit({ value: offer.gets.amount });
                if (this._awaitReceipts)
                    yield this.signer.provider.waitForTransaction(depositTx.hash);
                this.logger.debug("TAKER: WETH BALANCE " +
                    ethers_1.ethers.formatEther(yield weth.balanceOf(yield this.signer.getAddress())));
            }
            if (yield (0, detect_permit_1.detectPermit)(offer.gets.token, this.signer)) {
                const expiry = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
                const permitData = yield permit.sign({
                    asset: offer.gets.token,
                    value: offer.gets.amount,
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
            else if (Number((yield this.signer.provider.getNetwork()).chainId) === 1) {
                const tx = yield this.approvePermit2(offer.gets.token);
                if (tx && this._awaitReceipts)
                    yield this.signer.provider.waitForTransaction(tx.hash);
                const signatureTransfer = {
                    permit: {
                        permitted: {
                            token: yield (0, trade_2.coerceToWeth)(offer.gets.token, this.signer),
                            amount: offer.gets.amount,
                        },
                        spender: tradeAddress,
                        nonce: ethers_1.ethers.hexlify(ethers_1.ethers.toBeArray(ethers_1.ethers.getUint(Math.floor(Date.now() / 1000)))),
                        deadline: ethers_1.ethers.hexlify(ethers_1.ethers.toBeArray(ethers_1.ethers.getUint(Math.floor(Date.now() / 1000)) +
                            BigInt(60 * 60 * 24))),
                    },
                    permit2Address: permit2_sdk_1.PERMIT2_ADDRESS,
                    chainId: 1,
                };
                const signature = yield signTypedData(this.signer, ...getPermitData(signatureTransfer));
                return {
                    permitData: {
                        signatureTransfer: signatureTransfer.permit,
                        signature,
                    },
                    wait() {
                        return __awaiter(this, void 0, void 0, function* () {
                            return {};
                        });
                    },
                };
            }
            else {
                const tx = yield token.approve(tradeAddress, offer.gets.amount);
                this.logger.debug("TAKER BALANCE AFTER APPROVING " +
                    ethers_1.ethers.formatEther(yield token.balanceOf(yield this.signer.getAddress())));
                return tx;
            }
        });
    }
    prepareTransaction(offer, maker, sharedAddress, permitData) {
        return __awaiter(this, void 0, void 0, function* () {
            const chainId = Number((yield this.signer.provider.getNetwork()).chainId);
            const payCoinbase = Boolean(false &&
                [offer.gives.token, offer.gets.token].find((v) => ethers_1.ethers.ZeroAddress === v));
            const taker = yield this.signer.getAddress();
            let contract = (0, trade_2.createContract)(offer, maker, taker, chainId, permitData, payCoinbase ? "0x01" : null);
            const gasPrice = (0, trade_1.toBigInt)(yield getGasPrice(this.signer.provider));
            console.log(contract);
            const gasLimit = yield (() => __awaiter(this, void 0, void 0, function* () {
                do {
                    try {
                        return ((0, trade_1.toBigInt)(yield this.signer.provider.estimateGas({
                            data: contract,
                            from: sharedAddress,
                            //          gasPrice,
                        })) + BigInt(26000));
                    }
                    catch (e) {
                        this.logger.error(e);
                        yield new Promise((resolve) => setTimeout(resolve, 1000));
                    }
                } while (true);
            }))();
            const payCoinbaseAmount = payCoinbase
                ? ethers_1.ethers.hexlify(ethers_1.ethers.toBeArray(gasLimit * gasPrice))
                : null;
            this.logger.debug("GASLIMIT: " + String(Number(gasLimit)));
            return Object.assign(payCoinbase
                ? {
                    maxPriorityFeePerGas: BigInt(0),
                    maxFeePerGas: ethers_1.ethers.getUint((yield this.signer.provider.getBlock("latest")).baseFeePerGas.toHexString()),
                }
                : { gasPrice }, {
                data: !payCoinbase
                    ? contract
                    : (0, trade_2.createContract)(offer, maker, taker, chainId, permitData, payCoinbaseAmount),
                gasLimit,
                payCoinbaseAmount,
            });
        });
    }
    createTransaction(txParams, sharedAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const { gasLimit, maxFeePerGas, maxPriorityFeePerGas, gasPrice, data } = txParams;
            let sharedAddressBalance = (0, trade_1.toBigInt)(yield this.signer.provider.getBalance(sharedAddress));
            this.logger.debug(`network ${(yield this.signer.provider.getNetwork()).chainId}`, sharedAddressBalance, gasPrice, gasLimit);
            return Object.assign(new Transaction(), txParams, {
                chainId: (yield this.signer.provider.getNetwork()).chainId,
                nonce: yield this.signer.provider.getTransactionCount(sharedAddress),
                value: BigInt(0),
            });
        });
    }
    createTrade(peer, offer) {
        return this.createBatchTrade(peer, [
            {
                offer,
                amount: offer.gets.amount,
            },
        ]);
    }
    createBatchTrade(peer, batchFill) {
        const trade = new PintswapTrade();
        trade.hashes = batchFill.map((v) => (0, trade_2.hashOffer)(v.offer));
        this.emit("trade:taker", trade);
        (() => __awaiter(this, void 0, void 0, function* () {
            this.logger.debug(`Acting on offer ${trade.hashes} with peer ${peer}`);
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
                        messages.push(encodeBatchFill(batchFill.map((v) => ({
                            offerHash: (0, trade_2.hashOffer)(v.offer),
                            amount: v.amount,
                        }))));
                        const offer = ln(sumOffers(ln(batchFill.map((v) => v.offer))));
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
                        const approveTx = yield self.approveTradeAsTaker(offer, sharedAddress);
                        if (!approveTx.permitData)
                            yield self.signer.provider.waitForTransaction(approveTx.hash);
                        self.logger.debug("TAKER APPROVED");
                        self.emit("pintswap/trade/taker", 2); // taker approved token swap
                        trade.emit("progress", 2);
                        self.logger.debug("PUSHING PERMITDATA");
                        console.log(approveTx);
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
                        const payCoinbaseAmount = txParams.payCoinbaseAmount;
                        delete txParams.payCoinbaseAmount;
                        if (!payCoinbaseAmount) {
                            const ethTransaction = yield self.signer.sendTransaction({
                                to: sharedAddress,
                                value: txParams.gasPrice * txParams.gasLimit, // change to gasPrice * gasLimit
                            });
                            yield self.signer.provider.waitForTransaction(ethTransaction.hash);
                        }
                        self.logger.debug(`TAKER:: /event/build/tx building transaction with params: ${offer}, ${yield self.signer.getAddress()}, ${sharedAddress}`);
                        const tx = yield self.createTransaction(txParams, sharedAddress);
                        self.logger.debug(`TAKER:: /event/build/tx built transaction`);
                        const _uhash = tx.unsignedHash.slice(2);
                        const serialized = Buffer.from(ethers_1.ethers.toBeArray(tx.unsignedSerialized));
                        const signContext = yield two_party_ecdsa_js_1.TPCEcdsaSign.P1Context.createContext(JSON.stringify(keyshareJson, null, 4), new bn_js_1.default(_uhash, 16));
                        self.logger.debug(`TAKER:: /event/build/tx sending unsigned transaction hash & signing step 1`);
                        messages.push(serialized);
                        messages.push(payCoinbaseAmount
                            ? Buffer.from(ethers_1.ethers.toBeArray(payCoinbaseAmount))
                            : Buffer.from([]));
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
                        let txHash;
                        if (tx.maxPriorityFeePerGas &&
                            ethers_1.ethers.getUint(tx.maxPriorityFeePerGas) === BigInt(0)) {
                            txHash = yield sendFlashbotsTransaction(tx.serialized);
                            console.log(txHash);
                        }
                        else {
                            txHash = (typeof self.signer.provider.sendTransaction == "function"
                                ? yield self.signer.provider.sendTransaction(tx.serialized)
                                : yield self.signer.provider.broadcastTransaction(tx.serialized)).hash;
                        }
                        const txReceipt = yield self.signer.provider.waitForTransaction(txHash);
                        self.logger.debug(require("util").inspect(txReceipt, {
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