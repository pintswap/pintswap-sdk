const { Pintswap, keyshareToAddress, hashOffer, wrapEth, setFallbackWETH } = require("../lib");
const { expect } = require("chai");
const WETH9 = require("canonical-weth/build/contracts/WETH9.json");

// Mock Vars
const mockKeyshareJson =  {
  x2: 'd9f4cd619911ff7e10cd352885b037db2778c77744881efb02ca1b42d67bbf9f',
  Q: {
    curve: 'secp256k1',
    x: 'adf4ad50f28a8938b64c3c3ddb17590f2eb80de842787444bf8cf5915ab73f9b',
    y: '2b33ae157649838e70592e871f8da3e02008eafa37ca8fdbe226988b1f5c15da'
  },
  pailPubKey: {
    n: '52b03f881aea0de8307109fe9173659bbf0c7d7adbe48111e3462f146263ed42ccb97c3cac3273d5d39b149bec2186bd81a308b588cdd59bdbe2e58c2cb6f1b08fb4014fdf97f42775886c8f6545e15aa1f582fbaefe9e854f272e108cb6095fe8f337b4235e12a24c596952c3ecc7a0525f10d73894e3f9976b42002b30dc52c64a655fd751ff90802113e395996ec9a420ecabdb07acc245edbac19d7ea35ac603a1f3bf80bc31906f04693c779e28af3d823c058ff0b18d39daa9bba0d4187c3ede2402d7bf2f6304773a9f0a2b524f3732e7b6e2f3034f1874ae9610636167679a21e4f34b8076d441ac167bf77e40e43a79122558715bf62848f94ef65b',
    g: '52b03f881aea0de8307109fe9173659bbf0c7d7adbe48111e3462f146263ed42ccb97c3cac3273d5d39b149bec2186bd81a308b588cdd59bdbe2e58c2cb6f1b08fb4014fdf97f42775886c8f6545e15aa1f582fbaefe9e854f272e108cb6095fe8f337b4235e12a24c596952c3ecc7a0525f10d73894e3f9976b42002b30dc52c64a655fd751ff90802113e395996ec9a420ecabdb07acc245edbac19d7ea35ac603a1f3bf80bc31906f04693c779e28af3d823c058ff0b18d39daa9bba0d4187c3ede2402d7bf2f6304773a9f0a2b524f3732e7b6e2f3034f1874ae9610636167679a21e4f34b8076d441ac167bf77e40e43a79122558715bf62848f94ef65c'
  },
  cypher_x1: '165bb077121664e7caed0ec3c661eabc77bf6e88bb5b7ee032786eadbb9eb6e4e10a2de80976df01df0a7fceb015e5c1d95e1bb24c469d86cb2209703294a60cdfd4067979e59dca3b36f0ce2287782984f1947b5035148774347e7645c6a59cf402e60cb11187edfd1be862a6298b37e8f34afc18f39bf3cfb88bb8fa4d4599c8107b0ae262ba0fe45d6811e1e96a339308473e63a12aa625074651ccd6d25f1deda4a34ebdd9b958be4dd1019a61d4ec1155967350bc8819be3c3d5dd85c3778d7246cc84472949dc7c4e070459618894ccd1422d518c804b355eb358e6dcfbbeab6d025e36c0529b12c4b0d1f97a40f1cba7b1c6e673b2760629b6b5227ba37f4be6f109998e5699f2b8f8368051ea461189ecab5feff725e3c26422b5145ba04c3b5aa1f8025360fe847a33885adce194d9f80c906d2ed6d8fb8c1703e4c322f4e96326475584aeae1576de097291d181b838196e5f4340748a17aaac33ab42b1505a1ff4b92de36b4421c8c74ee9364f00bd68b32d33f3d2409c25dddc3c52744f4e21fa28ec8abff597d463083bde16347d907cb55060467bb3edc45e4cf5ade4516c33f087031f70ea00cf94f65d3f23d461a8cd52f277fca9c2406e60710d1708a28b3656df494b1d819998865012aa1b8c7259e091bb84cdaa4e52f08200c40dcbce9e2e34b66b5899d303e6414538c3354666c5373d46081b67d9e'
}

describe("Pintswap - Unit Tests", function() {
  let ownerSigner, makerSigner, takerSigner;
  let offer, offerHash;
  let maker, taker;
  let makerToken, takerToken;
  let sharedAddress;

  before(async function() {
    const [owner, signer1, signer2] = await ethers.getSigners();
    makerSigner = signer1; takerSigner = signer2; ownerSigner = owner;

    const TestERC20 = await ethers.getContractFactory("TestToken", ownerSigner);
    makerToken = await TestERC20.deploy(ethers.utils.parseEther('1000'), "Token1", "TK1");

    let TakerTestERC20 = await ethers.getContractFactory("TestToken", ownerSigner);
    takerToken = await TakerTestERC20.deploy(ethers.utils.parseEther('1000'), "Token2", "TK2");

    offer = {
      givesToken: makerToken.address,
      getsToken: takerToken.address,
      givesAmount: ethers.utils.parseUnits("100.0", 18).toHexString(),
      getsAmount: ethers.utils.parseUnits("100.0", 18).toHexString()
    }

    await new Promise(async (resolve) => {
      maker = await Pintswap.initialize({ signer: makerSigner });
      await maker.startNode();
      maker.on("peer:discovery", async (peer) => {
        console.log(
          `Maker:: found peer with id: ${peer}`
        )
      })
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
  })

  it("should create an appropriate hash for offer", async function() {
    offerHash = hashOffer(offer);
    expect(offerHash).to.contain('0x');
    expect(offerHash.length).to.be.equal(66);
  })

  it("should create an appropriate shared address", async function() {
    sharedAddress = keyshareToAddress(mockKeyshareJson);
    expect(sharedAddress).to.contain('0x');
    expect(sharedAddress.length).to.be.equal(42);
  })

  it("should wrap ETH before approval", async function() {
    const WETH = new ethers.ContractFactory(WETH9.abi, WETH9.bytecode, makerSigner);
    weth = await WETH.connect(makerSigner).deploy();
    weth = await weth.deployed();
    setFallbackWETH(weth.address);

    let balance = ethers.utils.formatEther(await weth.balanceOf(makerSigner.address));
    expect(balance).to.equal('0.0');

    const wrappingRes = await wrapEth(makerSigner, offer.givesAmount);
    balance = ethers.utils.formatEther(await weth.balanceOf(makerSigner.address));

    expect(balance).to.equal('100.0')
    expect(wrappingRes).to.equal(true);
  })

  it("should get tradeAddress and approve token spend on both maker and taker", async function() {
    const tradeAddress = await maker.getTradeAddress(sharedAddress)
    let allowance = ethers.utils.formatEther(await makerToken.allowance(makerSigner.address, tradeAddress))
    expect(allowance).to.equal('0.0');
    const makerApprovalTx = await maker.approveTradeAsMaker(offer, sharedAddress);
    allowance = ethers.utils.formatEther(await makerToken.allowance(makerSigner.address, tradeAddress));
    expect(allowance).to.equal('100.0');
  })
})