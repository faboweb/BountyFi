// Real API Client (for when backend is ready)
import { API_CONFIG } from '../config/api';
import axios, { AxiosInstance } from 'axios';
import { authStorage } from '../auth/storage';
import { notifyUnauthorized } from '../auth/onUnauthorized';
import { supabase } from '../utils/supabase';
import {
  AuthResponse,
  Campaign,
  CampaignLootboxPullResult,
  Submission,
  User,
  UserSearchResult,
  LeaderboardEntry,
  Lottery,
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

  // Add auth token to requests
  client.interceptors.request.use(async (config) => {
    const token = await authStorage.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Handle 401 errors (token expired / invalid)
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        await authStorage.clear();
        notifyUnauthorized(); // Auth context sets user null so login screen shows
      }
      return Promise.reject(error);
    }
  );

  return client;
};

const apiClient = createApiClient();

// Auth API – Coinbase only (no email)
export const authApi = {
  async loginWithCoinbase(request: CoinbaseLoginRequest): Promise<AuthResponse> {
    // Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke('verify_coinbase_token', {
      body: { access_token: request.coinbase_access_token }
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
      .select('*')
      .in('status', ['active', 'upcoming', 'ended'])
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Campaign[];
  },

  async getById(id: string): Promise<Campaign> {
    const { data, error } = await supabase
      .from('campaigns')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Campaign;
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
    };

    const { data, error } = await supabase.functions.invoke('manage_campaign', { body });

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
    const { data: result, error } = await supabase.functions.invoke('relay_submission', { body });

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
      body: { validator_address: savedUser?.wallet_address }
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
        reason: 'Manually validated via app'
      }
    });
    if (error) throw error;
  },
};

// Users API
export const usersApi = {
  async getMe(): Promise<User> {
    const savedUser = await authStorage.getUser();
    if (!savedUser?.wallet_address) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', savedUser.wallet_address)
      .single();

    if (error) throw error;
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

  async open(signature: string, message: string): Promise<{ success: boolean; message: string }> {
    const { data, error } = await supabase.functions.invoke('relay_lootbox', {
      body: { signature, message }
    });
    if (error) throw error;
    return data;
  },

  /** Campaign lootbox: open lootbox (one pull) → response is "check if won". Campaign must be ended; higher-value prizes = lower chance; may win nothing. */
  async openCampaignLootbox(campaignId: string, opts?: { signature?: string; message?: string }): Promise<CampaignLootboxPullResult> {
    const body: { campaign_id: string; signature?: string; message?: string } = { campaign_id: campaignId };
    if (opts?.signature != null && opts?.message != null) {
      body.signature = opts.signature;
      body.message = opts.message;
    }
    const { data, error } = await supabase.functions.invoke('campaign_lootbox_pull', { body });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    return data as CampaignLootboxPullResult;
  },
};

// Referrals API
export const referralsApi = {
  async apply(request: ReferralApplyRequest): Promise<{ success: boolean; message: string }> {
    const response = await apiClient.post('/referrals/apply', request);
    return response.data;
  },

  async getMyCode(): Promise<ReferralCode> {
    const response = await apiClient.get<ReferralCode>('/referrals/my-code');
    return response.data;
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
    submissions: submissionsApi,
    validations: validationsApi,
    users: usersApi,
    leaderboard: leaderboardApi,
    lottery: lotteryApi,
    referrals: referralsApi,
    shareCard: shareCardApi,
    faceVerification: faceVerificationApi,
  };
