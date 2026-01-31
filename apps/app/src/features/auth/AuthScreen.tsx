// Auth/Onboarding Screen – Demo Mode (Local Keys)
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
import Constants from 'expo-constants';
import { useAuth } from '../../auth/context';

export function AuthScreen() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [flowId, setFlowId] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showOtpInput, setShowOtpInput] = useState(false);
  const { initiateEmailLogin, verifyOTPAndLogin, loginWithOAuth, hardReset, isCDPAuthenticated, clearCDPSession } = useAuth();

  const isExpoGo = Constants.appOwnership === 'expo';
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    console.log('[AuthScreen] showOtpInput changed to:', showOtpInput);
  }, [showOtpInput]);

  // Clear stale CDP sessions on mount
  useEffect(() => {
    const cleanupStaleCDPSession = async () => {
      if (isCDPAuthenticated) {
        console.log('[AuthScreen] Detected stale CDP session, cleaning up...');
        await clearCDPSession();
      }
    };
    cleanupStaleCDPSession();
  }, []);

  const handleHardReset = async () => {
    Alert.alert(
      'Hard Reset',
      'This will clear all local data and reload the app. Use this if you are stuck or seeing unauthorized errors.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reset', style: 'destructive', onPress: () => hardReset() }
      ]
    );
  };



  const handleSendOtp = async () => {
    if (!email.trim() || !email.includes('@')) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      console.log('[AuthScreen] Initiating email login...');
      const returnedFlowId = await initiateEmailLogin(email.trim());
      console.log('[AuthScreen] Got flowId:', returnedFlowId);
      setFlowId(returnedFlowId);
      console.log('[AuthScreen] Setting showOtpInput to true');
      setShowOtpInput(true);
      console.log('[AuthScreen] State updated, showOtpInput should now be true');
      Alert.alert('OTP Sent', 'Please check your email for the verification code.');
    } catch (error: unknown) {
      console.error('[AuthScreen] handleSendOtp failed:', error);
      Alert.alert('Error', (error as Error).message || 'Could not send OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.trim().length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter the 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      await verifyOTPAndLogin(email.trim(), otp.trim(), flowId, referralCode.trim() || undefined);
    } catch (error: unknown) {
      console.error('[AuthScreen] handleVerifyOtp failed:', error);
      Alert.alert('Verification failed', (error as Error).message || 'Could not verify OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToEmail = () => {
    setShowOtpInput(false);
    setOtp('');
    setFlowId('');
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
            {!showOtpInput ? (
              <>
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
                  onPress={handleSendOtp}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Send Verification Code</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.label}>Verification Code</Text>
                <Text style={styles.otpHint}>
                  Enter the 6-digit code sent to {email}
                </Text>
                <TextInput
                  style={styles.input}
                  placeholder="000000"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={!isLoading}
                  autoFocus
                />

                <TouchableOpacity
                  style={[styles.button, styles.coinbaseButton, isLoading && styles.buttonDisabled]}
                  onPress={handleVerifyOtp}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Verify & Sign In</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.button, styles.backButton]}
                  onPress={handleBackToEmail}
                  disabled={isLoading}
                >
                  <Text style={styles.backButtonText}>Back to Email</Text>
                </TouchableOpacity>
              </>
            )}

            {!showOtpInput && !isExpoGo && (
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

            {!showOtpInput && (
              <>
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
              </>
            )}

            <Text style={styles.hint}>
              {isExpoGo 
                ? "Safe Mode: Social login hidden for Expo Go. Use email to sign in."
                : "Securely sign in using Coinbase CDP Embedded Wallets."}
            </Text>

            {isWeb && (
              <TouchableOpacity
                style={[styles.button, styles.resetButton]}
                onPress={handleHardReset}
                disabled={isLoading}
              >
                <Text style={styles.resetButtonText}>Reset Session (Troubleshoot)</Text>
              </TouchableOpacity>
            )}
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
  resetButton: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    marginTop: 24,
    height: 40,
  },
  resetButtonText: {
    color: '#8E8E93',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  otpHint: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
    marginTop: -4,
  },
  backButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    marginTop: 8,
  },
  backButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: '600',
  },
});
