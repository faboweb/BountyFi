// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

contract Lottery is VRFConsumerBaseV2Plus {
    uint256 s_subscriptionId;
    bytes32 keyHash;
    uint32 callbackGasLimit = 2500000;
    uint16 requestConfirmations = 3;

    struct Draw {
        uint256 campaignId;
        address[] participants;
        mapping(address => uint256) ticketCounts;
        address[] winners;
        bool fulfilled;
    }

    mapping(uint256 => Draw) public draws; // requestId => Draw
    mapping(uint256 => uint256) public campaignDraws; // campaignId => requestId

    event DrawRequested(uint256 indexed requestId, uint256 campaignId);
    event WinnersSelected(uint256 indexed requestId, address[] winners);

    constructor(uint256 subscriptionId, address vrfCoordinator, bytes32 _keyHash) 
        VRFConsumerBaseV2Plus(vrfCoordinator) 
    {
        s_subscriptionId = subscriptionId;
        keyHash = _keyHash;
    }

    function setSubscriptionId(uint256 subscriptionId) external onlyOwner {
        s_subscriptionId = subscriptionId;
    }

    function setKeyHash(bytes32 _keyHash) external onlyOwner {
        keyHash = _keyHash;
    }

    function requestDraw(uint256 campaignId, address[] memory participants, uint256[] memory ticketCounts) external {
        VRFV2PlusClient.RandomWordsRequest memory request = VRFV2PlusClient.RandomWordsRequest({
            keyHash: keyHash,
            subId: s_subscriptionId,
            requestConfirmations: requestConfirmations,
            callbackGasLimit: callbackGasLimit,
            numWords: 3,
            extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: false}))
        });

        uint256 requestId = s_vrfCoordinator.requestRandomWords(request);

        Draw storage draw = draws[requestId];
        draw.campaignId = campaignId;
        draw.participants = participants;
        for (uint i = 0; i < participants.length; i++) {
            draw.ticketCounts[participants[i]] = ticketCounts[i];
        }

        campaignDraws[campaignId] = requestId;
        emit DrawRequested(requestId, campaignId);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        Draw storage draw = draws[requestId];
        require(!draw.fulfilled, "Already fulfilled");

        // Select 3 winners (grand, major, minor) weighted by tickets
        for (uint i = 0; i < 3 && i < randomWords.length; i++) {
            address winner = selectWeightedWinner(draw, randomWords[i]);
            draw.winners.push(winner);
        }

        draw.fulfilled = true;
        emit WinnersSelected(requestId, draw.winners);
    }

    function selectWeightedWinner(Draw storage draw, uint256 randomness) internal view returns (address) {
        uint256 totalTickets = 0;
        for (uint i = 0; i < draw.participants.length; i++) {
            totalTickets += draw.ticketCounts[draw.participants[i]];
        }

        uint256 winningTicket = randomness % totalTickets;
        uint256 cumulative = 0;

        for (uint i = 0; i < draw.participants.length; i++) {
            cumulative += draw.ticketCounts[draw.participants[i]];
            if (winningTicket < cumulative) {
                return draw.participants[i];
            }
        }
        revert("Winner selection failed");
    }

    function getWinners(uint256 requestId) external view returns (address[] memory) {
        return draws[requestId].winners;
    }
}
