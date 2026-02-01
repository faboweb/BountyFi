import * as React from 'react';
import {
  View,
  Text,
  Image,
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
import { safeFormatDate } from '../../utils/date';
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
  const firstCheckpointId = firstCheckpoint?.id ?? 'cp-0';

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
            {campaign.image_url ? (
              <Image source={{ uri: campaign.image_url }} style={styles.missionImage} />
            ) : (
              <Text style={styles.missionIconEmoji}>
                {isCleanup ? '🌳' : campaign.quest_type === 'ban_plastic' ? '🛍️' : '🚭'}
              </Text>
            )}
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
          {(() => {
            const start = safeFormatDate(campaign.start_date);
            const end = safeFormatDate(campaign.end_date);
            if (start === '—' && end === '—') return null;
            return (
              <Text style={styles.missionDates}>{start} – {end}</Text>
            );
          })()}
        </View>

        {/* Checkpoints from campaign */}
        {checkpoints.length > 0 && (
          <View style={styles.checkpointList}>
            <Text style={styles.checkpointListTitle}>Checkpoints</Text>
            {checkpoints.map((cp: { id?: string; name?: string; radius: number }, index: number) => (
              <View key={cp.id ?? `cp-${index}`} style={styles.checkpointItem}>
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
              {campaign.prize_chest.map((prize: { label: string; image?: string; sponsor?: string }, index: number) => (
                <View key={index} style={styles.prizeRow}>
                  {prize.image ? (
                    <Image source={{ uri: prize.image }} style={styles.prizeImage} />
                  ) : null}
                  <View>
                    <Text style={styles.prizeLabel}>{prize.label}</Text>
                    {prize.sponsor ? <Text style={styles.prizeSponsor}>by {prize.sponsor}</Text> : null}
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.prizeChestFallback}>
              Complete the quest and redeem tickets for prizes. Pool: {(campaign.prize_total ?? campaign.prize_pool) ?? 0} THB.
            </Text>
          )}
        </View>

        {/* Sponsored by */}
        {campaign.sponsors && campaign.sponsors.length > 0 && (
          <View style={styles.sponsoredByCard}>
            <Text style={styles.sponsoredByTitle}>Sponsored by</Text>
            <View style={styles.sponsorList}>
              {campaign.sponsors.map((sponsor: { name: string; type?: string }, index: number) => (
                <View key={index} style={styles.sponsorRow}>
                  <Text style={styles.sponsorName}>{sponsor.name}</Text>
                  {sponsor.type ? (
                    <Text style={styles.sponsorType}>
                      {sponsor.type === 'cafe' ? 'Café' : sponsor.type === 'company' ? 'Company' : 'Individual'}
                    </Text>
                  ) : null}
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
                navigation.navigate('SubmitProof', { campaignId, checkpointId: firstCheckpointId });
              }
            }}
            variant="primary"
            style={styles.ctaButton}
            disabled={!firstCheckpoint}
          />          <TouchableOpacity
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
    backgroundColor: Colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.background,
  },
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconText: {
    fontSize: 22,
    color: Colors.textPrimary,
  },
  headerTitle: {
    ...Typography.cardTitle,
    fontSize: 17,
    color: Colors.textPrimary,
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
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    alignItems: 'center',
    ...Shadows.card,
  },
  missionIcon: {
    width: 72,
    height: 72,
    borderRadius: BorderRadius.xl,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  missionIconEmoji: {
    fontSize: 36,
  },
  missionImage: {
    width: '100%',
    height: '100%',
    borderRadius: 20,
    resizeMode: 'cover',
  },
  missionTitle: {
    ...Typography.cardTitle,
    fontSize: 20,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  missionSubtitle: {
    ...Typography.metadata,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  missionDates: {
    ...Typography.metadata,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  checkpointList: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  checkpointListTitle: {
    ...Typography.cardTitle,
    fontSize: 17,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  checkpointItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: Spacing.md,
    marginBottom: 12,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.lg,
  },
  checkpointNumber: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    overflow: 'hidden',
  },
  checkpointNumberText: {
    ...Typography.cardTitle,
    fontSize: 18,
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 40,
  },
  checkpointDetails: {
    flex: 1,
  },
  checkpointName: {
    ...Typography.cardTitle,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  checkpointDistance: {
    ...Typography.metadata,
    color: Colors.textSecondary,
  },
  prizeChestCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    ...Shadows.card,
  },
  prizeChestTitle: {
    ...Typography.cardTitle,
    fontSize: 17,
    color: Colors.textPrimary,
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
    borderBottomColor: Colors.primaryLight,
  },
  prizeImage: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.sm,
    marginRight: 12,
  },
  prizeLabel: {
    ...Typography.cardTitle,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  prizeSponsor: {
    ...Typography.metadata,
    marginTop: 2,
    color: Colors.textSecondary,
  },
  prizeChestFallback: {
    ...Typography.metadata,
    lineHeight: 20,
    color: Colors.textSecondary,
  },
  sponsoredByCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
    ...Shadows.card,
  },
  sponsoredByTitle: {
    ...Typography.cardTitle,
    fontSize: 17,
    color: Colors.textPrimary,
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
    borderBottomColor: Colors.primaryLight,
  },
  sponsorName: {
    ...Typography.cardTitle,
    fontSize: 15,
    color: Colors.textPrimary,
  },
  sponsorType: {
    ...Typography.metadata,
    color: Colors.textSecondary,
    textTransform: 'capitalize',
  },
  checkpointReward: {
    ...Typography.cardTitle,
    fontSize: 17,
    color: Colors.chartBlue,
  },
  footer: {
    marginTop: Spacing.xl,
  },
  sponsorMissionButton: {
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sponsorMissionText: {
    ...Typography.cardTitle,
    fontSize: 15,
    color: Colors.chartBlue,
  },
  sponsorMissionHint: {
    ...Typography.metadata,
    marginTop: 2,
    color: Colors.textSecondary,
  },
  ctaButton: {
    width: '100%',
  },
});
