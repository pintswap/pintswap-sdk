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
exports.createContract = exports.replaceForAddressOpcode = exports.wrapEth = exports.toWETH = exports.coerceToWeth = exports.setFallbackWETH = exports.WETH_ADDRESSES = exports.transactionToObject = exports.defer = exports.genericAbi = exports.leftZeroPad = exports.hashOffer = exports.keyshareToAddress = exports.toBigInt = exports.permit2Interface = void 0;
const ethers_1 = require("ethers");
const emasm_1 = require("emasm");
const bn_js_1 = __importDefault(require("bn.js"));
const WETH9_json_1 = __importDefault(require("canonical-weth/build/contracts/WETH9.json"));
const permit2_sdk_1 = require("@uniswap/permit2-sdk");
const permit2_json_1 = __importDefault(require("./permit2.json"));
const ln = (v) => ((console.log(require('util').inspect(v, { colors: true, depth: 15 }))), v);
const { solidityPackedKeccak256, toBeArray, getAddress, computeAddress, getUint, hexlify, } = ethers_1.ethers;
exports.permit2Interface = new ethers_1.ethers.Interface(permit2_json_1.default);
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
const hashOffer = (o) => {
    return solidityPackedKeccak256(["address", "address", "uint256", "uint256"], [
        getAddress(o.givesToken),
        getAddress(o.getsToken),
        o.givesAmount,
        o.getsAmount,
    ]);
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
// ETH/WETH
exports.WETH_ADDRESSES = Object.assign(Object.entries(WETH9_json_1.default.networks).reduce((r, [chainId, { address }]) => {
    r[chainId] = address;
    return r;
}, {}), {
    "42161": "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    "137": "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    "10": "0x4200000000000000000000000000000000000006",
    "43112": "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
});
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
    const address = exports.WETH_ADDRESSES[chain];
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
const stripHexPrefix = (s) => (s.substr(0, 2) === "0x" ? s.substr(2) : s);
const tokenInterface = new ethers_1.ethers.Interface([
    "function transferFrom(address, address, uint256) returns (bool)",
    "function permit(address, address, uint256, uint256, uint8, bytes32, bytes32)",
    "function withdraw(uint256)",
]);
const numberToHex = (v) => hexlify(toBeArray(getUint(v)));
const replaceForAddressOpcode = (calldata) => {
    return [].slice
        .call(stripHexPrefix(calldata).replace(/[0]{24}[1]{40}/g, "-"))
        .reduce((r, v) => {
        if (v === "-") {
            r.push(["address"]);
            r.push([]);
        }
        else
            r[r.length - 1].push(v);
        return r;
    }, [[]])
        .map((v) => (v.length === 1 ? v : addHexPrefix(v.join(""))));
};
exports.replaceForAddressOpcode = replaceForAddressOpcode;
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
            r.push(ethers_1.ethers.stripZerosLeft(addHexPrefix(v)));
            r.push(offset);
            r.push("mstore");
            offset = numberToHex(Number(offset) + 0x20);
            return r;
        }, []);
    };
    const call = (address, calldata, value) => {
        const calldataSubstituted = (0, exports.replaceForAddressOpcode)(calldata);
        const stripped = calldataSubstituted.map((v) => typeof v === "string" ? stripHexPrefix(v) : v);
        const inputLength = ((v) => v === '0x' ? '0x0' : v)(numberToHex(stripped.reduce((r, v) => r + (typeof v === "string" ? v.length / 2 : 0x20), 0)));
        const first = stripped[0];
        const initial = [];
        let offset = "0x0";
        let wordSize = "0x20";
        if (!Array.isArray(first)) {
            if (first) {
                initial.push(ethers_1.ethers.zeroPadBytes(addHexPrefix(first.substr(0, 8)), 0x20));
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
                offset = numberToHex(Number(offset) + 0x20);
                return list;
            }
            const words = v.match(/.{1,64}/g);
            const list = makeMstoreInstructions(words, offset);
            offset = numberToHex(Number(offset) + v.length / 2);
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
            calldata === '0x' ? [] : mstoreInstructions,
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
    const transferFrom = (token, from, to, amount, permitData) => {
        if (permitData && permitData.signatureTransfer) {
            if (token === ethers_1.ethers.ZeroAddress) {
                return [
                    call(permit2_sdk_1.PERMIT2_ADDRESS, exports.permit2Interface.encodeFunctionData("permitTransferFrom", [
                        {
                            permitted: {
                                token: (0, exports.toWETH)(chainId),
                                amount,
                            },
                            nonce: permitData.signatureTransfer.nonce,
                            deadline: permitData.signatureTransfer.deadline,
                        },
                        {
                            to: "0x" + "1".repeat(40),
                            requestedAmount: amount,
                        },
                        from,
                        permitData.signature,
                    ])),
                    call((0, exports.toWETH)(chainId), tokenInterface.encodeFunctionData('withdraw', [amount])),
                    payCoinbaseAmount
                        ? [
                            call(to, "0x", numberToHex(ethers_1.ethers.getUint(amount) - ethers_1.ethers.getUint(payCoinbaseAmount))), [
                                "0x0",
                                "0x0",
                                "0x0",
                                "0x0",
                                payCoinbaseAmount,
                                "coinbase",
                                "gas",
                                "call",
                                "and"
                            ],
                        ]
                        : call(to, "0x", amount),
                ];
            }
            return call(permit2_sdk_1.PERMIT2_ADDRESS, exports.permit2Interface.encodeFunctionData("permitTransferFrom", [
                {
                    permitted: {
                        token,
                        amount,
                    },
                    nonce: permitData.signatureTransfer.nonce,
                    deadline: permitData.signatureTransfer.deadline,
                },
                {
                    to,
                    requestedAmount: amount,
                },
                from,
                permitData.signature,
            ]));
        }
        if (token === ethers_1.ethers.ZeroAddress) {
            return [
                call((0, exports.toWETH)(chainId), tokenInterface.encodeFunctionData("transferFrom", [
                    from,
                    "0x" + "1".repeat(40),
                    amount,
                ])),
                call(to, "0x", amount),
            ];
        }
        return call(token, tokenInterface.encodeFunctionData("transferFrom", [from, to, amount]));
    };
    return (0, emasm_1.emasm)(ln([
        permitData.maker && permitData.v
            ? call(offer.givesToken, tokenInterface.encodeFunctionData("permit", [
                maker,
                "0x" + "1".repeat(40),
                offer.givesAmount,
                numberToHex(permitData.maker.expiry),
                numberToHex(permitData.maker.v),
                permitData.maker.r,
                permitData.maker.s,
            ]))
            : [],
        permitData.taker && permitData.taker.v
            ? call(offer.getsToken, tokenInterface.encodeFunctionData("permit", [
                taker,
                "0x" + "1".repeat(40),
                offer.getsAmount,
                numberToHex(permitData.taker.expiry),
                numberToHex(permitData.taker.v),
                permitData.taker.r,
                permitData.taker.s,
            ]))
            : [],
        transferFrom(offer.getsToken, taker, maker, offer.getsAmount, permitData && permitData.taker),
        transferFrom(offer.givesToken, maker, taker, offer.givesAmount, permitData && permitData.maker),
        "iszero",
        "failure",
        "jumpi",
        getAddress(maker),
        "selfdestruct",
        ["failure", ["0x0", "0x0", "revert"]],
    ]));
};
exports.createContract = createContract;
//# sourceMappingURL=trade.js.map