// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/BountyToken.sol";
import "../src/Tickets.sol";
import "../src/TrustNetwork.sol";
import "../src/BountyFi.sol";

contract RelayedSubmissionTest is Test {
    BountyToken public token;
    Tickets public tickets;
    TrustNetwork public trustNetwork;
    BountyFi public bountyFi;

    address public owner = address(1);
    address public oracle = address(2);
    address public relayer = address(3); // The Agent/Back-end
    address public beneficiary = address(4); // Real User
    address public validator = address(5);

    function setUp() public {
        vm.startPrank(owner);

        token = new BountyToken();
        tickets = new Tickets();
        trustNetwork = new TrustNetwork(address(tickets));
        bountyFi = new BountyFi(address(token), address(trustNetwork), address(tickets));

        // Setup Roles
        tickets.grantRole(tickets.MINTER_ROLE(), address(trustNetwork));
        tickets.grantRole(tickets.MINTER_ROLE(), address(bountyFi));
        tickets.grantRole(tickets.BURNER_ROLE(), address(trustNetwork));

        trustNetwork.grantRole(trustNetwork.RESOLVER_ROLE(), address(bountyFi));

        bountyFi.grantRole(bountyFi.ORACLE_ROLE(), oracle);
        bountyFi.grantRole(bountyFi.CAMPAIGN_MANAGER_ROLE(), owner);
        token.grantRole(token.MINTER_ROLE(), address(bountyFi));

        vm.stopPrank();
        
        // Fund Validator (Mock setup if needed)
        vm.warp(100 days);
    }

    function testRelayedSubmissionFlow() public {
        // 1. Create Campaign
        vm.prank(owner);
        bountyFi.createCampaign(BountyFi.CampaignType.SINGLE_PHOTO, 100 ether, 0, 100, 80);
        uint256 campaignId = 0;

        // 2. Relayer Submits Hash (User Identity Hidden)
        bytes32 submissionHash = keccak256(abi.encodePacked("User's Real Data"));
        
        vm.prank(relayer);
        bountyFi.submit(campaignId, submissionHash);
        
        uint256 subId = 0;
        (, address _submitter, , , , , , ) = bountyFi.submissions(subId);
        assertEq(_submitter, relayer, "Submitter should be Relayer");

        // 3. Oracle Scores (High Confidence)
        vm.prank(oracle);
        bountyFi.submitAIScore(subId, 95); // > 80 Threshold

        (, , , BountyFi.SubmissionStatus status, , , , ) = bountyFi.submissions(subId);
        assertEq(uint(status), uint(BountyFi.SubmissionStatus.APPROVED), "Status should be APPROVED");

        // 4. Oracle Finalizes (Mints to Beneficiary)
        uint256 initialBalance = token.balanceOf(beneficiary);
        
        vm.prank(oracle);
        bountyFi.finalizeSubmission(subId, beneficiary);

        // Check Rewards
        assertEq(token.balanceOf(beneficiary), initialBalance + 100 ether, "Beneficiary should receive tokens");
        assertEq(tickets.balanceOf(beneficiary, campaignId), 100 ether, "Beneficiary should receive tickets");
        // Beneficiary does not get Diamonds directly; their Trusters do.
    }

    function testGoldenTaskFlow() public {
        // 1. Create Campaign
        vm.prank(owner);
        bountyFi.createCampaign(BountyFi.CampaignType.SINGLE_PHOTO, 100 ether, 0, 100, 80);
        uint256 campaignId = 0;

        // 2. Relayer Submits Golden Task
        // It looks exactly like a normal submission on-chain
        bytes32 goldenHash = keccak256(abi.encodePacked("Golden Data"));
        vm.prank(relayer);
        bountyFi.submit(campaignId, goldenHash);
        uint256 subId = 0;

        // 3. Oracle Simulates Ambiguity (Forces Jury)
        // Even if the Agent knows the answer, setting confidence to 50 puts it in the Jury queue
        vm.prank(oracle);
        bountyFi.submitAIScore(subId, 50); 
        
        (,,,BountyFi.SubmissionStatus status,,,,) = bountyFi.submissions(subId);
        assertEq(uint(status), uint(BountyFi.SubmissionStatus.JURY_VOTING), "Status should be JURY_VOTING");

        // 4. Validator Votes
        // Validator checks task. It matches the "Expected Outcome" (e.g., it's a valid photo)
        vm.prank(validator);
        bountyFi.vote(subId, true); // Approve

        // Need 2nd vote for consensus (default logic in contract is >= 2 votes)
        address validator2 = address(6);
        vm.prank(validator2);
        bountyFi.vote(subId, true); // Approve

        // 5. Finalize Logic
        (, , , BountyFi.SubmissionStatus finalStatus, , , , ) = bountyFi.submissions(subId);
        assertEq(uint(finalStatus), uint(BountyFi.SubmissionStatus.APPROVED), "Status should be APPROVED after votes");

        // 6. Oracle Handling
        // Oracle sees it's approved. Checks DB. Finds it's a Golden Task.
        // DOES NOT broadcast `finalizeSubmission` for a user.
        // OR calls it with a burner address if contract state clearing is needed (not strictly required here as minted is only flag)
        
        // Assert Beneficiary (whoever that would be) got nothing because finalizeSubmission wasn't called
        assertEq(token.balanceOf(beneficiary), 0, "No tokens minted without finalizeSubmission");
    }
}
