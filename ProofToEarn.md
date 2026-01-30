This paper presents BountyFi, a decentralized verification system designed to incentivize and verify real-world behavioral changes through community participation. The system combines artificial intelligence, peer validation, social network effects, and cryptographic lotteries to create a robust, scalable, and economically sustainable platform for behavioral campaigns. We address the core challenges of verification authenticity, Sybil resistance, fraud prevention, and economic viability through a multi-layered architecture that leverages trust networks, red-team testing, and AI-assisted escalation. Our approach demonstrates how blockchain-based incentives can be made economically attractive through lottery mechanics while maintaining verification integrity through peer pressure and algorithmic oversight.

## Introduction

Behavioral change campaigns face a fundamental verification problem: how to confirm that claimed actions actually occurred without prohibitive surveillance costs. Traditional approaches rely on either centralized verification (expensive, slow, privacy-invasive) or honor systems (easily exploited). BountyFi proposes a third path: distributed community verification backed by economic incentives, social accountability, and machine learning.

The system targets real-world use cases such as environmental initiatives (anti-burning campaigns, waste management), public health interventions (vaccination verification, hygiene practices), and civic engagement (attendance verification, participation tracking). These campaigns share common requirements: geographic specificity, photographic evidence, temporal constraints, and the need for human judgment in ambiguous cases.

Recent advances in decentralized identity verification demonstrate the viability of biometric-based Sybil resistance in blockchain systems[1]. Trust-aware propagation models in peer-to-peer networks show how social graphs can enhance security while maintaining decentralization[2]. Quality control mechanisms in crowdsourcing platforms, particularly gold standard tasks, provide proven methods for maintaining validator integrity[3]. Building on these foundations, BountyFi creates an integrated architecture where economic incentives, social pressure, and algorithmic verification work in concert.

## System Architecture

### Core Components

BountyFi operates as a three-tier verification system combining deterministic rules, artificial intelligence, and human judgment.

#### Tier 1: Deterministic Validation

The first layer performs automated checks on all submissions:

\begin{itemize}
\item Geographic verification: GPS coordinates must fall within campaign-defined geofences with configurable radius constraints
\item Temporal validation: Timestamps must align with campaign schedules and checkpoint availability windows
\item Structural completeness: Required photo types (before/after, selfie) must be present
\item Photo authenticity verification: Trusted app attestation marks photos at capture time with cryptographic signatures and device metadata, making photo manipulation or reuse economically challenging[9]
\end{itemize}

These checks execute server-side immediately upon submission, rejecting invalid attempts before expensive AI or human review.

#### Tier 2: AI-Assisted Classification

Submissions passing deterministic checks enter AI evaluation using vision models accessed via Replicate's HTTP API[4]. The system employs different AI strategies per campaign type:

**Single-photo campaigns** use CLIP-based prompt scoring to verify required elements are present and authentic. For example, a "no burning" campaign checks for absence of fire, smoke, and char patterns while confirming outdoor agricultural settings.

**Before-after campaigns** compute semantic similarity between image pairs, verifying that the "before" state matches the target problem (e.g., trash accumulation, burned fields) and the "after" state shows improvement. The system uses CLIP embeddings to calculate change vectors and compare against campaign-specific thresholds.

**Selfie-checkpoint campaigns** use facial detection to verify human presence at the correct geographic location. Trusted app attestation ensures photos were captured live rather than uploaded from galleries, preventing replay attacks.

AI models return confidence scores (0-1 range) plus structured reasoning. Submissions are routed based on confidence bands[5]:

\begin{itemize}
\item High confidence approval (>0.85): Auto-approve, small audit probability
\item Low confidence rejection (<0.30): Auto-reject with explanation
\item Uncertain middle range: Route to human jury
\end{itemize}

This tiered approach minimizes human review costs while maintaining accuracy, as the majority of clear-cut cases resolve automatically.

#### Tier 3: Peer Jury Validation

