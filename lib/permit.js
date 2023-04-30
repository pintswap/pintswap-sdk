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
exports.decode = exports.encode = exports.signPermit = exports.signTypedData = exports.sign = exports.joinSignature = exports.splitSignature = exports.toEIP712 = exports.getDomain = exports.getVersion = exports.toNetwork = exports.toChainId = exports.getPermitStructure = exports.isUSDC = exports.fetchData = exports.getDomainStructure = exports.getMessage = exports.ASSETS = void 0;
const ethers_1 = require("ethers");
const protocol_1 = require("./protocol");
const lodash_1 = require("lodash");
exports.ASSETS = {
    MATIC: {
        USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    },
    ARBITRUM: {
        USDC: "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
    },
    ETHEREUM: {
        USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    },
    AVALANCHE: {
        USDC: "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
    },
    OPTIMISM: {
        USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
    },
};
function getMessage(request) {
    const address = (0, ethers_1.getAddress)(request.asset);
    const chainId = toChainId(toNetwork(address));
    return {
        owner: request.owner,
        spender: request.spender,
        nonce: request.nonce,
        deadline: request.expiry,
        value: request.value,
    };
}
exports.getMessage = getMessage;
function getDomainStructure(asset) {
    return (0, ethers_1.getAddress)(asset) === (0, ethers_1.getAddress)(exports.ASSETS.MATIC.USDC)
        ? [
            {
                name: "name",
                type: "string",
            },
            {
                name: "version",
                type: "string",
            },
            {
                name: "verifyingContract",
                type: "address",
            },
            {
                name: "salt",
                type: "bytes32",
            },
        ]
        : [
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
function fetchData(o, provider) {
    return __awaiter(this, void 0, void 0, function* () {
        const contract = new ethers_1.Contract(o.asset, [
            "function nonces(address) view returns (uint256)",
            "function name() view returns (string)",
            "function version() view returns (string)",
            "function VERSION() view returns (string)"
        ], provider);
        return Object.assign(Object.assign({}, o), { nonce: yield contract.nonces(o.owner), name: yield contract.name(), version: yield getVersion(contract) });
    });
}
exports.fetchData = fetchData;
function isUSDC(asset) {
    return Object.values(exports.ASSETS)
        .map((v) => (0, ethers_1.getAddress)(v.USDC))
        .includes((0, ethers_1.getAddress)(asset));
}
exports.isUSDC = isUSDC;
function getPermitStructure(asset) {
    return [
        {
            name: "owner",
            type: "address",
        },
        {
            name: "spender",
            type: "address",
        },
        {
            name: "value",
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
    const address = (0, ethers_1.getAddress)(asset);
    return (Object.entries(exports.ASSETS).find(([network, assets]) => {
        if (Object.values(assets).find((asset) => (0, ethers_1.getAddress)(asset) === address))
            return network;
    }) || [null])[0];
}
exports.toNetwork = toNetwork;
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
function getDomain(o) {
    const asset = o.asset;
    const address = (0, ethers_1.getAddress)(asset);
    const chainId = toChainId(toNetwork(address));
    if (isUSDC(address)) {
        if (chainId === 137) {
            return {
                name: "USD Coin (PoS)",
                version: "1",
                verifyingContract: address,
                salt: (0, ethers_1.zeroPadValue)((0, ethers_1.hexlify)(String(chainId) || "1"), 32),
            };
        }
        if (chainId === 42161) {
            return {
                name: "USD Coin (Arb1)",
                version: "1",
                chainId: String(chainId),
                verifyingContract: address,
            };
        }
        return {
            name: "USD Coin",
            version: chainId === 43114 ? "1" : "2",
            chainId: String(chainId),
            verifyingContract: address,
        };
    }
    return {
        name: o.name,
        version: o.version,
        chainId: String(chainId),
        verifyingContract: address
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
function sign(o, signer) {
    return __awaiter(this, void 0, void 0, function* () {
        const signature = yield signPermit(o, signer);
        return Object.assign(Object.assign({}, o), signature);
    });
}
exports.sign = sign;
function signTypedData(signer, ...payload) {
    return __awaiter(this, void 0, void 0, function* () {
        if (signer.signTypedData)
            return yield signer.signTypedData(...payload);
        else
            return yield signer._signTypedData(...payload);
    });
}
exports.signTypedData = signTypedData;
function signPermit(o, signer) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!o.nonce || !o.name || !o.version)
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
exports.signPermit = signPermit;
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
//# sourceMappingURL=permit.js.map