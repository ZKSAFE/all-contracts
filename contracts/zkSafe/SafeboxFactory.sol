// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Context.sol";
import "../eps/EthereumPasswordService.sol";
import "./Safebox.sol";

contract SafeboxFactory is Context {
    EthereumPasswordService public eps;

    event SafeboxOwner(address indexed user, address indexed safebox);

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    mapping(address => address) public userToSafebox;

    mapping(address => uint) public nonceOf;

    address public feeTo;

    uint public fee;

    address private _owner;

    constructor(address epsAddr) {
        eps = EthereumPasswordService(epsAddr);
        _transferOwnership(_msgSender());
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
        require(owner() == _msgSender(), "SafeboxFactory: caller is not the owner");
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    function transferOwnership(
        uint[8] memory proof,
        address newOwner,
        uint expiration,
        uint allhash
    ) external payable onlyOwner {
        require(
            newOwner != address(0),
            "SafeboxFactory: new owner is the zero address"
        );

        uint datahash = uint(uint160(newOwner));
        eps.verify(owner(), proof, datahash, expiration, allhash);

        _transferOwnership(newOwner);
    }

    function setFee(
        uint[8] memory proof,
        uint newFee,
        uint expiration,
        uint allhash
    ) external payable onlyOwner {
        eps.verify(owner(), proof, newFee, expiration, allhash);

        fee = newFee;
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

        Safebox box = new Safebox{salt: salt}();
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
                            keccak256(type(Safebox).creationCode)
                        )
                    )
                )
            )
        );

        return predictedAddr;
    }

    function changeSafeboxOwner(address fromOwner, address newOwner)
        external
        payable
    {
        address safeboxAddr = userToSafebox[fromOwner];
        require(
            safeboxAddr == _msgSender(),
            "SafeboxFactory::changeSafeboxOwner: fromOwner error"
        );
        require(
            userToSafebox[newOwner] == address(0),
            "SafeboxFactory::changeSafeboxOwner: newOwner's Safebox exist"
        );

        require(
            msg.value >= fee,
            "SafeboxFactory::changeSafeboxOwner: fee not enough"
        );

        payable(feeTo).transfer(msg.value);

        userToSafebox[fromOwner] = address(0);
        userToSafebox[newOwner] = safeboxAddr;

        emit SafeboxOwner(fromOwner, address(0));
        emit SafeboxOwner(newOwner, safeboxAddr);
    }
}
