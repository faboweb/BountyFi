// API Types and Interfaces

export interface User {
  id: string;
  email: string;
  wallet_address: string;
  tickets: number;
  referral_code: string;
  referred_by?: string;
  validations_completed?: number;
  accuracy_rate?: number;
  /** Jury reward currency: +1 per correct verification */
  diamonds?: number;
  /** Count of failed random audits (same-image pairs); drives penalty tier */
  audit_fail_count?: number;
  /** Trusted network / family – win together, penalized as group on 3rd audit fail */
  trusted_network_ids?: string[];
}

/** Result of searching for a user by username (for adding to team) */
export interface UserSearchResult {
  id: string;
  username?: string;
  email?: string;
  name?: string;
}

/** Community quest type: uniserv_cleanup = one-day, before+after; no_burn = 3 months, one photo daily; ban_plastic = selfie + plastic replacement photo (Chiang Mai) */
export type QuestType = 'uniserv_cleanup' | 'no_burn' | 'ban_plastic';

export interface Campaign {
  id: string;
  title: string;
  description: string;
  prize_total: number;
  min_funding_thb: number; // Minimum funding required (≥ 50 THB)
  requires_face_recognition: boolean; // If true, users must enroll selfie before participating
  start_date: string;
  end_date: string;
  checkpoints: Checkpoint[];
  gestures: Gesture[];
  status: 'active' | 'upcoming' | 'ended';
  /** When set, enforces proof rules: uniserv_cleanup (before+after, min 1min, once); no_burn (one photo/day, 3mo) */
  quest_type?: QuestType;
  /** Prize chest: what you can win when redeeming tickets from this quest */
  prize_chest?: { label: string; emoji: string }[];
  /** Sponsors (companies, cafés, individuals) – shown under prizes to attract sponsors */
  sponsors?: { name: string; type?: 'company' | 'cafe' | 'individual'; maps_url?: string }[];
}

export interface Checkpoint {
  id: string;
  lat: number;
  lng: number;
  radius: number; // meters
  name?: string;
}

export interface Gesture {
  id: string;
  date: string; // YYYY-MM-DD
  gesture_type: string; // e.g., "thumbs_up", "peace_sign"
  description: string;
}

export interface Submission {
  id: string;
  user_id: string;
  campaign_id: string;
  checkpoint_id: string;
  gesture_photo_url?: string; // optional – before/after only
  before_photo_url: string;
  after_photo_url: string;
  gps_lat: number;
  gps_lng: number;
  before_timestamp: string;
  after_timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
  votes: Validation[];
  created_at: string;
  /** Random audit: same image shown as "before" and "after"; correct vote is reject */
  is_audit?: boolean;
}

export interface Validation {
  id: string;
  submission_id: string;
  validator_id: string;
  vote: 'approve' | 'reject';
  is_correct?: boolean; // Set after consensus
  created_at: string;
}

export interface LeaderboardEntry {
  user_id: string;
  email: string;
  wallet_address: string;
  tickets: number;
  rank: number;
}

export interface Lottery {
  campaign_id: string;
  status: 'pending' | 'completed';
  draw_date?: string;
  winners?: LotteryWinner[];
  prize_tiers: PrizeTier[];
}

export interface LotteryWinner {
  user_id: string;
  email: string;
  wallet_address: string;
  prize_amount: number;
  tier: string;
}

export interface PrizeTier {
  name: string;
  amount: number;
  count: number;
}

export interface AuthResponse {
  token: string;
  wallet_address: string;
  email: string;
  user_id: string;
}

export interface ReferralCode {
  code: string;
  referrals_count: number;
}

export interface ShareCardResponse {
  image_url: string;
}

// Request types
export interface LoginRequest {
  email: string;
}

/** Coinbase CDP login. Backend validates access_token; optional wallet_address for mock/dev. */
export interface CoinbaseLoginRequest {
  coinbase_access_token: string;
  /** Set by app from CDP Embedded Wallet; backend may use when validating token. */
  wallet_address?: string;
}

export interface LoginWithWalletRequest {
  wallet_address: string;
  signature?: string;
  message?: string;
  referral_code?: string;
}


export interface SubmitSubmissionRequest {
  campaign_id: string;
  checkpoint_id: string;
  gesture_photo?: string; // optional – before/after only
  before_photo: string;
  after_photo: string;
  gps_lat: number;
  gps_lng: number;
  before_timestamp: string;
  after_timestamp: string;
}

export interface ValidationRequest {
  submission_id: string;
  vote: 'approve' | 'reject';
}

export interface ReferralApplyRequest {
  code: string;
}

export interface FaceVerificationEnrollRequest {
  campaign_id: string;
  selfie_photo: string; // base64 or file URI
}

export interface FaceVerificationStatusResponse {
  is_enrolled: boolean;
  campaign_id: string;
}

// WebSocket event types
export interface WebSocketEvent {
  type: 'submission.updated' | 'validation.count.updated' | 'lottery.drawn';
  payload: any;
}
