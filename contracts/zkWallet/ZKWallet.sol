// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "hardhat/console.sol";

contract ZKWallet is Ownable {
    using ECDSA for bytes32;

    constructor() {}

    receive() external payable {}

    function call(
        address target,
        uint value,
        bytes memory data
    ) public onlyOwner {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    function batchCall(
        address[] calldata targetArr,
        uint[] calldata valueArr,
        bytes[] calldata dataArr
    ) public onlyOwner {
        for (uint i = 0; i < targetArr.length; i++) {
            (bool success, bytes memory result) = targetArr[i].call{
                value: valueArr[i]
            }(dataArr[i]);

            if (!success) {
                assembly {
                    revert(add(result, 32), mload(result))
                }
            }
        }
    }

    function validateCall(
        address target,
        uint value,
        bytes calldata data,
        uint deadline,
        bytes calldata signature
    ) external {
        require(deadline >= block.timestamp, "validateCall: EXPIRED");
        require(
            owner() ==
                keccak256(
                    bytes.concat(
                        msg.data[:msg.data.length - signature.length - 32],
                        bytes32(block.chainid),
                        bytes20(address(this))
                    )
                ).toEthSignedMessageHash().recover(signature),
            "validateCall: invalid signature"
        );

        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    function validateBatchCall(
        address[] calldata targetArr,
        uint[] calldata valueArr,
        bytes[] calldata dataArr,
        uint deadline,
        bytes calldata signature
    ) external {
        require(deadline >= block.timestamp, "validateBatchCall: EXPIRED");
        require(
            owner() ==
                keccak256(
                    bytes.concat(
                        msg.data[:msg.data.length - signature.length - 32],
                        bytes32(block.chainid),
                        bytes20(address(this))
                    )
                ).toEthSignedMessageHash().recover(signature),
            "validateMultiCall: invalid signature"
        );

        for (uint i = 0; i < targetArr.length; i++) {
            (bool success, bytes memory result) = targetArr[i].call{
                value: valueArr[i]
            }(dataArr[i]);
            
            if (!success) {
                assembly {
                    revert(add(result, 32), mload(result))
                }
            }
        }
    }
}
