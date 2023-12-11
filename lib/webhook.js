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
exports.webhookRun = void 0;
const ethers_1 = require("ethers");
const chains_1 = require("./chains");
const utils_1 = require("./utils");
const mockTx = "0x018fef1145ff8e1f7303daf116074859f20bacfe0037d6c05fac57d004bc78fd";
const mockTx2 = "0x01aa19f45b9cefd4d034c58643de05dcb76e40d83f8f52a10d9cb5c4b00f8560";
const mockTx3 = "0x00e52e973b1d88f890e42b97613825be7306d875c649e7ed0517bbcc28e35ceb";
const mockTx4 = "0x00dd461ffdfb18ef20b9d6bd60546012eb335d895a55f807811463f153ebfa0a";
const mockTx5 = "0x006e024f12a7dd19cfac29b1cec633f774771b2a9b7981fb0ed706d5fd228607";
const DISCORD = {
    id: "1181335403949719703",
    token: "jCFvWLrvGsxXoedNdXNMpV9FdbIYPhN0qywEXh7DtlgZv-qgUEArVWNlpHUH_4mTn8XF",
};
const getTokensFromTxHash = (txHash, provider, chainId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!provider)
        provider = (0, chains_1.providerFromChainId)(chainId);
    const { logs } = yield provider.getTransactionReceipt(txHash);
    const events = [];
    //loop through logs of transaction hash
    for (const log of logs) {
        try {
            // listen to Transaction Events
            if (log.topics[0] === ethers_1.ethers.id("Transfer(address,address,uint256)")) {
                // build contract from
                const name = yield (0, utils_1.getName)(log.address, chainId);
                const decimals = yield (0, utils_1.getDecimals)(log.address, chainId);
                const symbol = yield (0, utils_1.getSymbol)(log.address, chainId);
                let amount;
                log.data
                    ? (amount = ethers_1.ethers.formatUnits(log.data, decimals))
                    : (amount = 0);
                const transfer = {
                    type: "Transfer",
                    name: name,
                    symbol: symbol,
                    tokenAddress: log.address,
                    fromAddress: `0x${log.topics[1].slice(26)}`,
                    toAddress: `0x${log.topics[2].slice(26)}`,
                    decimals: decimals,
                    amount: amount,
                };
                events.push(transfer);
            }
            //listens for Swap events
            if (log.topics[0] ===
                ethers_1.ethers.id("Swap(address,uint256,uint256,uint256,uint256)")) {
                const name = yield (0, utils_1.getName)(log.address, chainId);
                const decimals = yield (0, utils_1.getDecimals)(log.address, chainId);
                let amount;
                log.data
                    ? (amount = ethers_1.ethers.formatUnits(log.address, decimals))
                    : (amount = 0);
                const swap = {
                    type: "swap",
                    name: name,
                    symbol: "symbol",
                    tokenAddress: log.address,
                    fromAddress: `0x${log.topics[1].slice(26)}`,
                    toAddress: `0x${log.topics[2].slice(26)}`,
                    decimals: decimals,
                    amount: amount,
                };
            }
        }
        catch (error) {
            console.error("Error decoding log:");
        }
    }
    if (events.length >= 2) {
        return { transfer1: events[0], transfer2: events[1] };
    }
    else if (events.length <= 1) {
        return { transfer1: events[0], transfer2: "single event" };
    }
});
const webhookRun = function (txHash, chainId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const provider = (0, chains_1.providerFromChainId)(chainId);
            const tokens = yield getTokensFromTxHash(txHash, provider, chainId);
            yield fetch(`https://discord.com/api/webhooks/${DISCORD.id}/${DISCORD.token}`, {
                method: "POST",
                body: JSON.stringify({
                    content: "Transaction Complete!",
                    embeds: [
                        {
                            timestamp: new Date().toISOString(),
                        },
                        {
                            name: `${tokens.transfer1.name}`,
                            value: `${tokens.transfer1.amount}`,
                        },
                        {
                            name: "Trade",
                            value: "<----->",
                        },
                        {
                            name: `${tokens.transfer2.name}`,
                            value: `${tokens.transfer2.amount}`,
                        },
                    ],
                }),
                headers: {
                    "Content-type": "application/json; charset=UTF-8",
                },
            });
        }
        catch (e) {
            console.error(e);
        }
    });
};
exports.webhookRun = webhookRun;
(0, exports.webhookRun)(mockTx, 1);
//# sourceMappingURL=webhook.js.map