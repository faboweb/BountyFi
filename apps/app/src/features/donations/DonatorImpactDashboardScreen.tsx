import * as React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Image, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/theme';
import { Card } from '../../components/Card';
import { ProgressBar } from '../../components/ProgressBar';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

export function DonatorImpactDashboardScreen() {
  const navigation = useNavigation<NavigationProp>();

  const impactStats = [
    { label: 'Plastic Removed', value: '450 lbs', icon: '♻️', color: Colors.missionCleanup },
    { label: 'Cleanups Funded', value: '12 Total', icon: '🌊', color: Colors.missionPhoto },
    { label: 'CO2 Offset', value: '1.2 Tons', icon: '🌱', color: Colors.success },
  ];

  const topContributors = [
    { name: 'Alice', amount: '$5,200', avatar: '👩‍🦳' },
    { name: 'Bob', amount: '$3,150', avatar: '👨‍🦱' },
    { name: 'Charlie', amount: '$2,800', avatar: '👨‍🦳' },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Impact Dashboard</Text>
        <TouchableOpacity style={styles.shareButton}>
          <Text style={{ fontSize: 20 }}>📤</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {/* Main Impact Card */}
        <Card style={styles.mainCard}>
          <Text style={styles.mainLabel}>YOUR LIFETIME IMPACT</Text>
          <Text style={styles.mainAmount}>$1,250.00</Text>
          <Badge label="LEGENDARY DONOR" variant="gold" style={styles.mainBadge} />
          
          <View style={styles.mainStatsRow}>
            <View style={styles.miniStat}>
              <Text style={styles.miniStatValue}>24</Text>
              <Text style={styles.miniStatLabel}>Loot Dropped</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.miniStat}>
              <Text style={styles.miniStatValue}>1.5k</Text>
              <Text style={styles.miniStatLabel}>Volunteers Fed</Text>
            </View>
          </View>
        </Card>

        {/* Community Goal */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>COMMUNITY GOAL</Text>
          <Card style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalTitle}>March River Cleanup</Text>
              <Text style={styles.goalProgress}>$8,450 / $10,000</Text>
            </View>
            <ProgressBar progress={84.5} color={Colors.primaryBright} style={styles.progressBar} />
            <Text style={styles.goalDetail}>85% funded • 5 days left</Text>
          </Card>
        </View>

        {/* Impact Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ENVIRONMENTAL IMPACT</Text>
          <View style={styles.impactGrid}>
            {impactStats.map((stat, index) => (
              <Card key={index} style={styles.statCard}>
                <Text style={styles.statEmoji}>{stat.icon}</Text>
                <Text style={styles.statValue}>{stat.value}</Text>
                <Text style={styles.statLabel}>{stat.label}</Text>
              </Card>
            ))}
          </View>
        </View>

        {/* Top Contributors */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TOP CONTRIBUTORS</Text>
          <Card style={styles.contributorCard}>
            {topContributors.map((person, index) => (
              <View key={index} style={[styles.contributorRow, index < 2 && styles.rowDivider]}>
                <View style={styles.personInfo}>
                  <View style={styles.avatarMini}><Text>{person.avatar}</Text></View>
                  <Text style={styles.personName}>{person.name}</Text>
                </View>
                <Text style={styles.personAmount}>{person.amount}</Text>
              </View>
            ))}
          </Card>
        </View>

        <Button 
          title="MAKE A NEW DONATION" 
          onPress={() => navigation.navigate('DonationsTab' as any)} 
          variant="success" 
          style={styles.ctaButton} 
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.lg,
    borderBottomWidth: 2,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: 4,
  },
  backText: {
    fontSize: 24,
    color: Colors.primaryDark,
    fontWeight: 'bold',
  },
  headerTitle: {
    ...Typography.heading,
    fontSize: 20,
    color: Colors.primaryDark,
  },
  shareButton: {
    padding: 4,
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  mainCard: {
    backgroundColor: Colors.primaryDark,
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    marginBottom: Spacing.xl,
  },
  mainLabel: {
    ...Typography.body,
    fontSize: 12,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
    marginBottom: 8,
  },
  mainAmount: {
    ...Typography.heading,
    fontSize: 40,
    color: Colors.white,
    marginBottom: Spacing.md,
  },
  mainBadge: {
    marginBottom: Spacing.xl,
  },
  mainStatsRow: {
    flexDirection: 'row',
    width: '100%',
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  miniStat: {
    flex: 1,
    alignItems: 'center',
  },
  miniStatValue: {
    ...Typography.heading,
    fontSize: 20,
    color: Colors.white,
  },
  miniStatLabel: {
    ...Typography.body,
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
  },
  statDivider: {
    width: 1,
    height: '60%',
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignSelf: 'center',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.heading,
    fontSize: 14,
    color: Colors.textGray,
    marginBottom: Spacing.md,
  },
  goalCard: {
    padding: Spacing.lg,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  goalTitle: {
    ...Typography.body,
    fontWeight: '800',
    fontSize: 16,
    color: Colors.primaryDark,
  },
  goalProgress: {
    ...Typography.body,
    fontWeight: '700',
    fontSize: 14,
    color: Colors.primaryBright,
  },
  progressBar: {
    marginBottom: 8,
  },
  goalDetail: {
    ...Typography.body,
    fontSize: 12,
    color: Colors.textGray,
  },
  impactGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    padding: Spacing.md,
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  statEmoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  statValue: {
    ...Typography.heading,
    fontSize: 20,
    color: Colors.primaryDark,
  },
  statLabel: {
    ...Typography.body,
    fontSize: 12,
    color: Colors.textGray,
  },
  contributorCard: {
    padding: 0,
    overflow: 'hidden',
  },
  contributorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  personInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  personName: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.primaryDark,
  },
  personAmount: {
    ...Typography.body,
    fontWeight: '800',
    color: Colors.success,
  },
  ctaButton: {
    marginTop: Spacing.lg,
  },
});
