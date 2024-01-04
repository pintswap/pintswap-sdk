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
const trade_1 = require("./trade");
const DISCORD = {
    base: "https://discord.com/api/webhooks",
    completed: {
        id: "1183967206099406868",
        token: "efEL9MmBSwgJpNn6RTn6ConApddLQUAGaels3IrXtr5hxG3OQVRSHKEyKtuObZFgVd9n",
    },
    new: {
        id: "1184276440062107781",
        token: "M0sqgaU0jOFyteIh6SKTLHTk9F2SMKPtWwPnRImrz0pZRQrhcInMP3fH80kO2ekncYbD",
    },
    ian: {
        id: "1181339596647301171",
        token: "rYNmPeF4GTMpB-pIFjqd9pH-Nt1-hi3iHykNF2FWI8wJqRxIVgRq84dONz2ly6sYKP9Q",
    },
};
const TELEGRAM = {
    base: "https://api.telegram.org",
    offersToken: "bot6551006929:AAGG7R8nPIMIwMK8o7-nKZ6oIwCm3wVnuJo",
    transactionToken: "bot6518633027:AAEs0h9cQ7IBDqEXdT6PPXnLJmuNjzvIKhg",
    psChat_id: "-1002121825306",
    ianChat_id: "-4031773943",
};
const POST_REQ_OPTIONS = {
    method: "POST",
    headers: {
        "Content-type": "application/json; charset=UTF-8",
    },
};
const getTokensFromTxHash = (txHash, provider, chainId) => __awaiter(void 0, void 0, void 0, function* () {
    if (!provider)
        provider = (0, chains_1.providerFromChainId)(chainId);
    const receipt = yield provider.getTransactionReceipt(txHash);
    const events = [];
    if (receipt) {
        const logs = receipt.logs;
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
                        : (amount = "0");
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
                        : (amount = "0");
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
                    events.push(swap);
                }
            }
            catch (error) {
                console.error("Error decoding log:");
            }
        }
    }
    if (events.length >= 2) {
        return { transfer1: events[0], transfer2: events[1] };
    }
    else if (events.length <= 1) {
        return { transfer1: events[0], transfer2: events[0] };
    }
});
const calculateDiscount = (offer, chainId) => __awaiter(void 0, void 0, void 0, function* () {
    const { gets, gives } = yield (0, utils_1.displayOffer)(offer, chainId, "symbol");
    const eth = yield (0, utils_1.getEthPrice)();
    const getsUSD = yield (0, utils_1.getUsdPrice)(gets.token, eth);
    const givesUSD = yield (0, utils_1.getUsdPrice)(gives.token, eth);
    const getsPrice = Number(gets.amount) * getsUSD;
    const givesPrice = Number(gives.amount) * givesUSD;
    const discount = givesPrice - getsPrice;
    const percentage = (discount / givesPrice) * 100;
    const response = Number(percentage.toFixed(2));
    return response;
});
const buildFulfillMarkdownLink = (offer, peer, chainId = 1, telegram) => {
    const baseLink = "https://app.pintswap.exchange";
    if (offer && peer && !telegram) {
        return `[Take offer in Web App](${baseLink}/#/fulfill/${(0, utils_1.maybeConvertName)(peer)}/${(0, trade_1.hashOffer)(offer)}/${chainId})`;
    }
    if (offer && peer && telegram) {
        return `${baseLink}/#/fulfill/${(0, utils_1.maybeConvertName)(peer)}/${(0, trade_1.hashOffer)(offer)}/${chainId})`;
    }
    return `[Go to Web App](${baseLink})`;
};
const buildTeleMessage = function ({ gives, gets, tokens, discount, chainId, }) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const chain = `${(_a = (0, chains_1.networkFromChainId)(chainId)) === null || _a === void 0 ? void 0 : _a.name}`;
        if (gives && gets) {
            const givesAmt = Number(gives.amount).toFixed(3);
            const getsAmt = Number(gets.amount).toFixed(3);
            return `<b>New Offer</b> 
👀 👀 👀 👀 
<i>${new Date().toUTCString().split(", ")[1]}</i>
<b>Chain:</b> ${chain} \n
<b>Give:</b> ${getsAmt} ${gets.token}
<b>Get:</b> ${givesAmt} ${gives.token}
${discount >= 3 ? `<b>Discount:</b> ${discount}%` : ""}`;
        }
        if (tokens) {
            return `<b> 💯 Transaction Complete 💯 </b> \n 
<b>${tokens.transfer1.name}: </b><i>${tokens.transfer1.amount}</i> 
<i>--></i>
<b>${tokens.transfer2.name}: </b><i>${tokens.transfer2.amount}</i>
<u>Chain</u> 
<i>${chain}</i> \n
<b>${new Date().toUTCString()}</b>`;
        }
    });
};
const webhookRun = function ({ txHash, chainId, offer, peer, }) {
    var _a, _b, _c;
    return __awaiter(this, void 0, void 0, function* () {
        if (txHash) {
            try {
                const provider = (0, chains_1.providerFromChainId)(chainId);
                const tokens = yield getTokensFromTxHash(txHash, provider, chainId);
                // Telegram Post
                // const teleMessage = await buildTeleMessage({
                //   tokens,
                //   chainId,
                // });
                // const tgPost = fetch(
                //   `${TELEGRAM.base}/${TELEGRAM.transactionToken}/sendMessage`,
                //   {
                //     method: "POST",
                //     headers: {
                //       "Content-Type": "application/json",
                //     },
                //     body: JSON.stringify({
                //       chat_id: TELEGRAM.psChat_id,
                //       text: teleMessage,
                //       parse_mode: "html",
                //       reply_markup: JSON.stringify({
                //         inline_keyboard: [
                //           [
                //             {
                //               text: "View in Explorer",
                //               url: `${networkFromChainId(chainId)?.explorer}tx/${txHash}`,
                //             },
                //           ],
                //         ],
                //       }),
                //     }),
                //   }
                // );
                // Discord Post
                const discordPost = fetch(`${DISCORD.base}/${DISCORD.completed.id}/${DISCORD.completed.token}`, Object.assign(Object.assign({}, POST_REQ_OPTIONS), { body: JSON.stringify({
                        content: "",
                        embeds: [
                            {
                                title: "💯 Transaction Complete 💯",
                                color: 10181046,
                                fields: [
                                    {
                                        name: `${tokens === null || tokens === void 0 ? void 0 : tokens.transfer1.name}`,
                                        value: `${tokens === null || tokens === void 0 ? void 0 : tokens.transfer1.amount}`,
                                        inline: true,
                                    },
                                    {
                                        name: "",
                                        value: "<--->",
                                        inline: true,
                                    },
                                    {
                                        name: `${tokens === null || tokens === void 0 ? void 0 : tokens.transfer2.name}`,
                                        value: `${tokens === null || tokens === void 0 ? void 0 : tokens.transfer2.amount}`,
                                        inline: true,
                                    },
                                    {
                                        name: "Chain",
                                        value: `${(_a = (0, chains_1.networkFromChainId)(chainId)) === null || _a === void 0 ? void 0 : _a.name}`,
                                    },
                                    {
                                        name: "",
                                        value: `[View in Explorer](${(_b = (0, chains_1.networkFromChainId)(chainId)) === null || _b === void 0 ? void 0 : _b.explorer}tx/${txHash})`,
                                    },
                                ],
                                timestamp: new Date().toISOString(),
                            },
                        ],
                    }) }));
                yield Promise.all([discordPost]);
            }
            catch (e) {
                console.error(e);
            }
        }
        if (offer) {
            try {
                // const discount = await calculateDiscount(offer, chainId);
                // if (discount) {
                const { gives, gets } = yield (0, utils_1.displayOffer)(offer, chainId, "name");
                // Telegram Post
                const teleMessage = yield buildTeleMessage({
                    gives,
                    gets,
                    // discount: discount,
                    chainId,
                });
                const tgPost = fetch(`${TELEGRAM.base}/${TELEGRAM.offersToken}/sendMessage`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        chat_id: TELEGRAM.psChat_id,
                        text: teleMessage,
                        parse_mode: "html",
                        reply_markup: JSON.stringify({
                            inline_keyboard: [
                                [
                                    {
                                        text: "View offer in web app",
                                        url: buildFulfillMarkdownLink(offer, peer, chainId, true),
                                    },
                                ],
                            ],
                        }),
                    }),
                });
                // Discord Post
                const discordPost = fetch(`${DISCORD.base}/${DISCORD.new.id}/${DISCORD.new.token}`, Object.assign(Object.assign({}, POST_REQ_OPTIONS), { body: JSON.stringify({
                        content: "",
                        embeds: [
                            {
                                title: "👀 New Offer 👀",
                                color: 10181046,
                                fields: [
                                    {
                                        name: `${gives.token}`,
                                        value: `${gives.amount}`,
                                        inline: true,
                                    },
                                    {
                                        name: "",
                                        value: "--->",
                                        inline: true,
                                    },
                                    {
                                        name: `${gets.token}`,
                                        value: `${gets.amount}`,
                                        inline: true,
                                    },
                                    // {
                                    //   name: `${discount >= 3 ? "Discount" : ""}`,
                                    //   value: `${discount >= 3 ? `${discount}%` : ""}`,
                                    // },
                                    {
                                        name: "Chain",
                                        value: `${(_c = (0, chains_1.networkFromChainId)(chainId)) === null || _c === void 0 ? void 0 : _c.name}`,
                                    },
                                    {
                                        name: "",
                                        value: buildFulfillMarkdownLink(offer, peer, chainId),
                                    },
                                ],
                                timestamp: new Date().toISOString(),
                            },
                        ],
                    }) }));
                yield Promise.all([tgPost, discordPost]);
                // }
            }
            catch (e) {
                console.error(e);
            }
        }
    });
};
exports.webhookRun = webhookRun;
//# sourceMappingURL=webhook.js.map