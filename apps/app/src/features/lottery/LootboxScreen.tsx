import * as React from 'react';
import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/theme';
import { api } from '../../api/client';
import { useAuth } from '../../auth/context';

export function LootboxScreen() {
  const queryClient = useQueryClient();
  const { signMessage, user, refreshUser } = useAuth();
  const [isOpening, setIsOpening] = useState(false);

  // Use tickets from user profile instead of on-chain balance for consistency/speed
  const balance = user?.tickets || 0;
  const balanceLoading = false; // User is loaded with auth context

  const handleOpenLootbox = async () => {
    setIsOpening(true);
    try {
      // 1. Sign intent
      const message = JSON.stringify({
         action: 'open_lootbox',
         timestamp: Date.now() 
      });
      const signature = await signMessage(message);

      // 2. Call Relayer
      await api.lottery.open(signature, message);
      
      Alert.alert('Success', 'Lootbox requested! Your prize will appear once the VRF is fulfilled.');
      
      // 3. Refresh user to update ticket balance immediately
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ['bountyBalance'] }); // Keep for legacy
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'Failed to open lootbox');
    } finally {
      setIsOpening(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>🎁 Monthly Lootbox</Text>
        <Text style={styles.subtitle}>Spend 10 BOUNTY for a chance to win rare rewards!</Text>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Your Balance</Text>
          <Text style={styles.balanceValue}>{balanceLoading ? '...' : `${Number(balance).toFixed(2)} BOUNTY`}</Text>
        </View>

        <TouchableOpacity 
          style={[styles.openButton, (isOpening || Number(balance) < 10) && styles.disabledButton]}
          onPress={handleOpenLootbox}
          disabled={isOpening || Number(balance) < 10}
        >
          {isOpening ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Open Lootbox (10 BOUNTY)</Text>
          )}
        </TouchableOpacity>

        {Number(balance) < 10 && !balanceLoading && (
          <Text style={styles.warning}>Need more tickets to open a box!</Text>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { padding: Spacing.xl, alignItems: 'center' },
  title: { ...Typography.heading, fontSize: 32, marginBottom: Spacing.sm },
  subtitle: { ...Typography.body, textAlign: 'center', color: Colors.textGray, marginBottom: Spacing.xl },
  balanceCard: { backgroundColor: '#fff', padding: Spacing.xl, borderRadius: BorderRadius.lg, ...Shadows.card, width: '100%', alignItems: 'center', marginBottom: Spacing.xxl },
  balanceLabel: { ...Typography.caption, color: Colors.textGray, marginBottom: 4 },
  balanceValue: { ...Typography.heading, fontSize: 28, color: Colors.primaryBright },
  openButton: { backgroundColor: Colors.primaryBright, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xxl, borderRadius: BorderRadius.full, width: '100%', alignItems: 'center', ...Shadows.sm },
  disabledButton: { backgroundColor: '#CBD5E1' },
  buttonText: { color: '#fff', fontWeight: '800', fontSize: 18 },
  warning: { marginTop: Spacing.lg, color: Colors.error, fontWeight: '600' }
});
