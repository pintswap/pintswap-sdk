const { Wallet } = require("@ethersproject/wallet");
const { Pintswap, init_keygen } = require("../lib");
// import { Wallet } from "@ethersproject/wallet";
// import * as PS from "../lib";

(async () => {
	console.log("... env-tests.js ... \n");
	

	let wallet = Wallet.createRandom();
	let wallet_2 = Wallet.createRandom();

	let ps = await Pintswap.initialize({ signer: wallet });
	let ps_2 = await Pintswap.initialize({ signer: wallet_2 });


	ps.on("peer:discovery", async (peer) => {
		let ks = await ps.create_trade(peer);
		console.log(ks);
		// let { stream, protocol } = await ps.dialProtocol(peer, ['/pintswap/0.1.0/create-trade']);
		
		// let key = await init_keygen(stream);
	})
})()
