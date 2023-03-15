"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const protocol_1 = require("./protocol");
const p2p_1 = require("@zerodao/p2p");
const it_pipe_1 = require("it-pipe");
class Pintswap extends p2p_1.ZeroP2P {
    constructor({ signer }) {
        super({});
        this.signer = signer;
    }
    static async initialize({ signer }) {
        const self = new this({ signer });
        await self.handle('/pintswap/0.1.0/orders', async (duplex) => {
            await new Promise((resolve) => (0, it_pipe_1.pipe)(protocol_1.protocol.OfferList.encode({
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
//# sourceMappingURL=pintswap.js.map