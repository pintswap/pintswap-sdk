import PeerId from "peer-id";
import { VoidSigner } from "ethers";
import Libp2p from "libp2p";
export declare const VERSION = "1.0.0";
export declare function bufferToString(buf: Uint8Array): string;
export declare function stringToBuffer(text: string): Uint8Array;
export declare function fromBufferToJSON(buf: Uint8Array): any;
export declare function fromJSONtoBuffer(obj: any): Uint8Array;
export declare const cryptoFromSeed: (seed: any) => Promise<Uint8Array>;
export declare class PintP2P extends Libp2p {
    signer: VoidSigner;
    addressPromise: Promise<string>;
    static PRESETS: {
        MAINNET: string;
    };
    static fromPresetOrMultiAddr(multiaddr: any): any;
    static toMessage(password: any): string;
    static peerIdFromSeed(seed: any): Promise<PeerId>;
    static fromSeed({ signer, seed, multiaddr }: {
        signer: any;
        seed: any;
        multiaddr: any;
    }): Promise<PintP2P>;
    static fromPassword({ signer, multiaddr, password }: {
        signer: any;
        multiaddr: any;
        password: any;
    }): Promise<PintP2P>;
    static PREFIX: string;
    get address(): any;
    static toAddress(bufferOrB58: any): string;
    static fromAddress(address: any): any;
    start(): Promise<void>;
    setSigner(signer: any): void;
    constructor(options: any);
}
