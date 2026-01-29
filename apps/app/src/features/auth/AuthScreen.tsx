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
import { useAuth } from '../../auth/context';

export function AuthScreen() {
  const [referralCode, setReferralCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { loginWithLocalKey } = useAuth();

  const handleStart = async () => {
    setIsLoading(true);
    try {
      const authResponse = await loginWithLocalKey(referralCode.trim() || undefined);
      console.log('[AuthScreen] handleStart success:', authResponse);
      // Success is handled by navigation in App.tsx watching auth state
    } catch (error: unknown) {
      console.error('[AuthScreen] handleStart failed:', error);
      Alert.alert('Start failed', (error as Error).message || 'Could not initialize session.');
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
              style={[styles.button, isLoading && styles.buttonDisabled]}
              onPress={handleStart}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Start</Text>
              )}
            </TouchableOpacity>
            
            <Text style={styles.hint}>
              Demo mode: Creates a local secure wallet on your device.
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
    backgroundColor: '#0052FF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
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
