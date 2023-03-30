const hre = require('hardhat');
const ethers = hre.ethers;
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const { Pintswap, hashOffer } = require('../lib');
const argv = yargs(hideBin(process.argv))
  .string(['wallet'])
  .boolean(['mockMaker', 'mockTaker'])
  .argv;



async function main() {
  if (!argv.wallet) throw new Error('invalid usage, use `yarn hardhat run --network localhost scripts/client-test.js --wallet=<your-wallet-address>`');

  console.log(
    `funding wallet: ${ argv.wallet } with 6000 ETH`
  );

  await hre.network.provider.request({
    method: 'hardhat_impersonateAccount',
    params: [argv.wallet],
  });

  await hre.network.provider.send('hardhat_setBalance', [
    argv.wallet,
    ethers.utils.hexValue(ethers.utils.parseEther("100.0"))
  ]);

  const client = await ethers.getSigner(argv.wallet);

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

    const maker = await Pintswap.initialize({ signer: makerSigner });

    const offer = { 
      givesToken: makerOwnedTestToken.address,
      getsToken: testToken.address,
      givesAmount: ethers.utils.parseUnits("50.0").toHexString(),
      getsAmount: ethers.utils.parseUnits("50.0").toHexString()
    }

    console.log(
      ` constructing offer \n
        Offer<IOffer> : { \n
        \t givesToken: ${ makerOwnedTestToken.address }, \n
        \t getsTokens: ${ testToken.address }, \n
        \t givesAmount: ${ ethers.utils.parseUnits("50.0").toHexString() }, \n
        \t getsAmounts: ${ ethers.utils.parseUnits("50.0").toHexString() }, \n

        offerHash: ${ hashOffer(offer) }
        mock maker multiaddr: ${ maker.peerId.toB58String() }
      }`
    );

    maker.broadcastOffer(offer);

    maker.on("peer:discovered", (peer) => {
      console.log(
        `found peer: ${ peer } in test maker`
      );
    }); 

    console.log("test maker starting...");
    await maker.startNode();
  }
  //=====> test maker

  console.log(
    `Done! if your using metamask add token: ${ testToken.address } to your tokens list...`
  );

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
