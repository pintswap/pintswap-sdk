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


function bufferListToBuffer (BL) {
  let { _bufs } = BL;
  return _bufs[0];
}
/*
 * Keygen handler for second party in 2p-ECDSA key generation
 * uses pushable iterators to exchange key information between parties
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
          console.log("handler got message for step 1", msg);
          let msg2 = p2cx.step1(bufferListToBuffer(msg));
          msgSource.push(msg2);
          step+=1
        } else {
          console.log("handler got message for step 2", msg);
          return p2cx.step2(bufferListToBuffer(msg));
        }
      }
    }
  )

  let ks = p2cx.exportKeyShare().toJsonObject()
  let { Q } = ks as any;
  let f = new BN(Q.y, 16).mod(new BN(2)).isZero() ? "0x02" : "0x03";
  let add = f + new BN(Q.x, 16).toString(16);
  let address = ethers.computeAddress(add);
  console.log("handler computed address", address);
  return address;
}

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

  let ks = p1cx.exportKeyShare().toJsonObject();
  let { Q } = ks as any;
  let f = new BN(Q.y, 16).mod(new BN(2)).isZero() ? "0x02" : "0x03";
  let add = f + new BN(Q.x, 16).toString(16);
  let address = ethers.computeAddress(add);
  console.log("initiator computed address", address);
  return address; 
}
