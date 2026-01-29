// Mock Data for Development
import { Campaign, Submission, User, LeaderboardEntry, Lottery, Gesture, Checkpoint } from '../api/types';

export const MOCK_USER: User = {
  id: 'user_1',
  email: 'alex@example.com',
  wallet_address: '0x1234567890abcdef1234567890abcdef12345678',
  tickets: 47,
  referral_code: 'ALEX2025',
  validations_completed: 23,
  accuracy_rate: 0.96,
};

export const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: 'campaign_uniserv',
    title: 'Uniserv CMU Chiang Mai',
    description: 'Cleanup and impact at Uniserv CMU Chiang Mai. Before/after photos only.',
    prize_total: 800,
    min_funding_thb: 50,
    requires_face_recognition: false,
    start_date: '2025-01-01',
    end_date: '2025-12-31',
    status: 'active',
    checkpoints: [
      {
        id: 'checkpoint_uniserv',
        lat: 18.7937682,
        lng: 98.9665553,
        radius: 500,
        name: 'Uniserv CMU Chiang Mai',
      },
    ],
    gestures: [],
  },
  {
    id: 'campaign_1',
    title: 'Beach Cleanup Challenge',
    description: 'Clean up beaches and earn tickets for the grand prize!',
    prize_total: 1000,
    min_funding_thb: 100,
    requires_face_recognition: true,
    start_date: '2025-01-15',
    end_date: '2025-02-15',
    status: 'active',
    checkpoints: [
      {
        id: 'checkpoint_1',
        lat: 7.8136,
        lng: 98.3006,
        radius: 50,
        name: 'Patong Beach',
      },
      {
        id: 'checkpoint_2',
        lat: 7.8800,
        lng: 98.3000,
        radius: 50,
        name: 'Kata Beach',
      },
    ],
    gestures: [
      {
        id: 'gesture_1',
        date: '2025-01-28',
        gesture_type: 'thumbs_up',
        description: 'Show a thumbs up in your gesture photo',
      },
      {
        id: 'gesture_2',
        date: '2025-01-29',
        gesture_type: 'peace_sign',
        description: 'Show a peace sign in your gesture photo',
      },
    ],
  },
  {
    id: 'campaign_2',
    title: 'City Park Restoration',
    description: 'Help restore city parks and win amazing prizes!',
    prize_total: 500,
    min_funding_thb: 50,
    requires_face_recognition: false,
    start_date: '2025-01-20',
    end_date: '2025-02-20',
    status: 'active',
    checkpoints: [
      {
        id: 'checkpoint_3',
        lat: 13.7563,
        lng: 100.5018,
        radius: 50,
        name: 'Lumpini Park',
      },
    ],
    gestures: [
      {
        id: 'gesture_3',
        date: '2025-01-28',
        gesture_type: 'thumbs_up',
        description: 'Show a thumbs up in your gesture photo',
      },
    ],
  },
];

