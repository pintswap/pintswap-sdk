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

#### `yarn test:client <script>`

Runs any passed script on the localhost network.

Available scripts for `yarn test:client`:
- `scripts/client-test.js`

Available flags for `scripts/client-test.js`:
- `--wallet <your wallet>` (Funds provided wallet with 6000 ETH)
- `--mockMaker true` (Creates an arbitrary offer by an arbitrary 'maker')

Example: `yarn test:client scripts/client-test.js --wallet <your wallet> --mockMaker true`
