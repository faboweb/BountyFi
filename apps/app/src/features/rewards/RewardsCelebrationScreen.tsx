import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/theme';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;
type RoutePropRewards = RouteProp<AppStackParamList, 'RewardsCelebration'>;

const DEFAULT_TOTAL = 35;
const DEFAULT_BREAKDOWN = [
  { label: 'Photo Submission', value: '+20' },
  { label: 'Streak Bonus (Day 12)', value: '+10' },
  { label: 'Jury Accuracy', value: '+5' },
];
const DEFAULT_BALANCE = 282;

export function RewardsCelebrationScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RoutePropRewards>();
  const params = route.params ?? {};
  const total = (params as { total?: number }).total ?? DEFAULT_TOTAL;
  const balance = (params as { balance?: number }).balance ?? DEFAULT_BALANCE;
  const breakdown = (params as { breakdown?: { label: string; value: string }[] }).breakdown ?? DEFAULT_BREAKDOWN;

  const pulseScale = React.useRef(new Animated.Value(1)).current;
  React.useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(pulseScale, { toValue: 1.06, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseScale, { toValue: 1, duration: 500, useNativeDriver: true }),
      ]).start(() => setTimeout(pulse, 2000));
    };
    setTimeout(pulse, 400);
  }, [pulseScale]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <LinearGradient
        colors={[Colors.sunshine, Colors.coral]}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Celebration character – smaller pulse animation (same style, gold/coral) */}
          <Animated.View style={[styles.celebrationCharacter, { transform: [{ scale: pulseScale }] }]}>
            <View style={styles.characterEyes}>
              <View style={styles.eye} />
              <View style={styles.eye} />
            </View>
            <View style={styles.characterMouth} />
          </Animated.View>

          <Text style={styles.rewardAmount}>+{total}</Text>
          <Text style={styles.rewardLabel}>Tickets Earned! 🎫</Text>

          <View style={styles.rewardBreakdown}>
            {breakdown.map((item, index) => (
              <View key={index} style={styles.breakdownItem}>
                <Text style={styles.breakdownLabel}>{item.label}</Text>
                <Text style={styles.breakdownValue}>{item.value}</Text>
              </View>
            ))}
            <View style={styles.breakdownTotal}>
              <Text style={styles.breakdownTotalLabel}>Total Balance</Text>
              <Text style={styles.breakdownTotalValue}>{balance}</Text>
            </View>
          </View>

          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => navigation.navigate('Campaigns')}
            style={styles.ctaWrap}
          >
            <LinearGradient
              colors={[Colors.ivoryBlue, Colors.ivoryBlueLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.ctaButton}
            >
              <Text style={styles.ctaText}>Continue Mission 🚀</Text>
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.coral,
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 60,
  },
  celebrationCharacter: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: Colors.white,
    alignSelf: 'center',
    marginTop: 40,
    marginBottom: Spacing.lg,
    position: 'relative',
    ...Shadows.card,
  },
  characterEyes: {
    position: 'absolute',
    top: '38%',
    left: '50%',
    flexDirection: 'row',
    transform: [{ translateX: -28 }],
    gap: 20,
  },
  eye: {
    width: 22,
    height: 26,
    borderRadius: 11,
    backgroundColor: Colors.ivoryBlueDark,
  },
  characterMouth: {
    position: 'absolute',
    bottom: '36%',
    left: '50%',
    width: 40,
    height: 20,
    marginLeft: -20,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderColor: Colors.ivoryBlueDark,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 40,
    borderBottomRightRadius: 40,
  },
  rewardAmount: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 72,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  rewardLabel: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '600',
    fontSize: 24,
    color: Colors.white,
    textAlign: 'center',
    marginBottom: 40,
  },
  rewardBreakdown: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  breakdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: Colors.cream,
  },
  breakdownLabel: {
    fontSize: 15,
    color: Colors.textGray,
  },
  breakdownValue: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 18,
    color: Colors.ivoryBlue,
  },
  breakdownTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Spacing.lg,
    marginTop: Spacing.sm,
    borderTopWidth: 3,
    borderTopColor: Colors.ivoryBlue,
  },
  breakdownTotalLabel: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '600',
    fontSize: 16,
    color: Colors.ivoryBlueDark,
  },
  breakdownTotalValue: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 24,
    color: Colors.ivoryBlue,
  },
  ctaWrap: {
    marginTop: Spacing.lg,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    ...Shadows.primary,
  },
  ctaButton: {
    paddingVertical: 18,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaText: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '600',
    fontSize: 18,
    color: Colors.white,
  },
});
