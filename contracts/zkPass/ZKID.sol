// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract ZKID is ERC721 {

    uint public inventory = 50;

    uint public maxSupply = 200;

    uint public newSupplyInterval = 10;

    uint public virturalETH = 1 ether;

    uint public kLast;

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
        uint _inventory = supply();
        require(_inventory > buyNum, "ZKID:mintOne:: INSUFFICIENT_ZKID");

        uint result;
        for (uint i=0; i<buyNum; i++) {
            uint _virturalETH = kLast / _inventory;
            _inventory = _inventory - 1;
            result += kLast / _inventory - _virturalETH;
        }
        return result;
    }

    function mint(uint buyNum, address to) public payable {
        uint fee;
        for (uint i = 0; i < buyNum; i++) {
            fee += mintOne(to);
        }

        require(msg.value >= fee, "ZKID:mint:: INSUFFICIENT_ETH");

        payable(feeTo).transfer(fee);
        if (msg.value > fee) {
            payable(msg.sender).transfer(msg.value - fee);
        }
    }

    function mintOne(address to) internal returns (uint) {
        inventory = supply();
        require(inventory > 1, "ZKID:mintOne:: INSUFFICIENT_ZKID");

        virturalETH = kLast / inventory;

        _mint(to, onSaleID);

        onSaleID += 1;
        lastMintTime = block.timestamp;

        uint _unitPrice = kLast / (inventory - 1) - virturalETH;

        inventory -= 1;
        virturalETH += _unitPrice;

        return _unitPrice;
    }
}
