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

    await new Promise(async (resolve) => {
      maker = await Pintswap.initialize({ signer: makerSigner });
      await maker.startNode();
      maker.on("peer:discovery", async (peer) => {
        console.log(
          `Maker:: found peer with id: ${peer}`
        )
      })
      maker.broadcastOffer(offer);
      setTimeout(resolve, 4000);
    });

    await new Promise(async (resolve) => {
      taker = await Pintswap.initialize({ signer: takerSigner });
      await taker.startNode();
      taker.on("peer:discovery", async (peer) => {
        console.log(
          `Taker:: found peer with id: ${peer}`
        )
      })
      setTimeout(resolve, 4000);
    });
  });

  it("`Maker` should be started", async function () {
    expect(maker.isStarted()).to.be.equal(true);
  });

  it("`Maker` should dialProtocol `Taker` to create a trade", async function () {
    console.log("MAKER PEER ID", maker.peerId)
    let val = await taker.createTrade(maker.peerId, offer);
    expect(val).to.be.equal(true);
  })

});
