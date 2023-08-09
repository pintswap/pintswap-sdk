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
Object.defineProperty(exports, "__esModule", { value: true });
exports.fromPintSwapAddress = exports.toPintSwapAddress = exports.PREFIX = exports.fromPassword = exports.VERSION = void 0;
const ethers_1 = require("ethers");
const bech32_1 = require("bech32");
const multihashes_1 = require("multihashes");
exports.VERSION = "1.0.0";
function fromPassword(signer, password) {
    return __awaiter(this, void 0, void 0, function* () {
        let message = `Welcome to PintSwap!\n\nPintP2P v${exports.VERSION}\n${(0, ethers_1.solidityPackedKeccak256)(["string"], [`/pintp2p/${exports.VERSION}/` + password])}`;
        let seed = yield signer.signMessage(message);
        // PeerId.createFromPrivKey((await cryptoFromSeed(seed)).bytes);
    });
}
exports.fromPassword = fromPassword;
exports.PREFIX = 'pint';
function toPintSwapAddress(bufferOrB58) {
    let buf;
    if (typeof bufferOrB58 === 'string') {
        if (bufferOrB58.substr(0, exports.PREFIX.length) === exports.PREFIX)
            return bufferOrB58;
        else
            buf = (0, multihashes_1.fromB58String)(bufferOrB58);
    }
    else
        buf = bufferOrB58;
    return bech32_1.bech32.encode(exports.PREFIX, bech32_1.bech32.toWords(buf));
}
exports.toPintSwapAddress = toPintSwapAddress;
function fromPintSwapAddress(pintAddress) {
    if (typeof pintAddress === 'string' && pintAddress.substr(0, exports.PREFIX.length) === exports.PREFIX)
        return (0, multihashes_1.toB58String)(Buffer.from(bech32_1.bech32.fromWords(bech32_1.bech32.decode(pintAddress).words)));
    throw Error('not a PintSwap address');
}
exports.fromPintSwapAddress = fromPintSwapAddress;
//# sourceMappingURL=utils.js.map