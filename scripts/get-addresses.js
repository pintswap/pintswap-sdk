const { computeAddresses, TEST_MNEMONIC } = require("../lib");
const { ethers } = require("ethers");

(async () => {
  const addresses = computeAddresses(ethers.Wallet.fromPhrase(TEST_MNEMONIC).address);
  console.log("Contract Addresses", addresses);
})().catch(err => console.log(err))