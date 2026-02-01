import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme/theme';
import { CHAIN_CONFIG } from '../config/chain';

export type TransactionStatus = 'idle' | 'pending' | 'success' | 'error';

interface TransactionModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  description?: string;
  status: TransactionStatus;
  txHash?: string;
  errorMessage?: string;
  confirmLabel?: string;
  /** Custom title when status is success (e.g. "You won!") */
  successTitle?: string;
  /** Custom description when success (e.g. prize text) */
  successDescription?: string;
  /** Optional secondary action on success (e.g. "Try again for 10 diamonds") */
  successActionLabel?: string;
  onSuccessAction?: () => void;
}

export function TransactionModal({
  visible,
  onClose,
  onConfirm,
  title,
  description,
  status,
  txHash,
  errorMessage,
  confirmLabel = 'Confirm',
  successTitle,
  successDescription,
  successActionLabel,
  onSuccessAction,
}: TransactionModalProps) {
  const isPending = status === 'pending';
  const isSuccess = status === 'success';
  const isError = status === 'error';

  const handleOpenExplorer = () => {
    if (txHash) {
      Linking.openURL(`${CHAIN_CONFIG.EXPLORER_URL}/tx/${txHash}`);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={isPending ? () => {} : onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {isSuccess ? (
            <View style={styles.iconContainerSuccess}>
              <Text style={styles.iconText}>✓</Text>
            </View>
          ) : isError ? (
            <View style={styles.iconContainerError}>
              <Text style={styles.iconText}>!</Text>
            </View>
          ) : (
             <View style={styles.iconContainerIdle}>
               <Text style={styles.iconText}>⛓️</Text>
             </View>
          )}

          <Text style={styles.title}>
            {isSuccess ? (successTitle ?? 'Transaction Confirmed') : isError ? 'Transaction Failed' : title}
          </Text>

          <Text style={styles.description}>
            {isSuccess
              ? (successDescription ?? 'Your transaction has been successfully confirmed on the blockchain.')
              : isError
              ? errorMessage || 'Something went wrong. Please try again.'
              : description}
          </Text>

          {isPending && (
            <View style={styles.pendingContainer}>
              <ActivityIndicator size="large" color={Colors.primaryBright} />
              <Text style={styles.pendingText}>Waiting for confirmation...</Text>
            </View>
          )}

          {txHash && (
             <TouchableOpacity onPress={handleOpenExplorer} style={styles.explorerLink}>
               <Text style={styles.explorerText}>View on Explorer →</Text>
             </TouchableOpacity>
          )}

          <View style={styles.actions}>
            {!isPending && !isSuccess && !isError && onConfirm && (
              <TouchableOpacity style={styles.confirmButton} onPress={onConfirm}>
                <Text style={styles.confirmButtonText}>{confirmLabel}</Text>
              </TouchableOpacity>
            )}

            {isSuccess && successActionLabel && onSuccessAction && (
              <TouchableOpacity style={styles.confirmButton} onPress={onSuccessAction}>
                <Text style={styles.confirmButtonText}>{successActionLabel}</Text>
              </TouchableOpacity>
            )}

            {!isPending && (
              <TouchableOpacity
                style={[styles.closeButton, (isSuccess || isError) && !successActionLabel && styles.primaryClose]}
                onPress={onClose}
              >
                <Text style={(isSuccess || isError) && !successActionLabel ? styles.primaryCloseText : styles.closeButtonText}>
                  {isSuccess ? 'Done' : 'Close'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.lg,
  },
  iconContainerIdle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.cream,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconContainerSuccess: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ECFDF5', // Green-50
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconContainerError: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF2F2', // Red-50
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  iconText: {
    fontSize: 32,
    color: Colors.ivoryBlue,
  },
  title: {
    ...Typography.heading,
    fontSize: 20,
    color: Colors.navyBlack,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    ...Typography.body,
    fontSize: 15,
    color: Colors.textGray,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  pendingContainer: {
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  pendingText: {
    marginTop: Spacing.md,
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primaryBright,
  },
  explorerLink: {
    marginBottom: Spacing.lg,
    padding: Spacing.sm,
  },
  explorerText: {
    fontSize: 13,
    color: Colors.primaryBright,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  actions: {
    width: '100%',
    gap: Spacing.md,
  },
  confirmButton: {
    width: '100%',
    height: 48,
    backgroundColor: Colors.primaryBright,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  confirmButtonText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  closeButton: {
    width: '100%',
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: Colors.textGray,
    fontWeight: '600',
    fontSize: 16,
  },
  primaryClose: {
    width: '100%',
    height: 48,
    backgroundColor: Colors.primaryBright,
    borderRadius: BorderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...Shadows.sm,
  },
  primaryCloseText: {
    color: Colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
});
