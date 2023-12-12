import { Provider, ethers } from "ethers";
import { networkFromChainId, providerFromChainId } from "./chains";
import { displayOffer, getDecimals, getName, getSymbol } from "./utils";
import { IOffer } from "./types";

const DISCORD = {
  base: "https://discord.com/api/webhooks",
  completed: {
    id: "1183967206099406868",
    token:
      "efEL9MmBSwgJpNn6RTn6ConApddLQUAGaels3IrXtr5hxG3OQVRSHKEyKtuObZFgVd9n",
  },
  new: {
    id: "1184276440062107781",
    token:
      "M0sqgaU0jOFyteIh6SKTLHTk9F2SMKPtWwPnRImrz0pZRQrhcInMP3fH80kO2ekncYbD",
  },
};

const POST_REQ_OPTIONS = {
  method: "POST",
  headers: {
    "Content-type": "application/json; charset=UTF-8",
  },
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

export const webhookRun = async function ({
  txHash,
  chainId,
  offer,
}: {
  offer?: IOffer;
  txHash?: string;
  chainId: number;
}) {
  if (txHash) {
    try {
      const provider = providerFromChainId(chainId);
      const tokens = await getTokensFromTxHash(txHash, provider, chainId);

      await fetch(
        `${DISCORD.base}/${DISCORD.completed.id}/${DISCORD.completed.token}`,
        {
          ...POST_REQ_OPTIONS,
          body: JSON.stringify({
            content: "",
            embeds: [
              {
                title: "💯 Transaction Complete 💯",
                color: 10181046,
                fields: [
                  {
                    name: `${tokens.transfer1.name}`,
                    value: `${tokens.transfer1.amount}`,
                    inline: true,
                  },
                  {
                    name: "",
                    value: "<--->",
                    inline: true,
                  },
                  {
                    name: `${tokens.transfer2.name}`,
                    value: `${tokens.transfer2.amount}`,
                    inline: true,
                  },
                  {
                    name: "Chain",
                    value: `${networkFromChainId(chainId).name}`,
                  },
                  {
                    name: "",
                    value: `[View in Explorer](${
                      networkFromChainId(chainId).explorer
                    }tx/${txHash})`,
                  },
                ],
                timestamp: new Date().toISOString(),
              },
            ],
          }),
        }
      );
    } catch (e) {
      console.error(e);
    }
  }
  if (offer) {
    try {
      /**
       * TODO
       * check if there is at least a 3% discount on the taker end
       * only send offers that are at a discount to the channels
       */
      const { gives, gets } = await displayOffer(offer, chainId);

      await fetch(`${DISCORD.base}/${DISCORD.new.id}/${DISCORD.new.token}`, {
        ...POST_REQ_OPTIONS,
        body: JSON.stringify({
          content: "",
          embeds: [
            {
              title: "👀 New Offer 👀",
              color: 10181046,
              fields: [
                {
                  name: `${gives.token}`,
                  value: `${gives.amount}`,
                  inline: true,
                },
                {
                  name: "",
                  value: "--->",
                  inline: true,
                },
                {
                  name: `${gets.token}`,
                  value: `${gets.amount}`,
                  inline: true,
                },
                {
                  name: "Chain",
                  value: `${networkFromChainId(chainId).name}`,
                },
              ],
              timestamp: new Date().toISOString(),
            },
          ],
        }),
      });
    } catch (e) {
      console.error(e);
    }
  }
};
