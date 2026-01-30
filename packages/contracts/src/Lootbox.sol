// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "./BountyToken.sol";

contract Lootbox is VRFConsumerBaseV2Plus {
    BountyToken public immutable token;
    uint256 public constant LOOTBOX_COST = 10 * 10**18; // 10 BOUNTY

    uint256 s_subscriptionId;
    bytes32 keyHash;
    uint32 callbackGasLimit = 500000;
    uint16 requestConfirmations = 3;

    struct OpenRequest {
        address user;
        bool fulfilled;
        uint256 prizeTier;
    }

    mapping(uint256 => OpenRequest) public requests;

    event LootboxRequested(uint256 indexed requestId, address indexed user);
    event LootboxOpened(uint256 indexed requestId, address indexed user, uint256 prizeTier);

    constructor(address _token, uint256 subscriptionId, address vrfCoordinator, bytes32 _keyHash) 
        VRFConsumerBaseV2Plus(vrfCoordinator) 
    {
        token = BountyToken(_token);
        s_subscriptionId = subscriptionId;
        keyHash = _keyHash;
    }

    function openLootbox() external returns (uint256 requestId) {
        token.burn(msg.sender, LOOTBOX_COST);

        VRFV2PlusClient.RandomWordsRequest memory request = VRFV2PlusClient.RandomWordsRequest({
            keyHash: keyHash,
            subId: s_subscriptionId,
            requestConfirmations: requestConfirmations,
            callbackGasLimit: callbackGasLimit,
            numWords: 1,
            extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: false}))
        });

        requestId = s_vrfCoordinator.requestRandomWords(request);
        requests[requestId] = OpenRequest(msg.sender, false, 0);

        emit LootboxRequested(requestId, msg.sender);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        OpenRequest storage req = requests[requestId];
        require(!req.fulfilled, "Already fulfilled");

        uint256 randomness = randomWords[0];
        uint256 prize = (randomness % 100); // 0-99

        // Tier logic
        if (prize > 95) req.prizeTier = 3; // Rare
        else if (prize > 80) req.prizeTier = 2; // Uncommon
        else req.prizeTier = 1; // Common

        req.fulfilled = true;

        // In a real app, we'd mint an NFT or reward tokens here
        // For simplicity, we just emit.
        emit LootboxOpened(requestId, req.user, req.prizeTier);
    }
}
