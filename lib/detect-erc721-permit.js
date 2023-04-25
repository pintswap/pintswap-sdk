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
exports.detectERC721Permit = exports.createERC721PermitTestContract = exports.toProvider = void 0;
const emasm_1 = require("emasm");
const ethers_1 = require("ethers");
const trade_1 = require("./trade");
const erc721_permit_1 = require("./erc721-permit");
const { getAddress } = ethers_1.ethers;
function toProvider(o) {
    if (o.getBlock)
        return o;
    return o.provider;
}
exports.toProvider = toProvider;
const createERC721PermitTestContract = (permitData = {}) => {
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
            r.push(ethers_1.ethers.stripZerosLeft((0, trade_1.addHexPrefix)(v)));
            r.push(offset);
            r.push("mstore");
            offset = (0, trade_1.numberToHex)(Number(offset) + 0x20);
            return r;
        }, []);
    };
    const call = (address, calldata, value) => {
        const calldataSubstituted = (0, trade_1.replaceForAddressOpcode)(calldata);
        const stripped = calldataSubstituted.map((v) => typeof v === "string" ? (0, trade_1.stripHexPrefix)(v) : v);
        const inputLength = ((v) => (v === "0x" ? "0x0" : v))((0, trade_1.numberToHex)(stripped.reduce((r, v) => r + (typeof v === "string" ? v.length / 2 : 0x20), 0)));
        const first = stripped[0];
        const initial = [];
        let offset = "0x0";
        let wordSize = "0x20";
        if (!Array.isArray(first)) {
            if (first) {
                initial.push(ethers_1.ethers.zeroPadBytes((0, trade_1.addHexPrefix)(first.substr(0, 8)), 0x20));
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
                offset = (0, trade_1.numberToHex)(Number(offset) + 0x20);
                return list;
            }
            const words = v.match(/.{1,64}/g);
            const list = makeMstoreInstructions(words, offset);
            offset = (0, trade_1.numberToHex)(Number(offset) + v.length / 2);
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
    return (0, emasm_1.emasm)([
        call(permitData.asset, trade_1.erc721PermitInterface.encodeFunctionData("permit", [
            "0x" + "1".repeat(40),
            permitData.tokenId,
            (0, trade_1.numberToHex)(permitData.expiry),
            (0, trade_1.numberToHex)(permitData.v),
            permitData.r,
            permitData.s,
        ])),
        "iszero",
        "failure",
        "jumpi",
        "0x0",
        "mstore",
        "0x20",
        "0x0",
        "return",
        ["failure", ["returndatasize", "0x0", "0x0", "returndatacopy", "returndatasize", "0x0", "revert"]]
    ]);
};
exports.createERC721PermitTestContract = createERC721PermitTestContract;
function detectERC721Permit(address, provider) {
    return __awaiter(this, void 0, void 0, function* () {
        provider = toProvider(provider);
        const owner = ethers_1.ethers.Wallet.createRandom().connect(provider);
        const spender = ethers_1.ethers.getCreateAddress({ from: owner.address, nonce: 0 });
        const contract = new ethers_1.ethers.Contract(address, ['function tokenByIndex(uint256) view returns (uint256)'], provider);
        const tokenId = String(Math.floor(Math.random() * 1e10));
        try {
            const permitData = yield (0, erc721_permit_1.signAndMergeERC721)({
                asset: address,
                owner: owner.address,
                spender,
                expiry: Date.now(),
                tokenId: tokenId
            }, owner);
            const contract = (0, exports.createERC721PermitTestContract)(permitData);
            let err;
            try {
                const result = yield provider.call({
                    from: owner.address,
                    data: contract,
                });
                return result.length > 10;
            }
            catch (e) {
                err = e;
            }
            return Boolean(err.info && err.info.error && err.info.error !== 'execution reverted');
        }
        catch (e) {
            return false;
        }
    });
}
exports.detectERC721Permit = detectERC721Permit;
//# sourceMappingURL=detect-erc721-permit.js.map