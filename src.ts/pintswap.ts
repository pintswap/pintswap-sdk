import { protocol } from "./protocol";
import { ZeroP2P } from "@zerodao/p2p";
import { Signer } from "@ethersproject/abstract-signer";
import { pipe } from "it-pipe";
import type { BytesLike } from "@ethersproject/bytes";
import type { BigNumberish } from "@ethersproject/bignumber";

interface IOffer {
  givesToken: BytesLike;
  getsToken: BytesLike;
  givesAmount: BigNumberish;
  getsAmount: BigNumberish;
}

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
    await self.handle('/pintswap/0.1.0/orders', async (duplex) => {
      await new Promise((resolve) => pipe(protocol.OfferList.encode({
        offers: self.offers
      }), duplex.stream.source, resolve)); 
    });
    await self.handle('/pintswap/0.1.0/create-trade', async () => {
      // should do keygen and sign a tx between both parties
    });
    await self.start();
    return self;
  }
}

