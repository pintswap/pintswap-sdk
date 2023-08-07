# PintSwap SDK

TypeScript library encapsulating the PintSwap p2p stack, protocol definitions, and associated cryptography routines. Embedded within the pintswap-daemon processes as well as the PintSwap web frontend.

## Install

```js
yarn add @pintswap/sdk
```

## Usage

### Initialization

The minimal requirement for a Pintswap instance to be instantiated is a signer object which conforms to the ethers.Signer interface. If the `Pintswap.initialize` method is used to construct a Pintswap instance, a PeerId will be generated randomly.

```js
import { Pintswap } from "@pintswap/sdk";
import { ethers } from "ethers";
(async () => {
  const provider = new ethers.InfuraProvider('mainnet') // PintSwap currently only supports mainnet
  const signer = ethers.Wallet.createRandom().connect(provider);
  const pintswap = await Pintswap.initialize({ signer });
  pintswap.on('peer:discovery', (peer) => {
    pintswap.logger.info('discovered peer:');
    pintswap.logger.info(peer);
  });
  await pintswap.startNode();
})().catch((err) => console.error(err));
```

It is also possible to instantiate a Pintswap instance with a deterministically generated PeerId, using the provided signer object and a saltphrase. The signer provided via a call to `Pintswap.fromPassword({ signer, password })` will be used to sign a message of the following structure:

```
/pintp2p/1.0.0/your-password
```

Where `your-password` is the password supplied to the function.

```js
import { Pintswap } from "@pintswap/sdk";
import { ethers } from "ethers";
(async () => {
  const provider = new ethers.InfuraProvider('mainnet') // PintSwap currently only supports mainnet
  const signer = ethers.Wallet.createRandom().connect(provider);
  const pintswap = await Pintswap.fromPassword({ signer, password: await signer.getAddress() }); // the PeerId will be the same every time the Pintswap instance is created this way
  pintswap.on('peer:discovery', (peer) => {
    pintswap.logger.info('discovered peer:');
    pintswap.logger.info(peer);
  });
  await pintswap.startNode();
})().catch((err) => console.error(err));
```

Note that a PeerId cannot be shared between two actively running peers on the network. The PeerId is integral to the way libp2p routes webRTC traffic, but it is also used as your identity on PintSwap.

### resolveName(nameOrMultiaddr)

Uses the `/pintswap/0.1.0/ns/query` protocol handler.

This function will either perform a lookup or a reverse lookup depending on the input it is provided. 

```js

const multiaddr = await pintswap.resolveName('wock.drip');
const dripName = await pintswap.resolveName(multiaddr);
```

In your code, take care to check that you pass in a string and check if it contains a `.` character to determine if is a name or if it is a multiaddr.

The PintSwap protocol handles tlds other than `.drip` via separate nameserver peers. It is possible to add your own tlds by hosting a `pintswap-ns` process then in your PintSwap client mutate the `NS_MULTIADDRS` object exported by @pintswap/sdk to include the tld you want to host a registry for and a list of the multiaddrs for your nameservers that can resolve those names.

### registerName(name)

Uses the `/pintswap/0.1.0/ns/register` protocol handler.

Registers a name on the PintSwap nameservers. The nameserver this request is routed to depends on the table stored in `NS_MULTIADDRS` exported by @pintswap/sdk

```js

await pintswap.registerName('wock.drip');
```

The default `pintswap-ns` implementation requires that you retain custody of your PeerId for as long as you wish to use the name registered. If the PeerId is lost, the name cannot be released unless nameserver operators release it intentionally.

### startPublishingOffers(ms)

Starts publishing the orderbook stored in `pintswap.offers`

Uses libp2p GossipSub on the `/pintswap/0.1.2/publish-orders` topic.

```js
const subscription = pintswap.startPublishingOffers(10000);
subscription.stop(); // only needed if you want to cancel the publishing interval
```

### subscribeOffers()

Starts listening for orderbook publishes.

```js
await pintswap.subscribeOffers();
pintswap.on('/pubsub/orderbook-update', () => {
  pintswap.logger.info([ ...pintswap.offers.entries() ]);
});
```

### startNode()

It is required to invoke `startNode()` before any action can be taken against the PintSwap p2p network.

```js
await pintswap.startNode();
```

### stopNode()

Stops p2p connectivity associated with the PintSwap instance.

### broadcastOffer(offer)

Inserts an order into the `pintswap.offers` Map such that it can be traded against, using the structure below:

```js

pintswap.broadcastOffer({
  gets: {
    token: '0x0000000000000000000000000000000000000000',
    amount: '0xde0b6b3a7640000'
  },
  gives: {
    token: '0x8d008CAC1a5CB08aC962b1e34E977B79ABEee88D',
    amount: '0xbe951906eba2a8000000'
  }
});
```

For NFT trades it is possible to use a field similar to `tokenId: '0x01'` instead of the `amount` field in either the `gets` or `gives` field of the offer.

### getUserDataByPeerId(peerId)

Returns a structure of the form

```js
{
  offers: [],
  bio: '',
  image: Buffer
}
```

### createBatchTrade(peerId, fill)

Requires a PeerId instance as first argument followed by an array of order fills of the structure

```js
const trade = pintswap.createBatchTrade(PeerId.createFromB58String(await pintswap.resolveName('wock.drip')), [{
  amount: '0x101010',
  offer: {
    gets,
    gives
  }
}, {
  amount: '0x202020',
  offers: {
    gets,
    gives
  }
}]);

const promise = trade.toPromise();
await promise;
```

## Testing

#### `yarn test`

Runs the test files which goes through the entire workflow of PintSwap from creating the trade to completing the trade.

Available environment variables:
- `ETH=1` (Tests swapping of ETH which requires first wrapping ETH before making the swap)
- `USDC=1` (Tests swapping USDC)
- `ERC721=1` (Tests trading ERC721)

#### `yarn test:integration`

Runs the integration test which goes through the entire ERC20 token swap flow.

#### `yarn test:unit`

Runs unit tests on specific portions that occur with the pintswap SDK.

#### `yarn test:localhost`

Runs the test files against a local hardhat node. **Note: run `yarn node` first.**

Available environment variables:
- `ETH=1` (Tests swapping of ETH which requires first wrapping ETH before making the swap)
