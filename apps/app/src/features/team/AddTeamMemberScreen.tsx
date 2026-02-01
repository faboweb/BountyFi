import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ethers } from 'ethers';
import { api, TRUSTNETWORK_ABI } from '../../api/client';
import { API_CONFIG } from '../../config/api';
import { Colors, Typography, Spacing, Shadows } from '../../theme/theme';
import { TransactionModal, TransactionStatus } from '../../components/TransactionModal';
import { getWallet } from '../../utils/contracts';
import { CHAIN_CONFIG } from '../../config/chain';
import { UserSearchResult } from '../../api/types';

export function AddTeamMemberScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const [usernameQuery, setUsernameQuery] = React.useState('');
  const [searchError, setSearchError] = React.useState<string | null>(null);
  const [isSearching, setIsSearching] = React.useState(false);
  const [foundUser, setFoundUser] = React.useState<UserSearchResult | null>(null);

  // Transaction state
  const [showTxModal, setShowTxModal] = React.useState(false);
  const [txStatus, setTxStatus] = React.useState<TransactionStatus>('idle');
  const [txHash, setTxHash] = React.useState<string | undefined>();
  const [txError, setTxError] = React.useState<string | undefined>();

  const { data: user } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.users.getMe(),
  });
  const trustedIds = user?.trusted_network_ids ?? [];

  const addMemberMutation = useMutation({
    mutationFn: (userId: string) => api.users.addTrustedMember(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user', 'me'] });
      Alert.alert('Added', 'Member added to your team.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (err: Error) => {
      Alert.alert('Error', err.message || 'Could not add member.');
    },
  });

  const handleAddByUsername = async () => {
    const q = usernameQuery.trim();
    setSearchError(null);
    if (!q) {
      setSearchError('Enter a username or name.');
      return;
    }
    try {
      const result = await api.users.searchByUsername(q);
      if (result) {
        if (trustedIds.includes(result.id)) {
          setSearchError('This person is already in your team.');
          return;
        }
        addMemberMutation.mutate(result.id);
      } else {
        setSearchError('No user found. Try another username.');
      }
    } catch (e) {
      setSearchError('Search failed. Please try again.');
    }
  };

  const handleSearch = async () => {
    const q = usernameQuery.trim();
    setSearchError(null);
    setFoundUser(null);
    if (!q) {
      setSearchError('Enter a username or name.');
      return;
    }
    setIsSearching(true);
    try {
      const result = await api.users.searchByUsername(q);
      if (result) {
        if (trustedIds.includes(result.id)) {
          setSearchError('This person is already in your team.');
        } else if (result.id === user?.id) {
            setSearchError('You cannot trust yourself.');
        } else {
          setFoundUser(result);
        }
      } else {
        setSearchError('No user found. Try another username.');
      }
    } catch (e) {
      setSearchError('Search failed. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleInitiateRequest = () => {
    if (!foundUser) return;
    setTxStatus('idle');
    setTxHash(undefined);
    setTxError(undefined);
    setShowTxModal(true);
  };

  const handleSendRequest = async () => {
    if (!foundUser || !foundUser.email /* email as placeholder for addr resolution */) return;

    setTxStatus('pending');
    try {
      if (API_CONFIG.USE_MOCK_API) {
        const mockTxHash = '0x' + '0'.repeat(64) + Date.now().toString(16);
        await api.users.syncTrustRequest(foundUser.id, mockTxHash);
        setTxHash(mockTxHash);
        setTxStatus('success');
        queryClient.invalidateQueries({ queryKey: ['teamRequests'] });
        return;
      }

      const targetAddress = (foundUser as any).wallet_address || '0x0000000000000000000000000000000000000000';
      if (targetAddress === '0x0000000000000000000000000000000000000000') {
        setTxError('This user does not have a linked wallet.');
        setTxStatus('error');
        return;
      }

      const wallet = await getWallet();
      const contract = new ethers.Contract(CHAIN_CONFIG.BOUNTYFI_ADDRESS, TRUSTNETWORK_ABI, wallet);

      const tx = await contract.sendTrustRequest(targetAddress);
      setTxHash(tx.hash);
      await tx.wait();

      await api.users.syncTrustRequest(foundUser.id, tx.hash);

      setTxStatus('success');
      queryClient.invalidateQueries({ queryKey: ['teamRequests'] });
    } catch (e: any) {
      console.error('Contract error:', e);
      setTxError(e.message || 'Failed to send request');
      setTxStatus('error');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Invite to Team</Text>
        <View style={styles.backBtn} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={80}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.section}>
            <Text style={styles.hint}>Enter their username, name, or email to add them to your team.</Text>
            <TextInput
              style={styles.input}
              placeholder="Username, name, or email"
              placeholderTextColor={Colors.textGray}
              value={usernameQuery}
              onChangeText={(t) => {
                setUsernameQuery(t);
                setSearchError(null);
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchError ? <Text style={styles.errorText}>{typeof searchError === 'string' ? searchError : String(searchError)}</Text> : null}
            <TouchableOpacity
              style={[styles.primaryButton, addMemberMutation.isPending && styles.primaryButtonDisabled]}
              onPress={handleAddByUsername}
              disabled={addMemberMutation.isPending}
              activeOpacity={0.8}
            >
              {addMemberMutation.isPending ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.primaryButtonText}>Add by username</Text>
              )}
            </TouchableOpacity>
          </View>
          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <TransactionModal
        visible={showTxModal}
        status={txStatus}
        title="Invite to Trusted Network"
        description={`Send a trust request to ${foundUser?.name || foundUser?.email}. They must accept to join your team.`}
        onConfirm={handleSendRequest}
        onClose={() => {
            setShowTxModal(false);
            if (txStatus === 'success') navigation.goBack();
        }}
        txHash={txHash}
        errorMessage={txError}
        confirmLabel="Send Invite"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.backgroundDark,
  },
  backBtn: {
    minWidth: 44,
    padding: 8,
  },
  backBtnText: {
    fontSize: 24,
    color: Colors.textPrimary,
  },
  headerTitle: {
    ...Typography.heading,
    fontSize: 18,
    color: Colors.textPrimary,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  hint: {
    fontSize: 14,
    color: Colors.textGray,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  searchRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  input: {
    flex: 1,
    height: 48,
    borderWidth: 2,
    borderColor: Colors.backgroundDark,
    borderRadius: 12,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
    color: Colors.textPrimary,
    backgroundColor: Colors.white,
  },
  searchBtn: {
    width: 48,
    height: 48,
    backgroundColor: Colors.ivoryBlue,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchBtnText: {
    fontSize: 18,
  },
  errorText: {
    fontSize: 13,
    color: Colors.error,
    marginBottom: Spacing.sm,
  },
  primaryButton: {
    backgroundColor: Colors.ivoryBlue,
    paddingVertical: Spacing.md + 4,
    paddingHorizontal: Spacing.lg,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    ...Typography.button,
    color: Colors.white,
  },
  foundUserCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    padding: Spacing.md,
    borderRadius: 16,
    ...Shadows.card,
    marginTop: Spacing.sm,
  },
  avatarMini: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.ivoryBlueLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  avatarMiniText: {
    color: Colors.white,
    fontWeight: 'bold',
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.navyBlack,
  },
  userEmail: {
    fontSize: 12,
    color: Colors.textGray,
  },
  inviteButton: {
    backgroundColor: Colors.ivoryBlue,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    borderRadius: 12,
  },
  inviteButtonText: {
    color: Colors.white,
    fontWeight: '800',
    fontSize: 14,
  },
});
