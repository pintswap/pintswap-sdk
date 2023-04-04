const hre = require('hardhat');
const ethers = hre.ethers;
const ethersModule = require('ethers');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { Pintswap, hashOffer } = require('../lib');
const helpers = require("@nomicfoundation/hardhat-network-helpers");
const argv = yargs(hideBin(process.argv))
  .boolean(['mockMaker', 'mockTaker'])
  .argv;

async function main() {
  const WALLET = process.env.WALLET || "0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199";
  console.log(
    `Funding Wallet (${WALLET}) with 6000 ETH \n`
  );

  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [WALLET],
  });

  await hre.network.provider.send('hardhat_setBalance', [
    WALLET,
    ethers.utils.hexValue(ethers.utils.parseEther("1000.0"))
  ]);

  const client = await ethers.getSigner(WALLET);

  const TestTokenContractFactory = await ethers.getContractFactory('TestToken');

  const testToken = await TestTokenContractFactory.connect(client)
    .deploy(ethers.utils.parseEther('6000.0'), "DAI", "DAI");

  await testToken.deployed();

  // =====> test maker
  if (argv.mockMaker) {
    // mint maker owned token
    let [ makerSigner ] = await ethers.getSigners();
    const makerOwnedTestToken = await TestTokenContractFactory.connect(makerSigner)
      .deploy(ethers.utils.parseEther('6000.0'), "Wrapped Bitcoin", "WBTC");

    await makerOwnedTestToken.deployed();

    const maker = await Pintswap.initialize({ signer: await (new ethersModule.JsonRpcProvider('http://localhost:8545').getSigner(0)) });

    const offer = { 
      givesToken: makerOwnedTestToken.address,
      getsToken: testToken.address,
      givesAmount: ethers.utils.parseUnits("50.0").toHexString(),
      getsAmount: ethers.utils.parseUnits("50.0").toHexString()
    }

    console.log(`
      Offer<IOffer> : {
      \t givesToken: ${ makerOwnedTestToken.address },
      \t getsTokens: ${ testToken.address },
      \t givesAmount: ${ ethers.utils.parseUnits("50.0").toHexString() },
      \t getsAmounts: ${ ethers.utils.parseUnits("50.0").toHexString() },
      }\n`
    );

    console.log(`
      Offer Hash: ${ hashOffer(offer) } \n
      Mock Maker MultiAddress: ${ maker.peerId.toB58String() } \n
      URL: http://localhost:3000/#/${maker.peerId.toB58String()}/${hashOffer(offer)} \n
      ${!process.env.WALLET ? `Test Wallet Private Key: ${WALLET}` : ``} \n
    `)

    maker.broadcastOffer(offer);
    console.log("Offer broadcasted...");

    maker.on("peer:discovered", (peer) => {
      console.log(
        `found peer: ${ peer } in test maker`
      );
    }); 

    await maker.startNode();
    console.log("Mock maker started...");
  }
  //=====> test maker
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
