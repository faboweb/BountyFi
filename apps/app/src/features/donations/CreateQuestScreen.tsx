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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Location from 'expo-location';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/theme';
import { Button } from '../../components/Button';

const MIN_DONATION_THB = 50;
const DEFAULT_REGION = { latitude: 18.7883, longitude: 98.9853, latitudeDelta: 0.05, longitudeDelta: 0.05 };

// Requirements as selectable chips (selfie is always required)
const REQUIREMENT_TAGS = [
  { id: 'before_after_photo', label: '#before_after_photo' },
  { id: 'gps', label: '#gps' },
  { id: 'one_participation_per_user', label: '#one_participation_per_user' },
] as const;

let MapView: any = null;
let Marker: any = null;
try {
  const RM = require('react-native-maps');
  MapView = RM.default;
  Marker = RM.Marker;
} catch (_) {}

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
  const [donation, setDonation] = React.useState('');
  const [created, setCreated] = React.useState(false);
  const [createdQuestTitle, setCreatedQuestTitle] = React.useState('');
  const [locationLoading, setLocationLoading] = React.useState(false);

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

  const useMyLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location', 'Permission needed to set location on map.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setPin({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
      setRegion((r) => ({ ...r, latitude: loc.coords.latitude, longitude: loc.coords.longitude }));
    } catch (_) {
      Alert.alert('Location', 'Could not get location.');
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
  const isValid = name.trim().length > 0 && location.trim().length > 0 && hasPin && radius.trim().length > 0 && detailsGoals.trim().length > 0 && donationNum >= MIN_DONATION_THB;

  const handleCreate = () => {
    if (!isValid) {
      if (!hasPin) Alert.alert('Location', 'Set a pin on the map or use "Use my location".');
      else if (donationNum < MIN_DONATION_THB && donationNum > 0) {
        Alert.alert('Minimum donation', `Donation must be at least ${MIN_DONATION_THB} THB to create a quest.`);
        return;
      } else Alert.alert('Missing fields', 'Please fill in quest name, location, radius, details & goals, and a donation of at least 50 THB.');
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
          <Text style={styles.successEmoji}>✅</Text>
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
            <Text style={styles.inputHint}>Tap the map to add a pin. Selfie is always required for participants.</Text>
            {MapView && Marker ? (
              <View style={styles.mapContainer}>
                <MapView
                  style={styles.map}
                  region={region}
                  onRegionChangeComplete={setRegion}
                  onPress={handleMapPress}
                  showsUserLocation
                >
                  {pin && (
                    <Marker
                      coordinate={pin}
                      draggable
                      onDragEnd={(e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => setPin(e.nativeEvent.coordinate)}
                    />
                  )}
                </MapView>
              </View>
            ) : (
              <View style={styles.mapPlaceholder}>
                <Text style={styles.mapPlaceholderText}>Map (development build)</Text>
                <TouchableOpacity style={styles.useLocationBtn} onPress={useMyLocation} disabled={locationLoading}>
                  {locationLoading ? <ActivityIndicator size="small" color={Colors.ivoryBlue} /> : <Text style={styles.useLocationText}>Use my location</Text>}
                </TouchableOpacity>
                {pin && (
                  <Text style={styles.coordText}>
                    Pin: {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}
                  </Text>
                )}
              </View>
            )}
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
            <Text style={styles.selfieNote}>Selfie is always required.</Text>
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
            </View>
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
            <Text style={styles.inputHint}>Minimum 50 THB required to create a quest.</Text>
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
  selfieNote: { fontSize: 12, color: Colors.textGray, marginBottom: Spacing.sm },
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
  tagLabel: { fontSize: 13, fontWeight: '600', color: Colors.ivoryBlueDark },
  tagLabelSelected: { color: Colors.ivoryBlueDark },
  submitBtn: { marginTop: Spacing.md },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  successEmoji: { fontSize: 56, marginBottom: Spacing.lg },
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
