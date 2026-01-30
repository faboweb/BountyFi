// Submit Proof Screen – selfie + photo proof (GPS always on)
// Uniserv CMU: selfie → before → after (min 1 min), one participation only.
// No burn: selfie → one photo daily, 3 months.
import React, { useState, useEffect, useMemo } from 'react';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { CameraCapture } from '../../components/CameraCapture';
import { PhotoPreview } from '../../components/PhotoPreview';
import { compressImage } from '../../utils/image';
import { calculateDistance, isWithinCheckpoint, getTimeDifferenceMinutes } from '../../utils/geo';
import { Campaign, Checkpoint, QuestType } from '../../api/types';
import * as Location from 'expo-location';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;
type RouteProp = RNRouteProp<AppStackParamList, 'SubmitProof'>;

type PhotoData = {
  uri: string;
  gps?: { lat: number; lng: number };
  timestamp: string;
};

const isSameCalendarDay = (iso1: string, iso2: string): boolean => {
  const d1 = new Date(iso1);
  const d2 = new Date(iso2);
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
};

/** Set to false to re-enforce "one participation only" for Uniserv CMU Cleanup */
const ALLOW_MULTIPLE_UNISERV_FOR_TESTING = true;

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

  const { data: mySubmissions } = useQuery({
    queryKey: ['submissions', 'my'],
    queryFn: () => api.submissions.getMy(),
  });

  const questType: QuestType | undefined = campaign?.quest_type;
  const isNoBurn = questType === 'no_burn';
  const isUniserv = questType === 'uniserv_cleanup';
  const isBanPlastic = questType === 'ban_plastic';
  const isSinglePhotoQuest = isNoBurn || isBanPlastic; // selfie + one proof photo
  const totalSteps = isSinglePhotoQuest ? 3 : 4; // selfie, before/single, after (or review), review

  const [step, setStep] = useState(0);
  const [selfiePhoto, setSelfiePhoto] = useState<PhotoData | null>(null);
  const [beforePhoto, setBeforePhoto] = useState<PhotoData | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<PhotoData | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  const checkpoint = campaign?.checkpoints.find((c: Checkpoint) => c.id === checkpointId);

  const sponsorAd = useMemo(() => {
    const sponsors = campaign?.sponsors;
    if (!sponsors?.length) return null;
    const index = Math.floor(Math.random() * sponsors.length);
    return sponsors[index];
  }, [campaign?.id, campaign?.sponsors?.length]);

  // Enforce participation: Uniserv = once only (paused for testing); No burn = once per day
  const myCampaignSubmissions = (mySubmissions ?? []).filter((s: { campaign_id: string }) => s.campaign_id === campaignId);
  const alreadyParticipatedUniserv = !ALLOW_MULTIPLE_UNISERV_FOR_TESTING && isUniserv && myCampaignSubmissions.length > 0;
  const today = new Date().toISOString();
  const alreadySubmittedTodayNoBurn = isNoBurn && myCampaignSubmissions.some((s: { created_at: string }) => isSameCalendarDay(s.created_at, today));
  // ban_plastic: no per-day limit

  useEffect(() => {
    if (!campaign || !checkpoint) return;
    if (alreadyParticipatedUniserv) {
      Alert.alert(
        'Already participated',
        'Uniserv CMU Cleanup allows one participation per user. You have already submitted.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } else if (alreadySubmittedTodayNoBurn) {
      Alert.alert(
        'Already submitted today',
        'No burning quest allows one photo per day. You can submit again tomorrow.',
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    }
  }, [campaign, checkpoint, alreadyParticipatedUniserv, alreadySubmittedTodayNoBurn, navigation]);

  // Request GPS permission when screen mounts (incentive: required for proof)
  useEffect(() => {
    (async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== 'granted') {
        await Location.requestForegroundPermissionsAsync();
      }
    })();
  }, []);

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [cameraError, setCameraError] = useState<string | null>(null);

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
      if (!checkpoint) throw new Error('Missing checkpoint');
      if (isNoBurn || isBanPlastic) {
        if (!beforePhoto) throw new Error('Missing photo');
        const compressed = await compressImage(beforePhoto.uri);
        const now = new Date();
        const oneMinAgo = new Date(now.getTime() - 60 * 1000);
        return api.submissions.submit({
          campaign_id: campaignId!,
          checkpoint_id: checkpointId!,
          gesture_photo: selfiePhoto ? await compressImage(selfiePhoto.uri) : undefined,
          before_photo: compressed,
          after_photo: compressed,
          gps_lat: beforePhoto.gps?.lat ?? 0,
          gps_lng: beforePhoto.gps?.lng ?? 0,
          before_timestamp: oneMinAgo.toISOString(),
          after_timestamp: now.toISOString(),
        });
      }
      if (!beforePhoto || !afterPhoto) throw new Error('Missing required data');
      const [compressedBefore, compressedAfter] = await Promise.all([
        compressImage(beforePhoto.uri),
        compressImage(afterPhoto.uri),
      ]);
      const compressedSelfie = selfiePhoto ? await compressImage(selfiePhoto.uri) : undefined;
      return api.submissions.submit({
        campaign_id: campaignId!,
        checkpoint_id: checkpointId!,
        gesture_photo: compressedSelfie,
        before_photo: compressedBefore,
        after_photo: compressedAfter,
        gps_lat: beforePhoto.gps?.lat ?? 0,
        gps_lng: beforePhoto.gps?.lng ?? 0,
        before_timestamp: beforePhoto.timestamp,
        after_timestamp: afterPhoto.timestamp,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      Alert.alert(
        'Success',
        'Submission uploaded! Pending validation...',
        [{ text: 'OK', onPress: () => (navigation.getParent() as any)?.navigate('WalletTab', { screen: 'TreasureWallet' }) }]
      );
    },
    onError: (error: any) => {
      Alert.alert('Submission failed', error.message || 'Something went wrong. Please try again.');
    },
  });

  const handleNext = () => {
    setCameraError(null);
    if (step === 0) {
      if (!selfiePhoto) return;
      if (!selfiePhoto.gps) {
        setValidationErrors(['Location is recorded with your selfie. Please enable GPS and retake.']);
        return;
      }
      // In any quest, if selfie is outside checkpoint, don't allow further steps
      if (checkpoint && !isWithinCheckpoint(
        selfiePhoto.gps.lat,
        selfiePhoto.gps.lng,
        checkpoint.lat,
        checkpoint.lng,
        checkpoint.radius
      )) {
        Alert.alert(
          'Location does not match',
          "Your location doesn't match the quest location. You can only submit from the quest area.",
          [{ text: 'OK', onPress: () => navigation.navigate('Campaigns' as never) }]
        );
        return;
      }
      setValidationErrors([]);
      setStep(1);
      return;
    }
    if (step === 1) {
      if (!beforePhoto) return;
      const errors = validateBeforePhoto();
      if (errors.length > 0) {
        setValidationErrors(errors);
        return;
      }
      setValidationErrors([]);
      setStep(2);
      return;
    }
    if (step === 2 && !isSinglePhotoQuest) {
      if (!afterPhoto || !beforePhoto) return;
      const errors = validateAfterPhoto();
      if (errors.length > 0) {
        setValidationErrors(errors);
        return;
      }
      setValidationErrors([]);
      setStep(3);
      return;
    }
    setStep((s) => Math.min(totalSteps - 1, s + 1));
  };

  const handlePhotoCapture = async (uri: string, gps?: { lat: number; lng: number }) => {
    setCameraError(null);
    setValidationErrors([]);
    const photoData: PhotoData = {
      uri,
      gps,
      timestamp: new Date().toISOString(),
    };
    if (step === 0) setSelfiePhoto(photoData);
    else if (step === 1) setBeforePhoto(photoData);
    else if (step === 2 && !isSinglePhotoQuest) setAfterPhoto(photoData);
    setIsCapturing(false);
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

  if (alreadyParticipatedUniserv || alreadySubmittedTodayNoBurn) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>
          {alreadyParticipatedUniserv ? 'Already participated' : 'Already submitted today'}
        </Text>
      </View>
    );
  }

  const reviewStep = isSinglePhotoQuest ? 2 : 3;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.stepIndicator}>
          <Text style={styles.stepText}>Step {step + 1} of {totalSteps}</Text>
        </View>

        {/* Step 0: Selfie (front camera) + GPS */}
        {step === 0 && (
          <View style={styles.stepContent}>
            <Text style={styles.title}>Selfie</Text>
            <Text style={styles.description}>
              Take a selfie with the front camera. GPS is recorded with your photo.
            </Text>
            {(validationErrors.length > 0 || cameraError) ? (
              <View style={styles.inlineError}>
                <Text style={styles.inlineErrorText}>{cameraError || validationErrors[0]}</Text>
              </View>
            ) : null}
            {selfiePhoto ? (
              <View>
                <PhotoPreview
                  uri={selfiePhoto.uri}
                  onRetake={() => { setSelfiePhoto(null); setValidationErrors([]); }}
                  onContinue={handleNext}
                />
                {selfiePhoto.gps && (
                  <View style={styles.metadata}>
                    <Text style={styles.metadataText}>
                      GPS: {selfiePhoto.gps.lat.toFixed(6)}, {selfiePhoto.gps.lng.toFixed(6)}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <CameraCapture
                cameraType="front"
                onCapture={(uri, gps) => handlePhotoCapture(uri, gps)}
                onError={(error) => setCameraError(error)}
                requireGPS={true}
              />
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
        )}

        {/* Step 1: Before photo (or single daily photo for No burn) */}
        {step === 1 && (
          <View style={styles.stepContent}>
            <Text style={styles.title}>
              {isNoBurn ? 'Daily proof photo' : isBanPlastic ? 'Plastic replacement photo' : 'Before Photo'}
            </Text>
            <Text style={styles.description}>
              {isNoBurn
                ? 'Take one photo with GPS. One submission per day.'
                : isBanPlastic
                  ? 'Show veggies or fruits in a tote-bag or something non-plastic. GPS is recorded.'
                  : 'Take a wide shot of the area before cleanup. GPS is recorded.'}
            </Text>
            {(validationErrors.length > 0 || cameraError) ? (
              <View style={styles.inlineError}>
                <Text style={styles.inlineErrorText}>{cameraError || validationErrors[0]}</Text>
              </View>
            ) : null}
            {beforePhoto ? (
              <View>
                <PhotoPreview
                  uri={beforePhoto.uri}
                  onRetake={() => { setBeforePhoto(null); setValidationErrors([]); }}
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
                onError={(error) => setCameraError(error)}
                requireGPS={true}
              />
            )}
          </View>
        )}

        {/* Step 2: After photo (Uniserv only) or Review (No burn) */}
        {step === 2 && !isSinglePhotoQuest && (
          <View style={styles.stepContent}>
            <Text style={styles.title}>After Photo</Text>
            <Text style={styles.description}>
              Take the same angle after cleanup. At least 1 minute must pass between before and after.
            </Text>
            {(validationErrors.length > 0 || cameraError) ? (
              <View style={styles.inlineError}>
                <Text style={styles.inlineErrorText}>{cameraError || validationErrors[0]}</Text>
              </View>
            ) : null}
            {afterPhoto ? (
              <View>
                <PhotoPreview
                  uri={afterPhoto.uri}
                  onRetake={() => { setAfterPhoto(null); setValidationErrors([]); }}
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
                onError={(error) => setCameraError(error)}
                requireGPS={true}
              />
            )}
          </View>
        )}

        {/* Review & Submit */}
        {step === reviewStep && (
          <View style={styles.stepContent}>
            <Text style={styles.title}>Review & Submit</Text>
            <Text style={styles.description}>Review your photos and submit. GPS is on all photos.</Text>

            {selfiePhoto && (
              <View style={styles.reviewPhoto}>
                <Text style={styles.reviewLabel}>Selfie</Text>
                <PhotoPreview uri={selfiePhoto.uri} readonly />
              </View>
            )}

            {beforePhoto && (
              <View style={styles.reviewPhoto}>
                <Text style={styles.reviewLabel}>{isSinglePhotoQuest ? (isBanPlastic ? 'Plastic replacement' : 'Proof photo') : 'Before Photo'}</Text>
                <PhotoPreview uri={beforePhoto.uri} readonly />
              </View>
            )}

            {!isSinglePhotoQuest && afterPhoto && (
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
  inlineError: {
    backgroundColor: '#FFF0F0',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#E57373',
  },
  inlineErrorText: {
    fontSize: 14,
    color: '#C62828',
    fontWeight: '500',
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
  sponsorAd: {
    marginTop: 24,
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
