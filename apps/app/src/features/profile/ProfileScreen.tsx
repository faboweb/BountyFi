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
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../auth/context';
import { api } from '../../api/client';
import { formatWalletAddress } from '../../utils/image';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/theme';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { AppStackParamList } from '../../navigation/AppNavigator';

type NavigationProp = NativeStackNavigationProp<AppStackParamList, 'Profile'>;

export function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
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
    if (Platform.OS === 'web') {
      if (window.confirm('Are you sure you want to logout?')) {
        logout();
      }
    } else {
      Alert.alert('Logout', 'Are you sure?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: async () => await logout() },
      ]);
    }
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
            <TouchableOpacity style={styles.menuItem} onPress={() => navigation.navigate('TreasureWallet')}>
              <Text style={styles.menuIcon}>💰</Text>
              <Text style={styles.menuText}>Wallet</Text>
              <Text style={styles.menuArrow}>→</Text>
            </TouchableOpacity>
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
            <TouchableOpacity style={styles.menuItem} onPress={handleLogout}>
              <Text style={styles.menuIcon}>🚪</Text>
              <Text style={[styles.menuText, { color: Colors.error }]} >Log Out</Text>
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
    backgroundColor: Colors.background,
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
    ...Typography.cardTitle,
    fontSize: 22,
  },
  settingsBtn: {
    padding: Spacing.sm,
  },
  settingsIcon: {
    fontSize: 22,
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
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
    position: 'relative',
    borderWidth: 0,
    ...Shadows.card,
  },
  avatarLargeText: {
    fontSize: 36,
    fontWeight: '700',
    color: Colors.chartBlue,
  },
  levelBadge: {
    position: 'absolute',
    bottom: -6,
    backgroundColor: Colors.textPrimary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  levelText: {
    ...Typography.metadata,
    fontSize: 10,
    fontWeight: '700',
    color: Colors.white,
  },
  userName: {
    ...Typography.cardTitle,
    fontSize: 17,
    marginBottom: Spacing.xs,
  },
  walletBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    ...Shadows.sm,
  },
  walletAddress: {
    ...Typography.metadata,
    marginRight: Spacing.sm,
    fontWeight: '600',
  },
  copyIcon: {
    ...Typography.metadata,
    color: Colors.chartBlue,
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
    ...Typography.cardTitle,
    fontSize: 18,
  },
  statLabel: {
    ...Typography.metadata,
    marginTop: 2,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    ...Typography.overline,
    marginBottom: Spacing.md,
  },
  referralCard: {
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    ...Shadows.card,
  },
  referralDesc: {
    ...Typography.metadata,
    lineHeight: 18,
    marginBottom: Spacing.md,
    color: Colors.textSecondary,
  },
  referralCodeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.md,
    padding: 4,
    paddingLeft: Spacing.md,
  },
  referralCode: {
    flex: 1,
    ...Typography.cardTitle,
    fontSize: 16,
    color: Colors.chartBlue,
    letterSpacing: 1,
  },
  shareCodeBtn: {
    backgroundColor: Colors.chartBlue,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    borderRadius: BorderRadius.md,
    ...Shadows.sm,
  },
  shareCodeText: {
    color: Colors.white,
    ...Typography.button,
    fontSize: 14,
  },
  menuSection: {
    marginBottom: Spacing.xl,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primaryLight,
  },
  menuIcon: {
    fontSize: 20,
    marginRight: Spacing.md,
    width: 24,
    textAlign: 'center',
  },
  menuText: {
    ...Typography.body,
    fontWeight: '600',
    flex: 1,
  },
  menuArrow: {
    ...Typography.metadata,
    color: Colors.textSecondary,
  },
});
