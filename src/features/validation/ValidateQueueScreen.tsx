// Validate Queue Screen
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuth } from '../../auth/context';
import { mockWebSocket } from '../../api/mock';
import { Submission, Campaign } from '../../api/types';
import { formatWalletAddress } from '../../utils/image';

export function ValidateQueueScreen() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [currentSubmissionIndex, setCurrentSubmissionIndex] = useState(0);

  const { data: submissions, isLoading, refetch } = useQuery({
    queryKey: ['submissions', 'pending'],
    queryFn: () => api.submissions.getPending(),
  });
  const visibleSubmissions =
    submissions?.filter((s: Submission) => !user || s.user_id !== user.id) ?? [];
  const currentSubmission = visibleSubmissions[currentSubmissionIndex];

  // Fetch campaign data for current submission
  const { data: campaign } = useQuery({
    queryKey: ['campaign', currentSubmission?.campaign_id],
    queryFn: () => currentSubmission ? api.campaigns.getById(currentSubmission.campaign_id) : null,
    enabled: !!currentSubmission,
  });

  // WebSocket subscription for vote updates
  useEffect(() => {
    const handleSubmissionUpdate = (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
    };

    const handleValidationUpdate = (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
    };

    mockWebSocket.on('submission.updated', handleSubmissionUpdate);
    mockWebSocket.on('validation.count.updated', handleValidationUpdate);

    return () => {
      mockWebSocket.removeListener('submission.updated', handleSubmissionUpdate);
      mockWebSocket.removeListener('validation.count.updated', handleValidationUpdate);
    };
  }, [queryClient]);

  const voteMutation = useMutation({
    mutationFn: async (vote: 'approve' | 'reject') => {
      if (!currentSubmission) {
        throw new Error('No submission selected');
      }
      return api.validations.submit({
        submission_id: currentSubmission.id,
        vote,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      // Move to next submission
      if (submissions && currentSubmissionIndex < submissions.length - 1) {
        setCurrentSubmissionIndex(currentSubmissionIndex + 1);
      } else {
        // Refresh to get new submissions
        refetch();
        setCurrentSubmissionIndex(0);
      }
    },
    onError: (error: any) => {
      Alert.alert('Error', error.message || 'Failed to submit vote');
    },
  });

  const handleVote = (vote: 'approve' | 'reject') => {
    Alert.alert(
      'Confirm Vote',
      `Are you sure you want to ${vote === 'approve' ? 'approve' : 'reject'} this submission?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: () => voteMutation.mutate(vote),
        },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  const handleInvite = async () => {
    try {
      await Share.share({
        message: 'Join me on BountyFi – earn tickets, win prizes, and make a difference in your community. Download the app and join campaigns!',
        title: 'Join BountyFi',
      });
    } catch (err) {
      // User cancelled or share failed
    }
  };

  if (!visibleSubmissions || visibleSubmissions.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Nothing to validate at the moment.</Text>
          <Text style={styles.emptySubtext}>Invite your friends to join campaigns</Text>
          <TouchableOpacity style={styles.inviteButton} onPress={handleInvite}>
            <Text style={styles.inviteButtonText}>Invite friends</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!currentSubmission) {
    return (
      <View style={styles.container}>
        <Text>Loading submission...</Text>
      </View>
    );
  }

  const isOwnSubmission = user && currentSubmission.user_id === user.id;
  const approveCount = currentSubmission.votes.filter((v: { vote: string }) => v.vote === 'approve').length;
  const rejectCount = currentSubmission.votes.filter((v: { vote: string }) => v.vote === 'reject').length;
  const totalVotes = currentSubmission.votes.length;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Submission counter */}
        <View style={styles.counter}>
          <Text style={styles.counterText}>
            Submission {currentSubmissionIndex + 1} of {visibleSubmissions.length}
          </Text>
        </View>

        {/* Photos – before/after only */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Photos</Text>
          <View style={styles.photosContainer}>
            <View style={styles.photoItem}>
              <Text style={styles.photoLabel}>Before</Text>
              <Image source={{ uri: currentSubmission.before_photo_url }} style={styles.photo} />
            </View>
            <View style={styles.photoItem}>
              <Text style={styles.photoLabel}>After</Text>
              <Image source={{ uri: currentSubmission.after_photo_url }} style={styles.photo} />
            </View>
          </View>
        </View>

        {/* GPS info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <Text style={styles.infoText}>
            GPS: {currentSubmission.gps_lat.toFixed(6)}, {currentSubmission.gps_lng.toFixed(6)}
          </Text>
          <Text style={styles.infoText}>
            Time difference: {Math.round(
              (new Date(currentSubmission.after_timestamp).getTime() -
                new Date(currentSubmission.before_timestamp).getTime()) /
                60000
            )} minutes
          </Text>
        </View>

        {/* Vote count */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Votes</Text>
          <Text style={styles.voteText}>
            {totalVotes}/3 votes
          </Text>
          <Text style={styles.voteBreakdown}>
            ✓ Approve: {approveCount} | ✗ Reject: {rejectCount}
          </Text>
          {totalVotes >= 3 && (
            <Text style={styles.consensusText}>
              Consensus reached: {currentSubmission.status === 'approved' ? 'Approved ✓' : 'Rejected ✗'}
            </Text>
          )}
        </View>

        {/* Vote buttons – hide for own submissions */}
        {totalVotes < 3 && !isOwnSubmission && (
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.voteButton, styles.rejectButton]}
              onPress={() => handleVote('reject')}
              disabled={voteMutation.isPending}
            >
              {voteMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.voteButtonText}>✗ Reject</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.voteButton, styles.approveButton]}
              onPress={() => handleVote('approve')}
              disabled={voteMutation.isPending}
            >
              {voteMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.voteButtonText}>✓ Approve</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Navigation */}
        {visibleSubmissions.length > 1 && (
          <View style={styles.navigation}>
            <TouchableOpacity
              style={[styles.navButton, currentSubmissionIndex === 0 && styles.navButtonDisabled]}
              onPress={() => setCurrentSubmissionIndex(Math.max(0, currentSubmissionIndex - 1))}
              disabled={currentSubmissionIndex === 0}
            >
              <Text style={styles.navButtonText}>Previous</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.navButton,
                currentSubmissionIndex >= visibleSubmissions.length - 1 && styles.navButtonDisabled,
              ]}
              onPress={() =>
                setCurrentSubmissionIndex(
                  Math.min(visibleSubmissions.length - 1, currentSubmissionIndex + 1)
                )
              }
              disabled={currentSubmissionIndex >= visibleSubmissions.length - 1}
            >
              <Text style={styles.navButtonText}>Next</Text>
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
  counter: {
    marginBottom: 16,
  },
  counterText: {
    fontSize: 14,
    color: '#8E8E93',
    fontWeight: '600',
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  gestureText: {
    fontSize: 16,
    color: '#000',
  },
  photosContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  photoItem: {
    flex: 1,
    marginHorizontal: 4,
  },
  photoLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
    textAlign: 'center',
  },
  photo: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: '#000',
  },
  infoText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  voteText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  voteBreakdown: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  consensusText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  voteButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  approveButton: {
    backgroundColor: '#34C759',
  },
  rejectButton: {
    backgroundColor: '#FF3B30',
  },
  voteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  navigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  navButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#E5E5EA',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  navButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  inviteButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  inviteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
