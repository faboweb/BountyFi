// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";
import "./BountyFi.sol";
import "./Tickets.sol";
import "./TrustNetwork.sol";

contract Lootbox is VRFConsumerBaseV2Plus {
    Tickets public immutable tickets;
    TrustNetwork public immutable trustNetwork;
    BountyFi public immutable bountyFi;
    uint256 public constant LOOTBOX_TICKET_COST = 1;
    uint256 public constant LOOTBOX_DIAMOND_COST = 10;
    /// @dev campaignId 0 = generic tickets (same as TrustNetwork reward tickets)
    uint256 public constant LOOTBOX_TICKET_CAMPAIGN_ID = 0;
    /// @dev campaignId for "monthly" (non-campaign) lootbox
    uint256 internal constant MONTHLY_CAMPAIGN_ID = type(uint256).max;

    uint256 s_subscriptionId;
    bytes32 keyHash;
    uint32 callbackGasLimit = 500000;
    uint16 requestConfirmations = 3;

    struct OpenRequest {
        address user;
        uint256 campaignId; // MONTHLY_CAMPAIGN_ID = monthly lootbox; else campaign-specific
        bool fulfilled;
        uint256 prizeTier; // monthly: 1=common,2=uncommon,3=rare; campaign: 0=none, 1..n=prize index
    }

    mapping(uint256 => OpenRequest) public requests;

    event LootboxRequested(uint256 indexed requestId, address indexed user, uint256 campaignId);
    event LootboxOpened(uint256 indexed requestId, address indexed user, uint256 prizeTier);

    constructor(
        address _tickets,
        address _trustNetwork,
        address _bountyFi,
        uint256 subscriptionId,
        address vrfCoordinator,
        bytes32 _keyHash
    ) VRFConsumerBaseV2Plus(vrfCoordinator) {
        tickets = Tickets(_tickets);
        trustNetwork = TrustNetwork(_trustNetwork);
        bountyFi = BountyFi(_bountyFi);
        s_subscriptionId = subscriptionId;
        keyHash = _keyHash;
    }

    /// @notice Monthly lootbox: pay 1 ticket (campaign 0) or 10 diamonds; get one of 3 fixed tiers (common/uncommon/rare).
    function openLootbox() external returns (uint256 requestId) {
        uint256 ticketBalance = tickets.balanceOf(msg.sender, LOOTBOX_TICKET_CAMPAIGN_ID);
        if (ticketBalance >= LOOTBOX_TICKET_COST) {
            tickets.spend(msg.sender, LOOTBOX_TICKET_CAMPAIGN_ID, LOOTBOX_TICKET_COST);
        } else if (trustNetwork.diamonds(msg.sender) >= LOOTBOX_DIAMOND_COST) {
            trustNetwork.spendDiamonds(msg.sender, LOOTBOX_DIAMOND_COST);
        } else {
            revert("Need 1 ticket or 10 diamonds");
        }

        VRFV2PlusClient.RandomWordsRequest memory req = VRFV2PlusClient.RandomWordsRequest({
            keyHash: keyHash,
            subId: s_subscriptionId,
            requestConfirmations: requestConfirmations,
            callbackGasLimit: callbackGasLimit,
            numWords: 1,
            extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: false}))
        });

        requestId = s_vrfCoordinator.requestRandomWords(req);
        requests[requestId] = OpenRequest(msg.sender, MONTHLY_CAMPAIGN_ID, false, 0);

        emit LootboxRequested(requestId, msg.sender, MONTHLY_CAMPAIGN_ID);
    }

    /// @notice Campaign lootbox: open when campaign is over. One pull; higher-value prizes have lower probability; may win nothing (prizeTier 0).
    function openCampaignLootbox(uint256 campaignId) external returns (uint256 requestId) {
        require(bountyFi.isCampaignEnded(campaignId), "Campaign not ended");
        BountyFi.Prize[] memory prizes = bountyFi.getCampaignPrizes(campaignId);
        require(prizes.length > 0, "No prizes");

        VRFV2PlusClient.RandomWordsRequest memory req = VRFV2PlusClient.RandomWordsRequest({
            keyHash: keyHash,
            subId: s_subscriptionId,
            requestConfirmations: requestConfirmations,
            callbackGasLimit: callbackGasLimit,
            numWords: 1,
            extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: false}))
        });

        requestId = s_vrfCoordinator.requestRandomWords(req);
        requests[requestId] = OpenRequest(msg.sender, campaignId, false, 0);

        emit LootboxRequested(requestId, msg.sender, campaignId);
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        OpenRequest storage req = requests[requestId];
        require(!req.fulfilled, "Already fulfilled");

        uint256 randomness = randomWords[0];

        if (req.campaignId == MONTHLY_CAMPAIGN_ID) {
            // Monthly: fixed tiers
            uint256 prize = randomness % 100;
            if (prize > 95) req.prizeTier = 3;      // Rare
            else if (prize > 80) req.prizeTier = 2; // Uncommon
            else req.prizeTier = 1;                 // Common
        } else {
            // Campaign: weight = amount / (value + 1). Higher value = lower chance; more quantity = higher chance.
            // Example: 10 coffee (value 2), 100×1usd (value 1), 1 phone (value 300) → 1usd most likely, phone rarest.
            BountyFi.Prize[] memory prizes = bountyFi.getCampaignPrizes(req.campaignId);
            uint256 totalWeight = 0;
            for (uint256 i = 0; i < prizes.length; i++) {
                uint256 v = prizes[i].value + 1e18;
                totalWeight += (prizes[i].amount * 1e18) / v;
            }
            uint256 noPrizeWeight = (totalWeight * 40) / 60;
            uint256 totalRange = totalWeight + noPrizeWeight;
            if (totalRange == 0) {
                req.prizeTier = 0;
            } else {
                uint256 r = randomness % totalRange;
                if (r < noPrizeWeight) {
                    req.prizeTier = 0; // No prize
                } else {
                    uint256 r2 = r - noPrizeWeight;
                    uint256 cum = 0;
                    for (uint256 i = 0; i < prizes.length; i++) {
                        uint256 v = prizes[i].value + 1e18;
                        cum += (prizes[i].amount * 1e18) / v;
                        if (r2 < cum) {
                            req.prizeTier = i + 1; // 1-based prize index
                            break;
                        }
                    }
                    if (req.prizeTier == 0) req.prizeTier = prizes.length; // Rounding: last prize
                }
            }
        }

        req.fulfilled = true;
        emit LootboxOpened(requestId, req.user, req.prizeTier);
    }
}
