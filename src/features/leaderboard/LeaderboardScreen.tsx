// Leaderboard Screen
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../api/client';
import { useAuth } from '../../auth/context';
import { LeaderboardEntry } from '../../api/types';
import { formatWalletAddress } from '../../utils/image';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

export function LeaderboardScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: () => api.leaderboard.get(),
  });

  const currentUserRank = leaderboard?.findIndex(
    (entry: LeaderboardEntry) => entry.user_id === user?.id
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!leaderboard || leaderboard.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.emptyText}>No leaderboard data</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Current user highlight */}
      {currentUserRank !== undefined && currentUserRank >= 0 && (
        <View style={styles.userHighlight}>
          <Text style={styles.userHighlightText}>
            You: #{leaderboard[currentUserRank].rank} with {leaderboard[currentUserRank].tickets} tickets
          </Text>
        </View>
      )}

      <FlatList
        data={leaderboard}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={styles.list}
        renderItem={({ item, index }) => {
          const isCurrentUser = item.user_id === user?.id;
          return (
            <View
              style={[
                styles.row,
                isCurrentUser && styles.currentUserRow,
                index < 3 && styles.topThreeRow,
              ]}
            >
              <View style={styles.rankContainer}>
                {index === 0 && <Text style={styles.medal}>🥇</Text>}
                {index === 1 && <Text style={styles.medal}>🥈</Text>}
                {index === 2 && <Text style={styles.medal}>🥉</Text>}
                <Text style={[styles.rank, index < 3 && styles.topThreeRank]}>
                  {item.rank}
                </Text>
              </View>
              <View style={styles.userInfo}>
                <Text style={styles.email}>{item.email}</Text>
                <Text style={styles.wallet}>{formatWalletAddress(item.wallet_address)}</Text>
              </View>
              <Text style={[styles.tickets, index < 3 && styles.topThreeTickets]}>
                {item.tickets}
              </Text>
            </View>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  userHighlight: {
    backgroundColor: '#007AFF',
    padding: 12,
    margin: 16,
    borderRadius: 8,
  },
  userHighlightText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  list: {
    padding: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  currentUserRow: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  topThreeRow: {
    backgroundColor: '#FFF9E6',
  },
  rankContainer: {
    width: 50,
    flexDirection: 'row',
    alignItems: 'center',
  },
  medal: {
    fontSize: 20,
    marginRight: 4,
  },
  rank: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  topThreeRank: {
    fontSize: 20,
    color: '#FF9500',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  email: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  wallet: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  tickets: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  topThreeTickets: {
    fontSize: 20,
    color: '#FF9500',
  },
  emptyText: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 100,
  },
});
