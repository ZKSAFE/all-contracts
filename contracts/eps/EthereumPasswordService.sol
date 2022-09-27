// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Context.sol";
import "./verifier.sol";

contract EthereumPasswordService is Context {
    Verifier verifier = new Verifier();

    event SetPassword(address indexed user, uint indexed pwdhash);

    event Verified(address indexed user, uint indexed nonce);

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    mapping(address => uint) public pwdhashOf;

    mapping(address => uint) public nonceOf;

    uint public fee = 0.1 ether;

    address private _owner;

    constructor() {
        _owner = _msgSender();
    }

    /**
     * @dev Throws if called by any account other than the owner.
     */
    modifier onlyOwner() {
        _checkOwner();
        _;
    }

    /**
     * @dev Returns the address of the current owner.
     */
    function owner() public view virtual returns (address) {
        return _owner;
    }

    /**
     * @dev Throws if the sender is not the owner.
     */
    function _checkOwner() internal view virtual {
        require(owner() == _msgSender(), "Ownable: caller is not the owner");
    }

    function transferOwnership(
        uint[8] memory proof,
        uint newOwner,
        uint expiration,
        uint allhash
    ) public onlyOwner {
        require(newOwner != 0, "Ownable: new owner is the zero address");

        verify(owner(), proof, newOwner, expiration, allhash);

        address newOwnerAddr = address(uint160(newOwner));
        address oldOwner = _owner;
        _owner = newOwnerAddr;

        emit OwnershipTransferred(oldOwner, newOwnerAddr);
    }

    function setFee(
        uint[8] memory proof,
        uint newFee,
        uint expiration,
        uint allhash
    ) public onlyOwner {
        verify(owner(), proof, newFee, expiration, allhash);
        fee = newFee;
    }

    function resetPassword(
        uint[8] memory proof1,
        uint expiration1,
        uint allhash1,
        uint[8] memory proof2,
        uint pwdhash2,
        uint expiration2,
        uint allhash2
    ) public payable {
        require(
            msg.value >= fee,
            "EthereumPasswordService::resetPassword: fee not enough"
        );

        uint nonce = nonceOf[_msgSender()];

        if (nonce == 0) {
            //init password

            pwdhashOf[_msgSender()] = pwdhash2;
            nonceOf[_msgSender()] = 1;
            verify(_msgSender(), proof2, 0, expiration2, allhash2);
        } else {
            //reset password

            // check old pwdhash
            verify(_msgSender(), proof1, 0, expiration1, allhash1);

            // check new pwdhash
            pwdhashOf[_msgSender()] = pwdhash2;
            verify(_msgSender(), proof2, 0, expiration2, allhash2);
        }

        payable(owner()).transfer(msg.value);

        emit SetPassword(_msgSender(), pwdhash2);
    }

    function verify(
        address user,
        uint[8] memory proof,
        uint datahash,
        uint expiration,
        uint allhash
    ) public {
        require(
            block.timestamp < expiration,
            "EthereumPasswordService::verify: expired"
        );

        uint pwdhash = pwdhashOf[user];
        require(
            pwdhash != 0,
            "EthereumPasswordService::verify: user not exist"
        );

        uint nonce = nonceOf[user];
        uint fullhash = uint(keccak256(abi.encodePacked(expiration, block.chainid, nonce, datahash))) / 8; // 256b->254b
        require(
            verifyProof(proof, pwdhash, fullhash, allhash),
            "EthereumPasswordService::verify: verify proof fail"
        );

        nonceOf[user] = nonce + 1;

        emit Verified(user, nonce);
    }

    /////////// util ////////////

    function verifyProof(
        uint[8] memory proof,
        uint pwdhash,
        uint fullhash, //254b
        uint allhash
    ) internal view returns (bool) {
        return
            verifier.verifyProof(
                [proof[0], proof[1]],
                [[proof[2], proof[3]], [proof[4], proof[5]]],
                [proof[6], proof[7]],
                [pwdhash, fullhash, allhash]
            );
    }
}
