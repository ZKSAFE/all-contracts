// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract ZKID is ERC721 {
    constructor() ERC721("ZKSAFE ID Number", "ZKID") {}

    function mint(address to, uint256 tokenId) public {
        _mint(to, tokenId);
    }
}
