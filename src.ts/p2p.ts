"use strict";
import Mplex from "libp2p-mplex";
import { NOISE } from 'libp2p-noise';
import KadDHT from "libp2p-kad-dht";
import Bootstrap from "libp2p-bootstrap";
import PeerId from "peer-id";
import GossipSub from "libp2p-gossipsub";
import RelayConstants from 'libp2p/src/circuit/constants'
import WStar from "libp2p-webrtc-star";
import isBrowser from "is-browser";
import { VoidSigner, hexlify, solidityPackedKeccak256 } from "ethers";
import Libp2p from "libp2p";
import crypto from "libp2p-crypto";
import wrtc from "wrtc";
import cryptico from 'cryptico-js';
import globalObject from 'the-global-object';
import { Buffer } from 'buffer';
import { mapValues } from 'lodash';
import base64url from 'base64url';


export function bufferToString(buf: Uint8Array): string {
    return new TextDecoder().decode(buf)
}

export function stringToBuffer(text: string): Uint8Array {
    return new TextEncoder().encode(text);
}

export function fromBufferToJSON(buf: Uint8Array): any {
    const stringified = bufferToString(buf);
    return JSON.parse(stringified)
}

export function fromJSONtoBuffer(obj: any): Uint8Array {
    const stringified = JSON.stringify(obj);
    return stringToBuffer(stringified);
}


const returnOp = (v) => v;


globalObject.Buffer = globalObject.Buffer || Buffer;

const ln = (v) => ((console.log(v)), v);

const mapToBuffers = (o) => mapValues(o, (v) => (base64url as any)(v.toByteArray && Buffer.from(v.toByteArray()) || hexlify(Buffer.from([v]))));

const cryptoFromSeed = async function (seed) {
  const key = mapToBuffers(await cryptico.generateRSAKey(seed, 2048));
  key.dp = key.dmp1;
  key.dq = key.dmq1;
  key.qi = key.coeff;
  return crypto.keys.supportedKeys.rsa.unmarshalRsaPrivateKey((new (crypto.keys.supportedKeys.rsa.RsaPrivateKey as any)(key, key) as any).marshal());
};

const coerceBuffersToHex = (v) => {
  if (v instanceof Uint8Array || Buffer.isBuffer(v))
    return hexlify(v);
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
    MAINNET: '/dns4/p2p.zerodao.com/tcp/443/wss/p2p-webrtc-star/',
    'DEV-MAINNET': '/dns4/devp2p.zerodao.com/tcp/443/wss/p2p-webrtc-star/'
  };
  static fromPresetOrMultiAddr(multiaddr) {
    return this.PRESETS[(multiaddr || '').toUpperCase() || 'MAINNET'] || multiaddr;
  }
  static toMessage(password) {
    return (
      "/pintp2p/1.0.0/" +
      solidityPackedKeccak256(["string"], ["/pintp2p/1.0.0/" + password])
    );
  }
  static async peerIdFromSeed(seed) {
    return await PeerId.createFromPrivKey((await cryptoFromSeed(seed)).bytes);
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
  async start() {
    await super.start();
    await this.pubsub.start();
  }
  setSigner(signer) {
    this.signer = signer;
    this.addressPromise = this.signer.getAddress();
  }
  constructor(options) {
    const multiaddr = PintP2P.fromPresetOrMultiAddr(
      options.multiaddr || "mainnet"
    );
    super({
      peerId: options.peerId,
      connectionManager: {
        minConnections: 25
      },
      relay: {
        enabled: true,
        advertise: {
          bootDelay: RelayConstants.ADVERTISE_BOOT_DELAY,
          enabled: false,
          ttl: RelayConstants.ADVERTISE_TTL
        },
        hop: {
          enabled: false,
          active: false
        },
        autoRelay: {
          enabled: false,
          maxListeners: 2
        }
      },
      addresses: {
        listen: [multiaddr]
      },
      modules: {
        transport: [WStar],
        streamMuxer: [Mplex],
        connEncryption: [NOISE],
        pubsub: GossipSub,
        peerDiscovery: [Bootstrap],
        dht: KadDHT,
      },
      metrics: { // added metrics, do not add in production for performance boost
        enabled: true,
        computeThrottleMaxQueueSize: 1000,
        computeThrottleTimeout: 2000,
        movingAverageIntervals: [
          60 * 1000, // 1 minute
          5 * 60 * 1000, // 5 minutes
          15 * 60 * 1000 // 15 minutes
        ],
        maxOldPeersRetention: 50
      },
      config: {
        peerDiscovery: {
          autoDial: true,
          [Bootstrap.tag]: {
            enabled: true,
            list: [
              multiaddr + 'QmXRimgxFGd8FEFRX8FvyzTG4jJTJ5pwoa3N5YDCrytASu'
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
};