Ambiguous submissions enter a jury system inspired by Kleros-style distributed arbitration but optimized for low-stakes, high-volume verification. Key design choices include:

**Jury size varies by context**: Initial reviews use 5-7 validators. Audit reviews escalate to 11-15 validators for stricter consensus.

**Supermajority threshold**: Approve requires ≥60% agreement. Reject requires ≥60% agreement. Otherwise, escalate or route to audit.

**Vote options**: Approve, Reject, Unclear, Skip. The "Skip" option reduces forced decisions on genuinely ambiguous cases while tracking validator engagement.

**Anti-collusion assignment**: The system never assigns validators who share trust-network connections with the submitter within two graph hops (friends or friends-of-friends), preventing approval rings where connected users coordinate to validate each other's submissions[2].

### Trust Network Layer

BountyFi implements a dual-path social graph architecture:

#### Invitation Links (No Risk)

Any user can invite others via referral links. Inviters earn small rewards (1-3% of invitee earnings) with no downside exposure. This drives viral growth without creating risk aversion.

#### Trusted Connections (Opt-in Risk)

Users can upgrade invitations to "trusted connections" by explicitly opting in. Trusted connections provide:

\begin{itemize}
\item Higher reward multipliers (team integrity bonuses)
\item Shared reputation scoring
\item Bounded downside exposure: each trusted connection has a per-period risk cap (e.g., maximum 10 tickets lost per month per connection)
\end{itemize}

When a trusted connection fails an audit, the upline loses tickets up to the risk cap. This creates peer pressure—users police their trusted circles—without unlimited liability.

The bounded risk model addresses a critical failure mode in naive trust networks: if one bad actor can destroy an entire network's earnings, users become overly conservative and stop recruiting[6]. By capping exposure, BountyFi maintains growth incentives while preserving accountability.

Trust links can be removed unilaterally at any time, allowing users to prune problematic connections before they cause damage.

### Red-Team Testing (Gold Tasks)

Quality control in crowdsourced verification requires continuous validator testing. BountyFi injects "gold tasks"—submissions with known correct answers—into the validation queue at approximately 10% frequency[3][7].

**Relayed submission architecture**: To make gold tasks indistinguishable from real submissions, the system uses a commit-reveal pattern where users sign submissions off-chain with EIP-712 typed structured data[13], and a relay agent posts only opaque cryptographic commitments (hashes) on-chain. Gold tasks inserted by the agent appear identical to real submissions in the validator interface and on-chain records, preventing validators from inferring which tasks are tests based on transaction patterns or submission metadata[14].

Gold tasks are constructed from real failure modes:

\begin{itemize}
\item Photo reuse: Same image submitted by different users or across different days
\item GPS spoofing: Photos geotagged outside campaign radius
\item Mismatched before/after: Semantically unrelated image pairs
\item Clear violations: Obvious burning visible in "no burning" submissions
\end{itemize}

Each gold task includes the expected vote (approve or reject). When validators vote on gold tasks (unknowingly), their responses update their quality score. Repeated failures trigger progressive consequences:

\begin{enumerate}
\item First failure: Educational notification explaining the error
\item Second-third failures: Reduced vote weight in consensus calculations
\item Fourth+ failures: Temporary cooldown period (24-72 hours)
\item Persistent failure: Permanent ban from validation pool
\end{enumerate}

This graduated response balances learning tolerance with fraud prevention. New validators receive more lenient treatment, as they may genuinely need training on campaign-specific edge cases.

The system maintains a library of gold tasks per campaign type, continuously enriched by:

\begin{itemize}
\item Audit-detected fraud (confirmed cheating becomes training data)
\item Edge cases that produced validator disagreement (helps calibrate difficulty)
\item Synthetic manipulations (AI-generated fakes, photoshopped images)
\end{itemize}

