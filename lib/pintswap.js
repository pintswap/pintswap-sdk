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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pintswap = exports.hashOffer = exports.createContract = void 0;
const protocol_1 = require("./protocol");
const p2p_1 = require("./p2p");
const ethers_1 = require("ethers");
const it_pipe_1 = require("it-pipe");
const lp = __importStar(require("it-length-prefixed"));
const utils_1 = require("./utils");
const emasm_1 = require("emasm");
const { solidityPackedKeccak256, hexlify, getAddress, getCreateAddress, VoidSigner, Contract, Transaction, } = ethers_1.ethers;
const createContract = (offer, maker, taker) => {
    return (0, emasm_1.emasm)([
        "pc",
        "returndatasize",
        "0x64",
        "returndatasize",
        "returndatasize",
        getAddress(offer.givesToken),
        "0x23b872dd00000000000000000000000000000000000000000000000000000000",
        "returndatasize",
        "mstore",
        getAddress(maker),
        "0x4",
        "mstore",
        getAddress(taker),
        "0x24",
        "mstore",
        hexlify(offer.givesAmount),
        "0x44",
        "mstore",
        "gas",
        "call",
        "0x0",
        "0x0",
        "0x64",
        "0x0",
        "0x0",
        getAddress(offer.getsToken),
        getAddress(taker),
        "0x4",
        "mstore",
        getAddress(maker),
        "0x24",
        "mstore",
        hexlify(offer.getsAmount),
        "0x44",
        "mstore",
        "gas",
        "call",
        "and",
        "failure",
        "jumpi",
        getAddress(maker),
        "selfdestruct",
        ["failure", ["0x0", "0x0", "revert"]],
    ]);
};
exports.createContract = createContract;
const hashOffer = (o) => {
    return solidityPackedKeccak256(["address", "address", "uint256", "uint256"], [
        getAddress(o.givesToken),
        getAddress(o.getsToken),
        o.givesAmount,
        o.getsAmount,
    ]);
};
exports.hashOffer = hashOffer;
class Pintswap extends p2p_1.PintP2P {
    getTradeAddress(sharedAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            return getCreateAddress({
                nonce: yield this.signer.provider.getTransactionCount(sharedAddress),
                from: sharedAddress,
            });
        });
    }
    approveTradeAsMaker(offer, sharedAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const tradeAddress = yield this.getTradeAddress(sharedAddress);
            return yield new Contract(offer.givesToken, ["function approve(address, uint256) returns (bool)"], this.signer).approve(tradeAddress, offer.givesAmount);
        });
    }
    approveTradeAsTaker(offer, sharedAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const tradeAddress = yield this.getTradeAddress(sharedAddress);
            return yield new Contract(getAddress(offer.getsToken), ["function approve(address, uint256) returns (bool)"], this.signer).approve(tradeAddress, offer.getsAmount);
        });
    }
    createTransaction(offer, maker, sharedAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            const contract = (0, exports.createContract)(offer, maker, yield this.signer.getAddress());
            const gasPrice = yield this.signer.provider.getGasPrice();
            const gasLimit = yield this.signer.provider.estimateGas({
                data: contract,
                from: sharedAddress,
                gasPrice,
            });
            return Object.assign(new Transaction(), {
                data: (0, exports.createContract)(offer, maker, yield this.signer.getAddress()),
                gasPrice,
                gasLimit,
                nonce: yield this.signer.provider.getTransactionCount(sharedAddress),
                value: (yield this.signer.provider.getBalance(sharedAddress)).sub(gasPrice.mul(gasLimit)),
            });
        });
    }
    constructor({ signer, peerId }) {
        super({ signer, peerId });
        this.signer = signer;
    }
    createTrade(peer) {
        return __awaiter(this, void 0, void 0, function* () {
            // generate 2p-ecdsa keyshare with indicated peer
            let { stream } = yield this.dialProtocol(peer, [
                "/pintswap/0.1.0/create-trade",
            ]);
            let keyShare = yield (0, utils_1.initKeygen)(stream);
            stream.close();
            console.log(keyShare);
            return;
            // derive transaction address from ecdsa pubkey
        });
    }
    static initialize({ signer }) {
        return __awaiter(this, void 0, void 0, function* () {
            let peerId = yield this.peerIdFromSeed(yield signer.getAddress());
            const self = new this({ signer, peerId });
            yield self.handle("/pintswap/0.1.0/orders", (duplex) => (0, it_pipe_1.pipe)(duplex.stream.sink, lp.encode(), protocol_1.protocol.OfferList.encode({ offers: self.offers })));
            yield self.handle("/pintswap/0.1.0/create-trade", ({ stream, connection, protocol }) => __awaiter(this, void 0, void 0, function* () {
                let keyshare = yield (0, utils_1.handleKeygen)({ stream });
                stream.close();
                console.log(keyshare);
                return;
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
            }));
            yield self.start();
            return self;
        });
    }
}
exports.Pintswap = Pintswap;
//# sourceMappingURL=pintswap.js.map