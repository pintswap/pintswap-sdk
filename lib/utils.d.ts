import { Signer } from "ethers";
export declare const VERSION = "1.0.0";
export declare function fromPassword(signer: Signer, password: string): Promise<void>;
export declare const PREFIX = "pint";
export declare function toPintSwapAddress(bufferOrB58: any): string;
export declare function fromPintSwapAddress(pintAddress: any): any;
