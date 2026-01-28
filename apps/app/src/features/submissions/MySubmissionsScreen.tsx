// My Submissions Screen
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ScrollView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../api/client';
import { Submission } from '../../api/types';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

function getStatusColor(status: Submission['status']): string {
  switch (status) {
    case 'approved':
      return '#34C759';
    case 'rejected':
      return '#FF3B30';
    case 'pending':
      return '#FF9500';
    default:
      return '#8E8E93';
  }
}

function getStatusText(submission: Submission): string {
  if (submission.status === 'approved') {
    return 'Approved ✓';
  }
  if (submission.status === 'rejected') {
    return 'Rejected ✗';
  }
  const approveCount = submission.votes.filter(v => v.vote === 'approve').length;
  const rejectCount = submission.votes.filter(v => v.vote === 'reject').length;
  const totalVotes = submission.votes.length;
  return `Pending (${totalVotes}/3 votes)`;
}

export function MySubmissionsScreen() {
  const navigation = useNavigation<NavigationProp>();

  const { data: submissions, isLoading } = useQuery({
    queryKey: ['submissions', 'my'],
    queryFn: () => api.submissions.getMy(),
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!submissions || submissions.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No submissions yet</Text>
        <Text style={styles.emptySubtext}>Start a campaign to submit your first proof!</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={submissions}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.card}
          onPress={() => {
            // Navigate to detail view (to be implemented)
          }}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Submission #{item.id.slice(-6)}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(item.status) },
              ]}
            >
              <Text style={styles.statusText}>{getStatusText(item)}</Text>
            </View>
          </View>

          <View style={styles.photosRow}>
            <Image source={{ uri: item.before_photo_url }} style={styles.thumbnail} />
            <Image source={{ uri: item.after_photo_url }} style={styles.thumbnail} />
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.timestamp}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
            {item.status === 'pending' && (
              <Text style={styles.voteInfo}>
                {item.votes.filter((v: { vote: string }) => v.vote === 'approve').length} approve,{' '}
                {item.votes.filter((v: { vote: string }) => v.vote === 'reject').length} reject
              </Text>
            )}
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  photosRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  thumbnail: {
    width: '30%',
    height: 80,
    borderRadius: 8,
    backgroundColor: '#000',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timestamp: {
    fontSize: 12,
    color: '#8E8E93',
  },
  voteInfo: {
    fontSize: 12,
    color: '#666',
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    marginTop: 8,
  },
});
