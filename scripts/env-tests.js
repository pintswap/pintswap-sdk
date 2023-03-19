const { Pintswap, init_keygen } = require("../lib");
const { ethers } = require("ethers");

(async () => {
	console.log("... env-tests.js ... \n");
	

	let wallet = ethers.Wallet.createRandom();
	let wallet_2 = ethers.Wallet.createRandom();

	let ps = await Pintswap.initialize({ signer: wallet });
	let ps_2 = await Pintswap.initialize({ signer: wallet_2 });


	ps.on("peer:discovery", async (peer) => {
		await ps.createTrade(peer);
	})
})()
