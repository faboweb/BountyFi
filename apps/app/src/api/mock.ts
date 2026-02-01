// Mock API Client - Simulates backend responses
import { API_CONFIG } from '../config/api';
import {
  AuthResponse,
  Campaign,
  Submission,
  User,
  UserSearchResult,
  LeaderboardEntry,
  Lottery,
  LoginRequest,
  CoinbaseLoginRequest,
  SubmitSubmissionRequest,
  ValidationRequest,
  LoginWithWalletRequest,
  ReferralApplyRequest,
  ReferralCode,
  ShareCardResponse,
  FaceVerificationEnrollRequest,
  FaceVerificationStatusResponse,
  CreateCampaignRequest,
  CreateDonationRequest,
  TeamRequest,
  LootboxOpenResult,
  CampaignLootboxPullResult,
  AvailableLootboxEntry,
} from './types';
import {
  MOCK_USER,
  MOCK_CAMPAIGNS,
  MOCK_SUBMISSIONS,
  MOCK_LEADERBOARD,
  MOCK_LOTTERY,
} from '../mockData';

// Simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Mock verification demo: 1) plastic bag (decline) 2) proper cleanup (approve) 3) audit same-image (user approves -> -1 diamond)
const PLASTIC_BAG_IMG = 'https://images.unsplash.com/photo-1621451537084-482c73073a0f?w=800';
const CLEANUP_BEFORE_IMG = 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800';
const CLEANUP_AFTER_IMG = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800';
export const MOCK_AUDIT_SAME_IMG = 'https://images.unsplash.com/photo-1592890278983-18616401d4ed?w=800';

export const MOCK_VERIFICATION_DEMO: (Submission & { is_single_photo?: boolean })[] = [
  {
    id: 'mock_demo_plastic',
    user_id: 'user_2',
    campaign_id: 'campaign_ban_plastic',
    checkpoint_id: 'checkpoint_chiang_mai',
    before_photo_url: PLASTIC_BAG_IMG,
    after_photo_url: PLASTIC_BAG_IMG,
    gps_lat: 18.7883,
    gps_lng: 98.9853,
    before_timestamp: '2025-01-28T10:00:00Z',
    after_timestamp: '2025-01-28T10:05:00Z',
    status: 'pending',
    votes: [],
    created_at: '2025-01-28T10:00:00Z',
    is_single_photo: true, // Simple photo type: show one image, not before/after
  },
  {
    id: 'mock_demo_cleanup',
    user_id: 'user_3',
    campaign_id: 'campaign_uniserv',
    checkpoint_id: 'checkpoint_uniserv',
    before_photo_url: CLEANUP_BEFORE_IMG,
    after_photo_url: CLEANUP_AFTER_IMG,
    gps_lat: 18.7937682,
    gps_lng: 98.9665553,
    before_timestamp: '2025-01-28T11:00:00Z',
    after_timestamp: '2025-01-28T11:06:00Z',
    status: 'pending',
    votes: [],
    created_at: '2025-01-28T11:00:00Z',
  },
];

// In-memory storage for mock data (simulates backend state)
// Prepend demo submissions for mock verification flow (plastic -> cleanup -> audit)
let mockSubmissions: Submission[] = [...MOCK_VERIFICATION_DEMO, ...MOCK_SUBMISSIONS];
let mockValidations: { [submissionId: string]: any[] } = {};
let mockDonationsStore: any[] = [];
// Seed pending incoming invite for stub user (test-user-id) in mock mode
const MOCK_PENDING_SENDER = {
  id: 'user_2',
  name: 'Jordan',
  email: 'jordan@example.com',
  wallet_address: '0xabcdef1234567890abcdef1234567890abcdef12' as `0x${string}`,
};
let mockTeamRequests: TeamRequest[] = [
  {
    id: 'tr_pending_mock',
    sender_id: MOCK_PENDING_SENDER.id,
    receiver_id: 'test-user-id',
    status: 'pending',
    created_at: new Date().toISOString(),
    sender: MOCK_PENDING_SENDER,
  },
];
let mockLootboxResults: { [requestId: string]: LootboxOpenResult } = {};
let mockCampaignsStore: Campaign[] = [];

