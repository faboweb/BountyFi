import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Typography, Spacing, BorderRadius } from '../../theme/theme';
import { useAuth } from '../../auth/context';
import { api } from '../../api/client';
import { supabase } from '../../utils/supabase';
import * as Location from 'expo-location';
import { useCameraPermissions } from 'expo-camera'; // Ensure this matches existing import if present
import { useState, useRef } from 'react';
import { Alert } from 'react-native';

export function DailyTaskCameraScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const { campaignId } = route.params as { campaignId: string };
  
  const [permission, requestPermission] = useCameraPermissions();
  const [photo, setPhoto] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cameraRef = useRef<any>(null);

  if (!permission) return <View />;
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center' }}>We need your permission to show the camera</Text>
        <TouchableOpacity onPress={requestPermission} style={styles.button}>
          <Text>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const takePicture = async () => {
    if (cameraRef.current) {
      const result = await cameraRef.current.takePictureAsync();
      setPhoto(result.uri);
    }
  };

  const { signMessage, user } = useAuth();

  const handleConfirm = async () => {
    if (!photo) return;
    setIsSubmitting(true);
    try {
      // 1. Get Location
      const location = await Location.getCurrentPositionAsync({});
      const lat = Math.floor(location.coords.latitude * 1000000);
      const lng = Math.floor(location.coords.longitude * 1000000);

      // 2. Upload to Supabase Storage
      const filename = `sub_${Date.now()}.jpg`;
      const formData = new FormData();
      formData.append('file', {
        uri: photo,
        type: 'image/jpeg',
        name: filename,
      } as any);

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('photos')
        .upload(filename, formData);

      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(filename);

      console.log('Photo uploaded:', publicUrl);

      // 3. Helper to construct signature payload (Must match backend reconstruction!)
      // Backend expects: keccak256(encodedParams)
      // Here we sign a message. 
      // Simplified for MVP: Sign the intended action description or just the params stringified.
      // But implementation plan says "Sign the submission metadata".
      // Let's sign a JSON string for simplicity, or hash.
      // Ethers used in Edge Function verifies signature against address.
      // Let's create a deterministic message.
      const messageToSign = JSON.stringify({
        campaignId,
        urls: [publicUrl], // Array for extensibility
        lat,
        lng,
        timestamp: Date.now()
      });
      
      const signature = await signMessage(messageToSign);

      // 4. Submit to Relayer (Edge Function via API)
      await api.submissions.submit({
        campaign_id: campaignId,
        checkpoint_id: 'default', // TODO
        before_photo: publicUrl,
        after_photo: publicUrl, // For single photo campaigns, map accordingly.
        gps_lat: lat,
        gps_lng: lng,
        before_timestamp: new Date().toISOString(),
        after_timestamp: new Date().toISOString(),
        signature,
        public_address: user?.wallet_address 
      });

      Alert.alert('Success', 'Proof submitted successfully! Validation pending.');
      navigation.goBack();
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Camera viewfinder area */}
      <View style={styles.cameraViewfinder}>
        <View style={styles.viewfinderOverlay} />
        <Text style={styles.cameraHint}>
          📸 Center the area in the frame{'\n'}
          Location (GPS) is recorded with your photo.
        </Text>
        <Text style={styles.cameraPlaceholder}>📷</Text>
      </View>

      {/* Controls */}
      <View style={styles.cameraControls}>
        <TouchableOpacity
          activeOpacity={0.9}
          style={styles.captureButton}
          onPress={() => {}}
        >
          <View style={styles.captureButtonInner} />
        </TouchableOpacity>

        <Text style={styles.locationHint}>Make sure your location is enabled</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000',
  },
  cameraViewfinder: {
    flex: 1,
    minHeight: 400,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  viewfinderOverlay: {
    position: 'absolute',
    width: '80%',
    height: '80%',
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.5)',
    borderRadius: 20,
  },
  cameraHint: {
    position: 'absolute',
    top: 40,
    left: '10%',
    right: '10%',
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '600',
    fontSize: 14,
    color: Colors.white,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },
  cameraPlaceholder: {
    fontSize: 80,
    color: 'rgba(255, 255, 255, 0.3)',
  },
  cameraControls: {
    padding: Spacing.lg,
    backgroundColor: '#000',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.white,
    borderWidth: 6,
    borderColor: Colors.ivoryBlue,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.coral,
  },
  locationHint: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: Spacing.md,
    fontSize: 13,
  },
});
