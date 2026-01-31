import * as React from 'react';
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/theme';

type NavigationProp = NativeStackNavigationProp<AppStackParamList, 'DonateHome'>;

export function DonateHomeScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [showSecondLine, setShowSecondLine] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowSecondLine(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mottoCard}>
          <LinearGradient
            colors={[Colors.ivoryBlue, Colors.ivoryBlueLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.mottoGradient}
          >
            <Text style={styles.mottoTextLine1}>Donate for social impact.</Text>
            {showSecondLine && (
              <Text style={styles.mottoTextLine2}>Donate to motivate.</Text>
            )}
          </LinearGradient>
        </View>

        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => navigation.navigate('CreateQuest')}
          activeOpacity={0.85}
        >
          <View style={styles.optionTitleRow}>
            <Text style={styles.optionEmoji}>✨</Text>
            <Text style={styles.optionTitle}>Create a new quest</Text>
          </View>
          <Text style={styles.optionSubtitle}>
            Set up a new quest with location, goals, and a minimum 50 THB donation.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => navigation.navigate('DonateQuestList')}
          activeOpacity={0.85}
        >
          <View style={styles.optionTitleRow}>
            <Text style={styles.optionEmoji}>🎯</Text>
            <Text style={styles.optionTitle}>Donate to an existing quest</Text>
          </View>
          <Text style={styles.optionSubtitle}>
            Choose an active quest and add your donation.
          </Text>
        </TouchableOpacity>

        <View style={styles.jellyfishSection}>
          <Image
            source={require('../../../assets/jellyfish.png')}
            style={styles.jellyfishImage}
            resizeMode="contain"
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 80,
  },
  mottoCard: {
    borderRadius: BorderRadius.xl,
    overflow: 'hidden',
    marginBottom: Spacing.xl,
    ...Shadows.card,
  },
  mottoGradient: {
    padding: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mottoTextLine1: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 22,
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 28,
  },
  mottoTextLine2: {
    fontFamily: Typography.body.fontFamily,
    fontWeight: '400',
    fontSize: 16,
    color: Colors.white,
    textAlign: 'center',
    marginTop: Spacing.xs,
  },
  optionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.creamDark,
    minHeight: 140,
    justifyContent: 'center',
    overflow: 'visible',
    ...Shadows.card,
  },
  optionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  optionEmoji: {
    fontSize: 22,
  },
  optionTitle: {
    flex: 1,
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 18,
    color: Colors.ivoryBlueDark,
  },
  optionSubtitle: {
    fontSize: 14,
    color: Colors.textGray,
    lineHeight: 22,
  },
  jellyfishSection: {
    marginTop: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    backgroundColor: Colors.cream,
  },
  jellyfishImage: {
    width: 180,
    height: 180,
  },
});
