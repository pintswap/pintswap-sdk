import { ethers } from "ethers";
import "@nomicfoundation/hardhat-toolbox";

/** @type import('hardhat/config').HardhatUserConfig */
export default {
  solidity: {
    compilers: [
      {
        version: "0.7.6",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      }]
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
