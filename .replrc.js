var trade = require('./lib/trade');

var contract = trade.createContract({
    "givesToken": "0x0000000000000000000000000000000000000000",
    "getsToken": "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
    "givesAmount": "0xd529ae9e860000",
    "getsAmount": "0x05f5e100"
}, '0x' + '2'.repeat(40), '0x' + '3'.repeat(40), 1);

