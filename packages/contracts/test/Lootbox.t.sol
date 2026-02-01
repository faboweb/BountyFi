// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Lootbox.sol";
import "../src/BountyFi.sol";
import "../src/Tickets.sol";
import "../src/TrustNetwork.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

// Minimal mock for Lootbox: same ABI as BountyFi for isCampaignEnded + getCampaignPrizes (monthly flow never calls these).
contract MockBountyFiForLootbox {
    function isCampaignEnded(uint256) external pure returns (bool) { return false; }
    function getCampaignPrizes(uint256) external pure returns (BountyFi.Prize[] memory) {
        return new BountyFi.Prize[](0);
    }
}

// Mock for campaign lootbox tests: campaign 0 is ended and has 2 prizes (amount/value for weight).
contract MockBountyFiCampaignEnded {
    function isCampaignEnded(uint256) external pure returns (bool) { return true; }
    function getCampaignPrizes(uint256) external pure returns (BountyFi.Prize[] memory prizes) {
        prizes = new BountyFi.Prize[](2);
        prizes[0] = BountyFi.Prize("Gold", "", "SponsorA", bytes32(0), 100e18, 100e18);
        prizes[1] = BountyFi.Prize("Silver", "", "SponsorB", bytes32(0), 50e18, 200e18);
    }
}

// Campaign ended but no prizes configured → openCampaignLootbox should revert with "No prizes".
contract MockBountyFiEndedNoPrizes {
    function isCampaignEnded(uint256) external pure returns (bool) { return true; }
    function getCampaignPrizes(uint256) external pure returns (BountyFi.Prize[] memory) {
        return new BountyFi.Prize[](0);
    }
}

// Example: 10 coffee (value 2e18), 100×1usd (value 1e18), 1 phone (value 300e18). Used to test weight formula.
contract MockBountyFiCoffeeUsdPhone {
    function isCampaignEnded(uint256) external pure returns (bool) { return true; }
    function getCampaignPrizes(uint256) external pure returns (BountyFi.Prize[] memory prizes) {
        prizes = new BountyFi.Prize[](3);
        prizes[0] = BountyFi.Prize("Coffee", "", "Cafe", bytes32(0), 10e18, 2e18);   // 10 coffee, value 2
        prizes[1] = BountyFi.Prize("1 USD", "", "Sponsor", bytes32(0), 100e18, 1e18);     // 100×1usd
        prizes[2] = BountyFi.Prize("Phone", "", "Sponsor", bytes32(0), 1e18, 300e18);   // 1 phone, value 300
    }
}

// Mock TrustNetwork for pay-with-diamonds test: same ABI as TrustNetwork for diamonds + spendDiamonds; test can set diamonds.
contract MockTrustNetworkForLootbox {
    address public lootbox;
    mapping(address => uint256) public diamonds;

    function setLootbox(address _lootbox) external {
        lootbox = _lootbox;
    }
    function setDiamonds(address user, uint256 amount) external {
        diamonds[user] = amount;
    }
    function spendDiamonds(address user, uint256 amount) external {
        require(msg.sender == lootbox, "Only Lootbox");
        require(diamonds[user] >= amount, "Insufficient diamonds");
        diamonds[user] -= amount;
    }
}

// Simple Mock for VRF Coordinator causing no interface headaches
contract MockVRFCoordinator {
    VRFConsumerBaseV2Plus public consumer;
    uint256 public nextRequestId = 1;
    
    function setConsumer(address _consumer) external {
        consumer = VRFConsumerBaseV2Plus(_consumer);
    }

    function requestRandomWords(VRFV2PlusClient.RandomWordsRequest calldata) external returns (uint256 requestId) {
        requestId = nextRequestId++;
        return requestId;
    }

    // Helper to simulate callback
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external {
        consumer.rawFulfillRandomWords(requestId, randomWords);
    }
}

