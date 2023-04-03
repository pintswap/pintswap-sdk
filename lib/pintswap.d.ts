import { PintP2P } from "./p2p";
import { ethers } from "ethers";
import { IOffer } from "./types";
export declare class Pintswap extends PintP2P {
    signer: any;
    offers: Map<string, IOffer>;
    static initialize({ signer }: {
        signer: any;
    }): Promise<unknown>;
    constructor({ signer, peerId }: {
        signer: any;
        peerId: any;
    });
    startNode(): Promise<void>;
    stopNode(): Promise<void>;
    ln(v: any): any;
    handleBroadcastedOffers(): Promise<void>;
    broadcastOffer(_offer: IOffer): void;
    getTradesByPeerId(peerId: string): Promise<any>;
    getTradeAddress(sharedAddress: string): Promise<string>;
    approveTradeAsMaker(offer: IOffer, sharedAddress: string): Promise<any>;
    approveTradeAsTaker(offer: IOffer, sharedAddress: string): Promise<any>;
    createTransaction(offer: IOffer, maker: string, sharedAddress: string): Promise<ethers.Transaction & {
        data: any;
        chainId: any;
        gasPrice: any;
        gasLimit: any;
        nonce: any;
        value: number | bigint;
    }>;
    createTrade(peer: any, offer: any): Promise<boolean>;
}
