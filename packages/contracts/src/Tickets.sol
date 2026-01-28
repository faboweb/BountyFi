// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Tickets {
    mapping(address => uint256) public balances;
    address public verifier; // Edge Function wallet

    event TicketsMinted(address indexed user, uint256 amount, bytes32 submissionHash);

    constructor() {
        verifier = msg.sender;
    }

    modifier onlyVerifier() {
        require(msg.sender == verifier, "Only verifier can mint");
        _;
    }

    function mint(address user, uint256 amount, bytes32 submissionHash) external onlyVerifier {
        balances[user] += amount;
        emit TicketsMinted(user, amount, submissionHash);
    }

    function balanceOf(address user) external view returns (uint256) {
        return balances[user];
    }

    function setVerifier(address _verifier) external {
        require(msg.sender == verifier, "Only verifier can change verifier");
        verifier = _verifier;
    }
}
