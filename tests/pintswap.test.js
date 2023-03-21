const { Pintswap, hashOffer } = require("../lib");
const { Wallet } = require("ethers");

describe("IOffer utility", () => {
  test('create and hash a IOffer', () => {
    let _offer = {
      givesToken: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      getsToken: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
      givesAmount: 1000,
      getsAmount: 1000
    }
    let hash = hashOffer(_offer);
    expect(hash).toHaveLength(66);
  });
});


