// Create Campaign – step 1: details + location + duration; step 2: first donor + share (BountyFi theme)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Share,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { Button } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';

const MIN_DONATION_THB = 50;
const DEFAULT_REGION = {
  latitude: 13.7563,
  longitude: 100.5018,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

type Step = 1 | 2;

export function StartCampaignScreen() {
  const navigation = useNavigation();
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [region, setRegion] = useState(DEFAULT_REGION);

  // Step 2
  const [donationThb, setDonationThb] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setRegion((r) => ({
            ...r,
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          }));
          if (!pin) setPin({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        } catch (_) {}
      }
    })();
  }, []);

  const canGoNext = () => {
    if (!name.trim()) return false;
    if (!description.trim()) return false;
    if (!pin) return false;
    const days = parseInt(durationDays, 10);
    return !isNaN(days) && days >= 1;
  };

  const handleNext = () => {
    if (!canGoNext()) {
      if (!name.trim()) Alert.alert('Required', 'Please enter a campaign name.');
      else if (!description.trim()) Alert.alert('Required', 'Please add a short description.');
      else if (!pin) Alert.alert('Required', 'Tap the map to set the campaign location.');
      else Alert.alert('Required', 'Please enter duration in days (at least 1).');
      return;
    }
    setStep(2);
  };

  const handleDonateAndCreate = async () => {
    const amount = parseInt(donationThb, 10);
    if (isNaN(amount) || amount < MIN_DONATION_THB) {
      Alert.alert('Minimum donation', `Be the first donor with at least ${MIN_DONATION_THB} Thai baht to launch this campaign.`);
      return;
    }

    setIsSubmitting(true);
    try {
      // TODO: API – create campaign with step 1 data + first donation
      await new Promise((r) => setTimeout(r, 800));
      setCreated(true);
    } catch (e) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShareCampaign = async () => {
    try {
      await Share.share({
        message: `Check out "${name}" on BountyFi – ${description.slice(0, 80)}${description.length > 80 ? '…' : ''}. Join the campaign and make a difference!`,
        title: `Campaign: ${name}`,
      });
    } catch (_) {}
  };

  const handleDone = () => {
    navigation.goBack();
  };

  if (step === 1) {
    return (
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Text style={styles.screenTitle}>Create a campaign</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Beach Cleanup Patong"
            value={name}
            onChangeText={setName}
            placeholderTextColor={colors.textGray}
          />

          <Text style={styles.label}>Short description (a sentence or two)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What’s this campaign about?"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            placeholderTextColor={colors.textGray}
          />

          <Text style={styles.label}>Location</Text>
          <Text style={styles.hint}>Set coordinates below or use your current location.</Text>
          <View style={styles.mapContainer}>
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderText}>Location (mock)</Text>
              <Text style={styles.mapPlaceholderSubtext}>
                Set coordinates below. Use a development build for the full map later.
              </Text>
              <View style={styles.coordRow}>
                <TextInput
                  style={[styles.input, styles.coordInput]}
                  placeholder="Lat"
                  value={pin ? String(pin.latitude.toFixed(5)) : ''}
                  onChangeText={(t) => {
                    const n = parseFloat(t);
                    if (!isNaN(n)) setPin((p) => ({ ...(p ?? { longitude: region.longitude }), latitude: n }));
                  }}
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textGray}
                />
                <TextInput
                  style={[styles.input, styles.coordInput]}
                  placeholder="Lng"
                  value={pin ? String(pin.longitude.toFixed(5)) : ''}
                  onChangeText={(t) => {
                    const n = parseFloat(t);
                    if (!isNaN(n)) setPin((p) => ({ ...(p ?? { latitude: region.latitude }), longitude: n }));
                  }}
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textGray}
                />
              </View>
            </View>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Location name (optional)"
            value={locationName}
            onChangeText={setLocationName}
            placeholderTextColor={colors.textGray}
          />

          <Text style={styles.label}>Duration (days)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 7"
            value={durationDays}
            onChangeText={setDurationDays}
            keyboardType="number-pad"
            placeholderTextColor={colors.textGray}
          />

          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              Every creator of the top 3 campaigns of the week (by submissions) gets a lottery ticket within that campaign too.
            </Text>
          </View>

          <Button title="Next" variant="primary" onPress={handleNext} style={styles.nextButton} />
        </View>
      </ScrollView>
    );
  }

  // Step 2: First donor + Share
  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <Text style={styles.screenTitle}>Be the first donor</Text>
        <Text style={styles.subtitle}>
          Donate at least {MIN_DONATION_THB} Thai baht to launch "{name}" and keep it running.
        </Text>

        <Text style={styles.label}>Your donation (THB)</Text>
        <TextInput
          style={styles.input}
          placeholder={`Min ${MIN_DONATION_THB}`}
          value={donationThb}
          onChangeText={setDonationThb}
          keyboardType="number-pad"
          editable={!created}
          placeholderTextColor={colors.textGray}
        />

        {!created ? (
          <Button
            title="Donate & launch campaign"
            variant="success"
            onPress={handleDonateAndCreate}
            loading={isSubmitting}
            style={styles.primaryButton}
          />
        ) : (
          <>
            <View style={styles.successBox}>
              <Text style={styles.successText}>Campaign launched. Share it with the world!</Text>
            </View>
            <Button
              title="Share the campaign with the world"
              variant="primary"
              onPress={handleShareCampaign}
              style={styles.shareButton}
            />
            <Button
              title="Done"
              variant="secondary"
              onPress={handleDone}
              style={styles.doneButton}
            />
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightGray,
  },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  screenTitle: {
    ...typography.title,
    fontSize: 24,
    color: colors.navyBlack,
    marginBottom: spacing.lg,
  },
  subtitle: {
    ...typography.body,
    color: colors.textGray,
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.bodySecondary,
    fontWeight: '600',
    color: colors.navyBlack,
    marginBottom: spacing.sm,
  },
  hint: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 2,
    borderColor: colors.borderGray,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    fontSize: 16,
    backgroundColor: colors.white,
    color: colors.navyBlack,
    marginBottom: spacing.md,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  mapContainer: {
    height: 220,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
    backgroundColor: colors.borderGray,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.borderGray,
  },
  mapPlaceholderText: {
    ...typography.bodySecondary,
    fontWeight: '600',
    color: colors.navyBlack,
    marginBottom: spacing.xs,
  },
  mapPlaceholderSubtext: {
    ...typography.caption,
    color: colors.textGray,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  coordRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  coordInput: {
    flex: 1,
    marginBottom: 0,
  },
  noteBox: {
    backgroundColor: '#E8F4FD',
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  noteText: {
    ...typography.bodySecondary,
    lineHeight: 20,
    color: colors.navyBlack,
  },
  nextButton: {
    marginTop: spacing.sm,
  },
  primaryButton: {
    marginTop: spacing.sm,
  },
  successBox: {
    backgroundColor: '#D1FAE5',
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  successText: {
    ...typography.body,
    fontWeight: '500',
    color: colors.navyBlack,
  },
  shareButton: {
    marginBottom: spacing.md,
  },
  doneButton: {},
});
