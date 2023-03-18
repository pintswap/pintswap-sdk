const { Pintswap } = require("../lib");
const { Wallet } = require("@ethersproject/wallet");

test('test init pintswap function', async () => {
  let wallet = Wallet.createRandom();
  let pintswap = await Pintswap.initialize({ signer: wallet });
});