**Gold task governance**: To prevent the relay agent from arbitrarily manipulating validator scores, the system pre-commits to gold task sets by publishing Merkle roots of gold commitments at campaign initialization. After validators complete reviews, the system reveals which commitments were gold tasks, allowing external auditors to verify that tests were predetermined rather than fabricated post-hoc[14]. This transparency mechanism addresses the governance risk inherent in centralized test injection while maintaining the operational advantage of agent-controlled gold task distribution.

### AI Escalation and Strike System

The combination of AI confidence scoring and validator performance creates an escalation mechanism for fraud detection.

When AI flags a submission as highly suspicious (confidence <0.15 or specific fraud patterns detected) AND the submission is approved by validators, the system triggers enhanced scrutiny:

\begin{enumerate}
\item Immediate audit assignment with larger jury (15+ validators)
\item Original approving validators receive strike warnings
\item If audit overturns the approval, original validators receive strikes
\item Submitter account receives fraud flag
\end{enumerate}

Three strikes result in penalties:

\begin{itemize}
\item Submitters: Temporary ban (7-30 days), forfeiture of pending rewards, reputation reset
\item Validators: Removal from validation pool, forfeiture of staked amounts, trust network notification
\end{itemize}

The AI-human feedback loop continuously improves both components. When AI wrongly flags legitimate submissions, human overrides train the model to reduce false positives. When validators consistently approve fraudulent content that AI correctly identified, the system learns to weight AI confidence more heavily in future routing decisions[5].

### Sybil Resistance Through Selfie Verification

Creating multiple fake accounts (Sybil attacks) threatens any incentive system. BountyFi implements multi-factor Sybil resistance:

#### Biometric Verification

All campaigns requiring selfie-checkpoint verification inherently collect facial biometric data. To preserve user privacy, facial embeddings are generated and stored exclusively on the user's device. When verification is required, embeddings are transmitted directly to AI agents via encrypted channels, never passing through centralized databases. The system compares embeddings against a distributed index to detect duplicates without storing raw biometric data centrally[8].

Duplicate face detection triggers investigation:

\begin{itemize}
\item If same face appears under different accounts: flag as potential Sybil cluster
\item If matches occur across different geographic regions simultaneously: increase suspicion score
\item If submission patterns are temporally correlated: merge into single investigation
\end{itemize}

Biometric verification occurs through privacy-preserving protocols where raw facial images and embeddings remain on user devices. Only anonymized similarity scores are transmitted for duplicate detection. This architecture prevents central database breaches from compromising biometric privacy while maintaining Sybil detection capabilities.

#### Trusted App Attestation

Photos submitted via official mobile apps include device attestation signatures proving they originated from genuine app installations, not API requests or manipulated clients[9]. This prevents:

\begin{itemize}
\item Bulk API submissions from scripts
\item Photo injection from image libraries
\item GPS coordinate manipulation (apps use native location APIs with integrity checks)
\end{itemize}

While not foolproof, app attestation raises the technical barrier substantially. Attackers must compromise individual devices rather than simply scripting API calls.

#### Social Graph Analysis

Sybil accounts often exhibit recognizable network patterns: they connect primarily to each other, have minimal external connections, and show correlated submission timing[2]. The system runs periodic graph analysis identifying:

\begin{itemize}
\item Densely connected subgraphs with low external connectivity (potential Sybil rings)
\item Submission timing correlation (same clusters submitting within narrow time windows)
\item Validation collusion (members of a cluster approve each other at unusual rates)
\end{itemize}

Detected clusters receive heightened audit rates and may face collective penalties if fraud is confirmed.

## Economic Model: Lottery-Based Sustainability

Behavioral change incentives face a sustainability paradox: to drive participation, per-action rewards must be meaningful (e.g., $2-5 USD equivalent), but at scale this creates prohibitive costs. BountyFi resolves this through lottery mechanics that leverage behavioral economics insights.

### Gamification and Lottery-Seeking Behavior

Research shows that lower socioeconomic status populations exhibit stronger lottery-seeking behavior and engagement with gamified incentives[10][11]. Rather than viewing this as exploitation, BountyFi channels this preference toward pro-social behavior.

