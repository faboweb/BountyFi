// Auth Context
import React, { createContext, useContext, useState, useEffect, ReactNode, useRef } from 'react';
import { authStorage } from './storage';
import { setOnUnauthorized } from './onUnauthorized';
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

function mapDbUserToAppUser(profile: User & { wallet_address?: string }): User {
  return {
    ...profile,
    id: profile.wallet_address ?? profile.id,
    tickets: profile.tickets ?? 0,
    referral_code: profile.referral_code ?? '',
    validations_completed: profile.validations_completed ?? 0,
    accuracy_rate: profile.accuracy_rate ?? 0,
    diamonds: profile.diamonds ?? 0,
    audit_fail_count: profile.audit_fail_count ?? 0,
    trusted_network_ids: profile.trusted_network_ids ?? [],
  };
}

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

  // The hook returns { isSignedIn: boolean } on web, but we want a simple boolean.
  const isSignedInCDP = typeof rawIsSignedInCDP === 'boolean' 
    ? rawIsSignedInCDP 
    : !!(rawIsSignedInCDP as any)?.isSignedIn;

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

  // When API returns 401, client clears storage and notifies here so we clear user and show login
  useEffect(() => {
    setOnUnauthorized(() => setUser(null));
    return () => setOnUnauthorized(null);
  }, []);

  // Persist CDP session to storage when CDP is signed in (OAuth or rehydration after refresh)
  // so login survives refresh and hot reload until user explicitly logs out
  useEffect(() => {
    if (!isSignedInCDP || !evmAddress || user) return;

    const walletAddress = evmAddress;
    let cancelled = false;
    (async () => {
      try {
        const cdpToken = await getAccessToken();
        if (!cdpToken || cancelled) return;

        const savedEmail = await authStorage.getCDPEmail();
        const email = savedEmail || '';

        await authStorage.saveToken(cdpToken);
        await authStorage.saveCDPAccessToken(cdpToken);
        if (email) await authStorage.saveCDPEmail(email);
        await authStorage.saveUser({
          id: walletAddress,
          wallet_address: walletAddress,
          email,
        });

        if (cancelled) return;
        setUser({
          id: walletAddress,
          email,
          wallet_address: walletAddress,
          tickets: 0,
          referral_code: '',
          validations_completed: 0,
          accuracy_rate: 0,
          diamonds: 0,
          audit_fail_count: 0,
          trusted_network_ids: [],
        });
        console.log('[AuthContext] Persisted CDP session to storage:', walletAddress);

        if (cancelled) return;
        try {
          const profile = await api.users.getMe();
          if (!cancelled && profile) setUser(mapDbUserToAppUser(profile));
        } catch (e) {
          if (!cancelled) console.warn('[AuthContext] Hydrate profile (getMe) failed:', e);
        }
      } catch (e) {
        if (!cancelled) console.warn('[AuthContext] Sync CDP to storage failed:', e);
      }
    })();
    return () => { cancelled = true; };
  }, [isSignedInCDP, evmAddress, user]);

  // After refresh: we restored user from storage but token may be expired. When CDP rehydrates,
  // refresh the token from CDP so API calls don't get 401 and trigger logout. Then show app.
  useEffect(() => {
    if (!user || !isSignedInCDP || !evmAddress) return;

    let cancelled = false;
    (async () => {
      try {
        const cdpToken = await getAccessToken();
        if (!cdpToken || cancelled) return;

        await authStorage.saveToken(cdpToken);
        await authStorage.saveCDPAccessToken(cdpToken);
        if (!cancelled) {
          setIsLoading(false);
          console.log('[AuthContext] Refreshed token after CDP rehydration, session ready');
        }
      } catch (e) {
        if (!cancelled) {
          console.warn('[AuthContext] Token refresh after rehydration failed:', e);
          setIsLoading(false); // Still show app so user isn't stuck
        }
      }
    })();
    return () => { cancelled = true; };
  }, [user, isSignedInCDP, evmAddress]);

  const checkAuth = async () => {
    let restoredFromStorage = false;
    try {
      const token = await authStorage.getToken();
      const savedUser = await authStorage.getUser();

      if (token && savedUser) {
        // Restore user from local storage – keep session until user logs out
        console.log('[AuthContext] Restoring session from storage:', savedUser.wallet_address);
        restoredFromStorage = true;

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
        try {
          const profile = await api.users.getMe();
          if (profile) setUser(mapDbUserToAppUser(profile));
        } catch (_) {
          // getMe() ensures user exists; if it still fails, keep stub user
        }
        // Don't set isLoading false here – wait for token refresh (CDP rehydration) so we don't hit 401 with expired token
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
      // Do not clear storage on error – keep persisted session so refresh/reload doesn't lock user out
      console.error('Auth check failed:', error);
      restoredFromStorage = false;
      try {
        const token = await authStorage.getToken();
        const savedUser = await authStorage.getUser();
        if (token && savedUser) {
          restoredFromStorage = true;
          setUser({
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
          });
        }
      } catch (fallbackError) {
        console.warn('Fallback restore failed:', fallbackError);
      }
      if (API_CONFIG.USE_MOCK_API) {
        restoredFromStorage = false;
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
    } finally {
      // When we restored from storage we wait for token refresh (see effect below) before showing app
      if (!restoredFromStorage) {
        setIsLoading(false);
      }
    }
  };

  // Fallback: if we restored user but CDP never rehydrates, stop loading after 2.5s so user isn't stuck
  useEffect(() => {
    if (!user || !isLoading) return;
    const t = setTimeout(() => {
      setIsLoading(false);
      console.log('[AuthContext] Restored session ready (fallback timeout)');
    }, 2500);
    return () => clearTimeout(t);
  }, [user]);

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
      try {
        const profile = await api.users.getMe();
        if (profile) setUser(mapDbUserToAppUser(profile));
      } catch (_) {
        // getMe() ensures user exists; keep stub user if API fails
      }
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
