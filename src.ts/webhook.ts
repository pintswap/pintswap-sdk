import { Provider, ethers } from "ethers";
import { networkFromChainId, providerFromChainId } from "./chains";
import {
  displayOffer,
  getDecimals,
  getName,
  getSymbol,
  getUsdPrice,
  percentChange,
  getEthPrice
} from "./utils";
import { IOffer } from "./types";
import { hashOffer } from "./trade";

const mockHousePint1: IOffer = {
  gets: {
    amount: "0x2813e63b4531bc0000",
    token: "0x58fB30A61C218A3607e9273D52995a49fF2697Ee"
  },
  gives: {
    amount: "0x41608eb4fc6cf400",
    token: "0xFa4bAa6951B6Ee382e9ff9AF2D523278b99ca6D0"
  }

}

//0: Object { gives: {…}, gets: {…} }

// gets: Object { amount: "0x2813e63b4531bc0000", token: "0x58fB30A61C218A3607e9273D52995a49fF2697Ee" }
// ​​​
// gives: Object { amount: "0x41608eb4fc6cf400", token: "0xFa4bAa6951B6Ee382e9ff9AF2D523278b99ca6D0" }
// ​​​
// <prototype>: Object { … }
const mockHousePint2: IOffer = {
  gets: {
    amount: "0xa2d5e3e6bc69480000",
    token: "0x58fB30A61C218A3607e9273D52995a49fF2697Ee"
  },
  gives: {
    amount: "0x0105823ad3f1b3d000",
    token: "0xFa4bAa6951B6Ee382e9ff9AF2D523278b99ca6D0"
  }

}
// ​​
// 1: Object { gives: {…}, gets: {…} }
// ​​​
// gets: Object { amount: "0xa2d5e3e6bc69480000", token: "0x58fB30A61C218A3607e9273D52995a49fF2697Ee" }
// ​​​
// gives: Object { amount: "0x0105823ad3f1b3d000", token: "0xFa4bAa6951B6Ee382e9ff9AF2D523278b99ca6D0" }
// ​​​
// <prototype>: Object { … }
const mockHousePint3: IOffer = {
  gets: {
    amount: "0x01740f6978e11a500000",
    token: "0x58fB30A61C218A3607e9273D52995a49fF2697Ee"
  },
  gives: {
    amount: "0x024c65045cdfd48000",
    token: "0xFa4bAa6951B6Ee382e9ff9AF2D523278b99ca6D0"
  }

}
// ​​
// 2: Object { gives: {…}, gets: {…} }
// ​​​
// gets: Object { amount: "0x01740f6978e11a500000", token: "0x58fB30A61C218A3607e9273D52995a49fF2697Ee" }
// ​​​
// gives: Object { amount: "0x024c65045cdfd48000", token: "0xFa4bAa6951B6Ee382e9ff9AF2D523278b99ca6D0" }
// ​​​
// <prototype>: Object { … }
const mockHousePint4: IOffer = {
  gets: {
    amount: "0x029f89e7682eb8200000",
    token: "0x58fB30A61C218A3607e9273D52995a49fF2697Ee"
  },
  gives: {
    amount: "0x041608eb4fc6cf4000",
    token: "0xFa4bAa6951B6Ee382e9ff9AF2D523278b99ca6D0"
  }

}
// ​​
// 3: Object { gives: {…}, gets: {…} }
// ​​​
// gets: Object { amount: "0x029f89e7682eb8200000", token: "0x58fB30A61C218A3607e9273D52995a49fF2697Ee" }
// ​​​
// gives: Object { amount: "0x041608eb4fc6cf4000", token: "0xFa4bAa6951B6Ee382e9ff9AF2D523278b99ca6D0" }
// ​​​
// <prototype>: Object { … }
const mockHousePint5: IOffer = {
  gets: {
    amount: "0x04290ece2b20b6c00000",
    token: "0x58fB30A61C218A3607e9273D52995a49fF2697Ee"
  },
  gives: {
    amount: "0x06626defaca6a40000",
    token: "0xFa4bAa6951B6Ee382e9ff9AF2D523278b99ca6D0"
  }

}
// ​​
// 4: Object { gives: {…}, gets: {…} }
// ​​​
// gets: Object { amount: "0x04290ece2b20b6c00000", token: "0x58fB30A61C218A3607e9273D52995a49fF2697Ee" }
// ​​​
// gives: Object { amount: "0x06626defaca6a40000", token: "0xFa4bAa6951B6Ee382e9ff9AF2D523278b99ca6D0" }
// ​​​
// <prototype>: Object { … }

//https://discord.com/api/webhooks/1181339596647301171/rYNmPeF4GTMpB-pIFjqd9pH-Nt1-hi3iHykNF2FWI8wJqRxIVgRq84dONz2ly6sYKP9Q

const TELEGRAM = {
  code:"6551006929:AAGG7R8nPIMIwMK8o7-nKZ6oIwCm3wVnuJo"
}


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
  ian: {
    id: "1181339596647301171",
    token: 
      "rYNmPeF4GTMpB-pIFjqd9pH-Nt1-hi3iHykNF2FWI8wJqRxIVgRq84dONz2ly6sYKP9Q"
  }
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

const calculateDiscount = async (offer: IOffer, chainId) => {
  const { gets, gives } = await displayOffer(offer, chainId, "symbol");
  const eth = await getEthPrice()
  const givesUSD = await getUsdPrice(gives.token, eth)
  const getsUSD = await getUsdPrice(gets.token, eth)
  const originalPrice = Number(gets.amount) * getsUSD
  const discountPrice = Number(gives.amount) * givesUSD
  const discount = ((originalPrice - discountPrice) / originalPrice) * 100
  const response = Number(discount.toFixed(2))
  return response
}

const buildFulfillMarkdownLink = (
  offer?: IOffer,
  peer?: string,
  chainId = 1
) => {
  const baseLink = "https://app.pintswap.exchange";
  if (offer && peer) {
    return `[Take offer in Web App](${baseLink}/#/fulfill/${peer}/${hashOffer(
      offer
    )}/${chainId})`;
  }
  return `[Go to Web App](${baseLink})`;
};

export const webhookRun = async function ({
  txHash,
  chainId,
  offer,
  peer,
}: {
  offer?: IOffer;
  txHash?: string;
  chainId: number;
  peer?: string;
}) {
  if (txHash) {
    try {
      const provider = providerFromChainId(chainId);
      const tokens = await getTokensFromTxHash(txHash, provider, chainId);
      await fetch(
        `${DISCORD.base}/${DISCORD.ian.id}/${DISCORD.ian.token}`,
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
                    value: `[View in Explorer](${networkFromChainId(chainId).explorer
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
    const discount = await calculateDiscount(offer, chainId)
    console.log("discount:", discount)
    try {
      if (discount >= 3) {
        const { gives, gets } = await displayOffer(offer, chainId, "name");
        
        await fetch(`${DISCORD.base}/${DISCORD.ian.id}/${DISCORD.ian.token}`, {
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
                    name:"Discount",
                    value:`%${discount}`,
                  },
                  {
                    name: "Chain",
                    value: `${networkFromChainId(chainId).name}`,
                  },
                  {
                    name: "",
                    value: buildFulfillMarkdownLink(offer, peer, chainId),
                  },
                ],
                timestamp: new Date().toISOString(),
              },
            ],
          }),
        });
      }
    } catch (e) {
      console.error(e);
    }
  }
};

webhookRun({ offer: mockHousePint4, chainId: 1 })