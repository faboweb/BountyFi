import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp as RNRouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/theme';
import { Button } from '../../components/Button';

type NavigationProp = NativeStackNavigationProp<AppStackParamList, 'SponsorMission'>;
type RouteProp = RNRouteProp<AppStackParamList, 'SponsorMission'>;

const SPONSORSHIP_TYPES = [
  { id: 'money', label: 'Money', emoji: '💵' },
  { id: 'vouchers', label: 'Vouchers', emoji: '🎫' },
  { id: 'snacks', label: 'Snacks', emoji: '🍪' },
  { id: 'drinks', label: 'Drinks', emoji: '🥤' },
  { id: 'other', label: 'Other', emoji: '🎁' },
] as const;

export function SponsorMissionScreen() {
  const route = useRoute<RouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { campaignId } = route.params;

  const [selectedType, setSelectedType] = React.useState<string | null>(null);
  const [amount, setAmount] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);

  const { data: campaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => api.campaigns.getById(campaignId),
  });

  const title = campaign?.title ?? 'Mission';

  const handleSubmit = () => {
    if (!selectedType) return;
    setSubmitted(true);
    setTimeout(() => navigation.goBack(), 1500);
  };

  if (submitted) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.successContainer}>
          <Text style={styles.successEmoji}>🙏</Text>
          <Text style={styles.successTitle}>Thank you!</Text>
          <Text style={styles.successText}>Your sponsorship offer has been sent. The mission organizers will get in touch.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <Text style={styles.headerIconText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sponsor mission</Text>
        <View style={styles.headerIcon} />
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.introCard}>
            <Text style={styles.introTitle}>Support "{title}"</Text>
            <Text style={styles.introSubtitle}>
              Offer money, vouchers, snacks, drinks, or anything else. Describe what you’d like to contribute below.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What are you offering?</Text>
            <View style={styles.typeRow}>
              {SPONSORSHIP_TYPES.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => setSelectedType(t.id)}
                  style={[styles.typeChip, selectedType === t.id && styles.typeChipSelected]}
                >
                  <Text style={styles.typeEmoji}>{t.emoji}</Text>
                  <Text style={[styles.typeLabel, selectedType === t.id && styles.typeLabelSelected]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {selectedType === 'money' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Amount (THB)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. 500"
                placeholderTextColor={Colors.textGray}
                value={amount}
                onChangeText={setAmount}
                keyboardType="numeric"
              />
            </View>
          )}

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Details (optional)</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="e.g. 10 free coffees, 50 baht vouchers, 2 boxes of snacks…"
              placeholderTextColor={Colors.textGray}
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={3}
            />
          </View>

          <View style={styles.footer}>
            <Button
              title="Submit offer"
              onPress={handleSubmit}
              variant="primary"
              style={styles.ctaButton}
              disabled={!selectedType}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.cream,
  },
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconText: {
    fontSize: 24,
    color: Colors.ivoryBlueDark,
  },
  headerTitle: {
    ...Typography.body,
    fontWeight: '700',
    fontSize: 18,
    color: Colors.ivoryBlueDark,
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 80,
  },
  introCard: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    ...Shadows.card,
  },
  introTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 20,
    color: Colors.ivoryBlueDark,
    marginBottom: Spacing.sm,
  },
  introSubtitle: {
    fontSize: 14,
    color: Colors.textGray,
    lineHeight: 22,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '600',
    fontSize: 16,
    color: Colors.ivoryBlueDark,
    marginBottom: Spacing.sm,
  },
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.creamDark,
    ...Shadows.card,
  },
  typeChipSelected: {
    borderColor: Colors.ivoryBlue,
    backgroundColor: Colors.ivoryBlueLight + '20',
  },
  typeEmoji: {
    fontSize: 18,
    marginRight: 6,
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.ivoryBlueDark,
  },
  typeLabelSelected: {
    color: Colors.ivoryBlueDark,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.ivoryBlueDark,
    borderWidth: 1,
    borderColor: Colors.creamDark,
    ...Shadows.card,
  },
  inputMultiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  footer: {
    marginTop: Spacing.lg,
  },
  ctaButton: {
    width: '100%',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  successEmoji: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  successTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 24,
    color: Colors.ivoryBlueDark,
    marginBottom: Spacing.sm,
  },
  successText: {
    fontSize: 16,
    color: Colors.textGray,
    textAlign: 'center',
    lineHeight: 24,
  },
});
