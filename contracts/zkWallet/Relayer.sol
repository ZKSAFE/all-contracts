// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./BatchCallWallet.sol";
import "hardhat/console.sol";

contract Relayer is Ownable {

    IERC20 public USD;

    mapping (address => uint) public balanceOf;

    uint public fee = 10 ** 17; //$0.1

    event Call(uint indexed index, bool success);
    event BalanceUpdate(address indexed wallet, bool deposit, uint value);


    constructor(address USDAddr) {
        USD = IERC20(USDAddr);
    }


    function freeCall(address[] calldata walletArr, bytes[] calldata signedBatchCallArr) public onlyOwner {
        for (uint i = 0; i < walletArr.length; i++) {
            address wallet = walletArr[i];

            (bool success, ) = wallet.call(signedBatchCallArr[i]);
            emit Call(i, success);
        }
    }
    

    function costCall(address[] calldata walletArr, bytes[] calldata signedBatchCallArr) public onlyOwner {
        for (uint i = 0; i < walletArr.length; i++) {
            address wallet = walletArr[i];

            balanceOf[wallet] -= fee;
            emit BalanceUpdate(wallet, false, fee);

            (bool success, ) = wallet.call(signedBatchCallArr[i]);
            emit Call(i, success);
        }
    }


    function depositCall(address[] calldata walletArr, bytes[] calldata signedBatchCallArr) public onlyOwner {
        for (uint i = 0; i < walletArr.length; i++) {
            address wallet = walletArr[i];

            uint bal0 = USD.balanceOf(address(this));
            (bool success, ) = wallet.call(signedBatchCallArr[i]);
            if (success) {
                uint bal1 = USD.balanceOf(address(this));
                uint deposit = bal1 - bal0 - fee;
                balanceOf[wallet] += deposit;
                emit BalanceUpdate(wallet, true, deposit);
            }
            emit Call(i, success);
        }
    }

}
