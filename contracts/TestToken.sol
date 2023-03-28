pragma solidity ^0.8.9;
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract TestToken is ERC20 {
	constructor(uint256 supply, string memory name, string memory symbol) ERC20(name, symbol) {
		_mint(msg.sender, supply);
		}
}
