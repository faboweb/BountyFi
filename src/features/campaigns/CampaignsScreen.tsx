// Campaigns List Screen
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../api/client';
import { Campaign } from '../../api/types';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

export function CampaignsScreen() {
  const navigation = useNavigation<NavigationProp>();
  
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.campaigns.getAll(),
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text>Loading campaigns...</Text>
      </View>
    );
  }

  const ListFooter = () => (
    <TouchableOpacity
      style={styles.startCampaignButton}
      onPress={() => navigation.navigate('StartCampaign')}
    >
      <Text style={styles.startCampaignButtonText}>Start a campaign (min 50 THB)</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={campaigns}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('CampaignDetail', { campaignId: item.id })}
          >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.description}>{item.description}</Text>
            <Text style={styles.prize}>Prize: ${item.prize_total}</Text>
            <Text style={styles.status}>Status: {item.status}</Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.list}
        ListFooterComponent={ListFooter}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 16,
    paddingBottom: 24,
  },
  startCampaignButton: {
    backgroundColor: '#34C759',
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  startCampaignButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  prize: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 4,
  },
  status: {
    fontSize: 12,
    color: '#8E8E93',
  },
});
