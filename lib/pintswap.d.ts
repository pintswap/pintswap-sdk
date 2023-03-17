import { ZeroP2P } from "@zerodao/p2p";
import { Signer } from "@ethersproject/abstract-signer";
import type { BytesLike } from "@ethersproject/bytes";
import type { BigNumberish } from "@ethersproject/bignumber";
interface IOffer {
    givesToken: BytesLike;
    getsToken: BytesLike;
    givesAmount: BigNumberish;
    getsAmount: BigNumberish;
}
export declare class Pintswap extends ZeroP2P {
    signer: Signer;
    offers: IOffer[];
    static initialize({ signer }: {
        signer: any;
    }): Promise<Pintswap>;
    constructor({ signer, peerId }: {
        signer: any;
        peerId: any;
    });
}
export {};
