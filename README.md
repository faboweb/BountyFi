# BountyFi

<p align="center">
  <img src="assets/yellyfish_logo.png" alt="BountyFi Logo" width="200"/>
</p>

## Overview

BountyFi is a decentralized verification system designed to incentivize and verify real-world behavioral changes through community participation. By combining artificial intelligence, peer validation, social network effects, and cryptographic lotteries, BountyFi creates a robust, scalable, and economically sustainable platform for behavioral campaigns.

The platform addresses core challenges in verification authenticity, Sybil resistance, and fraud prevention through a multi-layered architecture that leverages trust networks and AI-assisted escalation.

## Key Features

### 🛡️ Multi-Tier Verification
- **Tier 1: Deterministic Validation**: Automated checks for potential issues like geographic location, timestamps, and photo integrity.
- **Tier 2: AI-Assisted Classification**: Vision models (via Replicate) analyze submissions for content and context.
- **Tier 3: Peer Jury Validation**: A distributed jury system for ambiguous cases, ensuring fair and accurate verification.

### 🤝 Trust Network
- **Invitation System**: Viral growth through referral links.
- **Trusted Connections**: "Opt-in" connections with shared reputation and rewards, fostering accountability, **peer pressure to be honest**, and reducing fraud.

### 🎰 Economic Sustainability
- **Lottery Incentives**: Users earn tickets for verified actions, participating in daily and weekly draws powered by Chainlink VRF for provable fairness.
- **Cost Efficiency**: Lottery mechanics provide high perceived value while keeping per-action costs low for campaign organizers.

### 🤖 Sybil Resistance
- **Biometric Verification**: Privacy-preserving facial embedding comparison to detect duplicates.
- **Device Attestation**: Trusted app signatures to prevent API abuse.
- **Social Graph Analysis**: Identification of suspicious clusters and collusion rings.

## Use Cases

- **Environmental Conservation**: Anti-burning campaigns, waste cleanup tracking.
- **Public Health**: Vaccination verification, hygiene practice monitoring.
- **Civic Engagement**: Infrastructure reporting, community meeting attendance.

## Technology Stack

- **Frontend**: React Native / Expo (Mobile App)
- **Backend**: Supabase (Edge Functions, Database, Auth)
- **AI/ML**: Replicate (Vision Models), CLIP
- **Blockchain**: Ethereum / EVM-compatible networks
- **Smart Contracts**: Solidity (BountyFi.sol, BountyToken.sol, Lootbox.sol)
- **Oracle**: Chainlink VRF

## Architecture

BountyFi operates on a hybrid architecture:
1.  **Mobile App**: User interface for capturing and submitting verifications.
2.  **Relay Agent**: Handles off-chain signing and opaque commitments to the blockchain.
3.  **Smart Contracts**: Manage ticket minting, lotteries, and trust bonds on-chain.

## Getting Started

*(Instructions for setting up the development environment will go here)*


## Future Outlook

BountyFi's architecture is built to be a generalized verification layer. While initial use cases focus on specific environmental and civic actions, the system can scale to **verify anything verifiable through photos**.

- **Prediction Market Resolution**: Providing a truth-source for resolving market outcomes. BountyFi acts as a decentralized oracle for real-world events that can be visually captured, ensuring objective settlement for prediction markets.
- **Grant Fraud Prevention**: By providing cryptographic proof of impact, BountyFi offers a powerful solution for NGOs and aid organizations to prevent grant fraud in developing regions. Funds can be released conditionally based on verified, on-chain proof of work, ensuring resources reach their intended destination.

## License

[MIT](LICENSE)
