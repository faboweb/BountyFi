import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/theme';

type NavigationProp = NativeStackNavigationProp<AppStackParamList, 'DonateHome'>;

export function DonateHomeScreen() {
  const navigation = useNavigation<NavigationProp>();

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
            <Text style={styles.mottoText}>
              Donate for social impact.{'\n'}Donate to motivate.
            </Text>
          </LinearGradient>
        </View>

        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => navigation.navigate('CreateQuest')}
          activeOpacity={0.85}
        >
          <View style={styles.optionIcon}>
            <Text style={styles.optionEmoji}>✨</Text>
          </View>
          <Text style={styles.optionTitle}>Create a new quest</Text>
          <Text style={styles.optionSubtitle}>
            Set up a new quest with location, goals, and a minimum 50 THB donation.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.optionCard}
          onPress={() => navigation.navigate('DonateQuestList')}
          activeOpacity={0.85}
        >
          <View style={styles.optionIcon}>
            <Text style={styles.optionEmoji}>🎯</Text>
          </View>
          <Text style={styles.optionTitle}>Donate to an existing quest</Text>
          <Text style={styles.optionSubtitle}>
            Choose an active quest and add your donation.
          </Text>
        </TouchableOpacity>
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
  mottoText: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 20,
    color: Colors.white,
    textAlign: 'center',
    lineHeight: 30,
  },
  optionCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.creamDark,
    ...Shadows.card,
  },
  optionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.cream,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  optionEmoji: {
    fontSize: 24,
  },
  optionTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 18,
    color: Colors.ivoryBlueDark,
    marginBottom: Spacing.xs,
  },
  optionSubtitle: {
    fontSize: 14,
    color: Colors.textGray,
    lineHeight: 22,
  },
});
