// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/BountyToken.sol";
import "../src/Tickets.sol";
import "../src/TrustNetwork.sol";
import "../src/BountyFi.sol";

contract TrustNetworkTest is Test {
    BountyToken public token;
    Tickets public tickets;
    TrustNetwork public trustNetwork;
    BountyFi public bountyFi;

    address public owner = address(1);
    address public oracle = address(2);
    address public userA = address(3); // Truster
    address public userB = address(4); // Trustee / Submitter
    address public userC = address(5); // Referrer

    function setUp() public {
        vm.startPrank(owner);

        token = new BountyToken();
        tickets = new Tickets();
        trustNetwork = new TrustNetwork(address(tickets));
        bountyFi = new BountyFi(address(token), address(trustNetwork), address(tickets));

        // Setup Roles
        
        // Tickets Roles
        tickets.grantRole(tickets.MINTER_ROLE(), address(trustNetwork)); // TrustNetwork mints reward tickets
        tickets.grantRole(tickets.MINTER_ROLE(), address(bountyFi));     // BountyFi mints reward tickets
        tickets.grantRole(tickets.BURNER_ROLE(), address(trustNetwork)); // TrustNetwork burns penalty tickets

        // TrustNetwork Roles
        trustNetwork.grantRole(trustNetwork.RESOLVER_ROLE(), address(bountyFi)); // BountyFi calls handleResolution

        // BountyFi Roles
        bountyFi.grantRole(bountyFi.ORACLE_ROLE(), oracle);
        bountyFi.grantRole(bountyFi.CAMPAIGN_MANAGER_ROLE(), owner);

        // Token Roles
        token.grantRole(token.MINTER_ROLE(), address(bountyFi));

        vm.stopPrank();
        
        // Advance time to avoid day 0 collision
        vm.warp(100 days);
    }

    function testTrustPath() public {
        // 1. Create Campaign
        vm.prank(owner);
        bountyFi.createCampaign(BountyFi.CampaignType.SINGLE_PHOTO, 100 ether, 0, 100, 80);
        uint256 campaignId = 0;

        // 2. Setup Relationships
        vm.startPrank(userA);
        trustNetwork.addTrustee(userB); // A trusts B
        vm.stopPrank();

        vm.startPrank(userB);
        trustNetwork.setReferrer(userC); // B referred by C
        bountyFi.submit(campaignId, bytes32(0));
        vm.stopPrank();
        
        uint256 submissionId = 0;

        // 4. Oracle Approves
        vm.prank(oracle);
        bountyFi.submitAIScore(submissionId, 90); // Score 90 > Threshold 80

        // Check Results
        
        // B should have Ticket (from BountyFi)
        // B should have Ticket (from BountyFi)
        // Reward is 100 ether, so 100 ether tickets
        assertEq(tickets.balanceOf(userB, campaignId), 100 ether, "User B should get 100 ether Tickets");
        
        // A should have 1 Diamond (from TrustNetwork)
        assertEq(trustNetwork.diamonds(userA), 1, "User A should get 1 Diamond");

        // C should have 1 Diamond (from Referral)
        assertEq(trustNetwork.diamonds(userC), 1, "User C should get 1 Diamond");
    }

    function testTicketRewardFromDiamonds() public {
        // give A 9 diamonds manually? No, internal implementation detail.
        // Let's loop 10 submissions.
        
        vm.prank(owner);
        bountyFi.createCampaign(BountyFi.CampaignType.SINGLE_PHOTO, 100 ether, 0, 100, 80);
        uint256 campaignId = 0;

        vm.prank(userA);
        trustNetwork.addTrustee(userB);

        for(uint i=0; i<10; i++) {
             vm.warp(block.timestamp + 1 days); // Advance day for daily limits if any (Tickets has limit)
             
             vm.prank(userB);
             bountyFi.submit(campaignId, bytes32(uint256(i)));
             
             vm.prank(oracle);
             bountyFi.submitAIScore(i, 90);
        }

        assertEq(trustNetwork.diamonds(userA), 10, "User A should have 10 Diamonds");
        // Check Ticket Balance for A (Campaign 0 is used for generic rewards in current implementation)
        assertEq(tickets.balanceOf(userA, 0), 1, "User A should have 1 Ticket (Reward)");
    }

    function testPenalty() public {
        // Setup: A trusts B. A has a ticket.
        
        // Give A a ticket first (via trust reward or manually minting setup)
        // Let's just create a scenario where A has tickets.
        vm.startPrank(owner);
        tickets.grantRole(tickets.MINTER_ROLE(), owner);
        tickets.mintReward(userA, 0, 5, bytes32(0)); // A has 5 tickets in campaign 0
        bountyFi.createCampaign(BountyFi.CampaignType.SINGLE_PHOTO, 100 ether, 0, 100, 80);
        vm.stopPrank();
        
        assertEq(tickets.balanceOf(userA, 0), 5);
        
        vm.prank(userA);
        trustNetwork.addTrustee(userB);

        // B Submits and Fails
        vm.prank(userB);
        bountyFi.submit(0, bytes32(0));

        vm.prank(oracle);
        bountyFi.submitAIScore(0, 10); // Score 10 < Threshold 40 (half of 80) -> REJECT

        // Check Penalty
        // A should lose 1 ticket
        assertEq(tickets.balanceOf(userA, 0), 4, "User A should lose 1 Ticket");
    }
    function testValidationQueue() public {
        vm.prank(owner);
        bountyFi.createCampaign(BountyFi.CampaignType.SINGLE_PHOTO, 100 ether, 0, 100, 80);
        uint256 campaignId = 0;

        // Setup: A trusts B. C is neutral.
        vm.prank(userA);
        trustNetwork.addTrustee(userB);

        // User B submits
        vm.prank(userB);
        bountyFi.submit(campaignId, bytes32(uint256(2)));
        uint256 subId = 0; // First submission

        // Move to Jury Phase (Confidence 50 < 80)
        vm.prank(oracle);
        bountyFi.submitAIScore(subId, 50); 

        // 1. User A checks queue -> Should get MAX (no task) because A trusts B
        uint256 taskA = bountyFi.getValidationTask(userA);
        assertEq(taskA, type(uint256).max, "User A should not validate User B (Trust)");

        // 2. User C checks queue -> Should get subId 0
        uint256 taskC = bountyFi.getValidationTask(userC);
        assertEq(taskC, subId, "User C should validate User B");
    }
}
