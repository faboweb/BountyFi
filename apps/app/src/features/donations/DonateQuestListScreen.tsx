import * as React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client';
import type { Campaign } from '../../api/types';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/theme';

type NavigationProp = NativeStackNavigationProp<AppStackParamList, 'DonateQuestList'>;

export function DonateQuestListScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['campaigns'],
    queryFn: () => api.campaigns.getAll(),
  });

  const listData = React.useMemo(() => {
    const raw = campaigns ?? [];
    return [...raw].filter((c: Campaign) => c.status === 'active').sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  }, [campaigns]);

  if (isLoading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={Colors.ivoryBlue} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Donate to a quest</Text>
        <View style={styles.backBtn} />
      </View>
      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No active quests right now.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isCleanup = item.quest_type === 'uniserv_cleanup';
          const isNoBurn = item.quest_type === 'no_burn';
          const isBanPlastic = item.quest_type === 'ban_plastic';
          const borderColor = isCleanup ? Colors.grass : isNoBurn ? Colors.coral : isBanPlastic ? Colors.lavender : Colors.ivoryBlue;
          return (
            <TouchableOpacity
              style={[styles.card, { borderLeftColor: borderColor }]}
              onPress={() => navigation.navigate('DonateToQuest', { campaignId: item.id })}
              activeOpacity={0.85}
            >
              <Text style={styles.cardEmoji}>
                {isCleanup ? '🌳' : isNoBurn ? '🚭' : isBanPlastic ? '🛍️' : '🎯'}
              </Text>
              <View style={styles.cardText}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.cardMeta}>Pool: {item.prize_total} THB</Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.cream },
  container: { flex: 1, backgroundColor: Colors.cream },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.cream,
    borderBottomWidth: 1,
    borderBottomColor: Colors.creamDark,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  backBtnText: { fontSize: 24, color: Colors.ivoryBlueDark },
  headerTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '700',
    fontSize: 18,
    color: Colors.ivoryBlueDark,
  },
  listContent: { padding: Spacing.lg, paddingBottom: 80 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    borderLeftWidth: 4,
    ...Shadows.card,
  },
  cardEmoji: { fontSize: 28, marginRight: Spacing.md },
  cardText: { flex: 1 },
  cardTitle: {
    fontFamily: Typography.heading.fontFamily,
    fontWeight: '600',
    fontSize: 16,
    color: Colors.ivoryBlueDark,
  },
  cardMeta: { fontSize: 13, color: Colors.textGray, marginTop: 2 },
  chevron: { fontSize: 24, color: Colors.textGray },
  empty: { padding: Spacing.xl, alignItems: 'center' },
  emptyText: { fontSize: 16, color: Colors.textGray },
});
