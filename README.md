# PintSwap SDK

This is the software development kit for PintSwap, an ERC20 peer-to-peer swap.

## Installation

#### `yarn`

This will install all the appropriate dependencies.

## Scripts

#### `yarn hardhat node`

Runs a localhost node environment to run various transactions on.

#### `yarn hardhat test`

Runs the jest test file which goes through the entire workflow of pintswap from creating the trade to completing the trade.

#### `yarn test:maker`

After running `yarn hardhat node`, this script will create a mock 'maker' that proposes a trade with arbitrary tokens which can be then fulfilled on the frontend.

Available environment variables for `yarn test:maker`
- `WALLET=<wallet-address>` (Funds provided wallet with 6000 ETH)
- `ETH=1` (Tests swapping of ETH which requires first wrapping then approving ETH before making the swap)

#### `yarn test:client <script>`

Runs any passed script on the localhost network.

Available scripts for `yarn test:client`:
- `scripts/client-test.js`

Available flags for `scripts/client-test.js`:
- `--mockMaker true` (Creates an arbitrary offer by an arbitrary 'maker')

Available environment variables for `script/client-test.js`
- `WALLET=<your wallet>` (Funds provided wallet with 6000 ETH)

Example: `WALLET=<wallet-address> yarn test:client scripts/client-test.js --mockMaker true`
