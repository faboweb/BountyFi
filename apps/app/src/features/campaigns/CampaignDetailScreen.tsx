// Campaign Detail Screen (BountyFi Playful Victory theme)
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp as RNRouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../api/client';
import { useAuth } from '../../auth/context';
import { Checkpoint } from '../../api/types';
import { Card, Button } from '../../components';
import { colors, typography, spacing } from '../../theme';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;
type RouteProp = RNRouteProp<AppStackParamList, 'CampaignDetail'>;

export function CampaignDetailScreen() {
  const route = useRoute<RouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const campaignId = route.params?.campaignId;

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => api.campaigns.getById(campaignId!),
    enabled: !!campaignId,
  });

  const { data: faceVerificationStatus } = useQuery({
    queryKey: ['faceVerification', campaignId],
    queryFn: () => api.faceVerification.getStatus(campaignId!),
    enabled: !!campaignId && !!campaign && campaign.requires_face_recognition && !!user,
  });

  if (!campaignId) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholderText}>Campaign not found</Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholderText}>Loading...</Text>
      </View>
    );
  }

  if (!campaign) {
    return (
      <View style={styles.container}>
        <Text style={styles.placeholderText}>Campaign not found</Text>
      </View>
    );
  }

  const handleStartTask = () => {
    if (campaign.checkpoints.length === 0) return;
    const checkpointId = campaign.checkpoints[0].id;
    if (campaign.requires_face_recognition && !faceVerificationStatus?.is_enrolled) {
      navigation.navigate('FaceVerification', { campaignId: campaign.id, checkpointId });
    } else {
      navigation.navigate('SubmitProof', { campaignId: campaign.id, checkpointId });
    }
  };

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
            <Card key={checkpoint.id} style={styles.checkpoint}>
              <Text style={styles.checkpointName}>
                {checkpoint.name || `Checkpoint ${checkpoint.id}`}
              </Text>
              <Text style={styles.checkpointCoords}>
                {checkpoint.lat.toFixed(4)}, {checkpoint.lng.toFixed(4)}
              </Text>
              <Text style={styles.checkpointRadius}>Radius: {checkpoint.radius}m</Text>
            </Card>
          ))}
        </View>

        <View style={styles.buttonRow}>
          <Button
            title="Donate"
            variant="secondary"
            onPress={() => navigation.navigate('CampaignDonate', { campaignId: campaign.id })}
            style={styles.buttonHalf}
          />
          <Button
            title="Start Task"
            variant="primary"
            onPress={handleStartTask}
            style={styles.buttonHalf}
          />
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.lightGray,
  },
  content: {
    padding: spacing.md,
  },
  placeholderText: {
    ...typography.body,
    color: colors.textGray,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  title: {
    ...typography.title,
    fontSize: 24,
    marginBottom: spacing.sm,
    color: colors.navyBlack,
  },
  description: {
    ...typography.body,
    color: colors.textGray,
    marginBottom: spacing.lg,
  },
  section: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.tagline,
    marginBottom: spacing.sm,
    color: colors.navyBlack,
  },
  prize: {
    ...typography.title,
    fontSize: 24,
    color: colors.admiralBlueBright,
  },
  checkpoint: {
    marginBottom: spacing.sm,
  },
  checkpointName: {
    ...typography.body,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  checkpointCoords: {
    ...typography.bodySecondary,
    marginBottom: spacing.xs,
  },
  checkpointRadius: {
    ...typography.caption,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  buttonHalf: {
    flex: 1,
  },
});
