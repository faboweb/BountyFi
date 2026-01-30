// Face Verification Screen – Selfie enrollment for campaigns requiring face recognition
import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp as RNRouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../api/client';
import { CameraCapture } from '../../components/CameraCapture';
import { PhotoPreview } from '../../components/PhotoPreview';
import { compressImage } from '../../utils/image';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;
type RouteProp = RNRouteProp<AppStackParamList, 'FaceVerification'>;

export function FaceVerificationScreen() {
  const route = useRoute<RouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const campaignId = route.params?.campaignId;
  const checkpointId = route.params?.checkpointId;

  const { data: campaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => api.campaigns.getById(campaignId!),
    enabled: !!campaignId,
  });

  const { data: verificationStatus } = useQuery({
    queryKey: ['faceVerification', campaignId],
    queryFn: () => api.faceVerification.getStatus(campaignId!),
    enabled: !!campaignId,
  });

  const [selfiePhoto, setSelfiePhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const enrollMutation = useMutation({
    mutationFn: async (photoUri: string) => {
      const compressed = await compressImage(photoUri);
      return api.faceVerification.enroll({
        campaign_id: campaignId,
        selfie_photo: compressed,
      });
    },
    onSuccess: () => {
      Alert.alert('Success', 'Face verification enrolled! You can now participate in this campaign.', [
        {
          text: 'Continue',
          onPress: () => {
            navigation.replace('SubmitProof', { campaignId, checkpointId });
          },
        },
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to enroll face verification. Please try again.');
    },
  });

  const handleSelfieCapture = async (uri: string) => {
    setSelfiePhoto(uri);
    setIsCapturing(false);
  };

  const handleEnroll = async () => {
    if (!selfiePhoto) {
      Alert.alert('Error', 'Please take a selfie first');
      return;
    }
    enrollMutation.mutate(selfiePhoto);
  };

  if (!campaignId || !checkpointId) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Missing campaign or checkpoint</Text>
      </View>
    );
  }

  if (!campaign) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const sponsorAd = useMemo(() => {
    const sponsors = campaign.sponsors;
    if (!sponsors?.length) return null;
    const index = Math.floor(Math.random() * sponsors.length);
    return sponsors[index];
  }, [campaign.id, campaign.sponsors?.length]);

  // If already enrolled, redirect to submit proof
  if (verificationStatus?.is_enrolled) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Already Verified</Text>
        <Text style={styles.description}>You're already enrolled for this campaign.</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => navigation.replace('SubmitProof', { campaignId, checkpointId })}
        >
          <Text style={styles.buttonText}>Continue to Task</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Face Verification Required</Text>
        <Text style={styles.description}>
          This campaign requires face verification to ensure fair participation and prevent fraud.
        </Text>
        <Text style={styles.subDescription}>
          Please take a clear selfie. Your face data will be securely stored and used only for
          verification purposes.
        </Text>

        {selfiePhoto ? (
          <View style={styles.previewContainer}>
            <PhotoPreview
              uri={selfiePhoto}
              onRetake={() => setSelfiePhoto(null)}
              onContinue={() => {
                if (!enrollMutation.isPending) {
                  handleEnroll();
                }
              }}
            />
            <TouchableOpacity
              style={[styles.enrollButton, enrollMutation.isPending && styles.buttonDisabled]}
              onPress={handleEnroll}
              disabled={enrollMutation.isPending}
            >
              {enrollMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.enrollButtonText}>Enroll Face Verification</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.cameraContainer}>
            <CameraCapture
              cameraType="front"
              onCapture={handleSelfieCapture}
              onError={(error) => Alert.alert('Error', error)}
            />
          </View>
        )}

        {sponsorAd && (
          <View style={styles.sponsorAd}>
            <Text style={styles.sponsorAdText}>
              This mission was made possible by <Text style={styles.sponsorAdName}>{sponsorAd.name}</Text>.
            </Text>
            {sponsorAd.maps_url ? (
              <TouchableOpacity onPress={() => Linking.openURL(sponsorAd.maps_url!)}>
                <Text style={styles.sponsorAdLink}>View on map</Text>
              </TouchableOpacity>
            ) : null}
          </View>
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
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#000',
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
    lineHeight: 22,
  },
  subDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 24,
    lineHeight: 20,
  },
  previewContainer: {
    marginTop: 16,
  },
  cameraContainer: {
    marginTop: 16,
    minHeight: 400,
  },
  enrollButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  enrollButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  sponsorAd: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: 2,
    borderTopColor: '#5B8DAF',
    alignItems: 'center',
  },
  sponsorAdText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3A6478',
    textAlign: 'center',
    lineHeight: 26,
  },
  sponsorAdName: {
    fontWeight: '800',
    color: '#FF8C6B',
  },
  sponsorAdLink: {
    fontSize: 16,
    fontWeight: '700',
    color: '#5B8DAF',
    marginTop: 10,
  },
});
