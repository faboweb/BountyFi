// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ITickets {
    function spend(address user, uint256 campaignId, uint256 amount) external;
    function balanceOf(address user, uint256 campaignId) external view returns (uint256);
}

contract PrizeDistributor {
    address public owner;
    ITickets public ticketsContract;
    
    enum PrizeType { CASH, ITEM }

    struct CampaignConfig {
        uint256 prizeAmount;
        uint256 winChance; // 10000 = 100%, 100 = 1%
        uint256 prizesRemaining;
        PrizeType prizeType;
        bool active;
    }
    
    mapping(uint256 => CampaignConfig) public campaigns;
    
    event Won(address indexed user, uint256 campaignId, uint256 amount, PrizeType prizeType);
    event Lost(address indexed user, uint256 campaignId);
    event DonationReceived(address indexed donator, uint256 indexed campaignId, uint256 amount);

    constructor(address _tickets) {
        owner = msg.sender;
        ticketsContract = ITickets(_tickets);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    function fundCampaign(uint256 campaignId) external payable {
        require(msg.value > 0, "Must send funds");
        emit DonationReceived(msg.sender, campaignId, msg.value);
    }

    function setupCampaign(uint256 campaignId, uint256 prizeAmount, uint256 winChance, uint256 initialPrizes, PrizeType prizeType) external onlyOwner {
        campaigns[campaignId] = CampaignConfig({
            prizeAmount: prizeAmount,
            winChance: winChance,
            prizesRemaining: initialPrizes,
            prizeType: prizeType,
            active: true
        });
    }

    function setCampaignActive(uint256 campaignId, bool active) external onlyOwner {
        campaigns[campaignId].active = active;
    }

    function play(uint256 campaignId) external {
        CampaignConfig storage config = campaigns[campaignId];
        require(config.active, "Campaign not active");
        require(config.prizesRemaining > 0, "No prizes left");
        
        // Spend 1 ticket
        ticketsContract.spend(msg.sender, campaignId, 1);
        
        // Pseudo-randomness for MVP
        uint256 seed = uint256(keccak256(abi.encodePacked(block.prevrandao, block.timestamp, msg.sender)));
        uint256 roll = seed % 10000;
        
        if (roll < config.winChance) {
            config.prizesRemaining--;
            
            if (config.prizeType == PrizeType.CASH) {
                payable(msg.sender).transfer(config.prizeAmount);
            }
            // For PrizeType.ITEM, we just emit the event and the DB handles the claim code
            
            emit Won(msg.sender, campaignId, config.prizeAmount, config.prizeType);
        } else {
            emit Lost(msg.sender, campaignId);
        }
    }

    // Allow the contract to receive funds
    receive() external payable {}

    function withdraw(uint256 amount) external onlyOwner {
        payable(owner).transfer(amount);
    }
}
