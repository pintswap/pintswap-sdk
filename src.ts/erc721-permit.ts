import {
  ZeroAddress,
  getUint,
  hexlify,
  Signature,
  Contract,
  zeroPadValue,
  decodeBase64,
  toBeArray,
  getAddress,
} from "ethers";
import { protocol } from "./protocol";
import { mapValues } from "lodash";

export function getMessage(request) {
  const address = getAddress(request.asset);
  const chainId = toChainId(toNetwork(address));
  return {
    spender: request.spender,
    nonce: request.nonce,
    deadline: request.expiry,
    tokenId: request.tokenId,
  };
}

export function getDomainStructure(asset) {
  return [
    {
      name: "name",
      type: "string",
    },
    {
      name: "version",
      type: "string",
    },
    {
      name: "chainId",
      type: "uint256",
    },
    {
      name: "verifyingContract",
      type: "address",
    },
  ];
}

export async function getVersion(contract) {
  try {
    return await contract.version();
  } catch (e) {
    try {
      return await contract.VERSION();
    } catch (e) {
      return "1";
    }
  }
}

export async function fetchData(o, provider) {
  const contract = new Contract(
    o.asset,
    [
      "function nonces(uint256) view returns (uint256)",
      "function name() view returns (string)",
      "function version() view returns (string)",
      "function VERSION() view returns (string)",
    ],
    provider
  );

  return {
    ...o,
    nonce: await contract.nonces(o.tokenId),
    name: await contract.name(),
    version: await getVersion(contract),
  };
}

export function getPermitStructure(asset) {
  return [
    {
      name: "spender",
      type: "address",
    },
    {
      name: "tokenId",
      type: "uint256",
    },
    {
      name: "nonce",
      type: "uint256",
    },
    {
      name: "deadline",
      type: "uint256",
    },
  ];
}

export function toChainId(network) {
  switch (network) {
    case "MATIC":
      return 137;
    case "ETHEREUM":
      return 1;
    case "AVALANCHE":
      return 43114;
    case "ARBITRUM":
      return 42161;
    case "OPTIMISM":
      return 10;
    default:
      return 1;
  }
}

export function toNetwork(asset) {
  return "ETHEREUM";
  /*
  const address = getAddress(asset);
  return (Object.entries({}).find(([network, assets]) => {
    if (Object.values(assets).find((asset) => getAddress(asset) === address))
      return network;
  }) || [null])[0];
 */
}

export function getDomain(o) {
  const asset = o.asset;
  const address = getAddress(asset);
  const chainId = toChainId(toNetwork(address));
  return {
    name: o.name,
    version: o.version || "1",
    chainId: String(chainId),
    verifyingContract: address,
  };
}

export function toEIP712(o) {
  return {
    types: {
      EIP712Domain: getDomainStructure(o.asset),
      Permit: getPermitStructure(o.asset),
    },
    primaryType: "Permit",
    domain: getDomain(o),
    message: getMessage(o),
  };
}

export function splitSignature(data) {
  const signature = Signature.from(data);
  return {
    v: Number(signature.v),
    r: hexlify(signature.r),
    s: hexlify(signature.s),
  };
}

export function joinSignature(data) {
  const signature = Signature.from(data);
  return signature.serialized;
}

export async function signAndMergeERC721(o, signer) {
  const signature = await signERC721Permit(o, signer);
  return {
    ...o,
    ...signature,
  };
}

export async function signTypedData(signer, ...payload) {
  if (signer.signTypedData) return await signer.signTypedData(...payload);
  else return await signer._signTypedData(...payload);
}

export async function signERC721Permit(o, signer) {
  if (!o.nonce || !o.name) o = await fetchData(o, signer);
  try {
    const payload = toEIP712(o);
    delete payload.types.EIP712Domain;
    const sig = await signTypedData(
      signer,
      payload.domain,
      payload.types,
      payload.message
    );
    return splitSignature(joinSignature(splitSignature(sig)));
  } catch (e) {
    console.error(e);
    return splitSignature(
      await signer.provider.send("eth_signTypedData_v4", [
        await signer.getAddress(),
        toEIP712(o),
      ])
    );
  }
}

const coercePredicate = (v) =>
  typeof v === "number"
    ? Buffer.from(toBeArray(getUint(v)))
    : Buffer.from(toBeArray(hexlify(String(v))));

export function encode(request) {
  if (request.v) {
    return protocol.PermitData.encode({
      permit1Data: mapValues(
        { v: request.v, r: request.r, s: request.s, expiry: request.expiry },
        coercePredicate
      ),
    }).finish();
  } else {
    return protocol.PermitData.encode({
      permit2Data: mapValues(
        {
          deadline: request.signatureTransfer.deadline,
          nonce: request.signatureTransfer.nonce,
          signature: request.signature,
        },
        coercePredicate
      ),
    }).finish();
  }
}

export function decode(data) {
  const decoded = protocol.PermitData.toObject(
    protocol.PermitData.decode(data),
    {
      enums: String,
      longs: String,
      bytes: String,
      defaults: true,
      arrays: true,
      objects: true,
      oneofs: true,
    }
  );
  const permitData = mapValues(decoded[decoded.data], (v) =>
    hexlify(decodeBase64(v))
  );
  if (permitData.v) {
    return {
      expiry: Number(permitData.expiry),
      v: Number(permitData.v),
      r: zeroPadValue(permitData.r, 32),
      s: zeroPadValue(permitData.s, 32),
    };
  } else {
    return {
      signatureTransfer: {
        nonce: permitData.nonce,
        deadline: Number(permitData.deadline),
      },
      signature: permitData.signature,
    };
  }
}
