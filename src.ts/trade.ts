import { IOffer } from "./types";
import { BigNumberish, ethers, Signer } from "ethers";
import { emasm } from "emasm";
import BN from "bn.js";
import WETH9 from "canonical-weth/build/contracts/WETH9.json";
const { solidityPackedKeccak256, getAddress, computeAddress, hexlify } = ethers;

// UTILS
export function toBigInt(v) {
  if (v.toHexString) return v.toBigInt();
  return v;
}

export function keyshareToAddress(keyshareJsonObject) {
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

export function leftZeroPad(s, n) {
  return "0".repeat(n - s.length) + s;
}

export const genericAbi = [
  "function approve(address, uint256) returns (bool)",
  "function allowance(address, address) view returns (uint256)",
  "function balanceOf(address) view returns (uint256)",
];

export const defer = () => {
  let resolve,
    reject,
    promise = new Promise((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });
  return {
    resolve,
    reject,
    promise,
  };
};

export const transactionToObject = (tx) => ({
  nonce: tx.nonce,
  value: tx.value,
  from: tx.from,
  gasPrice: tx.gasPrice,
  gasLimit: tx.gasLimit,
  chainId: tx.chainId,
  data: tx.data,
  maxFeePerGas: tx.maxFeePerGas,
  maxPriorityFeePerGas: tx.maxPriorityFeePerGas,
});

// ETH/WETH
export const WETH_ADDRESSES = Object.assign(
  Object.entries(WETH9.networks).reduce((r, [chainId, { address }]: any) => {
    r[chainId] = address;
    return r;
  }, {}),
  {
    "42161": "0x82aF49447D8a07e3bd95BD0d56f35241523fBab1",
    "137": "0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619",
    "10": "0x4200000000000000000000000000000000000006",
    "43112": "0x49D5c2BdFfac6CE2BFdB6640F4F80f226bc10bAB",
  }
);

let fallbackWETH = null;
export const setFallbackWETH = (address) => {
  fallbackWETH = address;
}

export const coerceToWeth = async (address, signer) => {
  if (address === ethers.ZeroAddress) {
    const { chainId } = await signer.provider.getNetwork();
    return toWETH(chainId);
  }
  return address;
};

export const toWETH = (chainId: number | string = 1) => {
  const chain = String(chainId);
  const address = WETH_ADDRESSES[chain];
  return (
    address || fallbackWETH || (() => {
      throw Error("no WETH contract found for chainid " + chain);
    })()
  );
};

export const wrapEth = async (signer: Signer, amount: BigNumberish) => {
  try {
    const { chainId } = await signer.provider.getNetwork();
    await (new ethers.Contract(toWETH(chainId.toString()), ['function deposit()'], signer)).deposit({ value: amount });
    return true
  } catch (err) {
    console.error(err);
    return false;
  }
}

// SWAP CONTRACT
export const createContract = (
  offer: IOffer,
  maker: string,
  taker: string,
  chainId: string | number = 1,
  permitData: any = {}
) => {
  if (permitData.maker || permitData.taker) {
    if (permitData.maker && !permitData.taker) {
      if (offer.getsToken === ethers.ZeroAddress) {
        return emasm([
          "pc",
          "returndatasize",
          "0xe4",
          "returndatasize",
          "returndatasize",
          getAddress(offer.givesToken),
          "0xd505accf00000000000000000000000000000000000000000000000000000000",
          maker,
          "0x4",
          "mstore",
          "address",
          "0x24",
          "mstore",
          hexlify(offer.givesAmount),
          "0x44",
          "mstore",
          hexlify(permitData.maker.expiry),
          "0x64",
          "mstore",
          hexlify(permitData.maker.v),
          "0x84",
          "mstore",
          hexlify(permitData.maker.r),
          "0xa4",
          "mstore",
          hexlify(permitData.maker.s),
          "0xc4",
          "mstore",
          "gas",
          "call",
          "0x0",
          "0x0",
          "0x64",
          "0x0",
          "0x0",
          toWETH(chainId),
          "0x23b872dd00000000000000000000000000000000000000000000000000000000",
          "0x0",
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
          "and",
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
          "0x2e1a7d4d00000000000000000000000000000000000000000000000000000000",
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
	  "iszero",
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
        "0xe4",
        "returndatasize",
        "returndatasize",
        getAddress(offer.givesToken),
        "0xd505accf00000000000000000000000000000000000000000000000000000000",
        maker,
        "0x4",
        "mstore",
        "address",
        "0x24",
        "mstore",
        hexlify(offer.givesAmount),
        "0x44",
        "mstore",
        hexlify(permitData.maker.expiry),
        "0x64",
        "mstore",
        hexlify(permitData.maker.v),
        "0x84",
        "mstore",
        hexlify(permitData.maker.r),
        "0xa4",
        "mstore",
        hexlify(permitData.maker.s),
        "0xc4",
        "mstore",
        "gas",
        "call",
        "0x0",
        "0x0",
        "0x44",
        "0x0",
        "0x0",
        getAddress(offer.givesToken),
        "0x23b872dd00000000000000000000000000000000000000000000000000000000",
        "0x0",
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
        "and",
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
	"iszero",
        "failure",
        "jumpi",
        getAddress(maker),
        "selfdestruct",
        ["failure", ["0x0", "0x0", "revert"]],
      ]);
    } else if (permitData.taker && !permitData.maker) {
      if (offer.givesToken === ethers.ZeroAddress) {
        return emasm([
          "pc",
          "returndatasize",
          "0xe4",
          "returndatasize",
          "returndatasize",
          getAddress(offer.getsToken),
          "0xd505accf00000000000000000000000000000000000000000000000000000000",
          taker,
          "0x4",
          "mstore",
          "address",
          "0x24",
          "mstore",
          hexlify(offer.getsAmount),
          "0x44",
          "mstore",
          hexlify(permitData.taker.expiry),
          "0x64",
          "mstore",
          hexlify(permitData.taker.v),
          "0x84",
          "mstore",
          hexlify(permitData.taker.r),
          "0xa4",
          "mstore",
          hexlify(permitData.taker.s),
          "0xc4",
          "mstore",
          "gas",
          "call",
          "0x0",
          "0x0",
          "0x64",
          "0x0",
          "0x0",
          toWETH(chainId),
          "0x23b872dd00000000000000000000000000000000000000000000000000000000",
          "0x0",
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
          "and",
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
          "0x2e1a7d4d00000000000000000000000000000000000000000000000000000000",
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
	  "iszero",
          "failure",
          "jumpi",
          getAddress(maker),
          "selfdestruct",
          ["failure", ["0x0", "0x0", "revert"]],
        ]);
      }
      return emasm([
        "pc",
        "returndatasize",
        "0xe4",
        "returndatasize",
        "returndatasize",
        getAddress(offer.getsToken),
        "0xd505accf00000000000000000000000000000000000000000000000000000000",
        taker,
        "0x4",
        "mstore",
        "address",
        "0x24",
        "mstore",
        hexlify(offer.getsAmount),
        "0x44",
        "mstore",
        hexlify(permitData.taker.expiry),
        "0x64",
        "mstore",
        hexlify(permitData.taker.v),
        "0x84",
        "mstore",
        hexlify(permitData.taker.r),
        "0xa4",
        "mstore",
        hexlify(permitData.taker.s),
        "0xc4",
        "mstore",
        "gas",
        "call",
        "0x0",
        "0x0",
        "0x44",
        "0x0",
        "0x0",
        getAddress(offer.givesToken),
        "0x23b872dd00000000000000000000000000000000000000000000000000000000",
        "0x0",
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
        "and",
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
	"iszero",
        "failure",
        "jumpi",
        getAddress(maker),
        "selfdestruct",
        ["failure", ["0x0", "0x0", "revert"]],
      ]);
    } else {
      return emasm([
        "pc",
        "returndatasize",
        "0xe4",
        "returndatasize",
        "returndatasize",
        getAddress(offer.givesToken),
        "0xd505accf00000000000000000000000000000000000000000000000000000000",
        maker,
        "0x4",
        "mstore",
        "address",
        "0x24",
        "mstore",
        hexlify(offer.givesAmount),
        "0x44",
        "mstore",
        hexlify(permitData.maker.expiry),
        "0x64",
        "mstore",
        hexlify(permitData.maker.v),
        "0x84",
        "mstore",
        hexlify(permitData.maker.r),
        "0xa4",
        "mstore",
        hexlify(permitData.maker.s),
        "0xc4",
        "mstore",
        "gas",
        "call",
        "0x0",
        "0x0",
        "0xe4",
        "0x0",
        "0x0",
        getAddress(offer.getsToken),
        "0xd505accf00000000000000000000000000000000000000000000000000000000",
        taker,
        "0x4",
        "mstore",
        "address",
        "0x24",
        "mstore",
        hexlify(offer.getsAmount),
        "0x44",
        "mstore",
        hexlify(permitData.taker.expiry),
        "0x64",
        "mstore",
        hexlify(permitData.taker.v),
        "0x84",
        "mstore",
        hexlify(permitData.taker.r),
        "0xa4",
        "mstore",
        hexlify(permitData.taker.s),
        "0xc4",
        "mstore",
        "gas",
        "call",
        "0x0",
        "0x0",
        "0x44",
        "0x0",
        "0x0",
        getAddress(offer.givesToken),
        "0x23b872dd00000000000000000000000000000000000000000000000000000000",
        "0x0",
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
        "and",
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
	"iszero",
        "failure",
        "jumpi",
        getAddress(maker),
        "selfdestruct",
        ["failure", ["0x0", "0x0", "revert"]],
      ]);
    }
  }
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
      "0x2e1a7d4d00000000000000000000000000000000000000000000000000000000",
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
      "iszero",
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
      "0x2e1a7d4d00000000000000000000000000000000000000000000000000000000",
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
      "iszero",
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
    "iszero",
    "failure",
    "jumpi",
    getAddress(maker),
    "selfdestruct",
    ["failure", ["0x0", "0x0", "revert"]],
  ]);
};
