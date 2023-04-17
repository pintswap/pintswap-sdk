var { Pintswap } = require('./');

var nodes = Promise.all([1, 2].map(async (v) => await Pintswap.initialize({ signer: require('ethers').Wallet.createRandom() })));

(async () => {
  await Promise.all((await nodes).map(async (v) => await v.startNode()));
  const n = (await nodes)[0];
  n.setBio('woop');
})().catch(console.error);
