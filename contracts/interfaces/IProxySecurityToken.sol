// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;


import "../immutable/StorageToken.sol";
import "../library/TokenLibrary.sol";
import "../interfaces/ISecurityTokenImmutable.sol";

interface IProxySecurityToken {

    /**
     * @notice Returns the version of the token contract
     * @return TOKEN_VERSION {string} version of the smart contract
     */
    function version() external pure returns (string memory);

    /**
     * @notice Returns the address wallet of the smart contract owner.
     * @return owner {address} wallet addres from owner
     */
    function owner() external view returns (address);

    /**
     * @notice Transfer ownership of the smart contract
     * @param account {address} address of the new owner
     */
    function transferOwnership(address account) external;

    /**
     * @notice Mint and send `amount` tokens to `to`
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     * @param to {address} wallet to send the token
     * @param amount {uint256} amount to mint
     * @return result {boolean} success or failure
     */
    function mint(address to, uint256 amount) external payable returns (bool);

    /**
     * @notice Remove `amount` tokens from `account`
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     * @param account {address} wallet to burn the token
     * @param amount {uint256} amount to burn
     */
    function burn(address account, uint256 amount) external returns (bool);

    /**
     * @notice Return amount of refoundable for amount of tokens burned
     * @param amount {uint256} amout of tokens burn
     * @return wei {uint256} amount of wei refoundable
     */
    function refoundable(uint256 amount) external view returns(uint256);

    /**
     * @dev Transfer and send `amount` tokens from `_msgSender()` to `to`
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     * @param to {address} wallet to transfer the token
     * @param amount {uint256[]} amount to transfer
     */
    function transfer(address to, uint256 amount) external returns (bool);

    /**
     * @dev Transfer and send `amount` tokens from `from` to `to`
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     * @param from {address} wallet from transfer the token
     * @param to {address} wallet to transfer the token
     * @param amount {uint256[]} amount to transfer
     */
    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    /**
     * @notice Interface of transfer method, return hex code error message
     * @param operator {address} operator of transaction (sender)
     * @param from {address} the origin of the token transfer
     * @param to {address} the recipient of the token transfer
     * @param value {uint256} the number of tokens transferred
     * @return hex {bytes1} code error message
     */
    function canTransfer(
        address operator,
        address from,
        address to,
        uint256 value
    ) external view returns (bytes1);

    /**
     * @notice Owner request (and request for withdraw if _rules.voteToWithdraw == true) with a comment and amount (Request can't be equal to last request and set request restart all votes)
     * @param _messageRequest {string} message comment of request
     * @param _amountRequest {uint256} amount of request
     */
    function setRequest(string memory _messageRequest, uint256 _amountRequest) external;

    /**
     * @notice Get request to by owner
     * @return request {string, uint256, uint256, uint256} (messageRequest, amountRequest, acceptedRequest, refusedRequest)
     */
    function getRequest() external view returns(string memory , uint256, uint256, uint256);

    /**
     * @notice Shareholder vote to the request of owner
     * @param vote {boolean} accept (true) or reject (false) request
     * @param amount {uint256} amount of vote request, need to be lower than balance of shareholder
     */
    function voteToRequest(bool vote, uint256 amount) external;

    /**
     * @notice Withdraw tokens amount of contract balance
     * @param amount {uint256} the number of tokens transferred
     * @param receiver {address} the recipient of the token transfer
     */
    function withdraw(uint256 amount, address receiver) external;

    /**
     * @notice Check amount of withdrawable
     * @param amount {uint256} the number of tokens withdraw
     * @return weiWithdrawable {uint256} the number of wei transferrable
     */
    function withdrawable(uint256 amount) external view returns(uint256 weiWithdrawable);
}
