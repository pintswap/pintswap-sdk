var { Pintswap } = require('./');
var { detectPermit } = require('./lib/detect-permit');

var { ethers } = require('ethers');
var { cryptoFromSeed } = require('./lib/p2p');

var provider = new ethers.InfuraProvider('mainnet');


var usdc = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
var weth = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';

var implementationSlot = '0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3';

var data = provider.getTransaction('0xd7b5de2d07a1085fabf146267d06f8ce8905baace6ce74033027b23ae4fe66a8').then((v) => v.data);
var { parseTrade } = require('./lib/trade');

var { disassemble } = require('./evmdis');