Participants earn tickets for verified actions, but tickets do not equal guaranteed payments. Instead, tickets are entries into periodic lotteries with substantial prizes. For example:

\begin{itemize}
\item Daily draws: 5-10 winners share $500-1000 prize pool
\item Weekly draws: 3 winners share $5,000 prize pool
\item Campaign-end draws: 1 grand prize of $25,000
\end{itemize}

This structure creates:

**Anticipated regret**: Knowing that incomplete participation means missed lottery chances drives consistent engagement[11]. The "what if I had won" feeling is amplified when prizes are large and visible.

**Lower per-action cost**: If 10,000 verified actions earn tickets for a $1,000 weekly prize, the expected value per action is $0.10, yet the perceived value (chance at $1,000) far exceeds this. Campaign organizers achieve 20x cost efficiency versus direct payments.

**Sustained participation**: Lottery anticipation maintains engagement over time, whereas fixed micro-payments experience rapid hedonic adaptation[10].

### Provable Fairness via Chainlink VRF

To ensure trust, winner selection must be cryptographically provable. BountyFi uses Chainlink Verifiable Random Function (VRF) for lottery draws, providing on-chain proof that selections were truly random and not manipulated[12].

The process:

\begin{enumerate}
\item At draw time, contract requests randomness from Chainlink VRF
\item VRF nodes generate random number with cryptographic proof
\item Contract receives random seed and proof, executes winner selection algorithm
\item All participants can verify the proof on-chain
\end{enumerate}

This transparency eliminates accusations of rigged drawings, critical for maintaining participant trust in communities with historical skepticism of institutions.

### Validation Incentives

Validators also earn tickets, not fixed payments, maintaining economic consistency. Validation ticket earnings are:

\begin{itemize}
\item Base rate: 1 ticket per correct validation
\item Accuracy bonus: 2x multiplier if monthly accuracy >95%
\item Gold task bonus: 5 tickets for correctly identifying difficult gold tasks
\item Audit participation: 3 tickets per audit review (higher complexity)
\end{itemize}

Validators enter the same lottery pools as submitters, creating a unified economy. High-quality validators with consistent accuracy accumulate more tickets and thus higher win probability, aligning incentives toward diligent review.

## System Dynamics and Failure Modes

### Positive Feedback Loops

**Trust network growth**: Successful users invite trusted friends, creating expanding circles of verified participants. As networks grow, local knowledge improves validation quality (validators recognize local context and locations).

**AI improvement**: Each human validation provides training signal for AI models. As submission volume grows, AI accuracy increases, reducing human review burden and costs.

**Gold task library enrichment**: Every detected fraud case becomes a training example, making future detection easier.

### Negative Feedback Loops (Stabilizers)

**Collusion detection**: As fraud attempts increase, audit rates automatically increase for suspicious clusters, raising the cost of cheating.

**Validator quality control**: Poor validators lose weight and eventually access, maintaining pool quality.

**Economic cap**: Lottery prize pools have fixed budgets, preventing runaway cost growth.

### Mitigation of Failure Modes

**Collusion rings**: Anti-collusion assignment rules plus social graph analysis detect coordinated fraud. Bounded risk caps prevent entire networks from being destroyed by single bad actors, maintaining growth.

**Validator fatigue**: Skip option reduces forced decisions. Variable difficulty ensures validators receive mix of easy and challenging cases. Accuracy bonuses reward consistent effort.

**False positive avalanche**: AI confidence thresholds tuned to favor false negatives over false positives in auto-rejection. Humans review borderline cases. Appeal mechanisms allow submitters to challenge wrongful rejections.

**Sybil proliferation**: Multi-factor resistance (biometrics, device attestation, social graph analysis) creates defense in depth. No single method is perfect, but their combination raises attack costs substantially.

**Prize pool exhaustion**: Dynamic ticket-to-odds ratios adjust if participation exceeds projections. Campaign organizers set budget caps enforced by smart contracts.

