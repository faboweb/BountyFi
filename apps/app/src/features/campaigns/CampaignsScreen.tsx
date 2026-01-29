// Campaigns List Screen (BountyFi Playful Victory theme)
import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../api/client';
import { Campaign } from '../../api/types';
import { Card, Button } from '../../components';
import { colors, typography, spacing } from '../../theme';

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
        <Text style={styles.loadingText}>Loading campaigns...</Text>
      </View>
    );
  }

  const ListFooter = () => (
    <Button
      title="Start a campaign (min 50 THB)"
      variant="success"
      onPress={() => navigation.navigate('StartCampaign')}
      style={styles.startCampaignButton}
    />
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={campaigns}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate('CampaignDetail', { campaignId: item.id })}
          >
            <Card style={styles.card}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.description}>{item.description}</Text>
              <Text style={styles.prize}>Prize: ${item.prize_total}</Text>
              <Text style={styles.status}>Status: {item.status}</Text>
            </Card>
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
    backgroundColor: colors.lightGray,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    color: colors.textGray,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  startCampaignButton: {
    marginTop: spacing.md,
  },
  card: {
    marginBottom: spacing.md,
  },
  title: {
    ...typography.title,
    marginBottom: spacing.sm,
  },
  description: {
    ...typography.bodySecondary,
    marginBottom: spacing.sm,
  },
  prize: {
    ...typography.body,
    fontWeight: '600',
    color: colors.admiralBlueBright,
    marginBottom: spacing.xs,
  },
  status: {
    ...typography.caption,
  },
});
