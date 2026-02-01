import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../api/client';
import type { Campaign } from '../../api/types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/theme';
import { BirdMascot } from '../../components/BirdMascot';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

function progressToLabel(pct: number): string {
  if (pct <= 0) return 'Not started';
  if (pct < 35) return 'In progress';
  if (pct < 75) return 'Halfway';
  return 'Almost there';
}

function questToMetadata(questType: string): string {
  switch (questType) {
    case 'uniserv_cleanup':
      return 'Before / after · Min 1 min · Once';
    case 'no_burn':
      return 'Photo + GPS · Once per day';
    case 'ban_plastic':
      return 'Selfie + tote · Chiang Mai';
    default:
      return '—';
  }
}

export function CampaignsScreen() {
  const navigation = useNavigation<NavigationProp>();

  const { data: campaigns, isLoading, refetch } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.campaigns.getAll(),
  });

  const [refreshing, setRefreshing] = React.useState(false);
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const raw = campaigns ?? [];
  const listData = React.useMemo(() => {
    return [...raw].sort((a: Campaign, b: Campaign) => {
      const order = (c: Campaign) =>
        c.quest_type === 'uniserv_cleanup' ? 0 : c.quest_type === 'no_burn' ? 1 : c.quest_type === 'ban_plastic' ? 2 : 3;
      return order(a) - order(b);
    });
  }, [raw]);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <LinearGradient
        colors={[Colors.backgroundLight, Colors.background, Colors.background]}
        locations={[0, 0.4, 1]}
        style={styles.heroGradient}
      >
        {/* Mascot */}
        <View style={styles.mascotWrap}>
          <BirdMascot size={150} active={false} />
        </View>

        {/* Hero copy – floating, no card */}
        <View style={styles.heroCopyWrap}>
          <Text style={styles.heroTitle}>Hey there, Hero!</Text>
          <Text style={styles.heroSubtitle}>Ready to complete quests and help the planet?</Text>
        </View>

        {/* Section label before quest cards */}
        <Text style={styles.activeQuestsLabel}>Active quests for you:</Text>
      </LinearGradient>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading campaigns...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={listData}
        keyExtractor={(item: Campaign) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.chartBlue}
            colors={[Colors.chartBlue]}
          />
        }
        renderItem={({ item, index }: { item: Campaign; index: number }) => {
          const isCleanup = item.quest_type === 'uniserv_cleanup';
          const isNoBurn = item.quest_type === 'no_burn';
          const isBanPlastic = item.quest_type === 'ban_plastic';
          const hasDonations = (item.prize_total ?? 0) > 0;
          const accentColor = !hasDonations ? Colors.textMuted : isCleanup ? Colors.grass : isNoBurn ? Colors.coral : isBanPlastic ? Colors.lavender : Colors.chartBlue;
          const progress = !hasDonations ? 0 : (isCleanup ? 65 : isNoBurn ? 30 : isBanPlastic ? 45 : 50);
          const metadata = questToMetadata(item.quest_type ?? '');
          const progressLabel = progressToLabel(progress);
          const iconName = isCleanup ? 'leaf-outline' : isNoBurn ? 'flame-outline' : isBanPlastic ? 'bag-handle-outline' : 'location-outline';
          const isFirst = index === 0;

          return (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('CampaignDetail', { campaignId: item.id })}
              style={[
                styles.campaignCard,
                isFirst && styles.campaignCardFeatured,
                { borderLeftColor: accentColor, opacity: hasDonations ? 1 : 0.85 },
              ]}
            >
              <View style={styles.campaignCardTop}>
                <View style={[styles.campaignIconWrap, { backgroundColor: accentColor + '14' }]}>
                  <Ionicons name={iconName as any} size={18} color={accentColor} />
                </View>
                {hasDonations ? (
                  <View style={styles.tagWrap}>
                    <View style={styles.tagDot} />
                    <Text style={styles.tagText}>Active</Text>
                  </View>
                ) : null}
              </View>
              <Text style={[styles.campaignTitle, !hasDonations && { color: Colors.textMuted }]} numberOfLines={2}>
                {item.title}
              </Text>
              <View style={styles.campaignProgress}>
                <View style={styles.progressBarWrap}>
                  <View style={styles.progressBar}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${progress}%`, backgroundColor: accentColor },
                      ]}
                    />
                  </View>
                  <Text style={[styles.progressLabel, !hasDonations && { color: Colors.textMuted }]}>{progressLabel}</Text>
                </View>
              </View>
              <Text style={styles.campaignMetadata}>{metadata}</Text>
            </TouchableOpacity>
          );
        }}
      />
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
  headerContainer: {
    overflow: 'hidden',
  },
  heroGradient: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  mascotWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: Spacing.md,
  },
  heroCopyWrap: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  heroTitle: {
    ...Typography.heading,
    fontSize: 28,
    fontWeight: '800',
    color: Colors.ivoryBlue,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    ...Typography.body,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  activeQuestsLabel: {
    ...Typography.cardTitle,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  campaignCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: 14,
    borderLeftWidth: 4,
    ...Shadows.card,
  },
  campaignCardFeatured: {
    ...Shadows.cardElevated,
    marginBottom: 14,
  },
  campaignCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  campaignIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tagWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
  },
  tagDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.textSecondary,
  },
  tagText: {
    ...Typography.metadata,
    fontSize: 10,
    color: Colors.textSecondary,
    fontWeight: '500',
    textTransform: 'none',
  },
  campaignTitle: {
    ...Typography.cardTitle,
    marginBottom: Spacing.sm,
  },
  campaignProgress: {
    marginBottom: Spacing.sm,
  },
  progressBarWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  progressBar: {
    width: '60%',
    height: 6,
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
  progressLabel: {
    ...Typography.metadata,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  campaignMetadata: {
    ...Typography.metadata,
  },
});
