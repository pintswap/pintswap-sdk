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
  chainId?: string;
}

export type IAvailableChainIds =
  | "42161"
  | "137"
  | "10"
  | "43112"
  | "1"
  | "31337";

export type ITokenProps = {
  chainId: number;
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logoURI: string;
  extensions?: {
    bridgeInfo: Record<string, { tokenAddress: string }>;
  };
  balance?: string;
};

export type ITokens = {
  type: string;
  name: string;
  symbol: string;
  tokenAddress: string;
  fromAddress: string;
  toAddress: string;
  decimals: number;
  amount: string;
};

export type ITokenTransfers = {
  transfer1: ITokens;
  transfer2: ITokens;
};

export interface NFTPFP {
  token: string;
  tokenId: string;
}

export interface IUserData {
  bio: string;
  image: Buffer | NFTPFP;
}
