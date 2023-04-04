const WETH9 = require("canonical-weth/build/contracts/WETH9.json");
const { expect } = require("chai");
const { wrapEther } = require("../lib");

describe('ETH to WETH', () => {
  let weth; 
  let signer, owner;

  beforeEach(async () => {
    [owner, signer] = await ethers.getSigners();
    
    const WETH = new ethers.ContractFactory(WETH9.abi, WETH9.bytecode, owner);
    weth = await WETH.deploy();

    console.log(signer)
  })

  it('should wrap ETH', async () => {
    let balance = await weth.balanceOf(await signer.getAddress())
    expect(balance).to.be.equal(ethers.utils.parseEther('0'));

    const wrapTx = await wrapEther(signer, '31337', '5');

    balance = await weth.balanceOf(await signer.getAddress())
    expect(balance).to.be.equal(ethers.utils.parseEther('5'));
  })
})