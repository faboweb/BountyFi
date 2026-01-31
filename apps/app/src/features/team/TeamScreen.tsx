import * as React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, Dimensions, TouchableOpacity, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import { Colors, Typography, Spacing } from '../../theme/theme';
import { Card } from '../../components/Card';

const { width } = Dimensions.get('window');

/** Display names for trusted network members (by user id) */
const TRUSTED_NETWORK_DISPLAY: Record<string, { name: string; initial: string }> = {
  user_2: { name: 'Jordan', initial: 'J' },
  user_3: { name: 'Sam', initial: 'S' },
};

export function TeamScreen() {
  const navigation = useNavigation();
  const [showLearnMore, setShowLearnMore] = React.useState(false);
  const { data: user } = useQuery({
    queryKey: ['user', 'me'],
    queryFn: () => api.users.getMe(),
  });
  const trustedIds = user?.trusted_network_ids ?? [];
  const trustedProfiles = trustedIds.map((id: string) => ({
    id,
    ...(TRUSTED_NETWORK_DISPLAY[id] ?? { name: 'Member', initial: id.slice(-1).toUpperCase() }),
  }));

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.trustedCard}>
          <Text style={styles.trustedCardTitle}>Trusted Network</Text>
          <Text style={styles.trustedCardBody}>
            Choose people you truly trust. The stronger and more honest your team, the more you all win. You win together. You're accountable together.
          </Text>
          <TouchableOpacity style={styles.learnMoreBtn} onPress={() => setShowLearnMore(true)} activeOpacity={0.8}>
            <Text style={styles.learnMoreText}>Learn more</Text>
          </TouchableOpacity>
        </View>

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
                <Text style={styles.learnBullet}>• Trust Streak: 5 consecutive active days with no failed audits unlocks a reward</Text>
                <Text style={styles.learnSubBullet}>– Diamond multiplier (e.g. +2 per verification) or</Text>
                <Text style={styles.learnSubBullet}>– A shield (one mistake doesn't count)</Text>
                <Text style={styles.learnBullet}>• Network Level: Correct verifications earn XP and unlock team titles</Text>

                <Text style={styles.learnSectionTitle}>Mistakes</Text>
                <Text style={styles.learnBullet}>• 1st: −1 💎</Text>
                <Text style={styles.learnBullet}>• 2nd: −5 💎</Text>
                <Text style={styles.learnBullet}>• 3rd: everyone on your team loses 1 ticket</Text>

                <Text style={styles.learnSectionTitle}>Per verification</Text>
                <Text style={styles.learnBullet}>• Correct verification: +1 💎</Text>
                <Text style={styles.learnBullet}>• Mistaken verification: −1 💎</Text>
                <Text style={styles.learnBullet}>• Random audits</Text>

                <Text style={styles.learnClosing}>You win together. You're accountable together. Motivate each other!</Text>
              </ScrollView>
              <TouchableOpacity style={styles.modalDoneBtn} onPress={() => setShowLearnMore(false)} activeOpacity={0.8}>
                <Text style={styles.modalDoneText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <View style={styles.grid}>
          {trustedProfiles.map((profile) => (
            <Card key={profile.id} style={styles.memberCard}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{profile.initial}</Text>
              </View>
              <Text style={styles.memberName}>{profile.name}</Text>
            </Card>
          ))}
        </View>
        <TouchableOpacity style={styles.addButton} onPress={() => (navigation as any).navigate('AddTeamMember')} activeOpacity={0.8}>
          <Text style={styles.addButtonIcon}>+</Text>
          <Text style={styles.addButtonText}>Add a new member</Text>
        </TouchableOpacity>
        <View style={{ height: 100 }} />
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
  scrollContent: {
    padding: Spacing.lg,
  },
  trustedCard: {
    backgroundColor: Colors.ivoryBlue,
    borderRadius: 12,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  trustedCardTitle: {
    ...Typography.heading,
    fontSize: 20,
    color: Colors.white,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  trustedCardBody: {
    fontSize: 15,
    color: Colors.white,
    lineHeight: 22,
    opacity: 0.95,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  learnMoreBtn: {
    paddingVertical: 8,
    paddingHorizontal: Spacing.md,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  learnMoreText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    paddingBottom: Spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.creamDark,
  },
  modalTitle: {
    ...Typography.heading,
    fontSize: 20,
    color: Colors.ivoryBlueDark,
  },
  modalClose: {
    padding: 8,
  },
  modalCloseText: {
    fontSize: 20,
    color: Colors.textGray,
  },
  modalScroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
    maxHeight: 400,
  },
  learnSectionTitle: {
    ...Typography.heading,
    fontSize: 16,
    color: Colors.ivoryBlueDark,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  learnBullet: {
    fontSize: 14,
    color: Colors.ivoryBlueDark,
    lineHeight: 22,
    marginLeft: Spacing.sm,
    marginBottom: 4,
  },
  learnSubBullet: {
    fontSize: 13,
    color: Colors.textGray,
    lineHeight: 20,
    marginLeft: Spacing.lg,
    marginBottom: 2,
  },
  learnClosing: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.ivoryBlue,
    textAlign: 'center',
    marginTop: Spacing.lg,
    marginBottom: Spacing.md,
    lineHeight: 22,
  },
  modalDoneBtn: {
    marginHorizontal: Spacing.lg,
    height: 48,
    borderRadius: 12,
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
    color: Colors.ivoryBlueDark,
  },
  memberName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.ivoryBlueDark,
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
    color: Colors.ivoryBlueDark,
  },
});
