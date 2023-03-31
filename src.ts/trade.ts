import { IOffer } from "./types";
import { ethers } from "ethers"; 
import { emasm } from "emasm";
import BN from "bn.js";
import WETH9 from "canonical-weth/build/contracts/WETH9.json";
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

export const WETH_ADDRESSES = Object.assign(Object.entries(WETH9.networks).reduce((r, [ chainId, { address }]) => {
  r[chainId] = address;
  return r;
}, {}), {
  '1': '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
 '42161': '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
 '137': '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
 '10': '0x4200000000000000000000000000000000000006',
 '43112': '0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB'
});
  

export const toWETH = (chainId: number | string = 1) => {
  const chain = String(chainId);
  const address = WETH_ADDRESSES[chain];
  return address || (() => { throw Error('no WETH contract found for chainid ' + chain);})();
};


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

export const createContract = (offer: IOffer, maker: string, taker: string, chainId: string | number = 1) => {
  if (offer.givesToken === ethers.ZeroAddress) {
    return emasm([
      "pc",
       "returndatasize",
      "0x64",
      "returndatasize",
      "returndatasize",
      toWETH(chainId),
      "0x23b872dd00000000000000000000000000000000000000000000000000000000",
      "returndatasize",
      "mstore",
      getAddress(maker),
      "0x4",
      "mstore",
      "address",
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
      "0x0",
      "0x0",
      "0x24",
      "0x0",
      "0x0",
      toWETH(chainId),
      "0x3ccfd60b00000000000000000000000000000000000000000000000000000000",
      "0x0",
      "mstore",
      hexlify(offer.givesAmount),
      "0x4",
      "mstore",
      "gas",
      "call",
      "and",
      "0x0",
      "0x0",
      "0x0",
      "0x0",
      hexlify(offer.givesAmount),
      getAddress(taker),
      "gas",
      "call",
      "and",
      "failure",
      "jumpi",
      getAddress(maker),
      "selfdestruct",
      ["failure", ["0x0", "0x0", "revert"]],
    ]);
  }
  if (offer.getsToken === ethers.ZeroAddress) {
    return emasm([
      "pc",
       "returndatasize",
      "0x64",
      "returndatasize",
      "returndatasize",
      toWETH(chainId),
      "0x23b872dd00000000000000000000000000000000000000000000000000000000",
      "returndatasize",
      "mstore",
      getAddress(taker),
      "0x4",
      "mstore",
      "address",
      "0x24",
      "mstore",
      hexlify(offer.getsAmount),
      "0x44",
      "mstore",
      "gas",
      "call",
      "0x0",
      "0x0",
      "0x64",
      "0x0",
      "0x0",
      getAddress(offer.givesToken),
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
      "and",
      "0x0",
      "0x0",
      "0x24",
      "0x0",
      "0x0",
      toWETH(chainId),
      "0x3ccfd60b00000000000000000000000000000000000000000000000000000000",
      "0x0",
      "mstore",
      hexlify(offer.getsAmount),
      "0x4",
      "mstore",
      "gas",
      "call",
      "and",
      "0x0",
      "0x0",
      "0x0",
      "0x0",
      hexlify(offer.getsAmount),
      getAddress(maker),
      "gas",
      "call",
      "and",
      "failure",
      "jumpi",
      getAddress(taker),
      "selfdestruct",
      ["failure", ["0x0", "0x0", "revert"]],
    ]);
  }
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
