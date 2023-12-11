import { AbiCoder } from "ethers"
import { ITokenProps } from "./types";
import Discord from "discord.js"
import { ethers, getBigInt } from "ethers"
import {
    isAddress,
    getAddress,
    Contract,
    ZeroAddress,
} from 'ethers';
import { EmbedBuilder } from "@discordjs/builders";
import { createLogger } from "./logger";

const TOKENS: ITokenProps[] = require('./token-list.json').tokens;
const logger = createLogger("pintswap")


const mockTx = "0x018fef1145ff8e1f7303daf116074859f20bacfe0037d6c05fac57d004bc78fd"
const mockTx2 = "0x01aa19f45b9cefd4d034c58643de05dcb76e40d83f8f52a10d9cb5c4b00f8560"
const mockTx3 = "0x00e52e973b1d88f890e42b97613825be7306d875c649e7ed0517bbcc28e35ceb"
const mockTx4 = "0x00dd461ffdfb18ef20b9d6bd60546012eb335d895a55f807811463f153ebfa0a"
const mockTx5 = "0x006e024f12a7dd19cfac29b1cec633f774771b2a9b7981fb0ed706d5fd228607"

const webhookURLPint = "https://discord.com/api/webhooks/1181335403949719703/jCFvWLrvGsxXoedNdXNMpV9FdbIYPhN0qywEXh7DtlgZv-qgUEArVWNlpHUH_4mTn8XF"


const wc = new Discord.WebhookClient({ id: "1181335403949719703", token: 'jCFvWLrvGsxXoedNdXNMpV9FdbIYPhN0qywEXh7DtlgZv-qgUEArVWNlpHUH_4mTn8XF' })
// const provider = new ethers.JsonRpcProvider("https://mainnet.infura.io/v3/1950016fe1754b30865ca70e99ad10d4")


export const WALLET_CONNECT_ID = process.env.REACT_APP_WALLETCONNECT_PROJECT_ID || '78ccad0d08b9ec965f59df86cc3e6a3c';
export const LLAMA_NODES_KEY = process.env.PROCESS_APP_LLAMA_NODES_KEY || '01HDHGP0YXWDYKRT37QQBDGST5';
export const ALCHEMY_KEY = process.env.REACT_APP_ALCHEMY_KEY || 'vwnSKKEvi4HqnhPObIph_5GENWoaMb8a';
export const INFURA_PROJECT_ID = process.env.REACT_APP_INFURA_KEY || '';
export const DEFAULT_CHAINID = 1;

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
]

export const symbolCache: Record<number, Record<string, string>> = {
    1: {},
    42161: {},
    10: {},
    137: {},
    8453: {},
};

export const reverseSymbolCache: Record<number, Record<string, string>> = {
    1: {},
    42161: {},
    10: {},
    137: {},
    8453: {},
};

export const decimalsCache: Record<number, Record<string, number>> = {
    1: {},
    42161: {},
    10: {},
    137: {},
    8453: {},
};

export const getTokenList = (chainId?: number) => TOKENS.filter((el) => el.chainId === (chainId ? chainId : null));

export function providerFromChainId(chainId: number | string) {
    switch (Number(chainId)) {
        case 1:
            // return new ethers.JsonRpcProvider(`https://eth.llamarpc.com/rpc/${LLAMA_NODES_KEY}`);
            return new ethers.AlchemyProvider('mainnet', ALCHEMY_KEY);
        case 137:
            return new ethers.InfuraProvider('polygon', INFURA_PROJECT_ID);
        case 42161:
            return new ethers.InfuraProvider('arbitrum', INFURA_PROJECT_ID);
        case 43114:
            return new ethers.JsonRpcProvider('https://api.avax.network/ext/bc/C/rpc');
        case 10:
            return new ethers.JsonRpcProvider('https://mainnet.optimism.io');
        case 8453:
            return new ethers.JsonRpcProvider('https://base-mainnet.public.blastapi.io');
        default:
            return new ethers.InfuraProvider('mainnet', INFURA_PROJECT_ID);
    }
}

export async function getDecimals(token: string, chainId: number): Promise<number> {
    if (!token || !chainId) return 18;
    const provider = providerFromChainId(chainId);
    if (isAddress(token)) {
        const address = getAddress(token);
        if (address === ZeroAddress) return 18;
        const match = getTokenList(chainId).find((v) => getAddress(v?.address) === address);
        if (match) return match?.decimals || 18;
        else if (decimalsCache[chainId][address]) {
            return decimalsCache[chainId][address] || 18;
        } else {
            try {
                const contract = new Contract(
                    address,
                    ['function decimals() view returns (uint8)'],
                    provider,
                );
                const decimals = Number((await contract?.decimals()) || '18');
                decimalsCache[chainId][address] = decimals;
                return decimals || 18;
            } catch (err) {
                try {
                    if (decimalsCache[1][address]) return decimalsCache[1][address];
                    const mainnetTry = await new Contract(
                        address,
                        ['function decimals() view returns (uint8)'],
                        providerFromChainId(1),
                    ).decimals();
                    if (mainnetTry) decimalsCache[1][address] = Number(mainnetTry);
                    return mainnetTry || 18;
                } catch (err) {
                    return 18;
                }
            }
        }
    } else {
        const found = getTokenList(chainId).find(
            (el) => el.symbol.toLowerCase() === (token as string).toLowerCase(),
        );
        return found?.decimals || 18;
    }
}

