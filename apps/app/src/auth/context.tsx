// Auth Context
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { authStorage } from './storage';
import { api } from '../api/client';
import { API_CONFIG } from '../config/api';
import { AuthResponse, User } from '../api/types';
import {
  useSignInWithEmail,
  useVerifyEmailOTP,
  useSignInWithOAuth,
  useCurrentUser as useCDPUser,
  useEvmAddress,
  useGetAccessToken,
  useIsSignedIn,
  useSignOut as useCDPSignOut
} from '@coinbase/cdp-hooks';


interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isCDPAuthenticated: boolean;
  initiateEmailLogin: (email: string) => Promise<string>;
  verifyOTPAndLogin: (email: string, otp: string, flowId: string, referralCode?: string) => Promise<AuthResponse>;
  loginWithOAuth: (provider: 'google' | 'apple', referralCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  hardReset: () => Promise<void>;
  refreshUser: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
  clearCDPSession: () => Promise<void>;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // CDP Hooks
  const { signInWithEmail } = useSignInWithEmail();
  const { verifyEmailOTP } = useVerifyEmailOTP();
  const { signInWithOAuth } = useSignInWithOAuth();
  const { getAccessToken } = useGetAccessToken();
  const { evmAddress } = useEvmAddress();
  const { signOut: signOutCDP } = useCDPSignOut();
  const rawIsSignedInCDP = useIsSignedIn();

  // Normalize to boolean because sometimes it returns an object in early renders
  const isSignedInCDP = !!rawIsSignedInCDP;

  // Use refs to track CDP state changes across async closures
  const isSignedInCDPRef = useRef(isSignedInCDP);
  const evmAddressRef = useRef(evmAddress);

  useEffect(() => {
    isSignedInCDPRef.current = isSignedInCDP;
  }, [isSignedInCDP]);

  useEffect(() => {
    evmAddressRef.current = evmAddress;
  }, [evmAddress]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await authStorage.getToken();
      const savedUser = await authStorage.getUser();

      if (token && savedUser) {
        // Restore user from local storage (client-only flow)
        console.log('[AuthContext] Restoring session from storage:', savedUser.wallet_address);

        const userData: User = {
          id: savedUser.id,
          email: savedUser.email,
          wallet_address: savedUser.wallet_address,
          tickets: 0,
          referral_code: '',
          validations_completed: 0,
          accuracy_rate: 0,
          diamonds: 0,
          audit_fail_count: 0,
          trusted_network_ids: [],
        };

        setUser(userData);
      } else if (API_CONFIG.USE_MOCK_API) {
        // Testing only: skip login, use stub user so we can test the app without signing in
        const stubUser: User = {
          id: 'test-user-id',
          email: 'test@bountyfi.app',
          wallet_address: '0x0000000000000000000000000000000000000000',
          tickets: 247,
          referral_code: 'TEST123',
          validations_completed: 47,
          accuracy_rate: 0.94,
          diamonds: 12,
          audit_fail_count: 0,
          trusted_network_ids: [],
        };
        setUser(stubUser);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await authStorage.clear();
      if (API_CONFIG.USE_MOCK_API) {
        // Still allow testing: set stub user so app is usable
        setUser({
          id: 'test-user-id',
          email: 'test@bountyfi.app',
          wallet_address: '0x0000000000000000000000000000000000000000',
          tickets: 247,
          referral_code: 'TEST123',
          validations_completed: 47,
          accuracy_rate: 0.94,
          diamonds: 12,
          audit_fail_count: 0,
          trusted_network_ids: [],
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const initiateEmailLogin = async (email: string): Promise<string> => {
    try {
      // Preemptive cleanup: If already signed in, try to sign out first
      if (isSignedInCDPRef.current) {
        console.log('[AuthContext] Already signed in with CDP. Cleaning up stale session...');
        try {
          await signOutCDP();
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (e) {
          console.warn('[AuthContext] Pre-login signOut failed (can be ignored):', e);
        }
      }

      console.log('[AuthContext] initiateEmailLogin - sending OTP to:', email);

      // Initiate email sign-in and get flowId
      const result = await signInWithEmail({ email });

      if (!result?.flowId) {
        throw new Error('Failed to initiate email sign-in: no flowId returned');
      }

      console.log('[AuthContext] OTP sent successfully, flowId:', result.flowId);
      return result.flowId;
    } catch (error) {
      console.error('[AuthContext] initiateEmailLogin failed:', error);

      // If error is about already being authenticated, try to sign out and retry once
      if (error instanceof Error && error.message.includes('already authenticated')) {
        console.log('[AuthContext] Attempting to clear session and retry...');
        try {
          await signOutCDP();
          await new Promise(resolve => setTimeout(resolve, 1000));

          // Retry the sign-in
          const result = await signInWithEmail({ email });
          if (!result?.flowId) {
            throw new Error('Failed to initiate email sign-in: no flowId returned');
          }
          console.log('[AuthContext] OTP sent successfully after retry, flowId:', result.flowId);
          return result.flowId;
        } catch (retryError) {
          console.error('[AuthContext] Retry failed:', retryError);
          throw new Error('Please refresh the page and try again.');
        }
      }

      throw error;
    }
  };

  const verifyOTPAndLogin = async (
    email: string,
    otp: string,
    flowId: string,
    referralCode?: string
  ): Promise<AuthResponse> => {
    try {
      console.log('[AuthContext] verifyOTPAndLogin - verifying OTP...');

      // Verify the OTP code
      await verifyEmailOTP({ otp, flowId });

      // Poll/Wait until signed in AND we have an address
      console.log('[AuthContext] OTP verified, waiting for session & address...');
      let retries = 0;
      while (retries < 60) {
        const hasSession = !!isSignedInCDPRef.current;
        const hasAddress = !!evmAddressRef.current;

        if (retries % 5 === 0) {
          console.log(`[AuthContext] Polling... hasSession: ${hasSession}, hasAddress: ${hasAddress}`);
        }

        if (hasSession && hasAddress) break;

        await new Promise(resolve => setTimeout(resolve, 1000));
        retries++;
      }

      const finalHasSession = !!isSignedInCDPRef.current;
      const finalHasAddress = !!evmAddressRef.current;

      if (!finalHasSession) {
        throw new Error('CDP Sign-in timed out or failed (isSignedIn=false).');
      }

      if (!finalHasAddress) {
        throw new Error('CDP Sign-in timed out or failed (address missing).');
      }

      console.log('[AuthContext] CDP Ready. Fetching access token...');
      const cdpToken = await getAccessToken();
      const walletAddress = evmAddressRef.current;

      console.log('[AuthContext] CDP Session:', { hasToken: !!cdpToken, walletAddress });

      if (!cdpToken || !walletAddress) {
        throw new Error('CDP authorized but token or address missing after ready state.');
      }

      // For client-only flow, just store CDP session locally
      console.log('[AuthContext] CDP authentication successful - storing session...');

      // Save CDP session
      await authStorage.saveToken(cdpToken);
      await authStorage.saveCDPAccessToken(cdpToken);
      await authStorage.saveCDPEmail(email);

      // Create user object from CDP data
      const userData: User = {
        id: walletAddress, // Use wallet address as user ID
        email: email,
        wallet_address: walletAddress,
        tickets: 0,
        referral_code: referralCode || '',
        validations_completed: 0,
        accuracy_rate: 0,
        diamonds: 0,
        audit_fail_count: 0,
        trusted_network_ids: [],
      };

      await authStorage.saveUser({
        id: walletAddress,
        wallet_address: walletAddress,
        email: email,
      });

      setUser(userData);
      console.log('[AuthContext] Login successful for wallet:', walletAddress);

      return {
        token: cdpToken,
        user_id: walletAddress,
        wallet_address: walletAddress,
        email: email,
      };
    } catch (error) {
      console.error('[AuthContext] verifyOTPAndLogin failed:', error);
      // On failure, try to clear everything to allow a clean retry
      await authStorage.clear();
      try {
        await signOutCDP();
      } catch (e) {
        /* ignore */
      }
      throw error;
    }
  };

  const loginWithOAuth = async (provider: 'google' | 'apple', referralCode?: string): Promise<void> => {
    try {
      setIsLoading(true);
      const cdpProvider = provider === 'google' ? 'google' : 'apple';
      await signInWithOAuth(cdpProvider);
    } catch (error) {
      console.error('[AuthContext] loginWithOAuth failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };



  const logout = async () => {
    await authStorage.clear();
    try {
      await signOutCDP();
    } catch (e) {
      console.warn('[AuthContext] CDP SignOut failed:', e);
    }
    setUser(null);
  };

  const clearCDPSession = async () => {
    console.log('[AuthContext] Clearing CDP session...');
    try {
      await signOutCDP();
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (e) {
      console.warn('[AuthContext] CDP sign out failed:', e);
    }
  };

  const hardReset = async () => {
    console.log('[AuthContext] Performing Hard Reset...');
    await authStorage.clear();

    // Explicitly wipe CDP related storage keys from localStorage/SecureStore
    if (typeof localStorage !== 'undefined') {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        const lowerKey = key.toLowerCase();
        if (lowerKey.includes('cdp') ||
            lowerKey.includes('coinbase') ||
            lowerKey.includes('embedded')) {
          localStorage.removeItem(key);
        }
      });
    }

    try {
      await signOutCDP();
    } catch (e) { /* ignore */ }

    setUser(null);
    if (typeof window !== 'undefined' && window.location) {
      window.location.reload(); // Hard reload on Web to ensure SDK re-initializes
    }
  };

  const signMessage = async (message: string): Promise<string> => {
    // Note: Sign message is currently only supported for local keys which are deprecated.
    // For CDP wallets, signing happens within the CDP hooks.
    throw new Error('Message signing not supported for CDP wallets via AuthContext.');
  };

  const refreshUser = async () => {
    try {
      // For client-only flow, restore from local storage
      const savedUser = await authStorage.getUser();
      if (savedUser) {
        const userData: User = {
          id: savedUser.id,
          email: savedUser.email,
          wallet_address: savedUser.wallet_address,
          tickets: 0,
          referral_code: '',
          validations_completed: 0,
          accuracy_rate: 0,
          diamonds: 0,
          audit_fail_count: 0,
          trusted_network_ids: [],
        };
        setUser(userData);
      }
    } catch (error) {
      console.error('Refresh user failed:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        isCDPAuthenticated: isSignedInCDP,
        initiateEmailLogin,
        verifyOTPAndLogin,
        loginWithOAuth,
        logout,
        hardReset,
        refreshUser,
        signMessage,
        clearCDPSession,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
