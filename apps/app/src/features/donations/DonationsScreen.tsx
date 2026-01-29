import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';

export function DonationsScreen() {
  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Support Cleanups</Text>
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
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#000',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  cardText: {
    fontSize: 14,
    color: '#555',
  },
  footerCard: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    padding: 18,
    marginTop: 8,
  },
  footerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  footerText: {
    fontSize: 14,
    color: '#e6f0ff',
    marginBottom: 8,
  },
  footerHighlight: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});

