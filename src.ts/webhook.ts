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
import { IOffer, ITokenTransfers, ITokens } from "./types";
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
  const receipt = await provider.getTransactionReceipt(txHash);
  const events: ITokens[] = [];
  if (receipt) {
    const logs = receipt.logs
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
            : (amount = "0");
          const transfer: ITokens = {
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
          let amount
          log.data
            ? (amount = ethers.formatUnits(log.address, decimals))
            : (amount = '0');
          const swap: ITokens = {
            type: "swap",
            name: name,
            symbol: "symbol",
            tokenAddress: log.address,
            fromAddress: `0x${log.topics[1].slice(26)}`,
            toAddress: `0x${log.topics[2].slice(26)}`,
            decimals: decimals,
            amount: amount,
          };
          events.push(swap)
        }
      } catch (error) {
        console.error("Error decoding log:");
      }
    }
  }

  if (events.length >= 2) {
    return { transfer1: events[0], transfer2: events[1] };
  } else if (events.length <= 1) {
    return { transfer1: events[0], transfer2: events[0] };
  }
};

const calculateDiscount = async (offer: IOffer, chainId: number) => {
  const { gets, gives } = await displayOffer(offer, chainId, "symbol");
  const eth = await getEthPrice()
  const getsUSD = await getUsdPrice(gets.token, eth)
  const givesUSD = await getUsdPrice(gives.token, eth)
  const getsPrice = Number(gets.amount) * getsUSD
  const givesPrice = Number(gives.amount) * givesUSD
  const discount = ((getsPrice - givesPrice) / getsPrice) * 100
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
      const tokens: ITokenTransfers | undefined = await getTokensFromTxHash(txHash, provider, chainId);
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
                    name: `${tokens?.transfer1.name}`,
                    value: `${tokens?.transfer1.amount}`,
                    inline: true,
                  },
                  {
                    name: "",
                    value: "<--->",
                    inline: true,
                  },
                  {
                    name: `${tokens?.transfer2.name}`,
                    value: `${tokens?.transfer2.amount}`,
                    inline: true,
                  },
                  {
                    name: "Chain",
                    value: `${networkFromChainId(chainId)?.name}`,
                  },
                  {
                    name: "",
                    value: `[View in Explorer](${networkFromChainId(chainId)?.explorer
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
    const discountTitle = discount >= 0 ? "Premium" : "Discount"
    console.log("discount:", discount)
    try {
      if (discount) {
        const { gives, gets } = await displayOffer(offer, chainId, "name");
        const teleMessage = await buildTeleMessage({ gives: gives, gets: gets })
        
        const res = await fetch(`${TELEGRAM.base}/${TELEGRAM.ianToken}/${TELEGRAM.ianSend}${teleMessage}&parse_mode=html`)
        console.log("response:", res.status)

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
                    name: `${discountTitle}`,
                    value: `%${discount}`,
                  },
                  {
                    name: "Chain",
                    value: `${networkFromChainId(chainId)?.name}`,
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

webhookRun({ offer: mockHousePint1, chainId: 1 })

const TELEGRAM = {
  base: "https://api.telegram.org",
  ianToken: "bot6551006929:AAGG7R8nPIMIwMK8o7-nKZ6oIwCm3wVnuJo",
  ianSend: "sendMessage?chat_id=-1002053439213&text=",
  text: "text=",
  url: "https://api.telegram.org/bot6551006929:AAGG7R8nPIMIwMK8o7-nKZ6oIwCm3wVnuJo/sendMessage?chat_id=-1002053439213&text=Howdy"

}

const TelegramUrl = `${TELEGRAM.base}/${TELEGRAM.ianToken}/${TELEGRAM.ianSend}&${TELEGRAM.text}`

const buildTeleMessage = async function ({
  gives,
  gets,
  token
}: {
  gives?,
  gets?,
  token?: ITokenTransfers
}) {
  console.log("building HTML")
  if(gives && gets) {
    console.log("building HTML for offer")
    return `<b> New Offer </b> %0A 
    <b>${gives.token}</b> <code> ------ </code> <b>${gets.token}</b> %0A
    <b>${gives.amount}</b> <code> ------ </code> <b>${gets.amount}</b>`
  }
  if(token) {

  }
}