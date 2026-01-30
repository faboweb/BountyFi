// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "./Tickets.sol";

contract TrustNetwork is AccessControl {
    bytes32 public constant RESOLVER_ROLE = keccak256("RESOLVER_ROLE");

    Tickets public tickets;

    // Mapping from Truster -> Array of Trustees (Max 10)
    mapping(address => address[]) public trustCircles;
    // Mapping from Trustee -> Array of Trusters (Inverse graph for O(1) lookups during resolution)
    mapping(address => address[]) public reverseTrustCircles;
    
    // Mapping from User -> Referrer
    mapping(address => address) public referrers;
    
    // Mapping from User -> Diamond Balance
    mapping(address => uint256) public diamonds;

    event TrustConnectionCreated(address indexed truster, address indexed trustee);
    event ReferrerSet(address indexed user, address indexed referrer);
    event DiamondsEarned(address indexed user, uint256 amount);
    event TicketRewardMinted(address indexed user, uint256 amount);
    event TicketBurned(address indexed user, uint256 amount);

    constructor(address _tickets) {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        tickets = Tickets(_tickets);
    }

    // --- User Actions ---

    function addTrustee(address _trustee) external {
        require(_trustee != msg.sender, "Cannot trust self");
        require(trustCircles[msg.sender].length < 10, "Trust circle full (max 10)");
        
        // Check for duplicates
        for (uint i = 0; i < trustCircles[msg.sender].length; i++) {
            require(trustCircles[msg.sender][i] != _trustee, "Already trusted");
        }

        trustCircles[msg.sender].push(_trustee);
        reverseTrustCircles[_trustee].push(msg.sender);
        
        emit TrustConnectionCreated(msg.sender, _trustee);
    }

    function setReferrer(address _referrer) external {
        require(referrers[msg.sender] == address(0), "Referrer already set");
        require(_referrer != msg.sender, "Cannot refer self");
        
        referrers[msg.sender] = _referrer;
        emit ReferrerSet(msg.sender, _referrer);
    }

    // --- System Actions ---

    function handleResolution(address _submitter, bool _success) external onlyRole(RESOLVER_ROLE) {
        if (_success) {
            _handleSuccess(_submitter);
        } else {
            _handleFailure(_submitter);
        }
    }

    function _handleSuccess(address _submitter) internal {
        // 1. Reward Referrer
        address referrer = referrers[_submitter];
        if (referrer != address(0)) {
            _addDiamond(referrer);
        }

        // 2. Reward Trusters
        address[] memory trusters = reverseTrustCircles[_submitter];
        for (uint i = 0; i < trusters.length; i++) {
            _addDiamond(trusters[i]);
        }
    }

    function _handleFailure(address _submitter) internal {
        // 1. Penalize Trusters
        address[] memory trusters = reverseTrustCircles[_submitter];
        for (uint i = 0; i < trusters.length; i++) {
            _burnTicketIfPossible(trusters[i]);
        }
    }

    function _addDiamond(address _user) internal {
        diamonds[_user]++;
        emit DiamondsEarned(_user, 1);

        if (diamonds[_user] % 10 == 0) {
            // Mint 1 Ticket Reward
            // Use 0 as campaignId for generic rewards, or handle campaignId linking if needed.
            // For now, let's assume campaignId 0 is "General/Trust Rewards"
            tickets.mintReward(_user, 0, 1, bytes32(0)); 
            emit TicketRewardMinted(_user, 1);
        }
    }

    function _burnTicketIfPossible(address _user) internal {
        // We need to find a campaign where the user has tickets.
        // This is tricky because balances are per-campaign.
        // For V1, we might just try to burn from campaignId 0 (Generic) or fail silently?
        // OR: We update Tickets to have a global balance or iterate?
        // Let's assume for now we burn from Campaign 0 or simply track "Debt"?
        // Simpler for MVP: Burn from Campaign 0 if balance > 0.
        
        uint256 balance = tickets.balanceOf(_user, 0);
        if (balance > 0) {
            tickets.burn(_user, 0, 1);
            emit TicketBurned(_user, 1);
        }
    }
    function isConnection(address _a, address _b) external view returns (bool) {
        if (_a == _b) return true;

        // Check A trusts B
        for (uint i = 0; i < trustCircles[_a].length; i++) {
            if (trustCircles[_a][i] == _b) return true;
        }

        // Check B trusts A
        for (uint i = 0; i < trustCircles[_b].length; i++) {
            if (trustCircles[_b][i] == _a) return true;
        }

        // Check Referrals
        if (referrers[_a] == _b || referrers[_b] == _a) return true;

        return false;
    }
}
