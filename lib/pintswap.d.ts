/// <reference types="node" />
/// <reference types="node" />
import { PintP2P } from "./p2p";
import { BigNumberish } from "ethers";
import { EventEmitter } from "events";
import { defer } from "./trade";
import { IOffer, ITransfer } from "./types";
import PeerId from "peer-id";
import { createLogger } from "./logger";
export declare const protobufOffersToHex: (offers: any) => any;
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
export declare function scaleOffer(offer: IOffer, amount: BigNumberish): IOffer;
export declare function toBigIntFromBytes(b: any): bigint;
export declare function sumOffers(offers: any[]): any;
export declare const NS_MULTIADDRS: {
    DRIP: string[];
};
export interface NFTPFP {
    token: string;
    tokenId: string;
}
export interface IUserData {
    bio: string;
    image: Buffer | NFTPFP;
}
export declare class Pintswap extends PintP2P {
    signer: any;
    offers: Map<string, IOffer>;
    logger: ReturnType<typeof createLogger>;
    peers: Map<string, any>;
    userData: IUserData;
    _awaitReceipts: boolean;
    static initialize({ awaitReceipts, signer }: {
        awaitReceipts: any;
        signer: any;
    }): Promise<Pintswap>;
    dialPeer(...args: any[]): Promise<any>;
    resolveName(name: any): Promise<any>;
    registerName(name: any): Promise<unknown>;
    constructor({ awaitReceipts, signer, peerId, userData, offers }: any);
    setBio(s: string): void;
    setImage(b: Buffer | NFTPFP): void;
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
            image: string | NFTPFP;
        };
        offers: IOffer[];
    };
    static fromObject(o: any, signer: any): Promise<Pintswap>;
    _offersAsProtobufStruct(): {
        [k: string]: {
            [k: string]: any;
        };
    }[];
    _encodeMakerBroadcast(): any;
    _encodeOffers(): any;
    _encodeUserData(): any;
    handleUserData(): Promise<void>;
    handleBroadcastedOffers(): Promise<void>;
    broadcastOffer(_offer: IOffer, chainId?: number): void;
    findPeer(pintSwapAddress: string): Promise<{
        id: PeerId;
        multiaddrs: import("multiaddr").Multiaddr[];
    }>;
    getUserData(pintSwapAddress: string): Promise<{
        offers: any;
        image: Buffer | {
            token: string;
            tokenId: string;
        };
        bio: any;
    }>;
    getTrades(pintSwapAddress: string): Promise<any>;
    _decodeMakerBroadcast(data: Buffer): {
        offers: any;
        bio: any;
        pfp: {
            token: string;
            tokenId: string;
        };
    };
    _decodeOffers(data: Buffer): any;
    _decodeUserData(data: Buffer): {
        offers: any;
        image: Buffer | {
            token: string;
            tokenId: string;
        };
        bio: any;
    };
    getTradeAddress(sharedAddress: string): Promise<string>;
    approveTrade(transfer: ITransfer, sharedAddress: string): Promise<any>;
    approveTradeAsTaker(offer: IOffer, sharedAddress: string): Promise<any>;
    approveTradeAsMaker(offer: IOffer, sharedAddress: string): Promise<any>;
    approvePermit2(asset: string): Promise<any>;
    prepareTransaction(offer: IOffer, maker: string, sharedAddress: string, permitData: any): Promise<false | (({
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
    })>;
    createTransaction(txParams: any, sharedAddress: string): Promise<any>;
    createTrade(peer: any, offer: any): PintswapTrade;
    createBatchTrade(peer: string, batchFill: {
        offer: IOffer;
        amount: string;
        tokenId?: string;
    }[]): PintswapTrade;
}
