import { IOffer } from "./types";
import { BigNumberish, Signer } from "ethers";
export declare function toBigInt(v: any): any;
export declare function keyshareToAddress(keyshareJsonObject: any): string;
export declare const hashOffer: (o: any) => string;
export declare function leftZeroPad(s: any, n: any): string;
export declare const genericAbi: string[];
export declare const defer: () => {
    resolve: any;
    reject: any;
    promise: Promise<unknown>;
};
export declare const transactionToObject: (tx: any) => {
    nonce: any;
    value: any;
    from: any;
    gasPrice: any;
    gasLimit: any;
    chainId: any;
    data: any;
    maxFeePerGas: any;
    maxPriorityFeePerGas: any;
};
export declare const WETH_ADDRESSES: {
    "42161": string;
    "137": string;
    "10": string;
    "43112": string;
};
export declare const setFallbackWETH: (address: any) => void;
export declare const coerceToWeth: (address: any, signer: any) => Promise<any>;
export declare const toWETH: (chainId?: number | string) => any;
export declare const wrapEth: (signer: Signer, amount: BigNumberish) => Promise<boolean>;
export declare const createContract: (offer: IOffer, maker: string, taker: string, chainId?: string | number, permitData?: any) => any;
