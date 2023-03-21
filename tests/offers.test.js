const { Pintswap, hashOffer } = require('../lib');
const { ethers } = require('ethers');
const { pipe } = require("it-pipe");
const {
  Wallet,
  JsonRpcProvider,
  Contract
} = ethers;


const _offer = {
  givesToken: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
  getsToken: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  givesAmount: 1000,
  getsAmount: 1000
}

async function testPintswap() {
  let provider = new JsonRpcProvider("http://127.0.0.1:8545");
  let wallet = new Wallet("0xde9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0", provider);
  let peerId = await Pintswap.peerIdFromSeed(await wallet.address); 
  let pintswap = new Pintswap({ signer: wallet, peerId });
  return pintswap
}

async function initializedTestPintswap() {
  // let provider = new JsonRpcProvider("http://127.0.0.1:8545");
  let makerSigner = Wallet.createRandom();
  let takerSigner = Wallet.createRandom();

  let maker = await Pintswap.initialize({ signer: makerSigner });
  let taker = await Pintswap.initialize({ signer: takerSigner });

  maker.listNewOffer(_offer);

  return [maker, taker]
}

it('should list a offer to pintswap', async () => {
  let ps = await testPintswap();
  ps.listNewOffer(_offer);
  let _offerHash = hashOffer(_offer);
  expect(ps.offers.get(_offerHash)).toEqual(_offer);
});

// it('should get OfferList from Maker Peer from Taker Peer', async () => {
//   let [ maker, taker ] = await initializedTestPintswap();

//   taker.on('peer:discovery', async (peer) => {
//     let { stream } = await taker.dialProtocol(peer, '/pintswap/0.1.0/orders');
//     let orderList = pipe(
//       stream,
//       async function collect(source) {
//         let _orderList = []
//         for await (let value of source) {
//           _orderList.push(value);
//         }
//         return _orderList
//       }
//     );

//     console.log(orderList);
//   });

//   await new Promise(async (resolve) => {
//     await setTimeout(resolve, 5000);
//   });
//   await maker.stop();
//   await taker.stop();

// }, 30000);
