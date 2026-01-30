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
  Modal,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/theme';
import { Button } from '../../components/Button';
import { CameraCapture } from '../../components/CameraCapture';

type NavigationProp = NativeStackNavigationProp<AppStackParamList, 'DonateToQuest'>;
type RouteProp = RouteProp<AppStackParamList, 'DonateToQuest'>;

const MIN_VALUE_THB = 50;

const DONATION_TYPES = [
  { id: 'money', label: 'Money', emoji: '💵' },
  { id: 'vouchers', label: 'Vouchers', emoji: '🎫' },
  { id: 'coffee', label: 'Coffee', emoji: '☕' },
  { id: 'meals', label: 'Meals', emoji: '🍽️' },
  { id: 'hotel', label: 'Hotel stays', emoji: '🏨' },
] as const;

const GOODS_HASHTAGS = [
  { id: 'money', label: '#money' },
  { id: 'vouchers', label: '#vouchers' },
  { id: 'coffee', label: '#coffee' },
  { id: 'meals', label: '#meals' },
  { id: 'hotel', label: '#hotel' },
  { id: 'others', label: '#others' },
] as const;

export function DonateToQuestScreen() {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { campaignId } = route.params;

  const [companyName, setCompanyName] = React.useState('');
  const [brandPhotoUri, setBrandPhotoUri] = React.useState<string | null>(null);
  const [donationType, setDonationType] = React.useState<string>('money');
  const [amount, setAmount] = React.useState('');
  const [details, setDetails] = React.useState('');
  const [goodsHashtags, setGoodsHashtags] = React.useState<Set<string>>(new Set());
  const [goodsCustomText, setGoodsCustomText] = React.useState('');
  const [goodsPhotoUri, setGoodsPhotoUri] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState('');
  const [donated, setDonated] = React.useState(false);
  const [photoModal, setPhotoModal] = React.useState<'brand' | 'goods' | null>(null);

  const { data: campaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => api.campaigns.getById(campaignId),
  });

  const toggleGoodsHashtag = (id: string) => {
    setGoodsHashtags((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const isMoney = donationType === 'money';
  const amountNum = parseInt(amount, 10) || 0;
  const hasCompanyName = companyName.trim().length > 0;
  const hasBrandPhoto = brandPhotoUri != null;
  const hasGoodsDescription = goodsHashtags.size > 0 || goodsCustomText.trim().length > 0;
  const hasGoodsPhoto = goodsPhotoUri != null;
  const hasAmount = isMoney ? amountNum > 0 : true;
  const hasDetails = !isMoney ? details.trim().length > 0 : true;
  const isValid =
    hasCompanyName &&
    hasBrandPhoto &&
    hasGoodsDescription &&
    hasGoodsPhoto &&
    hasAmount &&
    (isMoney || hasDetails);

  const handleDonate = () => {
    if (!hasCompanyName) {
      Alert.alert('Company name', 'Please enter your company name.');
      return;
    }
    if (!hasBrandPhoto) {
      Alert.alert('Brand photo', 'Please add a photo of your brand.');
      return;
    }
    if (!hasGoodsDescription) {
      Alert.alert('What you\'re donating', 'Select hashtags for the goods or describe what you\'re donating.');
      return;
    }
    if (!hasGoodsPhoto) {
      Alert.alert('Photo of goods', 'Please add a photo of the donated goods.');
      return;
    }
    if (isMoney && amountNum <= 0) {
      Alert.alert('Amount', 'Enter an amount (minimum value 50 THB recommended).');
      return;
    }
    if (!isMoney && !details.trim()) {
      Alert.alert('Details', 'Describe what you\'re offering (e.g. 10 coffees, 2 night stay).');
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
          <Image source={require('../../../assets/jellyfish.png')} style={styles.octopusImage} resizeMode="contain" />
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

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Company name *</Text>
          <TextInput
            style={styles.input}
            placeholder="Your company or brand name"
            placeholderTextColor={Colors.textGray}
            value={companyName}
            onChangeText={setCompanyName}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Photo of your brand *</Text>
          {brandPhotoUri ? (
            <View style={styles.photoRow}>
              <Image source={{ uri: brandPhotoUri }} style={styles.photoThumb} resizeMode="cover" />
              <TouchableOpacity
                style={styles.changePhotoBtn}
                onPress={() => setPhotoModal('brand')}
              >
                <Text style={styles.changePhotoText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addPhotoBox}
              onPress={() => setPhotoModal('brand')}
            >
              <Text style={styles.addPhotoEmoji}>📷</Text>
              <Text style={styles.addPhotoText}>Add photo of your brand</Text>
            </TouchableOpacity>
          )}
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
          <Text style={styles.inputLabel}>Hashtagged goods or describe what you're donating *</Text>
          <Text style={styles.inputHint}>Select hashtags below or write your own description.</Text>
          <View style={styles.tagRow}>
            {GOODS_HASHTAGS.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[styles.tagChip, goodsHashtags.has(t.id) && styles.tagChipSelected]}
                onPress={() => toggleGoodsHashtag(t.id)}
              >
                <Text style={[styles.tagLabel, goodsHashtags.has(t.id) && styles.tagLabelSelected]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TextInput
            style={[styles.input, styles.inputMultiline, styles.goodsCustomInput]}
            placeholder="Or write what you're donating in your own words..."
            placeholderTextColor={Colors.textGray}
            value={goodsCustomText}
            onChangeText={setGoodsCustomText}
            multiline
            numberOfLines={2}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Photo of the donated goods *</Text>
          {goodsPhotoUri ? (
            <View style={styles.photoRow}>
              <Image source={{ uri: goodsPhotoUri }} style={styles.photoThumb} resizeMode="cover" />
              <TouchableOpacity
                style={styles.changePhotoBtn}
                onPress={() => setPhotoModal('goods')}
              >
                <Text style={styles.changePhotoText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addPhotoBox}
              onPress={() => setPhotoModal('goods')}
            >
              <Text style={styles.addPhotoEmoji}>📦</Text>
              <Text style={styles.addPhotoText}>Add photo of the donated goods</Text>
            </TouchableOpacity>
          )}
        </View>

        {isMoney && (
          <View style={styles.reminderBox}>
            <Text style={styles.reminderText}>
              Minimum value {MIN_VALUE_THB} THB recommended for donations.
            </Text>
          </View>
        )}
        {!isMoney && (
          <View style={styles.reminderBox}>
            <Text style={styles.reminderText}>
              Value of donated goods should be at least {MIN_VALUE_THB} THB (reminder).
            </Text>
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

      <Modal
        visible={photoModal !== null}
        animationType="slide"
        onRequestClose={() => setPhotoModal(null)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {photoModal === 'brand' ? 'Photo of your brand' : 'Photo of donated goods'}
            </Text>
            <TouchableOpacity onPress={() => setPhotoModal(null)} style={styles.modalClose}>
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.cameraWrap}>
            <CameraCapture
              cameraType="back"
              requireGPS={false}
              onCapture={(uri) => {
                if (photoModal === 'brand') setBrandPhotoUri(uri);
                else setGoodsPhotoUri(uri);
                setPhotoModal(null);
              }}
              onError={(err) => Alert.alert('Camera', err)}
            />
          </View>
        </View>
      </Modal>
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
  inputHint: { fontSize: 12, color: Colors.textGray, marginBottom: Spacing.xs },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  photoThumb: { width: 80, height: 80, borderRadius: BorderRadius.lg, backgroundColor: Colors.creamDark },
  changePhotoBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.ivoryBlueLight + '30',
  },
  changePhotoText: { fontSize: 14, fontWeight: '600', color: Colors.ivoryBlueDark },
  addPhotoBox: {
    minHeight: 100,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.creamDark,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  addPhotoEmoji: { fontSize: 32, marginBottom: Spacing.xs },
  addPhotoText: { fontSize: 14, color: Colors.textGray },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm },
  tagChip: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.creamDark,
    ...Shadows.sm,
  },
  tagChipSelected: { borderColor: Colors.ivoryBlue, backgroundColor: Colors.ivoryBlueLight + '20' },
  tagLabel: { fontSize: 13, fontWeight: '600', color: Colors.ivoryBlueDark },
  tagLabelSelected: { color: Colors.ivoryBlueDark },
  goodsCustomInput: { marginTop: Spacing.xs },
  reminderBox: {
    backgroundColor: Colors.ivoryBlueLight + '20',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
  },
  reminderText: { fontSize: 13, color: Colors.ivoryBlueDark },
  submitBtn: { marginTop: Spacing.md },
  modalContainer: { flex: 1, backgroundColor: Colors.cream },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.cream,
    borderBottomWidth: 1,
    borderBottomColor: Colors.creamDark,
  },
  modalTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 18,
    color: Colors.ivoryBlueDark,
  },
  modalClose: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  modalCloseText: { fontSize: 20, color: Colors.ivoryBlueDark },
  cameraWrap: { flex: 1, minHeight: 400 },
  thankYouContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  octopusImage: { width: 280, height: 280, marginBottom: Spacing.xl },
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
