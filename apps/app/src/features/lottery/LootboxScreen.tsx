import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Animated,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, Shadows } from '../../theme/theme';
import { api } from '../../api/client';
import { useAuth } from '../../auth/context';
import { TransactionModal, TransactionStatus } from '../../components/TransactionModal';
import { Confetti } from '../../components/Confetti';
import type { CampaignLootboxPullResult } from '../../api/types';

export function LootboxScreen() {
  const queryClient = useQueryClient();
  const { user, refreshUser } = useAuth();
  const [modalVisible, setModalVisible] = useState(false);
  const [txStatus, setTxStatus] = useState<TransactionStatus>('idle');
  const [lastResult, setLastResult] = useState<CampaignLootboxPullResult | null>(null);
  const [confettiActive, setConfettiActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const { data: availableLootboxes = [], isLoading: lootboxesLoading } = useQuery({
    queryKey: ['availableLootboxes'],
    queryFn: () => api.lottery.getAvailableLootboxes(),
  });
  const currentLootbox = availableLootboxes[0] ?? null;
  const campaignId = currentLootbox?.campaignId ?? null;

  const { data: campaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => api.campaigns.getById(campaignId!),
    enabled: !!campaignId,
  });
  const campaignName = currentLootbox?.label ?? campaign?.title ?? 'Lootbox';
  const potentialPrizes = campaign?.prize_chest ?? [];

  const { data: userData } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.users.getMe(),
    enabled: !!user?.id,
  });
  const tickets = userData?.tickets ?? user?.tickets ?? 0;
  const diamonds = userData?.diamonds ?? user?.diamonds ?? 0;
  const canOpen = tickets >= 1;
  const canRollAgain = diamonds >= 10;

  // Shake animation for gift box (left-right wiggle)
  const shakeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 1, duration: 70, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -1, duration: 70, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 1, duration: 70, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -1, duration: 70, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 70, useNativeDriver: true }),
        Animated.delay(1000),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const shakeTranslate = shakeAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-8, 0, 8],
  });

  const openLootbox = async () => {
    if (!canOpen || !campaignId) return;
    setModalVisible(true);
    setTxStatus('pending');
    setLastResult(null);
    setConfettiActive(false);
    try {
      const result = await api.lottery.openCampaignLootbox(campaignId);
      setLastResult(result);
      setTxStatus('success');
      if (result.won && result.prize) {
        setConfettiActive(true);
        setTimeout(() => setConfettiActive(false), 3000);
      }
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['availableLootboxes'] });
    } catch (error: any) {
      setTxStatus('error');
      setLastResult(null);
      setErrorMessage(error?.message ?? 'Failed to open lootbox');
    }
  };

  const handleRollAgain = async () => {
    if (!canRollAgain || !campaignId) return;
    setTxStatus('pending');
    setLastResult(null);
    setConfettiActive(false);
    setErrorMessage(undefined);
    try {
      const result = await api.lottery.rollAgainCampaignLootbox(campaignId);
      setLastResult(result);
      setTxStatus('success');
      if (result.won && result.prize) {
        setConfettiActive(true);
        setTimeout(() => setConfettiActive(false), 3000);
      }
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    } catch (error: any) {
      setTxStatus('error');
      setErrorMessage(error?.message ?? 'Failed to roll again');
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setTxStatus('idle');
    setLastResult(null);
    setErrorMessage(undefined);
  };

  const prizeText = lastResult?.won && lastResult.prize
    ? `${lastResult.prize.emoji} ${lastResult.prize.label}`
    : lastResult && !lastResult.won
      ? 'No prize this time 🎁'
      : '';

  if (!lootboxesLoading && availableLootboxes.length === 0 && !modalVisible) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.noCampaignText}>No lootboxes available right now. Check back later!</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <Confetti active={confettiActive} />

      <View style={styles.content}>
        <Text style={styles.title}>Campaign Lootbox</Text>
        {campaignName ? (
          <Text style={styles.campaignName}>{campaignName}</Text>
        ) : null}
        <Text style={styles.subtitle}>Tickets = lootboxes. Tap to open (1 ticket). Use diamonds to roll again.</Text>

        {potentialPrizes.length > 0 ? (
          <View style={styles.prizesSection}>
            <Text style={styles.prizesLabel}>Potential prizes</Text>
            <View style={styles.prizesRow}>
              {potentialPrizes.map((item, index) => {
                const label = item.label;
                const emoji = 'emoji' in item && typeof (item as { emoji?: string }).emoji === 'string' ? (item as { emoji?: string }).emoji : null;
                return (
                  <View key={index} style={styles.prizeChip}>
                    <Text style={styles.prizeChipText}>{emoji ? `${emoji} ` : ''}{label}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.balanceRow}>
          <Text style={styles.balanceLabel}>Your balance</Text>
          <Text style={styles.balanceValue}>{tickets} ticket{tickets !== 1 ? 's' : ''} · {diamonds} 💎</Text>
        </View>

        <TouchableOpacity
          style={styles.giftWrap}
          onPress={openLootbox}
          disabled={!canOpen || !campaignId}
          activeOpacity={0.9}
        >
          <Animated.View style={[styles.giftBox, { transform: [{ translateX: shakeTranslate }] }]}>
            <Ionicons name="gift" size={120} color={Colors.coral} />
          </Animated.View>
        </TouchableOpacity>

        {!canOpen && (
          <Text style={styles.warning}>Need 1 ticket to open</Text>
        )}

        {canOpen && campaignId && (
          <Text style={styles.tapHint}>Tap the gift to open (1 ticket)</Text>
        )}
      </View>

      <TransactionModal
        visible={modalVisible}
        onClose={handleCloseModal}
        title="Opening lootbox..."
        description="One moment..."
        status={txStatus}
        errorMessage={errorMessage}
        successTitle={lastResult?.won ? 'You won!' : 'Result'}
        successDescription={prizeText}
        successActionLabel={canRollAgain ? 'Roll again for 10 💎' : undefined}
        onSuccessAction={canRollAgain ? handleRollAgain : undefined}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.xl },
  noCampaignText: { ...Typography.body, color: Colors.textSecondary },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    alignItems: 'center',
  },
  title: { ...Typography.heading, fontSize: 26, marginBottom: Spacing.xs },
  campaignName: {
    ...Typography.subHeading,
    fontSize: 18,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: { ...Typography.metadata, color: Colors.textSecondary, marginBottom: Spacing.lg },
  prizesSection: {
    width: '100%',
    marginBottom: Spacing.lg,
  },
  prizesLabel: {
    ...Typography.metadata,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    fontWeight: '600',
  },
  prizesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  prizeChip: {
    backgroundColor: Colors.white,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  prizeChipText: {
    ...Typography.metadata,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xxl,
  },
  balanceLabel: { ...Typography.metadata, color: Colors.textSecondary },
  balanceValue: { ...Typography.cardTitle, fontSize: 22, color: Colors.chartBlue },
  giftWrap: {
    marginVertical: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  giftBox: {
    width: 160,
    height: 160,
    borderRadius: 24,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.cardElevated,
  },
  warning: { ...Typography.body, color: Colors.error, fontWeight: '600', marginTop: Spacing.md },
  tapHint: { ...Typography.metadata, color: Colors.textMuted, marginTop: Spacing.lg },
});
