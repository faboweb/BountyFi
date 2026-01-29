// Profile Screen
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/context';
import { api } from '../../api/client';
import { formatWalletAddress } from '../../utils/image';

export function ProfileScreen() {
  const { user, logout } = useAuth();

  const { data: userData } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.users.getMe(),
    enabled: !!user,
  });

  const { data: referralCode } = useQuery({
    queryKey: ['referrals', 'my-code'],
    queryFn: () => api.referrals.getMyCode(),
    enabled: !!user,
  });

  const handleShareReferral = async () => {
    if (!referralCode) {
      return;
    }

    try {
      await Share.share({
        message: `Join BountyFi with my code ${referralCode.code} and get +1 ticket! Download the app: [app link]`,
        title: 'Share Referral Code',
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
        },
      },
    ]);
  };

  const displayUser = userData || user;

  if (!displayUser) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* User Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{displayUser.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Wallet</Text>
            <Text style={styles.value}>{formatWalletAddress(displayUser.wallet_address)}</Text>
          </View>
        </View>

        {/* Tickets */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tickets</Text>
          <Text style={styles.ticketCount}>{displayUser.tickets}</Text>
          <Text style={styles.ticketLabel}>Total tickets earned</Text>
        </View>

        {/* Referral Code */}
        {referralCode && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Referral Code</Text>
            <View style={styles.referralContainer}>
              <Text style={styles.referralCode}>{referralCode.code}</Text>
              <TouchableOpacity style={styles.shareButton} onPress={handleShareReferral}>
                <Text style={styles.shareButtonText}>Share</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.referralCount}>
              {referralCode.referrals_count} users referred
            </Text>
          </View>
        )}

        {/* Validator Stats */}
        {displayUser.validations_completed !== undefined && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Validator Stats</Text>
            <View style={styles.infoRow}>
              <Text style={styles.label}>Validations Completed</Text>
              <Text style={styles.value}>{displayUser.validations_completed}</Text>
            </View>
            {displayUser.accuracy_rate !== undefined && (
              <View style={styles.infoRow}>
                <Text style={styles.label}>Accuracy Rate</Text>
                <Text style={styles.value}>
                  {(displayUser.accuracy_rate * 100).toFixed(1)}%
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
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
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    color: '#8E8E93',
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  ticketCount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#007AFF',
    textAlign: 'center',
  },
  ticketLabel: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 4,
  },
  referralContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  referralCode: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
    flex: 1,
  },
  shareButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  referralCount: {
    fontSize: 12,
    color: '#8E8E93',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
