// Donate options for a campaign – same content as former Donations tab
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/theme';

export function CampaignDonateScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Support this campaign</Text>
        <Text style={styles.subtitle}>
          Individuals, companies, and NGOs can support BountyFi projects in many ways.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Money donations</Text>
          <Text style={styles.cardText}>
            Fund future cleanup campaigns, rewards, and logistics. We&apos;ll route funds to the
            highest-impact projects.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Coffee & food vouchers</Text>
          <Text style={styles.cardText}>
            Thank volunteers with coffee, snacks, or meal vouchers they can redeem after cleanups.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Hotel, sauna & spa vouchers</Text>
          <Text style={styles.cardText}>
            Offer nights in hotels, spa access, or wellness experiences as rewards for top
            contributors.
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Custom partnerships</Text>
          <Text style={styles.cardText}>
            Have another way to support? We&apos;re happy to design custom rewards or long‑term
            sponsorships with you.
          </Text>
        </View>

        <View style={styles.footerCard}>
          <Text style={styles.footerTitle}>Get in touch</Text>
          <Text style={styles.footerText}>
            Email us to discuss donations or partnerships and we&apos;ll get back to you with the
            next steps.
          </Text>
          <Text style={styles.footerHighlight}>contact@bountyfi.org</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: Spacing.lg,
  },
  title: {
    ...Typography.cardTitle,
    fontSize: 24,
    marginBottom: Spacing.sm,
    color: Colors.textPrimary,
  },
  subtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  cardTitle: {
    ...Typography.cardTitle,
    fontSize: 17,
    marginBottom: Spacing.sm,
  },
  cardText: {
    ...Typography.metadata,
    color: Colors.textSecondary,
  },
  footerCard: {
    backgroundColor: Colors.chartBlue,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginTop: Spacing.sm,
    ...Shadows.card,
  },
  footerTitle: {
    ...Typography.cardTitle,
    fontSize: 17,
    color: Colors.white,
    marginBottom: 6,
  },
  footerText: {
    ...Typography.metadata,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 8,
  },
  footerHighlight: {
    ...Typography.cardTitle,
    fontSize: 16,
    color: Colors.white,
  },
});
