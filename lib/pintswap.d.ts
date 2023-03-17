import type { BigNumberish } from "@ethersproject/bignumber";
interface IOffer {
    givesToken: string;
    getsToken: string;
    givesAmount: BigNumberish;
    getsAmount: BigNumberish;
}
export declare const createContract: (offer: IOffer, maker: string, taker: string) => any;
export declare const hashOffer: (o: any) => string;
export {};
