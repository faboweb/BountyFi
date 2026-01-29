// Submit Proof Screen – before/after photos only (no gesture)
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp as RNRouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { CameraCapture } from '../../components/CameraCapture';
import { PhotoPreview } from '../../components/PhotoPreview';
import { compressImage } from '../../utils/image';
import { calculateDistance, isWithinCheckpoint, getTimeDifferenceMinutes } from '../../utils/geo';
import { Campaign, Checkpoint } from '../../api/types';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;
type RouteProp = RNRouteProp<AppStackParamList, 'SubmitProof'>;

type PhotoData = {
  uri: string;
  gps?: { lat: number; lng: number };
  timestamp: string;
};

export function SubmitProofScreen() {
  const route = useRoute<RouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const queryClient = useQueryClient();
  const campaignId = route.params?.campaignId;
  const checkpointId = route.params?.checkpointId;

  const { data: campaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => api.campaigns.getById(campaignId!),
    enabled: !!campaignId,
  });

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [beforePhoto, setBeforePhoto] = useState<PhotoData | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<PhotoData | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const checkpoint = campaign?.checkpoints.find((c: Checkpoint) => c.id === checkpointId);

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const validateBeforePhoto = () => {
    const errors: string[] = [];
    if (!beforePhoto) {
      return errors;
    }
    if (!beforePhoto.gps) {
      errors.push('GPS data missing from before photo');
    } else if (checkpoint && !isWithinCheckpoint(
      beforePhoto.gps.lat,
      beforePhoto.gps.lng,
      checkpoint.lat,
      checkpoint.lng,
      checkpoint.radius
    )) {
      errors.push(`Before photo must be within ${checkpoint.radius}m of checkpoint`);
    }
    return errors;
  };

  const validateAfterPhoto = () => {
    const errors: string[] = [];
    if (!afterPhoto || !beforePhoto) {
      return errors;
    }
    if (!afterPhoto.gps) {
      errors.push('GPS data missing from after photo');
    } else if (beforePhoto.gps) {
      const distance = calculateDistance(
        beforePhoto.gps.lat,
        beforePhoto.gps.lng,
        afterPhoto.gps.lat,
        afterPhoto.gps.lng
      );
      if (distance > 50) {
        errors.push('Before and after photos must be within 50m of each other');
      }
    }

    const timeDiff = getTimeDifferenceMinutes(beforePhoto.timestamp, afterPhoto.timestamp);
    if (timeDiff < 1) {
      errors.push('Time between photos must be at least 1 minute');
    } else if (timeDiff > 60) {
      errors.push('Time between photos must be less than 60 minutes');
    }

    if (checkpoint && afterPhoto.gps && !isWithinCheckpoint(
      afterPhoto.gps.lat,
      afterPhoto.gps.lng,
      checkpoint.lat,
      checkpoint.lng,
      checkpoint.radius
    )) {
      errors.push(`After photo must be within ${checkpoint.radius}m of checkpoint`);
    }

    return errors;
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!beforePhoto || !afterPhoto || !checkpoint) {
        throw new Error('Missing required data');
      }

      const [compressedBefore, compressedAfter] = await Promise.all([
        compressImage(beforePhoto.uri),
        compressImage(afterPhoto.uri),
      ]);

      return api.submissions.submit({
        campaign_id: campaignId,
        checkpoint_id: checkpointId,
        before_photo: compressedBefore,
        after_photo: compressedAfter,
        gps_lat: beforePhoto.gps?.lat || 0,
        gps_lng: beforePhoto.gps?.lng || 0,
        before_timestamp: beforePhoto.timestamp,
        after_timestamp: afterPhoto.timestamp,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      Alert.alert('Success', 'Submission uploaded! Pending validation...', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to submit. Please try again.');
    },
  });

  const handleNext = () => {
    if (step === 1) {
      if (!beforePhoto) return;
      const errors = validateBeforePhoto();
      if (errors.length > 0) {
        setValidationErrors(errors);
        Alert.alert(errors[0], errors.length > 1 ? errors.join('\n') : undefined);
        return;
      }
      setValidationErrors([]);
      Alert.alert('Thank you for supporting our community', undefined, [
        { text: 'Start cleaning', onPress: () => setStep(2) },
      ]);
      return;
    }

    if (step === 2) {
      if (!afterPhoto || !beforePhoto) return;
      const errors = validateAfterPhoto();
      if (errors.length > 0) {
        setValidationErrors(errors);
        Alert.alert(errors[0], errors.length > 1 ? errors.join('\n') : undefined);
        return;
      }
      setValidationErrors([]);
      setStep(3);
      return;
    }

    setStep((s) => Math.min(3, s + 1) as 1 | 2 | 3);
  };

  const handlePhotoCapture = async (uri: string, gps?: { lat: number; lng: number }) => {
    const photoData: PhotoData = {
      uri,
      gps,
      timestamp: new Date().toISOString(),
    };

    if (step === 1) {
      setBeforePhoto(photoData);
    } else if (step === 2) {
      setAfterPhoto(photoData);
    }

    setIsCapturing(false);
    handleNext();
  };

  if (!campaignId || !checkpointId) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Missing campaign or checkpoint</Text>
      </View>
    );
  }

  if (!campaign || !checkpoint) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.stepIndicator}>
          <Text style={styles.stepText}>Step {step} of 3</Text>
        </View>

        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.title}>Before Photo</Text>
            <Text style={styles.description}>
              Take a wide shot of the area before cleanup
            </Text>
            {beforePhoto ? (
              <View>
                <PhotoPreview
                  uri={beforePhoto.uri}
                  onRetake={() => setBeforePhoto(null)}
                  onContinue={handleNext}
                />
                {beforePhoto.gps && (
                  <View style={styles.metadata}>
                    <Text style={styles.metadataText}>
                      GPS: {beforePhoto.gps.lat.toFixed(6)}, {beforePhoto.gps.lng.toFixed(6)}
                    </Text>
                    {checkpoint && (
                      <Text style={styles.metadataText}>
                        {isWithinCheckpoint(
                          beforePhoto.gps.lat,
                          beforePhoto.gps.lng,
                          checkpoint.lat,
                          checkpoint.lng,
                          checkpoint.radius
                        ) ? '✓ Inside checkpoint' : '✗ Outside checkpoint'}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            ) : (
              <CameraCapture
                cameraType="back"
                onCapture={(uri, gps) => handlePhotoCapture(uri, gps)}
                onError={(error) => Alert.alert('Error', error)}
                requireGPS={true}
              />
            )}
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepContent}>
            <Text style={styles.title}>After Photo</Text>
            <Text style={styles.description}>
              Take the same angle after cleanup (1–15 minutes later)
            </Text>
            {afterPhoto ? (
              <View>
                <PhotoPreview
                  uri={afterPhoto.uri}
                  onRetake={() => setAfterPhoto(null)}
                  onContinue={handleNext}
                />
                {beforePhoto && afterPhoto && (
                  <View style={styles.metadata}>
                    {beforePhoto.gps && afterPhoto.gps && (
                      <>
                        <Text style={styles.metadataText}>
                          Distance: {calculateDistance(
                            beforePhoto.gps.lat,
                            beforePhoto.gps.lng,
                            afterPhoto.gps.lat,
                            afterPhoto.gps.lng
                          ).toFixed(1)}m
                        </Text>
                        <Text style={styles.metadataText}>
                          Time difference: {getTimeDifferenceMinutes(
                            beforePhoto.timestamp,
                            afterPhoto.timestamp
                          ).toFixed(1)} minutes
                        </Text>
                      </>
                    )}
                  </View>
                )}
              </View>
            ) : (
              <CameraCapture
                cameraType="back"
                onCapture={(uri, gps) => handlePhotoCapture(uri, gps)}
                onError={(error) => Alert.alert('Error', error)}
                requireGPS={true}
              />
            )}
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepContent}>
            <Text style={styles.title}>Review & Submit</Text>
            <Text style={styles.description}>Review your photos and submit</Text>

            {beforePhoto && (
              <View style={styles.reviewPhoto}>
                <Text style={styles.reviewLabel}>Before Photo</Text>
                <PhotoPreview uri={beforePhoto.uri} readonly />
              </View>
            )}

            {afterPhoto && (
              <View style={styles.reviewPhoto}>
                <Text style={styles.reviewLabel}>After Photo</Text>
                <PhotoPreview uri={afterPhoto.uri} readonly />
              </View>
            )}

            <TouchableOpacity
              style={[styles.submitButton, submitMutation.isPending && styles.buttonDisabled]}
              onPress={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit</Text>
              )}
            </TouchableOpacity>
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
    padding: 16,
  },
  stepIndicator: {
    marginBottom: 24,
  },
  stepText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
  },
  stepContent: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  metadata: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  metadataText: {
    fontSize: 14,
    color: '#000',
    marginBottom: 4,
  },
  reviewPhoto: {
    marginBottom: 16,
  },
  reviewLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  submitButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