// Mock WebSocket event emitter
class MockWebSocket {
  private listeners: { [event: string]: Function[] } = {};

  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  emit(event: string, data: any) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => callback(data));
    }
  }

  removeListener(event: string, callback: Function) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }
}

export const mockWebSocket = new MockWebSocket();

// Auth API – Coinbase CDP; mock uses wallet_address from request when provided
export const mockAuth = {
  async loginWithCoinbase(request: CoinbaseLoginRequest): Promise<AuthResponse> {
    await delay(API_CONFIG.MOCK_DELAY);
    const wallet_address = request.wallet_address ?? MOCK_USER.wallet_address;
    return {
      token: 'mock_jwt_token_' + Date.now(),
      wallet_address,
      email: MOCK_USER.email,
      user_id: MOCK_USER.id,
    };
  },

  async loginWithWallet(request: LoginWithWalletRequest): Promise<AuthResponse> {
    await delay(API_CONFIG.MOCK_DELAY);
    return {
      token: 'mock_wallet_token_' + Date.now(),
      wallet_address: request.wallet_address,
      email: 'demo@example.com',
      user_id: 'user_demo_' + Date.now(),
    };
  },
};


// Campaigns API (getAll/getById mock; create always calls real Edge Function so submit sends a request)
export const mockCampaigns = {
  async getAll(): Promise<Campaign[]> {
    await delay(API_CONFIG.MOCK_DELAY);
    return [...MOCK_CAMPAIGNS, ...mockCampaignsStore];
  },

  async getById(id: string): Promise<Campaign> {
    await delay(API_CONFIG.MOCK_DELAY);
    const campaign = [...MOCK_CAMPAIGNS, ...mockCampaignsStore].find(c => c.id === id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    return campaign;
  },

  async create(request: CreateCampaignRequest): Promise<Campaign> {
    await delay(API_CONFIG.MOCK_DELAY);
    const mockCampaign: Campaign = {
      id: 'campaign_mock_' + Date.now(),
      title: request.title,
      description: request.description ?? '',
      prize_total: request.prize_total ?? 0,
      min_funding_thb: request.min_funding_thb ?? 50,
      requires_face_recognition: request.requires_face_recognition ?? false,
      start_date: request.start_date ?? new Date().toISOString(),
      end_date: request.end_date ?? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      status: (request.status as Campaign['status']) ?? 'active',
      checkpoints: request.checkpoints ?? [],
      quest_type: request.quest_type,
      prize_chest: request.prize_chest,
      sponsors: request.sponsors,
      image_url: request.image_url,
      tx_hash: request.tx_hash,
      onchain_id: request.onchain_id ?? 0,
    };
    mockCampaignsStore.push(mockCampaign);
    return mockCampaign;
  },
};

// Submissions API
export const mockSubmissionsApi = {
  async submit(request: SubmitSubmissionRequest): Promise<Submission> {
    await delay(API_CONFIG.MOCK_DELAY + 200); // Longer delay for upload

    const newSubmission: Submission = {
      id: 'submission_' + Date.now(),
      user_id: MOCK_USER.id,
      campaign_id: request.campaign_id,
      checkpoint_id: request.checkpoint_id,
      ...(request.gesture_photo && { gesture_photo_url: request.gesture_photo }),
      before_photo_url: request.before_photo,
      after_photo_url: request.after_photo,
      gps_lat: request.gps_lat,
      gps_lng: request.gps_lng,
      before_timestamp: request.before_timestamp,
      after_timestamp: request.after_timestamp,
      status: 'pending',
      votes: [],
      created_at: new Date().toISOString(),
    };

    mockSubmissions.push(newSubmission);

    // Simulate WebSocket event after a delay
    setTimeout(() => {
      mockWebSocket.emit('submission.created', { submission: newSubmission });
    }, 1000);

    return newSubmission;
  },

  async getPending(): Promise<Submission[]> {
    await delay(API_CONFIG.MOCK_DELAY);
    // In mock mode: return demo submissions first (plastic, cleanup) then other pending
    const pending = mockSubmissions.filter(s => s.status === 'pending');
    if (!API_CONFIG.USE_MOCK_API) return pending;
    const demo = pending.filter(s => s.id === 'mock_demo_plastic' || s.id === 'mock_demo_cleanup');
    const rest = pending.filter(s => s.id !== 'mock_demo_plastic' && s.id !== 'mock_demo_cleanup');
    return [...demo, ...rest];
  },

  async getMy(): Promise<Submission[]> {
    await delay(API_CONFIG.MOCK_DELAY);
    return mockSubmissions.filter(s => s.user_id === MOCK_USER.id);
  },

  async getById(id: string): Promise<Submission> {
    await delay(API_CONFIG.MOCK_DELAY);
    const submission = mockSubmissions.find(s => s.id === id);
    if (!submission) {
      throw new Error('Submission not found');
    }
    return submission;
  },
};

// Validations API
export const mockValidationsApi = {
  async submit(request: ValidationRequest): Promise<void> {
    await delay(API_CONFIG.MOCK_DELAY);

    const submission = mockSubmissions.find(s => s.id === request.submission_id);
    if (!submission) {
      throw new Error('Submission not found');
    }

    // Add validation vote
    const validation = {
      id: 'validation_' + Date.now(),
      submission_id: request.submission_id,
      validator_id: MOCK_USER.id,
      vote: request.vote,
      created_at: new Date().toISOString(),
    };

    submission.votes.push(validation);

    // Simulate consensus logic
    const approveCount = submission.votes.filter(v => v.vote === 'approve').length;
    const rejectCount = submission.votes.filter(v => v.vote === 'reject').length;

    // Emit WebSocket event
    setTimeout(() => {
      mockWebSocket.emit('validation.count.updated', {
        submission_id: request.submission_id,
        approve_count: approveCount,
        reject_count: rejectCount,
        total_votes: submission.votes.length,
      });

      // If we have 3 votes, determine consensus
      if (submission.votes.length >= 3) {
        if (approveCount >= 2) {
          submission.status = 'approved';
          // Once your submission is verified, you get one ticket
          if (submission.user_id === MOCK_USER.id) {
            MOCK_USER.tickets = (MOCK_USER.tickets ?? 0) + 1;
          }
          mockWebSocket.emit('submission.updated', {
            submission_id: request.submission_id,
            status: 'approved',
          });
        } else if (rejectCount >= 2) {
          submission.status = 'rejected';
          mockWebSocket.emit('submission.updated', {
            submission_id: request.submission_id,
            status: 'rejected',
          });
        }
      }
    }, 500);
  },

  async submitBatch(requests: ValidationRequest[]): Promise<{ successCount: number; failCount: number; results: any[] }> {
    let successCount = 0;
    const results: any[] = [];
    for (const r of requests) {
      try {
        await this.submit(r);
        successCount++;
        results.push({ submission_id: r.submission_id, success: true });
      } catch (err: any) {
        results.push({ submission_id: r.submission_id, success: false, error: err.message });
      }
    }
    return { successCount, failCount: requests.length - successCount, results };
  },
};

// Discoverable users for search / "contacts on BountyFi" (mock)
const MOCK_DISCOVERABLE_USERS: UserSearchResult[] = [
  { id: 'user_2', username: 'jordan', email: 'jordan@example.com', name: 'Jordan' },
  { id: 'user_3', username: 'sam', email: 'sam@example.com', name: 'Sam' },
  { id: 'user_4', username: 'alex_l', email: 'alex.l@example.com', name: 'Alex L.' },
  { id: 'user_5', username: 'morgan', email: 'morgan@example.com', name: 'Morgan' },
  { id: 'user_6', username: 'casey', email: 'casey@example.com', name: 'Casey' },
];

// Users API – jury diamonds and audit penalties
export const mockUsers = {
  async getMe(): Promise<User> {
    await delay(API_CONFIG.MOCK_DELAY);
    return { ...MOCK_USER };
  },

  async searchByUsername(username: string): Promise<UserSearchResult | null> {
    await delay(API_CONFIG.MOCK_DELAY);
    const q = username.trim().toLowerCase();
    if (!q) return null;
    const found = MOCK_DISCOVERABLE_USERS.find(
      (u) =>
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.name?.toLowerCase().includes(q)
    );
    return found ?? null;
  },

  async listDiscoverableUsers(): Promise<UserSearchResult[]> {
    await delay(API_CONFIG.MOCK_DELAY);
    return [...MOCK_DISCOVERABLE_USERS];
  },

  async addTrustedMember(userId: string): Promise<void> {
    await delay(API_CONFIG.MOCK_DELAY);
    const ids = MOCK_USER.trusted_network_ids ?? [];
    if (ids.includes(userId)) return;
    MOCK_USER.trusted_network_ids = [...ids, userId];
  },

  async getTrustRequests(): Promise<TeamRequest[]> {
    await delay(API_CONFIG.MOCK_DELAY);
    return [...mockTeamRequests];
  },

  async syncTrustRequest(receiverId: string, txHash: string): Promise<void> {
    await delay(API_CONFIG.MOCK_DELAY);
    mockTeamRequests.push({
      id: 'tr_' + Date.now(),
      sender_id: MOCK_USER.id,
      receiver_id: receiverId,
      status: 'pending',
      tx_hash: txHash,
      created_at: new Date().toISOString(),
    });
  },

  async updateTrustRequestStatus(requestId: string, status: 'accepted' | 'declined', txHash?: string): Promise<void> {
    await delay(API_CONFIG.MOCK_DELAY);
    const req = mockTeamRequests.find(r => r.id === requestId);
    if (req) {
      req.status = status;
      if (txHash) req.tx_hash = txHash;
    }
  },

  async getEarnings24h(): Promise<number> {
    await delay(API_CONFIG.MOCK_DELAY);
    return 0;
  },

  /** +1 diamond per correct verification */
  async addDiamonds(amount: number): Promise<void> {
    await delay(API_CONFIG.MOCK_DELAY);
    MOCK_USER.diamonds = Math.max(0, (MOCK_USER.diamonds ?? 0) + amount);
  },

  /** Record failed audit (wrong vote on same-image pair). Returns penalty applied. */
  async recordAuditPenalty(): Promise<{ diamonds_lost: number; trusted_network_lost_ticket: boolean }> {
    await delay(API_CONFIG.MOCK_DELAY);
    const failCount = (MOCK_USER.audit_fail_count ?? 0) + 1;
    MOCK_USER.audit_fail_count = failCount;
    if (failCount === 1) {
      MOCK_USER.diamonds = Math.max(0, (MOCK_USER.diamonds ?? 0) - 1);
      return { diamonds_lost: 1, trusted_network_lost_ticket: false };
    }
    if (failCount === 2) {
      MOCK_USER.diamonds = Math.max(0, (MOCK_USER.diamonds ?? 0) - 5);
      return { diamonds_lost: 5, trusted_network_lost_ticket: false };
    }
    // 3rd time: trusted network loses 1 ticket (user's share)
    MOCK_USER.tickets = Math.max(0, MOCK_USER.tickets - 1);
    MOCK_USER.audit_fail_count = 0; // reset tier after 3rd
    return { diamonds_lost: 0, trusted_network_lost_ticket: true };
  },
};

// Leaderboard API
export const mockLeaderboard = {
  async get(): Promise<LeaderboardEntry[]> {
    await delay(API_CONFIG.MOCK_DELAY);
    return [...MOCK_LEADERBOARD];
  },
};

// Lottery API — tickets = lootboxes (1 ticket to open); diamonds = roll again in same category (10 💎)
const MOCK_PRIZES_WIN = [
  { label: 'Coffee', emoji: '☕', value: 50 },
  { label: '50 baht', emoji: '💵', value: 50 },
  { label: 'Bubble tea', emoji: '🧋', value: 80 },
  { label: 'Meal voucher', emoji: '🍽️', value: 200 },
];
const MOCK_PRIZE_NOTHING = { label: 'No prize this time', emoji: '🎁', value: 0 };

function pickPrize(forceWin?: boolean): CampaignLootboxPullResult {
  const won = forceWin !== undefined ? forceWin : Math.random() < 0.65;
  if (won) {
    const picked = MOCK_PRIZES_WIN[Math.floor(Math.random() * MOCK_PRIZES_WIN.length)];
    return { won: true, prize: { label: picked.label, emoji: picked.emoji, value: picked.value } };
  }
  return { won: false, prize: null };
}
export const mockLottery = {
  /** Returns lootboxes available to open, in series (backend order). Open one after another. */
  async getAvailableLootboxes(): Promise<AvailableLootboxEntry[]> {
    await delay(API_CONFIG.MOCK_DELAY);
    return [...MOCK_CAMPAIGNS, ...mockCampaignsStore].map((c) => ({
      campaignId: c.id,
      label: c.title,
    }));
  },

  /** Open lootbox — costs 1 ticket (tickets = lootboxes). First open = win in mock. */
  async openCampaignLootbox(_campaignId: string): Promise<CampaignLootboxPullResult> {
    await delay(API_CONFIG.MOCK_DELAY + 300);
    const tickets = MOCK_USER.tickets ?? 0;
    if (tickets < 1) throw new Error('Need 1 ticket to open lootbox');
    MOCK_USER.tickets = Math.max(0, tickets - 1);
    return pickPrize(true);
  },

  /** Roll again in same category — costs 10 diamonds. First roll again = fail in mock. */
  async rollAgainCampaignLootbox(_campaignId: string): Promise<CampaignLootboxPullResult> {
    await delay(API_CONFIG.MOCK_DELAY + 300);
    const diamonds = MOCK_USER.diamonds ?? 0;
    if (diamonds < 10) throw new Error('Need 10 diamonds to roll again');
    MOCK_USER.diamonds = Math.max(0, diamonds - 10);
    return pickPrize(false);
  },

  async openOnChain(): Promise<{ success: boolean; requestId: string }> {
    await delay(API_CONFIG.MOCK_DELAY + 200);
    const requestId = 'mock_req_' + Date.now();
    const result = pickPrize();
    const prize_label = result.prize ? `${result.prize.label} ${result.prize.emoji}` : `${MOCK_PRIZE_NOTHING.label} ${MOCK_PRIZE_NOTHING.emoji}`;
    mockLootboxResults[requestId] = {
      request_id: requestId,
      user_address: MOCK_USER.wallet_address,
      campaign_id: null,
      onchain_campaign_id: null,
      prize_tier: result.won ? 1 : 0,
      prize_label,
      fulfilled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    // Tickets = lootboxes: deduct 1 ticket, or 10 diamonds as fallback
    if (MOCK_USER.tickets >= 1) {
      MOCK_USER.tickets = Math.max(0, MOCK_USER.tickets - 1);
    } else if ((MOCK_USER.diamonds ?? 0) >= 10) {
      MOCK_USER.diamonds = Math.max(0, (MOCK_USER.diamonds ?? 0) - 10);
    } else {
      throw new Error('Need 1 ticket or 10 diamonds to open');
    }
    return { success: true, requestId };
  },

  async getResult(requestId: string): Promise<LootboxOpenResult | null> {
    await delay(API_CONFIG.MOCK_DELAY);
    return mockLootboxResults[requestId] ?? null;
  },

  async syncResult(requestId: string): Promise<void> {
    await delay(API_CONFIG.MOCK_DELAY);
    // Mock: result is already in memory
  },

  async getByCampaign(campaignId: string): Promise<Lottery> {
    await delay(API_CONFIG.MOCK_DELAY);
    return {
      ...MOCK_LOTTERY,
      campaign_id: campaignId,
      draw_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };
  },
};

// Donations API
export const mockDonations = {
  async getAll(): Promise<any[]> {
    await delay(API_CONFIG.MOCK_DELAY);
    return [...mockDonationsStore];
  },

  async create(request: CreateDonationRequest): Promise<any> {
    await delay(API_CONFIG.MOCK_DELAY + 100);
    const donation = {
      id: 'donation_mock_' + Date.now(),
      campaign_id: request.campaign_id,
      amount: request.amount,
      quantity: request.quantity ?? 1,
      company_name: request.company_name,
      type: request.type,
      details: request.details,
      message: request.message,
      currency: request.currency ?? 'USDC',
      image_url: request.image_url,
      created_at: new Date().toISOString(),
    };
    mockDonationsStore.push(donation);
    return donation;
  },
};

// Referrals API
export const mockReferrals = {
  async apply(request: ReferralApplyRequest): Promise<{ success: boolean; message: string }> {
    await delay(API_CONFIG.MOCK_DELAY);

    // Mock validation: code must be alphanumeric and 6-10 chars
    if (!/^[A-Z0-9]{6,10}$/.test(request.code)) {
      return { success: false, message: 'Invalid referral code format' };
    }

    // Mock: code already used
    if (request.code === 'USED123') {
      return { success: false, message: 'Referral code already used' };
    }

    return { success: true, message: 'Referral code applied! +1 ticket' };
  },

  async getMyCode(): Promise<ReferralCode> {
    await delay(API_CONFIG.MOCK_DELAY);
    return {
      code: MOCK_USER.referral_code,
      referrals_count: 5,
    };
  },
};

// Share Card API
export const mockShareCard = {
  async generate(submissionId: string): Promise<ShareCardResponse> {
    await delay(API_CONFIG.MOCK_DELAY + 300);

    // Return mock image URL (in real app, this would be generated client-side)
    return {
      image_url: `https://via.placeholder.com/800x600?text=Share+Card+${submissionId}`,
    };
  },
};

// Face Verification API
// In-memory storage for enrolled face verifications (simulates backend)
const enrolledFaceVerifications: { [key: string]: boolean } = {}; // campaign_id -> enrolled

export const mockFaceVerification = {
  async enroll(request: FaceVerificationEnrollRequest): Promise<{ success: boolean; message: string }> {
    await delay(API_CONFIG.MOCK_DELAY + 200);

    // Store enrollment status
    enrolledFaceVerifications[request.campaign_id] = true;

    return {
      success: true,
      message: 'Face verification enrolled successfully',
    };
  },

  async getStatus(campaignId: string): Promise<FaceVerificationStatusResponse> {
    await delay(API_CONFIG.MOCK_DELAY);

    return {
      is_enrolled: enrolledFaceVerifications[campaignId] || false,
      campaign_id: campaignId,
    };
  },
};

// Export all mock APIs
export const mockApi = {
  auth: mockAuth,
  campaigns: mockCampaigns,
  donations: mockDonations,
  submissions: mockSubmissionsApi,
  validations: mockValidationsApi,
  users: mockUsers,
  leaderboard: mockLeaderboard,
  lottery: mockLottery,
  referrals: mockReferrals,
  shareCard: mockShareCard,
  faceVerification: mockFaceVerification,
};
