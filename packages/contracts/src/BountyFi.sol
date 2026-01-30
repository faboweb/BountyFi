// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./BountyToken.sol";
import "./TrustNetwork.sol";
import "./Tickets.sol";

contract BountyFi is AccessControl {
    bytes32 public constant ORACLE_ROLE = keccak256("ORACLE_ROLE");
    bytes32 public constant CAMPAIGN_MANAGER_ROLE = keccak256("CAMPAIGN_MANAGER_ROLE");

    enum CampaignType { SINGLE_PHOTO, TWO_PHOTO_CHANGE, CHECKIN_SELFIE }
    enum SubmissionStatus { PENDING, AI_VERIFIED, JURY_VOTING, REJECTED, APPROVED }

    struct Campaign {
        CampaignType campaignType;
        uint256 rewardAmount;
        uint256 stakeAmount;
        uint256 radiusM;
        uint256 aiThreshold;
        bool active;
    }

    struct Submission {
        uint256 campaignId;
        address submitter; // The Relayer (Agent)
        bytes32 submissionHash; // Opaque commitment
        SubmissionStatus status;
        uint256 aiConfidence;
        uint256 approveVotes;
        uint256 rejectVotes;
        uint256 createdAt;
    }

    BountyToken public immutable token;
    TrustNetwork public immutable trustNetwork;
    Tickets public immutable tickets;
    
    uint256 public nextCampaignId;
    uint256 public nextSubmissionId;

    mapping(uint256 => Campaign) public campaigns;
    mapping(uint256 => Submission) public submissions;
    mapping(uint256 => mapping(address => bool)) public hasVoted;

    event CampaignCreated(uint256 indexed campaignId, CampaignType campaignType, uint256 rewardAmount);
    event SubmissionCreated(uint256 indexed submissionId, uint256 indexed campaignId, address indexed submitter, bytes32 submissionHash);
    event AIScoreSubmitted(uint256 indexed submissionId, uint256 confidence);
    event Voted(uint256 indexed submissionId, address indexed juror, bool approve);
    event Finalized(uint256 indexed submissionId, SubmissionStatus status);

    constructor(address _token, address _trustNetwork, address _tickets) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(CAMPAIGN_MANAGER_ROLE, msg.sender);
        token = BountyToken(_token);
        trustNetwork = TrustNetwork(_trustNetwork);
        tickets = Tickets(_tickets);
    }

    function createCampaign(
        CampaignType _type,
        uint256 _reward,
        uint256 _stake,
        uint256 _radius,
        uint256 _aiThreshold
    ) external onlyRole(CAMPAIGN_MANAGER_ROLE) {
        campaigns[nextCampaignId] = Campaign(_type, _reward, _stake, _radius, _aiThreshold, true);
        emit CampaignCreated(nextCampaignId, _type, _reward);
        nextCampaignId++;
    }

    // Pending Submissions Tracking
    uint256[] public pendingSubmissionIds;
    mapping(uint256 => uint256) private pendingIndex; // Maps submissionId -> index in array
    mapping(address => mapping(uint256 => uint256)) public dailyVotes; // User -> Day -> Count

    function submit(
        uint256 _campaignId,
        bytes32 _submissionHash
    ) external {
        Campaign storage campaign = campaigns[_campaignId];
        require(campaign.active, "Campaign not active");

        submissions[nextSubmissionId] = Submission({
            campaignId: _campaignId,
            submitter: msg.sender,
            submissionHash: _submissionHash,
            status: SubmissionStatus.PENDING,
            aiConfidence: 0,
            approveVotes: 0,
            rejectVotes: 0,
            createdAt: block.timestamp
        });

        // Add to pending
        pendingIndex[nextSubmissionId] = pendingSubmissionIds.length;
        pendingSubmissionIds.push(nextSubmissionId);

        emit SubmissionCreated(nextSubmissionId, _campaignId, msg.sender, _submissionHash);
        nextSubmissionId++;
    }

    function submitAIScore(uint256 _submissionId, uint256 _confidence) external onlyRole(ORACLE_ROLE) {
        Submission storage sub = submissions[_submissionId];
        require(sub.status == SubmissionStatus.PENDING, "Not pending");
        Campaign storage camp = campaigns[sub.campaignId];

        sub.aiConfidence = _confidence;
        emit AIScoreSubmitted(_submissionId, _confidence);

        if (_confidence >= camp.aiThreshold) {
            sub.status = SubmissionStatus.APPROVED;
            _removeFromPending(_submissionId);
            // Minting moved to finalize()
            emit Finalized(_submissionId, SubmissionStatus.APPROVED);
        } else if (_confidence < camp.aiThreshold / 2) {
            sub.status = SubmissionStatus.REJECTED;
            _removeFromPending(_submissionId);
            // TrustNetwork update moved/kept? The Relayer is the submitter, so punishing Relayer is wrong.
            // Punishing User happens off-chain (ban) or via finalize(REJECT).
            // For now, emit REJECTED.
            emit Finalized(_submissionId, SubmissionStatus.REJECTED);
        } else {
            sub.status = SubmissionStatus.JURY_VOTING;
        }
    }

    function vote(uint256 _submissionId, bool _approve) external {
        Submission storage sub = submissions[_submissionId];
        require(sub.status == SubmissionStatus.JURY_VOTING, "Not in jury phase");
        // require(sub.submitter != msg.sender, "Cannot vote on own"); // Relayer is submitter, Validator checks off-chain
        require(!hasVoted[_submissionId][msg.sender], "Already voted");

        hasVoted[_submissionId][msg.sender] = true;
        
        // Track Daily Votes
        uint256 day = block.timestamp / 1 days;
        dailyVotes[msg.sender][day]++;

        if (_approve) sub.approveVotes++;
        else sub.rejectVotes++;

        emit Voted(_submissionId, msg.sender, _approve);

        if (sub.approveVotes >= 2) {
            sub.status = SubmissionStatus.APPROVED;
            _removeFromPending(_submissionId);
            // Minting moved to finalize()
            emit Finalized(_submissionId, SubmissionStatus.APPROVED);
        } else if (sub.rejectVotes >= 2) {
            sub.status = SubmissionStatus.REJECTED;
            _removeFromPending(_submissionId);
            emit Finalized(_submissionId, SubmissionStatus.REJECTED);
        }
    }

    function finalizeSubmission(uint256 _submissionId, address _recipient) external onlyRole(ORACLE_ROLE) {
        Submission storage sub = submissions[_submissionId];
        require(sub.status == SubmissionStatus.APPROVED, "Not approved");
        // Require not already minted?
        // We can check if tickets/tokens were already given? 
        // Or simply add a `minted` flag to struct.
        // For now, assuming Oracle calls this ONCE.
        
        Campaign storage camp = campaigns[sub.campaignId];
        token.mint(_recipient, camp.rewardAmount);
        trustNetwork.handleResolution(_recipient, true);
        tickets.mint(_recipient, sub.campaignId, camp.rewardAmount, sub.submissionHash);
    }

    function getValidationTask(address _validator) external view returns (uint256) {
        // 1. Check Daily Limit
        uint256 day = block.timestamp / 1 days;
        if (dailyVotes[_validator][day] >= 10) return type(uint256).max; // Limit reached

        uint256 length = pendingSubmissionIds.length;
        if (length == 0) return type(uint256).max;

        // 2. Random Selection (Pseudorandom) to avoid always checking index 0
        uint256 start = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, _validator))) % length;

        // 3. Iterate (max 10 tries to find non-conflicting)
        for (uint i = 0; i < 10; i++) {
            uint256 index = (start + i) % length;
            uint256 subId = pendingSubmissionIds[index];
            Submission storage sub = submissions[subId];

            // Only return submissions that are in JURY_VOTING status
            if (sub.status != SubmissionStatus.JURY_VOTING) continue;

            // Skip own
            if (sub.submitter == _validator) continue;
            // Skip already voted
            if (hasVoted[subId][_validator]) continue;
            // Skip Connection
            if (trustNetwork.isConnection(_validator, sub.submitter)) continue;

            return subId;
        }

        return type(uint256).max; // No suitable task found
    }

    function _removeFromPending(uint256 _submissionId) internal {
        uint256 index = pendingIndex[_submissionId];
        uint256 lastIndex = pendingSubmissionIds.length - 1;
        
        if (index != lastIndex) {
            uint256 lastId = pendingSubmissionIds[lastIndex];
            pendingSubmissionIds[index] = lastId;
            pendingIndex[lastId] = index;
        }

        pendingSubmissionIds.pop();
        delete pendingIndex[_submissionId];
    }
}
