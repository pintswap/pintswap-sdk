const hre = require('hardhat');
const ethers = hre.ethers;
const ethersModule = require('ethers');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const WETH9 = require("canonical-weth/build/contracts/WETH9.json");
const { Pintswap, hashOffer, setFallbackWETH } = require('../lib');
const argv = yargs(hideBin(process.argv))
  .boolean(['mockMaker', 'mockTaker'])
  .argv;

async function main() {
  const testingEth = process.env.ETH ? true : false;
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
    // Mint maker owned token
    let [ makerSigner ] = await ethers.getSigners();

    let makerOwnedTestToken;
    let weth;
    if(testingEth) {
      const WETH9Factory = new ethers.ContractFactory(WETH9.abi, WETH9.bytecode, makerSigner);
      makerOwnedTestToken = await WETH9Factory.connect(makerSigner).deploy();
      weth = await makerOwnedTestToken.deployed();
      setFallbackWETH(weth.address);
      await weth.deposit({ value: '100' + '0'.repeat(18) });
    } else {
      makerOwnedTestToken = await TestTokenContractFactory.connect(makerSigner)
        .deploy(ethers.utils.parseEther('6000.0'), "Wrapped Bitcoin", "WBTC");
      await makerOwnedTestToken.deployed();
    }

    const maker = await Pintswap.initialize({ signer: await (new ethersModule.JsonRpcProvider('http://localhost:8545').getSigner(0)) });

    const offer = { 
      givesToken: testingEth ? '0x' + '0'.repeat(40) : makerOwnedTestToken.address,
      getsToken: testToken.address,
      givesAmount: ethers.utils.parseUnits("50.0").toHexString(),
      getsAmount: ethers.utils.parseUnits("50.0").toHexString()
    }

    console.log(`
      Offer<IOffer> : {
      \t givesToken: ${ testingEth ? ethers.constants.AddressZero : makerOwnedTestToken.address },
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
      ${process.env.ETH ? `WETH Address: ${weth.address}` : ''}
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
