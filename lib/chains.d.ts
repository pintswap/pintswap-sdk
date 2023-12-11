import { ethers } from "ethers";
export declare const WETH_ADDRESSES: {
    "42161": string;
    "137": string;
    "10": string;
    "43112": string;
    "324": string;
    "42220": string;
};
export declare const NETWORKS: {
    name: string;
    chainId: number;
    provider: ethers.JsonRpcProvider;
}[];
export declare const providerFromChainId: (chainId?: number) => ethers.JsonRpcProvider;
export declare function tokenExists(provider: any, address: any): Promise<boolean>;
export declare function detectTradeNetwork(trade: any): Promise<number>;
export declare function detectTokenNetwork(address: string): Promise<number>;
