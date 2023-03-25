// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/interfaces/IERC721.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "../interfaces/IElasticSignWallet.sol";
import "../zkPass/ZKID.sol";
import "../zkPass/ZKPass.sol";
import "hardhat/console.sol";

contract SafeboxV2 is ReentrancyGuard {
    using ECDSA for bytes32;
    using ERC165Checker for address;

    IElasticSignature public zkPass;

    bytes4 public constant ERC20_TRANSFER = bytes4(keccak256("transfer(address,uint256)"));
    bytes4 public constant ERC20_721_APPROVE = bytes4(keccak256("approve(address,uint256)")); //ERC20 ERC721 the same
    bytes4 public constant ERC721_TRANSFER_FROM = bytes4(keccak256("transferFrom(address,address,uint256)"));
    bytes4 public constant ERC721_SAFE_TRANSFER_FROM_1 = bytes4(keccak256("safeTransferFrom(address,address,uint256,bytes)"));
    bytes4 public constant ERC721_SAFE_TRANSFER_FROM_2 = bytes4(keccak256("safeTransferFrom(address,address,uint256)"));
    bytes4 public constant ERC721_SET_APPROVE_FOR_ALL = bytes4(keccak256("setApprovalForAll(address,bool)"));
    bytes4 public constant IID_IERC721 = type(IERC721).interfaceId;

    uint public nonce = 1;

    uint public ethLimit = 10 ether;
    uint public ethFree = ethLimit;
    uint public lastETHSentTime;
    uint public freeETHPerSec = 1 ether;

    uint public usdLimit = 10 ether;
    uint public usdFree = usdLimit;
    uint public lastUSDSentTime;
    uint public freeUSDPerSec = 1 ether;

    mapping(address => bool) public USDAddrs;

    address public pkAddr;

    modifier needPk() {
        require(pkAddr == msg.sender, "checkPk: pkAddr must be msg.sender");
        _;
    }

    modifier checkPk() {
        require(pkAddr == address(0) || pkAddr == msg.sender, "checkPk: pkAddr must be 0x0 or msg.sender");
        _;
    }

    constructor(address[] memory addrArr) {
        zkPass = ZKPass(addrArr[0]);
        for (uint i=1; i<addrArr.length; i++) {
            USDAddrs[addrArr[i]] = true;
        }
    }

    receive() external payable {}


    ///////////////////////////////////
    // Pwd & Pk
    ///////////////////////////////////

    function resetPwd(
        uint[8] calldata proof1,
        uint expiration1,
        uint allhash1,
        uint[8] calldata proof2,
        uint pwdhash2,
        uint expiration2,
        uint allhash2
    ) public nonReentrant checkPk {
        zkPass.resetPassword(proof1, expiration1, allhash1, proof2, pwdhash2, expiration2, allhash2);
    }

    function resetPk(
        address _pkAddr,
        uint[8] calldata proof,
        uint expiration,
        uint allhash
    ) public nonReentrant checkPk {
        uint datahash = uint(uint160(_pkAddr));
        zkPass.verify(address(this), proof, datahash, expiration, allhash);

        pkAddr = _pkAddr;
    }
    

    ///////////////////////////////////
    // WithdrawLimit
    ///////////////////////////////////

    function getWithdrawLimit() public view returns(uint, uint) {
        uint ethFreeValue = (block.timestamp - lastETHSentTime) * freeETHPerSec + ethFree;
        if (ethFreeValue > ethLimit) {
            ethFreeValue = ethLimit;
        }

        uint usdFreeValue = (block.timestamp - lastUSDSentTime) * freeUSDPerSec + usdFree;
        if (usdFreeValue > usdLimit) {
            usdFreeValue = usdLimit;
        }

        return (ethFreeValue, usdFreeValue);
    }

    function setupWithdrawLimit(
        uint _ethLimit,
        uint _freeETHPerSec,
        uint _usdLimit,
        uint _freeUSDPerSec,
        uint[8] calldata proof,
        uint expiration,
        uint allhash
    ) public nonReentrant needPk {
        uint datahash = uint(
            keccak256(abi.encodePacked(_ethLimit, _freeETHPerSec, _usdLimit, _freeUSDPerSec))
        );
        zkPass.verify(address(this), proof, datahash, expiration, allhash);

        ethLimit = _ethLimit;
        freeETHPerSec = _freeETHPerSec;
        usdLimit = _usdLimit;
        freeUSDPerSec = _freeUSDPerSec;
    }

    function setupUSDAddrs(
        address[] calldata deleteUSDAddr,
        address[] calldata addUSDAddr,
        uint[8] calldata proof,
        uint expiration,
        uint allhash
    ) public nonReentrant needPk {
        uint datahash = uint(
            keccak256(abi.encodePacked(deleteUSDAddr, addUSDAddr))
        );
        zkPass.verify(address(this), proof, datahash, expiration, allhash);

        uint i;
        for (i=0; i<deleteUSDAddr.length; i++) {
            delete USDAddrs[deleteUSDAddr[i]];
        }
        for (i=0; i<addUSDAddr.length; i++) {
            USDAddrs[deleteUSDAddr[i]] = true;
        }
    }


    ///////////////////////////////////
    // Call
    ///////////////////////////////////

    function covertToDecimals18(uint amount, uint8 decimals) internal pure returns(uint) {
        if (decimals == 18) {
            return amount;
        } else if (decimals < 18) {
            return amount * 10 ** (18 - decimals);
        } else{
            return amount / 10 ** (decimals - 18);
        }
    }

    function call(
        address to,
        uint value,
        bytes calldata data
    ) public nonReentrant needPk {
        bytes4 sig;
        if (data.length >= 4) {
            sig = bytes4(data[:4]);
        }

        if (to.supportsInterface(IID_IERC721)) {
            // withdraw NFT
            if (sig == ERC721_SAFE_TRANSFER_FROM_1 || sig == ERC721_SAFE_TRANSFER_FROM_2 || sig == ERC721_TRANSFER_FROM) {
                address from = address(uint160(uint(bytes32(data[4:36]))));
                require(from != address(this), "call: NFT transter limited");
            }
            require(sig != ERC20_721_APPROVE && sig != ERC721_SET_APPROVE_FOR_ALL, "call: NFT transter limited");
        
        } else if (sig == ERC20_TRANSFER || sig == ERC20_721_APPROVE) {
            // withdraw Token
            if (USDAddrs[to]) {
                // withdraw USD
                uint amount = uint(bytes32(data[36:]));
                uint8 decimals = IERC20Metadata(to).decimals();
                uint standardAmount = covertToDecimals18(amount, decimals);

                usdFree = (block.timestamp - lastUSDSentTime) * freeUSDPerSec + usdFree;
                if (usdFree > usdLimit) {
                    usdFree = usdLimit;
                }

                require(standardAmount <= usdFree, "call: USD transter limited");

                usdFree -= standardAmount;
                lastUSDSentTime = block.timestamp;
                
            } else { 
                // withdraw Non-USD
                revert("call: Token transter limited");
            }
        }

        // withdraw ETH
        if (value > 0) {
            ethFree = (block.timestamp - lastETHSentTime) * freeETHPerSec + ethFree;
            if (ethFree > ethLimit) {
                ethFree = ethLimit;
            }
            
            require(value <= ethFree, "call: ETH transter limited");

            ethFree -= value;
            lastETHSentTime = block.timestamp;
        }
        
        (bool success, bytes memory result) = to.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
        nonce++;
    }

    function call2(
        address to,
        uint value,
        bytes calldata data,
        uint[8] calldata proof,
        uint expiration,
        uint allhash
    ) public nonReentrant needPk {
        uint datahash = uint(
            keccak256(abi.encodePacked(to, value, data))
        );
        zkPass.verify(address(this), proof, datahash, expiration, allhash);

        (bool success, bytes memory result) = to.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

}