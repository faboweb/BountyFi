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
} from 'react-native';
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
          {/* Quest Rules */}
          <View style={styles.questRulesCard}>
            <Text style={styles.questRulesTitle}>Quest rules</Text>
            <View style={styles.questRulesList}>
              <View style={styles.questRuleRow}>
                <Text style={styles.questRuleIcon}>✓</Text>
                <Text style={styles.questRuleItem}>Photo must be clear and in focus</Text>
              </View>
              <View style={styles.questRuleRow}>
                <Text style={styles.questRuleIcon}>✓</Text>
                <Text style={styles.questRuleItem}>No people or faces in frame</Text>
              </View>
              <View style={styles.questRuleRow}>
                <Text style={styles.questRuleIcon}>✓</Text>
                <Text style={styles.questRuleItem}>Before is dirty / after is visibly clean</Text>
              </View>
            </View>
          </View>

          {/* Review task card – primary blue, per HTML */}
          <View style={styles.juryCard}>
            <View style={styles.juryBadge}>
              <Text style={styles.juryBadgeText}>
                {isAudit ? 'Spot check' : 'Review'} #{juryTaskNum}
              </Text>
            </View>
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
                <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.accentNo }]} />
                <View style={styles.voteBtnContent}>
                  <Text style={styles.voteBtnText}>No</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voteBtn, styles.voteApprove]}
                onPress={() => handleVote('approve')}
                disabled={voteMutation.isPending}
              >
                <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.accentYes }]} />
                <View style={styles.voteBtnContent}>
                  <Text style={styles.voteBtnText}>Yes</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voteBtn, styles.voteUnclear]}
                onPress={handleUnclear}
              >
                <View style={styles.voteBtnContent}>
                  <Text style={styles.voteUnclearText}>Not sure</Text>
                </View>
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

        {/* Your stats – per HTML design */}
        <View style={styles.juryStatsCard}>
          <Text style={styles.juryStatsLabel}>YOUR STATS</Text>
          <View style={styles.juryStatsRow}>
            <View style={styles.juryStatItem}>
              <View style={styles.juryStatValueRow}>
                <Text style={[styles.juryStatValue, { color: Colors.sunshine }]}>{diamonds}</Text>
                <Text style={styles.juryStatDiamond}>💎</Text>
              </View>
              <Text style={styles.juryStatLabel}>Diamonds</Text>
            </View>
            <View style={styles.juryStatItem}>
              <Text style={[styles.juryStatValue, { color: Colors.ivoryBlueDark }]}>
                {userData?.validations_completed ?? user?.validations_completed ?? 0}
              </Text>
              <Text style={styles.juryStatLabel}>Reviewed</Text>
            </View>
            <View style={styles.juryStatItem}>
              <Text style={[styles.juryStatValue, { color: Colors.ivoryBlueDark }]}>
                {auditFailCount}/3
              </Text>
              <Text style={styles.juryStatLabel}>Wrong</Text>
            </View>
          </View>
          <View style={styles.trustedNoteWrapper}>
            <Text style={styles.trustedNote}>Your trusted network wins together — 3 wrong answers and the network loses 1 ticket.</Text>
          </View>
        </View>
      </Animated.View>
    </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.backgroundLight,
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
    fontSize: 36,
    color: Colors.ivoryBlue,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textGray,
    marginTop: 4,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingTop: 0,
    paddingBottom: 100,
  },
  juryCard: {
    backgroundColor: Colors.ivoryBlue,
    borderRadius: 32,
    padding: Spacing.lg,
    paddingBottom: 43,
    marginBottom: Spacing.lg,
    overflow: 'visible',
    ...Shadows.card,
  },
  juryBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 9999,
    marginBottom: Spacing.md,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  juryBadgeText: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 11,
    color: Colors.white,
    letterSpacing: 1,
  },
  juryTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 20,
    color: Colors.white,
    marginBottom: Spacing.md,
  },
  questRulesCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.creamDark,
    ...Shadows.sm,
  },
  questRulesTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 18,
    color: Colors.ivoryBlue,
    marginBottom: Spacing.md,
  },
  questRulesList: {
    gap: 12,
  },
  questRuleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  questRuleIcon: {
    fontSize: 18,
    color: Colors.ivoryBlue,
    fontWeight: '700',
  },
  questRuleItem: {
    flex: 1,
    fontSize: 14,
    color: Colors.textGray,
    lineHeight: 20,
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
    gap: 16,
    marginBottom: Spacing.lg,
  },
  halfPhoto: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: Colors.creamDark,
    borderRadius: 16,
    overflow: 'hidden',
  },
  photoLabel: {
    position: 'absolute',
    top: 8,
    left: 12,
    zIndex: 10,
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 1,
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
    flex: 1,
    backgroundColor: Colors.creamDark,
  },
  submissionImagePlaceholder: {
    width: '100%',
    flex: 1,
    backgroundColor: Colors.creamDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trustedNote: {
    fontSize: 10,
    color: Colors.textGray,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  submissionPlaceholder: {
    fontSize: 48,
  },
  juryQuestion: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.white,
    lineHeight: 22,
    marginBottom: Spacing.lg,
    opacity: 0.95,
  },
  voteButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  voteBtn: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 16,
    paddingHorizontal: 6,
    borderRadius: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    ...Shadows.card,
  },
  voteApprove: {
    minWidth: '45%',
  },
  voteReject: {
    minWidth: '45%',
  },
  voteUnclear: {
    width: '100%',
    maxWidth: '100%',
    backgroundColor: Colors.white,
    paddingVertical: 16,
    paddingHorizontal: 6,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  voteBtnContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voteBtnText: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 18,
    color: Colors.white,
    textAlign: 'center',
  },
  voteUnclearText: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 18,
    color: Colors.ivoryBlue,
    textAlign: 'center',
  },
  ownSubmissionBanner: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  ownSubmissionText: {
    color: Colors.white,
    fontWeight: '600',
    fontSize: 12,
  },
  juryStatsCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.creamDark,
    marginTop: Spacing.md,
    ...Shadows.sm,
  },
  juryStatsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textGray,
    letterSpacing: 1,
    marginBottom: Spacing.lg,
  },
  juryStatsRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  juryStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  juryStatValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  juryStatValue: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '800',
    fontSize: 24,
  },
  juryStatDiamond: {
    fontSize: 20,
  },
  juryStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textGray,
    letterSpacing: 0.5,
    marginTop: 4,
  },
  trustedNoteWrapper: {
    marginTop: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.creamDark,
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
