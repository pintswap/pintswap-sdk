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
const mockTx = "0x01aa19f45b9cefd4d034c58643de05dcb76e40d83f8f52a10d9cb5c4b00f8560"
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

const TELEGRAM = {
  base: "https://api.telegram.org",
  offersToken: "bot6551006929:AAGG7R8nPIMIwMK8o7-nKZ6oIwCm3wVnuJo",
  transactionToken: "bot6518633027:AAEs0h9cQ7IBDqEXdT6PPXnLJmuNjzvIKhg",
  ianChat_id: "-1002053439213",
  groupChat_id:"-4031773943",
  url: "https://api.telegram.org/bot6551006929:AAGG7R8nPIMIwMK8o7-nKZ6oIwCm3wVnuJo/sendMessage?chat_id=-1002053439213&text=Howdy"
}

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
  console.log("gets", getsPrice, "gives", givesPrice)
  const discount = givesPrice - getsPrice
  console.log("discount", discount)
  const percentage = (discount/givesPrice) * 100
  console.log('percentage', percentage)
  const response = Number(percentage.toFixed(2))
  console.log("Response toFixed", response )
  return response
}

const buildFulfillMarkdownLink = (
  offer?: IOffer,
  peer?: string,
  chainId = 1,
  telegram?: boolean
) => {
  const baseLink = "https://app.pintswap.exchange";
  if (offer && peer && !telegram) {
    return `[Take offer in Web App](${baseLink}/#/fulfill/${peer}/${hashOffer(
      offer
    )}/${chainId})`;
  }
  if (offer && peer && telegram) {
    return `${baseLink}/#/fulfill/${peer}/${hashOffer(
      offer
    )}/${chainId})`
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

      const teleMessage = await buildTeleMessage(
        {
          tokens: tokens,
          chainId: chainId,
          offer: offer,
          peer: peer,
          txHash: txHash
        }
      )
      const url = `${TELEGRAM.base}/${TELEGRAM.transactionToken}/sendMessage`
      const view = `${networkFromChainId(chainId)?.explorer}tx/${txHash}`

      const data = {
        chat_id: TELEGRAM.groupChat_id,
        text: teleMessage,
        parse_mode: "html",
        reply_markup: JSON.stringify({
          inline_keyboard: [
            [{ text: "View in Explorer", url: view }]
          ]
        })
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      console.log(response.status)
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

    console.log("discount:", discount)
    try {
      if (discount) {
        const { gives, gets } = await displayOffer(offer, chainId, "name");
        const teleMessage = await buildTeleMessage(
          {
            gives: gives,
            gets: gets,
            discount: discount,
            chainId: chainId,
            offer: offer,
            peer: peer
          }
        )

        const url = `${TELEGRAM.base}/${TELEGRAM.offersToken}/sendMessage`
        const offerURL = buildFulfillMarkdownLink(offer, peer, chainId, true)
        console.log("offerURL", offerURL)

        const data = {
          chat_id: TELEGRAM.groupChat_id,
          text: teleMessage,
          parse_mode: "html",
          reply_markup: JSON.stringify({
            inline_keyboard: [
              [{ text: "Take offer in Web App", url: offerURL }]
            ]
          })
        }

        console.log('sending webhook')

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        });
        console.log(response.status)

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
                    name: `${discount >= 3 ? "Discount" : ""}`,
                    value: `${discount >= 3 ? `${discount}%` : ""}`,
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

// webhookRun({txHash:mockTx, chainId:1})

const buildTeleMessage = async function ({
  gives,
  gets,
  tokens,
  discount,
  chainId,
  offer,
  peer,
  txHash
}: {
  gives?,
  gets?,
  tokens?: ITokenTransfers,
  discount?,
  chainId?,
  offer?,
  peer?,
  txHash?,
}) {
  const chain = `${networkFromChainId(chainId)?.name}`
  const fulfill = buildFulfillMarkdownLink(offer, peer, chainId)
  console.log("fulfill", fulfill)

  if (gives && gets) {
    console.log("building HTML for offer")
    const givesAmt = Number(gives.amount).toFixed(3)
    const getsAmt = Number(gets.amount).toFixed(3)
    return `<b> 👀 New Offer 👀 </b> \n
    <b>${gives.token}: </b><i>${givesAmt}</i> \n 
    <b> For </b> \n 
    <b>${gets.token}: </b><i>${getsAmt}</i> \n
    ${discount >= 3 ?
    `<u>Discount</u>
    <i>${discount}%</i>\n`
        : ""
      }
    <u>Chain</u>
    <i>${chain}</i> \n
    <i>${getCurrentFormattedDate()}</i>`
  }
  if (tokens) {

    const url = `${networkFromChainId(chainId)?.explorer}tx/${txHash}`
    return `<b> 💯 Transaction Complete 💯 </b> \n 
    <b>${tokens.transfer1.name}: </b><i>${tokens.transfer1.amount}</i> \n 
    <i> For </i> \n  
    <b>${tokens.transfer2.name}: </b><i>${tokens.transfer2.amount}</i> \n
    <u>Chain</u> 
    <i>${chain}</i> \n
    <b>${getCurrentFormattedDate()}</b> \n`
  }
}

function getCurrentFormattedDate() {
  const now = new Date();

  // Get the day of the week
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const day = days[now.getDay()];

  // Format the time
  let hours = now.getHours();
  const minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';

  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  const minutesStr = minutes < 10 ? '0' + minutes : minutes;

  return `${day} at ${hours}:${minutesStr} ${ampm}`;
}