/*
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
      maker.broadcastOffer(offer);
      setTimeout(resolve, 3000);
    });

    await new Promise( async (resolve) => {
      console.log("initialize taker");
      taker = await Pintswap.initialize({ signer: takerSigner });
      await taker.startNode();
      try {
        await taker.subscribeOffers();
      }
      catch (error) {
        console.log(error);
      } 
      setTimeout(resolve, 3000);
    });
  });

  it("Taker should subscribe to offers and maker should see him", async function () {
    await new Promise((resolve) => setTimeout(resolve, 6000));
    let peer_ids = maker.pubsub.getSubscribers('/pintswap/0.1.0/publish-orders');
    await new Promise((resolve) => setTimeout(resolve, 6000));
    expect(peer_ids).to.include(taker.peerId.toB58String());
  })

  it("Maker should try pubsub", async function () {
    await new Promise(async (resolve) => {
      // await maker.pubsub.publish('test', new Uint8Array([ 10, 43, 20]))
      maker.startPublishingOffers(1000);
      setTimeout(resolve, 6000);
    });
  })
})
*/
