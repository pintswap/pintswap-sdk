const ethers = require('ethers');
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version:"0.8.18",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  mocha: {
    timeout: 0
  },
  networks: {
    hardhat: {
      forking: { 
        url: new ethers.InfuraProvider('mainnet')._getConnection().url
      },
      chainId: 1
    }
  }
};
