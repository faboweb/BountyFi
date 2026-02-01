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
  ScrollView,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/theme';
import { api } from '../../api/client';
import { useAuth } from '../../auth/context';

export function LootboxScreen() {
  const queryClient = useQueryClient();
  const { user, refreshUser } = useAuth();
  const [isOpening, setIsOpening] = useState(false);
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);

  const tickets = user?.tickets ?? 0;
  const diamonds = user?.diamonds ?? 0;
  const canOpen = tickets >= 1 || diamonds >= 10;
  const balanceLoading = false;

  const { data: result, isLoading: resultLoading, refetch: refetchResult } = useQuery({
    queryKey: ['lootboxResult', lastRequestId],
    queryFn: () => (lastRequestId ? api.lottery.getResult(lastRequestId) : Promise.resolve(null)),
    enabled: !!lastRequestId,
  });

  const handleOpenLootbox = async () => {
    setIsOpening(true);
    try {
      const res = await api.lottery.openOnChain();
      setLastRequestId(res.requestId);
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ['bountyBalance'] });
      queryClient.invalidateQueries({ queryKey: ['lootboxResult', res.requestId] });
      Alert.alert('Success', `Request #${res.requestId}. Check back in a few seconds for your prize.`);
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'Failed to open lootbox');
    } finally {
      setIsOpening(false);
    }
  };

  const handleCheckResult = async () => {
    if (!lastRequestId) return;
    try {
      await api.lottery.syncResult(lastRequestId);
      await refetchResult();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to sync result');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>🎁 Monthly Lootbox</Text>
        <Text style={styles.subtitle}>Use 1 ticket or 10 diamonds for a chance to win rare rewards!</Text>

        <View style={styles.balanceCard}>
          <Text style={styles.balanceLabel}>Your balance</Text>
          <Text style={styles.balanceValue}>{balanceLoading ? '...' : `${tickets} ticket${tickets !== 1 ? 's' : ''} · ${diamonds} 💎`}</Text>
        </View>

        <TouchableOpacity
          style={[styles.openButton, (isOpening || !canOpen) && styles.disabledButton]}
          onPress={handleOpenLootbox}
          disabled={isOpening || !canOpen}
        >
          {isOpening ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Open Lootbox (1 ticket or 10 💎)</Text>
          )}
        </TouchableOpacity>

        {!canOpen && !balanceLoading && (
          <Text style={styles.warning}>Need 1 ticket or 10 diamonds to open a box!</Text>
        )}

        {lastRequestId ? (
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>Last open</Text>
            <Text style={styles.resultRequestId}>Request #{lastRequestId}</Text>
            {resultLoading ? (
              <Text style={styles.resultText}>Loading…</Text>
            ) : result?.fulfilled ? (
              <View>
                <Text style={styles.prizeLabel}>
                  {result.prize_label ? `You won: ${result.prize_label}` : 'No prize this time'}
                </Text>
              </View>
            ) : (
              <View style={styles.resultRow}>
                <Text style={styles.resultText}>VRF pending — tap to refresh</Text>
                <TouchableOpacity style={styles.checkButton} onPress={handleCheckResult}>
                  <Text style={styles.checkButtonText}>Check result</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing.xl, alignItems: 'center', paddingBottom: Spacing.xxl * 2 },
  title: { ...Typography.cardTitle, fontSize: 28, marginBottom: Spacing.sm },
  subtitle: { ...Typography.metadata, textAlign: 'center', color: Colors.textSecondary, marginBottom: Spacing.xl },
  balanceCard: { backgroundColor: Colors.white, padding: Spacing.xl, borderRadius: BorderRadius.xl, ...Shadows.card, width: '100%', alignItems: 'center', marginBottom: Spacing.xxl },
  balanceLabel: { ...Typography.metadata, color: Colors.textSecondary, marginBottom: 4 },
  balanceValue: { ...Typography.cardTitle, fontSize: 28, color: Colors.chartBlue },
  openButton: { backgroundColor: Colors.chartBlue, paddingVertical: Spacing.lg, paddingHorizontal: Spacing.xxl, borderRadius: BorderRadius.xl, width: '100%', alignItems: 'center', ...Shadows.card },
  disabledButton: { backgroundColor: Colors.primaryDark },
  buttonText: { color: Colors.white, ...Typography.button, fontSize: 16 },
  warning: { marginTop: Spacing.lg, color: Colors.error, fontWeight: '600' },
  resultCard: { backgroundColor: Colors.white, padding: Spacing.xl, borderRadius: BorderRadius.xl, ...Shadows.card, width: '100%', marginTop: Spacing.xl, alignItems: 'center' },
  resultTitle: { ...Typography.caption, color: Colors.textGray, marginBottom: 4 },
  resultRequestId: { ...Typography.body, marginBottom: Spacing.sm },
  resultText: { ...Typography.body, color: Colors.textGray },
  resultRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, flexWrap: 'wrap', justifyContent: 'center' },
  prizeLabel: { ...Typography.heading, fontSize: 20, color: Colors.success },
  checkButton: { backgroundColor: Colors.chartBlue, paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg, borderRadius: BorderRadius.lg, ...Shadows.sm },
  checkButtonText: { color: Colors.white, ...Typography.button, fontSize: 14 },
});
