// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Context.sol";
import "./ZKPass.sol";
import "./ZKID.sol";

contract SimpleWallet is Context {

    ZKPass public zkPass;

    ZKID public zkID;

    event Call(
        address indexed contractAddr,
        bytes sigData,
        bytes returnData
    );

    uint public ownerId;

    constructor(uint _ownerId, address zkPassAddr, address zkIDAddr) {
        ownerId = _ownerId;
        zkPass = ZKPass(zkPassAddr);
        zkID = ZKID(zkIDAddr);
    }

    receive() external payable {}

    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    function owner() public view returns (address) {
        return zkID.ownerOf(ownerId);
    }

    function _checkOwner() internal view {
        require(owner() == _msgSender(), "Safebox: caller is not the owner");
    }


    ///////////////////////////////////
    // Call
    ///////////////////////////////////

    function call(
        uint[8] memory proof,
        address contractAddr,
        bytes calldata sigData,
        uint expiration,
        uint allhash
    ) public {

        uint datahash = uint(keccak256(abi.encodePacked(contractAddr, sigData)));
        zkPass.verify(owner(), proof, datahash, expiration, allhash);

        (bool success, bytes memory returnData) = contractAddr.call(sigData);
        require(success, "call: call fail");

        emit Call(contractAddr, sigData, returnData);
    }

    function batchCall(
        uint[8] memory proof,
        address[] calldata contractAddrArr,
        bytes[] calldata sigDataArr,
        uint expiration,
        uint allhash
    ) public {
        require(contractAddrArr.length == sigDataArr.length, "batchCall: params error");
        
        bytes memory packed;
        for (uint i=0; i<contractAddrArr.length; i++) {
            address contractAddr = contractAddrArr[i];
            bytes memory sigData = sigDataArr[i];
            (bool success, bytes memory returnData) = contractAddr.call(sigData);
            require(success, "batchCall: call fail");
            emit Call(contractAddr, sigData, returnData);

            packed = abi.encodePacked(packed, contractAddr, sigData);
        }

        uint datahash = uint(keccak256(packed));
        zkPass.verify(owner(), proof, datahash, expiration, allhash);
    }

}
