import { ethers } from "ethers";
import { providerFromChainId } from "./chains";
import { getDecimals, getName, getSymbol } from "./utils";

const MOCKS = [
    "0x018fef1145ff8e1f7303daf116074859f20bacfe0037d6c05fac57d004bc78fd",
    "0x01aa19f45b9cefd4d034c58643de05dcb76e40d83f8f52a10d9cb5c4b00f8560",
    "0x00e52e973b1d88f890e42b97613825be7306d875c649e7ed0517bbcc28e35ceb",
    "0x00dd461ffdfb18ef20b9d6bd60546012eb335d895a55f807811463f153ebfa0a",
    "0x006e024f12a7dd19cfac29b1cec633f774771b2a9b7981fb0ed706d5fd228607"
]

const DISCORD = {
  id: "1181335403949719703",
  token: "jCFvWLrvGsxXoedNdXNMpV9FdbIYPhN0qywEXh7DtlgZv-qgUEArVWNlpHUH_4mTn8XF",
};

const getTokensFromTxHash = async (txHash, provider, chainId: number) => {
  if (!provider) provider = providerFromChainId(chainId);
  const { logs } = await provider.getTransactionReceipt(txHash);

  const events = [];
  //loop through logs of transaction hash
  for (const log of logs) {
    try {
      // listen to Transaction Events
      if (log.topics[0] === ethers.id("Transfer(address,address,uint256)")) {
        // build contract from
        const name = await getName(log.address, chainId);
        const decimals = await getDecimals(log.address, chainId);
        const symbol = await getSymbol(log.address, chainId);

        let amount;
        log.data
          ? (amount = ethers.formatUnits(log.data, decimals))
          : (amount = 0);
        const transfer = {
          type: "Transfer",
          name: name,
          symbol: symbol,
          tokenAddress: log.address,
          fromAddress: `0x${log.topics[1].slice(26)}`,
          toAddress: `0x${log.topics[2].slice(26)}`,
          decimals: decimals,
          amount: amount,
        };
        events.push(transfer);
      }
      //listens for Swap events
      if (
        log.topics[0] ===
        ethers.id("Swap(address,uint256,uint256,uint256,uint256)")
      ) {
        const name = await getName(log.address, chainId);
        const decimals = await getDecimals(log.address, chainId);
        let amount;
        log.data
          ? (amount = ethers.formatUnits(log.address, decimals))
          : (amount = 0);
        const swap = {
          type: "swap",
          name: name,
          symbol: "symbol",
          tokenAddress: log.address,
          fromAddress: `0x${log.topics[1].slice(26)}`,
          toAddress: `0x${log.topics[2].slice(26)}`,
          decimals: decimals,
          amount: amount,
        };
      }
    } catch (error) {
      console.error("Error decoding log:");
    }
  }

  if (events.length >= 2) {
    return { transfer1: events[0], transfer2: events[1] };
  } else if (events.length <= 1) {
    return { transfer1: events[0], transfer2: "single event" };
  }
};

export const webhookRun = async function (txHash, chainId) {
  try {
    const provider = providerFromChainId(chainId);
    const tokens = await getTokensFromTxHash(txHash, provider, chainId);
    await fetch(
      `https://discord.com/api/webhooks/${DISCORD.id}/${DISCORD.token}`,
      {
        method: "POST",
        body: JSON.stringify({
          content: "Transaction Complete!",
          embeds: [
            {
              timestamp: new Date().toISOString(),
            },
            {
              name: `${tokens.transfer1.name}`,
              value: `${tokens.transfer1.amount}`,
            },
            {
              name: "Trade",
              value: "<----->",
            },
            {
              name: `${tokens.transfer2.name}`,
              value: `${tokens.transfer2.amount}`,
            },
          ],
        }),
        headers: {
          "Content-type": "application/json; charset=UTF-8",
        },
      }
    );
  } catch (e) {
    console.error(e);
  }
};

webhookRun(MOCKS[0], 1);
