import { IOffer } from "./types";
import { BigNumberish, ethers, Signer } from "ethers";
export declare const permit2Interface: ethers.Interface;
export declare const erc721PermitInterface: ethers.Interface;
export declare function toBigInt(v: any): any;
export declare function keyshareToAddress(keyshareJsonObject: any): string;
export declare const isERC20Transfer: (o: any) => boolean;
export declare const isERC721Transfer: (o: any) => boolean;
export declare const isERC1155Transfer: (o: any) => boolean;
export declare const expandNullHexValueToZero: (value: any) => any;
export declare const hashTransfer: (o: any) => string;
export declare const hashOffer: (o: any) => string;
export declare function leftZeroPad(s: any, n: any): string;
export declare const genericAbi: string[];
export declare const defer: () => {
    resolve: any;
    reject: any;
    promise: Promise<unknown>;
};
export declare const transactionToObject: (tx: any) => {
    nonce: any;
    value: any;
    from: any;
    gasPrice: any;
    gasLimit: any;
    chainId: any;
    data: any;
    maxFeePerGas: any;
    maxPriorityFeePerGas: any;
};
export declare const setFallbackWETH: (address: any) => void;
export declare const coerceToWeth: (address: any, signer: any) => Promise<any>;
export declare const toWETH: (chainId?: number | string) => any;
export declare const wrapEth: (signer: Signer, amount: BigNumberish) => Promise<boolean>;
export declare const addHexPrefix: (s: any) => any;
export declare const stripHexPrefix: (s: any) => any;
export declare const tokenInterface: ethers.Interface;
export declare const erc1155Interface: ethers.Interface;
export declare const numberToHex: (v: any) => string;
export declare const replaceForAddressOpcode: (calldata: any) => any;
export declare const parsePermit2: (disassembly: any, first?: boolean) => false | {
    tail: any;
    data: {
        token: string;
        to: string;
        from: string;
        signature: {
            r: any;
            s: any;
            v: number;
        };
        amount: any;
    };
};
export declare const parseTrade: (bytecode: any, chainId?: number) => false | any[];
export declare const parseWithdraw: (disassembly: any, chainId?: number, first?: boolean) => false | {
    data: {
        token: string;
        amount: any;
    };
    tail: any;
};
export declare const parsePermit: (disassembly: any, first?: boolean) => false | {
    data: {
        token: string;
        from: string;
        amount: any;
        signature: ethers.Signature;
    };
    tail: any;
};
export declare const parseTransferFrom: (disassembly: any, first?: boolean) => false | {
    data: {
        token: string;
        from: string;
        to: string;
        amount: any;
    };
    tail: any;
};
export declare function parseSendEther(disassembly: any): false | {
    tail: any;
    data: {
        amount: any;
        to: string;
    };
};
export declare const createContract: (offer: IOffer, maker: string, taker: string, chainId: string | number, permitData: any, payCoinbaseAmount: string | null) => any;
