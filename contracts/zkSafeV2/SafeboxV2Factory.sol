// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Context.sol";
import "../zkPass/ZKPass.sol";
import "./SafeboxV2.sol";

contract SafeboxV2Factory is Context {
    ZKPass public zkPass;

    event SafeboxOwner(address indexed user, address indexed safebox);

    mapping(address => address) public userToSafebox;

    mapping(address => uint) public nonceOf;

    constructor(address zkPassAddr) {
        zkPass = ZKPass(zkPassAddr);
    }

    ///////////////////////////////////
    // Safebox
    ///////////////////////////////////

    function createSafebox() public returns (address) {
        require(
            userToSafebox[_msgSender()] == address(0),
            "SafeboxFactory::createSafebox: Safebox exist"
        );

        uint nonce = nonceOf[_msgSender()] + 1;
        nonceOf[_msgSender()] = nonce;
        bytes32 salt = keccak256(abi.encodePacked(_msgSender(), nonce));

        SafeboxV2 box = new SafeboxV2{salt: salt}();
        box.init(_msgSender());

        userToSafebox[_msgSender()] = address(box);

        emit SafeboxOwner(_msgSender(), address(box));
        return address(box);
    }

    function getSafeboxAddr(address user) public view returns (address) {
        address existAddr = userToSafebox[user];

        if (existAddr != address(0)) {
            return existAddr;
        }

        uint nonce = nonceOf[user] + 1;
        bytes32 salt = keccak256(abi.encodePacked(user, nonce));
        address predictedAddr = address(
            uint160(
                uint(
                    keccak256(
                        abi.encodePacked(
                            bytes1(0xff),
                            address(this),
                            salt,
                            keccak256(type(SafeboxV2).creationCode)
                        )
                    )
                )
            )
        );

        return predictedAddr;
    }

}
