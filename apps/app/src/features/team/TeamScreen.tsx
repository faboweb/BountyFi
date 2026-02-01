import * as React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Dimensions, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { api, TRUSTNETWORK_ABI } from '../../api/client';
import { API_CONFIG } from '../../config/api';
import { Colors, Typography, Spacing, Shadows, BorderRadius } from '../../theme/theme';
import { Card } from '../../components/Card';
import { TransactionModal, TransactionStatus } from '../../components/TransactionModal';
import { getWallet } from '../../utils/contracts';
import { CHAIN_CONFIG } from '../../config/chain';
import { useAuth } from '../../auth/context';
import { TeamRequest } from '../../api/types';

const { width } = Dimensions.get('window');

export function TeamScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showLearnMore, setShowLearnMore] = React.useState(false);

  // Transaction state
  const [showTxModal, setShowTxModal] = React.useState(false);
  const [txStatus, setTxStatus] = React.useState<TransactionStatus>('idle');
  const [txHash, setTxHash] = React.useState<string | undefined>();
  const [txError, setTxError] = React.useState<string | undefined>();
  const [activeRequest, setActiveRequest] = React.useState<{ id: string, senderAddress: string, action: 'accept' | 'decline' } | null>(null);

  const { data: userData } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.users.getMe(),
  });

  const { data: requests, isLoading: requestsLoading } = useQuery({
    queryKey: ['teamRequests'],
    queryFn: () => api.users.getTrustRequests(),
    enabled: !!user,
  });

  const trustedIds = userData?.trusted_network_ids ?? [];
  
  // Filtering requests
  const incomingRequests = requests?.filter((r: TeamRequest) => r.receiver_id === user?.id && r.status === 'pending') ?? [];
  const outgoingRequests = requests?.filter((r: TeamRequest) => r.sender_id === user?.id && r.status === 'pending') ?? [];

  const handleInitiateRespond = (id: string, senderAddress: string, action: 'accept' | 'decline') => {
    setActiveRequest({ id, senderAddress, action });
    setTxStatus('idle');
    setTxHash(undefined);
    setTxError(undefined);
    setShowTxModal(true);
  };

  const handleConfirmResponse = async () => {
    if (!activeRequest) return;

    setTxStatus('pending');
    try {
      if (API_CONFIG.USE_MOCK_API) {
        const mockTxHash = '0x' + '0'.repeat(64) + Date.now().toString(16);
        await api.users.updateTrustRequestStatus(
          activeRequest.id,
          activeRequest.action === 'accept' ? 'accepted' : 'declined',
          mockTxHash
        );
        setTxHash(mockTxHash);
        setTxStatus('success');
        queryClient.invalidateQueries({ queryKey: ['teamRequests'] });
        queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
        return;
      }

      const wallet = await getWallet();
      const contract = new ethers.Contract(CHAIN_CONFIG.BOUNTYFI_ADDRESS, TRUSTNETWORK_ABI, wallet);

      let tx;
      if (activeRequest.action === 'accept') {
        tx = await contract.acceptTrustRequest(activeRequest.senderAddress);
      } else {
        tx = await contract.declineTrustRequest(activeRequest.senderAddress);
      }

      setTxHash(tx.hash);
      await tx.wait();

      await api.users.updateTrustRequestStatus(activeRequest.id, activeRequest.action === 'accept' ? 'accepted' : 'declined', tx.hash);

      setTxStatus('success');
      queryClient.invalidateQueries({ queryKey: ['teamRequests'] });
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
    } catch (e: any) {
      console.error('Contract error:', e);
      setTxError(e.message || 'Action failed on-chain');
      setTxStatus('error');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.trustedCard}>
          <Text style={styles.trustedCardTitle}>Trusted Network</Text>
          <Text style={styles.trustedCardBody}>
            Choose people you truly trust. You win together, but you also lose together if someone fails an audit.
          </Text>
          <TouchableOpacity style={styles.learnMoreBtn} onPress={() => setShowLearnMore(true)} activeOpacity={0.8}>
            <Text style={styles.learnMoreText}>Learn more</Text>
          </TouchableOpacity>
        </View>

        {/* Incoming Requests Section */}
        {incomingRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>INCOMING REQUESTS</Text>
            {incomingRequests.map((req: TeamRequest) => (
              <Card key={req.id} style={styles.requestCard}>
                <View style={styles.requestInfo}>
                  <View style={styles.avatarSmall}>
                    <Text style={styles.avatarTextSmall}>{(req.sender?.name || req.sender?.email || 'U')[0].toUpperCase()}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.requestName}>{req.sender?.name || 'Anonymous'}</Text>
                    <Text style={styles.requestEmail}>{req.sender?.email}</Text>
                  </View>
                </View>
                <View style={styles.requestActions}>
                   <TouchableOpacity 
                    style={[styles.smallBtn, styles.declineBtn]} 
                    onPress={() => handleInitiateRespond(req.id, req.sender?.wallet_address || '', 'decline')}
                   >
                     <Text style={styles.declineBtnText}>Decline</Text>
                   </TouchableOpacity>
                   <TouchableOpacity 
                    style={[styles.smallBtn, styles.acceptBtn]} 
                    onPress={() => handleInitiateRespond(req.id, req.sender?.wallet_address || '', 'accept')}
                   >
                     <Text style={styles.acceptBtnText}>Accept</Text>
                   </TouchableOpacity>
                </View>
              </Card>
            ))}
          </View>
        )}

        {/* Team Members Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>TEAM MEMBERS ({trustedIds.length}/10)</Text>
          </View>
          {trustedIds.length === 0 ? (
            <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>You haven't added anyone to your team yet.</Text>
            </View>
          ) : (
            <View style={styles.grid}>
                {trustedIds.map((id: string) => (
                    <Card key={id} style={styles.memberCard}>
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>{id[0].toUpperCase()}</Text>
                    </View>
                    <Text style={styles.memberName} numberOfLines={1}>{id}</Text>
                    </Card>
                ))}
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.addButton} onPress={() => (navigation as any).navigate('AddTeamMember')} activeOpacity={0.8}>
          <Text style={styles.addButtonIcon}>+</Text>
          <Text style={styles.addButtonText}>Invite a new member</Text>
        </TouchableOpacity>

        {/* Outgoing Requests Section */}
        {outgoingRequests.length > 0 && (
          <View style={[styles.section, { marginTop: Spacing.xl }]}>
            <Text style={styles.sectionTitle}>OUTGOING REQUESTS</Text>
            {outgoingRequests.map((req: TeamRequest) => (
              <View key={req.id} style={styles.outgoingItem}>
                <Text style={styles.outgoingText}>Waiting for {req.receiver?.email || 'User'}</Text>
                <View style={styles.pendingBadge}>
                   <Text style={styles.pendingBadgeText}>Pending</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <Modal visible={showLearnMore} animationType="slide" transparent>
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>How it works</Text>
                <TouchableOpacity onPress={() => setShowLearnMore(false)} style={styles.modalClose}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.modalScroll} showsVerticalScrollIndicator={false}>
                <Text style={styles.learnSectionTitle}>Wins (as a team)</Text>
                <Text style={styles.learnBullet}>• Trust Streak: Multipliers on 5-day active streak</Text>
                <Text style={styles.learnBullet}>• Rank: Unlock team titles together</Text>
                <Text style={styles.learnSectionTitle}>Accountability</Text>
                <Text style={styles.learnBullet}>• Small errors reduce individual 💎</Text>
                <Text style={styles.learnBullet}>• 3rd major audit fail: Everyone on the team loses 1 ticket</Text>
                <Text style={styles.learnClosing}>Trust is mutual. Choose people you know are honest and active!</Text>
              </ScrollView>
              <TouchableOpacity style={styles.modalDoneBtn} onPress={() => setShowLearnMore(false)} activeOpacity={0.8}>
                <Text style={styles.modalDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <View style={{ height: 100 }} />
      </ScrollView>

      <TransactionModal
        visible={showTxModal}
        status={txStatus}
        title={activeRequest?.action === 'accept' ? 'Accept Trust Request' : 'Decline Trust Request'}
        description={activeRequest?.action === 'accept' ? 'This will establish mutual trust on-chain. You will share rewards and accountability.' : 'This will remove the pending request.'}
        onConfirm={handleConfirmResponse}
        onClose={() => setShowTxModal(false)}
        txHash={txHash}
        errorMessage={txError}
        confirmLabel={activeRequest?.action === 'accept' ? 'Confirm Acceptance' : 'Confirm Decline'}
      />
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
  scrollContent: {
    padding: Spacing.lg,
  },
  trustedCard: {
    backgroundColor: Colors.ivoryBlue,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    alignItems: 'center',
    ...Shadows.card,
  },
  trustedCardTitle: {
    ...Typography.heading,
    fontSize: 20,
    color: Colors.white,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  trustedCardBody: {
    fontSize: 14,
    color: Colors.white,
    lineHeight: 20,
    opacity: 0.9,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  learnMoreBtn: {
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  learnMoreText: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.white,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '900',
    color: Colors.textGray,
    letterSpacing: 1,
    marginBottom: Spacing.sm,
  },
  requestCard: {
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.white,
  },
  requestInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.ivoryBlueLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarTextSmall: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  requestName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.navyBlack,
  },
  requestEmail: {
    fontSize: 12,
    color: Colors.textGray,
  },
  requestActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  smallBtn: {
    flex: 1,
    height: 36,
    borderRadius: BorderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acceptBtn: {
    backgroundColor: Colors.ivoryBlue,
  },
  acceptBtnText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
  declineBtn: {
    backgroundColor: Colors.creamDark,
  },
  declineBtnText: {
    color: Colors.textGray,
    fontWeight: '700',
    fontSize: 13,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  memberCard: {
    width: (width - Spacing.lg * 2 - Spacing.sm) / 2,
    alignItems: 'center',
    padding: Spacing.md,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.ivoryBlueLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatarText: {
    ...Typography.heading,
    fontSize: 18,
    color: Colors.white,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.navyBlack,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.creamDark,
    borderStyle: 'dashed',
    backgroundColor: Colors.white,
  },
  addButtonIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.ivoryBlue,
    marginRight: Spacing.sm,
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.ivoryBlueDark,
  },
  emptyCard: {
    padding: Spacing.xl,
    backgroundColor: Colors.creamDark,
    borderRadius: 12,
    alignItems: 'center',
    opacity: 0.6,
  },
  emptyText: {
    fontSize: 13,
    color: Colors.textGray,
    textAlign: 'center',
  },
  outgoingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: 'rgba(90, 141, 176, 0.05)',
    borderRadius: 12,
    marginBottom: Spacing.xs,
  },
  outgoingText: {
    fontSize: 14,
    color: Colors.textGray,
    fontWeight: '500',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  pendingBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#D97706',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.primaryLight,
  },
  modalTitle: {
    ...Typography.heading,
    fontSize: 20,
    color: Colors.textPrimary,
  },
  modalClose: {
    padding: 8,
  },
  modalCloseText: {
    fontSize: 18,
    color: Colors.textGray,
  },
  modalScroll: {
    padding: Spacing.lg,
    maxHeight: 400,
  },
  learnSectionTitle: {
    ...Typography.heading,
    fontSize: 16,
    color: Colors.textPrimary,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  learnBullet: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 22,
    marginBottom: 4,
  },
  learnClosing: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.ivoryBlue,
    textAlign: 'center',
    marginTop: Spacing.lg,
    lineHeight: 20,
  },
  modalDoneBtn: {
    marginHorizontal: Spacing.lg,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.ivoryBlue,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDoneText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  memberCard: {
    width: (width - Spacing.lg * 2 - Spacing.md) / 2,
    minWidth: 120,
    alignItems: 'center',
    padding: Spacing.lg,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.ivoryBlueLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  avatarText: {
    ...Typography.heading,
    fontSize: 22,
    color: Colors.textPrimary,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.xl,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.ivoryBlueLight,
    borderStyle: 'dashed',
    backgroundColor: Colors.white,
  },
  addButtonIcon: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.ivoryBlue,
    marginRight: Spacing.sm,
  },
  addButtonText: {
    ...Typography.body,
    fontSize: 16,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
});
