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

// In-memory storage for mock data (simulates backend state)
let mockSubmissions: Submission[] = [...MOCK_SUBMISSIONS];
let mockValidations: { [submissionId: string]: any[] } = {};

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


// Campaigns API
export const mockCampaigns = {
  async getAll(): Promise<Campaign[]> {
    await delay(API_CONFIG.MOCK_DELAY);
    return [...MOCK_CAMPAIGNS];
  },

  async getById(id: string): Promise<Campaign> {
    await delay(API_CONFIG.MOCK_DELAY);
    const campaign = MOCK_CAMPAIGNS.find(c => c.id === id);
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    return campaign;
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
    // Return submissions that need validation (not yet validated by current user)
    return mockSubmissions.filter(s => s.status === 'pending');
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

// Lottery API
export const mockLottery = {
  async getByCampaign(campaignId: string): Promise<Lottery> {
    await delay(API_CONFIG.MOCK_DELAY);
    // Return pending lottery for active campaigns, completed for others
    if (campaignId === 'campaign_1') {
      return { ...MOCK_LOTTERY };
    }
    return {
      campaign_id: campaignId,
      status: 'pending',
      draw_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      prize_tiers: [
        { name: 'Grand Prize', amount: 500, count: 1 },
        { name: 'Major Prize', amount: 100, count: 5 },
        { name: 'Minor Prize', amount: 20, count: 20 },
      ],
    };
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
  submissions: mockSubmissionsApi,
  validations: mockValidationsApi,
  users: mockUsers,
  leaderboard: mockLeaderboard,
  lottery: mockLottery,
  referrals: mockReferrals,
  shareCard: mockShareCard,
  faceVerification: mockFaceVerification,
};
