import { IOffer } from "./types";
export declare function toBigInt(v: any): any;
export declare function keyshareToAddress(keyshareJsonObject: any): string;
export declare const hashOffer: (o: any) => string;
export declare const createContract: (offer: IOffer, maker: string, taker: string) => any;
export declare function leftZeroPad(s: any, n: any): string;
