// Validate Queue Screen
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Dimensions,
  Animated,
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuth } from '../../auth/context';
import { mockWebSocket } from '../../api/mock';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/theme';
import { Card } from '../../components/Card';
import { Badge } from '../../components/Badge';
import { Submission, Campaign } from '../../api/types';

const { width } = Dimensions.get('window');

type VerificationType = 'comparison' | 'photo' | 'checkin';

export function ValidateQueueScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currentSubmissionIndex, setCurrentSubmissionIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const { data: submissions, isLoading, refetch } = useQuery({
    queryKey: ['submissions', 'pending'],
    queryFn: () => api.submissions.getPending(),
  });
  
  const visibleSubmissions =
    submissions?.filter((s) => !user || s.user_id !== user.id) ?? [];
  const currentSubmission = visibleSubmissions[currentSubmissionIndex];

  // Fetch campaign data for current submission
  const { data: campaign } = useQuery({
    queryKey: ['campaign', currentSubmission?.campaign_id],
    queryFn: () => currentSubmission ? api.campaigns.getById(currentSubmission.campaign_id) : null,
    enabled: !!currentSubmission,
  });

  // WebSocket subscription
  useEffect(() => {
    const handleSubmissionUpdate = () => queryClient.invalidateQueries({ queryKey: ['submissions'] });
    const handleValidationUpdate = () => queryClient.invalidateQueries({ queryKey: ['submissions'] });

    mockWebSocket.on('submission.updated', handleSubmissionUpdate);
    mockWebSocket.on('validation.count.updated', handleValidationUpdate);

    return () => {
      mockWebSocket.removeListener('submission.updated', handleSubmissionUpdate);
      mockWebSocket.removeListener('validation.count.updated', handleValidationUpdate);
    };
  }, [queryClient]);

  const animateTransition = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 150, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    setTimeout(callback, 150);
  };

  const voteMutation = useMutation({
    mutationFn: async (vote: 'approve' | 'reject') => {
      if (!currentSubmission) throw new Error('No submission selected');
      return api.validations.submit({ submission_id: currentSubmission.id, vote });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      animateTransition(() => {
        if (submissions && currentSubmissionIndex < submissions.length - 1) {
          setCurrentSubmissionIndex(currentSubmissionIndex + 1);
        } else {
          refetch();
          setCurrentSubmissionIndex(0);
        }
      });
    },
    onError: (error: any) => Alert.alert('Error', error.message || 'Failed to submit vote'),
  });

  const handleVote = (vote: 'approve' | 'reject') => voteMutation.mutate(vote);

  // Determine Verification View Type
  const getVerificationType = (sub: Submission): VerificationType => {
      if (sub.gesture_photo_url) return 'checkin';
      if (sub.before_photo_url && sub.after_photo_url && sub.before_photo_url !== sub.after_photo_url) return 'comparison';
      return 'photo';
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.primaryBright} />
      </View>
    );
  }

  if (!visibleSubmissions || visibleSubmissions.length === 0) {
    return (
      <View style={[styles.container, styles.center, { padding: Spacing.xl }]}>
        <View style={styles.emptyIconContainer}>
             <Text style={{ fontSize: 40 }}>🎉</Text>
        </View>
        <Text style={styles.emptyText}>All Caught Up!</Text>
        <Text style={styles.emptySubtext}>There are no pending submissions to verify right now. Check back later.</Text>
        <TouchableOpacity onPress={() => refetch()} style={styles.refreshButton}>
             <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentSubmission) return <View style={styles.container} />;

  const verificationType = getVerificationType(currentSubmission);
  const isOwnSubmission = user && currentSubmission.user_id === user.id;
  
  // Safe calculate time diff
  const timeDiff = (() => {
      const start = new Date(currentSubmission.before_timestamp).getTime();
      const end = new Date(currentSubmission.after_timestamp).getTime();
      return isNaN(start) || isNaN(end) ? 0 : Math.round((end - start) / 60000);
  })();

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
       <View style={styles.header}>
            <Text style={styles.headerTitle}>Verify Mission</Text>
            <View style={styles.counterBadge}>
                <Text style={styles.counterText}>{currentSubmissionIndex + 1} / {visibleSubmissions.length}</Text>
            </View>
       </View>

       <Animated.View style={{ opacity: fadeAnim, padding: Spacing.md }}>
         {/* Mission Info - Common for all */}
         <Card style={styles.missionCard}>
            <View style={styles.missionHeader}>
                <Badge label={verificationType.toUpperCase()} variant="blue" />
                {verificationType === 'comparison' && <Text style={styles.missionTime}>{timeDiff}min duration</Text>}
            </View>
            <Text style={styles.missionTitle}>{campaign?.title || 'Unknown Mission'}</Text>
            <View style={styles.locationRow}>
                <Text>📍</Text>
                <Text style={styles.locationText}>
                    {currentSubmission.gps_lat.toFixed(4)}, {currentSubmission.gps_lng.toFixed(4)}
                </Text>
            </View>
         </Card>

         {/* Dynamic Content Based on Type */}
         
         {/* TYPE: COMPARISON */}
         {verificationType === 'comparison' && (
             <View style={styles.evidenceSection}>
                <View style={styles.photoContainer}>
                    <Badge label="BEFORE" style={styles.photoBadge} variant="gray" />
                    <Image source={{ uri: currentSubmission.before_photo_url }} style={styles.photo} resizeMode="cover" />
                </View>
                <View style={styles.arrowContainer}>
                    <View style={styles.arrowCircle}>
                        <Text style={styles.arrowText}>→</Text>
                    </View>
                </View>
                <View style={styles.photoContainer}>
                    <Badge label="AFTER" style={[styles.photoBadge, { backgroundColor: Colors.success }]} />
                    <Image source={{ uri: currentSubmission.after_photo_url }} style={styles.photo} resizeMode="cover" />
                </View>
             </View>
         )}

         {/* TYPE: PHOTO */}
         {verificationType === 'photo' && (
             <View style={styles.singlePhotoSection}>
                 <Image source={{ uri: currentSubmission.before_photo_url }} style={styles.singlePhoto} resizeMode="cover" />
                 <Badge label="PROOF" style={styles.photoBadgeLarge} variant="blue" />
             </View>
         )}

         {/* TYPE: CHECKIN (Selfie + Map context) */}
         {verificationType === 'checkin' && (
             <View style={styles.checkinSection}>
                 <View style={styles.checkinPhotoContainer}>
                    <Image source={{ uri: currentSubmission.gesture_photo_url || currentSubmission.before_photo_url }} style={styles.checkinPhoto} resizeMode="cover" />
                    <Badge label="SELFIE" style={styles.photoBadge} variant="gold" />
                 </View>
                 <View style={styles.checkinMapContainer}>
                    <MapView
                      provider={PROVIDER_DEFAULT}
                      style={styles.map}
                      initialRegion={{
                        latitude: currentSubmission.gps_lat,
                        longitude: currentSubmission.gps_lng,
                        latitudeDelta: 0.005,
                        longitudeDelta: 0.005,
                      }}
                      liteMode={true}
                      scrollEnabled={false}
                      zoomEnabled={false}
                    >
                      <Marker
                        coordinate={{
                          latitude: currentSubmission.gps_lat,
                          longitude: currentSubmission.gps_lng,
                        }}
                      />
                    </MapView>
                    <View style={styles.mapBadge}>
                        <Text style={styles.mapBadgeText}>📍 Verified Location</Text>
                    </View>
                 </View>
             </View>
         )}
         
         {/* Action Buttons */}
         {!isOwnSubmission ? (
             <View style={styles.actionContainer}>
                 <TouchableOpacity 
                    style={[styles.actionBtn, styles.rejectBtn]}
                    onPress={() => handleVote('reject')}
                    disabled={voteMutation.isPending}
                 >
                    <Text style={[styles.actionBtnText, { color: Colors.error }]}>✗ Reject</Text>
                 </TouchableOpacity>
                 
                 <TouchableOpacity 
                    style={[styles.actionBtn, styles.approveBtn]}
                    onPress={() => handleVote('approve')}
                    disabled={voteMutation.isPending}
                 >
                    <Text style={[styles.actionBtnText, { color: Colors.white }]}>✓ Verify</Text>
                 </TouchableOpacity>
             </View>
         ) : (
             <View style={styles.ownSubmissionBanner}>
                 <Text style={styles.ownSubmissionText}>This is your submission. You cannot vote on it.</Text>
             </View>
         )}

       </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: Spacing.md,
      backgroundColor: Colors.white,
      borderBottomWidth: 1,
      borderBottomColor: '#F1F5F9',
  },
  headerTitle: {
      ...Typography.heading,
      fontSize: 18,
  },
  counterBadge: {
      backgroundColor: '#EFF6FF',
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: BorderRadius.full,
  },
  counterText: {
      color: Colors.primaryBright,
      fontWeight: '700',
      fontSize: 12,
  },
  missionCard: {
      marginBottom: Spacing.lg,
      padding: Spacing.md,
  },
  missionHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: Spacing.sm,
  },
  missionTime: {
      fontSize: 12,
      color: Colors.textGray,
      fontWeight: '600',
  },
  missionTitle: {
      ...Typography.heading,
      fontSize: 18,
      marginBottom: Spacing.xs,
  },
  locationRow: {
      flexDirection: 'row',
      alignItems: 'center',
  },
  locationText: {
      fontSize: 12,
      color: Colors.textGray,
      marginLeft: 4,
  },
  // Comparison Styles
  evidenceSection: {
      flexDirection: 'row',
      marginBottom: Spacing.xl,
      height: 180,
  },
  photoContainer: {
      flex: 1,
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      position: 'relative',
      ...Shadows.card,
  },
  photo: {
      width: '100%',
      height: '100%',
      backgroundColor: '#000',
  },
  photoBadge: {
      position: 'absolute',
      top: 8,
      left: 8,
      zIndex: 10,
  },
  arrowContainer: {
      width: 40,
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 10,
      marginLeft: -20,
      marginRight: -20,
  },
  arrowCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: Colors.white,
      justifyContent: 'center',
      alignItems: 'center',
      ...Shadows.card,
  },
  arrowText: {
      fontWeight: '900',
      color: Colors.primaryBright,
  },
  // Single Photo Styles
  singlePhotoSection: {
      height: 250,
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      marginBottom: Spacing.xl,
      ...Shadows.card,
      position: 'relative',
  },
  singlePhoto: {
      width: '100%',
      height: '100%',
      backgroundColor: '#000',
  },
  photoBadgeLarge: {
      position: 'absolute',
      top: 12,
      left: 12,
  },
  // Checkin Styles
  checkinSection: {
      flexDirection: 'row',
      height: 180,
      marginBottom: Spacing.xl,
      gap: Spacing.md,
  },
  checkinPhotoContainer: {
      flex: 1,
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      position: 'relative',
      ...Shadows.card,
  },
  checkinPhoto: {
      width: '100%',
      height: '100%',
  },
  checkinMapContainer: {
      flex: 1,
      borderRadius: BorderRadius.lg,
      overflow: 'hidden',
      position: 'relative',
      ...Shadows.card,
  },
  map: {
      width: '100%',
      height: '100%',
  },
  mapBadge: {
      position: 'absolute',
      bottom: 8,
      right: 8,
      backgroundColor: Colors.white,
      paddingHorizontal: 8,
      paddingVertical: 4,
      borderRadius: BorderRadius.sm,
      ...Shadows.sm,
  },
  mapBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: Colors.primaryBright,
  },
  // Action Buttons
  actionContainer: {
      flexDirection: 'row',
      gap: Spacing.md,
  },
  actionBtn: {
      flex: 1,
      paddingVertical: Spacing.lg,
      borderRadius: BorderRadius.full,
      alignItems: 'center',
      justifyContent: 'center',
      ...Shadows.sm,
  },
  rejectBtn: {
      backgroundColor: Colors.white,
      borderWidth: 2,
      borderColor: '#FEE2E2',
  },
  approveBtn: {
      backgroundColor: Colors.success,
  },
  actionBtnText: {
      fontWeight: '800',
      fontSize: 16,
  },
  ownSubmissionBanner: {
      backgroundColor: '#F3F4F6',
      padding: Spacing.md,
      borderRadius: BorderRadius.md,
      alignItems: 'center',
  },
  ownSubmissionText: {
      color: Colors.textGray,
      fontWeight: '600',
  },
  emptyIconContainer: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: '#F0F9FF',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: Spacing.lg,
  },
  emptyText: {
      ...Typography.heading,
      marginBottom: Spacing.sm,
  },
  emptySubtext: {
      textAlign: 'center',
      color: Colors.textGray,
      marginBottom: Spacing.xl,
      lineHeight: 22,
  },
  refreshButton: {
      paddingVertical: Spacing.md,
      paddingHorizontal: Spacing.xl,
      borderRadius: BorderRadius.full,
      backgroundColor: Colors.white,
      borderWidth: 1,
      borderColor: '#E2E8F0',
  },
  refreshButtonText: {
      fontWeight: '700',
      color: Colors.primaryBright,
  },
});
