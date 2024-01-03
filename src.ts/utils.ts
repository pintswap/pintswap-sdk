import {
  Contract,
  ZeroAddress,
  formatUnits,
  getAddress,
  isAddress,
} from "ethers";
import { providerFromChainId } from "./chains";
import { IOffer, ITokenProps } from "./types";

// CONSTANTS
export const TOKENS: ITokenProps[] = require("./token-list.json").tokens;
export const getTokenList = (chainId?: number) =>
  TOKENS.filter((el) => el.chainId === (chainId ? chainId : null));

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
  if (address === ZeroAddress) {
    if (chainId === 43114) return "AVAX";
    return "ETH";
  }
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
  if (address === ZeroAddress) {
    if (chainId === 43114) return "Avalanche";
    return "Ethereum";
  }
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
    console.error("#getName", e);
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
