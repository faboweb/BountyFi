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
  Share,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/theme';
import { Button } from '../../components/Button';
import { CameraCapture } from '../../components/CameraCapture';

const MIN_DONATION_THB = 50;
const DEFAULT_REGION = { latitude: 18.7883, longitude: 98.9853, latitudeDelta: 0.05, longitudeDelta: 0.05 };

// Requirements as selectable chips (selfie is always required)
const REQUIREMENT_TAGS = [
  { id: 'before_after_photo', label: '#before_after_photo' },
  { id: 'gps', label: '#gps' },
  { id: 'one_participation_per_user', label: '#one_participation_per_user' },
] as const;

const GOODS_HASHTAGS = [
  { id: 'money', label: '#money' },
  { id: 'vouchers', label: '#vouchers' },
  { id: 'coffee', label: '#coffee' },
  { id: 'meals', label: '#meals' },
  { id: 'hotel', label: '#hotel' },
  { id: 'others', label: '#others' },
] as const;

type NavigationProp = NativeStackNavigationProp<AppStackParamList, 'CreateQuest'>;

export function CreateQuestScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [name, setName] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [pin, setPin] = React.useState<{ latitude: number; longitude: number } | null>(null);
  const [region, setRegion] = React.useState(DEFAULT_REGION);
  const [radius, setRadius] = React.useState('');
  const [detailsGoals, setDetailsGoals] = React.useState('');
  const [requirementTags, setRequirementTags] = React.useState<Set<string>>(new Set());
  const [customRequirementInput, setCustomRequirementInput] = React.useState('');
  const [customRequirementTags, setCustomRequirementTags] = React.useState<string[]>([]);
  const [companyName, setCompanyName] = React.useState('');
  const [brandPhotoUri, setBrandPhotoUri] = React.useState<string | null>(null);
  const [goodsHashtags, setGoodsHashtags] = React.useState<Set<string>>(new Set());
  const [goodsCustomText, setGoodsCustomText] = React.useState('');
  const [goodsPhotoUri, setGoodsPhotoUri] = React.useState<string | null>(null);
  const [donation, setDonation] = React.useState('');
  const [created, setCreated] = React.useState(false);
  const [createdQuestTitle, setCreatedQuestTitle] = React.useState('');
  const [locationLoading, setLocationLoading] = React.useState(false);
  const [photoModal, setPhotoModal] = React.useState<'brand' | 'goods' | null>(null);

  React.useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted' && !pin) {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setRegion((r) => ({ ...r, latitude: loc.coords.latitude, longitude: loc.coords.longitude }));
          setPin({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        } catch (_) {}
      }
    })();
  }, []);

  const toggleRequirement = (id: string) => {
    setRequirementTags((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleGoodsHashtag = (id: string) => {
    setGoodsHashtags((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addCustomRequirement = () => {
    const trimmed = customRequirementInput.trim();
    if (trimmed && !customRequirementTags.includes(trimmed)) {
      setCustomRequirementTags((prev) => [...prev, trimmed]);
      setCustomRequirementInput('');
    }
  };

  const useMyLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location', 'Permission needed to use GPS (same as for photo proof).');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPin({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      setRegion((r) => ({ ...r, latitude: loc.coords.latitude, longitude: loc.coords.longitude }));
    } catch (_) {
      Alert.alert('Location', 'Could not get GPS location.');
    } finally {
      setLocationLoading(false);
    }
  };

  const handleMapPress = (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPin({ latitude, longitude });
  };

  const donationNum = parseInt(donation, 10) || 0;
  const hasPin = !!pin;
  const hasCompanyName = companyName.trim().length > 0;
  const hasBrandPhoto = brandPhotoUri != null;
  const hasGoodsDescription = goodsHashtags.size > 0 || goodsCustomText.trim().length > 0;
  const hasGoodsPhoto = goodsPhotoUri != null;
  const isValid =
    name.trim().length > 0 &&
    location.trim().length > 0 &&
    hasPin &&
    radius.trim().length > 0 &&
    detailsGoals.trim().length > 0 &&
    hasCompanyName &&
    hasBrandPhoto &&
    hasGoodsDescription &&
    hasGoodsPhoto &&
    donationNum >= MIN_DONATION_THB;

  const handleCreate = () => {
    if (!hasPin) {
      Alert.alert('Location', 'Set a pin on the map or use "Use my location".');
      return;
    }
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
    if (donationNum < MIN_DONATION_THB) {
      Alert.alert('Minimum donation', `Donation must be at least ${MIN_DONATION_THB} THB to create a quest.`);
      return;
    }
    if (!isValid) {
      Alert.alert('Missing fields', 'Please fill in quest name, location, radius, details & goals, and all donation fields (company, brand photo, goods, goods photo, amount).');
      return;
    }
    setCreatedQuestTitle(name.trim());
    setCreated(true);
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out my new quest on BountyFi: "${createdQuestTitle}". Join and make an impact!`,
        title: 'Share quest',
      });
    } catch (_) {}
  };

  const handleDone = () => {
    navigation.navigate('DonateHome');
  };

  if (created) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.successContainer}>
          <Image source={require('../../../assets/jellyfish.png')} style={styles.successImage} resizeMode="contain" />
          <Text style={styles.successTitle}>Quest created</Text>
          <Text style={styles.successText}>
            "{createdQuestTitle}" is live. Share it so others can join!
          </Text>
          <Button title="Share quest" onPress={handleShare} variant="primary" style={styles.shareBtn} />
          <TouchableOpacity onPress={handleDone} style={styles.doneBtn}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create a new quest</Text>
        <View style={styles.closeBtn} />
      </View>

      <KeyboardAvoidingView style={styles.keyboard} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Quest name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Chiang Mai Riverside Cleanup"
              placeholderTextColor={Colors.textGray}
              value={name}
              onChangeText={setName}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Location name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Uniserv CMU Chiang Mai"
              placeholderTextColor={Colors.textGray}
              value={location}
              onChangeText={setLocation}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Location on map *</Text>
            <Text style={styles.inputHint}>Tap the map to add a pin.</Text>
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderText}>Location (mock)</Text>
              <TouchableOpacity style={styles.useLocationBtn} onPress={useMyLocation} disabled={locationLoading}>
                {locationLoading ? <ActivityIndicator size="small" color={Colors.ivoryBlue} /> : <Text style={styles.useLocationText}>Use my location</Text>}
              </TouchableOpacity>
              <Text style={styles.gpsHint}>Uses your device GPS, same as for photo proof.</Text>
              {pin && (
                <Text style={styles.coordText}>
                  Pin: {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Radius (meters) *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. 100"
              placeholderTextColor={Colors.textGray}
              value={radius}
              onChangeText={setRadius}
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Details and goals *</Text>
            <TextInput
              style={[styles.input, styles.inputMultiline]}
              placeholder="Describe what the quest is about and what you want to achieve..."
              placeholderTextColor={Colors.textGray}
              value={detailsGoals}
              onChangeText={setDetailsGoals}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Requirements</Text>
            <View style={styles.tagRow}>
              {REQUIREMENT_TAGS.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[styles.tagChip, requirementTags.has(t.id) && styles.tagChipSelected]}
                  onPress={() => toggleRequirement(t.id)}
                >
                  <Text style={[styles.tagLabel, requirementTags.has(t.id) && styles.tagLabelSelected]}>{t.label}</Text>
                </TouchableOpacity>
              ))}
              {customRequirementTags.map((label) => (
                <View key={label} style={[styles.tagChip, styles.tagChipCustom]}>
                  <Text style={styles.tagLabel}>{label}</Text>
                  <TouchableOpacity
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => setCustomRequirementTags((prev) => prev.filter((l) => l !== label))}
                    style={styles.tagRemove}
                  >
                    <Text style={styles.tagRemoveText}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <View style={styles.addRequirementRow}>
              <TextInput
                style={[styles.input, styles.addRequirementInput]}
                placeholder="Add requirement by hand (optional)"
                placeholderTextColor={Colors.textGray}
                value={customRequirementInput}
                onChangeText={setCustomRequirementInput}
                onSubmitEditing={addCustomRequirement}
              />
              <TouchableOpacity style={styles.addRequirementBtn} onPress={addCustomRequirement}>
                <Text style={styles.addRequirementBtnText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.donationSection}>
            <Text style={styles.donationSectionTitle}>Your donation</Text>

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

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Your donation (THB) *</Text>
              <TextInput
                style={styles.input}
                placeholder={`Minimum ${MIN_DONATION_THB} THB`}
                placeholderTextColor={Colors.textGray}
                value={donation}
                onChangeText={setDonation}
                keyboardType="numeric"
              />
              <View style={styles.reminderBox}>
                <Text style={styles.reminderText}>
                  Minimum {MIN_DONATION_THB} THB required to create a quest.
                </Text>
              </View>
            </View>
          </View>

          <Button
            title="Create quest"
            onPress={handleCreate}
            variant="primary"
            style={styles.submitBtn}
            disabled={!isValid}
          />
        </ScrollView>
      </KeyboardAvoidingView>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.cream,
  },
  closeBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  closeText: { fontSize: 20, color: Colors.ivoryBlueDark },
  headerTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 18,
    color: Colors.ivoryBlueDark,
  },
  keyboard: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { padding: Spacing.lg, paddingBottom: 80 },
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
  inputMultiline: { minHeight: 100, textAlignVertical: 'top' },
  inputHint: { fontSize: 12, color: Colors.textGray, marginTop: Spacing.xs, marginBottom: Spacing.xs },
  gpsHint: { fontSize: 12, color: Colors.textGray, marginTop: Spacing.xs },
  mapContainer: { height: 200, borderRadius: BorderRadius.lg, overflow: 'hidden', marginTop: Spacing.xs, ...Shadows.sm },
  map: { width: '100%', height: '100%' },
  mapPlaceholder: {
    minHeight: 120,
    borderRadius: BorderRadius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.ivoryBlueLight,
    backgroundColor: Colors.white,
    padding: Spacing.md,
    marginTop: Spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  mapPlaceholderText: { fontSize: 14, color: Colors.textGray, marginBottom: Spacing.sm },
  useLocationBtn: { paddingVertical: Spacing.sm, paddingHorizontal: Spacing.lg },
  useLocationText: { fontSize: 16, fontWeight: '600', color: Colors.ivoryBlue },
  coordText: { fontSize: 12, color: Colors.textGray, marginTop: Spacing.xs },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginTop: Spacing.xs },
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
  tagChipCustom: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  tagRemove: { paddingLeft: 4 },
  tagRemoveText: { fontSize: 14, color: Colors.textGray, fontWeight: '600' },
  addRequirementRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.sm },
  addRequirementInput: { flex: 1 },
  addRequirementBtn: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.ivoryBlueLight + '40',
  },
  addRequirementBtnText: { fontSize: 14, fontWeight: '600', color: Colors.ivoryBlueDark },
  tagLabel: { fontSize: 13, fontWeight: '600', color: Colors.ivoryBlueDark },
  tagLabelSelected: { color: Colors.ivoryBlueDark },
  donationSection: { marginTop: Spacing.lg, marginBottom: Spacing.md },
  donationSectionTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.ivoryBlueDark,
    marginBottom: Spacing.md,
  },
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
  goodsCustomInput: { marginTop: Spacing.xs },
  reminderBox: {
    backgroundColor: Colors.ivoryBlueLight + '20',
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginTop: Spacing.xs,
  },
  reminderText: { fontSize: 13, color: Colors.ivoryBlueDark },
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
  submitBtn: { marginTop: Spacing.md },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  successImage: { width: 280, height: 280, marginBottom: Spacing.lg },
  successTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 22,
    color: Colors.ivoryBlueDark,
    marginBottom: Spacing.sm,
  },
  successText: {
    fontSize: 16,
    color: Colors.textGray,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 24,
  },
  shareBtn: { width: '100%', marginBottom: Spacing.md },
  doneBtn: { paddingVertical: Spacing.md },
  doneBtnText: { fontSize: 16, fontWeight: '600', color: Colors.ivoryBlue },
});
