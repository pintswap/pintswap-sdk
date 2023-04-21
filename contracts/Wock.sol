pragma solidity ^0.8.9;
import "@uniswap/v3-periphery/contracts/base/ERC721Permit.sol";
import "@openzeppelin/contracts/token/ERC721.sol";

export contract WOCKI is ERC721, ERC721Permit {
  constructor(
    string memory name_,
    string memory symbol_,
    string memory version_
  ) ERC721Permit( name_, symbol_ ) {
    
  }
}
