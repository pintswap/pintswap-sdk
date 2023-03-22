import pushable from "it-pushable";
import { pipe } from "it-pipe";
import { TPCEcdsaKeyGen as TPC } from "@safeheron/two-party-ecdsa-js";
import BN from "bn.js";
import { ethers } from "ethers";
import * as lp from "it-length-prefixed";

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
  let context2 = await TPC.P2Context.createContext();
    let messages = pushable(); 
    pipe(
      stream.source,
      lp.decode(),
      async function (source) {
        const { value: message1 } = await source.next();
        messages.push(context2.step1(message1.slice()));
        const { value: message3 } = await source.next();
        messages.push(context2.step2(message3.slice()));
	messages.end();
      }
    )
    await pipe(
      messages,
      lp.encode(),
      stream.sink
    )
  
  const keyshare = context2.exportKeyShare().toJsonObject();
  const address = keyshareToAddress(keyshare);

  return [address, keyshare];
}

/*
 * keygen handler for first party in 2p-ecdsa keygeneration
 * returns (ComputedETHAddress, KeyshareJson) tuple for first party
 */
export async function initKeygen(stream) {
  let context1 = await TPC.P1Context.createContext();
  const message1 = context1.step1(); 
  const messages = pushable(); 
  pipe(
    stream.source,
    lp.decode(),
    async function (source) {
      messages.push(message1);
      const { value: message2 } = await source.next();
      const message3 = context1.step2(message2.slice());
      messages.push(message3);
      messages.end();
    }
  )
  await pipe(
    messages,
    lp.encode(),
    stream.sink
  )
  const keyshare = context1.exportKeyShare().toJsonObject();
  const address = keyshareToAddress(keyshare);
  return [address, keyshare]; 
}
