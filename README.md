# BountyFi

<p align="center">
  <img src="assets/yellyfish_logo.png" alt="BountyFi Logo" width="200"/>
</p>

## Overview

BountyFi is a decentralized verification system designed to incentivize and verify real-world behavioral changes through community participation. By combining artificial intelligence, peer validation, social network effects, and cryptographic lotteries, BountyFi creates a robust, scalable, and economically sustainable platform for behavioral campaigns and real world attestation.

The platform addresses core challenges in verification authenticity, Sybil resistance, and fraud prevention through a multi-layered architecture that leverages trust networks and AI-assisted escalation.

## Key Features

### 🛡️ Multi-Tier Verification
- **Tier 1: Deterministic Validation**: Automated checks for potential issues like geographic location, timestamps, and photo integrity.
- **Tier 2: AI-Assisted Classification**: Vision models (via Replicate) analyze submissions for content and context.
- **Tier 3: Peer Jury Validation**: A distributed jury system ensuring fair and accurate verification.

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
- **Smart Contracts**: Solidity (BountyFi.sol, Lootbox.sol)
- **Oracle**: Chainlink VRF

## Smart Contracts (Base Sepolia)

| Contract | Address | Description |
| :--- | :--- | :--- |
| **BountyFi** | `0xD8204FED124c34e259F61677e86802267D86f19F` | **Core Orchestrator**: Manages campaign lifecycles, submission commitments, and coordinates between AI verification and peer jury voting. |
| **Tickets** | `0x9F8a1FA09Df1feB9b2022bd1a153B411a5174486` | **Campaign Participation**: Tracks per-campaign ticket balances. Users earn tickets for verified actions, which serve as entries for campaign-specific rewards. |
| **TrustNetwork** | `0xe874582689C168f70E82EaCB3DAdc58990307474` | **Social Graph & Reputation**: Manages user connections and **Diamonds**. Diamonds are earned through accurate peer validation and represent a user's reputation and contribution. |
| **Lootbox** | `0x2Fdbb5bd8E9E81ea6658401766420DF744A75DA6` | **Reward Distribution**: Facilitates opening prize chests using Diamonds or Tickets. Integrates with BountyFi and TrustNetwork to distribute campaign rewards. |
| **SubmissionAnchor** | `0x4e7b3aE4C89Aef7EBCCad51bBaeb87824A69A55d` | **Data Commitment**: Provides a cryptographic layer for anchoring off-chain submission metadata, ensuring immutability and auditability. |

## Database Schema (Supabase)

| Table | Description |
| :--- | :--- |
| `users` | Core user profiles, mapping wallet addresses to application state (tickets, diamonds, streaks). |
| `campaigns` | Campaign metadata, requirements (radius, thresholds), and status. Mirrors on-chain state. |
| `submissions` | User-submitted proofs, including photo URLs, GPS coordinates, and verification status. |
| `votes` | Peer jury validation records for ambiguous submissions. |
| `tickets` | Ledger of per-campaign ticket balances earned through participation. |
| `campaign_prizes` | Detailed metadata for prizes associated with campaigns (labels, sponsors, amounts). |
| `lootbox_opens` | Persistent record of lootbox interactions and fulfilled rewards. |
| `donator_profiles` | Profiles for entities (sponsors/donators) funding campaigns. |
| `ai_verdicts` | Detailed traces and confidence scores from AI-assisted verification. |

## Edge Functions (Deno)

| Function | Responsibility |
| :--- | :--- |
| `indexer` | **State Synchronization**: Listens to blockchain events and updates Supabase state for campaigns and submissions. |
| `manage_campaign` | **Campaign Workflow**: Manages off-chain metadata for campaigns. |
| `verify_submission` | **Initial Validation**: Handles incoming user submissions and coordinates with the AI oracle. |
| `oracle_ai` | **ML Inference**: Interfaces with vision models to provide automated, high-confidence verification. |
| `process_votes_batch` | **Consensus Engine**: Aggregates jury votes to finalize submission status when AI confidence is low. |
| `ensure_user` | **Auth & Identity**: Manages crypto-native user onboarding using wallet addresses. |
| `donate` | **Sponsorship**: Processes donations and prize contributions/funding flows. |

