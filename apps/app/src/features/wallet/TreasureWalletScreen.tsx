import * as React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/theme';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppNavigator';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

export function TreasureWalletScreen() {
  const navigation = useNavigation<NavigationProp>();
  const boostPulse = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(boostPulse, { toValue: 1.12, duration: 400, useNativeDriver: true }),
        Animated.timing(boostPulse, { toValue: 1, duration: 400, useNativeDriver: true }),
      ]).start(() => setTimeout(pulse, 2800));
    };
    setTimeout(pulse, 500);
  }, [boostPulse]);

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Treasure Wallet</Text>
        <TouchableOpacity style={styles.headerButton}>
          <Text style={styles.headerButtonText}>⋮</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          
          {/* My Vault Card */}
          <Card style={styles.vaultCard}>
            <View style={styles.vaultHeader}>
              <Badge label="MY VAULT" variant="blue" style={styles.vaultBadge} />
              <Animated.View style={[styles.boostBadge, { transform: [{ scale: boostPulse }] }]}>
                <Text style={styles.boostIcon}>🎁</Text>
                <Text style={styles.boostText}>x2 Boost</Text>
              </Animated.View>
            </View>
            <Text style={styles.vaultAmount}>23</Text>
            <Text style={styles.vaultLabel}>Bounty Tickets</Text>
            <View style={styles.diamondsRow}>
              <Text style={styles.diamondsValue}>32</Text>
              <Text style={styles.diamondsLabel}>💎 Diamonds</Text>
            </View>
            <View style={styles.vaultFooter}>
              <View style={styles.earnedToday}>
                <View style={styles.plusIcon}><Text style={{ color: Colors.white }}>+</Text></View>
                <View>
                  <Text style={styles.earnedText}>+350</Text>
                  <Text style={styles.earnedLabel}>Earned Today</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.redeemButton}
                onPress={() => navigation.navigate('RedeemChallenges' as never)}
              >
                <Text style={styles.redeemText}>Redeem</Text>
              </TouchableOpacity>
            </View>
          </Card>

          {/* Mini Leaderboard */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionEmoji}>🏆</Text>
              <Text style={styles.sectionTitle}>Leaderboard</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Leaderboard' as any)}>
                <Text style={styles.viewAll}>View Top 100</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.leaderboardRow}>
              {/* 2nd */}
              <View style={styles.leaderItem}>
                <View style={[styles.avatarCircle, { borderColor: '#E5E7EB' }]}>
                  <Text style={styles.avatarText}>SJ</Text>
                  <View style={[styles.rankBadge, { backgroundColor: '#B0B0B0' }]}>
                    <Text style={styles.rankText}>2nd</Text>
                  </View>
                </View>
                <View style={styles.leaderBar} />
                <Text style={styles.leaderVal}>8.2k</Text>
                <Text style={styles.leaderName}>Sarah J.</Text>
              </View>

              {/* 1st */}
              <View style={[styles.leaderItem, styles.firstPlace]}>
                <View style={[styles.avatarCircle, { width: 70, height: 70, borderColor: Colors.accentGold }]}>
                  <Text style={styles.crown}>👑</Text>
                  <Text style={[styles.avatarText, { fontSize: 24 }]}>MK</Text>
                  <View style={[styles.rankBadge, { backgroundColor: Colors.accentGold }]}>
                    <Text style={styles.rankText}>1st</Text>
                  </View>
                </View>
                <View style={[styles.leaderBar, { backgroundColor: '#FFF9C4', height: 100 }]} />
                <Text style={[styles.leaderVal, { color: Colors.accentGoldDeep }]}>12.5k</Text>
                <Text style={[styles.leaderName, { color: Colors.primaryBright }]}>Mike K.</Text>
              </View>

              {/* 3rd */}
              <View style={styles.leaderItem}>
                <View style={[styles.avatarCircle, { borderColor: '#FFCCBC' }]}>
                  <Text style={styles.avatarText}>AL</Text>
                  <View style={[styles.rankBadge, { backgroundColor: '#FF8A65' }]}>
                    <Text style={styles.rankText}>3rd</Text>
                  </View>
                </View>
                <View style={[styles.leaderBar, { backgroundColor: '#FFF3E0' }]} />
                <Text style={styles.leaderVal}>5.1k</Text>
                <Text style={styles.leaderName}>Alex L.</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    height: 56,
    backgroundColor: Colors.white,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: 24,
    color: Colors.primaryDark,
  },
  headerTitle: {
    ...Typography.body,
    fontWeight: '800',
    fontSize: 18,
  },
  headerButton: {
    padding: 8,
  },
  headerButtonText: {
    fontSize: 24,
    color: Colors.primaryDark,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
  },
  vaultCard: {
    padding: Spacing.lg,
    backgroundColor: Colors.primaryBright,
    borderColor: '#2563EB',
    borderWidth: 0,
    borderRadius: 24,
    marginBottom: Spacing.xl,
  },
  vaultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  vaultBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  boostBadge: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.card,
  },
  boostIcon: {
    marginRight: 4,
  },
  boostText: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.primaryBright,
  },
  vaultAmount: {
    ...Typography.heading,
    color: Colors.white,
    fontSize: 48,
    textAlign: 'left',
  },
  vaultLabel: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '700',
  },
  diamondsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.lg,
  },
  diamondsValue: {
    ...Typography.heading,
    color: Colors.sunshine,
    fontSize: 24,
  },
  diamondsLabel: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 16,
    fontWeight: '600',
  },
  vaultFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
    marginHorizontal: -Spacing.lg,
    marginBottom: -Spacing.lg,
    padding: Spacing.md,
    paddingHorizontal: Spacing.lg,
  },
  earnedToday: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  plusIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  earnedText: {
    color: Colors.white,
    fontWeight: '900',
    fontSize: 18,
  },
  earnedLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 10,
    fontWeight: '700',
  },
  redeemButton: {
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  redeemText: {
    color: Colors.primaryBright,
    fontWeight: '800',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionTitle: {
    ...Typography.heading,
    fontSize: 20,
    flex: 1,
  },
  viewAll: {
    color: Colors.primaryBright,
    fontWeight: '700',
  },
  leaderboardRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  leaderItem: {
    alignItems: 'center',
    width: width * 0.25,
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 35,
    backgroundColor: '#F3F4F6',
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    position: 'relative',
  },
  avatarText: {
    fontWeight: '800',
    fontSize: 20,
    color: Colors.primaryDark,
  },
  rankBadge: {
    position: 'absolute',
    bottom: -8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  rankText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: '900',
  },
  leaderBar: {
    width: '80%',
    height: 60,
    backgroundColor: '#F3F4F6',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  leaderVal: {
    fontWeight: '900',
    fontSize: 16,
    marginTop: 8,
  },
  leaderName: {
    fontSize: 12,
    color: Colors.textGray,
    fontWeight: '700',
  },
  firstPlace: {
    zIndex: 1,
    marginHorizontal: -8,
  },
  crown: {
    position: 'absolute',
    top: -20,
    fontSize: 24,
    zIndex: 2,
  },
});
