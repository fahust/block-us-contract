// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;


import "../immutable/StorageToken.sol";
import "../library/TokenLibrary.sol";
import "../interfaces/ISecurityTokenImmutable.sol";
import "../interfaces/IProxySecurityToken.sol";
import "../roles/ReaderRole.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

contract ProxySecurityToken is ReaderRole, StorageToken, IProxySecurityToken {
    using SafeMath for uint;
    ISecurityTokenImmutable internal immutable TokenContract;

    constructor(address _securityTokenImmutableAddress) StorageToken() {
        OWNER = _msgSender();
        lastWithdraw = _now();
        TokenContract = ISecurityTokenImmutable(_securityTokenImmutableAddress);
        require(address(TokenContract) != address(0) && OWNER == TokenContract.owner(), "Token contract is not valid");
    }

    /// @dev Modifier to check if fundraising is open and max supply not reached.
    modifier fundraisable(uint256 amount) {
        TokenLibrary.Rules memory _rules = TokenContract.getRules();
        require(_now() >= _rules.startFundraising, "Fundraising not started");
        require(_now() <= _rules.endFundraising || _rules.endFundraising == 0, "Fundraising ended");
        require(TokenContract.totalSupply() + amount <= _rules.maxSupply || _rules.maxSupply == 0, "Max supply reached");
        _;
    }

    /**
     * @notice Returns the version of the token contract
     * @return TOKEN_VERSION {string} version of the smart contract
     */
    function version() external pure returns (string memory) {
        return TOKEN_VERSION;
    }

    /**
     * @notice Returns the address wallet of the smart contract owner.
     * @return owner {address} wallet addres from owner
     */
    function owner() public view override(Ownable, IProxySecurityToken) returns (address) {
        return OWNER;
    }

    /**
     * @notice Transfer ownership of the smart contract
     * @param account {address} address of the new owner
     */
    function transferOwnership(address account) public virtual override(Ownable, IProxySecurityToken) onlyOwner {
        emit TransferOwnership(OWNER, account);
        OWNER = account;
    }

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
    function mint(address to, uint256 amount) external payable fundraisable(amount) returns (bool) {
        require(msg.value >= amount, "Not enough eth");
        TokenContract.mint(to, amount);
        TokenContract.handlePayment{value: msg.value}(_msgSender());
        return true;
    }

    /**
     * @notice Remove `amount` tokens from `account`
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     * @param account {address} wallet to burn the token
     * @param amount {uint256} amount to burn
     */
    function burn(address account, uint256 amount)
        external
        returns (bool)
    {
        uint256 _refoundable = refoundable(amount);

        bool success = TokenContract.burn(account, amount, _refoundable);
        require(success, "Failed to send Ether");

        return true;
    }

    /**
     * @notice Return amount of refoundable for amount of tokens burned
     * @param amount {uint256} amout of tokens burn
     * @return wei {uint256} amount of wei refoundable
     */
    function refoundable(uint256 amount) public view returns(uint256) {
        return (address(TokenContract).balance.mul(100).div(TokenContract.totalSupply().mul(100))).mul(amount);
    }

    /**
     * @dev Transfer and send `amount` tokens from `_msgSender()` to `to`
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     * @param to {address} wallet to transfer the token
     * @param amount {uint256[]} amount to transfer
     */
    function transfer(address to, uint256 amount) external returns (bool) {
        require(canTransfer(_msgSender(), _msgSender(), to, amount) == (hex"51"));
        TokenContract.transferFrom(_msgSender(), to, amount);
        return true;
    }

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
    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        require(canTransfer(_msgSender(), from, to, amount) == (hex"51"));
        TokenContract.transferFrom(from, to, amount);
        return true;
    }

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
    ) public view returns (bytes1) {
        if (TokenContract.balanceOf(from) < value) return(hex"52");
        if(_now() < TokenContract.isPaused()) return(hex"54");
        if(from == address(0)) return(hex"56");
        if(to == address(0)) return(hex"57");
        if(OWNER != operator && from != operator ) return(hex"58");
        return (hex"51");
    }

    /**
     * @notice Owner request (and request for withdraw if _rules.voteToWithdraw == true) with a comment and amount (Request can't be equal to last request and set request restart all votes)
     * @param _messageRequest {string} message comment of request
     * @param _amountRequest {uint256} amount of request
     */
    function setRequest(string memory _messageRequest, uint256 _amountRequest) external onlyOwner {
        require(compare(messageRequest, _messageRequest) == false, "Request can't be equal to last request");
        messageRequest = _messageRequest;
        amountRequest = _amountRequest;
        acceptedRequest = 0;
        refusedRequest = 0;
    }

    /**
     * @notice Get request to by owner
     * @return request {string, uint256, uint256, uint256} (messageRequest, amountRequest, acceptedRequest, refusedRequest)
     */
    function getRequest() external view returns(string memory , uint256, uint256, uint256) {
        return (
            messageRequest,
            amountRequest,
            acceptedRequest,
            refusedRequest
        );
    }

    /**
     * @notice Shareholder vote to the request of owner
     * @param vote {boolean} accept (true) or reject (false) request
     * @param amount {uint256} amount of vote request, need to be lower than balance of shareholder
     */
    function voteToRequest(bool vote, uint256 amount) external {
        require(TokenContract.balanceOf(_msgSender()) >= amount, "Balance of sender is lower than the amount");
        require(compare(hasVoted[_msgSender()], messageRequest) == false, "Sender has already voted to this request");
        hasVoted[_msgSender()] = messageRequest;
        if(vote == true) acceptedRequest += amount;
        if(vote == false) refusedRequest += amount;
    }

    /**
     * @notice Withdraw tokens amount of contract balance
     * @param amount {uint256} the number of tokens transferred
     * @param receiver {address} the recipient of the token transfer
     */
    function withdraw(uint256 amount, address receiver) external onlyOwner {
        withdrawable(amount);
        TokenLibrary.Rules memory _rules = TokenContract.getRules();
        if(_rules.dayToWithdraw != 0)
            lastWithdraw += oneDay.mul(_rules.dayToWithdraw).mul(amount);
        if(_rules.voteToWithdraw == true) amountRequest = 0;
        bool success = TokenContract.withdraw(amount, receiver);
        require(success, "Withdraw failed");
    }

    /**
     * @notice Check if amout is withdrawable
     * @param amount {uint256} the number of tokens withdraw
     * @return weiWithdrawable {uint256} the number of wei transferrable
     */
    function withdrawable(uint256 amount) public view returns(uint256 weiWithdrawable) {
        TokenLibrary.Rules memory _rules = TokenContract.getRules();
        if(_rules.dayToWithdraw != 0)
            weiWithdrawable = ((_now() - lastWithdraw).div(oneDay.mul(_rules.dayToWithdraw)));
        require(_rules.voteToWithdraw == false || (acceptedRequest> refusedRequest && amount <= amountRequest), "No vote accepted");
        require(weiWithdrawable >= amount || _rules.dayToWithdraw == 0, "Not enough funds to withdraw");
        require(lastWithdraw + oneDay.mul(_rules.dayToWithdraw).mul(amount) <= _now() || _rules.dayToWithdraw == 0, "Time incorrect");
    }
}