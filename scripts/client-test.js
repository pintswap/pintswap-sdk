const hre = require('hardhat');
const ethers = hre.ethers;
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');
const argv = yargs(hideBin(process.argv))
  .string('wallet')
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


  console.log(
    `Done! please add token ${ testToken.address } to your list of tokens...`
  );

}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
