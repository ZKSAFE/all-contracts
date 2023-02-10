// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "hardhat/console.sol";

contract BatchCallWallet is Ownable {
    using ECDSA for bytes32;

    uint public nonce;
    

    constructor() {}

    receive() external payable {}

    function call(
        address to,
        uint value,
        bytes calldata data
    ) public onlyOwner {
        (bool success, bytes memory result) = to.call{value: value}(data);
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
        nonce += toArr.length;
    }


    function validateBatchCall(
        address[] calldata toArr,
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
        nonce += toArr.length;
    }
}
