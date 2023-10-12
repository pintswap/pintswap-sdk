import { ethers } from "ethers";

export const DEPLOYMENTS: any = {};

export const TEST_MNEMONIC =
  "assume fitness moment future coin dutch wait join delay faint response skin";

export function computeAddresses(deployerAddress: string) {
  const result: any = {};
  result.OPPS = ethers.getCreateAddress({
    from: deployerAddress,
    nonce: 0,
  });
  const pintDeployer = ethers.getCreateAddress({
    from: deployerAddress,
    nonce: 1,
  });
  result.PINT = ethers.getCreateAddress({
    from: pintDeployer,
    nonce: 3,
  });
  result.TRISRedemption = ethers.getCreateAddress({
    from: deployerAddress,
    nonce: 4,
  });
  result.WOCKRedemption = ethers.getCreateAddress({
    from: deployerAddress,
    nonce: 5,
  });
  result.DEPLOYER = deployerAddress;
  return result;
}

export function computeAndSaveAddresses(deployerAddress: string) {
  return Object.assign(DEPLOYMENTS, computeAddresses(deployerAddress));
}

computeAndSaveAddresses(ethers.Wallet.fromPhrase(TEST_MNEMONIC).address);
