"use strict";
import Mplex from "libp2p-mplex";
import { NOISE } from "libp2p-noise";
import KadDHT from "libp2p-kad-dht";
import Bootstrap from "libp2p-bootstrap";
import { ethers } from "ethers";
import PeerId from "peer-id";
import GossipSub from "libp2p-gossipsub";
import RelayConstants from "libp2p/src/circuit/constants";
import WStar from "libp2p-webrtc-star";
import isBrowser from "is-browser";
import { VoidSigner, hexlify, solidityPackedKeccak256 } from "ethers";
import Libp2p from "libp2p";
import crypto from "libp2p-crypto";
import wrtc from "wrtc";
import globalObject from "the-global-object";
import { Buffer } from "buffer";
import { mapValues } from "lodash";
import base64url from "base64url";
import { bech32 } from "bech32";
import { toB58String, fromB58String } from "multihashes";

export const VERSION = "1.0.0";

export function bufferToString(buf: Uint8Array): string {
  return new TextDecoder().decode(buf);
}

export function stringToBuffer(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

export function fromBufferToJSON(buf: Uint8Array): any {
  const stringified = bufferToString(buf);
  return JSON.parse(stringified);
}

export function fromJSONtoBuffer(obj: any): Uint8Array {
  const stringified = JSON.stringify(obj);
  return stringToBuffer(stringified);
}

const returnOp = (v) => v;

globalObject.Buffer = globalObject.Buffer || Buffer;

const mapToBuffers = (o) =>
  mapValues(o, (v) =>
    (base64url as any)(
      (v.toByteArray && Buffer.from(v.toByteArray())) ||
        hexlify(Buffer.from([v]))
    )
  );

export const cryptoFromSeed = async function (seed) {
  const key = await (crypto.keys.generateKeyPairFromSeed as any)(
    "ed25519",
    Buffer.from(
      ethers.toBeArray(ethers.solidityPackedKeccak256(["string"], [seed]))
    )
  );
  return crypto.keys.marshalPrivateKey(key);
  /*
  const key = mapToBuffers(await cryptico.generateRSAKey(seed, 2048));
  console.log('KEY', key);
  key.dp = key.dmp1;
  key.dq = key.dmq1;
  key.qi = key.coeff;
  return await crypto.keys.marshalPrivateKey(new (crypto.keys.supportedKeys.rsa.RsaPrivateKey as any)(key, key) as any);
 */
};

const coerceBuffersToHex = (v) => {
  if (v instanceof Uint8Array || Buffer.isBuffer(v)) return hexlify(v);
  if (Array.isArray(v)) return v.map(coerceBuffersToHex);
  if (typeof v === "object") {
    return Object.keys(v).reduce((r, key) => {
      r[key] = coerceBuffersToHex(v[key]);
      return r;
    }, {});
  }
  return v;
};

const coerceHexToBuffers = (v) => {
  if (typeof v === "string" && v.substr(0, 2) === "0x")
    return Buffer.from(v.substr(2), "hex");
  if (Array.isArray(v)) return v.map(coerceHexToBuffers);
  if (typeof v === "object") {
    return Object.keys(v).reduce((r, key) => {
      r[key] = coerceHexToBuffers(v[key]);
      return r;
    }, {});
  }
  return v;
};

export class PintP2P extends Libp2p {
  public signer: VoidSigner;
  public addressPromise: Promise<string>;
  static PRESETS = {
    MAINNET: "/dns4/p2p.diacetyl.is/tcp/443/wss/p2p-webrtc-star/",
  };
  static fromPresetOrMultiAddr(multiaddr) {
    return (
      this.PRESETS[(multiaddr || "").toUpperCase() || "MAINNET"] || multiaddr
    );
  }
  static toMessage(password) {
    return `Welcome to PintSwap!\n\nPintP2P v${VERSION}\n${solidityPackedKeccak256(
      ["string"],
      [`/pintp2p/${VERSION}/` + password]
    )}`;
  }
  static async peerIdFromSeed(seed) {
    const marshalled = await cryptoFromSeed(seed);
    return await PeerId.createFromPrivKey(marshalled);
  }
  static async fromSeed({ signer, seed, multiaddr }) {
    return new this({
      peerId: await this.peerIdFromSeed(seed),
      multiaddr,
      signer,
    });
  }
  static async fromPassword({ signer, multiaddr, password }) {
    return await this.fromSeed({
      signer,
      multiaddr,
      seed: await signer.signMessage(this.toMessage(password)),
    });
  }
  static PREFIX = "pint";
  get address() {
    return (this.constructor as any).toAddress(this.peerId.toB58String());
  }
  static toAddress(bufferOrB58) {
    let buf;
    if (typeof bufferOrB58 === "string") {
      if (bufferOrB58.substr(0, this.PREFIX.length) === this.PREFIX)
        return bufferOrB58;
      else buf = fromB58String(bufferOrB58);
    } else buf = bufferOrB58;
    return bech32.encode(this.PREFIX, bech32.toWords(buf));
  }
  static fromAddress(address) {
    if (
      typeof address === "string" &&
      address.substr(0, this.PREFIX.length) === this.PREFIX
    )
      return toB58String(
        Buffer.from(bech32.fromWords(bech32.decode(address).words))
      );
    console.log("ADDRESS", address);
    return address;
  }
  async start() {
    await super.start();
    await this.pubsub.start();
  }
  setSigner(signer) {
    this.signer = signer;
    this.addressPromise = this.signer
      ? this.signer.getAddress()
      : Promise.resolve(ethers.ZeroAddress);
  }
  constructor(options) {
    const multiaddr = PintP2P.fromPresetOrMultiAddr(
      options.multiaddr || "mainnet"
    );
    super({
      peerId: options.peerId,
      connectionManager: {
        minConnections: 25,
      },
      relay: {
        enabled: true,
        advertise: {
          bootDelay: RelayConstants.ADVERTISE_BOOT_DELAY,
          enabled: false,
          ttl: RelayConstants.ADVERTISE_TTL,
        },
        hop: {
          enabled: false,
          active: false,
        },
        autoRelay: {
          enabled: false,
          maxListeners: 2,
        },
      },
      addresses: {
        listen: [multiaddr],
      },
      modules: {
        transport: [WStar],
        streamMuxer: [Mplex],
        connEncryption: [NOISE],
        pubsub: GossipSub,
        peerDiscovery: [Bootstrap],
        dht: KadDHT,
      },
      // metrics: { // added metrics, do not add in production for performance boost
      //   enabled: true,
      //   computeThrottleMaxQueueSize: 1000,
      //   computeThrottleTimeout: 2000,
      //   movingAverageIntervals: [
      //     60 * 1000, // 1 minute
      //     5 * 60 * 1000, // 5 minutes
      //     15 * 60 * 1000 // 15 minutes
      //   ],
      //   maxOldPeersRetention: 50
      // },
      config: {
        peerDiscovery: {
          autoDial: true,
          [Bootstrap.tag]: {
            enabled: true,
            list: [
              multiaddr + "QmTABj5y3Q7LPErKeEPyNHKakp4gAknfwFEAm6LsD6TaNT"
            ],
          },
        },
        transport: {
          [WStar.prototype[Symbol.toStringTag]]: {
            wrtc: !isBrowser && wrtc,
          },
        },
        dht: {
          enabled: true,
          kBucketSize: 20,
        },
        pubsub: {
          enabled: true,
          emitSelf: false,
        },
      },
    } as any);
    this.setSigner(options.signer);
  }
}
