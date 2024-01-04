import { ethers } from "ethers";
export declare const WETH_ADDRESSES: {
    "42161": string;
    "137": string;
    "10": string;
    "324": string;
    "42220": string;
    "43114": string;
    "8453": string;
    "56": string;
};
export declare const NETWORKS: {
    name: string;
    explorer: string;
    chainId: number;
    provider: ethers.JsonRpcProvider;
}[];
export declare const providerFromChainId: (chainId?: number) => ethers.JsonRpcProvider;
export declare const networkFromChainId: (chainId?: number) => {
    name: string;
    explorer: string;
    chainId: number;
    provider: ethers.JsonRpcProvider;
};
export declare function tokenExists(provider: any, address: any): Promise<boolean>;
export declare function detectTradeNetwork(trade: any): Promise<number>;
export declare function detectTokenNetwork(address: string): Promise<number>;