**Relay agent centralization**: The relay agent represents a temporary trust bottleneck with potential for censorship (selective submission dropping) and manipulation (biased gold task injection). Mitigations include: (1) EIP-712 signatures binding submissions to intended recipients, preventing reward theft[13]; (2) Merkle-committed gold task sets, enabling post-hoc verification that tests were predetermined[14]; (3) multi-relayer federation roadmap where multiple independent agents compete on latency and reliability; (4) transparency logs recording all relay operations for community audit.

**Gold task detection by adversaries**: Research demonstrates that adversarial workers can infer which tasks are likely gold through statistical analysis and shared observations, undermining quality control[15][16]. Mitigations include: (1) large, frequently rotated gold task pools; (2) dynamic gold injection rates that vary per validator and context; (3) realistic gold task construction matching real submission distributions; (4) penalty delays so validators cannot immediately correlate feedback with specific submissions[7].

## Implementation and Technical Stack

BountyFi implements on a hybrid architecture combining off-chain verification logic with on-chain economic settlement.

### Backend Infrastructure

\begin{itemize}
\item Relational database: submissions, photos, votes, trust graph, tickets ledger
\item Relay agent: receives EIP-712 signed submissions from users, posts opaque commitments on-chain, manages gold task injection, coordinates reveal phase for reward distribution
\item Worker services: verification agents, jury assignment, settlement, scheduled tasks
\item Object storage: encrypted photo storage with signed URL access control
\item Real-time messaging: validator task notifications, submission status updates
\end{itemize}

**Submission flow**: Users sign structured submission data off-chain (including submission payload hash, reward recipient address, nonce, and campaign ID) and upload to the relay agent[13]. The agent posts only a cryptographic commitment to the blockchain, hiding submitter identity and enabling seamless gold task mixing. After off-chain verification completes, the agent reveals the commitment with the original signature, allowing the contract to verify authenticity and mint rewards to the correct recipient. This architecture prevents the relay agent from redirecting rewards while maintaining submission privacy during verification[14].

### AI Inference Layer

Vision model API calls for CLIP scoring, embedding generation, and image analysis. Asynchronous prediction endpoints with callback mechanisms enable non-blocking verification flows.

### Blockchain Layer

\begin{itemize}
\item Ticket token contract: minting verified tickets, burning for penalties
\item Submission anchor contract: cryptographic hashes of finalized decisions for audit trail
\item Lottery contract: Chainlink VRF integration for provable randomness, winner selection, prize distribution
\item Trust bond contract: staked amounts for validators, slashing logic
\end{itemize}

The blockchain layer provides low transaction costs essential for high-frequency ticket minting while maintaining security guarantees and cryptographic verifiability.

### Scheduled Workflows

\begin{table}
\begin{tabular}{|l|l|l|}
\hline
Task & Frequency & Purpose \\
\hline
Verify batch & Every 2 min & Run AI on pending submissions \\
Assign jury & Every 5 min & Distribute needs-jury submissions \\
Finalize votes & Every 10 min & Compute jury consensus, settle \\
Mint tickets & Every 30 min & Batch on-chain minting \\
Audit selection & Daily & VRF-select submissions for audit \\
Draw lottery & Weekly & Execute VRF draw, distribute prizes \\
\hline
\end{tabular}
\caption{Scheduled verification and settlement workflows}
\end{table}

## Related Work and Positioning

BountyFi synthesizes ideas from several research domains:

**Decentralized identity**: Humanity Protocol demonstrates palm biometrics with zero-knowledge proofs for Sybil resistance[1]. BountyFi adapts this to selfie-based verification with trusted app attestation, trading some privacy for deployment simplicity.

**P2P trust networks**: Trust-aware propagation models show how social graphs improve security in distributed systems[2]. BountyFi implements bounded risk exposure rather than unlimited shared fate, addressing network growth constraints.

**Crowdsourcing quality control**: Gold standard tasks are proven effective in platforms like Mechanical Turk[3][7]. BountyFi automates gold task generation using audit outcomes and edge cases, creating a self-improving quality system.

