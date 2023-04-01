// export function toEIP712 () {
//     return {
//         types: {
//             EIP712Domain: TODO(),
//             Permit: getPermitSignature() 
//         },
//         primaryType: "Permit",
//         domain: getDomain(offer, signer, chainId, isMaker),
//         message: TODO()
//     }
// }
// export function getPermitSignature (chainId, offer) {
//     switch (todo()) {
//         case todo(): 
//             return PERMIT_HOLDER_SYNTAX;
//             break
//         case todo():
//             return PERMIT_OWNER_SYNTAX;
//             break;
//         default:
//             break;
//     }
// }
// export const PERMIT_HOLDER_SYNTAX = [
//     {
//         name: "holder",
//         type: "address",
//     },
//     {
//         name: "spender",
//         type: "address",
//     },
//     {
//         name: "nonce",
//         type: "uint256",
//     },
//     {
//         name: "expiry",
//         type: "uint256",
//     },
//     {
//         name: "allowed",
//         type: "bool",
//     },
// ];
// export const PERMIT_OWNER_SYNTAX = [
//     {
//         name: "owner",
//         type: "address"
//     },
//     { 
//         name: "spender",
//         type: "address"
//     },
//     {
//         name: "value",
//         type: "uint256"
//     },
//     {
//         name: "nonce",
//         type: "uint256"
//     },
//     {
//         name: "deadline",
//         type: "uint256"
//     }
// ];
// export function getDomain(offer, chainId, signer, isMaker = true) {
//     let verifyingContract = isMaker ? offer.givesToken : offer.getsToken;
//     let contractName = ethers.Contract(verifyingContract, ["function name() public view returns (string)"], signer).name();
//     switch (chainId) {
//         case 137:
//             return {
//                 name: contractName, 
//                 version: "1"
//                 verifyingContract: verifyingContract
//                 salt: hexZeroPad(
//                     BigNumber.from(String(chainId) || "1").toHexString(),
//                     32
//                 )
//             };
//         default:
//             return: {
//                 name: contractName,
//                 version: "1",
//                 chainId: chainId,
//                 verifyingContract: verifyingContract
//             }
//     } 
// }
//# sourceMappingURL=permit.js.map