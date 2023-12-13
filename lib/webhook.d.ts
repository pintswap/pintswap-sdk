import { IOffer } from "./types";
export declare const webhookRun: ({ txHash, chainId, offer, peer, }: {
    offer?: IOffer;
    txHash?: string;
    chainId: number;
    peer?: string;
}) => Promise<void>;
