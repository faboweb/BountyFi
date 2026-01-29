// Create Campaign – step 1: details + location + duration; step 2: first donor + share
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

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

  const handleMapPress = (e: { nativeEvent: { coordinate: { latitude: number; longitude: number } } }) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setPin({ latitude, longitude });
  };

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
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Short description (a sentence or two)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What's this campaign about?"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Location</Text>
          <Text style={styles.hint}>Tap the map to place a pin, or add a place name below.</Text>
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
                  onDragEnd={(e) => setPin(e.nativeEvent.coordinate)}
                />
              )}
            </MapView>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Location name (optional)"
            value={locationName}
            onChangeText={setLocationName}
            placeholderTextColor="#999"
          />

          <Text style={styles.label}>Duration (days)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 7"
            value={durationDays}
            onChangeText={setDurationDays}
            keyboardType="number-pad"
            placeholderTextColor="#999"
          />

          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              Every creator of the top 3 campaigns of the week (by submissions) gets a lottery ticket within that campaign too.
            </Text>
          </View>

          <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next</Text>
          </TouchableOpacity>
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
          placeholderTextColor="#999"
        />

        {!created ? (
          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && styles.buttonDisabled]}
            onPress={handleDonateAndCreate}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Donate & launch campaign</Text>
            )}
          </TouchableOpacity>
        ) : (
          <>
            <View style={styles.successBox}>
              <Text style={styles.successText}>Campaign launched. Share it with the world!</Text>
            </View>
            <TouchableOpacity style={styles.shareButton} onPress={handleShareCampaign}>
              <Text style={styles.shareButtonText}>Share the campaign with the world</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
              <Text style={styles.doneButtonText}>Done</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  screenTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 20,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  hint: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fff',
    marginBottom: 16,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  mapContainer: {
    height: 220,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#e0e0e0',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  noteBox: {
    backgroundColor: '#E8F4FD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 20,
  },
  noteText: {
    fontSize: 13,
    color: '#000',
    lineHeight: 20,
  },
  nextButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryButton: {
    backgroundColor: '#34C759',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  successBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  successText: {
    fontSize: 16,
    color: '#000',
    fontWeight: '500',
  },
  shareButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  doneButton: {
    backgroundColor: '#8E8E93',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
