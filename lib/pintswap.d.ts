/// <reference types="node" />
import { PintP2P } from "./p2p";
import { EventEmitter } from "events";
import { defer } from "./trade";
import { IOffer } from "./types";
import { createLogger } from "./logger";
export declare class PintswapTrade extends EventEmitter {
    _deferred: ReturnType<typeof defer>;
    constructor();
    toPromise(): Promise<unknown>;
    resolve(v?: any): void;
    reject(err: any): void;
}
export declare class Pintswap extends PintP2P {
    signer: any;
    offers: Map<string, IOffer>;
    logger: ReturnType<typeof createLogger>;
    _awaitReceipts: boolean;
    static initialize({ awaitReceipts, signer }: {
        awaitReceipts: any;
        signer: any;
    }): Promise<Pintswap>;
    constructor({ awaitReceipts, signer, peerId }: {
        awaitReceipts: any;
        signer: any;
        peerId: any;
    });
    startNode(): Promise<void>;
    stopNode(): Promise<void>;
    handleBroadcastedOffers(): Promise<void>;
    broadcastOffer(_offer: IOffer): void;
    getTradesByPeerId(peerId: string): Promise<any>;
    getTradeAddress(sharedAddress: string): Promise<string>;
    approveTradeAsMaker(offer: IOffer, sharedAddress: string): Promise<any>;
    approvePermit2(asset: string): Promise<any>;
    approveTradeAsTaker(offer: IOffer, sharedAddress: string): Promise<any>;
    prepareTransaction(offer: IOffer, maker: string, sharedAddress: string, permitData: any): Promise<{
        data: any;
        gasPrice: any;
        gasLimit: any;
        payCoinbaseAmount: string;
    }>;
    createTransaction(txParams: any, sharedAddress: string): Promise<any>;
    createTrade(peer: any, offer: any): PintswapTrade;
}
