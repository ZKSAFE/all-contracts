// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "./SafeboxV2.sol";

contract SafeboxV2Factory is Context {

    address[] public safeboxParams;

    uint public count;

    mapping(uint => address) public safeboxes;

    mapping(address => uint) public nonceOf;

    event CreateSafebox(address indexed creator, address indexed safebox);

    constructor(address[] memory _safeboxParams) {
        safeboxParams = _safeboxParams;
    }

    ///////////////////////////////////
    // Safebox
    ///////////////////////////////////

    function createSafebox(
        uint[8] memory proof,
        uint pwdhash,
        uint expiration,
        uint allhash
    ) public returns (address) {
        count++;

        uint nonce = nonceOf[_msgSender()] + 1;
        nonceOf[_msgSender()] = nonce;
        bytes32 salt = keccak256(abi.encodePacked(_msgSender(), nonce));

        SafeboxV2 box = new SafeboxV2{salt: salt}(safeboxParams);
        box.resetPwd(proof, 0, 0, proof, pwdhash, expiration, allhash);

        safeboxes[count] = address(box);
        emit CreateSafebox(_msgSender(), address(box));
        return address(box);
    }

    function newSafeboxAddr(address user) public view returns (address) {
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
                            keccak256(
                                abi.encodePacked(type(SafeboxV2).creationCode, abi.encode(safeboxParams))
                            )
                        )
                    )
                )
            )
        );

        return predictedAddr;
    }

}
