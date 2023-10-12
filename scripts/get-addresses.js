const { computeAddresses } = require("../lib");
const { ethers } = require("ethers");

(async () => {
  const TEST_MNEMONIC = 'assume fitness moment future coin dutch wait join delay faint response skin';
  const addresses = computeAddresses(ethers.Wallet.fromPhrase(TEST_MNEMONIC).address);
  console.log("Contract Addresses", addresses);
})().catch(err => console.log(err))