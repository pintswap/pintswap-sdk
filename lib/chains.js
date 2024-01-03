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
exports.detectTokenNetwork = exports.detectTradeNetwork = exports.tokenExists = exports.networkFromChainId = exports.providerFromChainId = exports.NETWORKS = exports.WETH_ADDRESSES = void 0;
const ethers_1 = require("ethers");
const WETH9_json_1 = __importDefault(require("canonical-weth/build/contracts/WETH9.json"));
const INFURA_API_KEY = "1efb74c6a48c478298a1b2d68ad4532d";
const ALCHEMY_API_KEY = "Qoz0g86Uhc_xLj7P-etwSTLNPSXJmdi4";
const LLAMA_NODES_KEY = "01HDHHCK8PVCH6BEYYCR6HX6AD";
exports.WETH_ADDRESSES = Object.assign(Object.entries(WETH9_json_1.default.networks).reduce((r, [chainId, { address }]) => {
    r[chainId] = address;
    return r;
}, {}), {
    "42161": "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    "137": "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    "10": "0x4200000000000000000000000000000000000006",
    "43112": "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
    "324": "0x8Ebe4A94740515945ad826238Fc4D56c6B8b0e60",
    "42220": "0x122013fd7dF1C6F636a5bb8f03108E876548b455",
    "43114": "0xB31f66AA3C1e785363F0875A1B74E27b85FD66c7",
    "8453": "0x4200000000000000000000000000000000000006",
    "56": "0x4DB5a66E937A9F4473fA95b1cAF1d1E1D62E29EA", // BNB
});
exports.NETWORKS = [
    {
        name: "Ethereum",
        explorer: "https://etherscan.io/",
        chainId: 1,
        provider: new ethers_1.ethers.JsonRpcProvider("https://rpc.doublecup.dev"),
        //provider: new ethers.InfuraProvider("mainnet", INFURA_API_KEY),
        // provider: new ethers.AlchemyProvider(
        //   'mainnet', 'Qoz0g86Uhc_xLj7P-etwSTLNPSXJmdi4'
        // )
        // provider: new ethers.JsonRpcProvider(
        //   `https://eth.llamarpc.com/rpc/${LLAMA_NODES_KEY}`
        // ),
    },
    {
        name: "Arbitrum",
        explorer: "https://arbiscan.io/",
        chainId: 42161,
        provider: new ethers_1.ethers.InfuraProvider("arbitrum", INFURA_API_KEY),
    },
    {
        name: "Avalanche",
        explorer: "https://subnets.avax.network/c-chain/",
        chainId: 43114,
        provider: new ethers_1.ethers.JsonRpcProvider(`https://avalanche-mainnet.infura.io/v3/${INFURA_API_KEY}`),
    },
    {
        name: "Base",
        provider: new ethers_1.ethers.JsonRpcProvider(`https://base-mainnet.infura.io/v3/${INFURA_API_KEY}`),
        chainId: 8453,
        explorer: "https://basescan.org/",
    },
    {
        name: "Optimism",
        explorer: "https://optimistic.etherscan.io/",
        chainId: 10,
        provider: new ethers_1.ethers.InfuraProvider("optimism", INFURA_API_KEY),
    },
    {
        name: "Polygon",
        explorer: "https://polygonscan.com/",
        chainId: 137,
        provider: new ethers_1.ethers.InfuraProvider("matic", INFURA_API_KEY),
    },
    {
        name: "Celo",
        explorer: "https://explorer.celo.org/mainnet/",
        chainId: 42220,
        provider: new ethers_1.ethers.JsonRpcProvider("https://forno.celo.org"),
    },
    {
        name: "Binance Smart Chain",
        explorer: "https://bscscan.com/",
        chainId: 56,
        provider: new ethers_1.ethers.JsonRpcProvider(`https://bnbsmartchain-mainnet.infura.io/v3/${INFURA_API_KEY}`),
    },
];
const providerFromChainId = (chainId = 1) => exports.NETWORKS.find((p) => p.chainId === chainId).provider;
exports.providerFromChainId = providerFromChainId;
const networkFromChainId = (chainId = 1) => exports.NETWORKS.find((p) => p.chainId === chainId);
exports.networkFromChainId = networkFromChainId;
function tokenExists(provider, address) {
    return __awaiter(this, void 0, void 0, function* () {
        const contract = new ethers_1.ethers.Contract(address, [
            "function name() view returns (string)",
            "function symbol() view returns (string)",
        ], provider);
        if ((yield provider.getCode(address)) === "0x")
            return false;
        try {
            yield contract.symbol();
        }
        catch (e) {
            return false;
        }
        return true;
    });
}
exports.tokenExists = tokenExists;
function detectTradeNetwork(trade) {
    return __awaiter(this, void 0, void 0, function* () {
        const [gets, gives] = ["gets", "gives"].map((v) => trade[v].token);
        for (const { provider, chainId } of exports.NETWORKS) {
            if (gets !== ethers_1.ethers.ZeroAddress) {
                if (!(yield tokenExists(provider, gets)))
                    continue;
            }
            if (gives !== ethers_1.ethers.ZeroAddress) {
                if (!(yield tokenExists(provider, gives)))
                    continue;
            }
            return chainId;
        }
        return 0;
    });
}
exports.detectTradeNetwork = detectTradeNetwork;
function detectTokenNetwork(address) {
    return __awaiter(this, void 0, void 0, function* () {
        if (address === ethers_1.ethers.ZeroAddress)
            return 1;
        for (const { provider, chainId } of exports.NETWORKS) {
            if (yield tokenExists(provider, address))
                return chainId;
        }
        return 0;
    });
}
exports.detectTokenNetwork = detectTokenNetwork;
//# sourceMappingURL=chains.js.map