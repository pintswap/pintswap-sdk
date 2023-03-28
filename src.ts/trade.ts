import { IOffer } from "./types";
import { ethers } from "ethers"; 
import { emasm } from "emasm";
import BN from "bn.js";
const { 
    solidityPackedKeccak256,
    getAddress,
    computeAddress,
    hexlify
} = ethers

export function toBigInt(v) {
  if (v.toHexString) return v.toBigInt();
  return v;
}

export function keyshareToAddress (keyshareJsonObject) {
  let { Q } = keyshareJsonObject as any;
  let prepend = new BN(Q.y, 16).mod(new BN(2)).isZero() ? "0x02" : "0x03";
  let derivedPubKey = prepend + leftZeroPad(new BN(Q.x, 16).toString(16), 64);
  return computeAddress(derivedPubKey as string); 
}

export const hashOffer = (o) => {
  return solidityPackedKeccak256(
    ["address", "address", "uint256", "uint256"],
    [
      getAddress(o.givesToken),
      getAddress(o.getsToken),
      o.givesAmount,
      o.getsAmount,
    ]
  );
};

export const createContract = (offer: IOffer, maker: string, taker: string) => {
  return emasm([
    "pc",
    "returndatasize",
    "0x64",
    "returndatasize",
    "returndatasize",
    getAddress(offer.givesToken),
    "0x23b872dd00000000000000000000000000000000000000000000000000000000",
    "returndatasize",
    "mstore",
    getAddress(maker),
    "0x4",
    "mstore",
    getAddress(taker),
    "0x24",
    "mstore",
    hexlify(offer.givesAmount),
    "0x44",
    "mstore",
    "gas",
    "call",
    "0x0",
    "0x0",
    "0x64",
    "0x0",
    "0x0",
    getAddress(offer.getsToken),
    getAddress(taker),
    "0x4",
    "mstore",
    getAddress(maker),
    "0x24",
    "mstore",
    hexlify(offer.getsAmount),
    "0x44",
    "mstore",
    "gas",
    "call",
    "and",
    "failure",
    "jumpi",
    getAddress(maker),
    "selfdestruct",
    ["failure", ["0x0", "0x0", "revert"]],
  ]);
};

export function leftZeroPad(s, n) { 
  return '0'.repeat(n - s.length) + s; 
}
