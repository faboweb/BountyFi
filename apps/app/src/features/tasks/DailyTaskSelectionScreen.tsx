import * as React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { AppStackParamList } from '../../navigation/AppNavigator';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../../theme/theme';
import { Card } from '../../components/Card';
import { Button } from '../../components/Button';
import { Badge } from '../../components/Badge';

type NavigationProp = NativeStackNavigationProp<AppStackParamList>;

export function DailyTaskSelectionScreen() {
  const navigation = useNavigation<NavigationProp>();

  const tasks = [
    {
      id: 'photo',
      title: 'Snap & Share',
      description: 'Take a photo of a clean project.',
      xp: 15,
      icon: '📸',
      status: '0 / 1',
      color: Colors.missionPhoto,
    },
    {
      id: 'vote',
      title: 'Community Vote',
      description: 'Validate 5 recent submissions.',
      xp: 10,
      icon: '✅',
      status: '0 / 5',
      color: Colors.missionCleanup,
    },
    {
      id: 'invite',
      title: 'Growth Hero',
      description: 'Invite a friend to BountyFi.',
      xp: 50,
      icon: '🎁',
      status: 'Pending',
      color: Colors.missionQuest,
    },
  ];

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Challenges</Text>
        <Text style={styles.headerSubtitle}>Complete all tasks for a mystery loot box!</Text>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        {tasks.map((task) => (
          <TouchableOpacity 
            key={task.id} 
            activeOpacity={0.8}
            onPress={() => task.id === 'photo' && navigation.navigate('DailyTaskCamera' as any)}
          >
            <Card style={styles.taskCard}>
              <View style={[styles.iconBox, { backgroundColor: `${task.color}20` }]}>
                <Text style={styles.iconText}>{task.icon}</Text>
              </View>
              <View style={styles.taskInfo}>
                <Text style={styles.taskTitle}>{task.title}</Text>
                <Text style={styles.taskDesc}>{task.description}</Text>
                <View style={styles.taskFooter}>
                  <Badge label={`+${task.xp} XP`} variant="gold" />
                  <Text style={styles.statusText}>{task.status}</Text>
                </View>
              </View>
              <Text style={styles.arrow}>→</Text>
            </Card>
          </TouchableOpacity>
        ))}

        <Card style={styles.mysteryCard}>
          <View style={styles.mysteryHeader}>
            <Text style={styles.mysteryEmoji}>📦</Text>
            <View>
              <Text style={styles.mysteryTitle}>Mystery Loot Box</Text>
              <Text style={styles.mysteryDesc}>Unlocks after 3 challenges</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={styles.progressFill} />
          </View>
        </Card>
      </ScrollView>

      <View style={styles.footer}>
        <Button 
          title="CLAIM REWARD" 
          onPress={() => {}} 
          disabled 
          variant="primary" 
          style={styles.claimButton} 
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  header: {
    padding: Spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#F3F4F6',
  },
  closeButton: {
    position: 'absolute',
    left: Spacing.lg,
    top: Spacing.lg,
  },
  closeText: {
    fontSize: 24,
    color: Colors.textGray,
    fontWeight: 'bold',
  },
  headerTitle: {
    ...Typography.heading,
    fontSize: 22,
    color: Colors.primaryDark,
  },
  headerSubtitle: {
    ...Typography.body,
    fontSize: 14,
    color: Colors.textGray,
    marginTop: 4,
  },
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  taskCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
    padding: Spacing.md,
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.md,
  },
  iconText: {
    fontSize: 30,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    ...Typography.body,
    fontWeight: '800',
    fontSize: 18,
    color: Colors.primaryDark,
  },
  taskDesc: {
    ...Typography.body,
    fontSize: 13,
    color: Colors.textGray,
    marginBottom: 8,
  },
  taskFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusText: {
    ...Typography.body,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primaryBright,
  },
  arrow: {
    fontSize: 20,
    color: '#D1D5DB',
    marginLeft: Spacing.sm,
  },
  mysteryCard: {
    marginTop: Spacing.lg,
    backgroundColor: '#EEF2FF',
    borderColor: '#C7D2FE',
    borderStyle: 'dashed',
  },
  mysteryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  mysteryEmoji: {
    fontSize: 40,
    marginRight: Spacing.md,
  },
  mysteryTitle: {
    ...Typography.body,
    fontWeight: '800',
    fontSize: 18,
    color: '#4338CA',
  },
  mysteryDesc: {
    ...Typography.body,
    fontSize: 14,
    color: '#6366F1',
  },
  progressTrack: {
    height: 12,
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    width: '33%',
    backgroundColor: '#6366F1',
    borderRadius: BorderRadius.full,
  },
  footer: {
    padding: Spacing.lg,
    borderTopWidth: 2,
    borderTopColor: '#F3F4F6',
  },
  claimButton: {
    width: '100%',
  },
});
