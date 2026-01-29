import * as React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/theme';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';

import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppNavigator';

const { width } = Dimensions.get('window');

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

export function TreasureWalletScreen() {
  const navigation = useNavigation<NavigationProp>();

  const winners = [
    { id: '1', name: 'Sarah J.', amount: '+$50', location: 'Park Cleanup • Seattle', avatar: 'SJ' },
    { id: '2', name: 'Mike K.', amount: '+$75', location: 'Beach Clean • Miami', avatar: 'MK' },
  ];

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
              <View style={styles.boostBadge}>
                <Text style={styles.boostIcon}>🎁</Text>
                <Text style={styles.boostText}>x2 Boost</Text>
              </View>
            </View>
            <Text style={styles.vaultAmount}>12,450</Text>
            <Text style={styles.vaultLabel}>Bounty Tickets</Text>
            
            <View style={styles.vaultFooter}>
              <View style={styles.earnedToday}>
                <View style={styles.plusIcon}><Text style={{ color: Colors.white }}>+</Text></View>
                <View>
                  <Text style={styles.earnedText}>+350</Text>
                  <Text style={styles.earnedLabel}>Earned Today</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.redeemButton}>
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

          {/* Prize Chests */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { marginBottom: Spacing.md }]}>Prize Chests</Text>
            
            <Card style={styles.chestCard}>
              <View style={styles.chestInfoRow}>
                <Image 
                  source={{ uri: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=150&q=80' }} 
                  style={styles.prizeImage} 
                />
                <View style={styles.chestDetails}>
                  <Text style={styles.prizeTitle}>Nike Gift Card</Text>
                  <View style={styles.timerRow}>
                    <Text>⏱️</Text>
                    <Text style={styles.timerText}>04:22:18 Left</Text>
                  </View>
                </View>
                <View style={styles.oddsCircle}>
                  <Text style={styles.oddsText}>75%</Text>
                  <Text style={styles.oddsLabel}>MY ODDS</Text>
                </View>
              </View>
              <Button title="Unlock Chest 50 Tlx" onPress={() => {}} style={styles.chestButton} />
            </Card>

            <Card style={[styles.chestCard, { opacity: 0.8 }]}>
              <View style={styles.chestInfoRow}>
                <View style={[styles.prizeImage, { backgroundColor: Colors.missionQuest, justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ fontSize: 30 }}>💵</Text>
                </View>
                <View style={styles.chestDetails}>
                  <Text style={styles.prizeTitle}>Community Pot</Text>
                  <View style={styles.timerRow}>
                    <Text>📅</Text>
                    <Text style={styles.timerText}>Tomorrow</Text>
                  </View>
                </View>
                <View style={[styles.oddsCircle, { borderColor: '#E5E7EB' }]}>
                  <View style={[styles.oddsProgress, { height: 10, width: 10, borderRadius: 5, backgroundColor: '#E5E7EB' }]} />
                  <Text style={styles.oddsLabel}>MY ODDS</Text>
                </View>
              </View>
              <TouchableOpacity style={styles.addEntriesBtn}>
                <Text style={styles.addEntriesText}>Add Tickets <Text style={{ fontWeight: 'normal' }}>+1 Entry</Text></Text>
              </TouchableOpacity>
            </Card>
          </View>

          {/* Winners Feed */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Winners Feed</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.winnersRow}>
              {winners.map(winner => (
                <Card key={winner.id} style={styles.winnerCard}>
                  <View style={styles.winnerHeader}>
                    <View style={styles.winnerAvatar}>
                      <Text style={styles.winnerAvatarText}>{winner.avatar}</Text>
                    </View>
                    <Text style={styles.winnerName}>{winner.name}</Text>
                    <View style={styles.winnerAmountBadge}>
                       <Text style={styles.winnerAmountText}>{winner.amount}</Text>
                    </View>
                  </View>
                  <Image 
                    source={{ uri: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=400&q=80' }} 
                    style={styles.winnerProof} 
                  />
                  <View style={styles.proofVerified}>
                    <Text>✅ Verified</Text>
                  </View>
                  <Text style={styles.winnerLoc}>{winner.location}</Text>
                </Card>
              ))}
            </ScrollView>
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
    marginBottom: Spacing.lg,
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
  chestCard: {
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  chestInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  prizeImage: {
    width: 64,
    height: 64,
    borderRadius: 16,
    marginRight: Spacing.md,
  },
  chestDetails: {
    flex: 1,
  },
  prizeTitle: {
    ...Typography.heading,
    fontSize: 18,
    marginBottom: 4,
  },
  timerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  timerText: {
    fontSize: 11,
    fontWeight: '800',
    color: Colors.primaryBright,
    marginLeft: 4,
  },
  oddsCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 4,
    borderColor: Colors.primaryBright,
    justifyContent: 'center',
    alignItems: 'center',
  },
  oddsText: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.primaryDark,
  },
  oddsLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: Colors.textGray,
  },
  oddsProgress: {
    backgroundColor: Colors.primaryBright,
  },
  chestButton: {
    marginTop: 0,
  },
  addEntriesBtn: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    alignItems: 'center',
  },
  addEntriesText: {
    fontSize: 14,
    fontWeight: '900',
    color: Colors.primaryDark,
  },
  winnersRow: {
    marginHorizontal: -Spacing.md,
    paddingLeft: Spacing.md,
  },
  winnerCard: {
    width: 200,
    marginRight: Spacing.md,
    padding: Spacing.sm,
  },
  winnerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  winnerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  winnerAvatarText: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.primaryBright,
  },
  winnerName: {
    fontSize: 12,
    fontWeight: '800',
    flex: 1,
  },
  winnerAmountBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  winnerAmountText: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.success,
  },
  winnerProof: {
    width: '100%',
    height: 100,
    borderRadius: 12,
    marginBottom: 8,
  },
  proofVerified: {
    position: 'absolute',
    bottom: 45,
    right: 12,
    backgroundColor: Colors.white,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    ...Shadows.card,
  },
  winnerLoc: {
    fontSize: 10,
    color: Colors.textGray,
    fontWeight: '600',
  },
});
