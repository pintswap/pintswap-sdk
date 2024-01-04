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
exports.percentChange = exports.getUsdPrice = exports.toAddress = exports.getEthPrice = exports.ENDPOINTS = exports.displayOffer = exports.getName = exports.getSymbol = exports.getDecimals = exports.maybeFromName = exports.maybeConvertName = exports.MIN_ABI = exports.getTokenListBySymbol = exports.getTokenList = exports.TOKENS = void 0;
const ethers_1 = require("ethers");
const lodash_1 = require("lodash");
const chains_1 = require("./chains");
const p2p_1 = require("./p2p");
// CONSTANTS
exports.TOKENS = require("./token-list.json").tokens;
const getTokenList = (chainId) => exports.TOKENS.filter((el) => el.chainId === (chainId ? chainId : null));
exports.getTokenList = getTokenList;
const getTokenListBySymbol = (chainId) => (0, lodash_1.keyBy)((0, exports.getTokenList)(chainId), "symbol");
exports.getTokenListBySymbol = getTokenListBySymbol;
exports.MIN_ABI = {
    ERC20: [
        "function name() view returns (string)",
        "function symbol() view returns (string)",
        "function balanceOf(address) view returns (uint)",
        "function transfer(address _to, uint256 _value) public returns (bool success)",
        "event Transfer(address indexed src, address indexed dst, uint val)",
        "function decimals() public view returns (uint8)",
        "function totalSupply() public view returns (uint256)",
        "function transfer(address _to, uint256 _value) public returns (bool success)",
        "function transferFrom(address _from, address _to, uint256 _value) public returns (bool success)",
        "function approve(address _spender, uint256 _value) public returns (bool success)",
        "function allowance(address _owner, address _spender) public view returns (uint256 remaining)",
    ],
};
// PintP2P
const maybeConvertName = (s) => {
    if (s.indexOf(".") !== -1 ||
        s.substr(0, p2p_1.PintP2P.PREFIX.length) === p2p_1.PintP2P.PREFIX)
        return s;
    return p2p_1.PintP2P.toAddress(s);
};
exports.maybeConvertName = maybeConvertName;
const maybeFromName = (s) => {
    if (s.substr(0, p2p_1.PintP2P.PREFIX.length) === p2p_1.PintP2P.PREFIX)
        return p2p_1.PintP2P.fromAddress(s);
    return s;
};
exports.maybeFromName = maybeFromName;
// HELPERS
function getDecimals(token, chainId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!token || !chainId)
            return 18;
        const provider = (0, chains_1.providerFromChainId)(chainId);
        if ((0, ethers_1.isAddress)(token)) {
            const address = (0, ethers_1.getAddress)(token);
            if (address === ethers_1.ZeroAddress)
                return 18;
            const match = (0, exports.getTokenList)(chainId).find((v) => (0, ethers_1.getAddress)(v.address) === address);
            if (match === null || match === void 0 ? void 0 : match.decimals)
                return match.decimals;
            else {
                try {
                    const contract = new ethers_1.Contract(address, ["function decimals() view returns (uint8)"], provider);
                    const decimals = Number((yield (contract === null || contract === void 0 ? void 0 : contract.decimals())) || "18");
                    return decimals || 18;
                }
                catch (err) {
                    console.error("#getDecimals", err);
                    return 18;
                }
            }
        }
        const found = (0, exports.getTokenList)(chainId).find((el) => el.symbol.toLowerCase() === token.toLowerCase());
        return (found === null || found === void 0 ? void 0 : found.decimals) || 18;
    });
}
exports.getDecimals = getDecimals;
function getSymbol(address, chainId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!address || !chainId || !(0, ethers_1.isAddress)(address))
            return address || "";
        address = (0, ethers_1.getAddress)(address);
        if (address === ethers_1.ZeroAddress) {
            if (chainId === 43114)
                return "AVAX";
            return "ETH";
        }
        const match = (0, exports.getTokenList)(chainId).find((v) => (0, ethers_1.getAddress)(v.address) === address);
        if (match === null || match === void 0 ? void 0 : match.symbol)
            return match.symbol;
        const provider = (0, chains_1.providerFromChainId)(chainId);
        try {
            const contract = new ethers_1.Contract(address, ["function symbol() view returns (string)"], provider);
            const symbol = yield (contract === null || contract === void 0 ? void 0 : contract.symbol());
            return symbol;
        }
        catch (e) {
            console.error("#getSymbol", e);
            return address;
        }
    });
}
exports.getSymbol = getSymbol;
function getName(address, chainId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!address || !chainId || !(0, ethers_1.isAddress)(address))
            return address || "";
        address = (0, ethers_1.getAddress)(address);
        if (address === ethers_1.ZeroAddress) {
            if (chainId === 43114)
                return "Avalanche";
            return "Ethereum";
        }
        const match = (0, exports.getTokenList)(chainId).find((v) => (0, ethers_1.getAddress)(v.address) === address);
        if (match === null || match === void 0 ? void 0 : match.name)
            return match.name;
        const provider = (0, chains_1.providerFromChainId)(chainId);
        try {
            const contract = new ethers_1.Contract(address, ["function name() view returns (string)"], provider);
            const name = yield (contract === null || contract === void 0 ? void 0 : contract.name());
            return name;
        }
        catch (e) {
            console.error("#getName", e);
            return address;
        }
    });
}
exports.getName = getName;
const displayOffer = ({ gets, gives }, chainId = 1, type = "symbol") => __awaiter(void 0, void 0, void 0, function* () {
    try {
        /**
         * TODO
         * check if the offer contains an NFT by checking for a tokenId in the offer
         * if there is a token Id, change the webhook post request to state that it is an NFT offer
         */
        const [givesSymbol, getsSymbol, givesDecimals, getsDecimals] = yield Promise.all([
            type === "name"
                ? getName(gives.token, chainId)
                : getSymbol(gives.token, chainId),
            type === "name"
                ? getName(gets.token, chainId)
                : getSymbol(gets.token, chainId),
            getDecimals(gives.token, chainId),
            getDecimals(gets.token, chainId),
        ]);
        return {
            gives: {
                token: givesSymbol || gives.token,
                amount: (0, ethers_1.formatUnits)(gives.amount, givesDecimals) || "N/A",
            },
            gets: {
                token: getsSymbol || gets.token,
                amount: (0, ethers_1.formatUnits)(gets.amount, getsDecimals) || "N/A",
            },
        };
    }
    catch (err) {
        console.error(err);
        return {
            gives: {
                token: gives.token,
                amount: gives.amount,
            },
            gets: {
                token: gets.token,
                amount: gets.amount,
            },
        };
    }
});
exports.displayOffer = displayOffer;
const JSON_HEADER_POST = {
    method: "POST",
    headers: { "Content-Type": "application/json" },
};
exports.ENDPOINTS = {
    uniswap: {
        v2: "https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v2-dev",
        // v2Fallback: `https://gateway-arbitrum.network.thegraph.com/api/${SUBGRAPH_API_KEY}/subgraphs/id/J2oP9UNBjsnuDDW1fAoHKskyrNLFNBB2badQU6UvEtJp`,
        v3: "https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3",
        arb: "https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-arbitrum-one",
        // avax: `https://gateway-arbitrum.network.thegraph.com/api/${SUBGRAPH_API_KEY}/subgraphs/id/4KgG6aek9cEp8MXQZKWCmeJWj5Y77mK9tPRAD1kDQa8Q`,
    },
    pintswap: {
        eth: "https://api.thegraph.com/subgraphs/name/pintswap/token-transfers-eth",
        arb: "https://api.thegraph.com/subgraphs/name/pintswap/token-transfers-arb",
        avax: "https://api.thegraph.com/subgraphs/name/pintswap/token-transfers-avax",
        opt: "https://api.thegraph.com/subgraphs/name/pintswap/token-transfers-opt",
    },
};
function getEthPrice() {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield fetch("https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3", Object.assign(Object.assign({}, JSON_HEADER_POST), { body: JSON.stringify({
                query: `{
        bundles {
          ethPriceUSD
        }
      }`,
            }) }));
        const { data: { bundles }, } = yield response.json();
        return bundles[0].ethPriceUSD;
    });
}
exports.getEthPrice = getEthPrice;
function toAddress(symbolOrAddress, chainId = 1) {
    // If nothing
    if (!symbolOrAddress)
        return "";
    // If address
    if ((0, ethers_1.isAddress)(symbolOrAddress)) {
        if (symbolOrAddress === ethers_1.ZeroAddress)
            return ethers_1.ZeroAddress;
        return (0, ethers_1.getAddress)(symbolOrAddress);
    }
    // Standardize if symbol
    const capSymbolOrAddress = symbolOrAddress.toUpperCase();
    if (capSymbolOrAddress === "ETH" || capSymbolOrAddress === "AVAX")
        return ethers_1.ZeroAddress;
    // If in cache
    // If in list
    const token = (0, exports.getTokenListBySymbol)(chainId)[capSymbolOrAddress];
    if (token)
        return (0, ethers_1.getAddress)(token.address);
    // else return nothing
    return "";
}
exports.toAddress = toAddress;
const getUsdPrice = (asset, eth, setState) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const address = !(0, ethers_1.isAddress)(asset) ? toAddress(asset) : (0, ethers_1.getAddress)(asset);
    if (address) {
        const _eth = yield getEthPrice();
        if (address === ethers_1.ZeroAddress) {
            setState && setState(_eth);
            return _eth;
        }
        else {
            try {
                const data = yield fetch(`https://api.dexscreener.com/latest/dex/tokens/${address}`);
                const json = yield data.json();
                if (data.status === 200 && ((_a = json === null || json === void 0 ? void 0 : json.pairs) === null || _a === void 0 ? void 0 : _a.length)) {
                    const usdPrice = json.pairs[0].priceUsd;
                    setState && setState(usdPrice);
                    return usdPrice;
                }
                else {
                    console.log("cant fetch data");
                }
            }
            catch (err) {
                console.log("#getUsdPrice: dexscreener", err);
            }
        }
    }
});
exports.getUsdPrice = getUsdPrice;
const percentChange = (oldVal, newVal, times100) => {
    if (!oldVal || !newVal)
        return "";
    const diff = (Number(oldVal) - Number(newVal)) / Number(newVal);
    if (times100)
        return (diff * 100).toFixed(2);
    return diff.toString();
};
exports.percentChange = percentChange;
//# sourceMappingURL=utils.js.map