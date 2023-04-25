// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken is ERC20 {
	constructor(uint256 supply, string memory name, string memory symbol) ERC20(name, symbol) {
		_mint(msg.sender, supply);
		}
}
