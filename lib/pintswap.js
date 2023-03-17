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
exports.hashOffer = exports.createContract = void 0;
const protocol_1 = require("./protocol");
const p2p_1 = require("@zerodao/p2p");
const it_pipe_1 = require("it-pipe");
const lp = __importStar(require("it-length-prefixed"));
const two_party_ecdsa_js_1 = require("@safeheron/two-party-ecdsa-js");
const emasm_1 = require("emasm");
const address_1 = require("@ethersproject/address");
const solidity_1 = require("@ethersproject/solidity");
const transaction_1 = require("@ethersproject/transaction");
const contract_1 = require("@ethersproject/contract");
const bytes_1 = require("@ethersproject/bytes");
const createContract = (offer, maker, taker) => {
    return (0, emasm_1.emasm)([
        "pc",
        "returndatasize",
        "0x64",
        "returndatasize",
        "returndatasize",
        (0, address_1.getAddress)(offer.givesToken),
        "0x23b872dd00000000000000000000000000000000000000000000000000000000",
        "returndatasize",
        "mstore",
        (0, address_1.getAddress)(maker),
        "0x4",
        "mstore",
        (0, address_1.getAddress)(taker),
        "0x24",
        "mstore",
        (0, bytes_1.hexlify)(offer.givesAmount),
        "0x44",
        "mstore",
        "gas",
        "call",
        "0x0",
        "0x0",
        "0x64",
        "0x0",
        "0x0",
        (0, address_1.getAddress)(offer.getsToken),
        (0, address_1.getAddress)(taker),
        "0x4",
        "mstore",
        (0, address_1.getAddress)(maker),
        "0x24",
        "mstore",
        (0, bytes_1.hexlify)(offer.getsAmount),
        "0x44",
        "mstore",
        "gas",
        "call",
        "and",
        "failure",
        "jumpi",
        (0, address_1.getAddress)(maker),
        "selfdestruct",
        ["failure", ["0x0", "0x0", "revert"]],
    ]);
};
exports.createContract = createContract;
const hashOffer = (o) => {
    return (0, solidity_1.keccak256)(["address", "address", "uint256", "uint256"], [
        (0, address_1.getAddress)(o.givesToken),
        (0, address_1.getAddress)(o.getsToken),
        o.givesAmount,
        o.getsAmount,
    ]);
};
exports.hashOffer = hashOffer;
class Pintswap extends p2p_1.ZeroP2P {
    async getTradeAddress(sharedAddress) {
        return (0, address_1.getContractAddress)({
            nonce: await this.signer.provider.getTransactionCount(sharedAddress),
            from: sharedAddress,
        });
    }
    async approveTradeAsMaker(offer, sharedAddress) {
        const tradeAddress = await this.getTradeAddress(sharedAddress);
        return await new contract_1.Contract(offer.givesToken, ["function approve(address, uint256) returns (bool)"], this.signer).approve(tradeAddress, offer.givesAmount);
    }
    async approveTradeAsTaker(offer, sharedAddress) {
        const tradeAddress = await this.getTradeAddress(sharedAddress);
        return await new contract_1.Contract((0, address_1.getAddress)(offer.getsToken), ["function approve(address, uint256) returns (bool)"], this.signer).approve(tradeAddress, offer.getsAmount);
    }
    async createTransaction(offer, maker, sharedAddress) {
        const contract = (0, exports.createContract)(offer, maker, await this.signer.getAddress());
        const gasPrice = await this.signer.provider.getGasPrice();
        const gasLimit = await this.signer.provider.estimateGas({
            data: contract,
            from: sharedAddress,
            gasPrice,
        });
        return Object.assign(new transaction_1.Transaction(), {
            data: (0, exports.createContract)(offer, maker, await this.signer.getAddress()),
            gasPrice,
            gasLimit,
            nonce: await this.signer.provider.getTransactionCount(sharedAddress),
            value: (await this.signer.provider.getBalance(sharedAddress)).sub(gasPrice.mul(gasLimit)),
        });
    }
    constructor({ signer, peerId }) {
        super({ signer, peerId });
        this.signer = signer;
    }
    static async initialize({ signer }) {
        let peerId = await this.peerIdFromSeed(await signer.getAddress());
        const self = new this({ signer, peerId });
        await self.handle("/pintswap/0.1.0/orders", (duplex) => (0, it_pipe_1.pipe)(duplex.stream.sink, lp.encode(), protocol_1.protocol.OfferList.encode({ offers: self.offers })));
        await self.handle("/pintswap/0.1.0/create-trade", async (duplex) => {
            const context = await two_party_ecdsa_js_1.TPCEcdsaKeyGen.P2Context.createContext();
            /*
            const message1 = await pipe(duplex.source, lp.decode());
            const message2 = context.step1(message1);
            await pipe(duplex.sink, lp.encode(), message2);
            const message3 = await pipe(duplex.source, lp.decode());
            context.step2(message3);
            const key = JSON.stringify(context.exportKeyShare());
           */
            /*
           await this.approveTradeAsMaker(...)
           // wait for taker to approve
           const transaction = await this.createTransaction(offer, maker, taker);
           const signedTransaction = new Transaction({
             ...transaction,
             ...await sign(transaction)
           });
           const tx = await this.signer.provider.sendTransaction(signedTransaction);
          await tx.wait();
         */
        });
        await self.start();
        return self;
    }
}
//# sourceMappingURL=pintswap.js.map