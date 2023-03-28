"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.leftZeroPad = exports.createContract = exports.hashOffer = exports.keyshareToAddress = exports.toBigInt = void 0;
const ethers_1 = require("ethers");
const emasm_1 = require("emasm");
const bn_js_1 = __importDefault(require("bn.js"));
const { solidityPackedKeccak256, getAddress, computeAddress, hexlify } = ethers_1.ethers;
function toBigInt(v) {
    if (v.toHexString)
        return v.toBigInt();
    return v;
}
exports.toBigInt = toBigInt;
function keyshareToAddress(keyshareJsonObject) {
    let { Q } = keyshareJsonObject;
    let prepend = new bn_js_1.default(Q.y, 16).mod(new bn_js_1.default(2)).isZero() ? "0x02" : "0x03";
    let derivedPubKey = prepend + leftZeroPad(new bn_js_1.default(Q.x, 16).toString(16), 64);
    return computeAddress(derivedPubKey);
}
exports.keyshareToAddress = keyshareToAddress;
const hashOffer = (o) => {
    return solidityPackedKeccak256(["address", "address", "uint256", "uint256"], [
        getAddress(o.givesToken),
        getAddress(o.getsToken),
        o.givesAmount,
        o.getsAmount,
    ]);
};
exports.hashOffer = hashOffer;
const createContract = (offer, maker, taker) => {
    return (0, emasm_1.emasm)([
        "pc",
        "returndatasize",
        "0x64",
        "returndatasize",
        "returndatasize",
        getAddress(offer.givesToken),
        "0x23b872dd00000000000000000000000000000000000000000000000000000000",
        "returndatasize",
        "mstore",
        getAddress(maker),
        "0x4",
        "mstore",
        getAddress(taker),
        "0x24",
        "mstore",
        hexlify(offer.givesAmount),
        "0x44",
        "mstore",
        "gas",
        "call",
        "0x0",
        "0x0",
        "0x64",
        "0x0",
        "0x0",
        getAddress(offer.getsToken),
        getAddress(taker),
        "0x4",
        "mstore",
        getAddress(maker),
        "0x24",
        "mstore",
        hexlify(offer.getsAmount),
        "0x44",
        "mstore",
        "gas",
        "call",
        "and",
        "failure",
        "jumpi",
        getAddress(maker),
        "selfdestruct",
        ["failure", ["0x0", "0x0", "revert"]],
    ]);
};
exports.createContract = createContract;
function leftZeroPad(s, n) {
    return '0'.repeat(n - s.length) + s;
}
exports.leftZeroPad = leftZeroPad;
//# sourceMappingURL=trade.js.map