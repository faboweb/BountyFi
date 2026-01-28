// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/vrf/VRFConsumerBaseV2.sol";
import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";

contract Lottery is VRFConsumerBaseV2 {
    VRFCoordinatorV2Interface COORDINATOR;
    uint64 s_subscriptionId;
    bytes32 keyHash;
    uint32 callbackGasLimit = 200_000;
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

    constructor(uint64 subscriptionId, address vrfCoordinator, bytes32 _keyHash) 
        VRFConsumerBaseV2(vrfCoordinator) 
    {
        COORDINATOR = VRFCoordinatorV2Interface(vrfCoordinator);
        s_subscriptionId = subscriptionId;
        keyHash = _keyHash;
    }

    function requestDraw(uint256 campaignId, address[] memory participants, uint256[] memory ticketCounts) external {
        uint256 requestId = COORDINATOR.requestRandomWords(
            keyHash,
            s_subscriptionId,
            requestConfirmations,
            callbackGasLimit,
            3 // number of random words (for 3 prize tiers)
        );

        Draw storage draw = draws[requestId];
        draw.campaignId = campaignId;
        draw.participants = participants;
        for (uint i = 0; i < participants.length; i++) {
            draw.ticketCounts[participants[i]] = ticketCounts[i];
        }

        campaignDraws[campaignId] = requestId;
        emit DrawRequested(requestId, campaignId);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
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
