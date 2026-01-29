// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract Tickets {
    mapping(uint256 => mapping(address => uint256)) public balances;
    mapping(uint256 => mapping(address => uint256)) public lastClaimDay; // day = block.timestamp / 86400

    address public verifier; // Edge Function wallet
    address public prizeDistributor;

    event TicketsMinted(address indexed user, uint256 indexed campaignId, uint256 amount, bytes32 submissionHash);
    event TicketsSpent(address indexed user, uint256 indexed campaignId, uint256 amount);

    constructor() {
        verifier = msg.sender;
    }

    modifier onlyVerifier() {
        require(msg.sender == verifier, "Only verifier can mint");
        _;
    }

    modifier onlyPrizeDistributor() {
        require(msg.sender == prizeDistributor, "Only distributor can spend");
        _;
    }

    function mint(address user, uint256 campaignId, uint256 amount, bytes32 submissionHash) external onlyVerifier {
        uint256 currentDay = block.timestamp / 1 days;
        require(lastClaimDay[campaignId][user] < currentDay, "User already claimed ticket today for this campaign");
        
        balances[campaignId][user] += amount;
        lastClaimDay[campaignId][user] = currentDay;
        
        emit TicketsMinted(user, campaignId, amount, submissionHash);
    }

    function mintReward(address user, uint256 campaignId, uint256 amount, bytes32 rewardHash) external onlyVerifier {
        // Bypasses daily limit check
        balances[campaignId][user] += amount;
        emit TicketsMinted(user, campaignId, amount, rewardHash);
    }

    function spend(address user, uint256 campaignId, uint256 amount) external onlyPrizeDistributor {
        require(balances[campaignId][user] >= amount, "Insufficient tickets");
        balances[campaignId][user] -= amount;
        emit TicketsSpent(user, campaignId, amount);
    }

    function balanceOf(address user, uint256 campaignId) external view returns (uint256) {
        return balances[campaignId][user];
    }

    function setVerifier(address _verifier) external {
        require(msg.sender == verifier, "Only verifier can change verifier");
        verifier = _verifier;
    }

    function setPrizeDistributor(address _distributor) external {
        require(msg.sender == verifier, "Only verifier can change distributor");
        prizeDistributor = _distributor;
    }
}
