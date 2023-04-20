export declare function getMessage(request: any): {
    spender: any;
    nonce: any;
    deadline: any;
    tokenId: any;
};
export declare function getDomainStructure(asset: any): {
    name: string;
    type: string;
}[];
export declare function getVersion(contract: any): Promise<any>;
export declare function fetchData(o: any, provider: any): Promise<any>;
export declare function getPermitStructure(asset: any): {
    name: string;
    type: string;
}[];
export declare function toChainId(network: any): 1 | 137 | 43114 | 42161 | 10;
export declare function toNetwork(asset: any): string;
export declare function getDomain(o: any): {
    name: any;
    version: any;
    chainId: string;
    verifyingContract: string;
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
        name: any;
        version: any;
        chainId: string;
        verifyingContract: string;
    };
    message: {
        spender: any;
        nonce: any;
        deadline: any;
        tokenId: any;
    };
};
export declare function splitSignature(data: any): {
    v: number;
    r: string;
    s: string;
};
export declare function joinSignature(data: any): string;
export declare function signAndMergeERC721(o: any, signer: any): Promise<any>;
export declare function signTypedData(signer: any, ...payload: any[]): Promise<any>;
export declare function signERC721Permit(o: any, signer: any): Promise<{
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
