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
exports.webhookRun = exports.getSymbol = exports.getDecimals = exports.providerFromChainId = exports.getTokenList = exports.decimalsCache = exports.reverseSymbolCache = exports.symbolCache = exports.DEFAULT_CHAINID = exports.INFURA_PROJECT_ID = exports.ALCHEMY_KEY = exports.LLAMA_NODES_KEY = exports.WALLET_CONNECT_ID = void 0;
const discord_js_1 = __importDefault(require("discord.js"));
const ethers_1 = require("ethers");
const ethers_2 = require("ethers");
const mockTx = "0x018fef1145ff8e1f7303daf116074859f20bacfe0037d6c05fac57d004bc78fd";
const mockTx2 = "0x01aa19f45b9cefd4d034c58643de05dcb76e40d83f8f52a10d9cb5c4b00f8560";
const mockTx3 = "0x00e52e973b1d88f890e42b97613825be7306d875c649e7ed0517bbcc28e35ceb";
const mockTx4 = "0x00dd461ffdfb18ef20b9d6bd60546012eb335d895a55f807811463f153ebfa0a";
const mockTx5 = "0x006e024f12a7dd19cfac29b1cec633f774771b2a9b7981fb0ed706d5fd228607";
const webhookURLPint = "https://discord.com/api/webhooks/1181335403949719703/jCFvWLrvGsxXoedNdXNMpV9FdbIYPhN0qywEXh7DtlgZv-qgUEArVWNlpHUH_4mTn8XF";
const webhookURLIan = "https://discord.com/api/webhooks/1181339596647301171/rYNmPeF4GTMpB-pIFjqd9pH-Nt1-hi3iHykNF2FWI8wJqRxIVgRq84dONz2ly6sYKP9Q";
const wc = new discord_js_1.default.WebhookClient({ id: "1181339596647301171", token: 'rYNmPeF4GTMpB-pIFjqd9pH-Nt1-hi3iHykNF2FWI8wJqRxIVgRq84dONz2ly6sYKP9Q' });
// const provider = new ethers.JsonRpcProvider("https://mainnet.infura.io/v3/1950016fe1754b30865ca70e99ad10d4")
const TOKENS = require('./token-list.json').tokens;
exports.WALLET_CONNECT_ID = process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || '78ccad0d08b9ec965f59df86cc3e6a3c';
exports.LLAMA_NODES_KEY = process.env.PROCESS_APP_LLAMA_NODES_KEY || '01HDHGP0YXWDYKRT37QQBDGST5';
exports.ALCHEMY_KEY = process.env.REACT_APP_ALCHEMY_KEY || 'vwnSKKEvi4HqnhPObIph_5GENWoaMb8a';
exports.INFURA_PROJECT_ID = process.env.REACT_APP_INFURA_KEY || '';
exports.DEFAULT_CHAINID = 1;
const abi = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function balanceOf(address) view returns (uint)",
    "function transfer(address _to, uint256 _value) public returns (bool success)",
    "event Transfer(address indexed src, address indexed dst, uint val)",
    "function decimals() public view returns (uint8)",
    "function totalSupply() public view returns (uint256)",
    "function transfer(address _to, uint256 _value) public returns (bool success)",
    'function transferFrom(address _from, address _to, uint256 _value) public returns (bool success)',
    'function approve(address _spender, uint256 _value) public returns (bool success)',
    'function allowance(address _owner, address _spender) public view returns (uint256 remaining)',
];
exports.symbolCache = {
    1: {},
    42161: {},
    10: {},
    137: {},
    8453: {},
};
exports.reverseSymbolCache = {
    1: {},
    42161: {},
    10: {},
    137: {},
    8453: {},
};
exports.decimalsCache = {
    1: {},
    42161: {},
    10: {},
    137: {},
    8453: {},
};
const getTokenList = (chainId) => TOKENS.filter((el) => el.chainId === (chainId ? chainId : null));
exports.getTokenList = getTokenList;
function providerFromChainId(chainId) {
    switch (Number(chainId)) {
        case 1:
            // return new ethers.JsonRpcProvider(`https://eth.llamarpc.com/rpc/${LLAMA_NODES_KEY}`);
            return new ethers_1.ethers.AlchemyProvider('mainnet', exports.ALCHEMY_KEY);
        case 137:
            return new ethers_1.ethers.InfuraProvider('polygon', exports.INFURA_PROJECT_ID);
        case 42161:
            return new ethers_1.ethers.InfuraProvider('arbitrum', exports.INFURA_PROJECT_ID);
        case 43114:
            return new ethers_1.ethers.JsonRpcProvider('https://api.avax.network/ext/bc/C/rpc');
        case 10:
            return new ethers_1.ethers.JsonRpcProvider('https://mainnet.optimism.io');
        case 8453:
            return new ethers_1.ethers.JsonRpcProvider('https://base-mainnet.public.blastapi.io');
        default:
            return new ethers_1.ethers.InfuraProvider('mainnet', exports.INFURA_PROJECT_ID);
    }
}
exports.providerFromChainId = providerFromChainId;
function getDecimals(token, chainId) {
    return __awaiter(this, void 0, void 0, function* () {
        if (!token || !chainId)
            return 18;
        const provider = providerFromChainId(chainId);
        if ((0, ethers_2.isAddress)(token)) {
            const address = (0, ethers_2.getAddress)(token);
            if (address === ethers_2.ZeroAddress)
                return 18;
            const match = (0, exports.getTokenList)(chainId).find((v) => (0, ethers_2.getAddress)(v === null || v === void 0 ? void 0 : v.address) === address);
            if (match)
                return (match === null || match === void 0 ? void 0 : match.decimals) || 18;
            else if (exports.decimalsCache[chainId][address]) {
                return exports.decimalsCache[chainId][address] || 18;
            }
            else {
                try {
                    const contract = new ethers_2.Contract(address, ['function decimals() view returns (uint8)'], provider);
                    const decimals = Number((yield (contract === null || contract === void 0 ? void 0 : contract.decimals())) || '18');
                    exports.decimalsCache[chainId][address] = decimals;
                    return decimals || 18;
                }
                catch (err) {
                    try {
                        if (exports.decimalsCache[1][address])
                            return exports.decimalsCache[1][address];
                        const mainnetTry = yield new ethers_2.Contract(address, ['function decimals() view returns (uint8)'], providerFromChainId(1)).decimals();
                        if (mainnetTry)
                            exports.decimalsCache[1][address] = Number(mainnetTry);
                        return mainnetTry || 18;
                    }
                    catch (err) {
                        return 18;
                    }
                }
            }
        }
        else {
            const found = (0, exports.getTokenList)(chainId).find((el) => el.symbol.toLowerCase() === token.toLowerCase());
            return (found === null || found === void 0 ? void 0 : found.decimals) || 18;
        }
    });
}
exports.getDecimals = getDecimals;
function getSymbol(address, chainId) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        if (!address || !chainId || !(0, ethers_2.isAddress)(address))
            return address || '';
        address = (0, ethers_2.getAddress)(address);
        if (address === ethers_2.ZeroAddress)
            return 'ETH';
        if (exports.symbolCache[chainId][address])
            return exports.symbolCache[chainId][address];
        const provider = providerFromChainId(chainId);
        const match = (0, exports.getTokenList)(chainId).find((v) => (0, ethers_2.getAddress)(v.address) === address);
        if (match)
            return match.symbol;
        else {
            const contract = new ethers_2.Contract(address, ['function symbol() view returns (string)'], provider);
            try {
                const symbol = yield (contract === null || contract === void 0 ? void 0 : contract.symbol());
                exports.symbolCache[chainId][address] = symbol;
                if (!exports.reverseSymbolCache[chainId][symbol])
                    exports.reverseSymbolCache[chainId][symbol] = address;
            }
            catch (e) {
                try {
                    if (exports.symbolCache[1][address])
                        return exports.symbolCache[1][address];
                    const mainnetTry = yield ((_a = new ethers_2.Contract(address, ['function symbol() view returns (string)'], providerFromChainId(1))) === null || _a === void 0 ? void 0 : _a.symbol());
                    if (mainnetTry)
                        exports.symbolCache[1][address] = mainnetTry;
                    return mainnetTry;
                }
                catch (err) {
                    return address;
                }
            }
            return exports.symbolCache[chainId][address];
        }
    });
}
exports.getSymbol = getSymbol;
const getLogos = (tokens, chainId) => {
    const tokenList = (0, exports.getTokenList)(chainId);
    const URLs = [];
    tokenList.filter((element) => {
        if (element.symbol === tokens.transfer1.symbol) {
            URLs.push(element.logoURI);
        }
    });
    tokenList.filter((element) => {
        if (element.symbol === tokens.transfer2.symbol) {
            URLs.push(element.logoURI);
        }
    });
    return URLs;
};
const getTokensFromTxHash = (txHash, provider, chainId) => __awaiter(void 0, void 0, void 0, function* () {
    const receipt = yield provider.getTransactionReceipt(txHash);
    const { logs } = yield provider.getTransactionReceipt(txHash);
    const events = [];
    //loop through logs of transaction hash
    for (const log of logs) {
        try {
            // listen to Transaction Events
            if (log.topics[0] === ethers_1.ethers.id("Transfer(address,address,uint256)")) {
                // build contract from 
                const tokenContract = new ethers_1.ethers.Contract(log.address, abi, provider);
                const name = yield tokenContract.name();
                const decimals = yield getDecimals(log.address, chainId);
                const symbol = yield tokenContract.symbol();
                let amount;
                log.data ? amount = ethers_1.ethers.formatUnits(log.data, decimals) : amount = 0;
                let transfer = {
                    type: 'Transfer',
                    name: name,
                    symbol: symbol,
                    tokenAddress: log.address,
                    fromAddress: `0x${log.topics[1].slice(26)}`,
                    toAddress: `0x${log.topics[2].slice(26)}`,
                    decimals: decimals,
                    amount: amount
                };
                events.push(transfer);
            }
            //listens for Swap events
            if (log.topics[0] === ethers_1.ethers.id("Swap(address,uint256,uint256,uint256,uint256)")) {
                const tokenContract = new ethers_1.ethers.Contract(log.address, abi, provider);
                const name = yield tokenContract.name();
                const decimals = yield getDecimals(log.address, chainId);
                const symbol = yield tokenContract.symbol();
                let amount;
                log.data ? amount = ethers_1.ethers.formatUnits(log.address, decimals) : amount = 0;
                let swap = {
                    type: 'swap',
                    name: name,
                    symbol: 'symbol',
                    tokenAddress: log.address,
                    fromAddress: `0x${log.topics[1].slice(26)}`,
                    toAddress: `0x${log.topics[2].slice(26)}`,
                    decimals: decimals,
                    amount: amount
                };
            }
        }
        catch (error) {
            console.error('Error decoding log:');
        }
    }
    if (events.length >= 2) {
        return { transfer1: events[0], transfer2: events[1] };
    }
    else if (events.length <= 1) {
        return { transfer1: events[0], transfer2: "single event" };
    }
});
const buildEmbedder = (tokens, chainId) => __awaiter(void 0, void 0, void 0, function* () {
    const date = new Date().toUTCString();
    const logos = getLogos(tokens, chainId);
    console.log(logos);
    const embed1 = new discord_js_1.default.EmbedBuilder()
        .setTitle(`Transaction Complete!`)
        .setColor(10181046)
        .setThumbnail("https://pngset.com/images/lean-purple-spilled-drank-spilled-cup-of-lean-transparent-png-874771.png")
        .setTimestamp(Date.now())
        .setImage(logos[0])
        .setURL("https://pintswap.exchange/")
        .addFields([
        {
            name: `${tokens.transfer1.name}`,
            value: `${tokens.transfer1.amount}`,
            inline: true
        },
        {
            name: "Trade",
            value: "<----->",
            inline: true
        },
        {
            name: `${tokens.transfer2.name}`,
            value: `${tokens.transfer2.amount}`,
            inline: true
        }
    ])
        .setFooter({
        text: date,
    });
    const embed2 = new discord_js_1.default.EmbedBuilder().setURL("https://pintswap.exchange/").setImage(logos[1]);
    const embed = [embed1, embed2];
    return embed;
});
const webhookRun = function (txHash, chainId) {
    return __awaiter(this, void 0, void 0, function* () {
        const provider = providerFromChainId(chainId);
        const tokens = yield getTokensFromTxHash(txHash, provider, chainId);
        const embed = yield buildEmbedder(tokens, chainId);
        yield wc.send({
            content: ``,
            embeds: embed
        });
    });
};
exports.webhookRun = webhookRun;
(0, exports.webhookRun)(mockTx, 1);
(0, exports.webhookRun)(mockTx2, 1);
(0, exports.webhookRun)(mockTx3, 1);
(0, exports.webhookRun)(mockTx4, 1);
(0, exports.webhookRun)(mockTx5, 1);
//# sourceMappingURL=webhook.js.map