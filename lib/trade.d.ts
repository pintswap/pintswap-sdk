import { IOffer } from "./types";
export declare function toBigInt(v: any): any;
export declare function keyshareToAddress(keyshareJsonObject: any): string;
export declare const WETH_ADDRESSES: {
    '42161': string;
    '137': string;
    '10': string;
    '43112': string;
};
export declare const toWETH: (chainId?: number | string) => any;
export declare const hashOffer: (o: any) => string;
export declare const createContract: (offer: IOffer, maker: string, taker: string, chainId?: string | number) => any;
export declare function leftZeroPad(s: any, n: any): string;