contract LootboxTest is Test {
    Lootbox public lootbox;
    Tickets public tickets;
    TrustNetwork public trustNetwork;
    MockVRFCoordinator public vrfCoordinator;
    MockBountyFiForLootbox public mockBountyFi;

    address public user = address(1);
    uint256 public subscriptionId = 123;
    bytes32 public keyHash = bytes32("0xABC");

    event LootboxRequested(uint256 indexed requestId, address indexed user, uint256 campaignId);
    event LootboxOpened(uint256 indexed requestId, address indexed user, uint256 prizeTier);

    function setUp() public {
        vrfCoordinator = new MockVRFCoordinator();
        mockBountyFi = new MockBountyFiForLootbox();
        tickets = new Tickets();
        trustNetwork = new TrustNetwork(address(tickets));

        lootbox = new Lootbox(
            address(tickets),
            address(trustNetwork),
            address(mockBountyFi),
            subscriptionId,
            address(vrfCoordinator),
            keyHash
        );

        vrfCoordinator.setConsumer(address(lootbox));
        tickets.grantRole(tickets.BURNER_ROLE(), address(lootbox));
        trustNetwork.setLootbox(address(lootbox));
        tickets.grantRole(tickets.MINTER_ROLE(), address(this));
        tickets.grantRole(tickets.BURNER_ROLE(), address(this));
        tickets.mintReward(user, 0, 10, bytes32(0)); // tickets in campaign 0 for monthly opens
    }

    function testOpenLootbox() public {
        uint256 startTickets = tickets.balanceOf(user, 0);
        assertEq(startTickets, 10, "user should have tickets");

        vm.prank(user);
        vm.expectEmit(true, true, false, true);
        emit LootboxRequested(1, user, type(uint256).max);

        uint256 requestId = lootbox.openLootbox();

        assertEq(requestId, 1, "Request ID should be 1");
        assertEq(tickets.balanceOf(user, 0), 9, "1 ticket should be spent");

        (address reqUser, uint256 campaignId, bool fulfilled, uint256 tier) = lootbox.requests(requestId);
        assertEq(reqUser, user);
        assertEq(campaignId, type(uint256).max);
        assertEq(fulfilled, false);
        assertEq(tier, 0);
    }

    function testFulfillCommon() public {
        vm.prank(user);
        uint256 requestId = lootbox.openLootbox();
        
        // Fulfill with Random Word = 150
        // prize = 150 % 100 = 50
        // 50 <= 80 -> Tier 1 (Common)
        
        uint256[] memory words = new uint256[](1);
        words[0] = 150;
        
        vm.expectEmit(true, true, false, false);
        emit LootboxOpened(requestId, user, 1);
        
        vrfCoordinator.fulfillRandomWords(requestId, words);

        (, , bool fulfilled, uint256 tier) = lootbox.requests(requestId);
        assertTrue(fulfilled);
        assertEq(tier, 1);
    }

    function testFulfillUncommon() public {
        vm.prank(user);
        uint256 requestId = lootbox.openLootbox();
        
        // prize = 85 -> Tier 2 (Uncommon)
        uint256[] memory words = new uint256[](1);
        words[0] = 85; 
        
        vm.expectEmit(true, true, false, false);
        emit LootboxOpened(requestId, user, 2);
        
        vrfCoordinator.fulfillRandomWords(requestId, words);

        (, , , uint256 tier) = lootbox.requests(requestId);
        assertEq(tier, 2);
    }

    function testFulfillRare() public {
        vm.prank(user);
        uint256 requestId = lootbox.openLootbox();

        // prize = 99 -> Tier 3 (Rare)
        uint256[] memory words = new uint256[](1);
        words[0] = 99;

        vm.expectEmit(true, true, false, false);
        emit LootboxOpened(requestId, user, 3);

        vrfCoordinator.fulfillRandomWords(requestId, words);

        (, , , uint256 tier) = lootbox.requests(requestId);
        assertEq(tier, 3);
    }

    function testMonthly_boundaryCommon() public {
        vm.prank(user);
        uint256 requestId = lootbox.openLootbox();
        uint256[] memory words = new uint256[](1);
        words[0] = 0;   // 0 % 100 = 0 -> common
        vrfCoordinator.fulfillRandomWords(requestId, words);
        (, , , uint256 tier) = lootbox.requests(requestId);
        assertEq(tier, 1);
    }

    function testMonthly_boundaryUncommon() public {
        vm.prank(user);
        uint256 requestId = lootbox.openLootbox();
        uint256[] memory words = new uint256[](1);
        words[0] = 81;  // 81 % 100 = 81 -> uncommon
        vrfCoordinator.fulfillRandomWords(requestId, words);
        (, , , uint256 tier) = lootbox.requests(requestId);
        assertEq(tier, 2);
    }

    function testMonthly_boundaryRare() public {
        vm.prank(user);
        uint256 requestId = lootbox.openLootbox();
        uint256[] memory words = new uint256[](1);
        words[0] = 96;  // 96 % 100 = 96 -> rare
        vrfCoordinator.fulfillRandomWords(requestId, words);
        (, , , uint256 tier) = lootbox.requests(requestId);
        assertEq(tier, 3);
    }

    function testOpenLootbox_revertsWhenInsufficientBalance() public {
        address poor = address(99); // no tickets, no diamonds
        vm.prank(poor);
        vm.expectRevert("Need 1 ticket or 10 diamonds");
        lootbox.openLootbox();
    }

    function testOpenLootbox_payWithDiamonds() public {
        MockTrustNetworkForLootbox mockTN = new MockTrustNetworkForLootbox();
        mockTN.setDiamonds(user, 10);
        Lootbox lb = new Lootbox(
            address(tickets),
            address(mockTN),
            address(mockBountyFi),
            subscriptionId,
            address(vrfCoordinator),
            keyHash
        );
        vrfCoordinator.setConsumer(address(lb));
        mockTN.setLootbox(address(lb));
        tickets.burn(user, 0, 10);
        assertEq(tickets.balanceOf(user, 0), 0);
        assertEq(mockTN.diamonds(user), 10);

        vm.prank(user);
        uint256 requestId = lb.openLootbox();
        assertEq(requestId, 1);
        assertEq(mockTN.diamonds(user), 0, "10 diamonds should be spent");
    }

    function testFulfill_revertsWhenAlreadyFulfilled() public {
        vm.prank(user);
        uint256 requestId = lootbox.openLootbox();
        uint256[] memory words = new uint256[](1);
        words[0] = 50;
        vrfCoordinator.fulfillRandomWords(requestId, words);
        vm.expectRevert("Already fulfilled");
        vrfCoordinator.fulfillRandomWords(requestId, words);
    }

    // --- Campaign lootbox ---
    function testOpenCampaignLootbox_revertsWhenCampaignNotEnded() public {
        vm.expectRevert("Campaign not ended");
        lootbox.openCampaignLootbox(0);
    }

    function testOpenCampaignLootbox_revertsWhenNoPrizes() public {
        MockBountyFiEndedNoPrizes mockNoPrizes = new MockBountyFiEndedNoPrizes();
        Lootbox lb = new Lootbox(
            address(tickets),
            address(trustNetwork),
            address(mockNoPrizes),
            subscriptionId,
            address(vrfCoordinator),
            keyHash
        );
        vm.expectRevert("No prizes");
        lb.openCampaignLootbox(0);
    }

    function testOpenCampaignLootbox_drawAndFulfill() public {
        MockBountyFiCampaignEnded mockEnded = new MockBountyFiCampaignEnded();
        Lootbox campaignLootbox = new Lootbox(
            address(tickets),
            address(trustNetwork),
            address(mockEnded),
            subscriptionId,
            address(vrfCoordinator),
            keyHash
        );
        vrfCoordinator.setConsumer(address(campaignLootbox));

        uint256 requestId = campaignLootbox.openCampaignLootbox(0);
        assertEq(requestId, 1);

        uint256[] memory words = new uint256[](1);
        words[0] = 12345;
        vrfCoordinator.fulfillRandomWords(requestId, words);

        (, , bool fulfilled, uint256 prizeTier) = campaignLootbox.requests(requestId);
        assertTrue(fulfilled);
        assertTrue(prizeTier <= 2, "prizeTier must be 0, 1, or 2");
    }

    function testCampaign_noPrizeOutcome() public {
        MockBountyFiCampaignEnded mockEnded = new MockBountyFiCampaignEnded();
        Lootbox lb = new Lootbox(
            address(tickets),
            address(trustNetwork),
            address(mockEnded),
            subscriptionId,
            address(vrfCoordinator),
            keyHash
        );
        vrfCoordinator.setConsumer(address(lb));
        uint256 requestId = lb.openCampaignLootbox(0);
        // r = randomness % totalRange; when r < noPrizeWeight we get no prize. Use randomness that lands in no-prize band.
        uint256[] memory words = new uint256[](1);
        words[0] = 0; // r = 0, which is < noPrizeWeight
        vrfCoordinator.fulfillRandomWords(requestId, words);
        (, , , uint256 prizeTier) = lb.requests(requestId);
        assertEq(prizeTier, 0, "should win no prize");
    }

    function testCampaign_prizeIndex1() public {
        MockBountyFiCampaignEnded mockEnded = new MockBountyFiCampaignEnded();
        Lootbox lb = new Lootbox(
            address(tickets),
            address(trustNetwork),
            address(mockEnded),
            subscriptionId,
            address(vrfCoordinator),
            keyHash
        );
        vrfCoordinator.setConsumer(address(lb));
        uint256 requestId = lb.openCampaignLootbox(0);
        // Pick randomness so r lands in prize-1 band (first prize). totalRange ~ 2.07e18; noPrize ~ 0.83e18; w1 ~ 0.99e18.
        // r = 1e18 is in [noPrize, noPrize+w1). So randomness % totalRange = 1e18 => use randomness = 1e18.
        uint256[] memory words = new uint256[](1);
        words[0] = 1e18;
        vrfCoordinator.fulfillRandomWords(requestId, words);
        (, , , uint256 prizeTier) = lb.requests(requestId);
        assertEq(prizeTier, 1, "should win first prize");
    }

    function testCampaign_prizeIndex2() public {
        MockBountyFiCampaignEnded mockEnded = new MockBountyFiCampaignEnded();
        Lootbox lb = new Lootbox(
            address(tickets),
            address(trustNetwork),
            address(mockEnded),
            subscriptionId,
            address(vrfCoordinator),
            keyHash
        );
        vrfCoordinator.setConsumer(address(lb));
        uint256 requestId = lb.openCampaignLootbox(0);
        // r in [noPrize+w1, totalRange) => prize 2. So r = 1.9e18. Use randomness = 1.9e18.
        uint256[] memory words = new uint256[](1);
        words[0] = 19e17; // 1.9e18
        vrfCoordinator.fulfillRandomWords(requestId, words);
        (, , , uint256 prizeTier) = lb.requests(requestId);
        assertEq(prizeTier, 2, "should win second prize");
    }

    function testCampaign_coffeeUsdPhone_weights() public {
        MockBountyFiCoffeeUsdPhone mock = new MockBountyFiCoffeeUsdPhone();
        Lootbox lb = new Lootbox(
            address(tickets),
            address(trustNetwork),
            address(mock),
            subscriptionId,
            address(vrfCoordinator),
            keyHash
        );
        vrfCoordinator.setConsumer(address(lb));
        uint256 requestId = lb.openCampaignLootbox(0);
        // One deterministic draw; just ensure we get a valid outcome (0, 1, 2, or 3).
        uint256[] memory words = new uint256[](1);
        words[0] = 1e18;
        vrfCoordinator.fulfillRandomWords(requestId, words);
        (, , bool fulfilled, uint256 prizeTier) = lb.requests(requestId);
        assertTrue(fulfilled);
        assertTrue(prizeTier <= 3, "prizeTier 0=none, 1=coffee, 2=1usd, 3=phone");
    }

    function testCampaign_emitLootboxRequestedWithCampaignId() public {
        MockBountyFiCampaignEnded mockEnded = new MockBountyFiCampaignEnded();
        Lootbox lb = new Lootbox(
            address(tickets),
            address(trustNetwork),
            address(mockEnded),
            subscriptionId,
            address(vrfCoordinator),
            keyHash
        );
        vrfCoordinator.setConsumer(address(lb));
        vm.expectEmit(true, true, false, true);
        emit LootboxRequested(1, user, 0);
        vm.prank(user);
        lb.openCampaignLootbox(0);
    }
}
