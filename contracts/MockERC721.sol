// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0;

import { ERC721Permit } from "@uniswap/v3-periphery/contracts/base/ERC721Permit.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

contract MockERC721 is ERC721Permit, Ownable {
  mapping (uint256 => uint256) public nonces;
  function version() public pure returns (string memory) { return "1"; }
  constructor() ERC721Permit("MOCK", "MOCK", "1") Ownable() {
    _setBaseURI("ipfs://bafybeiezpbqq6favps74erwn35ircae2xqqdmczxjs7imosdkn6ahmuxme/");
  }
  function _getAndIncrementNonce(uint256 _tokenId) internal override virtual returns (uint256) {
    uint256 nonce = nonces[_tokenId];
    nonces[_tokenId]++;
    return nonce;
  }
  function setBaseURI(string memory _baseUri) public onlyOwner {
    _setBaseURI(_baseUri);
  }
  function mint(address _to, uint256 _tokenId) public {
    _mint(_to, _tokenId);
  }
}
  
