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
    return ethers_1.ethers.computeAddress(derivedPubKey);
}
/*
 * Keygen handler for second party in 2p-ECDSA key generation
 * uses pushable iterators to exchange key information between parties
 * returns (ComputedETHAddress, KeyShareJson) tuple for second party
 */
function handleKeygen({ stream }) {
    return __awaiter(this, void 0, void 0, function* () {
        let context2 = yield two_party_ecdsa_js_1.TPCEcdsaKeyGen.P2Context.createContext();
        let messages = (0, it_pushable_1.default)();
        (0, it_pipe_1.pipe)(stream.source, lp.decode(), function (source) {
            return __awaiter(this, void 0, void 0, function* () {
                const { value: message1 } = yield source.next();
                messages.push(context2.step1(message1.slice()));
                const { value: message3 } = yield source.next();
                messages.push(context2.step2(message3.slice()));
                messages.end();
            });
        });
        yield (0, it_pipe_1.pipe)(messages, lp.encode(), stream.sink);
        const keyshare = context2.exportKeyShare().toJsonObject();
        const address = keyshareToAddress(keyshare);
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
        let context1 = yield two_party_ecdsa_js_1.TPCEcdsaKeyGen.P1Context.createContext();
        const message1 = context1.step1();
        const messages = (0, it_pushable_1.default)();
        (0, it_pipe_1.pipe)(stream.source, lp.decode(), function (source) {
            return __awaiter(this, void 0, void 0, function* () {
                messages.push(message1);
                const { value: message2 } = yield source.next();
                const message3 = context1.step2(message2.slice());
                messages.push(message3);
                messages.end();
            });
        });
        yield (0, it_pipe_1.pipe)(messages, lp.encode(), stream.sink);
        const keyshare = context1.exportKeyShare().toJsonObject();
        const address = keyshareToAddress(keyshare);
        return [address, keyshare];
    });
}
exports.initKeygen = initKeygen;
//# sourceMappingURL=utils.js.map