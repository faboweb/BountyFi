// Auth/Onboarding Screen – Demo Mode (Local Keys)
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Constants from 'expo-constants';
import { useAuth } from '../../auth/context';

export function AuthScreen() {
  const [email, setEmail] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { loginWithLocalKey, loginWithCoinbase, loginWithOAuth } = useAuth();

  const isExpoGo = Constants.appOwnership === 'expo';

  const handleStart = async () => {
    setIsLoading(true);
    try {
      const authResponse = await loginWithLocalKey(referralCode.trim() || undefined);
      console.log('[AuthScreen] handleStart (Local Wallet) success:', authResponse);
    } catch (error: unknown) {
      console.error('[AuthScreen] handleStart (Local Wallet) failed:', error);
      Alert.alert('Start failed', (error as Error).message || 'Could not initialize session.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCoinbaseLogin = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      await loginWithCoinbase(email.trim(), referralCode.trim() || undefined);
    } catch (error: unknown) {
      console.error('[AuthScreen] handleCoinbaseLogin failed:', error);
      Alert.alert('Login failed', (error as Error).message || 'Could not sign in with Coinbase.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    setIsLoading(true);
    try {
      await loginWithOAuth(provider, referralCode.trim() || undefined);
    } catch (error: unknown) {
      console.error(`[AuthScreen] handleOAuthLogin (${provider}) failed:`, error);
      Alert.alert('Login failed', (error as Error).message || `Could not sign in with ${provider}.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.title}>BountyFi</Text>
          <Text style={styles.subtitle}>Earn tickets, win prizes, make a difference</Text>

          <View style={styles.form}>
            <Text style={styles.label}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="name@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
            />

            <TouchableOpacity
              style={[styles.button, styles.coinbaseButton, isLoading && styles.buttonDisabled]}
              onPress={handleCoinbaseLogin}
              disabled={isLoading}
            >
              <Text style={styles.buttonText}>Sign in with Email</Text>
            </TouchableOpacity>

            {!isExpoGo && (
              <>
                <TouchableOpacity
                  style={[styles.button, styles.oauthButton, isLoading && styles.buttonDisabled]}
                  onPress={() => handleOAuthLogin('google')}
                  disabled={isLoading}
                >
                  <Text style={styles.oauthButtonText}>Continue with Google</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.oauthButton, isLoading && styles.buttonDisabled]}
                  onPress={() => handleOAuthLogin('apple')}
                  disabled={isLoading}
                >
                  <Text style={styles.oauthButtonText}>Continue with Apple</Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.line} />
            </View>

            <Text style={styles.label}>Referral code (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter referral code"
              value={referralCode}
              onChangeText={setReferralCode}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!isLoading}
            />

            <TouchableOpacity
              style={[styles.button, styles.ghostButton, isLoading && styles.buttonDisabled]}
              onPress={handleStart}
              disabled={isLoading}
            >
              <Text style={styles.ghostButtonText}>Start with Guest Wallet</Text>
            </TouchableOpacity>
            
            <Text style={styles.hint}>
              {isExpoGo 
                ? "Safe Mode: Social login hidden for Expo Go. Use email or guest wallet."
                : "Securely sign in using Coinbase CDP Embedded Wallets."}
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 40,
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  button: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    height: 56,
  },
  coinbaseButton: {
    backgroundColor: '#0052FF',
    marginBottom: 8,
  },
  oauthButton: {
    backgroundColor: '#F2F2F7',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  oauthButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
  ghostButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#0052FF',
  },
  ghostButtonText: {
    color: '#0052FF',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#8E8E93',
    fontSize: 12,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  hint: {
    marginTop: 24,
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 18,
  },
});
