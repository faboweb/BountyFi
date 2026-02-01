// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/BountyFi.sol";
import "../src/BountyToken.sol";
import "../src/TrustNetwork.sol";
import "../src/Tickets.sol";

contract BountyFiPermissionlessTest is Test {
    BountyFi public bountyFi;
    BountyToken public token;
    TrustNetwork public trustNetwork;
    Tickets public tickets;
    
    // Test addresses
    address public deployer = address(0x1);
    address public randomUser = address(0x2);
    address public anotherUser = address(0x3);

    function setUp() public {
        // Deploy contracts as deployer
        vm.startPrank(deployer);
        
        // Deploy BountyToken first
        token = new BountyToken();
        
        // Deploy Tickets
        tickets = new Tickets();
        
        // Deploy TrustNetwork with Tickets address
        trustNetwork = new TrustNetwork(address(tickets));
        
        // Deploy BountyFi with all addresses
        bountyFi = new BountyFi(address(token), address(trustNetwork), address(tickets));
        
        vm.stopPrank();
    }

    function test_RandomUserCanCreateCampaign() public {
        // Switch to a random user (not the deployer, no special role)
        vm.startPrank(randomUser);

        // Create prizes
        BountyFi.Prize[] memory prizes = new BountyFi.Prize[](2);
        prizes[0] = BountyFi.Prize("Gold", "", "SponsorA", bytes32(0), 0, 0);
        prizes[1] = BountyFi.Prize("Silver", "", "SponsorB", bytes32(0), 0, 0);

        // This should succeed now that createCampaign is permissionless
        bountyFi.createCampaign(
            "Test Campaign",
            BountyFi.CampaignType.SINGLE_PHOTO,
            100 ether,  // reward
            10 ether,   // stake
            1000,       // radius in meters
            50,         // AI threshold
            prizes
        );

        vm.stopPrank();

        // Verify campaign was created
        (
            string memory title,
            BountyFi.CampaignType campaignType,
            uint256 rewardAmount,
            uint256 stakeAmount,
            uint256 radiusM,
            uint256 aiThreshold,
            bool active
        ) = bountyFi.campaigns(0);

        assertEq(title, "Test Campaign");
        assertEq(uint(campaignType), uint(BountyFi.CampaignType.SINGLE_PHOTO));
        assertEq(rewardAmount, 100 ether);
        assertEq(stakeAmount, 10 ether);
        assertEq(radiusM, 1000);
        assertEq(aiThreshold, 50);
        assertTrue(active);

        // Verify prizes were stored
        BountyFi.Prize[] memory storedPrizes = bountyFi.getCampaignPrizes(0);
        assertEq(storedPrizes.length, 2);
        assertEq(storedPrizes[0].label, "Gold");
        assertEq(storedPrizes[0].image, "");
        assertEq(storedPrizes[0].sponsor, "SponsorA");
        assertEq(storedPrizes[1].label, "Silver");
        assertEq(storedPrizes[1].sponsor, "SponsorB");
    }

    function test_MultipleUsersCanCreateCampaigns() public {
        // First user creates a campaign
        vm.prank(randomUser);
        BountyFi.Prize[] memory prizes1 = new BountyFi.Prize[](1);
        prizes1[0] = BountyFi.Prize("Prize1", "", "Sponsor1", bytes32(0), 0, 0);
        
        bountyFi.createCampaign(
            "User1 Campaign",
            BountyFi.CampaignType.TWO_PHOTO_CHANGE,
            50 ether,
            5 ether,
            500,
            60,
            prizes1
        );

        // Second user creates a campaign
        vm.prank(anotherUser);
        BountyFi.Prize[] memory prizes2 = new BountyFi.Prize[](1);
        prizes2[0] = BountyFi.Prize("Prize2", "", "Sponsor2", bytes32(0), 0, 0);
        
        bountyFi.createCampaign(
            "User2 Campaign",
            BountyFi.CampaignType.CHECKIN_SELFIE,
            75 ether,
            7 ether,
            750,
            55,
            prizes2
        );

        // Verify both campaigns exist
        (string memory title1,,,,,,) = bountyFi.campaigns(0);
        (string memory title2,,,,,,) = bountyFi.campaigns(1);

        assertEq(title1, "User1 Campaign");
        assertEq(title2, "User2 Campaign");
        assertEq(bountyFi.nextCampaignId(), 2);
    }

    function test_CampaignCreationEmitsEvent() public {
        vm.prank(randomUser);
        
        BountyFi.Prize[] memory prizes = new BountyFi.Prize[](1);
        prizes[0] = BountyFi.Prize("Test", "", "TestSponsor", bytes32(0), 0, 0);

        // Expect the CampaignCreated event
        vm.expectEmit(true, false, false, true);
        emit BountyFi.CampaignCreated(0, "Event Test", BountyFi.CampaignType.SINGLE_PHOTO, 100 ether, 1);

        bountyFi.createCampaign(
            "Event Test",
            BountyFi.CampaignType.SINGLE_PHOTO,
            100 ether,
            10 ether,
            1000,
            50,
            prizes
        );
    }
}
