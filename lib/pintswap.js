"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pintswap = void 0;
const protocol_1 = require("./protocol");
const p2p_1 = require("@zerodao/p2p");
const it_pipe_1 = require("it-pipe");
const utils_1 = require("./utils");
class Pintswap extends p2p_1.ZeroP2P {
    static async initialize({ signer }) {
        console.log("\n ... initilizing new Pintswap node ...");
        let peerId = await this.peerIdFromSeed(await signer.getAddress());
        const self = new this({ signer, peerId });
        await self.handle('/pintswap/0.1.0/orders', async (duplex) => {
            await new Promise((resolve) => (0, it_pipe_1.pipe)(protocol_1.protocol.OfferList.encode({
                offers: self.offers
            }), duplex.stream.source, resolve));
        });
        await self.handle('/pintswap/0.1.0/create-trade', utils_1.handle_keygen);
        await self.start();
        return self;
    }
    constructor({ signer, peerId }) {
        super({ signer, peerId });
    }
}
exports.Pintswap = Pintswap;
//# sourceMappingURL=pintswap.js.map