// Auth/Onboarding Screen – Coinbase only
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
import { useAuth } from '../../auth/context';

export function AuthScreen() {
  const [referralCode, setReferralCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { loginWithCoinbase } = useAuth();

  const handleCoinbaseLogin = async () => {
    setIsLoading(true);
    try {
      await loginWithCoinbase(referralCode.trim() || undefined);
    } catch (error: any) {
      Alert.alert('Login Failed', error.message || 'Something went wrong. Please try again.');
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

            <View style={styles.loginRow}>
              <TouchableOpacity
                style={styles.skipLink}
                onPress={handleCoinbaseLogin}
                disabled={isLoading}
              >
                <Text style={styles.skipLinkText}>Skip to login</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleCoinbaseLogin}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Sign in with Coinbase</Text>
              )}
            </TouchableOpacity>
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
  loginRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 8,
  },
  skipLink: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  skipLinkText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '500',
  },
  button: {
    backgroundColor: '#0052FF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
