import { protocol } from "./protocol";
import { ZeroP2P } from "@zerodao/p2p";
import { Signer } from "@ethersproject/abstract-signer";
import { pipe } from "it-pipe";
import type { BytesLike } from "@ethersproject/bytes";
import type { BigNumberish } from "@ethersproject/bignumber";
import { handle_keygen } from "./utils";

interface IOffer {
  givesToken: BytesLike;
  getsToken: BytesLike;
  givesAmount: BigNumberish;
  getsAmount: BigNumberish;
}

export class Pintswap extends ZeroP2P {
  public signer: Signer;
  public offers: IOffer[];

  static async initialize({
    signer
  }) {
    console.log("\n ... initilizing new Pintswap node ...");
    let peerId = await this.peerIdFromSeed(await signer.getAddress());
    const self = new this({ signer, peerId });

    await self.handle('/pintswap/0.1.0/orders', async (duplex) => {
      await new Promise((resolve) => pipe(protocol.OfferList.encode({
        offers: self.offers
      }), duplex.stream.source, resolve)); 
    });

    await self.handle('/pintswap/0.1.0/create-trade', handle_keygen);

    await self.start();
    return self;
  }

  constructor({
    signer,
    peerId
  }) {
    super({ signer, peerId });
  }

}

