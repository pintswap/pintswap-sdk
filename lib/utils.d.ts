import { Signer } from "ethers";
export declare const VERSION = "1.0.0";
export declare function fromPassword(signer: Signer, password: string): Promise<void>;
