// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Lootbox.sol";
import "../src/BountyToken.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

// Simple Mock for VRF Coordinator causing no interface headaches
contract MockVRFCoordinator {
    VRFConsumerBaseV2Plus public consumer;
    uint256 public nextRequestId = 1;
    
    function setConsumer(address _consumer) external {
        consumer = VRFConsumerBaseV2Plus(_consumer);
    }

    function requestRandomWords(VRFV2PlusClient.RandomWordsRequest calldata req) external returns (uint256 requestId) {
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
    BountyToken public token;
    MockVRFCoordinator public vrfCoordinator;
    
    address public user = address(1);
    uint256 public subscriptionId = 123;
    bytes32 public keyHash = bytes32("0xABC");

    event LootboxRequested(uint256 indexed requestId, address indexed user);
    event LootboxOpened(uint256 indexed requestId, address indexed user, uint256 prizeTier);

    function setUp() public {
        vrfCoordinator = new MockVRFCoordinator();
        
        // Deploy Token
        token = new BountyToken();
        
        // Deploy Lootbox
        lootbox = new Lootbox(address(token), subscriptionId, address(vrfCoordinator), keyHash);
        
        // Setup VRF Mock
        vrfCoordinator.setConsumer(address(lootbox));
        
        // Setup Token
        token.grantRole(token.MINTER_ROLE(), address(this));
        token.mint(user, 1000 * 10**18);
        
        vm.prank(user);
        token.approve(address(lootbox), 1000 * 10**18); 
        
        // Grant DEFAULT_ADMIN_ROLE to Lootbox because BountyToken.burn requires it for delegated burning
        // (It does not use standard ERC20 allowance-based burnFrom)
        token.grantRole(token.DEFAULT_ADMIN_ROLE(), address(lootbox));
    }

    function testOpenLootbox() public {
        uint256 cost = lootbox.LOOTBOX_COST();
        uint256 startBal = token.balanceOf(user);
        
        vm.prank(user);
        
        // Expect Event
        vm.expectEmit(true, true, false, false);
        emit LootboxRequested(1, user); // First ID is 1
        
        uint256 requestId = lootbox.openLootbox();
        
        assertEq(requestId, 1, "Request ID should be 1");
        assertEq(token.balanceOf(user), startBal - cost, "Tokens should be burned");
        
        // Check Request State
        (address reqUser, bool fulfilled, uint256 tier) = lootbox.requests(requestId);
        assertEq(reqUser, user);
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
        
        (, bool fulfilled, uint256 tier) = lootbox.requests(requestId);
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
        
        (, , uint256 tier) = lootbox.requests(requestId);
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
        
        (, , uint256 tier) = lootbox.requests(requestId);
        assertEq(tier, 3);
    }
}
