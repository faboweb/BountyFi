import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../api/client';
import type { Campaign } from '../../api/types';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/theme';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

export function CampaignsScreen() {
  const navigation = useNavigation<NavigationProp>();

  const winkScale = React.useRef(new Animated.Value(1)).current;
  const smileScale = React.useRef(new Animated.Value(1)).current;
  const smileOpacity = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const winkLoop = () => {
      Animated.sequence([
        Animated.timing(winkScale, { toValue: 0.05, duration: 120, useNativeDriver: true }),
        Animated.timing(winkScale, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start(() => setTimeout(winkLoop, 2800));
    };
    winkLoop();
  }, [winkScale]);

  React.useEffect(() => {
    const smileLoop = () => {
      Animated.sequence([
        Animated.parallel([
          Animated.timing(smileScale, { toValue: 1.15, duration: 400, useNativeDriver: true }),
          Animated.timing(smileOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
        ]),
        Animated.parallel([
          Animated.timing(smileScale, { toValue: 1, duration: 400, useNativeDriver: true }),
          Animated.timing(smileOpacity, { toValue: 0.92, duration: 400, useNativeDriver: true }),
        ]),
      ]).start(() => setTimeout(smileLoop, 3200));
    };
    setTimeout(smileLoop, 600);
  }, [smileScale, smileOpacity]);

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.campaigns.getAll(),
  });

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      <LinearGradient
        colors={[Colors.ivoryBlue, Colors.ivoryBlueLight]}
        style={styles.gradientHeader}
      >
        {/* Character bubble – animated wink + brighter smile */}
        <View style={styles.characterBubble}>
          <View style={styles.character}>
            <LinearGradient
              colors={[Colors.sunshine, Colors.coral]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.characterEyes}>
              <View style={styles.eye} />
              <Animated.View style={[styles.eye, { transform: [{ scaleY: winkScale }] }]} />
            </View>
            <Animated.View
              style={[
                styles.characterMouth,
                {
                  transform: [{ scaleX: smileScale }, { scaleY: smileScale }],
                  opacity: smileOpacity,
                },
              ]}
            />
          </View>
          <Text style={styles.speechBubble}>
            Hey there! You're on fire today! 🔥{'\n'}
            Ready to complete your daily mission?
          </Text>
        </View>

        {/* Stats grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>247</Text>
            <Text style={styles.statLabel}>Tickets Earned</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>12</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>
        </View>
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

  // Surface community quests: Uniserv CMU Cleanup and No burning first (incentives + deterrence, low gameability)
  const raw = campaigns ?? [];
  const listData = [...raw].sort((a, b) => {
    const order = (c: Campaign) =>
      c.quest_type === 'uniserv_cleanup' ? 0 : c.quest_type === 'no_burn' ? 1 : c.quest_type === 'ban_plastic' ? 2 : 3;
    return order(a) - order(b);
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        renderItem={({ item }) => {
          const isCleanup = item.quest_type === 'uniserv_cleanup';
          const isNoBurn = item.quest_type === 'no_burn';
          const isBanPlastic = item.quest_type === 'ban_plastic';
          const borderColor = isCleanup ? Colors.grass : isNoBurn ? Colors.coral : isBanPlastic ? Colors.lavender : Colors.ivoryBlue;
          const progress = isCleanup ? 65 : isNoBurn ? 30 : isBanPlastic ? 45 : 50;
          const subtitle =
            isCleanup
              ? 'Before & after (min 1 min). One participation only.'
              : isNoBurn
                ? 'One photo per day, 3 months. Photo + GPS.'
                : isBanPlastic
                  ? 'Selfie + photo with tote/veggies. Chiang Mai.'
                  : item.description;

          return (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('CampaignDetail', { campaignId: item.id })}
              style={[styles.campaignCard, { borderLeftColor: borderColor }]}
            >
              <Text style={styles.campaignTitle}>
                {isCleanup ? '🌳' : isNoBurn ? '🚭' : isBanPlastic ? '🛍️' : '📍'} {item.title}
              </Text>
              <View style={styles.campaignProgress}>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${progress}%`,
                        backgroundColor: isCleanup ? Colors.grass : isNoBurn ? Colors.coral : isBanPlastic ? Colors.lavender : Colors.ivoryBlue,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>{progress}%</Text>
              </View>
              <Text style={styles.campaignSubtitle} numberOfLines={2}>{subtitle}</Text>
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
  headerContainer: {
    marginBottom: Spacing.lg,
    overflow: 'hidden',
  },
  gradientHeader: {
    paddingHorizontal: Spacing.lg,
    paddingTop: 30,
    paddingBottom: Spacing.xl,
    minHeight: 320,
  },
  characterBubble: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  character: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginBottom: Spacing.md,
    borderRadius: 60,
    overflow: 'hidden',
    position: 'relative',
  },
  characterEyes: {
    position: 'absolute',
    top: '38%',
    left: '50%',
    flexDirection: 'row',
    transform: [{ translateX: -25 }],
    gap: 16,
  },
  eye: {
    width: 18,
    height: 22,
    borderRadius: 9,
    backgroundColor: Colors.ivoryBlueDark,
  },
  characterMouth: {
    position: 'absolute',
    bottom: '32%',
    left: '50%',
    width: 30,
    height: 15,
    marginLeft: -15,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderRightWidth: 3,
    borderColor: Colors.ivoryBlueDark,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  speechBubble: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '600',
    fontSize: 16,
    color: Colors.ivoryBlueDark,
    textAlign: 'center',
    lineHeight: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.card,
  },
  statValue: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 32,
    color: Colors.ivoryBlue,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 13,
    color: Colors.textGray,
    fontWeight: '500',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  campaignCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.lg,
    marginBottom: 12,
    borderLeftWidth: 6,
    ...Shadows.card,
  },
  campaignTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '600',
    fontSize: 18,
    color: Colors.ivoryBlueDark,
    marginBottom: Spacing.sm,
  },
  campaignProgress: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: Spacing.sm,
  },
  progressBar: {
    flex: 1,
    height: 12,
    backgroundColor: Colors.cream,
    borderRadius: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 12,
  },
  progressText: {
    fontSize: 13,
    color: Colors.ivoryBlue,
    fontWeight: '600',
    minWidth: 36,
  },
  campaignSubtitle: {
    fontSize: 13,
    color: Colors.textGray,
  },
});
