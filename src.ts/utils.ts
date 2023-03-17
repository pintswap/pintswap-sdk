import Emitterator from "emitterator";
import { default as pushable } from "it-pushable";
import { pipe } from "it-pipe";
import { TPCEcdsaKeyGen as TPC } from "@safeheron/two-party-ecdsa-js";

/*
 * Keygen handler for second party in 2p-ECDSA key generation
 * uses pushable iterators to exchange key information between parties
 */
export async function handle_keygen({ stream }) {
  let ks = await new Promise(async (resolve) => {
      let p2cx = await TPC.P2Context.createContext();
      let step = 1;

      let source = pushable()

      let emitter = new Emitterator(stream.source, {
        eventName: "value",
        transformValue: async v => v._bufs[0]
      });

      emitter.on("value", v => {
        console.log("running step", step)
        if (step == 1) source.push(p2cx.step1(v));
        else {
          p2cx.step2(v)
          let ks = p2cx.exportKeyShare()
          resolve(ks);
          let js_str = JSON.stringify(ks.toJsonObject(), null, 4)
        }
        step += 1
      });

      pipe(
        source,
        stream.sink
      );
  })


  console.log(ks);
}

export async function init_keygen(stream) {
  let ks = await new Promise(async (resolve) => {
    let source = pushable();
    let p1cx = await TPC.P1Context.createContext(); 
    let ms1 = p1cx.step1();

    source.push(ms1);

    let emitter = new Emitterator(stream.source, {
      eventName: "value",
      transformValue: async v => v._bufs[0]
    });

    emitter.on("value", v => {
      console.log("sending step 2")
      source.push(p1cx.step2(v))	

      let ks = p1cx.exportKeyShare()
      resolve(ks)
      let js_str = JSON.stringify(ks.toJsonObject(), null, 4)
      console.log("Keyshare Initiatior", js_str);
    });


    pipe(
      source,
      stream.sink
    );
  })
  return ks; 
}
