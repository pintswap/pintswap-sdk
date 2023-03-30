"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.leftZeroPad = exports.createContract = exports.hashOffer = exports.toWETH = exports.WETH_ADDRESSES = exports.keyshareToAddress = exports.toBigInt = void 0;
const ethers_1 = require("ethers");
const emasm_1 = require("emasm");
const bn_js_1 = __importDefault(require("bn.js"));
const WETH9_json_1 = __importDefault(require("canonical-weth/build/contracts/WETH9.json"));
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
exports.WETH_ADDRESSES = Object.assign(Object.entries(WETH9_json_1.default.networks).reduce((r, [chainId, { address }]) => {
    r[chainId] = address;
    return r;
}, {}), {
    '42161': '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    '137': '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    '10': '0x4200000000000000000000000000000000000006',
    '43112': '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB'
});
const toWETH = (chainId = 1) => {
    const chain = String(chainId);
    const address = exports.WETH_ADDRESSES[chain];
    return address || (() => { throw Error('no WETH contract found for chainid ' + chain); })();
};
exports.toWETH = toWETH;
const hashOffer = (o) => {
    return solidityPackedKeccak256(["address", "address", "uint256", "uint256"], [
        getAddress(o.givesToken),
        getAddress(o.getsToken),
        o.givesAmount,
        o.getsAmount,
    ]);
};
exports.hashOffer = hashOffer;
const createContract = (offer, maker, taker, chainId = 1) => {
    if (offer.givesToken === ethers_1.ethers.ZeroAddress) {
        return (0, emasm_1.emasm)([
            "pc",
            "returndatasize",
            "0x64",
            "returndatasize",
            "returndatasize",
            (0, exports.toWETH)(chainId),
            "0x23b872dd00000000000000000000000000000000000000000000000000000000",
            "returndatasize",
            "mstore",
            getAddress(maker),
            "0x4",
            "mstore",
            "address",
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
            "0x0",
            "0x0",
            "0x24",
            "0x0",
            "0x0",
            (0, exports.toWETH)(chainId),
            "0x3ccfd60b00000000000000000000000000000000000000000000000000000000",
            "0x0",
            "mstore",
            hexlify(offer.givesAmount),
            "0x4",
            "mstore",
            "gas",
            "call",
            "and",
            "0x0",
            "0x0",
            "0x0",
            "0x0",
            hexlify(offer.givesAmount),
            getAddress(taker),
            "gas",
            "call",
            "and",
            "failure",
            "jumpi",
            getAddress(maker),
            "selfdestruct",
            ["failure", ["0x0", "0x0", "revert"]],
        ]);
    }
    if (offer.getsToken === ethers_1.ethers.ZeroAddress) {
        return (0, emasm_1.emasm)([
            "pc",
            "returndatasize",
            "0x64",
            "returndatasize",
            "returndatasize",
            (0, exports.toWETH)(chainId),
            "0x23b872dd00000000000000000000000000000000000000000000000000000000",
            "returndatasize",
            "mstore",
            getAddress(taker),
            "0x4",
            "mstore",
            "address",
            "0x24",
            "mstore",
            hexlify(offer.getsAmount),
            "0x44",
            "mstore",
            "gas",
            "call",
            "0x0",
            "0x0",
            "0x64",
            "0x0",
            "0x0",
            getAddress(offer.givesToken),
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
            "and",
            "0x0",
            "0x0",
            "0x24",
            "0x0",
            "0x0",
            (0, exports.toWETH)(chainId),
            "0x3ccfd60b00000000000000000000000000000000000000000000000000000000",
            "0x0",
            "mstore",
            hexlify(offer.getsAmount),
            "0x4",
            "mstore",
            "gas",
            "call",
            "and",
            "0x0",
            "0x0",
            "0x0",
            "0x0",
            hexlify(offer.getsAmount),
            getAddress(maker),
            "gas",
            "call",
            "and",
            "failure",
            "jumpi",
            getAddress(taker),
            "selfdestruct",
            ["failure", ["0x0", "0x0", "revert"]],
        ]);
    }
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