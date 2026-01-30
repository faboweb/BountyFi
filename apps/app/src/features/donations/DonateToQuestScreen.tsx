import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/theme';
import { Button } from '../../components/Button';

type NavigationProp = NativeStackNavigationProp<AppStackParamList, 'DonateToQuest'>;
type RouteProp = RouteProp<AppStackParamList, 'DonateToQuest'>;

const DONATION_TYPES = [
  { id: 'money', label: 'Money', emoji: '💵' },
  { id: 'vouchers', label: 'Vouchers', emoji: '🎫' },
  { id: 'coffee', label: 'Coffee', emoji: '☕' },
  { id: 'meals', label: 'Meals', emoji: '🍽️' },
  { id: 'hotel', label: 'Hotel stays', emoji: '🏨' },
] as const;

export function DonateToQuestScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { campaignId } = route.params;

  const [donationType, setDonationType] = React.useState<string>('money');
  const [amount, setAmount] = React.useState('');
  const [details, setDetails] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [donated, setDonated] = React.useState(false);

  const { data: campaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => api.campaigns.getById(campaignId),
  });

  const isMoney = donationType === 'money';
  const amountNum = parseInt(amount, 10) || 0;
  const hasAmount = isMoney ? amountNum > 0 : true;
  const hasDetails = !isMoney ? details.trim().length > 0 : true;
  const isValid = hasAmount && (isMoney || hasDetails);

  const handleDonate = () => {
    if (!isValid) {
      if (isMoney && amountNum <= 0) Alert.alert('Amount', 'Enter an amount (any amount is welcome).');
      else if (!isMoney && !details.trim()) Alert.alert('Details', 'Describe what you\'re offering (e.g. 10 coffees, 2 night stay).');
      return;
    }
    setDonated(true);
  };

  const handleDone = () => {
    navigation.navigate('DonateHome');
  };

  if (donated) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.thankYouContainer}>
          <LinearGradient
            colors={[Colors.ivoryBlueLight + '40', Colors.ivoryBlue + '60']}
            style={styles.octopusCircle}
          >
            <Text style={styles.octopusEmoji}>🐙</Text>
          </LinearGradient>
          <Text style={styles.thankYouTitle}>Thank you for making an impact</Text>
          <Text style={styles.thankYouSub}>
            Your donation helps this quest succeed.
          </Text>
          <Button title="Done" onPress={handleDone} variant="primary" style={styles.doneBtn} />
        </View>
      </SafeAreaView>
    );
  }

  if (!campaign) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add donation</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.questCard}>
          <Text style={styles.questTitle}>{campaign.title}</Text>
          <Text style={styles.questMeta}>Pool: {campaign.prize_total} THB</Text>
        </View>

        <Text style={styles.sectionLabel}>What are you donating?</Text>
        <View style={styles.typeRow}>
          {DONATION_TYPES.map((t) => (
            <TouchableOpacity
              key={t.id}
              style={[styles.typeChip, donationType === t.id && styles.typeChipSelected]}
              onPress={() => setDonationType(t.id)}
            >
              <Text style={styles.typeEmoji}>{t.emoji}</Text>
              <Text style={[styles.typeLabel, donationType === t.id && styles.typeLabelSelected]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {isMoney && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Amount (THB)</Text>
            <TextInput
              style={styles.input}
              placeholder="Any amount"
              placeholderTextColor={Colors.textGray}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />
          </View>
        )}

        {!isMoney && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Details</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="e.g. 10 free coffees, 2-night hotel stay, meal vouchers..."
              placeholderTextColor={Colors.textGray}
              value={details}
              onChangeText={setDetails}
              multiline
              numberOfLines={2}
            />
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Message (optional)</Text>
          <TextInput
            style={[styles.input, styles.inputMultiline]}
            placeholder="e.g. Keep up the great work!"
            placeholderTextColor={Colors.textGray}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={2}
          />
        </View>

        <Button
          title="Add donation"
          onPress={handleDonate}
          variant="primary"
          style={styles.submitBtn}
          disabled={!isValid}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.cream },
  container: { flex: 1, backgroundColor: Colors.cream },
  center: { justifyContent: 'center', alignItems: 'center' },
  loadingText: { fontSize: 16, color: Colors.textGray },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.cream,
    borderBottomWidth: 1,
    borderBottomColor: Colors.creamDark,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 24, color: Colors.ivoryBlueDark },
  headerTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 18,
    color: Colors.ivoryBlueDark,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: 80 },
  questCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.ivoryBlue,
    ...Shadows.card,
  },
  questTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 18,
    color: Colors.ivoryBlueDark,
  },
  questMeta: { fontSize: 14, color: Colors.textGray, marginTop: 4 },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.ivoryBlueDark,
    marginBottom: Spacing.sm,
  },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.creamDark,
    ...Shadows.sm,
  },
  typeChipSelected: { borderColor: Colors.ivoryBlue, backgroundColor: Colors.ivoryBlueLight + '20' },
  typeEmoji: { fontSize: 18, marginRight: 6 },
  typeLabel: { fontSize: 14, fontWeight: '600', color: Colors.ivoryBlueDark },
  typeLabelSelected: { color: Colors.ivoryBlueDark },
  inputGroup: { marginBottom: Spacing.lg },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.ivoryBlueDark,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    fontSize: 16,
    color: Colors.ivoryBlueDark,
    borderWidth: 1,
    borderColor: Colors.creamDark,
    ...Shadows.sm,
  },
  inputMultiline: { minHeight: 72, textAlignVertical: 'top' },
  submitBtn: { marginTop: Spacing.md },
  thankYouContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  octopusCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    ...Shadows.card,
  },
  octopusEmoji: { fontSize: 88 },
  thankYouTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 24,
    color: Colors.ivoryBlueDark,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  thankYouSub: {
    fontSize: 16,
    color: Colors.textGray,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  doneBtn: { minWidth: 200 },
});
