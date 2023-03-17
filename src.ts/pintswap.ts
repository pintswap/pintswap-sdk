import { protocol } from "./protocol";
import { ZeroP2P } from "@zerodao/p2p";
import { Signer } from "@ethersproject/abstract-signer";
import { pipe } from "it-pipe";
import * as lp from "it-length-prefixed";
import type { BytesLike } from "@ethersproject/bytes";
import type { BigNumberish } from "@ethersproject/bignumber";
import { TPCEcdsaKeyGen } from "@safeheron/two-party-ecdsa-js";
import { emasm } from "emasm";

interface IOffer {
  givesToken: BytesLike;
  getsToken: BytesLike;
  givesAmount: BigNumberish;
  getsAmount: BigNumberish;
}

export const createContractAsTaker = (offer: IOffer, maker: string, taker: string) => {
  return emasm([
    'pc',
    'returndatasize',
    '0x64',
    'returndatasize',
    'returndatasize',
    offer.givesToken,
    '0x23b872dd00000000000000000000000000000000000000000000000000000000',
    'returndatasize',
    'mstore',
    maker,
    '0x4',
    'mstore',
    taker,
    '0x24',
    'mstore',
    offer.givesAmount,
    '0x44',
    'mstore',
    'gas',
    'call',
    '0x0',
    '0x0',
    '0x64',
    '0x0',
    '0x0',
    offer.getsToken,
    taker,
    '0x4',
    'mstore',
    maker,
    '0x24',
    'mstore',
    offer.getsAmount,
    '0x44',
    'mstore',
    'gas',
    'call',
    'and',
    'failure',
    'jumpi',
     maker,
    'selfdestruct',
    ['failure', ['0x0', '0x0', 'revert']]
  ])
};
  

export const hashOffer = (o) => {
  return solidityKeccak256(['address', 'address', 'uint256', 'uint256'], [getAddress(o.givesToken), getAddress(o.getsToken), o.givesAmount, o.getsAmount ]);
};

class Pintswap extends ZeroP2P {
  public signer: Signer;
  public offers: IOffer[];
  constructor({
    signer
  }) {
    super({});
    this.signer = signer;
  }
  static async initialize({
    signer
  }) {
    const self = new this({ signer });
    await self.handle('/pintswap/0.1.0/orders', (duplex) => pipe(duplex.sink, lp.encode(), protocol.OfferList.encode({ offers: self.offers })));
    await self.handle('/pintswap/0.1.0/create-trade', async (duplex) => {
      const context = await TPCEcdsaKeyGen.P2Context.createContext();
      const message1 = await pipe(duplex.source, lp.decode());
      const message2 = context.step1(message1);
      await pipe(duplex.sink, lp.encode(), message2);
      const message3 = await pipe(duplex.source, lp.decode());
      context.step2(message3);
      const key = JSON.stringify(context.exportKeyShare());
      
    });
    await self.start();
    return self;
  }
}

