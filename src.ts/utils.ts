import {
  Contract,
  ZeroAddress,
  formatUnits,
  getAddress,
  isAddress,
} from "ethers";
import { keyBy } from 'lodash';
import { providerFromChainId } from "./chains";
import { IOffer, ITokenProps } from "./types";


// CONSTANTS
export const TOKENS: ITokenProps[] = require("./token-list.json").tokens;
export const getTokenList = (chainId?: number) =>
  TOKENS.filter((el) => el.chainId === (chainId ? chainId : null));
export const getTokenListBySymbol = (chainId?: number) => keyBy(getTokenList(chainId), 'symbol');
export const MIN_ABI = {
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

// HELPERS
export async function getDecimals(
  token: string,
  chainId: number
): Promise<number> {
  if (!token || !chainId) return 18;
  const provider = providerFromChainId(chainId);
  if (isAddress(token)) {
    const address = getAddress(token);
    if (address === ZeroAddress) return 18;
    const match = getTokenList(chainId).find(
      (v) => getAddress(v.address) === address
    );
    if (match?.decimals) return match.decimals;
    else {
      try {
        const contract = new Contract(
          address,
          ["function decimals() view returns (uint8)"],
          provider
        );
        const decimals = Number((await contract?.decimals()) || "18");
        return decimals || 18;
      } catch (err) {
        console.error("#getDecimals", err);
        return 18;
      }
    }
  }
  const found = getTokenList(chainId).find(
    (el) => el.symbol.toLowerCase() === (token as string).toLowerCase()
  );
  return found?.decimals || 18;
}

export async function getSymbol(
  address: string,
  chainId: number
): Promise<string> {
  if (!address || !chainId || !isAddress(address)) return address || "";
  address = getAddress(address);
  if (address === ZeroAddress) return "ETH";
  const match = getTokenList(chainId).find(
    (v) => getAddress(v.address) === address
  );
  if (match?.symbol) return match.symbol;
  const provider = providerFromChainId(chainId);
  try {
    const contract = new Contract(
      address,
      ["function symbol() view returns (string)"],
      provider
    );
    const symbol = await contract?.symbol();
    return symbol;
  } catch (e) {
    console.error("#getSymbol", e);
    return address;
  }
}

export async function getName(
  address: string,
  chainId: number
): Promise<string> {
  if (!address || !chainId || !isAddress(address)) return address || "";
  address = getAddress(address);
  if (address === ZeroAddress) return "Ethereum";
  const match = getTokenList(chainId).find(
    (v) => getAddress(v.address) === address
  );
  if (match?.name) return match.name;
  const provider = providerFromChainId(chainId);
  try {
    const contract = new Contract(
      address,
      ["function name() view returns (string)"],
      provider
    );
    const name = await contract?.name();
    return name;
  } catch (e) {
    console.error("#getSymbol", e);
    return address;
  }
}

export const displayOffer = async (
  { gets, gives }: IOffer,
  chainId = 1,
  type: "symbol" | "name" = "symbol"
) => {
  try {
    /**
     * TODO
     * check if the offer contains an NFT by checking for a tokenId in the offer
     * if there is a token Id, change the webhook post request to state that it is an NFT offer
     */
    const [givesSymbol, getsSymbol, givesDecimals, getsDecimals] =
      await Promise.all([
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
        amount: formatUnits(gives.amount, givesDecimals) || "N/A",
      },
      gets: {
        token: getsSymbol || gets.token,
        amount: formatUnits(gets.amount, getsDecimals) || "N/A",
      },
    };
  } catch (err) {
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
};
const JSON_HEADER_POST = { method: 'POST', headers: { 'Content-Type': 'application/json' } };

export const ENDPOINTS: Record<'uniswap' | 'pintswap', Record<string, string>> = {
  uniswap: {
    v2: 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-v2-dev',
    // v2Fallback: `https://gateway-arbitrum.network.thegraph.com/api/${SUBGRAPH_API_KEY}/subgraphs/id/J2oP9UNBjsnuDDW1fAoHKskyrNLFNBB2badQU6UvEtJp`,
    v3: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3',
    arb: 'https://api.thegraph.com/subgraphs/name/ianlapham/uniswap-arbitrum-one',
    // avax: `https://gateway-arbitrum.network.thegraph.com/api/${SUBGRAPH_API_KEY}/subgraphs/id/4KgG6aek9cEp8MXQZKWCmeJWj5Y77mK9tPRAD1kDQa8Q`,
  },
  pintswap: {
    eth: 'https://api.thegraph.com/subgraphs/name/pintswap/token-transfers-eth',
    arb: 'https://api.thegraph.com/subgraphs/name/pintswap/token-transfers-arb',
    avax: 'https://api.thegraph.com/subgraphs/name/pintswap/token-transfers-avax',
    opt: 'https://api.thegraph.com/subgraphs/name/pintswap/token-transfers-opt',
  },
};

export async function getEthPrice(): Promise<string> {
  const response = await fetch('https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3', {
    ...JSON_HEADER_POST,
    body: JSON.stringify({
      query: `{
        bundles {
          ethPriceUSD
        }
      }`,
    }),
  });
  const {
    data: { bundles },
  } = await response.json();
  return bundles[0].ethPriceUSD;
}

export function toAddress(symbolOrAddress?: string, chainId = 1): string {
  // If nothing
  if (!symbolOrAddress) return '';
  // If address
  if (isAddress(symbolOrAddress)) {
      if (symbolOrAddress === ZeroAddress) return ZeroAddress;
      return getAddress(symbolOrAddress);
  }
  // Standardize if symbol
  const capSymbolOrAddress = (symbolOrAddress as string).toUpperCase();
  if (capSymbolOrAddress === 'ETH' || capSymbolOrAddress === 'AVAX') return ZeroAddress;
  // If in cache
  // If in list
  const token = getTokenListBySymbol(chainId)[capSymbolOrAddress];
  if (token) return getAddress(token.address);
  // else return nothing
  return '';
}

export const getUsdPrice = async (asset: string, eth?: string, setState?: any) => {
  const address = !isAddress(asset) ? toAddress(asset) : getAddress(asset);
  if (address) {
    const _eth = await getEthPrice();
    if (address === ZeroAddress) {
      setState && setState(_eth);
      return _eth;
    } else {
      try {
        const data = await fetch(
          `https://api.dexscreener.com/latest/dex/tokens/${address}`,
        );
        const json = await data.json();
        if (data.status === 200 && json?.pairs?.length) {
          const usdPrice = json.pairs[0].priceUsd;
          setState && setState(usdPrice);
          return usdPrice;
        } else {
          console.log("cant fetch data")
        }
      } catch (err) {
        console.log('#getUsdPrice: dexscreener', err);
      }
    }
  }
};

export const percentChange = (
  oldVal?: string | number,
  newVal?: string | number,
  times100?: boolean,
) => {
  if (!oldVal || !newVal) return '';
  const diff = (Number(oldVal) - Number(newVal)) / Number(newVal);
  if (times100) return (diff * 100).toFixed(2);
  return diff.toString();
};

