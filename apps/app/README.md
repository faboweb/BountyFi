# BountyFi Mobile MVP

A React Native mobile app built with Expo for the BountyFi platform - earn tickets, validate submissions, and win prizes!

## 🚀 Quick Start

```bash
# Install dependencies (already done)
npm install

# Start the development server
npm start

# Run on iOS
npm run ios

# Run on Android
npm run android
```

## ✅ What's Built

### Core Features (All Complete)

1. **Authentication & Onboarding (Coinbase CDP Embedded Wallets)**
   - [Coinbase Embedded Wallets](https://docs.cdp.coinbase.com/embedded-wallets/welcome): sign in with **email OTP** or **Google OAuth**
   - Optional referral code input
   - Connected wallet address shown after sign-in
   - Secure token storage
   - **Setup**: Set `EXPO_PUBLIC_CDP_PROJECT_ID` (get from [CDP Portal](https://portal.cdp.coinbase.com)). For OAuth, add `bountyfi://oauth-callback` to [CDP Domains](https://portal.cdp.coinbase.com/products/embedded-wallets/domains). Without a project ID, the app uses a stub sign-in for development.

2. **Campaigns**
   - List all active campaigns
   - View campaign details with checkpoints and gestures
   - Start task flow

3. **Submit Proof Flow** (4-step wizard)
   - Step 1: Gesture photo (front camera)
   - Step 2: Before photo (back camera) with GPS extraction
   - Step 3: After photo (back camera) with GPS + time validation
   - Step 4: Review & submit
   - Client-side validation:
     - GPS within checkpoint radius
     - Before/after photos within 50m
     - Time difference 1-15 minutes

4. **Validation Queue**
   - View pending submissions one at a time
   - See gesture requirement, photos, GPS, vote counts
   - Vote approve/reject
   - Real-time vote updates via mock WebSocket
   - Auto-load next submission after vote

5. **My Submissions**
   - List all user submissions
   - Status badges (pending/approved/rejected)
   - Vote counts for pending submissions

6. **Profile & Settings**
   - View user info (email, wallet, tickets)
   - Referral code display and sharing
   - Validator stats (if available)
   - Logout

7. **Leaderboard**
   - Top participants by tickets
   - Highlights current user
   - Medal icons for top 3

8. **Lottery**
   - View lottery status (pending/completed)
   - Countdown timer
   - Prize tiers
   - Winners list (after draw)
   - Win celebration (if user won)

## 🏗️ Architecture

### Tech Stack
- **Framework**: Expo React Native (TypeScript)
- **Navigation**: React Navigation (Stack + Bottom Tabs)
- **State Management**: TanStack Query (React Query)
- **Storage**: Expo Secure Store
- **Camera**: Expo Camera
- **Location**: Expo Location
- **Maps**: React Native Maps
- **Sharing**: Expo Sharing

### Project Structure
```
src/
├── api/
│   ├── client.ts          # Real API client (ready for backend)
│   ├── mock.ts             # Mock API client (currently active)
│   └── types.ts            # TypeScript interfaces
├── auth/
│   ├── context.tsx         # Auth context provider
│   └── storage.ts          # Secure storage utilities
├── features/
│   ├── auth/               # Auth screen
│   ├── campaigns/           # Campaign list & detail
│   ├── submissions/        # Submit proof & my submissions
│   ├── validation/         # Validation queue
│   ├── profile/            # Profile & settings
│   ├── leaderboard/        # Leaderboard
│   └── lottery/            # Lottery
├── components/
│   ├── CameraCapture.tsx   # Camera component
│   └── PhotoPreview.tsx   # Photo preview component
├── utils/
│   ├── geo.ts             # GPS/distance calculations
│   └── image.ts           # Image compression utilities
├── mockData/              # Mock data for development
└── config/
    └── api.ts             # API configuration
```

## 🔧 Configuration

### Mock Mode (Default)

The app currently runs in **mock mode** by default. All API calls use mock responses.

To switch to real backend:
1. Set `EXPO_PUBLIC_USE_MOCK_API=false` in your environment
2. Set `EXPO_PUBLIC_API_BASE_URL` to your backend URL
3. Update WebSocket URL in `src/config/api.ts`

### Supabase API (Ready for Connection)

The Supabase credentials are configured in `src/config/api.ts`:
- URL: `https://cguqjaoeleifeaxktmwv.supabase.co`
- Publishable Key: `sb_publishable_MBkuc0i6qrOEZiechqODwg_X6pc2DSb`

When backend is ready, simply toggle `USE_MOCK_API=false` and the app will connect to Supabase.

## 📱 Screens

1. **Auth Screen** - Login with email + referral code
2. **Campaigns Tab** - Browse campaigns → Detail → Submit Proof
3. **Validate Tab** - Review and vote on submissions
4. **My Tasks Tab** - View your submissions
5. **Leaderboard Tab** - Rankings → Lottery
6. **Profile Tab** - User info, referrals, logout

## 🎯 Demo Flow

1. **Sign up** with email (optional referral code)
2. **Browse campaigns** and select one
3. **Start task** → Complete 4-step photo capture
4. **Submit proof** → Appears in validation queue
5. **Validate** submissions (vote approve/reject)
6. **See consensus** → Status updates to approved/rejected
7. **Check leaderboard** → See rankings
8. **View lottery** → See prizes and countdown

## 🚧 Remaining Tasks

- [ ] Share card generation (client-side with `react-native-view-shot`)
- [ ] Enhanced error handling and retry logic
- [ ] Offline mode support
- [ ] Push notifications (if backend supports)
- [ ] Map visualization for checkpoints

## 📝 Notes

- All API interactions are currently mocked
- GPS extraction uses device location (EXIF fallback can be added)
- Image compression is implemented (1920px max, 0.7 quality)
- WebSocket updates are simulated with delays
- TypeScript strict mode enabled
- All screens are fully functional with mock data

## 🔐 Security

- Auth tokens stored in Expo Secure Store
- Token automatically attached to API requests
- 401 errors trigger logout
- GPS permissions requested when needed

## 📦 Dependencies

All dependencies are installed and configured. Key packages:
- `@react-navigation/*` - Navigation
- `@tanstack/react-query` - Data fetching
- `expo-camera` - Camera access
- `expo-location` - GPS
- `expo-secure-store` - Secure storage
- `react-native-view-shot` - Share card generation (ready to use)

---

**Status**: Core MVP complete ✅ | Ready for backend integration 🚀
