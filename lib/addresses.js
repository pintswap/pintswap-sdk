"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeAndSaveAddresses = exports.computeAddresses = exports.TEST_MNEMONIC = exports.DEPLOYMENTS = void 0;
const ethers_1 = require("ethers");
exports.DEPLOYMENTS = {};
exports.TEST_MNEMONIC = 'assume fitness moment future coin dutch wait join delay faint response skin';
function computeAddresses(deployerAddress) {
    const result = {};
    result.OPPS = ethers_1.ethers.getCreateAddress({
        from: deployerAddress,
        nonce: 0
    });
    const pintDeployer = ethers_1.ethers.getCreateAddress({
        from: deployerAddress,
        nonce: 1
    });
    result.PINT = ethers_1.ethers.getCreateAddress({
        from: pintDeployer,
        nonce: 3
    });
    result.DEPLOYER = deployerAddress;
    return result;
}
exports.computeAddresses = computeAddresses;
function computeAndSaveAddresses(deployerAddress) {
    return Object.assign(exports.DEPLOYMENTS, computeAddresses(deployerAddress));
}
exports.computeAndSaveAddresses = computeAndSaveAddresses;
computeAndSaveAddresses(ethers_1.ethers.Wallet.fromPhrase(exports.TEST_MNEMONIC).address);
//# sourceMappingURL=addresses.js.map