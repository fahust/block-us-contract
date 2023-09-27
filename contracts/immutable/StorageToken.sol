// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../library/TokenLibrary.sol";

contract StorageToken {

    uint256 internal constant oneDay = 86400;
    uint256 internal paused;
    uint256 internal lastWithdraw;

    uint256 internal amountRequest;
    uint256 internal acceptedRequest;
    uint256 internal refusedRequest;

    address internal OWNER;

    TokenLibrary.Rules internal rules;

    mapping(uint256 => TokenLibrary.Transfer) internal _transfers;

    mapping(address => string) internal hasVoted;

    uint32 internal _transfersCount;

    string internal constant TOKEN_VERSION = "0.0.1";
    string internal messageRequest;
    
    error NotTheOwner(address sender, bytes32 role);
    error TransferFromZeroAddress(address from);
    error TransferToZeroAddress(address to);
    error TransferAmountExceedsBalance( uint256 fromBalance, address from, uint256 amount);
    error MintFromZeroAddress(address account);
    error MintDoesNotWork(address account, uint256 previousBalance, uint256 currentBalance, uint256 amount);
    error BurnFromZeroAddress(address account);
    error BurnAmountExceedsBalance(address account, uint256 accountBalance, uint256 amount);

    event TransferOwnership(address indexed oldAccount, address indexed newAccount);
    event Transfer(string eventType, address indexed from, address indexed to, uint256 value);
    event Paused(address indexed sender, uint256 indexed paused);
    
    function _now() public view returns (uint256) {
        return block.timestamp;
    }

    function compare(string memory str1, string memory str2) public pure returns (bool) {
        if (bytes(str1).length != bytes(str2).length) {
            return false;
        }
        return keccak256(abi.encodePacked(str1)) == keccak256(abi.encodePacked(str2));
    }

}