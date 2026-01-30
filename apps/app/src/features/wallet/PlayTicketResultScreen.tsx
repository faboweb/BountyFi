import * as React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/theme';
import { Card } from '../../components/Card';

type Nav = NativeStackNavigationProp<any>;
type Route = RouteProp<any, 'PlayTicketResult'>;

export function PlayTicketResultScreen() {
  const navigation = useNavigation<Nav>();
  const route = useRoute<Route>();
  const params = route.params ?? {};
  const won = params.won ?? false;
  const prize = params.prize ?? '';
  const emoji = params.emoji ?? '🎁';
  const challengeName = params.challengeName ?? 'Challenge';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Ticket result</Text>
        <View style={styles.backBtn} />
      </View>
      <View style={styles.content}>
        <Card style={[styles.resultCard, won ? styles.resultCardWin : styles.resultCardLose]}>
          <Text style={styles.emoji}>{won ? emoji : '🥺'}</Text>
          <Text style={styles.title}>
            {won ? "Congrats! You just won a " : 'Not this time. Try again'}
          </Text>
          {won && prize ? (
            <Text style={styles.prizeText}>{prize}</Text>
          ) : null}
          {!won && (
            <Text style={styles.hint}>Keep completing challenges to earn more tickets.</Text>
          )}
          <TouchableOpacity
            style={[styles.okButton, won ? styles.okButtonWin : styles.okButtonLose]}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.okButtonText}>OK</Text>
          </TouchableOpacity>
        </Card>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F8FAFC' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backBtn: { width: 44, alignItems: 'center', justifyContent: 'center' },
  backText: { fontSize: 24, color: Colors.primaryDark },
  headerTitle: { ...Typography.body, fontWeight: '800', fontSize: 18 },
  content: { flex: 1, padding: Spacing.lg, justifyContent: 'center' },
  resultCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    borderRadius: BorderRadius.xxl,
    ...Shadows.card,
  },
  resultCardWin: {
    backgroundColor: '#ECFDF5',
    borderWidth: 2,
    borderColor: Colors.grass,
  },
  resultCardLose: {
    backgroundColor: '#FFF8F0',
    borderWidth: 2,
    borderColor: Colors.coral,
  },
  emoji: { fontSize: 64, marginBottom: Spacing.lg },
  title: {
    ...Typography.heading,
    fontSize: 22,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  prizeText: {
    ...Typography.heading,
    fontSize: 20,
    color: Colors.ivoryBlueDark,
    marginBottom: Spacing.xl,
  },
  hint: {
    fontSize: 14,
    color: Colors.textGray,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  okButton: {
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
    minWidth: 120,
    alignItems: 'center',
  },
  okButtonWin: { backgroundColor: Colors.grass },
  okButtonLose: { backgroundColor: Colors.coral },
  okButtonText: { color: Colors.white, fontWeight: '800', fontSize: 16 },
});
