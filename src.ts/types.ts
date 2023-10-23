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
}

export interface IOffer {
  gives: ITransfer;
  gets: ITransfer;
}

export type IAvailableChainIds = '42161' | '137' | '10' | '43112' | '1' | '31337';

export type IKeygenMpc = 'KEYGEN_A0' | 'KEYGEN_A1' | 'KEYGEN_A2' | 'KEYGEN_B0' | 'KEYGEN_B1';

export type ISignMpc = 'SIGN_A0' | 'SIGN_B0' | 'SIGN_A1' | 'SIGN_B1' | 'SIGN_A2'