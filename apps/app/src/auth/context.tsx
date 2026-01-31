// Auth Context
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authStorage } from './storage';
import { api } from '../api/client';
import { API_CONFIG } from '../config/api';
import { AuthResponse, User } from '../api/types';
import { 
  useSignInWithEmail, 
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
  loginWithCoinbase: (email: string) => Promise<AuthResponse>;
  loginWithOAuth: (provider: 'google' | 'apple') => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  signMessage: (message: string) => Promise<string>;
}


const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // CDP Hooks
  const { signInWithEmail } = useSignInWithEmail();
  const { signInWithOAuth } = useSignInWithOAuth();
  const { getAccessToken } = useGetAccessToken();
  const { evmAddress } = useEvmAddress();
  const { signOut: signOutCDP } = useCDPSignOut();
  const isSignedInCDP = useIsSignedIn();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await authStorage.getToken();
      if (token) {
        const userData = await api.users.getMe();
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

  const loginWithCoinbase = async (email: string, referralCode?: string): Promise<AuthResponse> => {
    try {
      setIsLoading(true);
      console.log('[AuthContext] loginWithCoinbase - step 1: signInWithEmail', email);
      
      // 1. CDP Sign in (this handles OTP UI in CDP overlay)
      await signInWithEmail({ email });
      
      // 2. Poll/Wait until signed in and we have an address
      let retries = 0;
      while (!isSignedInCDP && retries < 60) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        retries++;
      }

      if (!isSignedInCDP) throw new Error('CDP Sign-in timed out or failed.');

      const cdpToken = await getAccessToken();
      const walletAddress = evmAddress;

      if (!cdpToken || !walletAddress) {
        throw new Error('CDP authorized but token or address missing.');
      }

      // 3. Login to our backend
      const authResponse = await api.auth.loginWithCoinbase({
        coinbase_access_token: cdpToken,
        wallet_address: walletAddress,
      });

      // 4. Save and set user
      await authStorage.saveToken(authResponse.token);
      await authStorage.saveUser({
        id: authResponse.user_id,
        wallet_address: authResponse.wallet_address,
        email: authResponse.email ?? email,
      });

      const userData = await api.users.getMe();
      setUser(userData);
      return authResponse;
    } catch (error) {
      console.error('[AuthContext] loginWithCoinbase failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithOAuth = async (provider: 'google' | 'apple'): Promise<void> => {
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

  const signMessage = async (message: string): Promise<string> => {
    // Note: Sign message is currently only supported for local keys which are deprecated.
    // For CDP wallets, signing happens within the CDP hooks.
    throw new Error('Message signing not supported for CDP wallets via AuthContext.');
  };

  const refreshUser = async () => {
    try {
      const userData = await api.users.getMe();
      setUser(userData);
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
        loginWithCoinbase,
        loginWithOAuth,
        logout,
        refreshUser,
        signMessage,
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
