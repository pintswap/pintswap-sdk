import Emitterator from "emitterator";
import pushable from "it-pushable";
import { pipe } from "it-pipe";
import { TPCEcdsaKeyGen as TPC } from "@safeheron/two-party-ecdsa-js";
import BN from "bn.js";
import { ethers } from "ethers";
import * as lp from "it-length-prefixed";
import all from 'it-all'
import first from 'it-first'
import toStream from 'it-to-stream';
import keepAlive from "it-keepalive";
import { 
  collect, 
  consume
} from "streaming-iterables"


/*
 * extract the first Buffer from a BufferList
 */
function bufferListToBuffer (BL) {
  let { _bufs } = BL;
  return _bufs[0];
}

/*
 * @params { keyshareJsonObject } exported keyshare object converted to JsonObject
 * computes derived pubkey from Q (point)
 * computes eth address from derived pubkey
 */
function keyshareToAddress (keyshareJsonObject) {
  let { Q } = keyshareJsonObject as any;
  let prepend = new BN(Q.y, 16).mod(new BN(2)).isZero() ? "0x02" : "0x03";
  let derivedPubKey = prepend + new BN(Q.x, 16).toString(16);
  return ethers.computeAddress(derivedPubKey); 
}

/*
 * Keygen handler for second party in 2p-ECDSA key generation
 * uses pushable iterators to exchange key information between parties
 * returns (ComputedETHAddress, KeyShareJson) tuple for second party
 */
export async function handleKeygen({ stream }) {
  let p2cx = await TPC.P2Context.createContext();
  let step = 1;
  let msgSource = pushable(); 

  pipe(
    msgSource,
    lp.encode(),
    stream.sink
  )

  let result = await pipe(
    stream.source,
    lp.decode(),
    async function (source) {
      for await (const msg of source) {
        if (step === 1) {
          let msg2 = p2cx.step1(bufferListToBuffer(msg));
          msgSource.push(msg2);
          step+=1
        } else {
          return p2cx.step2(bufferListToBuffer(msg));
        }
      }
    }
  )
  
  let keyshare = p2cx.exportKeyShare().toJsonObject();
  let address = keyshareToAddress(keyshare);

  return [address, keyshare];
}

/*
 * keygen handler for first party in 2p-ecdsa keygeneration
 * returns (ComputedETHAddress, KeyshareJson) tuple for first party
 */
export async function initKeygen(stream) {
  let p1cx = await TPC.P1Context.createContext();
  let ms1 = p1cx.step1(); 
  let msgSource = pushable(); 

  pipe(
    msgSource,
    lp.encode(),
    stream.sink
  )
  msgSource.push(ms1);

  let result = await pipe(
    stream.source,
    lp.decode(),
    async function (source) {
      for await (const msg of source) {
        console.log("initiator got message for step 2", msg);
        let msg3 = p1cx.step2(bufferListToBuffer(msg));
        msgSource.push(msg3);
        return msg3
      }
    }
  )

  let keyshare = p1cx.exportKeyShare().toJsonObject();
  let address = keyshareToAddress(keyshare);
  return [address, keyshare]; 
}

