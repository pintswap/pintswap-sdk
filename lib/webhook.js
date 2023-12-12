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
const DISCORD = {
    id: "1183967206099406868",
    token: "efEL9MmBSwgJpNn6RTn6ConApddLQUAGaels3IrXtr5hxG3OQVRSHKEyKtuObZFgVd9n",
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
                    content: "",
                    embeds: [
                        {
                            title: "Transaction Complete!",
                            color: 10181046,
                            fields: [
                                {
                                    name: `${tokens.transfer1.name}`,
                                    value: `${tokens.transfer1.amount}`,
                                    inline: true,
                                },
                                {
                                    name: "",
                                    value: "<--->",
                                    inline: true,
                                },
                                {
                                    name: `${tokens.transfer2.name}`,
                                    value: `${tokens.transfer2.amount}`,
                                    inline: true,
                                },
                                {
                                    name: "",
                                    value: `[View in Explorer](${(0, chains_1.networkFromChainId)(chainId).explorer}tx/${txHash})`
                                }
                            ],
                            timestamp: new Date().toISOString(),
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
//# sourceMappingURL=webhook.js.map