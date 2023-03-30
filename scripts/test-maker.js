const hre = require("hardhat");
const ethers = hre.ethers;
const yargs = require("yargs/yargs");
const { hideBin } = require("yars/helpers");
const { Pintswap } = require("../lib");
const argv = yargs(hideBin(process.argv))
	.string("wallet")
	.argv;

async function main() {
	let [ makerSigner ] = ethers.getSigners();
	const maker = await Pintswap.initialize({ signer: makerSigner });
	console.log("test maker initialized...");

	maker.listOffer({ 

	});

	maker.on("peer:discovered", (peer) => {
		console.log(
			`found peer: ${ peer } in test maker`
		);
	}); 

	console.log("test maker starting...");
	await maker.startNode();
	
}

main().catch((error) => {
	console.error(error);
	process.exitCode = 1;
})
