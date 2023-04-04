import { PintP2P } from "./p2p";
import { IOffer } from "./types";
import { createLogger } from "./logger";
export declare class Pintswap extends PintP2P {
    signer: any;
    offers: Map<string, IOffer>;
    logger: ReturnType<typeof createLogger>;
    static initialize({ signer }: {
        signer: any;
    }): Promise<unknown>;
    constructor({ signer, peerId }: {
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
    approveTradeAsTaker(offer: IOffer, sharedAddress: string): Promise<any>;
    prepareTransaction(offer: IOffer, maker: string, sharedAddress: string): Promise<{
        data: any;
        gasPrice: any;
        gasLimit: any;
    }>;
    createTransaction(txParams: any, sharedAddress: string): Promise<any>;
    createTrade(peer: any, offer: any): Promise<boolean>;
}
