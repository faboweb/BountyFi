// Coinbase CDP Embedded Wallets config
// https://docs.cdp.coinbase.com/embedded-wallets/welcome
// Override with EXPO_PUBLIC_CDP_PROJECT_ID if needed.
const projectId =
  process.env.EXPO_PUBLIC_CDP_PROJECT_ID || '31824e25-76f4-4b32-8e1b-04d8e2b5e7b2';

export const CDP_CONFIG = {
  projectId,
  appName: 'BountyFi',
  ethereum: {
    createOnLogin: 'eoa' as const, // EOA wallet on sign-in; use 'smart' for Smart Accounts
  },
  // Required for OAuth (Google, Apple, X) in React Native – deep link back to app
  nativeOAuthCallback: 'bountyfi://oauth-callback',
  // Optional: enable auth methods (default includes email)
  authMethods: ['email', 'oauth:google', 'oauth:apple'] as const,
};
