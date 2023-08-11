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
exports.createContract = exports.parseSendEther = exports.parseTransferFrom = exports.parsePermit = exports.parseWithdraw = exports.parseTrade = exports.parsePermit2 = exports.replaceForAddressOpcode = exports.numberToHex = exports.erc1155Interface = exports.tokenInterface = exports.stripHexPrefix = exports.addHexPrefix = exports.wrapEth = exports.toWETH = exports.coerceToWeth = exports.setFallbackWETH = exports.transactionToObject = exports.defer = exports.genericAbi = exports.leftZeroPad = exports.hashOffer = exports.hashTransfer = exports.isERC1155Transfer = exports.isERC721Transfer = exports.isERC20Transfer = exports.keyshareToAddress = exports.toBigInt = exports.erc721PermitInterface = exports.permit2Interface = void 0;
const ethers_1 = require("ethers");
const emasm_1 = require("emasm");
const bn_js_1 = __importDefault(require("bn.js"));
const permit2_sdk_1 = require("@uniswap/permit2-sdk");
const permit2_json_1 = __importDefault(require("./permit2.json"));
const evmdis = __importStar(require("evmdis"));
const chains_1 = require("./chains");
const { solidityPackedKeccak256, toBeArray, getAddress, computeAddress, getUint, hexlify, } = ethers_1.ethers;
exports.permit2Interface = new ethers_1.ethers.Interface(permit2_json_1.default);
exports.erc721PermitInterface = new ethers_1.ethers.Interface([
    "function permit(address, uint256, uint256, uint8, bytes32, bytes32)",
]);
// UTILS
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
const isERC20Transfer = (o) => !o.tokenId;
exports.isERC20Transfer = isERC20Transfer;
const isERC721Transfer = (o) => Boolean(o.tokenId && o.token && o.amount === undefined);
exports.isERC721Transfer = isERC721Transfer;
const isERC1155Transfer = (o) => Boolean(o.tokenId && o.token && o.amount !== undefined);
exports.isERC1155Transfer = isERC1155Transfer;
const hashTransfer = (o) => {
    if ((0, exports.isERC20Transfer)(o))
        return solidityPackedKeccak256(["string", "address", "uint256"], ["/pintswap/erc20", o.token, o.amount]);
    if ((0, exports.isERC721Transfer)(o))
        return solidityPackedKeccak256(["string", "address", "uint256"], ["/pintswap/erc721", o.token, o.tokenId]);
    if ((0, exports.isERC1155Transfer)(o))
        return solidityPackedKeccak256(["string", "address", "uint256", "uint256"], ["/pintswap/erc1155", o.token, o.tokenId, o.amount]);
    throw Error("no matching token structure");
};
exports.hashTransfer = hashTransfer;
const hashOffer = (o) => {
    return solidityPackedKeccak256(["bytes32", "bytes32"], [(0, exports.hashTransfer)(o.gives), (0, exports.hashTransfer)(o.gets)]);
};
exports.hashOffer = hashOffer;
function leftZeroPad(s, n) {
    return "0".repeat(n - s.length) + s;
}
exports.leftZeroPad = leftZeroPad;
exports.genericAbi = [
    "function approve(address, uint256) returns (bool)",
    "function allowance(address, address) view returns (uint256)",
    "function balanceOf(address) view returns (uint256)",
];
const defer = () => {
    let resolve, reject, promise = new Promise((_resolve, _reject) => {
        resolve = _resolve;
        reject = _reject;
    });
    return {
        resolve,
        reject,
        promise,
    };
};
exports.defer = defer;
const transactionToObject = (tx) => ({
    nonce: tx.nonce,
    value: tx.value,
    from: tx.from,
    gasPrice: tx.gasPrice,
    gasLimit: tx.gasLimit,
    chainId: tx.chainId,
    data: tx.data,
    maxFeePerGas: tx.maxFeePerGas,
    maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
});
exports.transactionToObject = transactionToObject;
let fallbackWETH = null;
const setFallbackWETH = (address) => {
    fallbackWETH = address;
};
exports.setFallbackWETH = setFallbackWETH;
const coerceToWeth = (address, signer) => __awaiter(void 0, void 0, void 0, function* () {
    if (address === ethers_1.ethers.ZeroAddress) {
        const { chainId } = yield signer.provider.getNetwork();
        return (0, exports.toWETH)(chainId);
    }
    return address;
});
exports.coerceToWeth = coerceToWeth;
const toWETH = (chainId = 1) => {
    const chain = String(chainId);
    const address = chains_1.WETH_ADDRESSES[chain];
    return (address ||
        fallbackWETH ||
        (() => {
            throw Error("no WETH contract found for chainid " + chain);
        })());
};
exports.toWETH = toWETH;
const wrapEth = (signer, amount) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { chainId } = yield signer.provider.getNetwork();
        yield new ethers_1.ethers.Contract((0, exports.toWETH)(chainId.toString()), ["function deposit()"], signer).deposit({ value: amount });
        return true;
    }
    catch (err) {
        return false;
    }
});
exports.wrapEth = wrapEth;
const addHexPrefix = (s) => (s.substr(0, 2) === "0x" ? s : "0x" + s);
exports.addHexPrefix = addHexPrefix;
const stripHexPrefix = (s) => s.substr(0, 2) === "0x" ? s.substr(2) : s;
exports.stripHexPrefix = stripHexPrefix;
exports.tokenInterface = new ethers_1.ethers.Interface([
    "function transferFrom(address, address, uint256) returns (bool)",
    "function safeTransferFrom(address, address, uint256)",
    "function permit(address, address, uint256, uint256, uint8, bytes32, bytes32)",
    "function withdraw(uint256)",
]);
exports.erc1155Interface = new ethers_1.ethers.Interface([
    "function safeTransferFrom(address, address, uint256, uint256)",
]);
const numberToHex = (v) => hexlify(toBeArray(getUint(v)));
exports.numberToHex = numberToHex;
const replaceForAddressOpcode = (calldata) => {
    return [].slice
        .call((0, exports.stripHexPrefix)(calldata).replace(/[0]{24}[1]{40}/g, "-"))
        .reduce((r, v) => {
        if (v === "-") {
            r.push(["address"]);
            r.push([]);
        }
        else
            r[r.length - 1].push(v);
        return r;
    }, [[]])
        .map((v) => (v.length === 1 ? v : (0, exports.addHexPrefix)(v.join(""))));
};
exports.replaceForAddressOpcode = replaceForAddressOpcode;
const makeCheckOp = (ary) => (op) => {
    const [item] = ary.splice(0, 1);
    const [opCode, _, __, operand] = item || [];
    if (!opCode)
        return false;
    if (Array.isArray(op) ? (op.find((v) => v === 'PUSH' && opCode.match(v) || v === opCode)) : ((op === "PUSH" && opCode.match(op)) || opCode === op))
        return operand || null;
    else
        return false;
};
/*
export const parsePermit2 = (disassembly, first = false) => {
  const ops = disassembly.slice();
  const checkOp = makeCheckOp(ops);
  const parsed = [
    first ? 'PC' : 'PUSH1',
    first ? 'RETURNDATASIZE' : 'PUSH1',
    'PUSH2',
    first ? 'RETURNDATASIZE' : 'PUSH1',
    first ? 'RETURNDATASIZE' : 'PUSH1',
    'PUSH',
    'GAS',
    'PUSH32',
    'PUSH1',
    'MSTORE',
    'PUSH',
    'PUSH1',
    'MSTORE',
    'PUSH',
    'PUSH1',
    'MSTORE',
    'PUSH',
    'PUSH1',
    'MSTORE',
    'PUSH',
    'PUSH1',
    'MSTORE',
    'PUSH',
    'PUSH1',
    'MSTORE',
    'PUSH',
    'PUSH1',
    'MSTORE',
    'PUSH',
    'PUSH1',
    'MSTORE',
    'PUSH2',
    'PUSH1',
    'MSTORE',
    'PUSH1',
    'PUSH2',
    'MSTORE',
    'PUSH',
    'PUSH2',
    'MSTORE',
    'PUSH',
    'PUSH2',
    'MSTORE',
    'PUSH32',
    'PUSH2',
    'MSTORE',
    'CALL'
  ].concat(first ? [] : ['AND']).map((v) => checkOp(v));
  if (parsed.find((v) => v === false) || parsed[2] !== '0x0184' || parsed[5] !== '0x22d473030f116ddee9f6b43ac78ba3' || parsed[7] !== '0x30f28b7a00000000000000000000000000000000000000000000000000000000') return false;
  return {
    token: ethers.getAddress(parsed[10]),
    to: ethers.getAddress(parsed[22]),
    from: ethers.getAddress(parsed[28]),
    signature: ethers.joinSignature({
      r: parsed[27],
      s: parsed[40],
      v: Number(parsed[43].substr(0, 4))
    }),
    amount: parsed[13]
  };
};

*/
const parsePermit2 = (disassembly, first = false) => {
    const ops = disassembly.slice();
    const checkOp = makeCheckOp(ops);
    const parsed = [
        first ? "PC" : "PUSH1",
        first ? "RETURNDATASIZE" : "PUSH1",
        "PUSH2",
        first ? "RETURNDATASIZE" : "PUSH1",
        first ? "RETURNDATASIZE" : "PUSH1",
        "PUSH",
        "GAS",
        "PUSH32",
        "PUSH1",
        "MSTORE",
        "PUSH",
        "PUSH1",
        "MSTORE",
        "PUSH",
        "PUSH1",
        "MSTORE",
        "PUSH",
        "PUSH1",
        "MSTORE",
        "PUSH",
        "PUSH1",
        "MSTORE",
        ["PUSH", "ADDRESS"],
        "PUSH1",
        "MSTORE",
        "PUSH",
        "PUSH1",
        "MSTORE",
        "PUSH",
        "PUSH1",
        "MSTORE",
        "PUSH",
        "PUSH1",
        "MSTORE",
        "PUSH",
        "PUSH2",
        "MSTORE",
        "PUSH",
        "PUSH2",
        "MSTORE",
        "PUSH",
        "PUSH2",
        "MSTORE",
        "PUSH32",
        "PUSH2",
        "MSTORE",
        "CALL",
    ]
        .concat(first ? [] : ["AND"])
        .map((v) => checkOp(v));
    if (parsed.find((v) => v === false) === false ||
        parsed[2] !== "0x0184" ||
        parsed[5] !== "0x22d473030f116ddee9f6b43ac78ba3" ||
        parsed[7] !==
            "0x30f28b7a00000000000000000000000000000000000000000000000000000000")
        return false;
    return {
        tail: disassembly.slice(parsed.length),
        data: {
            token: ethers_1.ethers.getAddress(parsed[10]),
            to: parsed[22] === '0x' ? 'CALLER' : ethers_1.ethers.getAddress(parsed[22]),
            from: ethers_1.ethers.getAddress(parsed[28]),
            signature: {
                r: parsed[27],
                s: parsed[40],
                v: Number(parsed[43].substr(0, 4)),
            },
            amount: parsed[13],
        },
    };
};
exports.parsePermit2 = parsePermit2;
const parseTransfer = (disassembly, chainId = 1, first = false) => {
    const transferFrom = (0, exports.parseTransferFrom)(disassembly, first);
    const transfer = !transferFrom && (0, exports.parsePermit2)(disassembly, first);
    if (transfer === false && transferFrom === false)
        return false;
    const withdraw = transfer && transfer.data.token === ethers_1.ethers.getAddress((0, exports.toWETH)(chainId)) && (0, exports.parseWithdraw)(transfer.tail);
    const sendEther = withdraw && parseSendEther(withdraw.tail);
    if (transfer &&
        transfer.data.token === ethers_1.ethers.getAddress((0, exports.toWETH)(chainId)) &&
        !(sendEther && withdraw))
        return false;
    return {
        data: {
            transferFrom: transferFrom && transferFrom.data || null,
            transfer: transfer && transfer.data || null,
            withdraw: withdraw && withdraw.data || null,
            sendEther: (sendEther && sendEther.data) || null,
        },
        tail: (sendEther && sendEther.tail) || (transfer || transferFrom).tail,
    };
};
const parseTrade = (bytecode, chainId = 1) => {
    const disassembly = evmdis.disassemble(bytecode);
    const firstPermit = (0, exports.parsePermit)(disassembly, true);
    const secondPermit = firstPermit && (0, exports.parsePermit)(firstPermit.tail, false);
    const firstTransfer = parseTransfer(secondPermit && secondPermit.tail || firstPermit && firstPermit.tail || disassembly, chainId, !firstPermit);
    if (!firstTransfer)
        return false;
    const secondTransfer = parseTransfer(firstTransfer.tail, chainId, false);
    if (!secondTransfer)
        return false;
    const ops = secondTransfer.tail.slice();
    const checkOp = makeCheckOp(ops);
    const parsed = [
        "ISZERO",
        "PUSH2",
        "JUMPI",
        "PUSH",
        "SELFDESTRUCT",
        "JUMPDEST",
        "PUSH1",
        "PUSH1",
        "REVERT",
    ].map((v) => checkOp(v));
    if (parsed.find((v) => v === false) === false ||
        parsed.slice(6, 7).find((v) => v !== "0x00"))
        return false;
    const tail = ops.slice(parsed.length);
    if (tail.length !== 0)
        return false;
    const data = {
        firstPermit: firstPermit && firstPermit.data,
        secondPermit: secondPermit && secondPermit.data,
        firstTransfer: firstTransfer.data,
        secondTransfer: secondTransfer.data,
    };
    let permitData = null;
    if (firstPermit) {
        permitData = {};
        if (secondPermit) {
            permitData.maker = firstPermit.data;
            permitData.taker = secondPermit.data;
        }
        else {
            if (firstPermit.data.token === (firstTransfer.data.transferFrom || firstTransfer.data.transfer).token)
                permitData.taker = firstPermit.data;
            else
                permitData.maker = firstPermit.data;
        }
    }
    const taker = (firstTransfer.data.transfer || firstTransfer.data.transferFrom).from;
    const maker = (secondTransfer.data.transfer || secondTransfer.data.transferFrom).from;
    const gets = {
        token: (firstTransfer.data.transfer || firstTransfer.data.transferFrom).token,
        amount: (firstTransfer.data.transfer || firstTransfer.data.transferFrom).amount
    };
    const gives = {
        token: (secondTransfer.data.transfer || secondTransfer.data.transferFrom).token,
        amount: (secondTransfer.data.transfer || secondTransfer.data.transferFrom).amount
    };
    return [{ gets, gives }, maker, taker, chainId, permitData, null];
};
exports.parseTrade = parseTrade;
const parseWithdraw = (disassembly, chainId = 1, first = false) => {
    const ops = disassembly.slice();
    const checkOp = makeCheckOp(ops);
    const parsed = [
        first ? "PC" : "PUSH1",
        first ? "RETURNDATASIZE" : "PUSH1",
        "PUSH1",
        first ? "RETURNDATASIZE" : "PUSH1",
        first ? "RETURNDATASIZE" : "PUSH1",
        "PUSH",
        "GAS",
        "PUSH32",
        first ? "RETURNDATASIZE" : "PUSH1",
        "MSTORE",
        "PUSH",
        "PUSH1",
        "MSTORE",
        "CALL",
    ]
        .concat(first ? [] : ["AND"])
        .map((v) => checkOp(v));
    if (parsed[2] !== "0x24" ||
        ethers_1.ethers.getAddress(parsed[5]) !== ethers_1.ethers.getAddress((0, exports.toWETH)(chainId)) ||
        parsed[7] !==
            "0x2e1a7d4d00000000000000000000000000000000000000000000000000000000" ||
        parsed[11] !== "0x04")
        return false;
    return {
        data: {
            token: ethers_1.ethers.getAddress(parsed[5]),
            amount: parsed[10],
        },
        tail: disassembly.slice(parsed.length),
    };
};
exports.parseWithdraw = parseWithdraw;
const parsePermit = (disassembly, first = false) => {
    const ops = disassembly.slice();
    const checkOp = makeCheckOp(ops);
    const parsed = [
        first ? "PC" : "PUSH1",
        first ? "RETURNDATASIZE" : "PUSH1",
        "PUSH1",
        first ? "RETURNDATASIZE" : "PUSH1",
        first ? "RETURNDATASIZE" : "PUSH1",
        "PUSH",
        "GAS",
        "PUSH32",
        "PUSH1",
        "MSTORE",
        "PUSH",
        "PUSH1",
        "MSTORE",
        "ADDRESS",
        "PUSH1",
        "MSTORE",
        "PUSH",
        "PUSH1",
        "MSTORE",
        "PUSH",
        "PUSH1",
        "MSTORE",
        "PUSH1",
        "PUSH1",
        "MSTORE",
        "PUSH",
        "PUSH1",
        "MSTORE",
        "PUSH",
        "PUSH1",
        "MSTORE",
        "CALL",
    ]
        .concat(first ? [] : ["AND"])
        .map((v) => checkOp(v));
    if (parsed[2] !== "0xe4" ||
        parsed[7] !== "0xd505accf00000000000000000000000000000000000000000000000000000000" ||
        parsed[11] !== "0x04")
        return false;
    return {
        data: {
            token: ethers_1.ethers.getAddress(parsed[5]),
            from: ethers_1.ethers.getAddress(parsed[10]),
            amount: parsed[19],
            signature: ethers_1.ethers.Signature.from({
                r: parsed[25],
                s: parsed[28],
                v: Number(parsed[22])
            })
        },
        tail: disassembly.slice(parsed.length),
    };
};
exports.parsePermit = parsePermit;
const parseTransferFrom = (disassembly, first = false) => {
    const ops = disassembly.slice();
    const checkOp = makeCheckOp(ops);
    const parsed = [
        first ? "PC" : "PUSH1",
        first ? "RETURNDATASIZE" : "PUSH1",
        "PUSH1",
        first ? "RETURNDATASIZE" : "PUSH1",
        first ? "RETURNDATASIZE" : "PUSH1",
        "PUSH",
        "GAS",
        "PUSH32",
        "PUSH1",
        "MSTORE",
        "PUSH",
        "PUSH1",
        "MSTORE",
        "PUSH",
        "PUSH1",
        "MSTORE",
        "PUSH",
        "PUSH1",
        "MSTORE",
        "CALL"
    ]
        .concat(first ? [] : ["AND"])
        .map((v) => checkOp(v));
    if (parsed[2] !== "0x64" ||
        parsed[7] !==
            "0x23b872dd00000000000000000000000000000000000000000000000000000000" ||
        parsed[11] !== "0x04")
        return false;
    return {
        data: {
            token: ethers_1.ethers.getAddress(parsed[5]),
            from: ethers_1.ethers.getAddress(parsed[10]),
            to: ethers_1.ethers.getAddress(parsed[13]),
            amount: parsed[16]
        },
        tail: disassembly.slice(parsed.length),
    };
};
exports.parseTransferFrom = parseTransferFrom;
function parseSendEther(disassembly) {
    const ops = disassembly.slice();
    const checkOp = makeCheckOp(ops);
    const parsed = [
        "PUSH1",
        "PUSH1",
        "PUSH1",
        "PUSH1",
        "PUSH",
        "PUSH",
        "GAS",
        "CALL",
        "AND",
    ].map((v) => checkOp(v));
    if (parsed.slice(0, 4).find((v) => v !== "0x00"))
        return false;
    return {
        tail: disassembly.slice(parsed.length),
        data: {
            amount: parsed[4],
            to: ethers_1.ethers.getAddress(parsed[5]),
        },
    };
}
exports.parseSendEther = parseSendEther;
// SWAP CONTRACT
const createContract = (offer, maker, taker, chainId = 1, permitData = {}, payCoinbaseAmount) => {
    let firstInstruction = true;
    let beforeCall = true;
    const zero = () => {
        if (firstInstruction) {
            firstInstruction = false;
            return "pc";
        }
        else if (beforeCall) {
            return "returndatasize";
        }
        else
            return "0x0";
    };
    const makeMstoreInstructions = (words, offset = "0x0") => {
        return words.reduce((r, v) => {
            r.push(ethers_1.ethers.stripZerosLeft((0, exports.addHexPrefix)(v)));
            r.push(offset);
            r.push("mstore");
            offset = (0, exports.numberToHex)(Number(offset) + 0x20);
            return r;
        }, []);
    };
    const call = (address, calldata, value) => {
        const calldataSubstituted = (0, exports.replaceForAddressOpcode)(calldata);
        const stripped = calldataSubstituted.map((v) => typeof v === "string" ? (0, exports.stripHexPrefix)(v) : v);
        const inputLength = ((v) => (v === "0x" ? "0x0" : v))((0, exports.numberToHex)(stripped.reduce((r, v) => r + (typeof v === "string" ? v.length / 2 : 0x20), 0)));
        const first = stripped[0];
        const initial = [];
        let offset = "0x0";
        let wordSize = "0x20";
        if (!Array.isArray(first)) {
            if (first) {
                initial.push(ethers_1.ethers.zeroPadBytes((0, exports.addHexPrefix)(first.substr(0, 8)), 0x20));
                initial.push("0x0");
                initial.push("mstore");
                offset = "0x4";
            }
        }
        if (stripped[0])
            stripped[0] = stripped[0].substr(8);
        const mstoreInstructions = initial.concat(stripped.map((v) => {
            if (!v.length)
                return [];
            if (Array.isArray(v)) {
                wordSize = "0x20";
                const list = [v, offset, "mstore"];
                offset = (0, exports.numberToHex)(Number(offset) + 0x20);
                return list;
            }
            const words = v.match(/.{1,64}/g);
            const list = makeMstoreInstructions(words, offset);
            offset = (0, exports.numberToHex)(Number(offset) + v.length / 2);
            return list;
        }));
        const instructions = [
            zero(),
            zero(),
            inputLength,
            zero(),
            value || zero(),
            getAddress(address),
            "gas",
            calldata === "0x" ? [] : mstoreInstructions,
            "call" /*
            "returndatasize",
            "0x0",
            "0x0",
            "returndatacopy",
            "returndatasize",
            "0x0"
            "revert", */,
            beforeCall ? [] : ["and"],
        ];
        beforeCall = false;
        return instructions;
    };
    permitData = permitData || {};
    const permit = (transfer, owner, permitData) => {
        if ((0, exports.isERC20Transfer)(transfer)) {
            return call(transfer.token, exports.tokenInterface.encodeFunctionData("permit", [
                owner,
                "0x" + "1".repeat(40),
                transfer.amount,
                (0, exports.numberToHex)(permitData.expiry),
                (0, exports.numberToHex)(permitData.v),
                permitData.r,
                permitData.s,
            ]));
        }
        else if ((0, exports.isERC721Transfer)(transfer)) {
            return call(transfer.token, exports.erc721PermitInterface.encodeFunctionData("permit", [
                "0x" + "1".repeat(40),
                transfer.tokenId,
                permitData.expiry,
                permitData.v,
                permitData.r,
                permitData.s,
            ]));
        }
        else
            return [];
    };
    const transferFrom = (transfer, from, to, permitData) => {
        if ((0, exports.isERC20Transfer)(transfer)) {
            if (permitData && permitData.signatureTransfer) {
                if (transfer.token === ethers_1.ethers.ZeroAddress) {
                    return [
                        call(permit2_sdk_1.PERMIT2_ADDRESS, exports.permit2Interface.encodeFunctionData("permitTransferFrom", [
                            {
                                permitted: {
                                    token: (0, exports.toWETH)(chainId),
                                    amount: transfer.amount,
                                },
                                nonce: permitData.signatureTransfer.nonce,
                                deadline: permitData.signatureTransfer.deadline,
                            },
                            {
                                to: "0x" + "1".repeat(40),
                                requestedAmount: transfer.amount,
                            },
                            from,
                            permitData.signature,
                        ])),
                        call((0, exports.toWETH)(chainId), exports.tokenInterface.encodeFunctionData("withdraw", [transfer.amount])),
                        payCoinbaseAmount
                            ? [
                                call(to, "0x", (0, exports.numberToHex)(ethers_1.ethers.getUint(transfer.amount) -
                                    ethers_1.ethers.getUint(payCoinbaseAmount))),
                                [
                                    "0x0",
                                    "0x0",
                                    "0x0",
                                    "0x0",
                                    payCoinbaseAmount,
                                    "coinbase",
                                    "gas",
                                    "call",
                                    "and",
                                ],
                            ]
                            : call(to, "0x", transfer.amount),
                    ];
                }
                return call(permit2_sdk_1.PERMIT2_ADDRESS, exports.permit2Interface.encodeFunctionData("permitTransferFrom", [
                    {
                        permitted: {
                            token: transfer.token,
                            amount: transfer.amount,
                        },
                        nonce: permitData.signatureTransfer.nonce,
                        deadline: permitData.signatureTransfer.deadline,
                    },
                    {
                        to,
                        requestedAmount: transfer.amount,
                    },
                    from,
                    permitData.signature,
                ]));
            }
            if (transfer.token === ethers_1.ethers.ZeroAddress) {
                return [
                    call((0, exports.toWETH)(chainId), exports.tokenInterface.encodeFunctionData("transferFrom", [
                        from,
                        "0x" + "1".repeat(40),
                        transfer.amount,
                    ])),
                    call(to, "0x", transfer.amount),
                ];
            }
            return call(transfer.token, exports.tokenInterface.encodeFunctionData("transferFrom", [
                from,
                to,
                transfer.amount,
            ]));
        }
        else if ((0, exports.isERC721Transfer)(transfer)) {
            return call(transfer.token, exports.tokenInterface.encodeFunctionData("safeTransferFrom", [
                from,
                to,
                transfer.tokenId,
            ]));
        }
        else if ((0, exports.isERC1155Transfer)(transfer)) {
            return call(transfer.token, exports.erc1155Interface.encodeFunctionData("safeTransferFrom", [
                from,
                to,
                transfer.tokenId,
                transfer.amount,
            ]));
        }
    };
    return (0, emasm_1.emasm)([
        (permitData.maker &&
            permitData.maker.v &&
            permit(offer.gives, maker, permitData.maker)) ||
            [],
        (permitData.taker &&
            permitData.taker.v &&
            permit(offer.gets, taker, permitData.taker)) ||
            [],
        transferFrom(offer.gets, taker, maker, permitData && permitData.taker),
        transferFrom(offer.gives, maker, taker, permitData && permitData.maker),
        "iszero",
        "failure",
        "jumpi",
        getAddress(maker),
        Number(chainId) === 324 ? [] : "selfdestruct",
        ["failure", ["0x0", "0x0", "revert"]],
    ]);
};
exports.createContract = createContract;
//# sourceMappingURL=trade.js.map