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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuth } from '../../auth/context';
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
            ? '3rd audit fail: your trusted network loses 1 ticket. Stay attentive!'
            : diamonds_lost > 0
              ? `Audit fail: −${diamonds_lost} 💎. Same-image pairs must be rejected.`
              : '';
        if (msg) Alert.alert('Audit penalty', msg, [{ text: 'OK' }]);
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
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.ivoryBlue} />
      </View>
    );
  }

  const hasQueue = queue.length > 0;
  const noPending = !visibleSubmissions?.length;

  if (noPending && !hasQueue) {
    return (
      <View style={[styles.container, styles.center, { padding: Spacing.xl }]}>
        <Text style={styles.emptyText}>Nothing left to validate. Come back soon!</Text>
      </View>
    );
  }

  if (!hasQueue || !currentItem) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.ivoryBlue} />
      </View>
    );
  }

  const isOwnSubmission = !isAudit && user && (currentItem as Submission).user_id === user.id;
  const beforeUri = currentItem.before_photo_url;
  const afterUri = currentItem.after_photo_url;
  const juryTaskNum = currentIndex + 1;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Animated.View style={{ opacity: fadeAnim }}>
        {/* Hybrid verification info – small pulse (lavender style) */}
        <Animated.View style={[styles.hybridCard, { opacity: hybridPulse }]}>
          <Text style={styles.hybridTitle}>Hybrid: 2 peers + 1 AI</Text>
          <Text style={styles.hybridDesc}>
            Deterministic checks: GPS ✓ · Photos ✓ · Rules ✓
          </Text>
          <View style={styles.hybridReward}>
            <Text style={styles.hybridRewardText}>+1 💎 per correct verification</Text>
          </View>
          <Text style={styles.hybridPenalty}>
            Random audits (same-image pairs): wrong vote → 1st −1💎, 2nd −5💎, 3rd your trusted network loses 1 ticket.
          </Text>
        </Animated.View>

        {/* Jury task */}
        <View style={styles.juryCard}>
          <LinearGradient
            colors={[Colors.lavender, '#9071C9']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.juryBadge}
          >
            <Text style={styles.juryBadgeText}>
              {isAudit ? '🔍 Audit' : '⚖️ Jury'} #{juryTaskNum}
            </Text>
          </LinearGradient>
          <Text style={styles.juryTitle}>
            {isAudit ? 'Same-image audit' : 'Review submission'}
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

          {!isAudit && (
            <View style={styles.juryInfo}>
              <View style={styles.infoChip}>
                <Text style={styles.infoLabel}>GPS</Text>
                <Text style={styles.infoValue}>✓</Text>
              </View>
              <View style={styles.infoChip}>
                <Text style={styles.infoLabel}>AI</Text>
                <Text style={styles.infoValue}>1 of 3</Text>
              </View>
              <View style={styles.infoChip}>
                <Text style={styles.infoLabel}>Reward</Text>
                <Text style={styles.infoValue}>+1 💎</Text>
              </View>
            </View>
          )}

          <Text style={styles.juryQuestion}>
            {isAudit
              ? 'Are these a valid before/after pair? (Same image = Reject)'
              : 'Does this submission show a valid before/after with GPS and rules met?'}
          </Text>

          {!isOwnSubmission ? (
            <View style={styles.voteButtons}>
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
                style={[styles.voteBtn, styles.voteUnclear]}
                onPress={handleUnclear}
              >
                <Text style={styles.voteUnclearText}>❓ Unclear / Skip</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.ownSubmissionBanner}>
              <Text style={styles.ownSubmissionText}>
                This is your submission. You cannot vote on it.
              </Text>
            </View>
          )}
        </View>

        {/* Jury stats: diamonds + audit tier */}
        <View style={styles.juryStatsCard}>
          <Text style={styles.juryStatsLabel}>Your jury stats</Text>
          <View style={styles.juryStatsRow}>
            <View style={styles.juryStatItem}>
              <Text style={[styles.juryStatValue, { color: Colors.sunshine }]}>{diamonds} 💎</Text>
              <Text style={styles.juryStatLabel}>Diamonds</Text>
            </View>
            <View style={styles.juryStatItem}>
              <Text style={[styles.juryStatValue, { color: Colors.ivoryBlue }]}>
                {userData?.validations_completed ?? user?.validations_completed ?? 0}
              </Text>
              <Text style={styles.juryStatLabel}>Votes cast</Text>
            </View>
            <View style={styles.juryStatItem}>
              <Text style={[styles.juryStatValue, { color: auditFailCount >= 2 ? Colors.coral : Colors.textGray }]}>
                {auditFailCount}/3
              </Text>
              <Text style={styles.juryStatLabel}>Audit tier</Text>
            </View>
          </View>
          {(userData?.trusted_network_ids?.length ?? user?.trusted_network_ids?.length ?? 0) > 0 && (
            <Text style={styles.trustedNote}>Trusted network: win together; 3rd audit fail = network loses 1 ticket</Text>
          )}
        </View>
      </Animated.View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.cream,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 100,
  },
  juryCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xxl,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
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
    color: Colors.ivoryBlueDark,
    marginBottom: Spacing.md,
  },
  hybridCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.lavender,
    ...Shadows.sm,
  },
  hybridTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.ivoryBlueDark,
    marginBottom: 4,
  },
  hybridDesc: {
    fontSize: 13,
    color: Colors.textGray,
    marginBottom: 8,
  },
  hybridReward: {
    marginBottom: 8,
  },
  hybridRewardText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.grass,
  },
  hybridPenalty: {
    fontSize: 12,
    color: Colors.textGray,
    lineHeight: 18,
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
    borderColor: Colors.ivoryBlueLight,
  },
  photoLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.textGray,
    paddingVertical: 4,
    paddingHorizontal: 8,
    backgroundColor: Colors.cream,
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
    color: Colors.textGray,
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  submissionPlaceholder: {
    fontSize: 48,
  },
  juryInfo: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: Spacing.lg,
  },
  infoChip: {
    flex: 1,
    backgroundColor: Colors.cream,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 11,
    color: Colors.textGray,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '600',
    fontSize: 16,
    color: Colors.ivoryBlueDark,
  },
  juryQuestion: {
    fontSize: 14,
    color: Colors.textGray,
    lineHeight: 22,
    marginBottom: Spacing.lg,
  },
  voteButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
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
    backgroundColor: Colors.cream,
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
    color: Colors.ivoryBlueDark,
  },
  ownSubmissionBanner: {
    backgroundColor: Colors.cream,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  ownSubmissionText: {
    color: Colors.textGray,
    fontWeight: '600',
    fontSize: 14,
  },
  juryStatsCard: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.card,
  },
  juryStatsLabel: {
    fontSize: 13,
    color: Colors.textGray,
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
    color: Colors.textGray,
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
