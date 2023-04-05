const { expect } = require("chai");
const { Pintswap, setFallbackWETH } = require("../lib");
const WETH9 = require("canonical-weth/build/contracts/WETH9.json");

describe("Pintswap", function () {
  const testingEth = process.env.ETH ? true : false;
  let tt1; // test token held by maker
  let tt2; // test token held by taker
  let weth;
  let offer;
  let maker, taker;

  async function setupTestEnv() {
    const [ maker, taker ] = await ethers.getSigners();

    const TestERC20 = await ethers.getContractFactory("TestToken", maker);
    tt1 = await TestERC20.deploy(ethers.utils.parseEther('1000'), "Token1", "TK1");

    let TakerTestERC20 = await ethers.getContractFactory("TestToken", taker);
    tt2 = await TakerTestERC20.deploy(ethers.utils.parseEther('1000'), "Token2", "TK2");

    if(testingEth) {
      const WETH = new ethers.ContractFactory(WETH9.abi, WETH9.bytecode, maker);
      weth = await WETH.connect(maker).deploy();
      weth = await weth.deployed();
      setFallbackWETH(weth.address);
    }

    offer = {
      givesToken: testingEth ? ethers.constants.AddressZero : tt1.address,
      getsToken: tt2.address,
      givesAmount: ethers.utils.parseUnits("100.0", 18).toHexString(),
      getsAmount: ethers.utils.parseUnits("100.0", 18).toHexString()
    }
  }

  before(async function() {
    await setupTestEnv()
    const [ makerSigner, takerSigner ] = await ethers.getSigners();

    await new Promise(async (resolve) => {
      maker = await Pintswap.initialize({ signer: makerSigner });
      await maker.startNode();
      maker.on("peer:discovery", async (peer) => {
        console.log(
          `Maker:: found peer with id: ${peer}`
        )
      })

      console.log('broadcasting offer \n', offer);
      maker.broadcastOffer(offer);
      setTimeout(resolve, 6000);
    });

    await new Promise(async (resolve) => {
      taker = await Pintswap.initialize({ signer: takerSigner });
      await taker.startNode();
      taker.on("peer:discovery", async (peer) => {
        console.log(
          `Taker:: found peer with id: ${peer}`
        )
      })
      setTimeout(resolve, 6000);
    });
  });

  it("`Taker` should be able to dial and get the trade of the `Maker`", async function () {
    let offers = await taker.getTradesByPeerId(maker.peerId.toB58String());
    console.log(offers);
  });

  it("`Maker` should be started", async function () {
    expect(maker.isStarted()).to.be.equal(true);
  });

  it("`Maker` should dialProtocol `Taker` to create a trade", async function () {
    let val = await taker.createTrade(maker.peerId, offer);
    expect(val).to.be.equal(true);
  })

});
