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
exports.initKeygen = exports.handleKeygen = void 0;
const emitterator_1 = __importDefault(require("emitterator"));
const it_pushable_1 = __importDefault(require("it-pushable"));
const it_pipe_1 = require("it-pipe");
const two_party_ecdsa_js_1 = require("@safeheron/two-party-ecdsa-js");
const bn_js_1 = __importDefault(require("bn.js"));
const ethers_1 = require("ethers");
/*
 * Keygen handler for second party in 2p-ECDSA key generation
 * uses pushable iterators to exchange key information between parties
 */
function handleKeygen({ stream }) {
    return __awaiter(this, void 0, void 0, function* () {
        let ks = yield new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            let p2cx = yield two_party_ecdsa_js_1.TPCEcdsaKeyGen.P2Context.createContext();
            let step = 1;
            let source = (0, it_pushable_1.default)();
            let emitter = new emitterator_1.default(stream.source, {
                eventName: "value",
                transformValue: (v) => __awaiter(this, void 0, void 0, function* () { return v._bufs[0]; })
            });
            emitter.on("value", v => {
                console.log("running step", step);
                if (step == 1)
                    source.push(p2cx.step1(v));
                else {
                    p2cx.step2(v);
                    let ks = p2cx.exportKeyShare();
                    let js_str = JSON.stringify(ks.toJsonObject(), null, 4);
                    resolve(ks.toJsonObject());
                    emitter.removeAllListeners(['value']);
                }
                step += 1;
            });
            (0, it_pipe_1.pipe)(source, stream.sink);
        }));
        let { Q } = ks;
        let f = new bn_js_1.default(Q.y, 16).mod(new bn_js_1.default(2)).isZero() ? '0x02' : '0x03';
        let add = f + new bn_js_1.default(Q.x, 16).toString(16);
        return ethers_1.ethers.computeAddress(add);
    });
}
exports.handleKeygen = handleKeygen;
function initKeygen(stream) {
    return __awaiter(this, void 0, void 0, function* () {
        let ks = yield new Promise((resolve) => __awaiter(this, void 0, void 0, function* () {
            let source = (0, it_pushable_1.default)();
            let p1cx = yield two_party_ecdsa_js_1.TPCEcdsaKeyGen.P1Context.createContext();
            let ms1 = p1cx.step1();
            source.push(ms1);
            let emitter = new emitterator_1.default(stream.source, {
                eventName: "value",
                transformValue: (v) => __awaiter(this, void 0, void 0, function* () { return v._bufs[0]; })
            });
            emitter.on("value", v => {
                console.log("sending step 2");
                source.push(p1cx.step2(v));
                let ks = p1cx.exportKeyShare();
                let js_str = JSON.stringify(ks.toJsonObject(), null, 4);
                resolve(ks.toJsonObject());
                emitter.removeAllListeners(['value']);
            });
            (0, it_pipe_1.pipe)(source, stream.sink);
        }));
        let { Q } = ks;
        let f = new bn_js_1.default(Q.y, 16).mod(new bn_js_1.default(2)).isZero() ? '0x02' : '0x03';
        let add = f + new bn_js_1.default(Q.x, 16).toString(16);
        return ethers_1.ethers.computeAddress(add);
    });
}
exports.initKeygen = initKeygen;
//# sourceMappingURL=utils.js.map