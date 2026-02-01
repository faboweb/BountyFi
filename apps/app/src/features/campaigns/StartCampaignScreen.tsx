// Create Campaign – step 1: details + location + duration; step 2: first donor + share (BountyFi theme)
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Share,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import * as ExpoLocation from 'expo-location';
import { ethers } from 'ethers';
import { useSendUserOperation, useWaitForUserOperation } from '@coinbase/cdp-hooks';
import { api } from '../../api/client';
import { useAuth } from '../../auth/context';
import { Button } from '../../components';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { supabase } from '../../utils/supabase';
import { CHAIN_CONFIG } from '../../config/chain';

const MIN_DONATION_THB = 50;
const DEFAULT_REGION = {
  latitude: 13.7563,
  longitude: 100.5018,
  latitudeDelta: 0.5,
  longitudeDelta: 0.5,
};

type Step = 1 | 2;

export function StartCampaignScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>(1);

  // Step 1
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [locationName, setLocationName] = useState('');
  const [durationDays, setDurationDays] = useState('');
  const [pin, setPin] = useState<{ latitude: number; longitude: number } | null>(null);
  const [region, setRegion] = useState(DEFAULT_REGION);

  // Step 2
  const [donationThb, setDonationThb] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [created, setCreated] = useState(false);

  // Confirmation dialog
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingCampaignData, setPendingCampaignData] = useState<any>(null);
  const [showTxPendingModal, setShowTxPendingModal] = useState(false);
  const [showTxSuccessModal, setShowTxSuccessModal] = useState(false);
  const [createdCampaignId, setCreatedCampaignId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { status } = await ExpoLocation.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const loc = await ExpoLocation.getCurrentPositionAsync({ accuracy: ExpoLocation.Accuracy.Balanced });
          setRegion((r) => ({
            ...r,
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          }));
          if (!pin) setPin({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        } catch (_) {}
      }
    })();
  }, []);

  const canGoNext = () => {
    if (!name.trim()) return false;
    if (!description.trim()) return false;
    if (!pin) return false;
    const days = parseInt(durationDays, 10);
    return !isNaN(days) && days >= 1;
  };

  const handleNext = () => {
    if (!canGoNext()) {
      if (!name.trim()) Alert.alert('Required', 'Please enter a campaign name.');
      else if (!description.trim()) Alert.alert('Required', 'Please add a short description.');
      else if (!pin) Alert.alert('Required', 'Tap the map to set the campaign location.');
      else Alert.alert('Required', 'Please enter duration in days (at least 1).');
      return;
    }
    setStep(2);
  };

  const { user } = useAuth();
  const { sendUserOperation, status: userOpStatus } = useSendUserOperation();
  const [currentUserOpHash, setCurrentUserOpHash] = useState<string | null>(null);
  const { data: waitResult, status: waitStatus } = useWaitForUserOperation({
    userOperationHash: (currentUserOpHash as any),
    enabled: !!currentUserOpHash,
  });

  // Handle transaction pending
  useEffect(() => {
    if (currentUserOpHash && waitStatus === 'pending') {
      setShowTxPendingModal(true);
    }
  }, [currentUserOpHash, waitStatus]);

  // Handle transaction confirmation
  useEffect(() => {
    if (waitStatus === 'success' && waitResult?.receipts && pendingCampaignData) {
      // NOTE: We don't hide the pending modal here yet. 
      // We wait until handleTransactionConfirmed (which triggers indexer) finishes.
      handleTransactionConfirmed(waitResult.receipts[0]);
    }
  }, [waitStatus, waitResult]);

  const handleTransactionConfirmed = async (receipt: any) => {
    try {
      console.log('[StartCampaign] Transaction confirmed:', receipt.transactionHash);

      // Parse CampaignCreated event
      const iface = new ethers.Interface([
        "event CampaignCreated(uint256 indexed campaignId, string title, uint8 campaignType, uint256 rewardAmount, uint256 prizeCount)"
      ]);

      const log = receipt.logs?.find((l: any) => {
        try {
          const parsed = iface.parseLog({ topics: l.topics, data: l.data });
          return parsed?.name === 'CampaignCreated';
        } catch {
          return false;
        }
      });

      let campaignId = '0';
      if (log) {
        const parsed = iface.parseLog({ topics: log.topics, data: log.data });
        campaignId = parsed?.args?.campaignId?.toString() || '0';
        console.log('[StartCampaign] Campaign ID from event:', campaignId);
      }

      // Trigger indexer to sync from chain
      try {
        console.log('[StartCampaign] Triggering indexer with userOpHash:', currentUserOpHash);
        const { data: indexerResult, error: indexerInvokeError } = await supabase.functions.invoke('indexer', {
          body: {
            event: 'sync_campaign',
            campaignId: campaignId,
            transactionHash: receipt.transactionHash,
            userOpHash: currentUserOpHash,
          }
        });
        
        if (indexerInvokeError || indexerResult?.error) {
          console.warn('[StartCampaign] Indexer error:', indexerInvokeError || indexerResult?.error);
        } else {
          console.log('[StartCampaign] Indexer triggered successfully');
        }
      } catch (indexerError) {
        console.warn('[StartCampaign] Indexer trigger failed:', indexerError);
      }

      // Hide pending modal only after indexer is triggered (or failed)
      setShowTxPendingModal(false);
      
      // Show success modal
      setCreatedCampaignId(campaignId);
      setShowTxSuccessModal(true);
      setCreated(true);
      setIsSubmitting(false);
      queryClient.invalidateQueries({ queryKey: ['campaigns'] });
      
      // Navigate to campaign screen after short delay
      setTimeout(() => {
        setShowTxSuccessModal(false);
        navigation.navigate('CampaignDetail', { campaignId: campaignId } as any);
      }, 2000);
    } catch (error) {
      console.error('[StartCampaign] Post-transaction error:', error);
      Alert.alert('Campaign created on-chain', 'The campaign was submitted to the blockchain but may take a moment to sync. Please refresh.');
      setCreated(true);
      setIsSubmitting(false);
    }
  };

  const handleDonateAndCreate = () => {
    console.log('[StartCampaign] handleDonateAndCreate called');
    const amount = parseInt(donationThb, 10);
    if (isNaN(amount) || amount < MIN_DONATION_THB) {
      Alert.alert('Minimum donation', `Be the first donor with at least ${MIN_DONATION_THB} Thai baht to launch this campaign.`);
      return;
    }

    if (!pin) {
      Alert.alert('Error', 'Location not set');
      return;
    }

    if (!user?.wallet_address) {
      Alert.alert('Error', 'Wallet not connected');
      return;
    }

    // Store campaign data for confirmation
    const campaignData = {
      title: name,
      description: description,
      prize_total: amount,
      min_funding_thb: MIN_DONATION_THB,
      requires_face_recognition: false,
      start_date: new Date().toISOString(),
      end_date: new Date(Date.now() + (parseInt(durationDays, 10) || 7) * 24 * 60 * 60 * 1000).toISOString(),
      checkpoints: [
        {
          name: locationName || 'Main Location',
          lat: pin.latitude,
          lng: pin.longitude,
          radius: 50,
        }
      ],
      prize_chest: [
        { label: 'Free coffee', image: '', sponsor: '' },
        { label: 'T-shirt', image: '', sponsor: '' },
        { label: 'Gift card', image: '', sponsor: '' },
      ],
    };

    console.log('[StartCampaign] Showing confirmation dialog');
    setPendingCampaignData(campaignData);
    setShowConfirmDialog(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirmDialog(false);
    setIsSubmitting(true);

    try {
      if (!pendingCampaignData || !user?.wallet_address) {
        throw new Error('Missing campaign data or wallet');
      }

      const BOUNTYFI_ADDR = CHAIN_CONFIG.BOUNTYFI_ADDRESS;
      const iface = new ethers.Interface([
        "function createCampaign(string _title, uint8 _type, uint256 _reward, uint256 _stake, uint256 _radius, uint256 _aiThreshold, tuple(string label, string image, string sponsor, bytes32 metadataHash, uint256 amount, uint256 value)[] _prizes) external",
        "event CampaignCreated(uint256 indexed campaignId, string title, uint8 campaignType, uint256 rewardAmount, uint256 prizeCount)"
      ]);

      const campaignType = 0; // SINGLE_PHOTO
      const rewardAmount = ethers.parseUnits(donationThb, "ether");
      const stakeAmount = 0;
      const radius = 50;
      const aiThreshold = 80;

      // Encode prizes for contract (label, image, sponsor, metadataHash, amount, value)
      const zeroHash = ethers.ZeroHash;
      const prizes = pendingCampaignData.prize_chest.map((p: any) => [
        p.label,
        p.image ?? '',
        p.sponsor ?? '',
        p.metadataHash ?? zeroHash,
        BigInt(p.amount ?? 0),
        BigInt(p.value ?? 0),
      ]);

      const txData = iface.encodeFunctionData("createCampaign", [
        pendingCampaignData.title,
        campaignType,
        rewardAmount,
        stakeAmount,
        radius,
        aiThreshold,
        prizes
      ]);

      console.log('[StartCampaign] Sending on-chain user operation...');
      const result = await sendUserOperation({
        evmSmartAccount: user.wallet_address as any,
        network: 'base-sepolia' as any,
        calls: [{
          to: BOUNTYFI_ADDR as any,
          data: txData as any,
        }],
        useCdpPaymaster: true,
      });

      if (!result?.userOperationHash) throw new Error('Failed to send user operation');
      setCurrentUserOpHash(result.userOperationHash);
      setShowTxPendingModal(true); // Show modal immediately
      console.log('[StartCampaign] User Op hash:', result.userOperationHash);

      // Create pending campaign record with userOpHash (will be updated with tx_hash later)
      try {
        await api.campaigns.create({
          ...pendingCampaignData,
          status: 'pending_onchain',
          tx_hash: result.userOperationHash, // Use userOpHash as temporary identifier
        });
        console.log('[StartCampaign] Pending campaign record created');
      } catch (createError) {
        console.warn('[StartCampaign] Failed to create pending record:', createError);
        // Don't fail - transaction is already in flight
      }
    } catch (e: any) {
      console.error('Failed to create campaign:', e);
      Alert.alert('Error', e.message || 'Something went wrong. Please try again.');
      setIsSubmitting(false);
    }
  };

  const handleShareCampaign = async () => {
    try {
      await Share.share({
        message: `Check out "${name}" on BountyFi – ${description.slice(0, 80)}${description.length > 80 ? '…' : ''}. Join the campaign and make a difference!`,
        title: `Campaign: ${name}`,
      });
    } catch (_) {}
  };

  const handleDone = () => {
    navigation.goBack();
  };

  if (step === 1) {
    return (
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <Text style={styles.screenTitle}>Create a campaign</Text>

          <Text style={styles.label}>Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Beach Cleanup Patong"
            value={name}
            onChangeText={setName}
            placeholderTextColor={colors.textGray}
          />

          <Text style={styles.label}>Short description (a sentence or two)</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="What’s this campaign about?"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            placeholderTextColor={colors.textGray}
          />

          <Text style={styles.label}>Location</Text>
          <Text style={styles.hint}>Set coordinates below or use your current location.</Text>
          <View style={styles.mapContainer}>
            <View style={styles.mapPlaceholder}>
              <Text style={styles.mapPlaceholderText}>Location (mock)</Text>
              <Text style={styles.mapPlaceholderSubtext}>
                Set coordinates below. Use a development build for the full map later.
              </Text>
              <View style={styles.coordRow}>
                <TextInput
                  style={[styles.input, styles.coordInput]}
                  placeholder="Lat"
                  value={pin ? String(pin.latitude.toFixed(5)) : ''}
                  onChangeText={(t) => {
                    const n = parseFloat(t);
                    if (!isNaN(n)) setPin((p) => ({ ...(p ?? { longitude: region.longitude }), latitude: n }));
                  }}
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textGray}
                />
                <TextInput
                  style={[styles.input, styles.coordInput]}
                  placeholder="Lng"
                  value={pin ? String(pin.longitude.toFixed(5)) : ''}
                  onChangeText={(t) => {
                    const n = parseFloat(t);
                    if (!isNaN(n)) setPin((p) => ({ ...(p ?? { latitude: region.latitude }), longitude: n }));
                  }}
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textGray}
                />
              </View>
            </View>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Location name (optional)"
            value={locationName}
            onChangeText={setLocationName}
            placeholderTextColor={colors.textGray}
          />

          <Text style={styles.label}>Duration (days)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 7"
            value={durationDays}
            onChangeText={setDurationDays}
            keyboardType="number-pad"
            placeholderTextColor={colors.textGray}
          />

          <View style={styles.noteBox}>
            <Text style={styles.noteText}>
              Every creator of the top 3 campaigns of the week (by submissions) gets a lottery ticket within that campaign too.
            </Text>
          </View>

          <Button title="Next" variant="primary" onPress={handleNext} style={styles.nextButton} />
        </View>
      </ScrollView>
    );
  }

  // Step 2: First donor + Share
  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.content}>
        <Text style={styles.screenTitle}>Be the first donor</Text>
        <Text style={styles.subtitle}>
          Donate at least {MIN_DONATION_THB} Thai baht to launch "{name}" and keep it running.
        </Text>

        <Text style={styles.label}>Your donation (THB)</Text>
        <TextInput
          style={styles.input}
          placeholder={`Min ${MIN_DONATION_THB}`}
          value={donationThb}
          onChangeText={setDonationThb}
          keyboardType="number-pad"
          editable={!created}
          placeholderTextColor={colors.textGray}
        />

        {!created ? (
          <Button
            title="Donate & launch campaign"
            variant="success"
            onPress={handleDonateAndCreate}
            loading={isSubmitting}
            style={styles.primaryButton}
          />
        ) : (
          <>
            <View style={styles.successBox}>
              <Text style={styles.successText}>Campaign launched. Share it with the world!</Text>
            </View>
            <Button
              title="Share the campaign with the world"
              variant="primary"
              onPress={handleShareCampaign}
              style={styles.shareButton}
            />
            <Button
              title="Done"
              variant="secondary"
              onPress={handleDone}
              style={styles.doneButton}
            />
          </>
        )}

        {/* Transaction Pending Modal */}
        <Modal
          visible={showTxPendingModal}
          transparent
          animationType="fade"
          onRequestClose={() => {}}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>⏳</Text>
                </View>
                <Text style={styles.modalTitle}>Transaction Pending</Text>
                <Text style={styles.pendingText}>
                  Your campaign is being created on the blockchain. This may take a few moments...
                </Text>
                <Text style={styles.hashText}>
                  Hash: {currentUserOpHash?.slice(0, 20)}...
                </Text>
              </View>
            </View>
          </View>
        </Modal>

        {/* Confirmation Dialog */}
        <Modal
          visible={showConfirmDialog}
          transparent
          animationType="fade"
          onRequestClose={() => {
            console.log('[StartCampaign] Modal closed');
            setShowConfirmDialog(false);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Confirm Campaign Launch</Text>
                <TouchableOpacity
                  onPress={() => setShowConfirmDialog(false)}
                  style={styles.modalClose}
                >
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalContent}>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Campaign:</Text>
                  <Text style={styles.modalValue}>{name}</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Your donation:</Text>
                  <Text style={styles.modalValue}>{donationThb} THB</Text>
                </View>
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Duration:</Text>
                  <Text style={styles.modalValue}>{durationDays} days</Text>
                </View>

                <View style={styles.prizesSection}>
                  <Text style={styles.prizesTitle}>Prizes to be drawn:</Text>
                  <Text style={styles.prizeItem}>☕ Free coffee</Text>
                  <Text style={styles.prizeItem}>👕 T-shirt</Text>
                  <Text style={styles.prizeItem}>🎁 Gift card</Text>
                </View>

                <View style={styles.blockchainNotice}>
                  <Text style={styles.blockchainNoticeText}>
                    This will submit your campaign to the blockchain. Gas fees are covered by Coinbase paymaster.
                  </Text>
                </View>
              </View>

              <View style={styles.modalActions}>
                <Button
                  title="Cancel"
                  variant="secondary"
                  onPress={() => setShowConfirmDialog(false)}
                  style={styles.modalButton}
                />
                <Button
                  title="Confirm & Launch"
                  variant="success"
                  onPress={handleConfirmSubmit}
                  style={styles.modalButton}
                />
              </View>
            </View>
          </View>
        </Modal>
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
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  screenTitle: {
    ...typography.title,
    fontSize: 24,
    color: colors.navyBlack,
    marginBottom: spacing.lg,
  },
  subtitle: {
    ...typography.body,
    color: colors.textGray,
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.bodySecondary,
    fontWeight: '600',
    color: colors.navyBlack,
    marginBottom: spacing.sm,
  },
  hint: {
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  input: {
    borderWidth: 2,
    borderColor: colors.borderGray,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    fontSize: 16,
    backgroundColor: colors.white,
    color: colors.navyBlack,
    marginBottom: spacing.md,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  mapContainer: {
    height: 220,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
    marginBottom: spacing.md,
    backgroundColor: colors.borderGray,
  },
  map: {
    width: '100%',
    height: '100%',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.borderGray,
  },
  mapPlaceholderText: {
    ...typography.bodySecondary,
    fontWeight: '600',
    color: colors.navyBlack,
    marginBottom: spacing.xs,
  },
  mapPlaceholderSubtext: {
    ...typography.caption,
    color: colors.textGray,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  coordRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    width: '100%',
  },
  coordInput: {
    flex: 1,
    marginBottom: 0,
  },
  noteBox: {
    backgroundColor: '#E8F4FD',
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  noteText: {
    ...typography.bodySecondary,
    lineHeight: 20,
    color: colors.navyBlack,
  },
  nextButton: {
    marginTop: spacing.sm,
  },
  primaryButton: {
    marginTop: spacing.sm,
  },
  successBox: {
    backgroundColor: '#D1FAE5',
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  successText: {
    ...typography.body,
    fontWeight: '500',
    color: colors.navyBlack,
  },
  loadingContainer: {
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  loadingText: {
    fontSize: 48,
  },
  pendingText: {
    ...typography.body,
    color: colors.textGray,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  hashText: {
    ...typography.caption,
    color: colors.textGray,
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  shareButton: {
    marginBottom: spacing.md,
  },
  doneButton: {},
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    width: '100%',
    maxWidth: 400,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderGray,
  },
  modalTitle: {
    ...typography.title,
    fontSize: 18,
    color: colors.navyBlack,
  },
  modalClose: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 24,
    color: colors.textGray,
  },
  modalContent: {
    padding: spacing.lg,
  },
  modalRow: {
    marginBottom: spacing.md,
  },
  modalLabel: {
    ...typography.bodySecondary,
    color: colors.textGray,
    marginBottom: spacing.xs,
  },
  modalValue: {
    ...typography.body,
    fontWeight: '600',
    color: colors.navyBlack,
  },
  prizesSection: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.lightGray,
    borderRadius: borderRadius.sm,
  },
  prizesTitle: {
    ...typography.bodySecondary,
    fontWeight: '600',
    color: colors.navyBlack,
    marginBottom: spacing.sm,
  },
  prizeItem: {
    ...typography.body,
    color: colors.navyBlack,
    marginBottom: spacing.xs,
  },
  blockchainNotice: {
    backgroundColor: '#E8F4FD',
    borderRadius: borderRadius.sm,
    padding: spacing.md,
  },
  blockchainNoticeText: {
    ...typography.bodySecondary,
    color: colors.navyBlack,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderGray,
  },
  modalButton: {
    flex: 1,
  },
});
