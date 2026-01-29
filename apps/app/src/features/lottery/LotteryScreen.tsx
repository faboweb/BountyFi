// Lottery Screen
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { RouteProp as RNRouteProp } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../api/client';
import { useAuth } from '../../auth/context';
import { Lottery } from '../../api/types';
import { formatWalletAddress } from '../../utils/image';

type RouteProp = RNRouteProp<AppStackParamList, 'Lottery'>;

export function LotteryScreen() {
  const route = useRoute<RouteProp>();
  const campaignId = route.params?.campaignId;
  const { user } = useAuth();

  const { data: lottery, isLoading } = useQuery({
    queryKey: ['lottery', campaignId],
    queryFn: () => api.lottery.getByCampaign(campaignId!),
    enabled: !!campaignId,
  });

  if (!campaignId) {
    return (
      <View style={styles.container}>
        <Text>Campaign not found</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!lottery) {
    return (
      <View style={styles.container}>
        <Text>Lottery not found</Text>
      </View>
    );
  }

  const userTickets = user?.tickets || 0;
  const isCompleted = lottery.status === 'completed';

  // Calculate time until draw
  const getTimeUntilDraw = () => {
    if (!lottery.draw_date) return null;
    const now = new Date().getTime();
    const draw = new Date(lottery.draw_date).getTime();
    const diff = draw - now;
    
    if (diff <= 0) return null;
    
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return { days, hours, minutes };
  };

  const timeUntilDraw = getTimeUntilDraw();
  const userWon = lottery.winners?.some((w: { user_id: string }) => w.user_id === user?.id);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {isCompleted ? (
          <>
            <Text style={styles.title}>Lottery Results</Text>
            <Text style={styles.subtitle}>Draw completed</Text>

            {userWon ? (
              <View style={styles.winnerBanner}>
                <Text style={styles.winnerText}>🎉 You Won!</Text>
                <Text style={styles.winnerAmount}>
                  ${lottery.winners?.find((w: { user_id: string }) => w.user_id === user?.id)?.prize_amount || 0}
                </Text>
                <Text style={styles.winnerTier}>
                  {lottery.winners?.find((w: { user_id: string }) => w.user_id === user?.id)?.tier}
                </Text>
              </View>
            ) : (
              <View style={styles.loserBanner}>
                <Text style={styles.loserText}>Better luck next time!</Text>
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Winners</Text>
              {lottery.winners?.map((winner: { email: string; wallet_address: string; tier: string; prize_amount: number }, index: number) => (
                <View key={index} style={styles.winnerRow}>
                  <Text style={styles.winnerEmail}>{winner.email}</Text>
                  <Text style={styles.winnerWallet}>{formatWalletAddress(winner.wallet_address)}</Text>
                  <Text style={styles.winnerPrize}>
                    {winner.tier}: ${winner.prize_amount}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            <Text style={styles.title}>Lottery Draw</Text>
            {timeUntilDraw ? (
              <View style={styles.countdown}>
                <Text style={styles.countdownText}>
                  Draw in {timeUntilDraw.days}d {timeUntilDraw.hours}h {timeUntilDraw.minutes}m
                </Text>
              </View>
            ) : (
              <Text style={styles.subtitle}>Draw date: {lottery.draw_date ? new Date(lottery.draw_date).toLocaleDateString() : 'TBD'}</Text>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Your Tickets</Text>
              <Text style={styles.ticketCount}>{userTickets}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Prize Tiers</Text>
              {lottery.prize_tiers.map((tier: { name: string; amount: number; count: number }, index: number) => (
                <View key={index} style={styles.tierRow}>
                  <Text style={styles.tierName}>{tier.name}</Text>
                  <Text style={styles.tierDetails}>
                    ${tier.amount} × {tier.count}
                  </Text>
                </View>
              ))}
            </View>

            {userTickets > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Win Probability</Text>
                <Text style={styles.probabilityText}>
                  Based on your {userTickets} tickets
                </Text>
                <Text style={styles.probabilityNote}>
                  (Calculated at draw time based on total tickets)
                </Text>
              </View>
            )}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  countdown: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  countdownText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  ticketCount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'center',
  },
  tierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tierName: {
    fontSize: 16,
    fontWeight: '600',
  },
  tierDetails: {
    fontSize: 16,
    color: '#666',
  },
  probabilityText: {
    fontSize: 16,
    color: '#000',
    marginBottom: 4,
  },
  probabilityNote: {
    fontSize: 12,
    color: '#8E8E93',
  },
  winnerBanner: {
    backgroundColor: '#34C759',
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  winnerText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  winnerAmount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  winnerTier: {
    fontSize: 18,
    color: '#fff',
  },
  loserBanner: {
    backgroundColor: '#E5E5EA',
    borderRadius: 12,
    padding: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  loserText: {
    fontSize: 18,
    color: '#666',
  },
  winnerRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  winnerEmail: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  winnerWallet: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  winnerPrize: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
});
