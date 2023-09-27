// contracts/GLDToken.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library TokenLibrary {

    struct Transfer {
        string transferType;
        address from;
        address to;
        uint256 amount;
        uint256 date;
    }

    struct Rules {
        bool pausable;
        bool rulesModifiable;
        bool voteToWithdraw;
        uint256 dayToWithdraw;
        uint256 startFundraising;
        uint256 endFundraising;
        uint256 maxSupply;
    }
}