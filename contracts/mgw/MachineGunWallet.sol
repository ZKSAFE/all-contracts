// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "hardhat/console.sol";

contract MachineGunWallet is Ownable, ReentrancyGuard {
    using ECDSA for bytes32;

    uint public nonce = 1;

    constructor() {}

    receive() external payable {}

    function call(
        address to,
        uint value,
        bytes calldata data
    ) public onlyOwner {
        (bool success, bytes memory result) = to.call{value: value}(data);
        console.logBytes(result);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
        nonce++;
    }


    function batchCall(
        address[] calldata toArr,
        uint[] calldata valueArr,
        bytes[] calldata dataArr
    ) public onlyOwner {
        for (uint i = 0; i < toArr.length; i++) {
            (bool success, bytes memory result) = toArr[i].call{
                value: valueArr[i]
            }(dataArr[i]);

            if (!success) {
                assembly {
                    revert(add(result, 32), mload(result))
                }
            }
        }
        nonce++;
    }


    function validateBatchCall(
        address[] calldata toArr,
        uint[] calldata valueArr,
        bytes[] calldata dataArr,
        uint deadline,
        address sender,
        bytes calldata signature
    ) external nonReentrant {
        require(deadline >= block.timestamp, "validateBatchCall: Expired");
        // signer(owner) allows sender to submit this tx, if sender is 0x0, anyone is allowed
        require(sender == address(0) || sender == msg.sender, "validateBatchCall: Sender Error");
        require(
            owner() ==
                keccak256(
                    bytes.concat(
                        msg.data[:msg.data.length - signature.length - 32],
                        bytes32(block.chainid),
                        bytes20(address(this)),
                        bytes32(nonce)
                    )
                ).toEthSignedMessageHash().recover(signature),
            "validateMultiCall: invalid signature"
        );

        for (uint i = 0; i < toArr.length; i++) {
            (bool success, bytes memory result) = toArr[i].call{
                value: valueArr[i]
            }(dataArr[i]);

            if (!success) {
                assembly {
                    revert(add(result, 32), mload(result))
                }
            }
        }
        nonce++;
    }


    function setNonce(uint value) public onlyOwner {
        nonce = value;
    }

}