**Blockchain governance**: Kleros pioneered stake-based jury systems for decentralized arbitration. BountyFi adapts this for high-volume, low-stakes verification with reputation-weighted voting rather than pure stake.

**Gamification in behavioral interventions**: Lottery-based incentives show strong engagement effects in lower-SES populations[10][11]. BountyFi makes this mechanism cryptographically transparent via VRF, addressing trust concerns.

The novelty lies in integration: combining these proven techniques into a cohesive architecture optimized for real-world behavioral campaigns with geographic and temporal constraints.

## Use Cases and Applications

### Environmental Conservation

**Anti-burning campaigns** (Thailand rice/sugarcane): Farmers submit daily "no burning" photos of their fields. Before-after campaigns reward field clearing without fire. GPS verification ensures coverage, trusted app attestation prevents photo reuse.

**Waste cleanup initiatives**: Community members photograph trash accumulation (before) and cleaned sites (after). Trust networks emerge around neighborhood cleanup groups.

**Reforestation tracking**: Participants document tree planting and survival, with multi-month verification schedules proving tree growth.

### Public Health

**Vaccination verification**: Clinic selfies with vaccination cards captured via trusted apps. Reduces fraud versus honor-system reporting while preserving privacy (no centralized medical records).

**Hygiene practice adoption**: Handwashing stations, latrine usage, water treatment verification in areas with limited health infrastructure.

### Civic Engagement

**Meeting attendance verification**: Community gathering participants check in via app, creating verifiable attendance records for transparent governance.

**Infrastructure reporting**: Citizens document potholes, broken streetlights, or public service issues, verified by community validators who confirm problem existence and resolution.

## Evaluation and Future Work

### Pilot Deployment Metrics

Initial deployment targets:

\begin{itemize}
\item 1,000 participants across 3 campaigns
\item 10,000 verified submissions over 60 days
\item Validator pool of 200 active reviewers
\item Fraud detection rate >90% via audit sampling
\item False positive rate <5% on legitimate submissions
\end{itemize}

Success criteria include sustainable validator engagement (>70% retention over campaign period), trust network formation (>60% of users create at least 1 trusted connection), and cost efficiency (lottery economics maintain $<0.50 per verified action).

### Research Questions

**Optimal lottery structure**: What prize distribution (many small vs few large) maximizes engagement across different cultural contexts?

**Trust network dynamics**: How quickly do trust networks stabilize? What factors predict which connections persist versus are pruned?

**AI-human calibration**: At what submission volumes does AI accuracy surpass human consensus? How should confidence thresholds adapt over time?

**Cross-campaign learning**: Can AI models and validator expertise transfer across campaign types (e.g., anti-burning validators assessing waste cleanup)?

### Technical Extensions

**Decentralized node infrastructure**: Introduce a federated node system where trusted authorities (NGOs, local governments, community organizations) operate verification nodes that host AI agents and encrypted storage. This distributes computational load and reduces central points of failure while maintaining quality control through node reputation scoring. Nodes compete on latency and accuracy, with underperforming nodes automatically de-weighted. This roadmap feature enables true decentralization without sacrificing verification quality.

**Enhanced privacy-preserving biometrics**: Extend current on-device embedding storage with zero-knowledge proofs for facial comparison, enabling duplicate detection through cryptographic protocols that reveal only match/no-match results without exposing biometric data to any party.

**Cross-chain interoperability**: Extend ticket NFTs across multiple L2s to reduce geographic transaction cost barriers.

**Decentralized storage**: Migrate photo storage to IPFS or Arweave for censorship resistance and permanence.

**Validator reputation portability**: Create interoperable reputation NFTs allowing validated users to carry trust scores across platforms.

## Conclusion

BountyFi demonstrates that community-verified behavioral change incentives can achieve the robustness, scalability, and economic sustainability required for real-world deployment. By combining artificial intelligence (efficient pre-filtering), peer validation (human judgment and context), trust networks (social accountability), red-team testing (continuous quality control), and lottery economics (cost-efficient incentives), the system creates a viable architecture for verifying real-world actions at scale.

