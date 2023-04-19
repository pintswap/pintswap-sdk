export interface IERC20Transfer {
    token: string;
    amount: string;
}
export interface IERC721Transfer {
    token: string;
    tokenId: string;
}
export interface IERC1155Transfer {
    token: string;
    tokenId: string;
    amount: string;
}
export type ITransfer = {
    token: string;
    tokenId?: string;
    amount?: string;
};
export interface IOffer {
    gives: ITransfer;
    gets: ITransfer;
}
export type IAvailableChainIds = '42161' | '137' | '10' | '43112' | '1' | '31337';
