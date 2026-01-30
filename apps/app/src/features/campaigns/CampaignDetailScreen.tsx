import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp as RNRouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../api/client';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/theme';
import { Button } from '../../components/Button';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;
type RouteProp = RNRouteProp<AppStackParamList, 'CampaignDetail'>;

export function CampaignDetailScreen() {
  const route = useRoute<RouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { campaignId } = route.params;

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => api.campaigns.getById(campaignId),
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  if (!campaign) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Campaign not found</Text>
      </View>
    );
  }

  const title = campaign.title || 'Mission';
  const isCleanup = campaign.quest_type === 'uniserv_cleanup' || title.toLowerCase().includes('clean');
  const checkpoints = campaign.checkpoints ?? [];
  const firstCheckpoint = checkpoints[0];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <Text style={styles.headerIconText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mission</Text>
        <View style={styles.headerIcon} />
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Mission header card */}
        <View style={styles.missionHeader}>
          <View style={styles.missionIcon}>
            <Text style={styles.missionIconEmoji}>
              {isCleanup ? '🌳' : campaign.quest_type === 'ban_plastic' ? '🛍️' : '🚭'}
            </Text>
          </View>
          <Text style={styles.missionTitle}>{title}</Text>
          <Text style={styles.missionSubtitle}>
            {campaign.quest_type === 'no_burn'
              ? 'One photo per day with GPS. Selfie + proof required.'
              : campaign.quest_type === 'uniserv_cleanup'
                ? 'Before & after cleanup (min 1 min apart). One participation only.'
                : campaign.quest_type === 'ban_plastic'
                  ? 'Selfie first, then a photo showing veggies/fruits in a tote or non-plastic. Chiang Mai area.'
                  : 'Photo + GPS proof required. Start mission opens camera.'}
          </Text>
        </View>

        {/* Checkpoints from campaign */}
        {checkpoints.length > 0 && (
          <View style={styles.checkpointList}>
            <Text style={styles.checkpointListTitle}>Checkpoints</Text>
            {checkpoints.map((cp, index) => (
              <View key={cp.id} style={styles.checkpointItem}>
                <LinearGradient
                  colors={[Colors.ivoryBlue, Colors.ivoryBlueLight]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.checkpointNumber}
                >
                  <Text style={styles.checkpointNumberText}>{index + 1}</Text>
                </LinearGradient>
                <View style={styles.checkpointDetails}>
                  <Text style={styles.checkpointName}>{cp.name ?? 'Checkpoint'}</Text>
                  <Text style={styles.checkpointDistance}>📍 Within {cp.radius}m</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Prize chest */}
        <View style={styles.prizeChestCard}>
          <Text style={styles.prizeChestTitle}>🎁 Prize chest</Text>
          {campaign.prize_chest && campaign.prize_chest.length > 0 ? (
            <View style={styles.prizeList}>
              {campaign.prize_chest.map((prize, index) => (
                <View key={index} style={styles.prizeRow}>
                  <Text style={styles.prizeEmoji}>{prize.emoji}</Text>
                  <Text style={styles.prizeLabel}>{prize.label}</Text>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.prizeChestFallback}>
              Complete the quest and redeem tickets for prizes. Pool: {campaign.prize_total} THB.
            </Text>
          )}
        </View>

        {/* Sponsored by */}
        {campaign.sponsors && campaign.sponsors.length > 0 && (
          <View style={styles.sponsoredByCard}>
            <Text style={styles.sponsoredByTitle}>Sponsored by</Text>
            <View style={styles.sponsorList}>
              {campaign.sponsors.map((sponsor, index) => (
                <View key={index} style={styles.sponsorRow}>
                  <Text style={styles.sponsorName}>{sponsor.name}</Text>
                  {sponsor.type && (
                    <Text style={styles.sponsorType}>
                      {sponsor.type === 'cafe' ? 'Café' : sponsor.type === 'company' ? 'Company' : 'Individual'}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.footer}>
          <Button
            title="Start mission"
            onPress={() => {
              if (firstCheckpoint) {
                navigation.navigate('SubmitProof', { campaignId, checkpointId: firstCheckpoint.id });
              }
            }}
            variant="primary"
            style={styles.ctaButton}
            disabled={!firstCheckpoint}
          />
          <TouchableOpacity
            style={styles.sponsorMissionButton}
            onPress={() => navigation.navigate('SponsorMission', { campaignId })}
          >
            <Text style={styles.sponsorMissionText}>Sponsor mission</Text>
            <Text style={styles.sponsorMissionHint}>Money, vouchers, snacks, drinks…</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.cream,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textGray,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.cream,
  },
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconText: {
    fontSize: 24,
    color: Colors.ivoryBlueDark,
  },
  headerTitle: {
    ...Typography.body,
    fontWeight: '700',
    fontSize: 18,
    color: Colors.ivoryBlueDark,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 80,
  },
  missionHeader: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    ...Shadows.card,
  },
  missionIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: Colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  missionIconEmoji: {
    fontSize: 40,
  },
  missionTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 22,
    color: Colors.ivoryBlueDark,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  missionSubtitle: {
    fontSize: 14,
    color: Colors.textGray,
    textAlign: 'center',
  },
  checkpointList: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  checkpointListTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '600',
    fontSize: 18,
    color: Colors.ivoryBlueDark,
    marginBottom: Spacing.md,
  },
  checkpointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    marginBottom: 12,
    backgroundColor: Colors.cream,
    borderRadius: BorderRadius.lg,
  },
  checkpointNumber: {
    width: 40,
    height: 40,
    borderRadius: 12,
    overflow: 'hidden',
  },
  checkpointNumberText: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 18,
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 40,
  },
  checkpointDetails: {
    flex: 1,
  },
  checkpointName: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '600',
    fontSize: 16,
    color: Colors.ivoryBlueDark,
    marginBottom: 4,
  },
  checkpointDistance: {
    fontSize: 13,
    color: Colors.textGray,
  },
  prizeChestCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    ...Shadows.card,
  },
  prizeChestTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 18,
    color: Colors.ivoryBlueDark,
    marginBottom: Spacing.md,
  },
  prizeList: {
    gap: 8,
  },
  prizeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.creamDark,
  },
  prizeEmoji: {
    fontSize: 22,
    marginRight: 12,
  },
  prizeLabel: {
    fontSize: 16,
    color: Colors.ivoryBlueDark,
    fontWeight: '600',
  },
  prizeChestFallback: {
    fontSize: 14,
    color: Colors.textGray,
    lineHeight: 22,
  },
  sponsoredByCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    ...Shadows.card,
  },
  sponsoredByTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 18,
    color: Colors.ivoryBlueDark,
    marginBottom: Spacing.md,
  },
  sponsorList: {
    gap: 8,
  },
  sponsorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.creamDark,
  },
  sponsorName: {
    fontSize: 16,
    color: Colors.ivoryBlueDark,
    fontWeight: '600',
  },
  sponsorType: {
    fontSize: 13,
    color: Colors.textGray,
    textTransform: 'capitalize',
  },
  checkpointReward: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 18,
    color: Colors.sunshine,
  },
  footer: {
    marginTop: Spacing.xl,
  },
  ctaButton: {
    width: '100%',
  },
  sponsorMissionButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sponsorMissionText: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '600',
    fontSize: 16,
    color: Colors.ivoryBlue,
  },
  sponsorMissionHint: {
    fontSize: 12,
    color: Colors.textGray,
    marginTop: 2,
  },
});
