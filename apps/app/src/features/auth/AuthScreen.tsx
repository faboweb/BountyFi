// Auth/Onboarding Screen – Coinbase CDP Embedded Wallets
// https://docs.cdp.coinbase.com/embedded-wallets/welcome
import React, { useState, useEffect } from 'react';
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
import {
  useIsInitialized,
  useIsSignedIn,
  useSignInWithEmail,
  useVerifyEmailOTP,
  useSignInWithOAuth,
  useGetAccessToken,
  useEvmAddress,
} from '@coinbase/cdp-hooks';
import { useAuth } from '../../auth/context';
import { CDP_CONFIG } from '../../config/cdp';

// CDP auth UI – only rendered when CDP projectId is set
function CdpAuthContent() {
  const [referralCode, setReferralCode] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [flowId, setFlowId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { loginWithCoinbase, isAuthenticated } = useAuth();

  const { isInitialized } = useIsInitialized();
  const { isSignedIn } = useIsSignedIn();
  const { signInWithEmail } = useSignInWithEmail();
  const { verifyEmailOTP } = useVerifyEmailOTP();
  const { signInWithOAuth } = useSignInWithOAuth();
  const { getAccessToken } = useGetAccessToken();
  const { evmAddress } = useEvmAddress();

  // Sync CDP session to BountyFi when user is signed in with CDP (and not already BountyFi-authenticated)
  useEffect(() => {
    if (!isInitialized || !isSignedIn || isAuthenticated || syncing || !getAccessToken || !evmAddress) return;
    let cancelled = false;
    (async () => {
      setSyncing(true);
      try {
        const accessToken = await getAccessToken();
        if (cancelled) return;
        const authResponse = await loginWithCoinbase(
          referralCode.trim() || undefined,
          { coinbase_access_token: accessToken, wallet_address: evmAddress }
        );
        if (cancelled) return;
        Alert.alert(
          'Signed in with Coinbase',
          `Connected wallet:\n\n${authResponse.wallet_address}`,
          [{ text: 'OK' }]
        );
      } catch (e) {
        if (!cancelled) {
          Alert.alert('Login Failed', (e as Error).message || 'Could not sync wallet.');
        }
      } finally {
        if (!cancelled) setSyncing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isInitialized, isSignedIn, isAuthenticated, evmAddress, getAccessToken, referralCode, loginWithCoinbase]);

  const handleSendOtp = async () => {
    if (!email.trim()) return;
    setIsLoading(true);
    try {
      const result = await signInWithEmail({ email: email.trim() });
      setFlowId(result.flowId);
    } catch (error: unknown) {
      Alert.alert('Send failed', (error as Error).message || 'Could not send OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!flowId || !otp.trim()) return;
    setIsLoading(true);
    try {
      await verifyEmailOTP({ flowId, otp: otp.trim() });
      setFlowId(null);
      setOtp('');
    } catch (error: unknown) {
      Alert.alert('Verification failed', (error as Error).message || 'Invalid or expired code.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = (provider: 'google' | 'apple' | 'x') => {
    try {
      void signInWithOAuth(provider);
    } catch (error: unknown) {
      Alert.alert('Sign in failed', (error as Error).message || 'OAuth error.');
    }
  };

  if (!isInitialized) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0052FF" />
        <Text style={styles.loadingText}>Loading…</Text>
      </View>
    );
  }

  if (syncing) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0052FF" />
        <Text style={styles.loadingText}>Connecting wallet…</Text>
      </View>
    );
  }

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

            {flowId ? (
              <>
                <Text style={styles.label}>Enter 6-digit code from email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="000000"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={isLoading || otp.length !== 6}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Verify code</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.linkButton} onPress={() => setFlowId(null)}>
                  <Text style={styles.skipLinkText}>Use a different email</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.label}>Sign in with Coinbase (email or social)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Email"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                />
                <TouchableOpacity
                  style={[styles.button, isLoading && styles.buttonDisabled]}
                  onPress={handleSendOtp}
                  disabled={isLoading || !email.trim()}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Send code to email</Text>
                  )}
                </TouchableOpacity>
                {CDP_CONFIG.authMethods?.includes('oauth:google') && (
                  <TouchableOpacity
                    style={[styles.button, styles.buttonSecondary]}
                    onPress={() => handleOAuth('google')}
                    disabled={isLoading}
                  >
                    <Text style={styles.buttonTextSecondary}>Sign in with Google</Text>
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// Stub auth when CDP project ID is not set
function StubAuthContent() {
  const [referralCode, setReferralCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { loginWithCoinbase } = useAuth();

  const handleCoinbaseLogin = async () => {
    setIsLoading(true);
    try {
      const authResponse = await loginWithCoinbase(referralCode.trim() || undefined);
      Alert.alert(
        'Signed in with Coinbase',
        `Connected wallet:\n\n${authResponse.wallet_address}`,
        [{ text: 'OK' }]
      );
    } catch (error: unknown) {
      Alert.alert('Login Failed', (error as Error).message || 'Something went wrong.');
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
            <Text style={styles.label}>Have a referral code?</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter referral code (optional)"
              value={referralCode}
              onChangeText={setReferralCode}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleCoinbaseLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign in with Coinbase (stub)</Text>
              )}
            </TouchableOpacity>
            <Text style={styles.hint}>
              Set EXPO_PUBLIC_CDP_PROJECT_ID for real Coinbase Embedded Wallet sign-in.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

export function AuthScreen() {
  const hasCdp = !!CDP_CONFIG.projectId;
  return hasCdp ? <CdpAuthContent /> : <StubAuthContent />;
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
    backgroundColor: '#0052FF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#0052FF',
    marginTop: 12,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonTextSecondary: {
    color: '#0052FF',
    fontSize: 16,
    fontWeight: '600',
  },
  linkButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  skipLinkText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
  },
  hint: {
    marginTop: 16,
    fontSize: 12,
    color: '#8E8E93',
    textAlign: 'center',
  },
});
