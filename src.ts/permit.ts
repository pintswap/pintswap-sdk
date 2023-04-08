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

export const ASSETS = {
  MATIC: {
    USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  },
  ARBITRUM: {
    USDC: "0xff970a61a04b1ca14834a43f5de4533ebddb5cc8",
  },
  ETHEREUM: {
    USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
  },
  AVALANCHE: {
    USDC: "0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664",
  },
  OPTIMISM: {
    USDC: "0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174",
  },
};

export function getMessage(request) {
  const address = getAddress(request.asset);
  const chainId = toChainId(toNetwork(address));
  if (isUSDC(address) && chainId !== 43114) {
    return {
      owner: request.owner,
      spender: request.spender,
      nonce: request.nonce,
      deadline: request.expiry,
      value: request.value,
    };
  }
  return {
    holder: request.owner,
    spender: request.spender,
    nonce: request.nonce,
    expiry: request.expiry,
    allowed: "true",
  };
}

export function getDomainStructure(asset) {
  return getAddress(asset) === getAddress(ASSETS.MATIC.USDC)
    ? [
        {
          name: "name",
          type: "string",
        },
        {
          name: "version",
          type: "string",
        },
        {
          name: "verifyingContract",
          type: "address",
        },
        {
          name: "salt",
          type: "bytes32",
        },
      ]
    : [
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

export async function fetchData(o, provider) {
  const contract = new Contract(
    o.asset,
    [
      "function nonces(address) view returns (uint256)",
      "function name() view returns (string)",
    ],
    provider
  );
  return {
    ...o,
    nonce: await contract.nonces(o.owner),
    name: await contract.name(),
  };
}

export function isUSDC(asset) {
  return Object.values(ASSETS)
    .map((v) => getAddress(v.USDC))
    .includes(getAddress(asset));
}

export function getPermitStructure(asset) {
  if (
    isUSDC(asset) &&
    getAddress(asset) !== getAddress(ASSETS.AVALANCHE.USDC)
  ) {
    return [
      {
        name: "owner",
        type: "address",
      },
      {
        name: "spender",
        type: "address",
      },
      {
        name: "value",
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
  return [
    {
      name: "holder",
      type: "address",
    },
    {
      name: "spender",
      type: "address",
    },
    {
      name: "nonce",
      type: "uint256",
    },
    {
      name: "expiry",
      type: "uint256",
    },
    {
      name: "allowed",
      type: "bool",
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
      throw Error("No network: " + network);
  }
}

export function toNetwork(asset) {
  const address = getAddress(asset);
  return (
    (Object.entries(ASSETS).find(([network, assets]) => {
      if (Object.values(assets).find((asset) => getAddress(asset) === address))
        return network;
    }) || [null])[0]
  );
}

export function getDomain(o) {
  const asset = o.asset;
  const address = getAddress(asset);
  const chainId = toChainId(toNetwork(address));
  if (isUSDC(address)) {
    if (chainId === 137) {
      return {
        name: "USD Coin (PoS)",
        version: "1",
        verifyingContract: address,
        salt: zeroPadValue(hexlify(String(chainId) || "1"), 32),
      };
    }
    if (chainId === 42161) {
      return {
        name: "USD Coin (Arb1)",
        version: "1",
        chainId: String(chainId),
        verifyingContract: address,
      };
    }
    return {
      name: "USD Coin",
      version: chainId === 43114 ? "1" : "2",
      chainId: String(chainId),
      verifyingContract: address,
    };
  }
  return {
    name: o.name,
    version: "1",
    chainId: String(chainId),
    verifyingContract: ZeroAddress,
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

export async function sign(o, signer) {
  console.log(o);
  const signature = await signPermit(o, signer);
  return {
    ...o,
    ...signature
  };
}

export async function signPermit(o, signer) {
  if (!o.nonce || !o.name) o = await fetchData(o, signer);
  console.log(o);
  try {
    const payload = toEIP712(o);
    delete payload.types.EIP712Domain;
    const sig = await signer._signTypedData(
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

export function encode(request) {
  const payload = protocol.PermitData.encode(
    mapValues({ v: request.v, r: request.r, s: request.s, expiry: request.expiry }, (v) =>
      typeof v === 'number' ? Buffer.from(toBeArray(getUint(v))) : Buffer.from(toBeArray(hexlify(String(v))))
    )
  ).finish();
  return payload;
}

export function decode(data) {
  const permitData = mapValues(
    protocol.PermitData.toObject(protocol.PermitData.decode(data), {
      enums: String,
      longs: String,
      bytes: String,
      defaults: true,
      arrays: true,
      objects: true,
      oneofs: true,
    }),
    (v) => hexlify(decodeBase64(v))
  );
  return {
    expiry: Number(permitData.expiry),
    v: Number(permitData.v),
    r: zeroPadValue(permitData.r, 32),
    s: zeroPadValue(permitData.s, 32),
  };
}
