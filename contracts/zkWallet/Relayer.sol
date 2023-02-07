// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ZKWallet.sol";
import "hardhat/console.sol";

contract Relayer is Ownable {

    IERC20 public USD;

    mapping (address => uint) public balanceOf;

    uint public fee = 10 ** 17; //$0.1

    event FreeCall(address indexed wallet, bool success);
    event CostCall(address indexed wallet, bool success, uint fee);
    event Deposit(address indexed wallet, bool success, uint deposit);


    bytes4 constant selector = ZKWallet.validateBatchCall.selector;


    constructor(address USDAddr) {
        USD = IERC20(USDAddr);
    }


    function freeCall(address[] calldata walletArr, bytes[] calldata signedBatchCallArr) public onlyOwner {
        for (uint i = 0; i < walletArr.length; i++) {
            address wallet = walletArr[i];

            (bool success, ) = wallet.call(bytes.concat(selector, signedBatchCallArr[i]));

            emit FreeCall(wallet, success);
        }
    }
    

    function costCall(address[] calldata walletArr, bytes[] calldata signedBatchCallArr) public onlyOwner {
        for (uint i = 0; i < walletArr.length; i++) {
            address wallet = walletArr[i];

            (bool success, ) = wallet.call(bytes.concat(selector, signedBatchCallArr[i]));
            
            if (balanceOf[wallet] >= fee) {
                balanceOf[wallet] -= fee;
            }
            emit CostCall(wallet, success, fee);
        }
    }


    function depositCall(address[] calldata walletArr, bytes[] calldata signedBatchCallArr) public onlyOwner {
        for (uint i = 0; i < walletArr.length; i++) {
            address wallet = walletArr[i];

            uint bal0 = USD.balanceOf(address(this));
            (bool success, ) = wallet.call(bytes.concat(selector, signedBatchCallArr[i]));
            if (success) {
                uint bal1 = USD.balanceOf(address(this));
                if (bal1 >= bal0 + fee) {
                    uint deposit = bal1 - bal0 - fee;
                    balanceOf[wallet] += deposit;
                    emit Deposit(wallet, true, deposit);
                } else {
                    emit Deposit(wallet, false, 0);
                }
            } else {
                emit Deposit(wallet, false, 0);
            }
        }
    }


}
