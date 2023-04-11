# PintSwap SDK

This is the software development kit for PintSwap, a peer-to-peer ERC20 token swap using [LibP2P](https://libp2p.io/).


## Installation

#### `yarn`

This will install all the appropriate dependencies.


## Scripts

#### `yarn node:hardhat`

Runs a hardhat node environment to run various transactions on.

#### `yarn script:maker`

After running `yarn hardhat node`, this script will create a mock 'maker' that proposes a trade with arbitrary tokens which can be then fulfilled on the frontend.

Available environment variables for `yarn script:maker`
- `WALLET=<wallet-address>` (Funds provided wallet with 6000 ETH)
- `ETH=1` (Tests swapping of ETH which requires first wrapping ETH before making the swap)

#### `yarn node:client <script>`

Runs any passed script on the localhost network.

Available scripts for `yarn test:client`:
- `scripts/client-test.js`

Available flags:
- `--mockMaker true` (Creates an arbitrary offer by an arbitrary 'maker')

Available environment variables for `script/client-test.js`
- `WALLET=<your wallet>` (Funds provided wallet with 6000 ETH)

Example: `WALLET=<wallet-address> yarn node:client scripts/client-test.js --mockMaker true`


## Testing

#### `yarn test`

Runs the test files which goes through the entire workflow of pintswap from creating the trade to completing the trade.

Available environment variables:
- `ETH=1` (Tests swapping of ETH which requires first wrapping ETH before making the swap)

#### `yarn test:integration`

Runs the integration test which goes through the entire ERC20 token swap flow.

#### `yarn test:unit`

Runs unit tests on specific portions that occur with the pintswap SDK.

#### `yarn test:localhost`

Runs the test files against a local hardhat node. **Note: run `yarn node` first.**

Available environment variables:
- `ETH=1` (Tests swapping of ETH which requires first wrapping ETH before making the swap)

## How to Use

#### Initialize Pintswap class
```
const pintswap = await Pintswap.initialize({ awaitReceipts, signer })
```
```
await pintswap.startNode()
```

#### Broadcast trade
```
pintswap.broadcastOffer({
    getsAmount: string,
    getsToken: string,
    givesAmount: string,
    givesToken: string,
});
```

#### Fulfill trade
```
pintswap.createTrade(
  peer's ID as B58 String, 
  {
    getsAmount: string,
    getsToken: string,
    givesAmount: string,
    givesToken: string,
  }
);
```