The key insight is that no single mechanism suffices: AI alone lacks contextual understanding, human review alone does not scale economically, social networks alone enable collusion, and economic incentives alone attract fraud. The integration of these components, with carefully designed feedback loops and failure-mode mitigations, produces an emergent reliability greater than any individual part.

As decentralized systems mature beyond purely digital interactions, verification of real-world actions becomes critical. BountyFi provides a template for building trust in permissionless environments through hybrid architectures that balance automation and human judgment, individual incentives and collective accountability, economic efficiency and behavioral insight.

Future work will validate these design choices through real-world deployments, refining the balance between verification cost, fraud prevention, and user experience. The ultimate goal: enabling any organization or community to launch behavioral campaigns with confidence that verified actions genuinely occurred, participants were fairly rewarded, and the system remains economically sustainable over time.

## References

[1] Humanity Protocol Team. (2025). Humanity Protocol: Biometric Sybil resistance for decentralized identity. Mitosis University. https://university.mitosis.org/humanity-protocol-biometric-sybil-resistance-for-decentralized-identity/

[2] Li, J., Wang, Y., & Wang, J. (2013). A social network-based trust-aware propagation model for P2P systems. *Knowledge-Based Systems*, 41, 8-15. https://doi.org/10.1016/j.knosys.2012.12.005

[3] Hoßfeld, T., Keimel, C., Hirth, M., Gardlo, B., Habigt, J., Diepold, K., & Tran-Gia, P. (2014). Best practices for QoE crowdtesting: QoE assessment with crowdsourcing. *IEEE Transactions on Multimedia*, 16(2), 541-558.

[4] Replicate, Inc. (2023). Replicate HTTP API reference. https://replicate.com/docs/reference/http

[5] Salesforce. (2025). 7 key ways AI can help catch fraud in banking. https://www.salesforce.com/au/financial-services/ai-for-fraud-detection/

[6] Sacco, P., Burruss, G. W., Smith, D., & Macaulay, J. (2025). Assessing the risk of problem gambling among lottery players. *Addictive Behaviors*, 143, 107813.

[7] Daniel, F., Kucherbaev, P., Cappiello, C., Benatallah, B., & Allahbakhsh, M. (2018). Quality control in crowdsourcing: A survey of quality attributes, assessment techniques, and assurance actions. *ACM Computing Surveys*, 51(1), 1-40.

[8] Zandoná, A., & Rabah, N. (2022). Towards a universal digital identity: A blockchain-based approach. *Frontiers in Blockchain*, 5, 1688287.

[9] Dock Labs. (2023). Blockchain identity management: Beginner's guide 2025. https://www.dock.io/post/blockchain-identity-management

[10] Sacco, P., et al. (2022). Pilot evaluation of the impact of lottery-based incentives on health behaviors. *Digital Health*, 8, 1-12.

[11] Hanousek, J., Jr., et al. (2025). Keeping users addicted: Does gamification affect lottery-seeking behavior? *EFMA Annual Meeting Proceedings*.

[12] Chainlink Labs. (2026). Chainlink VRF: Verifiable random function for smart contracts. https://docs.chain.link/vrf

[13] Ethereum Improvement Proposals. (2017). EIP-712: Typed structured data hashing and signing. https://eips.ethereum.org/EIPS/eip-712

[14] Gitcoin. (2022). Commit reveal scheme on Ethereum. https://gitcoin.co/blog/commit-reveal-scheme-on-ethereum

[15] Li, H., Zhao, B., & Fuxman, A. (2014). Adversarial attacks on crowdsourcing quality control. *Journal of Artificial Intelligence Research*, 50, 1-38.

[16] Daniel, F., et al. (2018). Quality control in crowdsourcing: A survey of quality attributes, assessment techniques, and assurance actions. *ACM Computing Surveys*, 51(1), 1-40.
