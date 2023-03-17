"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashOffer = exports.createContractAsTaker = void 0;
const protocol_1 = require("./protocol");
const p2p_1 = require("@zerodao/p2p");
const it_pipe_1 = require("it-pipe");
const lp = __importStar(require("it-length-prefixed"));
const two_party_ecdsa_js_1 = require("@safeheron/two-party-ecdsa-js");
const emasm_1 = require("emasm");
const createContractAsTaker = (offer, maker, taker) => {
    return (0, emasm_1.emasm)([
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
    ]);
};
exports.createContractAsTaker = createContractAsTaker;
const hashOffer = (o) => {
    return solidityKeccak256(['address', 'address', 'uint256', 'uint256'], [getAddress(o.givesToken), getAddress(o.getsToken), o.givesAmount, o.getsAmount]);
};
exports.hashOffer = hashOffer;
class Pintswap extends p2p_1.ZeroP2P {
    constructor({ signer }) {
        super({});
        this.signer = signer;
    }
    static async initialize({ signer }) {
        const self = new this({ signer });
        await self.handle('/pintswap/0.1.0/orders', (duplex) => (0, it_pipe_1.pipe)(duplex.sink, lp.encode(), protocol_1.protocol.OfferList.encode({ offers: self.offers })));
        await self.handle('/pintswap/0.1.0/create-trade', async (duplex) => {
            const context = await two_party_ecdsa_js_1.TPCEcdsaKeyGen.P2Context.createContext();
            const message1 = await (0, it_pipe_1.pipe)(duplex.source, lp.decode());
            const message2 = context.step1(message1);
            await (0, it_pipe_1.pipe)(duplex.sink, lp.encode(), message2);
            const message3 = await (0, it_pipe_1.pipe)(duplex.source, lp.decode());
            context.step2(message3);
            const key = JSON.stringify(context.exportKeyShare());
        });
        await self.start();
        return self;
    }
}
//# sourceMappingURL=pintswap.js.map