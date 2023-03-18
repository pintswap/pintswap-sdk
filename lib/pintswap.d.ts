import { ZeroP2P } from "@zerodao/p2p";
import type { BigNumberish } from "@ethersproject/bignumber";
import { Transaction } from "@ethersproject/transaction";
interface IOffer {
    givesToken: string;
    getsToken: string;
    givesAmount: BigNumberish;
    getsAmount: BigNumberish;
}
export declare const createContract: (offer: IOffer, maker: string, taker: string) => any;
export declare const hashOffer: (o: any) => string;
export declare class Pintswap extends ZeroP2P {
    signer: any;
    offers: IOffer[];
    getTradeAddress(sharedAddress: string): Promise<string>;
    approveTradeAsMaker(offer: IOffer, sharedAddress: string): Promise<any>;
    approveTradeAsTaker(offer: IOffer, sharedAddress: string): Promise<any>;
    createTransaction(offer: IOffer, maker: string, sharedAddress: string): Promise<Transaction & {
        data: any;
        gasPrice: any;
        gasLimit: any;
        nonce: any;
        value: any;
    }>;
    constructor({ signer, peerId }: {
        signer: any;
        peerId: any;
    });
    create_trade(peer: any): Promise<unknown>;
    static initialize({ signer }: {
        signer: any;
    }): Promise<Pintswap>;
}
export {};
