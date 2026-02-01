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
  SafeAreaView,
  Modal,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { useAuth } from '../../auth/context';
import { mockWebSocket, MOCK_AUDIT_SAME_IMG } from '../../api/mock';
import { API_CONFIG } from '../../config/api';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/theme';
import { Submission } from '../../api/types';
import { Button } from '../../components/Button';

/** Pending vote in bucket (not yet saved) */
type PendingVote = {
  submission_id?: string;
  vote: 'approve' | 'reject';
  is_audit: boolean;
};

/** Queue item: real submission or synthetic audit (same image as before & after; correct vote = reject) */
type QueueItem = (Submission & { is_audit?: boolean; is_single_photo?: boolean }) | { id: string; campaign_id?: string; before_photo_url: string; after_photo_url: string; is_audit: true };

const AUDIT_PROBABILITY = 0.2; // ~20% of items can be random audits

/** Demo: field with trash, same image left & right */
const DEMO_FIELD_WITH_TRASH_IMAGE =
  'https://images.unsplash.com/photo-1592890278983-18616401d4ed?w=800';

function buildQueue(visibleSubmissions: Submission[]): QueueItem[] {
  // Mock mode: fixed demo sequence — 1) plastic bag (decline) 2) proper cleanup (approve) 3) audit (approve → −1 diamond)
  if (API_CONFIG.USE_MOCK_API) {
    const demo = visibleSubmissions.filter(
      (s) => s.id === 'mock_demo_plastic' || s.id === 'mock_demo_cleanup'
    );
    if (demo.length >= 2) {
      return [
        demo.find((s) => s.id === 'mock_demo_plastic')!,
        demo.find((s) => s.id === 'mock_demo_cleanup')!,
        {
          id: 'mock_demo_audit',
          campaign_id: 'campaign_uniserv',
          before_photo_url: MOCK_AUDIT_SAME_IMG,
          after_photo_url: MOCK_AUDIT_SAME_IMG,
          is_audit: true,
        },
      ];
    }
  }

  const list: QueueItem[] = [];
  const firstCampaignId = visibleSubmissions[0]?.campaign_id;
  list.push({
    id: 'demo_audit_field_trash',
    campaign_id: firstCampaignId,
    before_photo_url: DEMO_FIELD_WITH_TRASH_IMAGE,
    after_photo_url: DEMO_FIELD_WITH_TRASH_IMAGE,
    is_audit: true,
  });
  visibleSubmissions.forEach((sub, i) => {
    list.push(sub);
    if (sub.before_photo_url && sub.after_photo_url && Math.random() < AUDIT_PROBABILITY) {
      const sameImage = Math.random() < 0.5 ? sub.before_photo_url : sub.after_photo_url;
      list.push({
        id: `audit_${Date.now()}_${i}`,
        campaign_id: sub.campaign_id,
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
  const [pendingVotes, setPendingVotes] = useState<PendingVote[]>([]);

  // Transaction modal flow
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showTxPendingModal, setShowTxPendingModal] = useState(false);
  const [showTxSuccessModal, setShowTxSuccessModal] = useState(false);
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
    if (queue.length === 0 && !isLoading) {
      setQueue(buildQueue(visibleSubmissions));
    }
  }, [visibleSubmissions.length, isLoading, queue.length]);

  const currentItem = queue[currentIndex];
  const isAudit = currentItem?.is_audit === true;
  const currentSubmission = !isAudit ? (currentItem as Submission) : null;

  const [imageErrors, setImageErrors] = useState<{ before?: boolean; after?: boolean }>({});
  useEffect(() => {
    setImageErrors({});
  }, [currentIndex, currentItem?.id]);
  const onBeforeError = () => setImageErrors((e) => ({ ...e, before: true }));
  const onAfterError = () => setImageErrors((e) => ({ ...e, after: true }));

  const campaignId = currentSubmission?.campaign_id ?? (currentItem as { campaign_id?: string })?.campaign_id;
  const { data: campaign } = useQuery({
    queryKey: ['campaign', campaignId],
    queryFn: async () => {
      try {
        return campaignId ? await api.campaigns.getById(campaignId) : null;
      } catch {
        return null;
      }
    },
    enabled: !!campaignId,
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
    setTimeout(callback, 50);
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

  /** Add vote to bucket and advance to next (no API call yet) */
  const handleVote = (vote: 'approve' | 'reject') => {
    const newVote: PendingVote = {
      submission_id: currentSubmission?.id,
      vote,
      is_audit: isAudit ?? false,
    };
    setPendingVotes((prev) => [...prev, newVote]);
    advanceToNext();
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const regular = pendingVotes.filter((v) => !v.is_audit && v.submission_id);
      const audits = pendingVotes.filter((v) => v.is_audit);

      let diamondsToAdd = 0;
      const penaltyAlerts: string[] = [];

      // 1. Batch submit regular votes
      if (regular.length > 0) {
        const { successCount } = await api.validations.submitBatch(
          regular.map((v) => ({ submission_id: v.submission_id!, vote: v.vote }))
        );
        diamondsToAdd += successCount;
      }

      // 2. Process audits one by one (penalty may be cumulative)
      for (const a of audits) {
        if (a.vote === 'reject') {
          diamondsToAdd += 1; // Correct audit = +1 diamond
        } else {
          const penalty = await api.users.recordAuditPenalty();
          const msg =
            penalty.trusted_network_lost_ticket
              ? 'Third miss: your trusted network loses 1 ticket.'
              : penalty.diamonds_lost > 0
                ? `Wrong answer. −${penalty.diamonds_lost} 💎`
                : '';
          if (msg) penaltyAlerts.push(msg);
        }
      }

      // 3. Add diamonds once for all (regular success + audit correct)
      if (diamondsToAdd > 0) {
        await api.users.addDiamonds(diamondsToAdd);
      }

      return { penaltyAlerts };
    },
    onSuccess: (data: { penaltyAlerts: string[] }) => {
      setShowTxPendingModal(false);
      setPendingVotes([]);
      setQueue([]);
      setCurrentIndex(0);
      if (data?.penaltyAlerts?.length) {
        Alert.alert('Result', data.penaltyAlerts.join('\n\n'), [{ text: 'OK' }]);
      }
      setShowTxSuccessModal(true);
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      if (refreshUser) refreshUser();
      if (user?.id) refetchUser();
    },
    onError: (error: any) => {
      setShowTxPendingModal(false);
      Alert.alert('Error', error.message || 'Failed to save votes');
    },
  });

  const handleSavePress = () => {
    if (pendingVotes.length === 0) return;
    setShowConfirmModal(true);
  };

  const handleConfirmSave = () => {
    setShowConfirmModal(false);
    setShowTxPendingModal(true);
    saveMutation.mutate();
  };

  const handleTxSuccessDone = () => {
    setShowTxSuccessModal(false);
  };
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
        {pendingVotes.length > 0 && (
          <View style={[styles.unsavedBanner, styles.unsavedBannerAbsolute]}>
            <View style={styles.unsavedContent}>
              <Text style={styles.unsavedBadge}>⚠</Text>
              <Text style={styles.unsavedText}>
                {pendingVotes.length} vote{pendingVotes.length !== 1 ? 's' : ''} not saved
              </Text>
            </View>
            <Button
              title="Save votes"
              variant="primary"
              onPress={handleSavePress}
              loading={saveMutation.isPending}
              style={styles.saveButton}
            />
          </View>
        )}
      </SafeAreaView>
    );
  }

  if (!hasQueue || !currentItem) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.center, { flex: 1 }]}>
          <ActivityIndicator size="large" color={Colors.ivoryBlue} />
        </View>
        {pendingVotes.length > 0 && (
          <View style={[styles.unsavedBanner, styles.unsavedBannerAbsolute]}>
            <View style={styles.unsavedContent}>
              <Text style={styles.unsavedBadge}>⚠</Text>
              <Text style={styles.unsavedText}>
                {pendingVotes.length} vote{pendingVotes.length !== 1 ? 's' : ''} not saved
              </Text>
            </View>
            <Button
              title="Save votes"
              variant="primary"
              onPress={handleSavePress}
              loading={saveMutation.isPending}
              style={styles.saveButton}
            />
          </View>
        )}
      </SafeAreaView>
    );
  }

  const isOwnSubmission = !isAudit && user && (currentItem as Submission).user_id === user.id;
  const beforeUri = currentItem.before_photo_url;
  const afterUri = currentItem.after_photo_url;
  const isSinglePhoto = (currentItem as Submission & { is_single_photo?: boolean })?.is_single_photo === true;
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
        showsVerticalScrollIndicator={true}
        bounces={true}
      >
        <View>
          {/* Campaign name */}
          <View style={styles.campaignNameCard}>
            <Text style={styles.campaignNameLabel}>Campaign</Text>
            <Text style={styles.campaignNameTitle}>
              {campaign?.title ?? (isAudit ? 'Spot check' : '—')}
            </Text>
          </View>

          {/* Rules of campaign */}
          <View style={styles.questRulesCard}>
            <Text style={styles.questRulesTitle}>Rules</Text>
            {campaign?.description ? (
              <Text style={styles.questRulesBody}>{campaign.description}</Text>
            ) : (
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
            )}
          </View>

          {/* Submission – review task card */}
          <View style={styles.juryCard}>
            <View style={styles.juryBadge}>
              <Text style={styles.juryBadgeText}>
                Review #{juryTaskNum}
              </Text>
            </View>
            <Text style={styles.juryTitle}>
              {isSinglePhoto ? 'Submission' : 'Submission (before & after)'}
            </Text>

            {isSinglePhoto ? (
              <View style={styles.singlePhotoRow}>
                <Text style={styles.photoLabel}>Submission</Text>
                {beforeUri && !imageErrors.before ? (
                  <Image
                    source={{ uri: beforeUri }}
                    style={styles.singlePhotoImage}
                    resizeMode="cover"
                    onError={onBeforeError}
                  />
                ) : (
                  <View style={styles.singlePhotoPlaceholder}>
                    <Text style={styles.submissionPlaceholder}>🖼️</Text>
                  </View>
                )}
              </View>
            ) : (
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
            )}

            <Text style={styles.juryQuestion}>
              {isSinglePhoto
                ? 'Does this photo look valid and follow the mission rules?'
                : 'Does this before & after look valid and follow the mission rules?'}
            </Text>

          {!isOwnSubmission ? (
            <View style={styles.voteButtons}>
              <TouchableOpacity
                style={[styles.voteBtn, styles.voteReject]}
                onPress={() => handleVote('reject')}
              >
                <View style={[StyleSheet.absoluteFill, { backgroundColor: Colors.accentNo }]} />
                <View style={styles.voteBtnContent}>
                  <Text style={styles.voteBtnText}>No</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.voteBtn, styles.voteApprove]}
                onPress={() => handleVote('approve')}
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
              <Text style={[styles.juryStatValue, { color: Colors.textPrimary }]}>
                {userData?.validations_completed ?? user?.validations_completed ?? 0}
              </Text>
              <Text style={styles.juryStatLabel}>Reviewed</Text>
            </View>
            <View style={styles.juryStatItem}>
              <Text style={[styles.juryStatValue, { color: Colors.textPrimary }]}>
                {auditFailCount}/3
              </Text>
              <Text style={styles.juryStatLabel}>Wrong</Text>
            </View>
          </View>
          <View style={styles.trustedNoteWrapper}>
            <Text style={styles.trustedNote}>Your trusted network wins together — 3 wrong answers and the network loses 1 ticket.</Text>
          </View>
        </View>
      </View>

        {/* Big red unsaved indicator + Save button - inside ScrollView so it doesn't block scrolling */}
        {pendingVotes.length > 0 && (
          <View style={[styles.unsavedBanner, styles.unsavedBannerInScroll]}>
            <View style={styles.unsavedContent}>
              <Text style={styles.unsavedBadge}>⚠</Text>
              <Text style={styles.unsavedText}>
                {pendingVotes.length} vote{pendingVotes.length !== 1 ? 's' : ''} not saved
              </Text>
            </View>
            <Button
              title="Save votes"
              variant="primary"
              onPress={handleSavePress}
              loading={saveMutation.isPending}
              style={styles.saveButton}
            />
          </View>
        )}
    </ScrollView>

      {/* Confirm Save Modal */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Confirm transaction</Text>
            <Text style={styles.modalBody}>
              Submit {pendingVotes.length} vote{pendingVotes.length !== 1 ? 's' : ''} to the blockchain. This will save all your validations.
            </Text>
            <View style={styles.modalActions}>
              <Button
                title="Cancel"
                variant="secondary"
                onPress={() => setShowConfirmModal(false)}
                style={styles.modalBtn}
              />
              <Button
                title="Save votes"
                variant="primary"
                onPress={handleConfirmSave}
                style={styles.modalBtn}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Transaction Pending Modal */}
      <Modal visible={showTxPendingModal} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <ActivityIndicator size="large" color={Colors.ivoryBlue} style={styles.txSpinner} />
            <Text style={styles.modalTitle}>Transaction pending</Text>
            <Text style={styles.txPendingText}>
              Saving your votes. This may take a moment...
            </Text>
          </View>
        </View>
      </Modal>

      {/* Transaction Success Modal */}
      <Modal
        visible={showTxSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={handleTxSuccessDone}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.txSuccessEmoji}>✓</Text>
            <Text style={styles.modalTitle}>Votes saved</Text>
            <Text style={styles.txSuccessText}>Your validations have been submitted.</Text>
            <Button title="Done" variant="primary" onPress={handleTxSuccessDone} style={styles.modalDoneBtn} />
          </View>
        </View>
      </Modal>
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
  campaignNameCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.backgroundDark,
    ...Shadows.sm,
  },
  campaignNameLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.textGray,
    letterSpacing: 1,
    marginBottom: 4,
  },
  campaignNameTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 18,
    color: Colors.ivoryBlue,
  },
  questRulesCard: {
    backgroundColor: Colors.white,
    borderRadius: 24,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.backgroundDark,
    ...Shadows.sm,
  },
  questRulesTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 18,
    color: Colors.ivoryBlue,
    marginBottom: Spacing.md,
  },
  questRulesBody: {
    fontSize: 14,
    color: Colors.textGray,
    lineHeight: 22,
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
  singlePhotoRow: {
    marginBottom: Spacing.lg,
    position: 'relative',
    backgroundColor: Colors.backgroundDark,
    borderRadius: 16,
    overflow: 'hidden',
  },
  singlePhotoImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.backgroundDark,
  },
  singlePhotoPlaceholder: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: Colors.backgroundDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  twoPhotosRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: Spacing.lg,
  },
  halfPhoto: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: Colors.backgroundDark,
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
    backgroundColor: Colors.backgroundDark,
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
    backgroundColor: Colors.backgroundDark,
  },
  submissionImagePlaceholder: {
    width: '100%',
    flex: 1,
    backgroundColor: Colors.backgroundDark,
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
    borderColor: Colors.backgroundDark,
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
    borderTopColor: Colors.backgroundDark,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  emptyText: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 22,
    color: Colors.textPrimary,
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
    borderColor: Colors.backgroundDark,
  },
  refreshButtonText: {
    fontWeight: '700',
    color: Colors.ivoryBlue,
  },
  // Unsaved votes banner
  unsavedBanner: {
    backgroundColor: '#B91C1C',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    paddingBottom: Spacing.lg + 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.md,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    ...Shadows.card,
  },
  unsavedBannerInScroll: {
    marginTop: Spacing.lg,
    marginHorizontal: -Spacing.lg,
    marginBottom: Spacing.lg,
  },
  unsavedBannerAbsolute: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  unsavedContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  unsavedBadge: {
    fontSize: 24,
  },
  unsavedText: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 16,
    color: Colors.white,
  },
  saveButton: {
    minWidth: 140,
  },
  // Transaction modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modalContainer: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    width: '100%',
    maxWidth: 360,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  modalTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 20,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  modalBody: {
    fontSize: 15,
    color: Colors.textGray,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
    width: '100%',
  },
  modalBtn: { flex: 1 },
  txSpinner: { marginBottom: Spacing.md },
  txPendingText: {
    fontSize: 15,
    color: Colors.textGray,
    textAlign: 'center',
  },
  txSuccessEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  txSuccessText: {
    fontSize: 15,
    color: Colors.textGray,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  modalDoneBtn: { minWidth: 160 },
});
