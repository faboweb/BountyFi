// Real API Client (for when backend is ready)
import { ethers } from 'ethers';
import { API_CONFIG } from '../config/api';
import axios, { AxiosInstance } from 'axios';
import { authStorage } from '../auth/storage';
import { notifyUnauthorized } from '../auth/onUnauthorized';
import { supabase } from '../utils/supabase';
import { getLootboxContract } from '../utils/contracts';
import {
  AuthResponse,
  Campaign,
  CampaignLootboxPullResult,
  Submission,
  User,
  UserSearchResult,
  LeaderboardEntry,
  Lottery,
  LootboxOpenResult,
  LoginRequest,
  LoginWithWalletRequest,
  CoinbaseLoginRequest,
  SubmitSubmissionRequest,
  ValidationRequest,
  ReferralApplyRequest,
  ReferralCode,
  ShareCardResponse,
  FaceVerificationEnrollRequest,
  FaceVerificationStatusResponse,
  CreateCampaignRequest,
  CreateDonationRequest,
  TeamRequest,
} from './types';

// Create axios instance
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_CONFIG.API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      'apikey': API_CONFIG.SUPABASE_PUBLISHABLE_KEY,
    },
  });

  // Safety check for Anon Key format
  if (API_CONFIG.SUPABASE_PUBLISHABLE_KEY && !API_CONFIG.SUPABASE_PUBLISHABLE_KEY.startsWith('eyJ')) {
    console.error('CRITICAL WARNING: Supabase Anon Key does not look like a valid JWT (should start with "eyJ"). Check your .env file.');
  }

  // Add auth token to requests
  client.interceptors.request.use(async (config) => {
    const token = await authStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Handle 401 errors (token expired / invalid).
  // Requests with skipAuthRedirect (e.g. referrals) must not clear session so Profile doesn't loop to root.
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        // Distinguish between invalid Anon Key and expired User Session
        const msg = error.response.data?.message;
        if (msg === 'Invalid API key' || msg === 'Invalid JWT') {
          console.error('[API] 401 Unauthorized - Likely invalid Supabase Anon Key:', msg);
        }

        if (!(error.config as any)?.skipAuthRedirect) {
          await authStorage.clear();
          notifyUnauthorized(); // Auth context sets user null so login screen shows
        }
      }
      return Promise.reject(error);
    }
  );

  return client;
};

const apiClient = createApiClient();

/** Headers for Edge Function calls so 401 is avoided when no Supabase Auth session exists */
function edgeFunctionHeaders(): Record<string, string> {
  const key = API_CONFIG.SUPABASE_PUBLISHABLE_KEY;
  if (!key) return {};
  return {
    Authorization: `Bearer ${key}`,
    apikey: key,
  };
}

// Auth API – Coinbase only (no email)
export const authApi = {
  async loginWithCoinbase(request: CoinbaseLoginRequest): Promise<AuthResponse> {
    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('verify_coinbase_token', {
      body: { access_token: request.coinbase_access_token },
      headers: edgeFunctionHeaders(),
    });

    if (error) throw new Error(error.message || 'Coinbase verification failed');

    // Return formatted response
    return {
      token: request.coinbase_access_token, // Use CDP token as session token
      user_id: data.session.user_id,
      wallet_address: request.wallet_address || data.session.wallet_address || '',
      email: data.session.profile?.email || '',
    };
  },

  async loginWithWallet(request: LoginWithWalletRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/wallet', request);
    return response.data;
  },
};


