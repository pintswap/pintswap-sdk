const { expect } = require("chai");
const { Pintswap, setFallbackWETH } = require("../lib");
const WETH9 = require("canonical-weth/build/contracts/WETH9.json");

describe("Pintswap - Pubsub Integration Tests", function () {

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
      givesAmount: ethers.utils.parseUnits("500.0", 18).toHexString(),
      getsAmount: ethers.utils.parseUnits("500.0", 18).toHexString()
    }
  }

  before(async function() {
    await setupTestEnv()
    const [ makerSigner, takerSigner ] = await ethers.getSigners();

    await new Promise( async (resolve) => {
      console.log("initializing maker");
      maker = await Pintswap.initialize({ signer: makerSigner });
      await maker.startNode();
      setTimeout(resolve, 3000);
    });

    await new Promise( async (resolve) => {
      console.log("initialize taker");
      taker = await Pintswap.initialize({ signer: takerSigner });
      await taker.startNode();
      setTimeout(resolve, 3000);
    });
  });

  it("Maker should exist", function () {
    expect(maker.isStarted()).to.be.equal(true);
  });
})
