import * as React from 'react';
import { View, Text, StyleSheet, ScrollView, SafeAreaView, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRoute, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp as RNRouteProp } from '@react-navigation/native';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { api } from '../../api/client';
import { useAuth } from '../../auth/context';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/theme';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;
type RouteProp = RNRouteProp<AppStackParamList, 'CampaignDetail'>;

const { width } = Dimensions.get('window');

export function CampaignDetailScreen() {
  const route = useRoute<RouteProp>();
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();
  const { campaignId } = route.params;

  const { data: campaign, isLoading } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: () => api.campaigns.getById(campaignId),
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading challenge...</Text>
      </View>
    );
  }

  if (!campaign) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Challenge not found</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Custom Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
          <Text style={styles.headerIconText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Campaign Details</Text>
        <TouchableOpacity style={styles.headerIcon}>
          <Text style={styles.headerIconText}>⋮</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} bounces={false} showsVerticalScrollIndicator={false}>
        {/* Cover Image */}
        <View style={styles.imageContainer}>
          <Image 
            source={{ uri: 'https://images.unsplash.com/photo-1541963463532-d68292c34b19?auto=format&fit=crop&w=800&q=80' }} 
            style={styles.coverImage} 
          />
          <View style={styles.activeBadge}>
            <View style={styles.activeDot} />
            <Text style={styles.activeText}>ACTIVE</Text>
          </View>
        </View>

        {/* Campaign Info */}
        <View style={styles.content}>
          <Text style={styles.title}>{campaign.title || 'Downtown Mural Hunt'}</Text>
          <View style={styles.sponsorRow}>
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>✓</Text>
            </View>
            <Text style={styles.sponsorText}>Sponsored by City Arts Council</Text>
          </View>

          {/* Reward Card */}
          <Card style={styles.rewardCard}>
            <View style={styles.rewardInfo}>
              <Text style={styles.rewardLabel}>REWARD PER VERIFIED PHOTO</Text>
              <Text style={styles.rewardValue}>
                50 <Text style={{ color: Colors.primaryBright }}>Tickets</Text>
              </Text>
            </View>
            <View style={styles.ticketIconContainer}>
              <Text style={styles.ticketIcon}>🎟️</Text>
            </View>
          </Card>

          {/* Required Proof */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>☑️</Text>
              <Text style={styles.sectionTitle}>Required Proof</Text>
            </View>

            <View style={styles.timeline}>
              {/* Step 1 */}
              <View style={styles.timelineItem}>
                <View style={styles.timelineNodeContainer}>
                  <View style={[styles.timelineNode, styles.nodeActive]}>
                    <Text style={styles.nodeIcon}>📍</Text>
                  </View>
                  <View style={styles.timelineConnector} />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Check-in via GPS</Text>
                  <Text style={styles.timelineDesc}>You must be within 50m of the mural location.</Text>
                </View>
              </View>

              {/* Step 2 */}
              <View style={styles.timelineItem}>
                <View style={styles.timelineNodeContainer}>
                  <View style={styles.timelineNode}>
                    <Text style={styles.nodeIcon}>📸</Text>
                  </View>
                  <View style={styles.timelineConnector} />
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Take a photo</Text>
                  <Text style={styles.timelineDesc}>Capture the full mural. Lighting must be clear.</Text>
                </View>
              </View>

              {/* Step 3 */}
              <View style={[styles.timelineItem, { marginBottom: 0 }]}>
                <View style={styles.timelineNodeContainer}>
                  <View style={styles.timelineNode}>
                    <Text style={styles.nodeIcon}>👥</Text>
                  </View>
                </View>
                <View style={styles.timelineContent}>
                  <Text style={styles.timelineTitle}>Peer Review</Text>
                  <Text style={styles.timelineDesc}>Wait approx 2 hrs for community validation.</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Challenge Rules */}
          <Card style={styles.rulesCard}>
            <Text style={styles.rulesTitle}>Challenge Rules</Text>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleCheck}>✓</Text>
              <Text style={styles.ruleText}>Photo must be original and taken at the moment of check-in.</Text>
            </View>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleCheck}>✓</Text>
              <Text style={styles.ruleText}>Your face must be partially visible (selfie mode ok).</Text>
            </View>
            <View style={styles.ruleItem}>
              <Text style={styles.ruleCheck}>✓</Text>
              <Text style={styles.ruleText}>Limit one approved entry per person per 24 hours.</Text>
            </View>
          </Card>

          {/* Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitleOnly}>Location</Text>
            <View style={styles.mapContainer}>
              {/* Mock Map View */}
              <View style={styles.mockMap}>
                <View style={styles.mapCircle} />
                <View style={styles.mapDot} />
              </View>
              <TouchableOpacity style={styles.navigateButton}>
                <Text style={styles.navigateIcon}>▲</Text>
                <Text style={styles.navigateText}>Navigate</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Footer Actions */}
      <View style={styles.footer}>
        <Button 
          title="Join Challenge →" 
          onPress={() => {}} 
          variant="primary" 
          style={styles.joinButton}
        />
        <TouchableOpacity style={styles.faqLink}>
          <Text style={styles.faqText}>❓ FAQ: How verification works</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIconText: {
    fontSize: 24,
    color: Colors.navyBlack,
  },
  headerTitle: {
    ...Typography.body,
    fontWeight: '800',
    fontSize: 18,
  },
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...Typography.body,
    color: Colors.textGray,
  },
  imageContainer: {
    width: '100%',
    height: 220,
    position: 'relative',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  activeBadge: {
    position: 'absolute',
    bottom: Spacing.md,
    left: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.success,
    marginRight: 6,
  },
  activeText: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.navyBlack,
    letterSpacing: 0.5,
  },
  content: {
    padding: Spacing.lg,
  },
  title: {
    ...Typography.heading,
    fontSize: 26,
    color: Colors.navyBlack,
    marginBottom: 4,
    textAlign: 'left',
  },
  sponsorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  verifiedBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primaryBright,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  verifiedText: {
    color: Colors.white,
    fontSize: 10,
    fontWeight: 'bold',
  },
  sponsorText: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.textGray,
    fontWeight: '500',
  },
  rewardCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderColor: Colors.primaryBright,
    borderLeftWidth: 4,
    padding: Spacing.md,
    marginBottom: Spacing.xl,
  },
  rewardInfo: {
    flex: 1,
  },
  rewardLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textGray,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  rewardValue: {
    ...Typography.heading,
    fontSize: 28,
  },
  ticketIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ticketIcon: {
    fontSize: 24,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionTitle: {
    ...Typography.heading,
    fontSize: 18,
    color: Colors.navyBlack,
    textAlign: 'left',
  },
  sectionTitleOnly: {
    ...Typography.heading,
    fontSize: 18,
    color: Colors.navyBlack,
    textAlign: 'left',
    marginBottom: Spacing.md,
  },
  timeline: {
    paddingLeft: Spacing.sm,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  timelineNodeContainer: {
    alignItems: 'center',
    marginRight: Spacing.md,
    width: 40,
  },
  timelineNode: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  nodeActive: {
    borderColor: Colors.primaryBright,
    backgroundColor: '#EFF6FF',
  },
  nodeIcon: {
    fontSize: 18,
  },
  timelineConnector: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  timelineContent: {
    flex: 1,
    justifyContent: 'center',
  },
  timelineTitle: {
    ...Typography.body,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.navyBlack,
  },
  timelineDesc: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textGray,
    lineHeight: 18,
  },
  rulesCard: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    elevation: 0,
  },
  rulesTitle: {
    ...Typography.heading,
    fontSize: 14,
    color: Colors.navyBlack,
    marginBottom: Spacing.md,
    textAlign: 'left',
  },
  ruleItem: {
    flexDirection: 'row',
    marginBottom: Spacing.sm,
  },
  ruleCheck: {
    color: Colors.primaryBright,
    fontWeight: 'bold',
    marginRight: 8,
  },
  ruleText: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.navyBlack,
    flex: 1,
  },
  mapContainer: {
    height: 200,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    backgroundColor: '#E5E7EB',
    position: 'relative',
  },
  mockMap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#D1D5DB', // Slightly darker
  },
  mapCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: Colors.primaryBright,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
  },
  mapDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primaryBright,
    borderWidth: 2,
    borderColor: Colors.white,
    position: 'absolute',
  },
  navigateButton: {
    position: 'absolute',
    bottom: Spacing.md,
    right: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    ...Shadows.card,
  },
  navigateIcon: {
    color: Colors.primaryBright,
    marginRight: 6,
    fontSize: 12,
    transform: [{ rotate: '45deg' }],
  },
  navigateText: {
    ...Typography.body,
    fontSize: 14,
    fontWeight: '800',
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    alignItems: 'center',
  },
  joinButton: {
    width: '100%',
    marginBottom: Spacing.md,
  },
  faqLink: {
    padding: 4,
  },
  faqText: {
    ...Typography.body,
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primaryBright,
  },
});
