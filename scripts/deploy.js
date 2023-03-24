import { ethers } from "hardhat";

async function main() {
  const TestToken = await ethers.getContractFactory("TestToken");
  const _testToken = await TestToken.deploy(100000, "TestToken1", "TTK1");

  await _testToken.deployed();

  await _testToken.transfer("0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199", 50000);

  console.log(
    `Test Token deployed to ${_testToken.address } `
  );

  const TestToken2 = await ethers.getContractFactory("TestToken");
  const _testToken2 = await TestToken2.deploy(100000, "TestToken2", "TTK2");

  await _testToken2.deployed();

  await _testToken2.transfer("0xdD2FD4581271e230360230F9337D5c0430Bf44C0", 50000);

  console.log(
    `Test Token 2 deployed to ${_testToken2.address }`
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
