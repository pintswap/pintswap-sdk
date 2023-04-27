const { expect } = require("chai");
const { Pintswap, setFallbackWETH } = require("../lib");
const WETH9 = require("canonical-weth/build/contracts/WETH9.json");
const { hashOffer } = require('../lib/trade');

const ln = (v) => ((console.log(require('util').inspect(v, { colors: true, depth: 15 }))), v);

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
      maker = await Pintswap.initialize({ signer: makerSigner });
      await maker.startNode();
      maker.on("peer:discovery", async (peer) => {
        console.log(`Maker:: found peer with id: ${peer}`);
      });

      if (process.env.BATCH) {
        maker.broadcastOffer(offers[0]);
        maker.broadcastOffer(offers[1]);
        console.log(hashOffer(offers[0]));
      } else maker.broadcastOffer(offer);
      setTimeout(resolve, 6000);
    });

    await new Promise(async (resolve) => {
      taker = await Pintswap.initialize({ signer: takerSigner });
      await taker.startNode();
      taker.on("peer:discovery", async (peer) => {
        console.log(`Taker:: found peer with id: ${peer}`);
      });
      setTimeout(resolve, 6000);
    });
  });
  it("`Taker` should be able to dial and get the trade of the `Maker`", async function () {
    let offers = ln(await taker.getTradesByPeerId(maker.peerId.toB58String()));
  });

  it("`Maker` should be started", async function () {
    expect(maker.isStarted()).to.be.equal(true);
  });

  it("`Maker` should dialProtocol `Taker` to create a trade", async function () {
    let val = await await (process.env.BATCH ? taker.createBatchTrade(maker.peerId, ln(offers.map((v, i) => ({ amount: i === 1 ? ethers.utils.hexlify(ethers.BigNumber.from(String(v.gets.amount / 2))) : v.gets.amount, offer: v })))) : taker.createTrade(maker.peerId, offer)).toPromise();
    expect(Number(val.status)).to.eql(1);
  });
});
