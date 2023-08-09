"use strict";
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
exports.PintP2P = exports.cryptoFromSeed = exports.fromJSONtoBuffer = exports.fromBufferToJSON = exports.stringToBuffer = exports.bufferToString = exports.VERSION = void 0;
const libp2p_mplex_1 = __importDefault(require("libp2p-mplex"));
const libp2p_noise_1 = require("libp2p-noise");
const libp2p_kad_dht_1 = __importDefault(require("libp2p-kad-dht"));
const libp2p_bootstrap_1 = __importDefault(require("libp2p-bootstrap"));
const ethers_1 = require("ethers");
const peer_id_1 = __importDefault(require("peer-id"));
const libp2p_gossipsub_1 = __importDefault(require("libp2p-gossipsub"));
const constants_1 = __importDefault(require("libp2p/src/circuit/constants"));
const libp2p_webrtc_star_1 = __importDefault(require("libp2p-webrtc-star"));
const is_browser_1 = __importDefault(require("is-browser"));
const ethers_2 = require("ethers");
const libp2p_1 = __importDefault(require("libp2p"));
const libp2p_crypto_1 = __importDefault(require("libp2p-crypto"));
const wrtc_1 = __importDefault(require("wrtc"));
const the_global_object_1 = __importDefault(require("the-global-object"));
const buffer_1 = require("buffer");
const lodash_1 = require("lodash");
const base64url_1 = __importDefault(require("base64url"));
const bech32_1 = require("bech32");
const multihashes_1 = require("multihashes");
exports.VERSION = "1.0.0";
function bufferToString(buf) {
    return new TextDecoder().decode(buf);
}
exports.bufferToString = bufferToString;
function stringToBuffer(text) {
    return new TextEncoder().encode(text);
}
exports.stringToBuffer = stringToBuffer;
function fromBufferToJSON(buf) {
    const stringified = bufferToString(buf);
    return JSON.parse(stringified);
}
exports.fromBufferToJSON = fromBufferToJSON;
function fromJSONtoBuffer(obj) {
    const stringified = JSON.stringify(obj);
    return stringToBuffer(stringified);
}
exports.fromJSONtoBuffer = fromJSONtoBuffer;
const returnOp = (v) => v;
the_global_object_1.default.Buffer = the_global_object_1.default.Buffer || buffer_1.Buffer;
const mapToBuffers = (o) => (0, lodash_1.mapValues)(o, (v) => base64url_1.default(v.toByteArray && buffer_1.Buffer.from(v.toByteArray()) || (0, ethers_2.hexlify)(buffer_1.Buffer.from([v]))));
const cryptoFromSeed = function (seed) {
    return __awaiter(this, void 0, void 0, function* () {
        const key = yield libp2p_crypto_1.default.keys.generateKeyPairFromSeed('ed25519', buffer_1.Buffer.from(ethers_1.ethers.toBeArray(ethers_1.ethers.solidityPackedKeccak256(['string'], [seed]))));
        return libp2p_crypto_1.default.keys.marshalPrivateKey(key);
        /*
      const key = mapToBuffers(await cryptico.generateRSAKey(seed, 2048));
      console.log('KEY', key);
      key.dp = key.dmp1;
      key.dq = key.dmq1;
      key.qi = key.coeff;
      return await crypto.keys.marshalPrivateKey(new (crypto.keys.supportedKeys.rsa.RsaPrivateKey as any)(key, key) as any);
     */
    });
};
exports.cryptoFromSeed = cryptoFromSeed;
const coerceBuffersToHex = (v) => {
    if (v instanceof Uint8Array || buffer_1.Buffer.isBuffer(v))
        return (0, ethers_2.hexlify)(v);
    if (Array.isArray(v))
        return v.map(coerceBuffersToHex);
    if (typeof v === "object") {
        return Object.keys(v).reduce((r, key) => {
            r[key] = coerceBuffersToHex(v[key]);
            return r;
        }, {});
    }
    return v;
};
const coerceHexToBuffers = (v) => {
    if (typeof v === "string" && v.substr(0, 2) === "0x")
        return buffer_1.Buffer.from(v.substr(2), "hex");
    if (Array.isArray(v))
        return v.map(coerceHexToBuffers);
    if (typeof v === "object") {
        return Object.keys(v).reduce((r, key) => {
            r[key] = coerceHexToBuffers(v[key]);
            return r;
        }, {});
    }
    return v;
};
class PintP2P extends libp2p_1.default {
    static fromPresetOrMultiAddr(multiaddr) {
        return this.PRESETS[(multiaddr || '').toUpperCase() || 'MAINNET'] || multiaddr;
    }
    static toMessage(password) {
        return `Welcome to PintSwap!\n\nPintP2P v${exports.VERSION}\n${(0, ethers_2.solidityPackedKeccak256)(["string"], [`/pintp2p/${exports.VERSION}/` + password])}`;
    }
    static peerIdFromSeed(seed) {
        return __awaiter(this, void 0, void 0, function* () {
            const marshalled = yield (0, exports.cryptoFromSeed)(seed);
            return yield peer_id_1.default.createFromPrivKey(marshalled);
        });
    }
    static fromSeed({ signer, seed, multiaddr }) {
        return __awaiter(this, void 0, void 0, function* () {
            return new this({
                peerId: yield this.peerIdFromSeed(seed),
                multiaddr,
                signer,
            });
        });
    }
    static fromPassword({ signer, multiaddr, password }) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.fromSeed({
                signer,
                multiaddr,
                seed: yield signer.signMessage(this.toMessage(password)),
            });
        });
    }
    static toAddress(bufferOrB58) {
        let buf;
        if (typeof bufferOrB58 === 'string') {
            if (bufferOrB58.substr(0, this.PREFIX.length) === this.PREFIX)
                return bufferOrB58;
            else
                buf = (0, multihashes_1.fromB58String)(bufferOrB58);
        }
        else
            buf = bufferOrB58;
        return bech32_1.bech32.encode(this.PREFIX, bech32_1.bech32.toWords(buf));
    }
    static fromAddress(address) {
        if (typeof address === 'string' && address.substr(0, this.PREFIX.length) === this.PREFIX)
            return (0, multihashes_1.toB58String)(buffer_1.Buffer.from(bech32_1.bech32.fromWords(bech32_1.bech32.decode(address).words)));
        console.log('ADDRESS', address);
        return address;
    }
    start() {
        const _super = Object.create(null, {
            start: { get: () => super.start }
        });
        return __awaiter(this, void 0, void 0, function* () {
            yield _super.start.call(this);
            yield this.pubsub.start();
        });
    }
    setSigner(signer) {
        this.signer = signer;
        this.addressPromise = this.signer ? this.signer.getAddress() : Promise.resolve(ethers_1.ethers.ZeroAddress);
    }
    constructor(options) {
        const multiaddr = PintP2P.fromPresetOrMultiAddr(options.multiaddr || "mainnet");
        super({
            peerId: options.peerId,
            connectionManager: {
                minConnections: 25
            },
            relay: {
                enabled: true,
                advertise: {
                    bootDelay: constants_1.default.ADVERTISE_BOOT_DELAY,
                    enabled: false,
                    ttl: constants_1.default.ADVERTISE_TTL
                },
                hop: {
                    enabled: false,
                    active: false
                },
                autoRelay: {
                    enabled: false,
                    maxListeners: 2
                }
            },
            addresses: {
                listen: [multiaddr]
            },
            modules: {
                transport: [libp2p_webrtc_star_1.default],
                streamMuxer: [libp2p_mplex_1.default],
                connEncryption: [libp2p_noise_1.NOISE],
                pubsub: libp2p_gossipsub_1.default,
                peerDiscovery: [libp2p_bootstrap_1.default],
                dht: libp2p_kad_dht_1.default,
            },
            // metrics: { // added metrics, do not add in production for performance boost
            //   enabled: true,
            //   computeThrottleMaxQueueSize: 1000,
            //   computeThrottleTimeout: 2000,
            //   movingAverageIntervals: [
            //     60 * 1000, // 1 minute
            //     5 * 60 * 1000, // 5 minutes
            //     15 * 60 * 1000 // 15 minutes
            //   ],
            //   maxOldPeersRetention: 50
            // },
            config: {
                peerDiscovery: {
                    autoDial: true,
                    [libp2p_bootstrap_1.default.tag]: {
                        enabled: true,
                        list: [
                            multiaddr + 'QmNjbQqwc2rfGVaUVieP2DP6sT6aY2iRrwDgGxVbRG6Mz2'
                        ],
                    },
                },
                transport: {
                    [libp2p_webrtc_star_1.default.prototype[Symbol.toStringTag]]: {
                        wrtc: !is_browser_1.default && wrtc_1.default,
                    },
                },
                dht: {
                    enabled: true,
                    kBucketSize: 20,
                },
                pubsub: {
                    enabled: true,
                    emitSelf: false,
                },
            },
        });
        this.setSigner(options.signer);
    }
}
exports.PintP2P = PintP2P;
PintP2P.PRESETS = {
    MAINNET: '/dns4/p2p.diacetyl.is/tcp/443/wss/p2p-webrtc-star/'
};
PintP2P.PREFIX = 'pint';
;
//# sourceMappingURL=p2p.js.map