// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "hardhat/console.sol";

contract AssetsCheck {

    mapping (address => uint) public snappedETHBalance;

    mapping (address => mapping (address => uint)) public snappedTokenBalance;

    mapping (address => mapping (uint => mapping (address => uint))) public snappedNFT1155Balance;


    constructor() {}

    //ETH
    function checkETHBalanceEqualTo(address wallet, uint value) public view {
        require(wallet.balance == value, "checkETHBalanceEqualTo fail");
    }

    function checkETHBalanceNotLessThan(address wallet, uint value) public view {
        require(wallet.balance >= value, "checkETHBalanceNotLessThan fail");
    }

    function checkETHBalanceNotMoreThan(address wallet, uint value) public view {
        require(wallet.balance <= value, "checkETHBalanceNotLessThan fail");
    }

    function snapETHBalance(address wallet) public {
        snappedETHBalance[wallet] = wallet.balance;
    }

    function checkETHBalanceIncreaseEqualTo(address wallet, uint value) public view {
        require(wallet.balance == snappedETHBalance[wallet] + value, "checkETHBalanceIncreaseEqualTo fail");
    }

    function checkETHBalanceIncreaseNotLessThan(address wallet, uint value) public view {
        require(wallet.balance >= snappedETHBalance[wallet] + value, "checkETHBalanceIncreaseNotLessThan fail");
    }

    function checkETHBalanceIncreaseNotMoreThan(address wallet, uint value) public view {
        require(wallet.balance <= snappedETHBalance[wallet] + value, "checkETHBalanceIncreaseNotMoreThan fail");
    }

    function checkETHBalanceDecreaseEqualTo(address wallet, uint value) public view {
        require(wallet.balance == snappedETHBalance[wallet] - value, "checkETHBalanceDecreaseEqualTo fail");
    }

    function checkETHBalanceDecreaseNotLessThan(address wallet, uint value) public view {
        require(wallet.balance <= snappedETHBalance[wallet] - value, "checkETHBalanceDecreaseNotLessThan fail");
    }

    function checkETHBalanceDecreaseNotMoreThan(address wallet, uint value) public view {
        require(wallet.balance >= snappedETHBalance[wallet] - value, "checkETHBalanceDecreaseNotMoreThan fail");
    }


    //ERC20
    function checkTokenBalanceEqualTo(address wallet, address tokenAddr, uint value) public view {
        require(IERC20(tokenAddr).balanceOf(wallet) == value, "checkTokenBalanceEqualTo fail");
    }

    function checkTokenBalanceNotLessThan(address wallet, address tokenAddr, uint value) public view {
        require(IERC20(tokenAddr).balanceOf(wallet) >= value, "checkTokenBalanceNotLessThan fail");
    }

    function checkTokenBalanceNotMoreThan(address wallet, address tokenAddr, uint value) public view {
        require(IERC20(tokenAddr).balanceOf(wallet) <= value, "checkTokenBalanceNotLessThan fail");
    }

    function snapTokenBalance(address wallet, address tokenAddr) public {
        snappedTokenBalance[tokenAddr][wallet] = IERC20(tokenAddr).balanceOf(wallet);
    }

    function checkTokenBalanceIncreaseEqualTo(address wallet, address tokenAddr, uint value) public view {
        require(IERC20(tokenAddr).balanceOf(wallet) == snappedTokenBalance[tokenAddr][wallet] + value, "checkTokenBalanceIncreaseEqualTo fail");
    }

    function checkTokenBalanceIncreaseNotLessThan(address wallet, address tokenAddr, uint value) public view {
        require(IERC20(tokenAddr).balanceOf(wallet) >= snappedTokenBalance[tokenAddr][wallet] + value, "checkTokenBalanceIncreaseNotLessThan fail");
    }

    function checkTokenBalanceIncreaseNotMoreThan(address wallet, address tokenAddr, uint value) public view {
        require(IERC20(tokenAddr).balanceOf(wallet) <= snappedTokenBalance[tokenAddr][wallet] + value, "checkTokenBalanceIncreaseNotMoreThan fail");
    }

    function checkTokenBalanceDecreaseEqualTo(address wallet, address tokenAddr, uint value) public view {
        require(IERC20(tokenAddr).balanceOf(wallet) == snappedTokenBalance[tokenAddr][wallet] - value, "checkTokenBalanceDecreaseEqualTo fail");
    }

    function checkTokenBalanceDecreaseNotLessThan(address wallet, address tokenAddr, uint value) public view {
        require(IERC20(tokenAddr).balanceOf(wallet) <= snappedTokenBalance[tokenAddr][wallet] - value, "checkTokenBalanceDecreaseNotLessThan fail");
    }

    function checkTokenBalanceDecreaseNotMoreThan(address wallet, address tokenAddr, uint value) public view {
        require(IERC20(tokenAddr).balanceOf(wallet) >= snappedTokenBalance[tokenAddr][wallet] - value, "checkTokenBalanceDecreaseNotMoreThan fail");
    }


    //ERC721
    function checkOwnNFT(address wallet, address nftAddr, uint tokenId) public view {
        require(IERC721(nftAddr).ownerOf(tokenId) == wallet, "checkOwnNFT fail");
    }

    function checkNotOwnNFT(address wallet, address nftAddr, uint tokenId) public view {
        require(IERC721(nftAddr).ownerOf(tokenId) != wallet, "checkOwnNFT fail");
    }
    

    //ERC1155
    function checkNFT1155BalanceEqualTo(address wallet, address nftAddr, uint tokenId, uint value) public view {
        require(IERC1155(nftAddr).balanceOf(wallet, tokenId) == value, "checkNFT1155BalanceEqualTo fail");
    }
    
    function checkNFT1155BalanceNotLessThan(address wallet, address nftAddr, uint tokenId, uint value) public view {
        require(IERC1155(nftAddr).balanceOf(wallet, tokenId) >= value, "checkNFT1155BalanceNotLessThan fail");
    }
    
    function checkNFT1155BalanceNotMoreThan(address wallet, address nftAddr, uint tokenId, uint value) public view {
        require(IERC1155(nftAddr).balanceOf(wallet, tokenId) <= value, "checkNFT1155BalanceNotLessThan fail");
    }

    function snapNFT1155Balance(address wallet, address nftAddr, uint tokenId) public {
        snappedNFT1155Balance[nftAddr][tokenId][wallet] = IERC1155(nftAddr).balanceOf(wallet, tokenId);
    }

    function checkNFT1155BalanceIncreaseEqualTo(address wallet, address nftAddr, uint tokenId, uint value) public view {
        require(IERC1155(nftAddr).balanceOf(wallet, tokenId) == snappedNFT1155Balance[nftAddr][tokenId][wallet] + value, "checkNFT1155BalanceIncreaseEqualTo fail");
    }

    function checkNFT1155BalanceIncreaseNotLessThan(address wallet, address nftAddr, uint tokenId, uint value) public view {
        require(IERC1155(nftAddr).balanceOf(wallet, tokenId) >= snappedNFT1155Balance[nftAddr][tokenId][wallet] + value, "checkNFT1155BalanceIncreaseNotLessThan fail");
    }

    function checkNFT1155BalanceIncreaseNotMoreThan(address wallet, address nftAddr, uint tokenId, uint value) public view {
        require(IERC1155(nftAddr).balanceOf(wallet, tokenId) <= snappedNFT1155Balance[nftAddr][tokenId][wallet] + value, "checkNFT1155BalanceIncreaseNotMoreThan fail");
    }

    function checkNFT1155BalanceDecreaseEqualTo(address wallet, address nftAddr, uint tokenId, uint value) public view {
        require(IERC1155(nftAddr).balanceOf(wallet, tokenId) == snappedNFT1155Balance[nftAddr][tokenId][wallet] - value, "checkNFT1155BalanceDecreaseEqualTo fail");
    }

    function checkNFT1155BalanceDecreaseNotLessThan(address wallet, address nftAddr, uint tokenId, uint value) public view {
        require(IERC1155(nftAddr).balanceOf(wallet, tokenId) <= snappedNFT1155Balance[nftAddr][tokenId][wallet] - value, "checkNFT1155BalanceDecreaseNotLessThan fail");
    }

    function checkNFT1155BalanceDecreaseNotMoreThan(address wallet, address nftAddr, uint tokenId, uint value) public view {
        require(IERC1155(nftAddr).balanceOf(wallet, tokenId) >= snappedNFT1155Balance[nftAddr][tokenId][wallet] - value, "checkNFT1155BalanceDecreaseNotMoreThan fail");
    }
}
