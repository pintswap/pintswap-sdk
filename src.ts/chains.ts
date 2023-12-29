import { ethers } from "ethers";
import WETH9 from "canonical-weth/build/contracts/WETH9.json";

const INFURA_API_KEY = "1efb74c6a48c478298a1b2d68ad4532d";
const ALCHEMY_API_KEY = "Qoz0g86Uhc_xLj7P-etwSTLNPSXJmdi4";
const LLAMA_NODES_KEY = "01HDHHCK8PVCH6BEYYCR6HX6AD";

export const WETH_ADDRESSES = Object.assign(
  Object.entries(WETH9.networks).reduce((r, [chainId, { address }]: any) => {
    r[chainId] = address;
    return r;
  }, {}),
  {
    "42161": "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", // ARB
    "137": "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619", // MATIC
    "10": "0x4200000000000000000000000000000000000006", // OP
    "43112": "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB", // AVAX
    "324": "0x8Ebe4A94740515945ad826238Fc4D56c6B8b0e60", // zkSync
    "42220": "0x122013fd7dF1C6F636a5bb8f03108E876548b455", // CELO
    "43114": "0xb31f66aa3c1e785363f0875a1b74e27b85fd66c7", // AVAX --> WAVAX
    "8453": "0x4200000000000000000000000000000000000006", // BASE
    "56": "0x4DB5a66E937A9F4473fA95b1cAF1d1E1D62E29EA", // BNB
  }
);

export const NETWORKS = [
  {
    name: "Ethereum",
    explorer: "https://etherscan.io/",
    chainId: 1,
    provider: new ethers.JsonRpcProvider("https://rpc.doublecup.dev"),
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
    provider: new ethers.InfuraProvider("arbitrum", INFURA_API_KEY),
  },
  {
    name: "Avalanche",
    explorer: "https://subnets.avax.network/c-chain/",
    chainId: 43114,
    provider: new ethers.JsonRpcProvider(
      `https://avalanche-mainnet.infura.io/v3/${INFURA_API_KEY}`
    ),
  },
  {
    name: "Base",
    provider: new ethers.JsonRpcProvider(
      `https://base-mainnet.infura.io/v3/${INFURA_API_KEY}`
    ),
    chainId: 8453,
    explorer: "https://basescan.org/",
  },
  {
    name: "Optimism",
    explorer: "https://optimistic.etherscan.io/",
    chainId: 10,
    provider: new ethers.InfuraProvider("optimism", INFURA_API_KEY),
  },
  {
    name: "Polygon",
    explorer: "https://polygonscan.com/",
    chainId: 137,
    provider: new ethers.InfuraProvider("matic", INFURA_API_KEY),
  },
  {
    name: "Celo",
    explorer: "https://explorer.celo.org/mainnet/",
    chainId: 42220,
    provider: new ethers.JsonRpcProvider("https://forno.celo.org"),
  },
  {
    name: "Binance Smart Chain",
    explorer: "https://bscscan.com/",
    chainId: 56,
    provider: new ethers.JsonRpcProvider(
      `https://bnbsmartchain-mainnet.infura.io/v3/${INFURA_API_KEY}`
    ),
  },
];

export const providerFromChainId = (chainId = 1) =>
  NETWORKS.find((p) => p.chainId === chainId).provider;

export const networkFromChainId = (chainId = 1) =>
  NETWORKS.find((p) => p.chainId === chainId);

export async function tokenExists(provider, address) {
  const contract = new ethers.Contract(
    address,
    [
      "function name() view returns (string)",
      "function symbol() view returns (string)",
    ],
    provider
  );
  if ((await provider.getCode(address)) === "0x") return false;
  try {
    await contract.symbol();
  } catch (e) {
    return false;
  }
  return true;
}

export async function detectTradeNetwork(trade: any) {
  const [gets, gives] = ["gets", "gives"].map((v) => trade[v].token);
  for (const { provider, chainId } of NETWORKS) {
    if (gets !== ethers.ZeroAddress) {
      if (!(await tokenExists(provider, gets))) continue;
    }
    if (gives !== ethers.ZeroAddress) {
      if (!(await tokenExists(provider, gives))) continue;
    }
    return chainId;
  }
  return 0;
}

export async function detectTokenNetwork(address: string) {
  if (address === ethers.ZeroAddress) return 1;
  for (const { provider, chainId } of NETWORKS) {
    if (await tokenExists(provider, address)) return chainId;
  }
  return 0;
}
