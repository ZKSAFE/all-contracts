// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract ZKID is ERC721 {

    uint public inventory = 100;

    uint public maxSupply = 200;

    uint public newSupplyInterval = 100;

    uint public virturalETH = 1 ether;

    uint public kLast; // reserve0 * reserve1, as of immediately after the most recent liquidity event

    uint public onSaleID = 2101;

    uint public lastMintTime;

    address public feeTo;


    constructor(address _feeTo) ERC721("ZKSAFE ID", "ZKID") {
        feeTo = _feeTo;
        kLast = inventory * virturalETH;
        lastMintTime = block.timestamp;
    }

    function supply() public view returns (uint) {
        uint result = inventory + (block.timestamp - lastMintTime) / newSupplyInterval;
        if (result > maxSupply) {
            return maxSupply;
        }
        return result;
    }

    function price(uint buyNum) public view returns (uint) {
        return 1 + kLast / (supply() - buyNum) - virturalETH;
    }

    function mint(uint buyNum, address to) public payable {
        require(msg.value > 0, "ZKID:mint:: INSUFFICIENT_ETH");

        inventory = supply();
        require(buyNum > 0 && buyNum < inventory, "ZKID:mint:: INSUFFICIENT_BUY_NUM");

        for (uint tokenId = onSaleID; tokenId < onSaleID + buyNum; tokenId++) {
            _mint(to, tokenId);
        }
        onSaleID += buyNum;
        lastMintTime = block.timestamp;

        require((inventory - buyNum) * (virturalETH + msg.value) >= kLast, "ZKID:mint:: K");

        inventory -= buyNum;
        kLast = inventory * virturalETH;

        payable(feeTo).transfer(msg.value);
    }
}
