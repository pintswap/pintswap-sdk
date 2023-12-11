import { ITokenProps } from "./types";
export declare const TOKENS: ITokenProps[];
export declare const getTokenList: (chainId?: number) => ITokenProps[];
export declare const MIN_ABI: {
    ERC20: string[];
};
export declare function getDecimals(token: string, chainId: number): Promise<number>;
export declare function getSymbol(address: string, chainId: number): Promise<string>;
export declare function getName(address: string, chainId: number): Promise<string>;
