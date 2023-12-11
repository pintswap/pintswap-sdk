import { Provider, ethers } from "ethers";
import { providerFromChainId } from "./chains";
import { getDecimals, getName, getSymbol } from "./utils";

const DISCORD = {
  id: "1181335403949719703",
  token: "jCFvWLrvGsxXoedNdXNMpV9FdbIYPhN0qywEXh7DtlgZv-qgUEArVWNlpHUH_4mTn8XF",
};

const getTokensFromTxHash = async (
  txHash: string,
  provider: Provider,
  chainId: number
) => {
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
          content: "",
          embeds: [
            {
              title: "Transaction Complete!",
              color: 10181046,
              fields: [
                {
                  name: `${tokens.transfer1.name}`,
                  value: `${tokens.transfer1.amount}`,
                  inline: true,
                },
                {
                  name: "Trade",
                  value: "<----->",
                  inline: true,
                },
                {
                  name: `${tokens.transfer2.name}`,
                  value: `${tokens.transfer2.amount}`,
                  inline: true,
                },
              ],
              timestamp: new Date().toISOString(),
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