export async function getSymbol(address: string, chainId: number) {
    if (!address || !chainId || !isAddress(address)) return address || '';
    address = getAddress(address);
    if (address === ZeroAddress) return 'ETH';
    if (symbolCache[chainId][address]) return symbolCache[chainId][address];
    const provider = providerFromChainId(chainId);
    const match = getTokenList(chainId).find((v) => getAddress(v.address) === address);
    if (match) return match.symbol;
    else {
        const contract = new Contract(
            address,
            ['function symbol() view returns (string)'],
            provider,
        );
        try {
            const symbol = await contract?.symbol();
            symbolCache[chainId][address] = symbol;
            if (!reverseSymbolCache[chainId][symbol]) reverseSymbolCache[chainId][symbol] = address;
        } catch (e) {
            try {
                if (symbolCache[1][address]) return symbolCache[1][address];
                const mainnetTry = await new Contract(
                    address,
                    ['function symbol() view returns (string)'],
                    providerFromChainId(1),
                )?.symbol();
                if (mainnetTry) symbolCache[1][address] = mainnetTry;
                return mainnetTry;
            } catch (err) {
                return address;
            }
        }
        return symbolCache[chainId][address];
    }
}

const getLogos = (tokens, chainId) => {
    const tokenList = getTokenList(chainId)

    const URLs = []
    tokenList.filter((element) => {
        if (element.symbol === tokens.transfer1.symbol) {
            URLs.push(element.logoURI)
        }
    })
    tokenList.filter((element) => {
        if (element.symbol === tokens.transfer2.symbol) {
            URLs.push(element.logoURI)
        }
    })

    return URLs

}


const getTokensFromTxHash = async (txHash, provider, chainId) => {
    const receipt = await provider.getTransactionReceipt(txHash)
    console.error(txHash)
    const { logs } = await provider.getTransactionReceipt(txHash)


    const events = []
    //loop through logs of transaction hash
    for (const log of logs) {
        try {
            // listen to Transaction Events
            if (log.topics[0] === ethers.id("Transfer(address,address,uint256)")) {
                // build contract from 
                const tokenContract = new ethers.Contract(log.address, abi, provider);
                const name = await tokenContract.name()
                const decimals = await getDecimals(log.address, chainId);
                const symbol = await tokenContract.symbol()


                let amount;
                log.data ? amount = ethers.formatUnits(log.data, decimals) : amount = 0
                let transfer = {
                    type: 'Transfer',
                    name: name,
                    symbol: symbol,
                    tokenAddress: log.address,
                    fromAddress: `0x${log.topics[1].slice(26)}`,
                    toAddress: `0x${log.topics[2].slice(26)}`,
                    decimals: decimals,
                    amount: amount
                }
                events.push(transfer)
            }
            //listens for Swap events
            if (log.topics[0] === ethers.id("Swap(address,uint256,uint256,uint256,uint256)")) {
                const tokenContract = new ethers.Contract(log.address, abi, provider);
                const name = await tokenContract.name()
                const decimals = await getDecimals(log.address, chainId);
                const symbol = await tokenContract.symbol()
                let amount;
                log.data ? amount = ethers.formatUnits(log.address, decimals) : amount = 0
                let swap = {
                    type: 'swap',
                    name: name,
                    symbol: 'symbol',
                    tokenAddress: log.address,
                    fromAddress: `0x${log.topics[1].slice(26)}`,
                    toAddress: `0x${log.topics[2].slice(26)}`,
                    decimals: decimals,
                    amount: amount
                }
            }
        } catch (error) {
            console.error('Error decoding log:');
        }

    }


    if (events.length >= 2) {
        return { transfer1: events[0], transfer2: events[1] }
    } else if (events.length <= 1) {
        return { transfer1: events[0], transfer2: "single event" }
    }
}

const buildEmbedder = async (tokens, chainId) => {
    const date = new Date().toUTCString()

    const embed = new Discord.EmbedBuilder()
        .setTitle(`Transaction Complete!`)
        .setColor(10181046)
        .setThumbnail("https://i.pinimg.com/originals/14/9d/d4/149dd4d7532e300c773bb91d6cb38b1d.jpg")
        .setTimestamp(Date.now())
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

        })
    return embed
}

export const webhookRun = async function (txHash, chainId) {
    try {
        const provider = providerFromChainId(chainId)
        const tokens = await getTokensFromTxHash(txHash, provider, chainId)
        const embed = await buildEmbedder(tokens, chainId)
        await wc.send({
            content: ``,
            embeds: [embed]
        })
    } catch (e) {
        console.error(e)
    }
}

webhookRun(mockTx, 1)