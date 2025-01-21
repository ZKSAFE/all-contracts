// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "../zkPass/ZKPass.sol";
import "./SafeboxV2Factory.sol";

contract SafeboxV2 is Context {
    using SafeERC20 for IERC20;

    ZKPass public zkPass;

    event WithdrawERC20(address indexed to, address tokenAddr, uint amount);

    event WithdrawERC721(address indexed to, address tokenAddr, uint tokenId);

    event WithdrawETH(address indexed to, uint amount);

    event OwnershipTransferred(
        address indexed previousOwner,
        address indexed newOwner
    );

    address public factory;

    address private _owner;

    bool isInit;

    constructor() {}

    receive() external payable {}

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
        require(owner() == _msgSender(), "SafeboxV2: caller is not the owner");
    }

    /**
     * @dev Transfers ownership of the contract to a new account (`newOwner`).
     * Internal function without access restriction.
     */
    function _transferOwnership(address newOwner) internal virtual {
        require(newOwner != _owner, "SafeboxV2: newOwner is the same with the owner");
        address oldOwner = _owner;
        _owner = newOwner;
        emit OwnershipTransferred(oldOwner, newOwner);
    }

    function init(address newOwner) external {
        require(!isInit, "SafeboxV2: function forbidden");
        isInit = true;
        factory = _msgSender();
        zkPass = SafeboxV2Factory(factory).zkPass();
        _transferOwnership(newOwner);
    }

    ///////////////////////////////////
    // withdraw
    ///////////////////////////////////

    function withdrawETH(
        uint[8] memory proof,
        uint amount,
        uint expiration,
        uint allhash
    ) external onlyOwner {
        uint datahash = amount;
        zkPass.verify(owner(), proof, datahash, expiration, allhash);

        payable(owner()).transfer(amount);

        emit WithdrawETH(owner(), amount);
    }

    function withdrawERC20(
        uint[8] memory proof,
        address tokenAddr,
        uint amount,
        uint expiration,
        uint allhash
    ) external onlyOwner {
        uint datahash = uint(keccak256(abi.encodePacked(tokenAddr, amount)));
        zkPass.verify(owner(), proof, datahash, expiration, allhash);

        IERC20(tokenAddr).safeTransfer(owner(), amount);

        emit WithdrawERC20(owner(), tokenAddr, amount);
    }

    function withdrawERC721(
        uint[8] memory proof,
        address tokenAddr,
        uint tokenId,
        uint expiration,
        uint allhash
    ) external onlyOwner {
        uint datahash = uint(keccak256(abi.encodePacked(tokenAddr, tokenId)));
        zkPass.verify(owner(), proof, datahash, expiration, allhash);

        IERC721(tokenAddr).transferFrom(address(this), owner(), tokenId);

        emit WithdrawERC721(owner(), tokenAddr, tokenId);
    }

}
