import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Animated,
  SafeAreaView,
  ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuth } from '../../auth/context';
import { getBountyFiContract } from '../../utils/contracts';
import { mockWebSocket } from '../../api/mock';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/theme';
import { Submission } from '../../api/types';

/** Queue item: real submission or synthetic audit (same image as before & after; correct vote = reject) */
type QueueItem = (Submission & { is_audit?: boolean }) | { id: string; before_photo_url: string; after_photo_url: string; is_audit: true };

const AUDIT_PROBABILITY = 0.2; // ~20% of items can be random audits

function buildQueue(visibleSubmissions: Submission[]): QueueItem[] {
  const list: QueueItem[] = [];
  visibleSubmissions.forEach((sub, i) => {
    list.push(sub);
    if (sub.before_photo_url && sub.after_photo_url && Math.random() < AUDIT_PROBABILITY) {
      const sameImage = Math.random() < 0.5 ? sub.before_photo_url : sub.after_photo_url;
      list.push({
        id: `audit_${Date.now()}_${i}`,
        before_photo_url: sameImage,
        after_photo_url: sameImage,
        is_audit: true,
      });
    }
  });
  return list;
}

export function ValidateQueueScreen() {
  const queryClient = useQueryClient();
  const { user, refreshUser } = useAuth();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const hybridPulse = useRef(new Animated.Value(1)).current;
  const queueRef = useRef<QueueItem[]>([]);
  const indexRef = useRef(0);
  const mountedRef = useRef(true);
  queueRef.current = queue;
  indexRef.current = currentIndex;
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const pulse = () => {
      Animated.sequence([
        Animated.timing(hybridPulse, { toValue: 0.88, duration: 600, useNativeDriver: true }),
        Animated.timing(hybridPulse, { toValue: 1, duration: 600, useNativeDriver: true }),
      ]).start(() => setTimeout(pulse, 2500));
    };
    setTimeout(pulse, 800);
  }, [hybridPulse]);

  const { data: submissions, isLoading, refetch } = useQuery({
    queryKey: ['submissions', 'pending'],
    queryFn: () => api.submissions.getPending(),
  });

  const visibleSubmissions = useMemo(
    () => submissions?.filter((s: Submission) => !user || s.user_id !== user.id) ?? [],
    [submissions, user]
  );

  useEffect(() => {
    if (visibleSubmissions.length > 0 && queue.length === 0) {
      setQueue(buildQueue(visibleSubmissions));
    }
  }, [visibleSubmissions.length]);

  const currentItem = queue[currentIndex];
  const isAudit = currentItem?.is_audit === true;
  const currentSubmission = !isAudit ? (currentItem as Submission) : null;

  const [imageErrors, setImageErrors] = useState<{ before?: boolean; after?: boolean }>({});
  useEffect(() => {
    setImageErrors({});
  }, [currentIndex, currentItem?.id]);
  const onBeforeError = () => setImageErrors((e) => ({ ...e, before: true }));
  const onAfterError = () => setImageErrors((e) => ({ ...e, after: true }));

  const { data: campaign } = useQuery({
    queryKey: ['campaign', currentSubmission?.campaign_id],
    queryFn: async () => {
      try {
        return currentSubmission ? await api.campaigns.getById(currentSubmission.campaign_id) : null;
      } catch {
        return null;
      }
    },
    enabled: !!currentSubmission,
  });

  const { data: userData, refetch: refetchUser } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.users.getMe(),
    enabled: !!user?.id,
  });
  const diamonds = userData?.diamonds ?? user?.diamonds ?? 0;
  const auditFailCount = userData?.audit_fail_count ?? user?.audit_fail_count ?? 0;

  useEffect(() => {
    const handleSubmissionUpdate = () =>
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
    const handleValidationUpdate = () =>
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
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

  const advanceToNext = () => {
    try {
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      if (refreshUser) refreshUser();
      if (user?.id) refetchUser();
    } catch (_) {
      // ignore
    }
    animateTransition(() => {
      if (!mountedRef.current) return;
      try {
        const q = queueRef.current;
        const idx = indexRef.current;
        const nextIndex = idx + 1;
        if (nextIndex < q.length) {
          setCurrentIndex(nextIndex);
        } else {
          setQueue([]);
          setCurrentIndex(0);
          try {
            refetch();
          } catch (_) {
            // ignore
          }
        }
      } catch (_) {
        setQueue([]);
        setCurrentIndex(0);
        try {
          refetch();
        } catch (_) {
          // ignore
        }
      }
    });
  };

  const voteMutation = useMutation({
    mutationFn: async (vote: 'approve' | 'reject'): Promise<{ penalty?: { diamonds_lost: number; trusted_network_lost_ticket: boolean } }> => {
      if (isAudit) {
        if (vote === 'reject') {
          await api.users.addDiamonds(1);
          return {};
        }
        const penalty = await api.users.recordAuditPenalty();
        return { penalty };
      }
      if (!currentSubmission) throw new Error('No submission selected');
      await api.validations.submit({ submission_id: currentSubmission.id, vote });
      await api.users.addDiamonds(1);
      return {};
    },
    onSuccess: (data: any) => {
      if (data?.penalty) {
        const { diamonds_lost, trusted_network_lost_ticket } = data.penalty;
        const msg =
          trusted_network_lost_ticket
            ? 'Third miss: your trusted network loses 1 ticket. Watch for spot checks — same photo twice means Reject.'
            : diamonds_lost > 0
              ? `That was a spot check. −${diamonds_lost} 💎 — reject when you see the same photo twice.`
              : '';
        if (msg) Alert.alert('Spot check', msg, [{ text: 'OK' }]);
      }
      // Defer so state updates happen after mutation completes (avoids crash when moving to next)
      setTimeout(() => advanceToNext(), 0);
    },
    onError: (error: any) => Alert.alert('Error', error.message || 'Failed to submit vote'),
  });

  const handleVote = (vote: 'approve' | 'reject') => voteMutation.mutate(vote);
  const handleUnclear = () => {
    animateTransition(() => {
      if (currentIndex < queue.length - 1) {
        setCurrentIndex(currentIndex + 1);
      } else {
        refetch();
        setQueue(visibleSubmissions.length ? buildQueue(visibleSubmissions) : []);
        setCurrentIndex(0);
      }
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center]}>
        <ActivityIndicator size="large" color={Colors.ivoryBlue} />
      </SafeAreaView>
    );
  }

  const hasQueue = queue.length > 0;
  const noPending = !visibleSubmissions?.length;

  if (noPending && !hasQueue) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Verify</Text>
        </View>
        <View style={[styles.emptyWrapper, styles.center]}>
          <View style={styles.emptyIconContainer}>
            <Text style={styles.emptyEmoji}>✨</Text>
          </View>
          <Text style={styles.emptyText}>All caught up!</Text>
          <Text style={styles.emptySubtext}>
            There are no submissions to review right now. Check back later — your help keeps the community honest.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasQueue || !currentItem) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.center]}>
        <ActivityIndicator size="large" color={Colors.ivoryBlue} />
      </SafeAreaView>
    );
  }

  const isOwnSubmission = !isAudit && user && (currentItem as Submission).user_id === user.id;
  const beforeUri = currentItem.before_photo_url;
  const afterUri = currentItem.after_photo_url;
  const juryTaskNum = currentIndex + 1;

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Verify</Text>
        <Text style={styles.headerSubtitle}>Review submissions, earn diamonds</Text>
      </View>
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* How it works – reward/penalty grid */}
          <Animated.View style={[styles.hybridCard, { opacity: hybridPulse }]}>
            <Text style={styles.hybridTitle}>How it works</Text>
            <Text style={styles.hybridDesc}>
              You and two other reviewers (plus AI) check location, photos, and rules. Correct votes earn rewards while mistakes carry penalties.
            </Text>
            <View style={styles.rewardPenaltyGrid}>
              <View style={styles.rewardPenaltyRow}>
                <Text style={styles.rewardPenaltyLabel}>Correct answer</Text>
                <Text style={[styles.rewardPenaltyValue, { color: Colors.sunshine }]}>+1 💎</Text>
              </View>
              <View style={styles.rewardPenaltyRow}>
                <Text style={styles.rewardPenaltyLabel}>Wrong answer</Text>
                <Text style={[styles.rewardPenaltyValue, { color: Colors.coral }]}>−1 💎</Text>
              </View>
              <View style={styles.rewardPenaltyRow}>
                <Text style={styles.rewardPenaltyLabel}>3 misses</Text>
                <Text style={[styles.rewardPenaltyValue, { color: Colors.sunshine }]}>−1 ticket</Text>
              </View>
            </View>
          </Animated.View>

          {/* Quest Rules */}
          <View style={styles.questRulesCard}>
            <Text style={styles.questRulesTitle}>Quest rules</Text>
            <View style={styles.questRulesList}>
              <Text style={styles.questRuleItem}>✓ Photo must be clear and in focus</Text>
              <Text style={styles.questRuleItem}>✓ No people or faces in frame</Text>
              <Text style={styles.questRuleItem}>✓ Before is dirty / after is visibly clean</Text>
            </View>
          </View>

          {/* Review task card */}
          <View style={styles.juryCard}>
            <LinearGradient
              colors={[Colors.ivoryBlue, Colors.ivoryBlueLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.juryBadge}
            >
              <Text style={styles.juryBadgeText}>
                {isAudit ? '🔍 Spot check' : '📋 Review'} #{juryTaskNum}
              </Text>
            </LinearGradient>
            <Text style={styles.juryTitle}>
              {isAudit ? 'Same photo twice — reject' : 'Before & after'}
            </Text>

          <View style={styles.twoPhotosRow}>
            <View style={styles.halfPhoto}>
              <Text style={styles.photoLabel}>Before</Text>
              {beforeUri && !imageErrors.before ? (
                <Image
                  source={{ uri: beforeUri }}
                  style={styles.submissionImage}
                  resizeMode="cover"
                  onError={onBeforeError}
                />
              ) : (
                <View style={styles.submissionImagePlaceholder}>
                  <Text style={styles.submissionPlaceholder}>🖼️</Text>
                </View>
              )}
            </View>
            <View style={styles.halfPhoto}>
              <Text style={styles.photoLabel}>After</Text>
              {afterUri && !imageErrors.after ? (
                <Image
                  source={{ uri: afterUri }}
                  style={styles.submissionImage}
                  resizeMode="cover"
                  onError={onAfterError}
                />
              ) : (
                <View style={styles.submissionImagePlaceholder}>
                  <Text style={styles.submissionPlaceholder}>🖼️</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.juryQuestion}>
            {isAudit
              ? 'This is a spot check. The same photo is used for both — tap Reject.'
              : 'Does this before & after look valid and follow the mission rules?'}
          </Text>

          {!isOwnSubmission ? (
            <View style={styles.voteButtons}>
              <TouchableOpacity
                style={[styles.voteBtn, styles.voteReject]}
                onPress={() => handleVote('reject')}
                disabled={voteMutation.isPending}
              >
                <LinearGradient
                  colors={[Colors.coral, '#FF6B4A']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.voteBtnText}>✗ Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voteBtn, styles.voteApprove]}
                onPress={() => handleVote('approve')}
                disabled={voteMutation.isPending}
              >
                <LinearGradient
                  colors={[Colors.grass, '#5DC561']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <Text style={styles.voteBtnText}>✓ Approve</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voteBtn, styles.voteUnclear]}
                onPress={handleUnclear}
              >
                <Text style={styles.voteUnclearText}>Skip</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.ownSubmissionBanner}>
              <Text style={styles.ownSubmissionText}>
                This one’s yours — skip to the next.
              </Text>
            </View>
          )}
        </View>

        {/* Your stats */}
        <View style={styles.juryStatsCard}>
          <Text style={styles.juryStatsLabel}>Your stats</Text>
          <View style={styles.juryStatsRow}>
            <View style={styles.juryStatItem}>
              <Text style={[styles.juryStatValue, { color: Colors.sunshine }]}>{diamonds} 💎</Text>
              <Text style={styles.juryStatLabel}>Diamonds</Text>
            </View>
            <View style={styles.juryStatItem}>
              <Text style={[styles.juryStatValue, { color: Colors.ivoryBlue }]}>
                {userData?.validations_completed ?? user?.validations_completed ?? 0}
              </Text>
              <Text style={styles.juryStatLabel}>Reviewed</Text>
            </View>
            <View style={styles.juryStatItem}>
              <Text style={[styles.juryStatValue, { color: auditFailCount >= 2 ? Colors.coral : Colors.textGray }]}>
                {auditFailCount}/3
              </Text>
              <Text style={styles.juryStatLabel}>Wrong answers</Text>
            </View>
          </View>
          {(userData?.trusted_network_ids?.length ?? user?.trusted_network_ids?.length ?? 0) > 0 && (
            <Text style={styles.trustedNote}>Your trusted network wins together — 3 wrong answers and the network loses 1 ticket.</Text>
          )}
        </View>
      </Animated.View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 28,
    color: Colors.ivoryBlueDark,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.ivoryBlueDark,
    marginTop: 4,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: 0,
    paddingBottom: 100,
  },
  juryCard: {
    backgroundColor: Colors.ivoryBlue,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.ivoryBlueDark,
    ...Shadows.card,
  },
  juryBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  juryBadgeText: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '600',
    fontSize: 14,
    color: Colors.white,
  },
  juryTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 20,
    color: Colors.white,
    marginBottom: Spacing.md,
  },
  hybridCard: {
    backgroundColor: Colors.ivoryBlue,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.ivoryBlueDark,
    ...Shadows.card,
  },
  hybridTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 18,
    color: Colors.white,
    marginBottom: Spacing.xs,
  },
  hybridDesc: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.95)',
    lineHeight: 22,
    marginBottom: Spacing.sm,
  },
  hybridPenalty: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 18,
  },
  rewardPenaltyGrid: {
    gap: Spacing.sm,
  },
  rewardPenaltyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.lg,
    backgroundColor: Colors.cream,
    marginBottom: Spacing.xs,
  },
  rewardPenaltyLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.ivoryBlueDark,
  },
  rewardPenaltyValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.ivoryBlueDark,
  },
  questRulesCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    borderWidth: 2,
    borderColor: Colors.creamDark,
    ...Shadows.card,
  },
  questRulesTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '600',
    fontSize: 18,
    color: Colors.ivoryBlueDark,
    marginBottom: Spacing.md,
  },
  questRulesList: {
    gap: Spacing.sm,
  },
  questRuleItem: {
    fontSize: 14,
    color: Colors.ivoryBlueDark,
    lineHeight: 22,
    marginBottom: Spacing.xs,
  },
  emptyWrapper: {
    flex: 1,
    padding: Spacing.xl,
  },
  emptyEmoji: {
    fontSize: 40,
  },
  twoPhotosRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.lg,
  },
  halfPhoto: {
    flex: 1,
    backgroundColor: Colors.creamDark,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(255,255,255,0.6)',
  },
  photoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.white,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  submissionPreview: {
    width: '100%',
    height: 200,
    backgroundColor: Colors.creamDark,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: Colors.ivoryBlueLight,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  submissionImage: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.creamDark,
  },
  submissionImagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: Colors.creamDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trustedNote: {
    fontSize: 11,
    color: Colors.ivoryBlueDark,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  submissionPlaceholder: {
    fontSize: 48,
  },
  juryQuestion: {
    fontSize: 14,
    color: Colors.white,
    lineHeight: 22,
    marginBottom: Spacing.md,
  },
  voteButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  voteBtn: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  voteApprove: {
    minWidth: '45%',
  },
  voteReject: {
    minWidth: '45%',
  },
  voteUnclear: {
    minWidth: '100%',
    backgroundColor: Colors.white,
  },
  voteBtnText: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '600',
    fontSize: 16,
    color: Colors.white,
  },
  voteUnclearText: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '600',
    fontSize: 16,
    color: Colors.ivoryBlue,
  },
  ownSubmissionBanner: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  ownSubmissionText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 14,
  },
  juryStatsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.creamDark,
    ...Shadows.card,
  },
  juryStatsLabel: {
    fontSize: 13,
    color: Colors.ivoryBlueDark,
    marginBottom: Spacing.sm,
  },
  juryStatsRow: {
    flexDirection: 'row',
    gap: 24,
    justifyContent: 'center',
  },
  juryStatItem: {
    alignItems: 'center',
  },
  juryStatValue: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 24,
  },
  juryStatLabel: {
    fontSize: 12,
    color: Colors.ivoryBlueDark,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyText: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 22,
    color: Colors.ivoryBlueDark,
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
    borderColor: Colors.creamDark,
  },
  refreshButtonText: {
    fontWeight: '700',
    color: Colors.ivoryBlue,
  },
});
