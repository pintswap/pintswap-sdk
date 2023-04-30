export declare const ASSETS: {
    MATIC: {
        USDC: string;
    };
    ARBITRUM: {
        USDC: string;
    };
    ETHEREUM: {
        USDC: string;
    };
    AVALANCHE: {
        USDC: string;
    };
    OPTIMISM: {
        USDC: string;
    };
};
export declare function getMessage(request: any): {
    owner: any;
    spender: any;
    nonce: any;
    deadline: any;
    value: any;
};
export declare function getDomainStructure(asset: any): {
    name: string;
    type: string;
}[];
export declare function fetchData(o: any, provider: any): Promise<any>;
export declare function isUSDC(asset: any): boolean;
export declare function getPermitStructure(asset: any): {
    name: string;
    type: string;
}[];
export declare function toChainId(network: any): 1 | 137 | 43114 | 42161 | 10;
export declare function toNetwork(asset: any): string;
export declare function getVersion(contract: any): Promise<any>;
export declare function getDomain(o: any): {
    name: string;
    version: string;
    verifyingContract: string;
    salt: string;
    chainId?: undefined;
} | {
    name: any;
    version: any;
    chainId: string;
    verifyingContract: string;
    salt?: undefined;
};
export declare function toEIP712(o: any): {
    types: {
        EIP712Domain: {
            name: string;
            type: string;
        }[];
        Permit: {
            name: string;
            type: string;
        }[];
    };
    primaryType: string;
    domain: {
        name: string;
        version: string;
        verifyingContract: string;
        salt: string;
        chainId?: undefined;
    } | {
        name: any;
        version: any;
        chainId: string;
        verifyingContract: string;
        salt?: undefined;
    };
    message: {
        owner: any;
        spender: any;
        nonce: any;
        deadline: any;
        value: any;
    };
};
export declare function splitSignature(data: any): {
    v: number;
    r: string;
    s: string;
};
export declare function joinSignature(data: any): string;
export declare function sign(o: any, signer: any): Promise<any>;
export declare function signTypedData(signer: any, ...payload: any[]): Promise<any>;
export declare function signPermit(o: any, signer: any): Promise<{
    v: number;
    r: string;
    s: string;
}>;
export declare function encode(request: any): any;
export declare function decode(data: any): {
    expiry: number;
    v: number;
    r: string;
    s: string;
    signatureTransfer?: undefined;
    signature?: undefined;
} | {
    signatureTransfer: {
        nonce: any;
        deadline: number;
    };
    signature: any;
    expiry?: undefined;
    v?: undefined;
    r?: undefined;
    s?: undefined;
};