## Architecture

BountyFi operates on a hybrid architecture:
1.  **Mobile App**: User interface for capturing and submitting verifications.
2.  **Relay Agent**: Handles off-chain signing and opaque commitments to the blockchain.
3.  **Smart Contracts**: Manage ticket minting, lotteries, and trust bonds on-chain.

## Getting Started

### Prerequisites

- **Node.js** (v18 or higher)
- **pnpm** (v10.28.1+) - Package manager
- **Supabase CLI** - For local backend development
- **Foundry** - For smart contract development
- **Expo CLI** - For mobile app development
- **Xcode** (macOS) or **Android Studio** - For mobile emulation

### Installation

1. **Clone the repository and install dependencies:**

```bash
git clone https://github.com/faboweb/BountyFi.git
cd BountyFi
pnpm install
```

2. **Set up environment variables:**

```bash
# Test environment
cp .env.test.example .env.test

# Mobile app environment
cp apps/app/.env.example apps/app/.env
```

3. **Configure Supabase (backend):**

```bash
# Start local Supabase instance
cd supabase
supabase start

# Deploy edge functions
supabase functions deploy
```

4. **Run the mobile app:**

```bash
# iOS
pnpm ios

# Android
pnpm android

# Web
pnpm web
```

### Project Structure

```
BountyFi/
├── apps/
│   └── app/              # React Native / Expo mobile app
├── packages/
│   └── contracts/        # Solidity smart contracts
├── supabase/
│   ├── functions/        # Edge Functions (Deno)
│   └── migrations/       # Database migrations
├── tests/                # E2E and integration tests
└── scripts/              # Utility scripts
```

### Development Workflows

**Mobile App Development:**
```bash
cd apps/app
pnpm start        # Start Expo development server
pnpm ios          # Run on iOS simulator
pnpm android      # Run on Android emulator
```

**Backend Development (Supabase):**
```bash
cd supabase
supabase start                    # Start local stack
supabase functions serve <name>   # Serve function locally
supabase db reset                 # Reset database with seeds
```

**Smart Contract Development:**
```bash
cd packages/contracts
# Deploy to local Anvil
./deploy_anvil.sh
# Deploy to Base Sepolia
./deploy_base.sh
```

**Running Tests:**
```bash
# Run all E2E tests
pnpm test:e2e

# Run specific test suites
pnpm test:golden
pnpm test:milestone3
```

### Environment Variables

| File | Variable | Description |
|------|----------|-------------|
| `apps/app/.env` | `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `apps/app/.env` | `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `apps/app/.env` | `EXPO_PUBLIC_USE_MOCK_API` | Toggle mock API (true/false) |
| `.env.test` | `SUPABASE_SERVICE_ROLE_KEY` | Service role key for tests |
| `.env.test` | `RPC_URL` | Ethereum RPC endpoint |

### Troubleshooting

- **Supabase connection issues**: Ensure Docker is running and ports 54321-54327 are available
- **Mobile build failures**: Clean build folders (`cd apps/app && rm -rf ios/build android/build`)
- **Dependency conflicts**: Delete `node_modules` and run `pnpm install` again


## Future Outlook

BountyFi's architecture is built to be a generalized verification layer. While initial use cases focus on specific environmental and civic actions, the system can scale to **verify anything verifiable through photos**.

- **Prediction Market Resolution**: Providing a truth-source for resolving market outcomes. BountyFi acts as a decentralized oracle for real-world events that can be visually captured, ensuring objective settlement for prediction markets.
- **Grant Fraud Prevention**: By providing cryptographic proof of impact, BountyFi offers a powerful solution for NGOs and aid organizations to prevent grant fraud in developing regions. Funds can be released conditionally based on verified, on-chain proof of work, ensuring resources reach their intended destination.

## License

[MIT](LICENSE)
