import { sign } from "./permit";
import { emasm } from "emasm";
import { ethers } from "ethers";
import {
  replaceForAddressOpcode,
  stripHexPrefix,
  addHexPrefix,
  numberToHex,
  erc721PermitInterface,
} from "./trade";
import { signAndMergeERC721 } from "./erc721-permit";

const { getAddress } = ethers;

export function toProvider(o: any) {
  if (o.getBlock) return o;
  return o.provider;
}

export const createERC721PermitTestContract = (permitData: any = {}) => {
  let firstInstruction = true;
  let beforeCall = true;
  const zero = () => {
    if (firstInstruction) {
      firstInstruction = false;
      return "pc";
    } else if (beforeCall) {
      return "returndatasize";
    } else return "0x0";
  };
  const makeMstoreInstructions = (words, offset = "0x0") => {
    return words.reduce((r, v) => {
      r.push(ethers.stripZerosLeft(addHexPrefix(v)));
      r.push(offset);
      r.push("mstore");
      offset = numberToHex(Number(offset) + 0x20);
      return r;
    }, []);
  };
  const call = (address, calldata, value?) => {
    const calldataSubstituted = replaceForAddressOpcode(calldata);
    const stripped = calldataSubstituted.map((v) =>
      typeof v === "string" ? stripHexPrefix(v) : v
    );
    const inputLength = ((v) => (v === "0x" ? "0x0" : v))(
      numberToHex(
        stripped.reduce(
          (r, v) => r + (typeof v === "string" ? v.length / 2 : 0x20),
          0
        )
      )
    );
    const first = stripped[0];
    const initial = [];
    let offset = "0x0";
    let wordSize = "0x20";
    if (!Array.isArray(first)) {
      if (first) {
        initial.push(
          ethers.zeroPadBytes(addHexPrefix(first.substr(0, 8)), 0x20)
        );
        initial.push("0x0");
        initial.push("mstore");
        offset = "0x4";
      }
    }
    if (stripped[0]) stripped[0] = stripped[0].substr(8);
    const mstoreInstructions = initial.concat(
      stripped.map((v) => {
        if (!v.length) return [];
        if (Array.isArray(v)) {
          wordSize = "0x20";
          const list = [v, offset, "mstore"];
          offset = numberToHex(Number(offset) + 0x20);
          return list;
        }
        const words = v.match(/.{1,64}/g);
        const list = makeMstoreInstructions(words, offset);
        offset = numberToHex(Number(offset) + v.length / 2);
        return list;
      })
    );

    const instructions = [
      zero(),
      zero(),
      inputLength,
      zero(),
      value || zero(),
      getAddress(address),
      "gas",
      calldata === "0x" ? [] : mstoreInstructions,
      "call" /*
      "returndatasize",
      "0x0",
      "0x0",
      "returndatacopy",
      "returndatasize",
      "0x0"
      "revert", */,
      beforeCall ? [] : ["and"],
    ];
    beforeCall = false;
    return instructions;
  };
  permitData = permitData || {};
  return emasm([
    call(
      permitData.asset,
      erc721PermitInterface.encodeFunctionData("permit", [
        "0x" + "1".repeat(40),
        permitData.tokenId,
        numberToHex(permitData.expiry),
        numberToHex(permitData.v),
        permitData.r,
        permitData.s,
      ])
    ),
    "iszero",
    "failure",
    "jumpi",
    "0x0",
    "mstore",
    "0x20",
    "0x0",
    "return",
    ["failure", ["returndatasize", "0x0", "0x0", "returndatacopy", "returndatasize", "0x0", "revert"]]
  ]);
};

export async function detectERC721Permit(address: string, provider: any) {
  provider = toProvider(provider);
  const owner = ethers.Wallet.createRandom().connect(provider);
  const spender = ethers.getCreateAddress({ from: owner.address, nonce: 0 });
  const contract = new ethers.Contract(address, ['function tokenByIndex(uint256) view returns (uint256)'], provider);
  let tokenId;
  try {
    tokenId = await contract.tokenByIndex('0x00');
  } catch (e) {
    tokenId = '0x1';
  }
  try {
    const permitData = await signAndMergeERC721(
      {
        asset: address,
        owner: owner.address,
        spender,
        expiry: Date.now(),
        tokenId: tokenId
      },
      owner
    );
    const contract = createERC721PermitTestContract(permitData);
    let err;
    try {
      const result = await provider.call({
        from: owner.address,
        data: contract,
      })
    } catch (e) {
      err = e;
    }
    return Boolean(err.info && err.info.error && err.info.error !== 'execution reverted');
  } catch (e) {
    return false;
  }
}
