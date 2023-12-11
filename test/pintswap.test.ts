import { expect } from "chai";
import { Pintswap, setFallbackWETH } from "../src.ts";
import WETH9 from "canonical-weth/build/contracts/WETH9.json";
import { hashOffer } from "../lib/trade";
import { EventEmitter } from "events";
import { URL } from "url";
import pair from "it-pair";

const ln = (v) => (
  console.log(require("util").inspect(v, { colors: true, depth: 15 })), v
);

const pintswapByAddress: any = {};

export class MockPintswap extends Pintswap {
  public _handlers: any;
  public _topics: any[];

  constructor(args) {
    super(args);
    pintswapByAddress[this.address] = this;
    this._handlers = {};
    this._topics = [];
    const self = this;
    const pubsub = ((this as any).pubsub = new EventEmitter());
    (pubsub as any).start = () => {};
    (pubsub as any).subscribe = (topic) => {
      this._topics.push(topic);
    };
    (pubsub as any).publish = (topic, data) => {
      Object.entries(pintswapByAddress)
        .filter(([k, v]) => (v as any)._topics.find((v) => v === topic))
        .forEach(([k, v]) => {
          (v as any).pubsub.emit(topic, {
            from: Pintswap.fromAddress(self.address),
            data: data,
          });
        });
    };
    (pubsub as any).unsubscribe = (topic) => {
      this._topics.splice(
        this._topics.findIndex((v) => v === topic),
        1
      );
    };
  }
  async start() {
    await this.startNode();
  }
  async startNode() {
    await this.handleBroadcastedOffers();
    await this.handleUserData();
  }
  //@ts-ignore
  async findPeer() {}

  async handle(protocols, cb) {
    if (!Array.isArray(protocols)) protocols = [protocols];
    protocols.forEach((v) => {
      this._handlers[v] = cb;
    });
  }
  async resolveName(v) {
    return v;
  }
  async dialPeer(address, protocol) {
    const a = pair();
    const b = pair();
    const fromStream = {
      sink: b.sink,
      source: a.source,
    };
    (fromStream as any).close = () => {};
    const toStream = {
      sink: a.sink,
      source: b.source,
    };
    (toStream as any).close = () => {};
    new Promise((resolve, reject) => setTimeout(resolve, 0))
      .then(() => {
        pintswapByAddress[address]._handlers[protocol]({
          stream: toStream,
        });
      })
      .catch((err) => console.error(err));
    return { stream: fromStream };
  }
}

describe("Pintswap - Integration Tests", function () {
  const testingEth = process.env.ETH ? true : false;
  const { ethers } = hre;
  let tt1; // test token held by maker
  let tt2; // test token held by taker
  let weth;
  let offer;
  let batch;
  let maker, taker;

  async function setupTestEnv() {
    const [maker, taker] = await ethers.getSigners();

    const TestERC20 = await ethers.getContractFactory("TestToken", maker);
    tt1 = await TestERC20.deploy(
      ethers.utils.parseEther("1000"),
      "Token1",
      "TK1"
    );
    const USDCInjected = await ethers.getContractFactory("MockUSDC");
    const usdcRuntime = await maker.provider.call({
      data: USDCInjected.bytecode,
    });
    await maker.provider.send("hardhat_setCode", [
      "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      usdcRuntime,
    ]);

    let TakerTestERC20 = await ethers.getContractFactory("TestToken", taker);
    tt2 = await TakerTestERC20.deploy(
      ethers.utils.parseEther("1000"),
      "Token2",
      "TK2"
    );

    if (testingEth) {
      const WETH = new ethers.ContractFactory(WETH9.abi, WETH9.bytecode, maker);
      weth = await WETH.connect(maker).deploy();
      weth = await weth.deployed();
      setFallbackWETH(weth.address);
    }

    if (process.env.USDC) {
      const usdc = new ethers.Contract(
        "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
        ["function mint(address, uint256)"],
        taker
      );
      await usdc.mint(
        await taker.getAddress(),
        ethers.utils.parseEther("1000")
      );
      await usdc.mint(
        await maker.getAddress(),
        ethers.utils.parseEther("1000")
      );
      tt2 = tt2.attach(usdc.address);
    } else if (process.env.ERC721) {
      const MockERC721 = await ethers.getContractFactory("MockERC721", taker);
      tt2 = await MockERC721.deploy();
      await tt2.mint(await taker.getAddress(), "0x01");
    }

    offer = {
      gives: {
        token: testingEth ? ethers.constants.AddressZero : tt1.address,
        amount: ethers.utils.parseUnits("500.0", 18).toHexString(),
      },
      gets: process.env.ERC721
        ? {
            token: tt2.address,
            tokenId: "0x01",
          }
        : {
            token: tt2.address,
            amount: ethers.utils.parseUnits("500.0", 18).toHexString(),
          },
    };
    if (process.env.BATCH)
      offers = [
        {
          gives: {
            token: testingEth ? ethers.constants.AddressZero : tt1.address,
            amount: ethers.utils.parseUnits("100.0", 18).toHexString(),
          },
          gets: {
            token: tt2.address,
            amount: ethers.utils.parseUnits("100.0", 18).toHexString(),
          },
        },
        {
          gives: {
            token: testingEth ? ethers.constants.AddressZero : tt1.address,
            amount: ethers.utils.parseUnits("100.0", 18).toHexString(),
          },
          gets: {
            token: tt2.address,
            amount: ethers.utils.parseUnits("150.0", 18).toHexString(),
          },
        },
      ];
  }

  before(async function () {
    await setupTestEnv();
    const [makerSigner, takerSigner] = await ethers.getSigners();

    await new Promise(async (resolve) => {
      maker = await MockPintswap.initialize({ signer: makerSigner });
      await maker.startNode();

      if (process.env.BATCH) {
        maker.broadcastOffer(offers[0]);
        maker.broadcastOffer(offers[1]);
      } else maker.broadcastOffer(offer);
      setTimeout(resolve, 6000);
    });

    await new Promise(async (resolve) => {
      taker = await MockPintswap.initialize({ signer: takerSigner });
      await taker.startNode();
      setTimeout(resolve, 6000);
    });
  });
  it("`Taker` should be able to dial and get the trade of the `Maker`", async function () {
    let offers = await taker.getUserData(maker.address);
  });
  it("`Maker` should dialProtocol `Taker` to create a trade", async function () {
    let val = await await (process.env.BATCH
      ? taker.createBatchTrade(
          maker.address,
          offers.map((v, i) => ({
            amount:
              i === 1
                ? ethers.utils.hexlify(
                    ethers.BigNumber.from(String(v.gets.amount / 2))
                  )
                : v.gets.amount,
            offer: v,
          }))
        )
      : taker.createTrade(maker.address, offer)
    ).toPromise();
    console.log(val);
  });
});
