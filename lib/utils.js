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
exports.initKeygen = exports.handleKeygen = void 0;
const it_pushable_1 = __importDefault(require("it-pushable"));
const it_pipe_1 = require("it-pipe");
const two_party_ecdsa_js_1 = require("@safeheron/two-party-ecdsa-js");
const bn_js_1 = __importDefault(require("bn.js"));
const ethers_1 = require("ethers");
const lp = __importStar(require("it-length-prefixed"));
/*
 * extract the first Buffer from a BufferList
 */
function bufferListToBuffer(BL) {
    let { _bufs } = BL;
    return _bufs[0];
}
/*
 * @params { keyshareJsonObject } exported keyshare object converted to JsonObject
 * computes derived pubkey from Q (point)
 * computes eth address from derived pubkey
 */
function keyshareToAddress(keyshareJsonObject) {
    let { Q } = keyshareJsonObject;
    let prepend = new bn_js_1.default(Q.y, 16).mod(new bn_js_1.default(2)).isZero() ? "0x02" : "0x03";
    let derivedPubKey = prepend + new bn_js_1.default(Q.x, 16).toString(16);
    console.log(derivedPubKey);
    return ethers_1.ethers.computeAddress(derivedPubKey);
}
/*
 * Keygen handler for second party in 2p-ECDSA key generation
 * uses pushable iterators to exchange key information between parties
 * returns (ComputedETHAddress, KeyShareJson) tuple for second party
 */
function handleKeygen({ stream }) {
    return __awaiter(this, void 0, void 0, function* () {
        let p2cx = yield two_party_ecdsa_js_1.TPCEcdsaKeyGen.P2Context.createContext();
        let step = 1;
        let msgSource = (0, it_pushable_1.default)();
        (0, it_pipe_1.pipe)(msgSource, lp.encode(), stream.sink);
        let result = yield (0, it_pipe_1.pipe)(stream.source, lp.decode(), function (source) {
            var _a, source_1, source_1_1;
            var _b, e_1, _c, _d;
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    for (_a = true, source_1 = __asyncValues(source); source_1_1 = yield source_1.next(), _b = source_1_1.done, !_b;) {
                        _d = source_1_1.value;
                        _a = false;
                        try {
                            const msg = _d;
                            if (step === 1) {
                                let msg2 = p2cx.step1(bufferListToBuffer(msg));
                                msgSource.push(msg2);
                                step += 1;
                            }
                            else {
                                return p2cx.step2(bufferListToBuffer(msg));
                            }
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
            });
        });
        let keyshare = p2cx.exportKeyShare().toJsonObject();
        let address = keyshareToAddress(keyshare);
        return [address, keyshare];
    });
}
exports.handleKeygen = handleKeygen;
/*
 * keygen handler for first party in 2p-ecdsa keygeneration
 * returns (ComputedETHAddress, KeyshareJson) tuple for first party
 */
function initKeygen(stream) {
    return __awaiter(this, void 0, void 0, function* () {
        let p1cx = yield two_party_ecdsa_js_1.TPCEcdsaKeyGen.P1Context.createContext();
        let ms1 = p1cx.step1();
        let msgSource = (0, it_pushable_1.default)();
        (0, it_pipe_1.pipe)(msgSource, lp.encode(), stream.sink);
        msgSource.push(ms1);
        let result = yield (0, it_pipe_1.pipe)(stream.source, lp.decode(), function (source) {
            var _a, source_2, source_2_1;
            var _b, e_2, _c, _d;
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    for (_a = true, source_2 = __asyncValues(source); source_2_1 = yield source_2.next(), _b = source_2_1.done, !_b;) {
                        _d = source_2_1.value;
                        _a = false;
                        try {
                            const msg = _d;
                            let msg3 = p1cx.step2(bufferListToBuffer(msg));
                            msgSource.push(msg3);
                            return msg3;
                        }
                        finally {
                            _a = true;
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (!_a && !_b && (_c = source_2.return)) yield _c.call(source_2);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            });
        });
        let keyshare = p1cx.exportKeyShare().toJsonObject();
        let address = keyshareToAddress(keyshare);
        return [address, keyshare];
    });
}
exports.initKeygen = initKeygen;
//# sourceMappingURL=utils.js.map