import * as React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme/theme';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

export function DonationsScreen() {
  const navigation = useNavigation<NavigationProp>();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity 
          style={styles.header}
          onPress={() => navigation.navigate('DonatorImpactDashboard')}
          activeOpacity={0.7}
        >
          <Badge label="Power the community" variant="gold" style={styles.headerBadge} />
          <Text style={styles.title}>Support Cleanups</Text>
          <Text style={styles.subtitle}>
            Empower BountyFi projects. Every reward dropped makes the world a cleaner place.
          </Text>
          <Text style={styles.impactLink}>View Your Impact Dashboard →</Text>
        </TouchableOpacity>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>💰 Money Donations</Text>
          <Text style={styles.cardText}>
            Fund future cleanup campaigns, rewards, and logistics. We'll route funds to the
            highest-impact projects.
          </Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>☕ Coffee & Food</Text>
          <Text style={styles.cardText}>
            Thank volunteers with coffee, snacks, or meal vouchers they can redeem after cleanups.
          </Text>
        </Card>

        <Card style={styles.card}>
          <Text style={styles.cardTitle}>🏨 Hotel & Spa</Text>
          <Text style={styles.cardText}>
            Offer nights in hotels, spa access, or wellness experiences as rewards for top
            contributors.
          </Text>
        </Card>

        <Card style={[styles.card, styles.lastCard]}>
          <Text style={styles.cardTitle}>🤝 Custom Ways</Text>
          <Text style={styles.cardText}>
            Have another way to support? We're happy to design custom rewards or long‑term
            sponsorships with you.
          </Text>
        </Card>

        <View style={styles.footer}>
          <Text style={styles.footerTitle}>Ready to become a legend?</Text>
          <Text style={styles.footerText}>
            Email us to discuss partnerships and start dropping loot for the community.
          </Text>
          <Button
            title="Get in Touch"
            onPress={() => {}}
            variant="primary"
            style={styles.footerButton}
          />
          <Text style={styles.email}>contact@bountyfi.org</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.lightGray,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  header: {
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  headerBadge: {
    marginBottom: Spacing.sm,
  },
  title: {
    ...Typography.heading,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  subtitle: {
    ...Typography.subHeading,
    textAlign: 'center',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  impactLink: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.primaryBright,
    fontSize: 14,
  },
  card: {
    marginBottom: Spacing.md,
  },
  lastCard: {
    marginBottom: Spacing.xl,
  },
  cardTitle: {
    ...Typography.body,
    fontWeight: '800',
    fontSize: 18,
    color: Colors.primaryDark,
    marginBottom: Spacing.sm,
  },
  cardText: {
    ...Typography.body,
    color: '#4B5563', // Slightly darker than textGray for readability
    lineHeight: 22,
  },
  footer: {
    marginTop: Spacing.lg,
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  footerTitle: {
    ...Typography.heading,
    fontSize: 22,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  footerText: {
    ...Typography.body,
    textAlign: 'center',
    color: Colors.textGray,
    marginBottom: Spacing.lg,
  },
  footerButton: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  email: {
    ...Typography.body,
    fontWeight: '700',
    color: Colors.primaryBright,
  },
});

