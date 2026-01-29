import * as React from 'react';
import { View, Text, StyleSheet, FlatList, SafeAreaView, Image, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../api/client';
import { MissionCard } from '../../components/MissionCard';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/theme';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

export function CampaignsScreen() {
  const navigation = useNavigation<NavigationProp>();
  
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.campaigns.getAll(),
  });

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Profile Bar */}
      <View style={styles.profileBar}>
        <View style={styles.avatarContainer}>
          <View style={styles.avatarPlaceholder} />
          <View style={styles.onlineBadge} />
        </View>
        <View style={styles.statsContainer}>
          <View style={styles.statPill}>
            <Text style={styles.statEmoji}>🔥</Text>
            <Text style={styles.statValue}>12</Text>
          </View>
          <View style={[styles.statPill, styles.currencyPill]}>
            <Text style={styles.statEmoji}>💎</Text>
            <Text style={styles.statValue}>450</Text>
          </View>
        </View>
      </View>

      {/* Mascot Message */}
      <TouchableOpacity 
        style={styles.mascotContainer} 
        activeOpacity={0.8}
        onPress={() => navigation.navigate('DailyTaskSelection')}
      >
        <View style={styles.mascotBox}>
          <View style={styles.mascotPlaceholder}>
            <Text style={{ fontSize: 30 }}>🤖</Text>
          </View>
          <View style={styles.mascotBadge}>
            <Text style={styles.mascotBadgeText}>5</Text>
          </View>
        </View>
        <View style={styles.speechBubble}>
          <View style={styles.speechArrow} />
          <Text style={styles.speechTitle}>Let's go, Alex!</Text>
          <Text style={styles.speechSubtitle}>Keep that streak alive!</Text>
        </View>
      </TouchableOpacity>
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
        data={campaigns}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        renderItem={({ item, index }) => {
          // Mocking some data for the visuals matching the screenshot
          const isCleanup = item.title.toLowerCase().includes('cleanup');
          const isQuest = item.title.toLowerCase().includes('coffee') || item.title.toLowerCase().includes('shop');
          
          let type = 'MISSION';
          let typeColor = Colors.missionPhoto;
          let progress = 75;
          let progressLabel = '75% FUNDED';
          let xp = 50;
          let distance = '0.2 MI';
          let buttonLabel = 'START LEVEL';

          if (isCleanup) {
            type = 'BEFORE / AFTER';
            typeColor = Colors.missionCleanup;
            progress = 50;
            progressLabel = '50% SPOTS FULL';
            xp = 120;
            distance = '1.5 MI';
            buttonLabel = 'PLAY NOW';
          } else if (isQuest) {
            type = 'CHECK-IN QUEST';
            typeColor = Colors.missionQuest;
            progress = 0;
            progressLabel = '';
            xp = 0;
            distance = '0.8 MI';
            buttonLabel = 'VIEW DETAILS';
          }

          return (
            <MissionCard
              title={item.title}
              type={type}
              typeColor={typeColor}
              progress={progress}
              progressLabel={progressLabel}
              prize={`$${item.prize_total}`}
              timeLeft="4h 12m"
              xp={xp}
              distance={distance}
              buttonLabel={buttonLabel}
              isPremium={index === 2} // Just to match the 3rd card being premium
              onPress={() => navigation.navigate('CampaignDetail', { campaignId: item.id })}
            />
          );
        }}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.primaryDark, // Dark blue header background
  },
  headerContainer: {
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    marginBottom: Spacing.lg,
  },
  profileBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E5E7EB',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#78C800',
    borderWidth: 2,
    borderColor: Colors.primaryDark,
  },
  statsContainer: {
    flexDirection: 'row',
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
    marginLeft: Spacing.sm,
  },
  currencyPill: {
    // optional specific style
  },
  statEmoji: {
    marginRight: 4,
  },
  statValue: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 14,
  },
  mascotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mascotBox: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  mascotPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 16,
    backgroundColor: '#22D3EE',
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.card,
  },
  mascotBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#FF4B4B',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.white,
  },
  mascotBadgeText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '900',
  },
  speechBubble: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.md,
    position: 'relative',
  },
  speechArrow: {
    position: 'absolute',
    left: -10,
    top: '50%',
    marginTop: -10,
    width: 0,
    height: 0,
    borderTopWidth: 10,
    borderTopColor: 'transparent',
    borderBottomWidth: 10,
    borderBottomColor: 'transparent',
    borderRightWidth: 10,
    borderRightColor: Colors.white,
  },
  speechTitle: {
    ...Typography.body,
    fontWeight: '800',
    fontSize: 16,
    color: Colors.primaryDark,
  },
  speechSubtitle: {
    ...Typography.body,
    fontSize: 12,
    color: Colors.textGray,
  },
  list: {
    backgroundColor: Colors.lightGray,
    padding: Spacing.lg,
    paddingTop: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.lightGray,
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textGray,
  },
});