// Campaigns API
export const campaignsApi = {
  async getAll(): Promise<Campaign[]> {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*, donations(amount)')
      .in('status', ['active', 'upcoming', 'ended', 'pending_onchain'])
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Aggregate prize_total from donations
    return data.map((campaign: any) => {
      const donatedTotal = campaign.donations?.reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0) || 0;
      return {
        ...campaign,
        prize_total: (campaign.prize_total || 0) + donatedTotal,
      };
    }) as Campaign[];
  },

  async getById(id: string): Promise<Campaign> {
    // Try UUID first, then fall back to onchain_id
    const query = supabase
      .from('campaigns')
      .select('*, donations(amount), campaign_prizes(*)');

    let { data, error } = await query.eq('id', id).maybeSingle();

    if (error || !data) {
      const { data: byOnchain, error: err2 } = await query.eq('onchain_id', id).maybeSingle();
      data = byOnchain;
      error = err2;
    }

    if (error) throw error;
    if (!data) throw new Error('Campaign not found');

    const campaignData = data as any;
    const donatedTotal = campaignData.donations?.reduce((sum: number, d: any) => sum + (Number(d.amount) || 0), 0) || 0;

    // Map campaign_prizes to prize_chest if not already present
    const dbPrizes = campaignData.campaign_prizes?.map((p: any) => ({
      label: p.label,
      image: p.image,
      sponsor: p.sponsor,
      amount: p.amount,
      value: p.value,
      metadataHash: p.metadata_hash,
    })) || [];

    return {
      ...campaignData,
      prize_total: (campaignData.prize_total || 0) + donatedTotal,
      prize_chest: campaignData.prize_chest && campaignData.prize_chest.length > 0
        ? campaignData.prize_chest
        : dbPrizes,
    } as Campaign;
  },

  async create(request: CreateCampaignRequest): Promise<Campaign> {
    let userId: string | null = null;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    } catch (_) {
      // Proceed without user_id so the request is still sent
    }

    const body = {
      action: 'CREATE_CAMPAIGN' as const,
      user_id: userId,
      title: request.title,
      description: request.description,
      prize_total: request.prize_total,
      min_funding_thb: request.min_funding_thb,
      requires_face_recognition: request.requires_face_recognition,
      start_date: request.start_date,
      end_date: request.end_date,
      checkpoints: request.checkpoints,
      status: request.status || 'active',
      onchain_id: request.onchain_id,
      quest_type: request.quest_type,
      prize_chest: request.prize_chest,
      sponsors: request.sponsors,
      tx_hash: request.tx_hash,
      image_url: request.image_url,
    };

    const { data, error } = await supabase.functions.invoke('manage_campaign', {
      body,
      headers: edgeFunctionHeaders(),
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data as Campaign;
  },
};

