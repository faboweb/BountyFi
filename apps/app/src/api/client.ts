// Real API Client (for when backend is ready)
import { API_CONFIG } from '../config/api';
import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../utils/supabase';
import {
  AuthResponse,
  Campaign,
  Submission,
  User,
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
} from './types';

// Create axios instance
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_CONFIG.API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Add auth token to requests
  client.interceptors.request.use(async (config) => {
    const token = await SecureStore.getItemAsync('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  });

  // Handle 401 errors (token expired)
  client.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (error.response?.status === 401) {
        // Clear token and redirect to login
        await SecureStore.deleteItemAsync('auth_token');
        // Navigation will be handled by auth context
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
    const response = await apiClient.post<AuthResponse>('/auth/coinbase', request);
    return response.data;
  },

  async loginWithWallet(request: LoginWithWalletRequest): Promise<AuthResponse> {
    const response = await apiClient.post<AuthResponse>('/auth/wallet', request);
    return response.data;
  },
};


// Campaigns API
export const campaignsApi = {
  async getAll(): Promise<Campaign[]> {
    const response = await apiClient.get<Campaign[]>('/campaigns');
    return response.data;
  },

  async getById(id: string): Promise<Campaign> {
    const response = await apiClient.get<Campaign>(`/campaigns/${id}`);
    return response.data;
  },
};

// Submissions API
export const submissionsApi = {
  async submit(request: SubmitSubmissionRequest): Promise<Submission> {
    // Relayer Submission via Supabase Edge Function
    const { data: result, error } = await supabase.functions.invoke('relay_submission', {
      body: {
        campaign_id: request.campaign_id,
        photo_urls: [request.before_photo, request.after_photo],
        gps_lat: request.gps_lat,
        gps_lng: request.gps_lng,
        signature: request.signature,
        public_address: request.public_address,
      },
    });

    if (error) throw error;

    return {
      id: result.submission_id,
      ...request,
    } as unknown as Submission;
  },

  async getPending(): Promise<Submission[]> {
    const { data: pending, error } = await supabase.functions.invoke('get_tasks', {
      body: { validator_id: (await supabase.auth.getUser()).data.user?.id }
    });
    if (error) {
      console.warn('get_tasks function failed, falling back to REST', error);
      // Fallback or empty
      return [];
    }
    return pending || [];
  },

  async getMy(): Promise<Submission[]> {
    const response = await apiClient.get<Submission[]>('/submissions/my');
    return response.data;
  },

  async getById(id: string): Promise<Submission> {
    const response = await apiClient.get<Submission>(`/submissions/${id}`);
    return response.data;
  },
};

// Validations API
export const validationsApi = {
  async submit(request: ValidationRequest): Promise<void> {
    const session = await supabase.auth.getSession();
    const { error } = await supabase.functions.invoke('process_vote', {
      body: {
        submission_id: request.submission_id,
        validator_id: session.data.session?.user.id,
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
    const response = await apiClient.get<User>('/users/me');
    return response.data;
  },

  async addDiamonds(amount: number): Promise<void> {
    await apiClient.post('/users/jury/diamonds', { amount });
  },

  async recordAuditPenalty(): Promise<{ diamonds_lost: number; trusted_network_lost_ticket: boolean }> {
    const response = await apiClient.post<{ diamonds_lost: number; trusted_network_lost_ticket: boolean }>('/users/jury/audit-penalty');
    return response.data;
  },
};

// Leaderboard API
export const leaderboardApi = {
  async get(): Promise<LeaderboardEntry[]> {
    const response = await apiClient.get<LeaderboardEntry[]>('/leaderboard');
    return response.data;
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
