const { Pintswap, init_keygen, hashOffer } = require("../lib");
const { ethers } = require("ethers");
const { 
	JsonRpcProvider,
	Wallet,
	Contract,
	parseEther,
	toUtf8Bytes
} = ethers;
const ABI = require("./erc20.abi.json");

(async () => {
	console.log("... env-tests.js ... \n");
	let provider = new JsonRpcProvider("http://127.0.0.1:8545")

	let wallet = new Wallet("0xde9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0", provider);
	let wallet_has = "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
	let TestToken = new Contract(wallet_has, ABI, wallet)
	let bal = await TestToken.balanceOf(wallet.address)
	console.log(bal);

  let wallet_2 = new Wallet("0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e", provider);
	let wallet_2_has = "0x5FbDB2315678afecb367f032d93F642f64180aa3"
	let TestToken2 = new Contract(wallet_2_has, ABI, wallet); 

	let bal2 = await TestToken2.balanceOf(wallet_2.address)
	console.log(bal2);

	let ps = await Pintswap.initialize({ signer: wallet });
	let ps_2 = await Pintswap.initialize({ signer: wallet_2 });

	let trade = {
		givesToken: wallet_has,
		getsToken: wallet_2_has,
		givesAmount: ethers.toQuantity(ethers.parseEther("1000")),
		getsAmount: ethers.toQuantity(ethers.parseEther("1000"))
	}

	ps_2.listOffer(trade);

	ps.on("peer:discovery", async (peer) => {
		console.log("testing peer")
		await ps.createTrade(peer, trade);
	})
})()
