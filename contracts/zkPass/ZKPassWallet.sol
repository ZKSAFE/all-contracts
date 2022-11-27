// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Context.sol";
import "../interfaces/IElasticSignWallet.sol";
import "./ZKPass.sol";
import "./ZKID.sol";

contract ZKPassWallet is Context, IElasticSignWallet {
    ZKPass public zkPass;

    constructor(address zkPassAddr) {
        zkPass = ZKPass(zkPassAddr);
    }

    receive() external payable {}

    function resetPassword(
        uint[8] memory proof1,
        uint expiration1,
        uint allhash1,
        uint[8] memory proof2,
        uint pwdhash2,
        uint expiration2,
        uint allhash2
    ) public override {
        zkPass.resetPassword(
            proof1,
            expiration1,
            allhash1,
            proof2,
            pwdhash2,
            expiration2,
            allhash2
        );
        emit SetPassword(pwdhash2);
    }

    ///////////////////////////////////
    // Call
    ///////////////////////////////////

    function call(
        uint[8] memory proof,
        address contractAddr,
        bytes calldata signData,
        uint expiration,
        uint allhash
    ) public override {
        uint datahash = uint(
            keccak256(abi.encodePacked(contractAddr, signData))
        );
        zkPass.verify(address(this), proof, datahash, expiration, allhash);

        (bool success, bytes memory returnData) = contractAddr.call(signData);
        require(success, "call: call fail");

        emit Call(contractAddr, signData, returnData);
    }

    function batchCall(
        uint[8] memory proof,
        address[] calldata contractAddrArr,
        bytes[] calldata signDataArr,
        uint expiration,
        uint allhash
    ) public override {
        require(
            contractAddrArr.length == signDataArr.length,
            "batchCall: params error"
        );

        bytes memory packed;
        for (uint i = 0; i < contractAddrArr.length; i++) {
            address contractAddr = contractAddrArr[i];
            bytes memory signData = signDataArr[i];
            (bool success, bytes memory returnData) = contractAddr.call(
                signData
            );
            require(success, "batchCall: call fail");
            emit Call(contractAddr, signData, returnData);

            packed = abi.encodePacked(packed, contractAddr, signData);
        }

        uint datahash = uint(keccak256(packed));
        zkPass.verify(address(this), proof, datahash, expiration, allhash);
    }
}
