const ethers = require('ethers');
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.18",
  mocha: {
<<<<<<< HEAD
    timeout: 0
  },
  networks: {
    localhost: {
      provider: new ethers.JsonRpcProvider('http://localhost:8545')
    }
=======
    timeout:0
>>>>>>> stable
  }
};
