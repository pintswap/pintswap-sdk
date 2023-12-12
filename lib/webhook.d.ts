import { IOffer } from "./types";
export declare const webhookRun: ({ txHash, chainId, offer, }: {
    offer?: IOffer;
    txHash?: string;
    chainId: number;
}) => Promise<void>;
