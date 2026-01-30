import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
  Image,
  SafeAreaView,
  Animated,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/context';
import { api } from '../../api/client';
import { formatWalletAddress } from '../../utils/image';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/theme';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';

export function ProfileScreen() {
  const { user, logout } = useAuth();
  const avatarPulse = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(avatarPulse, { toValue: 1.04, duration: 450, useNativeDriver: true }),
        Animated.timing(avatarPulse, { toValue: 1, duration: 450, useNativeDriver: true }),
      ]).start(() => setTimeout(pulse, 3500));
    };
    setTimeout(pulse, 600);
  }, [avatarPulse]);

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
    if (!referralCode) return;
    try {
      await Share.share({
        message: `Join BountyFi with my code ${referralCode.code} and get +1 ticket!`,
      });
    } catch (error) {
      console.error('Share failed:', error);
    }
  };

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: async () => await logout() },
    ]);
  };

  const displayUser = userData || user;

  if (!displayUser) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
           <Text style={styles.headerTitle}>Profile</Text>
           <TouchableOpacity onPress={handleLogout} style={styles.settingsBtn}>
             <Text style={styles.settingsIcon}>⚙️</Text>
           </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.userSection}>
            <Animated.View style={[styles.avatarLarge, { transform: [{ scale: avatarPulse }] }]}>
               <Text style={styles.avatarLargeText}>
                 {displayUser.email ? displayUser.email[0].toUpperCase() : 'U'}
               </Text>
               <View style={styles.levelBadge}>
                 <Text style={styles.levelText}>LVL 12</Text>
               </View>
            </Animated.View>
            <Text style={styles.userName}>{displayUser.email}</Text>
            <TouchableOpacity style={styles.walletBadge}>
              <Text style={styles.walletAddress}>{formatWalletAddress(displayUser.wallet_address)}</Text>
              <Text style={styles.copyIcon}>❐</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.statsGrid}>
            <Card style={styles.statCard}>
              <Text style={styles.statVal}>{displayUser.tickets || 0}</Text>
              <Text style={styles.statLabel}>Tickets</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statVal}>{displayUser.validations_completed || 0}</Text>
              <Text style={styles.statLabel}>Verified</Text>
            </Card>
            <Card style={styles.statCard}>
              <Text style={[styles.statVal, { color: Colors.primaryBright }]}>{referralCode?.referrals_count || 0}</Text>
              <Text style={styles.statLabel}>Friends</Text>
            </Card>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>INVITE FRIENDS</Text>
            <Card style={styles.referralCard}>
              <Text style={styles.referralDesc}>Give 50 tickets to friends and get 50 tickets when they verify their first mission.</Text>
              <View style={styles.referralCodeBox}>
                <Text style={styles.referralCode}>{referralCode?.code || 'BOUNTY50'}</Text>
                <TouchableOpacity style={styles.shareCodeBtn} onPress={handleShareReferral}>
                  <Text style={styles.shareCodeText}>Share</Text>
                </TouchableOpacity>
              </View>
            </Card>
          </View>

          <View style={styles.menuSection}>
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuIcon}>👤</Text>
              <Text style={styles.menuText}>Personal Information</Text>
              <Text style={styles.menuArrow}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuIcon}>🔔</Text>
              <Text style={styles.menuText}>Notifications</Text>
              <Text style={styles.menuArrow}>→</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.menuItem}>
              <Text style={styles.menuIcon}>🛡️</Text>
              <Text style={styles.menuText}>Privacy & Security</Text>
              <Text style={styles.menuArrow}>→</Text>
            </TouchableOpacity>
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
    backgroundColor: Colors.white,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
  },
  headerTitle: {
    ...Typography.heading,
    fontSize: 24,
  },
  settingsBtn: {
    padding: 8,
  },
  settingsIcon: {
    fontSize: 24,
  },
  content: {
    padding: Spacing.md,
  },
  userSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  avatarLarge: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    position: 'relative',
    borderWidth: 4,
    borderColor: '#DBEAFE',
  },
  avatarLargeText: {
    fontSize: 40,
    fontWeight: '900',
    color: Colors.primaryBright,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: Colors.accentGold,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  levelText: {
    fontSize: 10,
    fontWeight: '900',
    color: Colors.white,
  },
  userName: {
    ...Typography.heading,
    fontSize: 20,
    marginBottom: Spacing.xs,
  },
  walletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BorderRadius.full,
  },
  walletAddress: {
    fontSize: 12,
    color: Colors.textGray,
    marginRight: 6,
    fontWeight: '700',
  },
  copyIcon: {
    fontSize: 12,
    color: Colors.primaryBright,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.xl,
  },
  statCard: {
    width: '31%',
    alignItems: 'center',
    padding: Spacing.md,
  },
  statVal: {
    ...Typography.heading,
    fontSize: 18,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textGray,
    fontWeight: '700',
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.textGray,
    marginBottom: Spacing.md,
    letterSpacing: 1,
  },
  referralCard: {
    padding: Spacing.lg,
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
  },
  referralDesc: {
    fontSize: 14,
    color: Colors.primaryDark,
    lineHeight: 20,
    marginBottom: Spacing.md,
    fontWeight: '500',
  },
  referralCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.md,
    padding: 4,
    paddingLeft: 12,
  },
  referralCode: {
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    color: Colors.primaryBright,
    letterSpacing: 2,
  },
  shareCodeBtn: {
    backgroundColor: Colors.primaryBright,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
  },
  shareCodeText: {
    color: Colors.white,
    fontWeight: '800',
  },
  menuSection: {
    marginBottom: Spacing.xl,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIcon: {
    fontSize: 20,
    marginRight: Spacing.md,
    width: 24,
    textAlign: 'center',
  },
  menuText: {
    ...Typography.body,
    fontWeight: '700',
    flex: 1,
  },
  menuArrow: {
    color: Colors.textGray,
    fontWeight: 'bold',
  },
});
