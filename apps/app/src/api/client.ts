// Real API Client (for when backend is ready)
import { API_CONFIG } from '../config/api';
import axios, { AxiosInstance } from 'axios';
import * as SecureStore from 'expo-secure-store';
import {
  AuthResponse,
  Campaign,
  Submission,
  User,
  LeaderboardEntry,
  Lottery,
  LoginRequest,
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
    // Create FormData for multipart upload
    const formData = new FormData();
    formData.append('campaign_id', request.campaign_id);
    formData.append('checkpoint_id', request.checkpoint_id);
    if (request.gesture_photo) {
      formData.append('gesture_photo', {
        uri: request.gesture_photo,
        type: 'image/jpeg',
        name: 'gesture.jpg',
      } as any);
    }
    formData.append('before_photo', {
      uri: request.before_photo,
      type: 'image/jpeg',
      name: 'before.jpg',
    } as any);
    formData.append('after_photo', {
      uri: request.after_photo,
      type: 'image/jpeg',
      name: 'after.jpg',
    } as any);
    formData.append('gps_lat', request.gps_lat.toString());
    formData.append('gps_lng', request.gps_lng.toString());
    formData.append('before_timestamp', request.before_timestamp);
    formData.append('after_timestamp', request.after_timestamp);

    const response = await apiClient.post<Submission>('/submissions', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  async getPending(): Promise<Submission[]> {
    const response = await apiClient.get<Submission[]>('/submissions/pending');
    return response.data;
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
    await apiClient.post('/validations', request);
  },
};

// Users API
export const usersApi = {
  async getMe(): Promise<User> {
    const response = await apiClient.get<User>('/users/me');
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
