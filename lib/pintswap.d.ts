/// <reference types="node" />
/// <reference types="node" />
import { PintP2P } from "./p2p";
import { BigNumberish } from "ethers";
import { EventEmitter } from "events";
import { defer } from "./trade";
import { IOffer } from "./types";
import PeerId from "peer-id";
import { createLogger } from "./logger";
export declare function sendFlashbotsTransaction(data: any): Promise<any>;
export declare class PintswapTrade extends EventEmitter {
    hashes: null | string[];
    _deferred: ReturnType<typeof defer>;
    constructor();
    toPromise(): Promise<unknown>;
    resolve(v?: any): void;
    reject(err: any): void;
}
export declare function encodeBatchFill(o: any): any;
export declare function decodeBatchFill(data: any): any;
export declare function scaleOffer(offer: IOffer, amount: BigNumberish): {
    gives: {
        token: string;
        amount: string;
    };
    gets: {
        token: string;
        amount: string;
    };
};
export declare function toBigIntFromBytes(b: any): bigint;
export declare function sumOffers(offers: any[]): any;
export declare const NS_MULTIADDRS: {
    DRIP: string[];
};
export interface IUserData {
    bio: string;
    image: Buffer;
}
export declare class Pintswap extends PintP2P {
    signer: any;
    offers: Map<string, IOffer>;
    logger: ReturnType<typeof createLogger>;
    peers: Map<string, [string, IOffer]>;
    userData: IUserData;
    _awaitReceipts: boolean;
    static initialize({ awaitReceipts, signer }: {
        awaitReceipts: any;
        signer: any;
    }): Promise<Pintswap>;
    resolveName(name: any): Promise<string>;
    registerName(name: any): Promise<unknown>;
    constructor({ awaitReceipts, signer, peerId, userData, offers }: any);
    setBio(s: string): void;
    setImage(b: Buffer): void;
    publishOffers(): Promise<void>;
    startPublishingOffers(ms: number): {
        setInterval(_ms: any): void;
        stop(): void;
    };
    subscribeOffers(): Promise<void>;
    startNode(): Promise<void>;
    stopNode(): Promise<void>;
    toObject(): {
        peerId: PeerId.JSONPeerId;
        userData: {
            bio: string;
            image: string;
        };
        offers: IOffer[];
    };
    static fromObject(o: any, signer: any): Promise<Pintswap>;
    _encodeOffers(): any;
    _encodeUserData(): any;
    handleUserData(): Promise<void>;
    handleBroadcastedOffers(): Promise<void>;
    broadcastOffer(_offer: IOffer): void;
    getUserDataByPeerId(peerId: string): Promise<{
        offers: any;
        image: Buffer;
        bio: any;
    }>;
    getTradesByPeerId(peerId: string): Promise<any>;
    _decodeOffers(data: Buffer): any;
    _decodeUserData(data: Buffer): {
        offers: any;
        image: Buffer;
        bio: any;
    };
    getTradeAddress(sharedAddress: string): Promise<string>;
    approveTradeAsMaker(offer: IOffer, sharedAddress: string): Promise<any>;
    approvePermit2(asset: string): Promise<any>;
    approveTradeAsTaker(offer: IOffer, sharedAddress: string): Promise<any>;
    prepareTransaction(offer: IOffer, maker: string, sharedAddress: string, permitData: any): Promise<({
        maxPriorityFeePerGas: bigint;
        maxFeePerGas: bigint;
        gasPrice?: undefined;
    } | {
        gasPrice: any;
        maxPriorityFeePerGas?: undefined;
        maxFeePerGas?: undefined;
    }) & {
        data: any;
        gasLimit: any;
        payCoinbaseAmount: string;
    }>;
    createTransaction(txParams: any, sharedAddress: string): Promise<any>;
    createTrade(peer: any, offer: any): PintswapTrade;
    createBatchTrade(peer: any, batchFill: any): PintswapTrade;
}
