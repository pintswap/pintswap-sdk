import { PintP2P } from "./p2p";
import { ethers } from "ethers";
interface IOffer {
    givesToken: string;
    getsToken: string;
    givesAmount: any;
    getsAmount: any;
}
export declare const createContract: (offer: IOffer, maker: string, taker: string) => any;
export declare const hashOffer: (o: any) => string;
export declare class Pintswap extends PintP2P {
    signer: any;
    offers: Map<string, IOffer>;
    static initialize({ signer }: {
        signer: any;
    }): Promise<Pintswap>;
    constructor({ signer, peerId }: {
        signer: any;
        peerId: any;
    });
    listNewOffer(_offer: IOffer): void;
    getTradeAddress(sharedAddress: string): Promise<string>;
    approveTradeAsMaker(offer: IOffer, sharedAddress: string): Promise<any>;
    approveTradeAsTaker(offer: IOffer, sharedAddress: string): Promise<any>;
    createTransaction(offer: IOffer, maker: string, sharedAddress: string): Promise<ethers.Transaction & {
        data: any;
        gasPrice: bigint;
        gasLimit: any;
        nonce: any;
        value: bigint;
    }>;
    createTrade(peer: any, offer: any): Promise<void>;
}
export {};
