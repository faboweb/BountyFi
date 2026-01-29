// Auth Context
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authStorage } from './storage';
import { api } from '../api/client';
import { User } from '../api/types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  loginWithCoinbase: (referralCode?: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await authStorage.getToken();
      if (token) {
        // Fetch user data
        const userData = await api.users.getMe();
        setUser(userData);
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      await authStorage.clear();
    } finally {
      setIsLoading(false);
    }
  };

  const loginWithCoinbase = async (referralCode?: string) => {
    try {
      // TODO: Replace with real Coinbase OAuth (expo-auth-session / WebBrowser).
      // For now use a dev stub; backend would exchange Coinbase token for session.
      const coinbaseToken = await getCoinbaseAccessToken();
      const authResponse = await api.auth.loginWithCoinbase({
        coinbase_access_token: coinbaseToken,
      });

      await authStorage.saveToken(authResponse.token);
      await authStorage.saveUser({
        id: authResponse.user_id,
        wallet_address: authResponse.wallet_address,
        email: authResponse.email ?? '',
      });

      if (referralCode) {
        try {
          await api.referrals.apply({ code: referralCode });
        } catch (error) {
          console.error('Referral apply failed:', error);
        }
      }

      const userData = await api.users.getMe();
      setUser(userData);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  /** Gets Coinbase access token. Dev: stub; prod: Coinbase OAuth flow. */
  async function getCoinbaseAccessToken(): Promise<string> {
    // Stub for development. Replace with:
    // - expo-auth-session or WebBrowser to Coinbase OAuth URL
    // - Redirect back with code, exchange for access_token on backend or in app
    return 'dev_coinbase_stub_' + Date.now();
  }

  const logout = async () => {
    await authStorage.clear();
    setUser(null);
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
        logout,
        refreshUser,
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
