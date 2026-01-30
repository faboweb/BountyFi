import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/theme';
import { Card } from '../../components/Card';

type Nav = NativeStackNavigationProp<any>;
type Route = RouteProp<any, 'RedeemChallenges'>;

const PRIZES: { label: string; emoji: string }[] = [
  { label: 'coffee', emoji: '☕' },
  { label: 'meal at Uniserv Café', emoji: '🍽️' },
  { label: '40 baht', emoji: '💵' },
  { label: 'snack', emoji: '🍪' },
  { label: 'bubble tea', emoji: '🧋' },
  { label: 'smoothie', emoji: '🥤' },
];

function pickRandomPrize(): { label: string; emoji: string } {
  return PRIZES[Math.floor(Math.random() * PRIZES.length)];
}

export function RedeemChallengesScreen() {
  const navigation = useNavigation<Nav>();
  const { data: submissions, isLoading } = useQuery({
    queryKey: ['submissions', 'my'],
    queryFn: () => api.submissions.getMy(),
  });
  const { data: campaigns } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.campaigns.getAll(),
  });

  const verifiedByCampaign = React.useMemo(() => {
    const approved = (submissions ?? []).filter((s: { status: string }) => s.status === 'approved');
    const map: Record<string, number> = {};
    approved.forEach((s: { campaign_id: string }) => {
      map[s.campaign_id] = (map[s.campaign_id] || 0) + 1;
    });
    return Object.entries(map).map(([campaignId, tickets]) => ({
      campaignId,
      tickets,
      campaignName: campaigns?.find((c: { id: string }) => c.id === campaignId)?.title ?? 'Challenge',
    }));
  }, [submissions, campaigns]);

  const handlePlayTicket = (challengeName: string) => {
    const won = Math.random() < 0.35;
    const prize = won ? pickRandomPrize() : null;
    navigation.navigate('PlayTicketResult', {
      won,
      prize: prize?.label,
      emoji: prize?.emoji,
      challengeName,
    });
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color={Colors.ivoryBlue} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Redeem tickets</Text>
        <View style={styles.backBtn} />
      </View>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Verified challenges & tickets earned</Text>
        {verifiedByCampaign.length === 0 ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyEmoji}>🎫</Text>
            <Text style={styles.emptyText}>No verified challenges yet</Text>
            <Text style={styles.emptyHint}>Complete quests and get approved to earn tickets here.</Text>
          </Card>
        ) : (
          verifiedByCampaign.map((item) => (
            <TouchableOpacity
              key={item.campaignId}
              activeOpacity={0.8}
              onPress={() => handlePlayTicket(item.campaignName)}
            >
              <Card style={styles.challengeCard}>
                <View style={styles.challengeRow}>
                  <Text style={styles.challengeName}>{item.campaignName}</Text>
                  <View style={styles.ticketBadge}>
                    <Text style={styles.ticketCount}>{item.tickets}</Text>
                    <Text style={styles.ticketLabel}>ticket{item.tickets !== 1 ? 's' : ''}</Text>
                  </View>
                </View>
                <Text style={styles.tapHint}>Tap to play ticket</Text>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: { width: 44, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 24, color: Colors.primaryDark },
  headerTitle: { ...Typography.body, fontWeight: '800', fontSize: 18 },
  content: { padding: Spacing.lg, paddingBottom: 80 },
  subtitle: {
    fontSize: 14,
    color: Colors.textGray,
    marginBottom: Spacing.lg,
  },
  emptyCard: {
    alignItems: 'center',
    padding: Spacing.xl,
  },
  emptyEmoji: { fontSize: 48, marginBottom: Spacing.md },
  emptyText: { ...Typography.body, fontWeight: '700', marginBottom: 8 },
  emptyHint: { fontSize: 14, color: Colors.textGray, textAlign: 'center' },
  challengeCard: {
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  challengeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  challengeName: { ...Typography.body, fontWeight: '700', fontSize: 16, flex: 1 },
  ticketBadge: {
    backgroundColor: Colors.ivoryBlueLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  ticketCount: { ...Typography.heading, fontSize: 18, color: Colors.ivoryBlueDark },
  ticketLabel: { fontSize: 11, color: Colors.ivoryBlueDark, fontWeight: '600' },
  tapHint: { fontSize: 12, color: Colors.textGray, marginTop: 8 },
});
