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
exports.detectTokenNetwork = exports.detectTradeNetwork = exports.tokenExists = exports.NETWORKS = exports.WETH_ADDRESSES = void 0;
const ethers_1 = require("ethers");
const WETH9_json_1 = __importDefault(require("canonical-weth/build/contracts/WETH9.json"));
exports.WETH_ADDRESSES = Object.assign(Object.entries(WETH9_json_1.default.networks).reduce((r, [chainId, { address }]) => {
    r[chainId] = address;
    return r;
}, {}), {
    "42161": "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    "137": "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    "10": "0x4200000000000000000000000000000000000006",
    "43112": "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
    "324": "0x8Ebe4A94740515945ad826238Fc4D56c6B8b0e60",
    "42220": "0x122013fd7dF1C6F636a5bb8f03108E876548b455"
});
exports.NETWORKS = [{
        name: "Ethereum",
        chainId: 1,
        provider: new ethers_1.ethers.InfuraProvider("mainnet")
    }, {
        name: "Optimism",
        chainId: 10,
        provider: new ethers_1.ethers.InfuraProvider("optimism")
    }, {
        name: "Polygon",
        chainId: 137,
        provider: new ethers_1.ethers.InfuraProvider("matic")
    }, {
        name: "Arbitrum",
        chainId: 42161,
        provider: new ethers_1.ethers.InfuraProvider("arbitrum")
    }, {
        name: "Celo",
        chainId: 42220,
        provider: new ethers_1.ethers.JsonRpcProvider("https://forno.celo.org")
    }];
function tokenExists(provider, address) {
    return __awaiter(this, void 0, void 0, function* () {
        const contract = new ethers_1.ethers.Contract(address, ['function name() view returns (string)', 'function symbol() view returns (string)'], provider);
        if ((yield provider.getCode(address)) === '0x')
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
        const [gets, gives] = ['gets', 'gives'].map((v) => trade[v].token);
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