import { Pintswap } from "../lib";
import { Wallet } from "@ethersproject/wallet";
import{ pipe } from "it-pipe";
import { TPCEcdsaKeyGen } from "@safeheron/two-party-ecdsa-js";
import Emitterator from "emitterator";
import { default as pushable } from "it-pushable";
import { init_keygen } from "../lib"; 

async function keygen(stream) {
	let source = pushable();
	let p1cx = await TPCEcdsaKeyGen.P1Context.createContext(); 
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
		let js_str = JSON.stringify(ks.toJsonObject(), null, 4)
		console.log("Keyshare Initiatior", js_str);
	});


	pipe(
		source,
		stream.sink
	);

}

(async () => {
	console.log("... env-tests.js ... \n");
	

	let wallet = Wallet.createRandom();
	let wallet_2 = Wallet.createRandom();

	let ps = await Pintswap.initialize({ signer: wallet });
	let ps_2 = await Pintswap.initialize({ signer: wallet_2 });


	ps.on("peer:discovery", async (peer) => {
		let { stream, protocol } = await ps.dialProtocol(peer, ['/pintswap/0.1.0/create-trade']);
		
		let key = await init_keygen(stream);
	})
})()
