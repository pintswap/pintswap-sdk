import { IOffer, ITokenProps } from "./types";
export declare const TOKENS: ITokenProps[];
export declare const getTokenList: (chainId?: number) => ITokenProps[];
export declare const getTokenListBySymbol: (chainId?: number) => any;
export declare const MIN_ABI: {
    ERC20: string[];
};
export declare const maybeConvertName: (s: any) => any;
export declare const maybeFromName: (s: any) => any;
export declare function getDecimals(token: string, chainId: number): Promise<number>;
export declare function getSymbol(address: string, chainId: number): Promise<string>;
export declare function getName(address: string, chainId: number): Promise<string>;
export declare const displayOffer: ({ gets, gives }: IOffer, chainId?: number, type?: "symbol" | "name") => Promise<{
    gives: {
        token: string;
        amount: string;
    };
    gets: {
        token: string;
        amount: string;
    };
}>;
export declare const ENDPOINTS: Record<"uniswap" | "pintswap", Record<string, string>>;
export declare function getEthPrice(): Promise<string>;
export declare function toAddress(symbolOrAddress?: string, chainId?: number): string;
export declare const getUsdPrice: (asset: string, eth?: string, setState?: any) => Promise<any>;
export declare const percentChange: (oldVal?: string | number, newVal?: string | number, times100?: boolean) => string;
