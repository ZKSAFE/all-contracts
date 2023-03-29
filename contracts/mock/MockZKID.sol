// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract MockZKID is ERC721 {

    uint public onSaleID = 100201;

    mapping(uint => address) public addressOf;

    constructor() ERC721("ZKSAFE ID", "ZKID") {
    }

    function mint(address to) public {
        _mint(to, onSaleID);
        addressOf[onSaleID] = to;

        onSaleID++;
    }

}