"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.init_keygen = exports.handle_keygen = void 0;
const emitterator_1 = __importDefault(require("emitterator"));
const it_pushable_1 = __importDefault(require("it-pushable"));
const it_pipe_1 = require("it-pipe");
const two_party_ecdsa_js_1 = require("@safeheron/two-party-ecdsa-js");
/*
 * Keygen handler for second party in 2p-ECDSA key generation
 * uses pushable iterators to exchange key information between parties
 */
async function handle_keygen({ stream }) {
    let ks = await new Promise(async (resolve) => {
        let p2cx = await two_party_ecdsa_js_1.TPCEcdsaKeyGen.P2Context.createContext();
        let step = 1;
        let source = (0, it_pushable_1.default)();
        let emitter = new emitterator_1.default(stream.source, {
            eventName: "value",
            transformValue: async (v) => v._bufs[0]
        });
        emitter.on("value", v => {
            console.log("running step", step);
            if (step == 1)
                source.push(p2cx.step1(v));
            else {
                p2cx.step2(v);
                let ks = p2cx.exportKeyShare();
                resolve(ks);
                let js_str = JSON.stringify(ks.toJsonObject(), null, 4);
            }
            step += 1;
        });
        (0, it_pipe_1.pipe)(source, stream.sink);
    });
    console.log(ks);
}
exports.handle_keygen = handle_keygen;
async function init_keygen(stream) {
    let ks = await new Promise(async (resolve) => {
        let source = (0, it_pushable_1.default)();
        let p1cx = await two_party_ecdsa_js_1.TPCEcdsaKeyGen.P1Context.createContext();
        let ms1 = p1cx.step1();
        source.push(ms1);
        let emitter = new emitterator_1.default(stream.source, {
            eventName: "value",
            transformValue: async (v) => v._bufs[0]
        });
        emitter.on("value", v => {
            console.log("sending step 2");
            source.push(p1cx.step2(v));
            let ks = p1cx.exportKeyShare();
            resolve(ks);
            let js_str = JSON.stringify(ks.toJsonObject(), null, 4);
            console.log("Keyshare Initiatior", js_str);
        });
        (0, it_pipe_1.pipe)(source, stream.sink);
    });
    return ks;
}
exports.init_keygen = init_keygen;
//# sourceMappingURL=utils.js.map