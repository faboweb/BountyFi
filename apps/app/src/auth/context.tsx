// Auth Context
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authStorage } from './storage';
import { api } from '../api/client';
import { API_CONFIG } from '../config/api';
import { AuthResponse, User } from '../api/types';
import { Wallet } from 'ethers';
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
  loginWithCoinbase: (email: string, referralCode?: string) => Promise<AuthResponse>;
  loginWithOAuth: (provider: 'google' | 'apple', referralCode?: string) => Promise<void>;
  loginWithLocalKey: (referralCode?: string) => Promise<AuthResponse>;
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
        referral_code: referralCode,
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

  const loginWithLocalKey = async (referralCode?: string): Promise<AuthResponse> => {
    try {
      setIsLoading(true);
      
      // 1. Get or create local private key
      let privateKey = await authStorage.getPrivateKey();
      if (!privateKey) {
        console.log('[AuthContext] No local key found, generating new wallet...');
        const wallet = Wallet.createRandom();
        privateKey = wallet.privateKey;
        await authStorage.savePrivateKey(privateKey);
      }
      
      const wallet = new Wallet(privateKey);
      const walletAddress = wallet.address;
      console.log('[AuthContext] Using wallet:', walletAddress);

      // 2. Login with wallet address (and signature in real app)
      const authResponse = await api.auth.loginWithWallet({
        wallet_address: walletAddress,
        referral_code: referralCode,
      });

      console.log('[AuthContext] loginWithWallet API response:', authResponse);

      // 3. Save to storage
      await authStorage.saveToken(authResponse.token);
      await authStorage.saveUser({
        id: authResponse.user_id,
        wallet_address: authResponse.wallet_address,
        email: authResponse.email ?? '',
      });

      // 4. Fetch user profile
      const userData = await api.users.getMe();
      setUser(userData);
      
      return authResponse;
    } catch (error) {
      console.error('[AuthContext] Login failed:', error);
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
    try {
      const privateKey = await authStorage.getPrivateKey();
      if (!privateKey) throw new Error('No private key found');
      const wallet = new Wallet(privateKey);
      return await wallet.signMessage(message);
    } catch (error) {
      console.error('Sign message failed:', error);
      throw error;
    }
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
        loginWithLocalKey,
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
