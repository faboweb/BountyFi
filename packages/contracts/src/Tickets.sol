// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";

contract Tickets is AccessControl {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");

    mapping(uint256 => mapping(address => uint256)) public balances;
    mapping(uint256 => mapping(address => uint256)) public lastClaimDay; // day = block.timestamp / 86400

    event TicketsMinted(address indexed user, uint256 indexed campaignId, uint256 amount, bytes32 submissionHash);
    event TicketsBurned(address indexed user, uint256 indexed campaignId, uint256 amount);
    event TicketsSpent(address indexed user, uint256 indexed campaignId, uint256 amount);

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
    }

    function mint(address user, uint256 campaignId, uint256 amount, bytes32 submissionHash) external onlyRole(MINTER_ROLE) {
        uint256 currentDay = block.timestamp / 1 days;
        require(lastClaimDay[campaignId][user] < currentDay, "User already claimed ticket today for this campaign");
        
        balances[campaignId][user] += amount;
        lastClaimDay[campaignId][user] = currentDay;
        
        emit TicketsMinted(user, campaignId, amount, submissionHash);
    }

    function mintReward(address user, uint256 campaignId, uint256 amount, bytes32 rewardHash) external onlyRole(MINTER_ROLE) {
        // Bypasses daily limit check
        balances[campaignId][user] += amount;
        emit TicketsMinted(user, campaignId, amount, rewardHash);
    }

    function burn(address user, uint256 campaignId, uint256 amount) external onlyRole(BURNER_ROLE) {
        require(balances[campaignId][user] >= amount, "Insufficient tickets to burn");
        balances[campaignId][user] -= amount;
        emit TicketsBurned(user, campaignId, amount);
    }

    function spend(address user, uint256 campaignId, uint256 amount) external onlyRole(BURNER_ROLE) {
        require(balances[campaignId][user] >= amount, "Insufficient tickets");
        balances[campaignId][user] -= amount;
        emit TicketsSpent(user, campaignId, amount);
    }

    function balanceOf(address user, uint256 campaignId) external view returns (uint256) {
        return balances[campaignId][user];
    }
}
