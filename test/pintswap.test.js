const { 
  time,
  loadFixture
} = require("@nomicfoundation/hardhat-network-helpers");
const { anyValue } = require("@nomicfoundation/hardhat-chai-matchers/withArgs");
const { expect } = require("chai");
const { Pintswap } = require("../lib");
const { toB58String } = require("peer-id");
const { multiaddr } = require("multiaddr");
const { PintP2P } = require("../lib"); 


describe("Pintswap", function () {
  // this.timeout("120000"); // one minute timeout
  let tt1; // test token held by maker
  let tt2; // test token held by taker
  let offer;


  let maker;
  let taker;

  async function setupTestEnv() {
    const [ maker, taker ] = await ethers.getSigners();

    const TestERC20 = await ethers.getContractFactory("TestToken", maker);
    tt1 = await TestERC20.deploy(ethers.utils.parseEther('1000'), "Token1", "TK1");

    let TakerTestERC20 = await ethers.getContractFactory("TestToken", taker);
    tt2 = await TakerTestERC20.deploy(ethers.utils.parseEther('1000'), "Token2", "TK2");

    offer = {
      givesToken: tt1.address,
      getsToken: tt2.address,
      givesAmount: ethers.utils.parseUnits("100.0").toHexString(),
      getsAmount: ethers.utils.parseUnits("100.0").toHexString()
    }
  }

  before(async function() {
    await setupTestEnv()
    const [ makerSigner, takerSigner ] = await ethers.getSigners();
    maker = await Pintswap.initialize({ signer: makerSigner });
    taker = await Pintswap.initialize({ signer: takerSigner })
    await maker.startNode();
    await taker.startNode();

    await new Promise((resolve) => {

      maker.on("peer:discovery", async (peer) => {
        console.log(
          `found peer with id: ${peer}`
        )
      })

      setTimeout(resolve, 4000);
    })
    maker.listOffer(offer);
  })

	/*
  afterEach(async function() {
    const [makerSigner, takerSigner ] = await ethers.getSigners();
    console.log(
      await tt1.balanceOf(makerSigner.address),
      await tt1.balanceOf(takerSigner.address),
      await tt2.balanceOf(makerSigner.address),
      await tt2.balanceOf(takerSigner.address)
    )
    await maker.stop()
    await taker.stop()
  })
  */

	/*
  it("should test to make sure `Offer` is correctly formatted", function () {
    console.log(offer);
  });
  */


  it("`Maker` should dialProtocol `Taker` to create a trade", async function () {
    // console.log(maker.peerId)
    // let makerMultiaddr = new multiaddr(PintP2P.PRESETS.MAINNET + maker.peerId.toB58String())
    let val = await taker.createTrade(maker.peerId, offer);
    expect(val).to.be.equal(true);
  })

});