export const MOCK_SUBMISSIONS: Submission[] = [
  {
    id: 'submission_1',
    user_id: 'user_2',
    campaign_id: 'campaign_1',
    checkpoint_id: 'checkpoint_1',
    gesture_photo_url: 'https://via.placeholder.com/400x300?text=Gesture+Photo',
    before_photo_url: 'https://via.placeholder.com/400x300?text=Before+Photo',
    after_photo_url: 'https://via.placeholder.com/400x300?text=After+Photo',
    gps_lat: 7.8136,
    gps_lng: 98.3006,
    before_timestamp: '2025-01-28T10:00:00Z',
    after_timestamp: '2025-01-28T10:05:00Z',
    status: 'pending',
    votes: [
      {
        id: 'validation_1',
        submission_id: 'submission_1',
        validator_id: 'user_3',
        vote: 'approve',
        created_at: '2025-01-28T10:10:00Z',
      },
    ],
    created_at: '2025-01-28T10:05:00Z',
  },
  {
    id: 'submission_2',
    user_id: 'user_4',
    campaign_id: 'campaign_1',
    checkpoint_id: 'checkpoint_1',
    gesture_photo_url: 'https://via.placeholder.com/400x300?text=Gesture+Photo',
    before_photo_url: 'https://via.placeholder.com/400x300?text=Before+Photo',
    after_photo_url: 'https://via.placeholder.com/400x300?text=After+Photo',
    gps_lat: 7.8136,
    gps_lng: 98.3006,
    before_timestamp: '2025-01-28T09:00:00Z',
    after_timestamp: '2025-01-28T09:08:00Z',
    status: 'approved',
    votes: [
      {
        id: 'validation_2',
        submission_id: 'submission_2',
        validator_id: 'user_3',
        vote: 'approve',
        is_correct: true,
        created_at: '2025-01-28T09:10:00Z',
      },
      {
        id: 'validation_3',
        submission_id: 'submission_2',
        validator_id: 'user_5',
        vote: 'approve',
        is_correct: true,
        created_at: '2025-01-28T09:11:00Z',
      },
      {
        id: 'validation_4',
        submission_id: 'submission_2',
        validator_id: 'user_6',
        vote: 'approve',
        is_correct: true,
        created_at: '2025-01-28T09:12:00Z',
      },
    ],
    created_at: '2025-01-28T09:08:00Z',
  },
  {
    id: 'submission_3',
    user_id: MOCK_USER.id,
    campaign_id: 'campaign_1',
    checkpoint_id: 'checkpoint_1',
    gesture_photo_url: 'https://via.placeholder.com/400x300?text=Gesture+Photo',
    before_photo_url: 'https://via.placeholder.com/400x300?text=Before+Photo',
    after_photo_url: 'https://via.placeholder.com/400x300?text=After+Photo',
    gps_lat: 7.8136,
    gps_lng: 98.3006,
    before_timestamp: '2025-01-27T14:00:00Z',
    after_timestamp: '2025-01-27T14:07:00Z',
    status: 'approved',
    votes: [
      {
        id: 'validation_5',
        submission_id: 'submission_3',
        validator_id: 'user_3',
        vote: 'approve',
        is_correct: true,
        created_at: '2025-01-27T14:10:00Z',
      },
      {
        id: 'validation_6',
        submission_id: 'submission_3',
        validator_id: 'user_5',
        vote: 'approve',
        is_correct: true,
        created_at: '2025-01-27T14:11:00Z',
      },
      {
        id: 'validation_7',
        submission_id: 'submission_3',
        validator_id: 'user_6',
        vote: 'approve',
        is_correct: true,
        created_at: '2025-01-27T14:12:00Z',
      },
    ],
    created_at: '2025-01-27T14:07:00Z',
  },
];

export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { user_id: 'user_7', email: 'champion@example.com', wallet_address: '0x1111...', tickets: 156, rank: 1 },
  { user_id: 'user_8', email: 'runner@example.com', wallet_address: '0x2222...', tickets: 134, rank: 2 },
  { user_id: 'user_9', email: 'third@example.com', wallet_address: '0x3333...', tickets: 98, rank: 3 },
  { user_id: 'user_10', email: 'fourth@example.com', wallet_address: '0x4444...', tickets: 87, rank: 4 },
  { user_id: 'user_11', email: 'fifth@example.com', wallet_address: '0x5555...', tickets: 76, rank: 5 },
  { user_id: MOCK_USER.id, email: MOCK_USER.email, wallet_address: MOCK_USER.wallet_address, tickets: MOCK_USER.tickets, rank: 7 },
  ...Array.from({ length: 15 }, (_, i) => ({
    user_id: `user_${i + 12}`,
    email: `user${i + 12}@example.com`,
    wallet_address: `0x${(i + 12).toString(16).padStart(8, '0')}...`,
    tickets: 50 - i * 2,
    rank: i + 8,
  })),
];

export const MOCK_LOTTERY: Lottery = {
  campaign_id: 'campaign_1',
  status: 'pending',
  draw_date: '2025-02-15T18:00:00Z',
  prize_tiers: [
    { name: 'Grand Prize', amount: 500, count: 1 },
    { name: 'Major Prize', amount: 100, count: 5 },
    { name: 'Minor Prize', amount: 20, count: 20 },
  ],
};

export const MOCK_LOTTERY_COMPLETED: Lottery = {
  campaign_id: 'campaign_1',
  status: 'completed',
  draw_date: '2025-01-25T18:00:00Z',
  winners: [
    { user_id: 'user_7', email: 'champion@example.com', wallet_address: '0x1111...', prize_amount: 500, tier: 'Grand Prize' },
    { user_id: 'user_8', email: 'runner@example.com', wallet_address: '0x2222...', prize_amount: 100, tier: 'Major Prize' },
    { user_id: 'user_9', email: 'third@example.com', wallet_address: '0x3333...', prize_amount: 100, tier: 'Major Prize' },
  ],
  prize_tiers: [
    { name: 'Grand Prize', amount: 500, count: 1 },
    { name: 'Major Prize', amount: 100, count: 5 },
    { name: 'Minor Prize', amount: 20, count: 20 },
  ],
};