// Submissions API
export const submissionsApi = {
  async submit(request: SubmitSubmissionRequest): Promise<Submission> {
    // Relayer Submission via Supabase Edge Function (EIP-712)
    const body: Record<string, unknown> = {
      campaign_id: request.campaign_id,
      photo_urls: [request.before_photo, request.after_photo],
      gps_lat: request.gps_lat,
      gps_lng: request.gps_lng,
      signature: request.signature,
      public_address: request.public_address,
    };
    if (request.eip712_message) {
      body.eip712_message = request.eip712_message;
    }
    const { data: result, error } = await supabase.functions.invoke('relay_submission', {
      body,
      headers: edgeFunctionHeaders(),
    });

    if (error) throw error;

    return {
      id: result.submission_id,
      ...request,
    } as unknown as Submission;
  },

  async getPending(): Promise<Submission[]> {
    const savedUser = await authStorage.getUser();
    if (!savedUser?.wallet_address) {
      console.log('[submissionsApi.getPending] No wallet address found, skipping task fetch');
      return [];
    }

    const { data: pending, error } = await supabase.functions.invoke('get_tasks', {
      body: { validator_address: savedUser?.wallet_address },
      headers: edgeFunctionHeaders(),
    });

    if (error) {
      console.warn('[submissionsApi.getPending] get_tasks function failed:', {
        message: error.message,
        details: error,
      });
      return [];
    }
    return pending || [];
  },

  async getMy(): Promise<Submission[]> {
    const savedUser = await authStorage.getUser();
    if (!savedUser?.wallet_address) return [];

    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('submitter_address', savedUser.wallet_address)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Submission[];
  },

  async getById(id: string): Promise<Submission> {
    const { data, error } = await supabase
      .from('submissions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Submission;
  },
};

// Validations API
export const validationsApi = {
  async submit(request: ValidationRequest): Promise<void> {
    const savedUser = await authStorage.getUser();
    const { error } = await supabase.functions.invoke('process_vote', {
      body: {
        submission_id: request.submission_id,
        validator_address: savedUser?.wallet_address,
        decision: request.vote === 'approve' ? 'APPROVED' : 'REJECTED',
        reason: 'Manually validated via app',
      },
      headers: edgeFunctionHeaders(),
    });
    if (error) throw error;
  },

  /** Submit multiple votes in a single batch transaction */
  async submitBatch(requests: ValidationRequest[]): Promise<{ successCount: number; failCount: number; results: any[] }> {
    const savedUser = await authStorage.getUser();
    if (!savedUser?.wallet_address) throw new Error('Not authenticated');

    const votes = requests.map((r) => ({
      submission_id: r.submission_id,
      decision: r.vote === 'approve' ? 'APPROVED' : 'REJECTED' as const,
    }));

    const { data, error } = await supabase.functions.invoke('process_votes_batch', {
      headers: edgeFunctionHeaders(),
      body: { votes, validator_address: savedUser.wallet_address },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return {
      successCount: data?.successCount ?? 0,
      failCount: data?.failCount ?? 0,
      results: data?.results ?? [],
    };
  },
};

// Users API
export const usersApi = {
  async ensureUser(wallet_address: string, email?: string): Promise<User> {
    const { data, error } = await supabase.functions.invoke('ensure_user', {
      body: { wallet_address, email: email ?? '' },
      headers: edgeFunctionHeaders(),
    });
    if (error) throw error;
    if (!data?.user) throw new Error(data?.error ?? 'Failed to ensure user');
    return data.user as User;
  },

  async getMe(): Promise<User> {
    const savedUser = await authStorage.getUser();
    if (!savedUser?.wallet_address) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', savedUser.wallet_address)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      await this.ensureUser(savedUser.wallet_address, savedUser.email);
      const { data: after, error: err2 } = await supabase
        .from('users')
        .select('*')
        .eq('wallet_address', savedUser.wallet_address)
        .maybeSingle();
      if (err2) throw err2;
      if (!after) throw new Error('User profile not found');
      return after as User;
    }
    return data as User;
  },

  async searchByUsername(username: string): Promise<UserSearchResult | null> {
    const response = await apiClient.get<UserSearchResult | null>(`/users/search?username=${encodeURIComponent(username)}`);
    return response.data;
  },

  async listDiscoverableUsers(): Promise<UserSearchResult[]> {
    const response = await apiClient.get<UserSearchResult[]>('/users/discoverable');
    return response.data;
  },

  async addTrustedMember(userId: string): Promise<void> {
    await apiClient.post('/users/me/trusted-network', { user_id: userId });
  },

  async addDiamonds(amount: number): Promise<void> {
    // This likely needs an Edge Function or DB update, but since it was a POST to /users/jury/diamonds
    // we'll keep it as an RPC or direct update if permitted by RLS
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { error } = await supabase.rpc('increment_diamonds', { amount });
    if (error) {
      // Fallback to direct update if RPC doesn't exist (depends on DB schema)
      console.warn('RPC increment_diamonds failed, trying direct update', error);
      await apiClient.post('/users/jury/diamonds', { amount });
    }
  },

  async getEarnings24h(): Promise<number> {
    const savedUser = await authStorage.getUser();
    if (!savedUser?.wallet_address) return 0;
    const { data, error } = await supabase.rpc('get_earnings_24h_by_wallet', { v_wallet: savedUser.wallet_address });
    if (error) {
      console.error('Failed to get 24h earnings:', error);
      return 0;
    }
    return data || 0;
  },

  async recordAuditPenalty(): Promise<{ diamonds_lost: number; trusted_network_lost_ticket: boolean }> {
    const response = await apiClient.post<{ diamonds_lost: number; trusted_network_lost_ticket: boolean }>('/users/jury/audit-penalty');
    return response.data;
  },

  // Trust Network Requests
  async getTrustRequests(): Promise<TeamRequest[]> {
    const savedUser = await authStorage.getUser();
    if (!savedUser?.id) return [];

    const { data, error } = await supabase
      .from('team_requests')
      .select('*, sender:sender_id(*), receiver:receiver_id(*)')
      .or(`sender_id.eq.${savedUser.id},receiver_id.eq.${savedUser.id}`)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as TeamRequest[];
  },

  async syncTrustRequest(receiverId: string, txHash: string): Promise<void> {
    const savedUser = await authStorage.getUser();
    if (!savedUser?.id) throw new Error('Not authenticated');

    const { error } = await supabase
      .from('team_requests')
      .upsert({
        sender_id: savedUser.id,
        receiver_id: receiverId,
        status: 'pending',
        tx_hash: txHash,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'sender_id,receiver_id' });

    if (error) throw error;
  },

  async updateTrustRequestStatus(requestId: string, status: 'accepted' | 'declined', txHash?: string): Promise<void> {
    const { error } = await supabase
      .from('team_requests')
      .update({ status, tx_hash: txHash, updated_at: new Date().toISOString() })
      .eq('id', requestId);

    if (error) throw error;
  },
};

// Trust Network ABI updates
export const TRUSTNETWORK_ABI = [
  "function sendTrustRequest(address _trustee) external",
  "function acceptTrustRequest(address _sender) external",
  "function declineTrustRequest(address _sender) external",
  "function pendingRequests(address sender, address receiver) view returns (bool)",
  "function isConnection(address _a, address _b) view returns (bool)",
  "function trustCircles(address) view returns (address[])",
  "function reverseTrustCircles(address) view returns (address[])",
  "function diamonds(address) view returns (uint256)"
];

// Donations API
export const donationsApi = {
  async getAll(): Promise<any[]> {
    const { data, error } = await supabase
      .from('donations')
      .select('*, campaigns(title)');
    if (error) throw error;
    return data || [];
  },

  async create(request: CreateDonationRequest): Promise<any> {
    let userId: string | null = null;
    let walletAddress: string | null = null;
    try {
      const savedUser = await authStorage.getUser();
      userId = savedUser?.id ?? null;
      walletAddress = savedUser?.wallet_address ?? null;
    } catch (_) {
      // Proceed without user info
    }

    const { data, error } = await supabase.functions.invoke('donate', {
      body: {
        ...request,
        donator_id: userId,
        donator_address: walletAddress
      },
      headers: edgeFunctionHeaders(),
    });

    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data;
  },
};

// Leaderboard API
export const leaderboardApi = {
  async get(): Promise<LeaderboardEntry[]> {
    const { data, error } = await supabase
      .from('leaderboard')
      .select('*')
      .order('rank', { ascending: true })
      .limit(100);

    if (error) throw error;
    return (data || []) as LeaderboardEntry[];
  },
};

// Lottery API
export const lotteryApi = {
  async getByCampaign(campaignId: string): Promise<Lottery> {
    const response = await apiClient.get<Lottery>(`/lottery/${campaignId}`);
    return response.data;
  },

  /** Legacy: relay path (deducts tickets/diamonds in DB, relayer calls contract). Prefer openOnChain when user has wallet. */
  async open(signature: string, message: string): Promise<{ success: boolean; message: string; requestId?: string }> {
    const { data, error } = await supabase.functions.invoke('relay_lootbox', {
      body: { signature, message },
      headers: edgeFunctionHeaders(),
    });
    if (error) throw error;
    return data;
  },

  /** On-chain: user calls Lootbox.openLootbox() from their wallet; pays 1 ticket or 10 diamonds on-chain. */
  async openOnChain(): Promise<{ success: boolean; requestId: string }> {
    const contract = await getLootboxContract();
    const tx = await contract.openLootbox();
    const receipt = await tx.wait();
    const topic = ethers.id('LootboxRequested(uint256,address,uint256)');
    const log = receipt?.logs?.find((l: { topics: string[] }) => l.topics[0] === topic);
    if (!log) throw new Error('LootboxRequested event not found');
    const parsed = contract.interface.parseLog({ topics: log.topics as string[], data: log.data });
    const requestId = String(parsed?.args[0] ?? '');
    return { success: true, requestId };
  },

  /** Campaign lootbox: open lootbox (one pull) → response is "check if won". Campaign must be ended; higher-value prizes = lower chance; may win nothing. */
  async openCampaignLootbox(campaignId: string, opts?: { signature?: string; message?: string }): Promise<CampaignLootboxPullResult> {
    const body: { campaign_id: string; signature?: string; message?: string } = { campaign_id: campaignId };
    if (opts?.signature != null && opts?.message != null) {
      body.signature = opts.signature;
      body.message = opts.message;
    }
    const { data, error } = await supabase.functions.invoke('campaign_lootbox_pull', {
      body,
      headers: edgeFunctionHeaders(),
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data as CampaignLootboxPullResult;
  },

  /** Fetch indexed lootbox result by request_id (from lootbox_opens table). */
  async getResult(requestId: string): Promise<LootboxOpenResult | null> {
    const { data, error } = await supabase
      .from('lootbox_opens')
      .select('*')
      .eq('request_id', requestId)
      .maybeSingle();
    if (error) throw error;
    return data as LootboxOpenResult | null;
  },

  /** Trigger indexer to sync lootbox result from chain (reads Lootbox.requests(requestId), resolves prize_label, upserts lootbox_opens). */
  async syncResult(requestId: string): Promise<void> {
    const { error } = await supabase.functions.invoke('indexer', {
      body: { event: 'sync_lootbox_result', requestId },
      headers: edgeFunctionHeaders(),
    });
    if (error) throw error;
  },
};

// Referrals API
export const referralsApi = {
  async apply(request: ReferralApplyRequest): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/referrals/apply', request);
    return response.data;
  },

  async getMyCode(): Promise<ReferralCode> {
    const { data, error } = await supabase.rpc('get_my_referral_code');
    if (error) {
      console.warn('get_my_referral_code RPC failed', error);
      // Fallback/Non-blocking
      return { code: '', referrals_count: 0 };
    }
    return data as ReferralCode;
  },
};

// Share Card API
export const shareCardApi = {
  async generate(submissionId: string): Promise<ShareCardResponse> {
    const response = await apiClient.post<ShareCardResponse>('/share-card/generate', {
      submission_id: submissionId,
    });
    return response.data;
  },
};

// Face Verification API
export const faceVerificationApi = {
  async enroll(request: FaceVerificationEnrollRequest): Promise<{ success: boolean; message: string }> {
    const formData = new FormData();
    formData.append('campaign_id', request.campaign_id);
    formData.append('selfie_photo', {
      uri: request.selfie_photo,
      type: 'image/jpeg',
      name: 'selfie.jpg',
    } as any);

    const response = await apiClient.post('/face-verification/enroll', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getStatus(campaignId: string): Promise<FaceVerificationStatusResponse> {
    const response = await apiClient.get<FaceVerificationStatusResponse>(`/face-verification/status/${campaignId}`);
    return response.data;
  },
};

// Export unified API (switches between mock and real)
export const api = API_CONFIG.USE_MOCK_API
  ? require('./mock').mockApi
  : {
    auth: authApi,
    campaigns: campaignsApi,
    donations: donationsApi,
    submissions: submissionsApi,
    validations: validationsApi,
    users: usersApi,
    leaderboard: leaderboardApi,
    lottery: lotteryApi,
    referrals: referralsApi,
    shareCard: shareCardApi,
    faceVerification: faceVerificationApi,
  };
