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
exports.decode = exports.encode = exports.signERC721Permit = exports.signTypedData = exports.signAndMergeERC721 = exports.joinSignature = exports.splitSignature = exports.toEIP712 = exports.getDomain = exports.toNetwork = exports.toChainId = exports.getPermitStructure = exports.fetchData = exports.getVersion = exports.getDomainStructure = exports.getMessage = void 0;
const ethers_1 = require("ethers");
const protocol_1 = require("./protocol");
const lodash_1 = require("lodash");
function getMessage(request) {
    const address = (0, ethers_1.getAddress)(request.asset);
    const chainId = toChainId(toNetwork(address));
    return {
        spender: request.spender,
        nonce: request.nonce,
        deadline: request.expiry,
        tokenId: request.tokenId,
    };
}
exports.getMessage = getMessage;
function getDomainStructure(asset) {
    return [
        {
            name: "name",
            type: "string",
        },
        {
            name: "version",
            type: "string",
        },
        {
            name: "chainId",
            type: "uint256",
        },
        {
            name: "verifyingContract",
            type: "address",
        },
    ];
}
exports.getDomainStructure = getDomainStructure;
function getVersion(contract) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            return yield contract.version();
        }
        catch (e) {
            try {
                return yield contract.VERSION();
            }
            catch (e) {
                return "1";
            }
        }
    });
}
exports.getVersion = getVersion;
function fetchData(o, provider) {
    return __awaiter(this, void 0, void 0, function* () {
        const contract = new ethers_1.Contract(o.asset, [
            "function nonces(uint256) view returns (uint256)",
            "function name() view returns (string)",
            "function version() view returns (string)",
            "function VERSION() view returns (string)",
        ], provider);
        return Object.assign(Object.assign({}, o), { nonce: yield contract.nonces(o.tokenId), name: yield contract.name(), version: yield getVersion(contract) });
    });
}
exports.fetchData = fetchData;
function getPermitStructure(asset) {
    return [
        {
            name: "spender",
            type: "address",
        },
        {
            name: "tokenId",
            type: "uint256",
        },
        {
            name: "nonce",
            type: "uint256",
        },
        {
            name: "deadline",
            type: "uint256",
        },
    ];
}
exports.getPermitStructure = getPermitStructure;
function toChainId(network) {
    switch (network) {
        case "MATIC":
            return 137;
        case "ETHEREUM":
            return 1;
        case "AVALANCHE":
            return 43114;
        case "ARBITRUM":
            return 42161;
        case "OPTIMISM":
            return 10;
        default:
            return 1;
    }
}
exports.toChainId = toChainId;
function toNetwork(asset) {
    return "ETHEREUM";
    /*
    const address = getAddress(asset);
    return (Object.entries({}).find(([network, assets]) => {
      if (Object.values(assets).find((asset) => getAddress(asset) === address))
        return network;
    }) || [null])[0];
   */
}
exports.toNetwork = toNetwork;
function getDomain(o) {
    const asset = o.asset;
    const address = (0, ethers_1.getAddress)(asset);
    const chainId = toChainId(toNetwork(address));
    return {
        name: o.name,
        version: o.version || "1",
        chainId: String(chainId),
        verifyingContract: address,
    };
}
exports.getDomain = getDomain;
function toEIP712(o) {
    return {
        types: {
            EIP712Domain: getDomainStructure(o.asset),
            Permit: getPermitStructure(o.asset),
        },
        primaryType: "Permit",
        domain: getDomain(o),
        message: getMessage(o),
    };
}
exports.toEIP712 = toEIP712;
function splitSignature(data) {
    const signature = ethers_1.Signature.from(data);
    return {
        v: Number(signature.v),
        r: (0, ethers_1.hexlify)(signature.r),
        s: (0, ethers_1.hexlify)(signature.s),
    };
}
exports.splitSignature = splitSignature;
function joinSignature(data) {
    const signature = ethers_1.Signature.from(data);
    return signature.serialized;
}
exports.joinSignature = joinSignature;
function signAndMergeERC721(o, signer) {
    return __awaiter(this, void 0, void 0, function* () {
        const signature = yield signERC721Permit(o, signer);
        return Object.assign(Object.assign({}, o), signature);
    });
}
exports.signAndMergeERC721 = signAndMergeERC721;
function signTypedData(signer, ...payload) {
    return __awaiter(this, void 0, void 0, function* () {
        if (signer.signTypedData)
            return yield signer.signTypedData(...payload);
        else
            return yield signer._signTypedData(...payload);
    });
}
exports.signTypedData = signTypedData;
function signERC721Permit(o, signer) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!o.nonce || !o.name)
            o = yield fetchData(o, signer);
        try {
            const payload = toEIP712(o);
            delete payload.types.EIP712Domain;
            const sig = yield signTypedData(signer, payload.domain, payload.types, payload.message);
            return splitSignature(joinSignature(splitSignature(sig)));
        }
        catch (e) {
            console.error(e);
            return splitSignature(yield signer.provider.send("eth_signTypedData_v4", [
                yield signer.getAddress(),
                toEIP712(o),
            ]));
        }
    });
}
exports.signERC721Permit = signERC721Permit;
const coercePredicate = (v) => typeof v === "number"
    ? Buffer.from((0, ethers_1.toBeArray)((0, ethers_1.getUint)(v)))
    : Buffer.from((0, ethers_1.toBeArray)((0, ethers_1.hexlify)(String(v))));
function encode(request) {
    if (request.v) {
        return protocol_1.protocol.PermitData.encode({
            permit1Data: (0, lodash_1.mapValues)({ v: request.v, r: request.r, s: request.s, expiry: request.expiry }, coercePredicate),
        }).finish();
    }
    else {
        return protocol_1.protocol.PermitData.encode({
            permit2Data: (0, lodash_1.mapValues)({
                deadline: request.signatureTransfer.deadline,
                nonce: request.signatureTransfer.nonce,
                signature: request.signature,
            }, coercePredicate),
        }).finish();
    }
}
exports.encode = encode;
function decode(data) {
    const decoded = protocol_1.protocol.PermitData.toObject(protocol_1.protocol.PermitData.decode(data), {
        enums: String,
        longs: String,
        bytes: String,
        defaults: true,
        arrays: true,
        objects: true,
        oneofs: true,
    });
    const permitData = (0, lodash_1.mapValues)(decoded[decoded.data], (v) => (0, ethers_1.hexlify)((0, ethers_1.decodeBase64)(v)));
    if (permitData.v) {
        return {
            expiry: Number(permitData.expiry),
            v: Number(permitData.v),
            r: (0, ethers_1.zeroPadValue)(permitData.r, 32),
            s: (0, ethers_1.zeroPadValue)(permitData.s, 32),
        };
    }
    else {
        return {
            signatureTransfer: {
                nonce: permitData.nonce,
                deadline: Number(permitData.deadline),
            },
            signature: permitData.signature,
        };
    }
}
exports.decode = decode;
//# sourceMappingURL=erc721-permit.js.map