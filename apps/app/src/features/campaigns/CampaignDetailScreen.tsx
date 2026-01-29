// Campaign Detail Screen
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp as RNRouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../api/client';
import { useAuth } from '../../auth/context';
import { Checkpoint } from '../../api/types';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;
type RouteProp = RNRouteProp<AppStackParamList, 'CampaignDetail'>;

export function CampaignDetailScreen() {
  const route = useRoute<RouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { campaignId } = route.params;

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => api.campaigns.getById(campaignId),
  });

  const { data: faceVerificationStatus } = useQuery({
    queryKey: ['faceVerification', campaignId],
    queryFn: () => api.faceVerification.getStatus(campaignId),
    enabled: !!campaign && campaign.requires_face_recognition && !!user,
  });

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!campaign) {
    return (
      <View style={styles.container}>
        <Text>Campaign not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>{campaign.title}</Text>
        <Text style={styles.description}>{campaign.description}</Text>
        
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Prize Pool</Text>
          <Text style={styles.prize}>${campaign.prize_total}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Checkpoints</Text>
          {campaign.checkpoints.map((checkpoint: Checkpoint) => (
            <View key={checkpoint.id} style={styles.checkpoint}>
              <Text style={styles.checkpointName}>{checkpoint.name || `Checkpoint ${checkpoint.id}`}</Text>
              <Text style={styles.checkpointCoords}>
                {checkpoint.lat.toFixed(4)}, {checkpoint.lng.toFixed(4)}
              </Text>
              <Text style={styles.checkpointRadius}>Radius: {checkpoint.radius}m</Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.button}
          onPress={() => {
            if (campaign.checkpoints.length === 0) return;
            
            const checkpointId = campaign.checkpoints[0].id;
            
            // Check if face verification is required and not yet enrolled
            if (campaign.requires_face_recognition && !faceVerificationStatus?.is_enrolled) {
              navigation.navigate('FaceVerification', {
                campaignId: campaign.id,
                checkpointId,
              });
            } else {
              navigation.navigate('SubmitProof', {
                campaignId: campaign.id,
                checkpointId,
              });
            }
          }}
        >
          <Text style={styles.buttonText}>Start Task</Text>
        </TouchableOpacity>
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
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: '#666',
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  prize: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  gesture: {
    fontSize: 16,
    color: '#000',
  },
  checkpoint: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  checkpointName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  checkpointCoords: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  checkpointRadius: {
    fontSize: 12,
    color: '#8E8E93',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
