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
exports.Pintswap = exports.NS_MULTIADDRS = exports.sumOffers = exports.toBigIntFromBytes = exports.scaleOffer = exports.decodeBatchFill = exports.encodeBatchFill = exports.PintswapTrade = exports.sendFlashbotsTransaction = exports.protobufOffersToHex = void 0;
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
const timeout_1 = require("./timeout");
const bn_js_1 = __importDefault(require("bn.js"));
const trade_2 = require("./trade");
const peer_id_1 = __importDefault(require("peer-id"));
const logger_1 = require("./logger");
const permit = __importStar(require("./permit"));
const erc721Permit = __importStar(require("./erc721-permit"));
const detect_permit_1 = require("./detect-permit");
const detect_erc721_permit_1 = require("./detect-erc721-permit");
const cross_fetch_1 = __importDefault(require("cross-fetch"));
const webhook_1 = require("./webhook");
const { getAddress, getCreateAddress, Contract, Transaction } = ethers_1.ethers;
const base64ToValue = (data) => ethers_1.ethers.hexlify(ethers_1.ethers.decodeBase64(data));
const base64ToAddress = (data) => {
    return ethers_1.ethers.getAddress(ethers_1.ethers.zeroPadValue(base64ToValue(data), 20));
};
const logger = (0, logger_1.createLogger)("pintswap");
const toTypedTransfer = (transfer) => Object.fromEntries([
    [
        (0, trade_2.isERC20Transfer)(transfer)
            ? "erc20"
            : (0, trade_2.isERC721Transfer)(transfer)
                ? "erc721"
                : (0, trade_2.isERC721Transfer)(transfer)
                    ? "erc1155"
                    : (() => {
                        throw Error("no token type found");
                    })(),
        transfer,
    ],
]);
const NFT_WILDCARD = "0xf00000000000000000000000000000000000000000000000000000000000000000";
const protobufOffersToHex = (offers) => offers.map((v) => {
    return (0, lodash_1.mapValues)(v, (v) => {
        const transfer = v[v.data];
        const o = {};
        if (["erc20", "erc1155"].includes(v.data))
            o.amount = ethers_1.ethers.hexlify(ethers_1.ethers.decodeBase64(transfer.amount));
        if (["erc721", "erc1155"].includes(v.data))
            o.tokenId = ethers_1.ethers.hexlify(ethers_1.ethers.decodeBase64(transfer.tokenId));
        o.token = ethers_1.ethers.getAddress(ethers_1.ethers.zeroPadValue(ethers_1.ethers.decodeBase64(transfer.token), 20));
        return o;
    });
});
exports.protobufOffersToHex = protobufOffersToHex;
const getGasPrice = (provider) => __awaiter(void 0, void 0, void 0, function* () {
    if (provider.getGasPrice) {
        return yield provider.getGasPrice();
    }
    return (yield provider.getFeeData()).gasPrice;
});
const max = (a, b) => {
    if (a > b)
        return a;
    else
        return b;
};
const getGasPriceWithFloor = (provider) => __awaiter(void 0, void 0, void 0, function* () {
    const pending = yield provider.getBlock("latest");
    const gasPrice = yield getGasPrice(provider);
    return max(Number(pending.baseFeePerGas), Number(gasPrice));
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
        offerHash: ethers_1.ethers.zeroPadValue(ethers_1.ethers.hexlify(ethers_1.ethers.decodeBase64(v.offerHash)), 32),
        amount: ethers_1.ethers.getUint(ethers_1.ethers.hexlify(ethers_1.ethers.decodeBase64(v.amount))),
    }));
}
exports.decodeBatchFill = decodeBatchFill;
function scaleOffer(offer, amount) {
    if (!offer.gets.amount || !offer.gives.amount)
        return offer;
    if (ethers_1.ethers.getUint(amount) > ethers_1.ethers.getUint(offer.gets.amount))
        throw Error("fill amount exceeds order capacity");
    const n = ethers_1.ethers.getUint(amount);
    const d = ethers_1.ethers.getUint(offer.gets.amount);
    if (n === d)
        return offer;
    return {
        gives: {
            tokenId: offer.gives.tokenId,
            token: offer.gives.token,
            amount: ethers_1.ethers.hexlify(ethers_1.ethers.toBeArray((ethers_1.ethers.getUint(offer.gives.amount) * n) / d)),
        },
        gets: {
            token: offer.gets.token,
            tokenId: offer.gets.tokenId,
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
            amount: v.gets.amount &&
                ethers_1.ethers.toBeHex(toBigIntFromBytes(v.gets.amount) +
                    toBigIntFromBytes(r.gets.amount || "0x0")),
            tokenId: v.gets.tokenId,
        },
        gives: {
            token: v.gives.token,
            amount: v.gives.amount &&
                ethers_1.ethers.toBeHex(toBigIntFromBytes(v.gives.amount) +
                    toBigIntFromBytes(r.gives.amount || "0x0")),
            tokenId: v.gives.tokenId,
        },
    }), {
        gets: {},
        gives: {},
    });
}
exports.sumOffers = sumOffers;
exports.NS_MULTIADDRS = {
    DRIP: ["pint1zgsdknywfch8h8t8r5gvpd62zhf7jaqjze599w3j8m9hnmvwnlynpdshvjz7n"],
};
const mapObjectStripNullAndUndefined = (o) => {
    return Object.fromEntries(Object.entries(o).filter(([key, value]) => value != null));
};
const maybeConvertName = (s) => {
    if (s.indexOf(".") !== -1 ||
        s.substr(0, p2p_1.PintP2P.PREFIX.length) === p2p_1.PintP2P.PREFIX)
        return s;
    return p2p_1.PintP2P.toAddress(s);
};
const maybeFromName = (s) => {
    if (s.substr(0, p2p_1.PintP2P.PREFIX.length) === p2p_1.PintP2P.PREFIX)
        return p2p_1.PintP2P.fromAddress(s);
    return s;
};
class Pintswap extends p2p_1.PintP2P {
    static initialize({ awaitReceipts, signer }) {
        return __awaiter(this, void 0, void 0, function* () {
            const peerId = yield peer_id_1.default.create();
            return new Pintswap({ signer, awaitReceipts, peerId });
        });
    }
    dialPeer(...args) {
        return __awaiter(this, void 0, void 0, function* () {
            const [peerId, ...rest] = args;
            try {
                return yield this.dialProtocol.apply(this, [
                    peer_id_1.default.createFromB58String(this.constructor.fromAddress(peerId)),
                    ...rest,
                ]);
            }
            catch (err) {
                this.logger.error(err);
                return false;
            }
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
                    const { stream } = yield this.dialPeer(nsHosts[Math.floor(nsHosts.length * Math.random())], "/pintswap/0.1.0/ns/query");
                    (0, it_pipe_1.pipe)(messages, lp.encode(), stream.sink);
                    messages.push(protocol_1.protocol.NameQuery.encode({
                        name: maybeFromName(query),
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
            const result = response.result + (parts.length > 1 ? "" : "." + tld);
            if (result.indexOf(".") === -1)
                return maybeConvertName(result);
            else
                return result;
        });
    }
    registerName(name) {
        return __awaiter(this, void 0, void 0, function* () {
            const parts = name.split(".");
            const query = parts.slice(0, -1).join(".");
            const tld = parts[parts.length - 1];
            const messages = (0, it_pushable_1.default)();
            const response = yield new Promise((resolve, reject) => {
                (() => __awaiter(this, void 0, void 0, function* () {
                    const nsHosts = exports.NS_MULTIADDRS[tld.toUpperCase()];
                    const { stream } = yield this.dialPeer(nsHosts[Math.floor(nsHosts.length * Math.random())], "/pintswap/0.1.0/ns/register");
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
            yield this.pubsub.publish("/pintswap/0.1.2/publish-orders", ethers_1.ethers.toBeArray(ethers_1.ethers.hexlify(this._encodeMakerBroadcast())));
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
            this.pubsub.on("/pintswap/0.1.2/publish-orders", (message) => {
                try {
                    const { offers, bio, pfp } = this._decodeMakerBroadcast(message.data);
                    const from = this.constructor.toAddress(message.from);
                    const _offerhash = ethers_1.ethers.keccak256(message.data);
                    const pair = [_offerhash, offers];
                    this.peers.set(from + "::bio", bio);
                    this.peers.set(from + "::pfp", pfp);
                    if (this.peers.has(from)) {
                        if (this.peers.get(from)[0] == _offerhash)
                            return;
                        this.peers.set(from, pair);
                        this.emit("/pubsub/orderbook-update");
                        return;
                    }
                    this.peers.set(from, pair);
                    this.emit("/pubsub/orderbook-update");
                }
                catch (e) {
                    this.logger.error(e);
                }
            });
            this.pubsub.subscribe("/pintswap/0.1.2/publish-orders");
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
                image: Buffer.isBuffer(this.userData.image)
                    ? this.userData.image.toString("base64")
                    : this.userData.image,
            },
            offers: [...this.offers.values()],
        };
    }
    static fromObject(o, signer) {
        return __awaiter(this, void 0, void 0, function* () {
            const initArg = Object.assign(Object.assign({}, o), { userData: o.userData && {
                    bio: o.userData.bio,
                    image: o.userData.image.token
                        ? o.userData.image
                        : Buffer.from(o.userData.image, "base64"),
                }, offers: o.offers &&
                    new Map(o.offers.map((v) => [(0, trade_2.hashOffer)(v), v])), peerId: o.peerId && (yield peer_id_1.default.createFromJSON(o.peerId)), signer });
            return new Pintswap(initArg);
        });
    }
    _offersAsProtobufStruct() {
        return [...this.offers.values()].map((v) => Object.fromEntries(Object.entries(v).map(([key, value]) => [
            key,
            toTypedTransfer((0, lodash_1.mapValues)(mapObjectStripNullAndUndefined(value), (v) => Buffer.from(ethers_1.ethers.toBeArray(v)))),
        ])));
    }
    _encodeMakerBroadcast() {
        return protocol_1.protocol.MakerBroadcast.encode({
            offers: this._offersAsProtobufStruct(),
            bio: this.userData.bio,
            pfp: this.userData.image.token && this.userData.image,
        }).finish();
    }
    _encodeOffers() {
        return protocol_1.protocol.OfferList.encode({
            offers: [...this.offers.values()].map((v) => Object.fromEntries(Object.entries(v).map(([key, value]) => [
                key,
                toTypedTransfer((0, lodash_1.mapValues)(value, (v) => Buffer.from(ethers_1.ethers.toBeArray(v)))),
            ]))),
        }).finish();
    }
    _encodeUserData() {
        return protocol_1.protocol.UserData.encode(Object.assign(Object.assign({ offers: [...this.offers.values()].map((v) => Object.fromEntries(Object.entries(v).map(([key, value]) => [
                key,
                toTypedTransfer((0, lodash_1.mapValues)(mapObjectStripNullAndUndefined(value), (v) => Buffer.from(ethers_1.ethers.toBeArray(v)))),
            ]))) }, (Buffer.isBuffer(this.userData.image)
            ? {
                file: this.userData.image,
            }
            : {
                nft: this.userData.image,
            })), { bio: this.userData.bio })).finish();
    }
    handleUserData() {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.handle("/pintswap/0.1.2/userdata", ({ stream }) => {
                try {
                    this.logger.debug("handling userdata request");
                    this.emit("pintswap/trade/peer", 2);
                    const userData = this._encodeUserData();
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
                    const offerList = this._encodeOffers();
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
                            originalOffers = batchFill.map((v) => self.offers.get(v.offerHash));
                            offers = batchFill.map((v, i) => (Object.assign({}, scaleOffer(originalOffers[i], v.amount))));
                            if ((0, lodash_1.uniq)(offers.map((v) => ethers_1.ethers.getAddress(v.gets.token)))
                                .length !== 1 ||
                                (0, lodash_1.uniq)(offers.map((v) => ethers_1.ethers.getAddress(v.gives.token)))
                                    .length !== 1)
                                throw Error("must fill orders for same trade pair");
                            offerHashHex = ethers_1.ethers.hexlify(batchFillBufList.slice());
                            offer = sumOffers(offers);
                            offers.forEach((v, i) => {
                                if (!self.offers.delete(batchFill[i].offerHash))
                                    throw Error("duplicate order in fill");
                            });
                            batchFill.forEach((v) => trade.emit("hash", v.offerHash));
                            trade.hashes = batchFill.map((v) => v.offerHash);
                            self.logger.debug("keygen1::wait");
                            const { value: keygenMessage1 } = yield source.next();
                            self.emit("pintswap/trade/maker", 0); // maker sees that taker clicked "fulfill trade"
                            trade.emit("progress", 0);
                            self.logger.debug("keygen::step1::push");
                            messages.push(context2.step1(keygenMessage1.slice()));
                            self.logger.debug("address::push");
                            messages.push(Buffer.from(address.substr(2), "hex"));
                            self.logger.debug("keygen::step2::wait");
                            const { value: keygenMessage3 } = yield source.next();
                            self.logger.debug("keygen::step2::push");
                            context2.step2(keygenMessage3.slice());
                            // set keyshare and shared address
                            const keyshareJson = context2.exportKeyShare().toJsonObject();
                            const sharedAddress = (0, trade_2.keyshareToAddress)(keyshareJson);
                            self.emit(`pintswap/request/create-trade/fulfilling`, offerHashHex, offer); // emits offer hash and offer object to frontend
                            trade.emit("fulfilling", {
                                hash: offerHashHex,
                                offer,
                            });
                            self.logger.debug("approve::dispatch");
                            const tx = yield self.approveTradeAsMaker(offer, sharedAddress);
                            if (tx.permitData) {
                                const encoded = permit.encode(tx.permitData);
                                messages.push(encoded);
                            }
                            else {
                                self.logger.debug("approve::wait");
                                yield self.signer.provider.waitForTransaction(tx.hash);
                                messages.push(Buffer.from([]));
                            }
                            self.emit("pintswap/trade/maker", 1); // maker sees the taker signed tx
                            trade.emit("progress", 1);
                            self.logger.debug("approve::complete");
                            self.logger.debug("taker-permit::wait");
                            const { value: takerPermitDataBytes } = yield source.next();
                            self.logger.debug("taker-permit::complete");
                            const takerPermitDataSlice = takerPermitDataBytes.slice();
                            const takerPermitData = takerPermitDataSlice.length &&
                                permit.decode(takerPermitDataSlice);
                            self.logger.debug("serialized::wait");
                            const { value: serializedTxBufList } = yield source.next();
                            self.logger.debug("serialized::complete");
                            self.logger.debug("pay-coinbase::wait");
                            const { value: payCoinbaseAmountBufList } = yield source.next();
                            self.logger.debug("pay-coinbase::complete");
                            const payCoinbaseAmountBuffer = payCoinbaseAmountBufList.slice();
                            const payCoinbaseAmount = payCoinbaseAmountBuffer.length
                                ? ethers_1.ethers.hexlify(ethers_1.ethers.toBeArray("0x" + payCoinbaseAmountBuffer.toString("hex")))
                                : null;
                            const serializedTx = serializedTxBufList.slice();
                            const serialized = ethers_1.ethers.hexlify(serializedTx);
                            self.logger.debug("serialized::bytes::" + serialized);
                            self.logger.debug("taker-address::wait");
                            const { value: _takerAddress } = yield source.next();
                            const takerAddress = ethers_1.ethers.getAddress(ethers_1.ethers.hexlify(_takerAddress.slice()));
                            self.logger.debug("taker-address::complete::" + takerAddress);
                            self.logger.debug("sign::step1::" + serialized);
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
                            self.logger.debug("contract-assemble::wait");
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
                            self.logger.debug("contract-assemble::complete");
                            self.logger.debug("sign-context::wait");
                            const signContext = yield two_party_ecdsa_js_1.TPCEcdsaSign.P2Context.createContext(JSON.stringify(keyshareJson, null, 4), new bn_js_1.default(transaction.unsignedHash.substr(2), 16));
                            self.logger.debug("sign-context::complete");
                            self.logger.debug("sign::step1::wait");
                            const { value: signMessage1BufList } = yield source.next();
                            const signMessage1 = signMessage1BufList.slice();
                            self.logger.debug("sign::step1::compute");
                            messages.push(signContext.step1(signMessage1));
                            self.logger.debug("sign::step1::complete");
                            self.logger.debug("sign::step2::wait");
                            const { value: signMessage3BufList } = yield source.next();
                            const signMessage3 = signMessage3BufList.slice();
                            self.emit("pintswap/trade/maker", 2); // maker: swap is complete
                            self.logger.debug("sign::step2::compute");
                            messages.push(signContext.step2(signMessage3));
                            self.logger.debug("sign::step2::complete");
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
    broadcastOffer(_offer, chainId = 1) {
        this.logger.debug("trying to list new offer");
        const hash = (0, trade_2.hashOffer)(_offer);
        this.offers.set(hash, _offer);
        this.emit("pintswap/trade/broadcast", hash);
        (0, webhook_1.webhookRun)({ offer: _offer, chainId }); // TODO: check if this works fine without await
    }
    findPeer(pintSwapAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const resolved = this.constructor.fromAddress(pintSwapAddress.indexOf(".") !== -1
                ? yield this.resolveName(pintSwapAddress)
                : pintSwapAddress);
            return yield this.peerRouting.findPeer(peer_id_1.default.createFromB58String(resolved));
        });
    }
    getUserData(pintSwapAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            while (true) {
                try {
                    yield this.findPeer(pintSwapAddress);
                    break;
                }
                catch (e) {
                    this.logger.error(e);
                    yield new Promise((resolve) => setTimeout(resolve, 3000));
                }
            }
            this.emit("pintswap/trade/peer", 0); // start finding peer's orders
            const { stream } = yield this.dialPeer(pintSwapAddress, "/pintswap/0.1.2/userdata");
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
    getTrades(pintSwapAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            while (true) {
                try {
                    yield this.findPeer(pintSwapAddress);
                    break;
                }
                catch (e) {
                    this.logger.error(e);
                    yield new Promise((resolve) => setTimeout(resolve, 3000));
                }
            }
            this.emit("pintswap/trade/peer", 0); // start finding peer's orders
            const { stream } = yield this.dialPeer(pintSwapAddress, "/pintswap/0.1.0/orders");
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
    _decodeMakerBroadcast(data) {
        const offerList = protocol_1.protocol.MakerBroadcast.toObject(protocol_1.protocol.MakerBroadcast.decode(data), {
            enums: String,
            longs: String,
            bytes: String,
            defaults: true,
            arrays: true,
            objects: true,
            oneofs: true,
        });
        const offers = (0, exports.protobufOffersToHex)(offerList.offers);
        const bio = offerList.bio;
        const pfp = offerList.pfp;
        return {
            offers,
            bio,
            pfp: (pfp && {
                token: base64ToAddress(pfp.token),
                tokenId: base64ToValue(pfp.tokenId),
            }) ||
                null,
        };
    }
    _decodeOffers(data) {
        const offerList = protocol_1.protocol.OfferList.toObject(protocol_1.protocol.OfferList.decode(data), {
            enums: String,
            longs: String,
            bytes: String,
            defaults: true,
            arrays: true,
            objects: true,
            oneofs: true,
        });
        const offers = (0, exports.protobufOffersToHex)(offerList.offers);
        return Object.assign(offerList, { offers });
    }
    _decodeUserData(data) {
        const userData = protocol_1.protocol.UserData.toObject(protocol_1.protocol.UserData.decode(data), {
            enums: String,
            longs: String,
            bytes: String,
            defaults: true,
            arrays: true,
            objects: true,
            oneofs: true,
        });
        const offers = (0, exports.protobufOffersToHex)(userData.offers);
        return {
            offers,
            image: userData.pfp === "file"
                ? Buffer.from(ethers_1.ethers.decodeBase64(userData.file))
                : {
                    token: base64ToAddress(userData.nft.token),
                    tokenId: base64ToValue(userData.nft.tokenId),
                },
            bio: userData.bio,
        };
    }
    getTradeAddress(sharedAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const address = getCreateAddress({
                nonce: yield this.signer.provider.getTransactionCount(sharedAddress),
                from: sharedAddress,
            });
            this.logger.debug("trade-address::" + address);
            return address;
        });
    }
    approveTrade(transfer, sharedAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { chainId } = yield this.signer.provider.getNetwork();
                const tradeAddress = yield this.getTradeAddress(sharedAddress);
                if ((0, trade_2.isERC721Transfer)(transfer) || (0, trade_2.isERC1155Transfer)(transfer)) {
                    if (yield (0, detect_erc721_permit_1.detectERC721Permit)(transfer.token, this.signer)) {
                        const expiry = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
                        const permitData = yield erc721Permit.signAndMergeERC721({
                            asset: transfer.token,
                            tokenId: transfer.tokenId,
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
                    const token = new Contract(transfer.token, [
                        "function setApprovalForAll(address, bool)",
                        "function isApprovedForAll(address, address) view returns (bool)",
                    ], this.signer);
                    if (!(yield token.isApprovedForAll(yield this.signer.getAddress(), tradeAddress))) {
                        return yield token.setApprovalForAll(tradeAddress, true);
                    }
                    return {
                        wait() {
                            return __awaiter(this, void 0, void 0, function* () {
                                return {};
                            });
                        },
                    };
                }
                const token = new Contract(yield (0, trade_2.coerceToWeth)(ethers_1.ethers.getAddress(transfer.token), this.signer), trade_2.genericAbi, this.signer);
                this.logger.debug("address::" + (yield this.signer.getAddress()));
                this.logger.debug("balance::" +
                    ethers_1.ethers.formatEther(yield token.balanceOf(yield this.signer.getAddress())));
                if (transfer.token === ethers_1.ethers.ZeroAddress) {
                    const weth = new ethers_1.ethers.Contract((0, trade_1.toWETH)(Number(chainId)), [
                        "function deposit()",
                        "function balanceOf(address) view returns (uint256)",
                    ], this.signer);
                    const wethBalance = ethers_1.ethers.toBigInt(yield weth.balanceOf(yield this.signer.getAddress()));
                    if (wethBalance < ethers_1.ethers.toBigInt(transfer.amount)) {
                        const depositTx = yield weth.deposit({
                            value: ethers_1.ethers.toBigInt(transfer.amount) - wethBalance,
                        });
                        if (this._awaitReceipts)
                            yield this.signer.provider.waitForTransaction(depositTx.hash);
                    }
                    this.logger.debug("weth-balance::" +
                        ethers_1.ethers.formatEther(yield weth.balanceOf(yield this.signer.getAddress())));
                }
                if (yield (0, detect_permit_1.detectPermit)(transfer.token, this.signer)) {
                    const expiry = Math.floor(Date.now() / 1000) + 60 * 60 * 24;
                    const permitData = yield permit.sign({
                        asset: transfer.token,
                        value: transfer.amount,
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
                else if ([42220, 42161, 137, 10, 1].includes(Number(chainId))) {
                    const tx = yield this.approvePermit2(transfer.token);
                    if (tx && this._awaitReceipts)
                        yield this.signer.provider.waitForTransaction(tx.hash);
                    const signatureTransfer = {
                        permit: {
                            permitted: {
                                token: yield (0, trade_2.coerceToWeth)(transfer.token, this.signer),
                                amount: transfer.amount,
                            },
                            spender: tradeAddress,
                            nonce: ethers_1.ethers.hexlify(ethers_1.ethers.toBeArray(ethers_1.ethers.getUint(Math.floor(Date.now() / 1000)))),
                            deadline: ethers_1.ethers.hexlify(ethers_1.ethers.toBeArray(ethers_1.ethers.getUint(Math.floor(Date.now() / 1000)) +
                                BigInt(60 * 60 * 24))),
                        },
                        permit2Address: permit2_sdk_1.PERMIT2_ADDRESS,
                        chainId,
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
                    const tx = yield token.approve(tradeAddress, transfer.amount);
                    this.logger.debug("trade-address::" + tradeAddress);
                    this.logger.debug("balance::after-approve::" +
                        ethers_1.ethers.formatEther(yield token.balanceOf(yield this.signer.getAddress())));
                    this.logger.debug("allowance::after-approve::" +
                        ethers_1.ethers.formatEther(yield token.allowance(yield this.signer.getAddress(), tradeAddress)));
                    return tx;
                }
            }
            catch (e) {
                this.logger.error(e);
                if (String(e).includes("rpc error with payload"))
                    return "insufficient_funds";
                else
                    return "user_rejected";
            }
        });
    }
    approveTradeAsTaker(offer, sharedAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.approveTrade(offer.gets, sharedAddress);
        });
    }
    approveTradeAsMaker(offer, sharedAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.approveTrade(offer.gives, sharedAddress);
        });
    }
    approvePermit2(asset) {
        return __awaiter(this, void 0, void 0, function* () {
            const token = new Contract(yield (0, trade_2.coerceToWeth)(asset, this.signer), trade_2.genericAbi, this.signer);
            const allowance = yield token.allowance(yield this.signer.getAddress(), permit2_sdk_1.PERMIT2_ADDRESS);
            if (ethers_1.ethers.getUint(allowance) < ethers_1.ethers.getUint("0x0" + "f".repeat(63))) {
                if (ethers_1.ethers.getUint(allowance) !== BigInt(0)) {
                    const tx = yield token.approve(permit2_sdk_1.PERMIT2_ADDRESS, "0x00");
                    yield this.signer.provider.waitForTransaction(tx.hash);
                }
                return yield token.approve(permit2_sdk_1.PERMIT2_ADDRESS, ethers_1.ethers.MaxUint256);
            }
            return null;
        });
    }
    prepareTransaction(offer, maker, sharedAddress, permitData) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const chainId = Number((yield this.signer.provider.getNetwork()).chainId);
                const payCoinbase = Boolean(false &&
                    [offer.gives.token, offer.gets.token].find((v) => ethers_1.ethers.ZeroAddress === v));
                const taker = yield this.signer.getAddress();
                const contract = (0, trade_2.createContract)(offer, maker, taker, chainId, permitData, payCoinbase ? "0x01" : null);
                const gasPriceFloor = yield getGasPriceWithFloor(this.signer.provider);
                const gasPrice = (0, trade_1.toBigInt)(gasPriceFloor);
                const gasLimit = yield (() => __awaiter(this, void 0, void 0, function* () {
                    do {
                        try {
                            const estimate = (0, trade_1.toBigInt)(yield this.signer.provider.estimateGas({
                                data: contract,
                                from: sharedAddress,
                                //          gasPrice,
                            })) + BigInt(26000);
                            if (estimate > BigInt(10e6)) {
                                throw Error("gas estimate too high -- revert");
                            }
                            return estimate;
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
                this.logger.debug("gaslimit::" + String(Number(gasLimit)));
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
            }
            catch (e) {
                this.logger.error("user rejected transaction");
                return false;
            }
        });
    }
    createTransaction(txParams, sharedAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const { gasLimit, maxFeePerGas, maxPriorityFeePerGas, gasPrice, data } = txParams;
            const sharedAddressBalance = (0, trade_1.toBigInt)(yield this.signer.provider.getBalance(sharedAddress));
            this.logger.debug(`network::${(yield this.signer.provider.getNetwork()).chainId}::${sharedAddressBalance}::${gasPrice}::${gasLimit}`);
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
                amount: offer.gets.amount || offer.gets.tokenId,
            },
        ]);
    }
    createBatchTrade(peer, batchFill) {
        const trade = new PintswapTrade();
        trade.hashes = batchFill.map((v) => (0, trade_2.hashOffer)(v.offer));
        this.emit("trade:taker", trade);
        (() => __awaiter(this, void 0, void 0, function* () {
            this.logger.debug(`take::${JSON.stringify(trade.hashes)}::${peer}`);
            this.emit("pintswap/trade/taker", 0); // start fulfilling trade
            const { stream } = yield this.dialPeer(peer, [
                "/pintswap/0.1.0/create-trade",
            ]);
            const handleError = (side, e, _messages) => {
                self.logger.error(e);
                this.emit(`pintswap/trade/${side}`, e);
                setTimeout(() => { }, 1000);
                _messages && _messages.end();
                trade.reject(new Error(e));
                stream.close();
            };
            // handle if dial request has no valid addresses
            if (!(stream === null || stream === void 0 ? void 0 : stream.source)) {
                handleError("taker", "dial request has no valid addresses");
                return;
            }
            this.logger.debug("keygen::context::compute");
            const context1 = yield (0, timeout_1.reqWithTimeout)(two_party_ecdsa_js_1.TPCEcdsaKeyGen.P1Context.createContext());
            if (context1 === "timeout") {
                handleError("taker", "timeout");
                return;
            }
            this.logger.debug("keygen::context::complete");
            this.logger.debug("keygen::step1::compute");
            const message1 = yield (0, timeout_1.reqWithTimeout)(context1.step1());
            if (message1 === "timeout") {
                handleError("taker", "timeout");
                return;
            }
            this.logger.debug("keygen::step1::complete");
            const messages = (0, it_pushable_1.default)();
            const self = this;
            (0, it_pipe_1.pipe)(stream.source, lp.decode(), function (source) {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        messages.push(encodeBatchFill(batchFill.map((v) => ({
                            offerHash: (0, trade_2.hashOffer)(v.offer),
                            amount: v.amount || v.tokenId,
                        }))));
                        const offer = sumOffers(batchFill.map((v) => (Object.assign({}, scaleOffer(v.offer, v.amount)))));
                        messages.push(message1); // message 1
                        self.logger.debug("keygen::step2::wait-protocol");
                        // timeout for step 2 of keygen
                        const step2keygen = yield (0, timeout_1.reqWithTimeout)(source.next());
                        if (step2keygen === "timeout") {
                            handleError("taker", "timeout", messages);
                            return;
                        }
                        const keygenMessage2BufList = step2keygen && step2keygen.value ? step2keygen.value : [];
                        self.logger.debug("keygen::step2::received");
                        const keygenMessage2 = keygenMessage2BufList.slice();
                        self.logger.debug("maker-address::wait-protocol");
                        // timout for maker address buffer
                        const makerAddressBuf = yield (0, timeout_1.reqWithTimeout)(source.next());
                        if (makerAddressBuf === "timeout") {
                            handleError("taker", "timeout", messages);
                            return;
                        }
                        const makerAddressBufList = (makerAddressBuf === null || makerAddressBuf === void 0 ? void 0 : makerAddressBuf.value) || [];
                        const makerAddress = ethers_1.ethers.getAddress(ethers_1.ethers.hexlify(makerAddressBufList.slice()));
                        self.logger.debug("maker-address::received::" + makerAddress);
                        self.logger.debug("keygen::step2::compute");
                        messages.push(context1.step2(keygenMessage2));
                        self.logger.debug("keygen::step2::complete");
                        const keyshareJson = context1.exportKeyShare().toJsonObject();
                        const sharedAddress = (0, trade_2.keyshareToAddress)(keyshareJson);
                        trade.emit("progress", 1);
                        self.emit("pintswap/trade/taker", 1); // taker approving token swap
                        // approve as maker
                        self.logger.debug("approve::wait");
                        const approveTx = yield self.approveTradeAsTaker(offer, sharedAddress);
                        // taker rejects
                        if (approveTx === "user_rejected") {
                            handleError("taker", "user rejected signing", messages);
                            return;
                        }
                        else if (approveTx === "insufficient_funds") {
                            handleError("taker", "insufficient funds", messages);
                            return;
                        }
                        // permit data not yet present
                        if (!approveTx.permitData) {
                            self.logger.debug("approve::wait-transaction");
                            yield self.signer.provider.waitForTransaction(approveTx.hash);
                            self.logger.debug("approve::transaction-complete");
                        }
                        self.logger.debug("approve::complete");
                        self.emit("pintswap/trade/taker", 2); // taker approved token swap
                        trade.emit("progress", 2);
                        if (approveTx.permitData)
                            messages.push(permit.encode(approveTx.permitData));
                        else
                            messages.push(Buffer.from([]));
                        self.logger.debug("permitdata::wait");
                        const permitData = yield (0, timeout_1.reqWithTimeout)(source.next());
                        if (permitData === "timeout") {
                            handleError("taker", "maker not responsive", messages);
                            return;
                        }
                        const permitDataBytes = (permitData === null || permitData === void 0 ? void 0 : permitData.value) || [];
                        self.logger.debug("permitdata::complete");
                        const permitDataSlice = permitDataBytes.slice();
                        const makerPermitData = permitDataSlice.length && permit.decode(permitDataSlice);
                        self.logger.debug("build-tx::wait");
                        self.emit("pintswap/trade/taker", 3); // building transaction
                        trade.emit("progress", 3);
                        self.logger.debug("shared-address::fund");
                        let contractPermitData = {};
                        if (makerPermitData)
                            contractPermitData.maker = makerPermitData;
                        if (approveTx.permitData)
                            contractPermitData.taker = approveTx.permitData;
                        if (!Object.keys(contractPermitData).length)
                            contractPermitData = null;
                        // handle user rejection
                        const txParams = yield self.prepareTransaction(offer, makerAddress, sharedAddress, contractPermitData);
                        if (txParams === false) {
                            handleError("taker", "user rejected signing", messages);
                            return;
                        }
                        self.logger.debug("transaction-params::received");
                        const payCoinbaseAmount = txParams.payCoinbaseAmount;
                        delete txParams.payCoinbaseAmount;
                        if (!payCoinbaseAmount) {
                            // check if user has enough gas
                            try {
                                const ethTransaction = yield self.signer.sendTransaction({
                                    to: sharedAddress,
                                    value: (0, trade_1.toBigInt)(txParams.gasPrice) * (0, trade_1.toBigInt)(txParams.gasLimit), // change to gasPrice * gasLimit
                                });
                                self.logger.debug("eth-transaction::wait");
                                yield self.signer.provider.waitForTransaction(ethTransaction.hash);
                                self.logger.debug("eth-transaction::complete");
                            }
                            catch (e) {
                                self.logger.error("INSUFFICIENT FUNDS FOR GAS:", e);
                            }
                        }
                        self.logger.debug(`transaction::${yield self.signer.getAddress()}::${sharedAddress}`);
                        const tx = yield self.createTransaction(txParams, sharedAddress);
                        self.logger.debug("transaction::built");
                        const _uhash = tx.unsignedHash.slice(2);
                        const serialized = Buffer.from(ethers_1.ethers.toBeArray(tx.unsignedSerialized));
                        self.logger.debug("sign-context::compute");
                        const signContext = yield two_party_ecdsa_js_1.TPCEcdsaSign.P1Context.createContext(JSON.stringify(keyshareJson, null, 4), new bn_js_1.default(_uhash, 16));
                        self.logger.debug("sign-context::complete");
                        self.logger.debug("serialized-transaction::push");
                        messages.push(serialized);
                        self.logger.debug("pay-coinbase::push");
                        messages.push(payCoinbaseAmount
                            ? Buffer.from(ethers_1.ethers.toBeArray(payCoinbaseAmount))
                            : Buffer.from([]));
                        self.logger.debug("taker-address::push");
                        messages.push(Buffer.from(ethers_1.ethers.toBeArray(yield self.signer.getAddress())));
                        self.logger.debug("sign::step1::compute");
                        messages.push(signContext.step1());
                        self.logger.debug("sign::step1::complete");
                        self.emit("pintswap/trade/taker", 4); // transaction built
                        trade.emit("progress", 4);
                        self.logger.debug("sign::step2::wait-protocol");
                        const { value: signMessage_2 } = yield source.next();
                        self.logger.debug("sign::step2::received");
                        self.logger.debug("sign::step2::compute");
                        messages.push(signContext.step2(signMessage_2.slice()));
                        self.logger.debug("sign::step2::complete");
                        self.logger.debug("sign::step3::wait-protocol");
                        const { value: signMessage_4 } = yield source.next();
                        self.logger.debug("sign::step3::received");
                        self.logger.debug("sign::step3::compute");
                        signContext.step3(signMessage_4.slice());
                        self.logger.debug("sign::step3::complete");
                        const [r, s, v] = signContext.exportSig();
                        tx.signature = ethers_1.ethers.Signature.from({
                            r: "0x" + (0, trade_2.leftZeroPad)(r.toString(16), 64),
                            s: "0x" + (0, trade_2.leftZeroPad)(s.toString(16), 64),
                            v: v + 27,
                        });
                        let txHash;
                        self.logger.debug("trade::dispatch");
                        if (tx.maxPriorityFeePerGas &&
                            ethers_1.ethers.getUint(tx.maxPriorityFeePerGas) === BigInt(0)) {
                            txHash = yield sendFlashbotsTransaction(tx.serialized);
                        }
                        else {
                            txHash = (typeof self.signer.provider.sendTransaction == "function"
                                ? yield self.signer.provider.sendTransaction(tx.serialized)
                                : yield self.signer.provider.broadcastTransaction(tx.serialized)).hash;
                        }
                        // complete
                        self.emit("pintswap/trade/taker", txHash);
                        self.logger.debug("trade::complete::" + txHash);
                        // discord webhook
                        self.logger.info("sending webhook");
                        try {
                            const { chainId } = yield self.signer.provider.getNetwork();
                            yield self.signer.provider.waitForTransaction(txHash);
                            yield (0, webhook_1.webhookRun)({ txHash, chainId });
                        }
                        catch (e) {
                            self.logger.debug(e);
                        }
                        messages.end();
                        trade.resolve(txHash || null);
                        stream.close();
                    }
                    catch (e) {
                        let msg;
                        if (String(e).includes("insufficient funds"))
                            msg = "insufficient funds";
                        else
                            msg = "ERROR";
                        handleError("taker", msg, messages);
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