import * as React from 'react';
import { View, Text, StyleSheet, Image, ViewStyle } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme/theme';
import { Card } from './Card';
import { ProgressBar } from './ProgressBar';
import { Button } from './Button';

interface MissionCardProps {
  title: string;
  description?: string;
  imageUrl?: string;
  xp?: number;
  distance?: string;
  type: string;
  typeColor: string;
  progress: number;
  progressLabel: string;
  prize: string;
  timeLeft: string;
  buttonLabel: string;
  onPress: () => void;
  isPremium?: boolean;
}

export function MissionCard({
  title,
  imageUrl,
  xp,
  distance,
  type,
  typeColor,
  progress,
  progressLabel,
  prize,
  timeLeft,
  buttonLabel,
  onPress,
  isPremium,
}: MissionCardProps) {
  return (
    <Card noPadding style={styles.card}>
      <View style={{ flex: 1 }}>
        {/* Image Header */}
        <View style={styles.imageContainer}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.image} />
          ) : (
            <View style={[styles.image, { backgroundColor: '#E5E7EB' }]} />
          )}
          
          {/* Overlays */}
          {!isPremium && xp !== undefined && xp > 0 && (
            <View style={[styles.overlayBadge, styles.xpBadge]}>
              <Text style={styles.xpText}>+{xp} XP</Text>
            </View>
          )}
          
          {isPremium && (
            <View style={[styles.overlayBadge, styles.premiumBadge]}>
              <Text style={styles.premiumText}>PREMIUM</Text>
            </View>
          )}

          {distance && (
            <View style={[styles.overlayBadge, styles.distanceBadge]}>
              <Text style={styles.distanceText}>📍 {distance}</Text>
            </View>
          )}
        </View>

        <View style={styles.content}>
          <Text style={[styles.type, { color: typeColor }]}>{type}</Text>
          <Text style={styles.title}>{title}</Text>
          
          {progressLabel ? (
            <View style={styles.progressContainer}>
              <ProgressBar progress={progress} color={typeColor} style={styles.progressBar} />
              <Text style={styles.progressLabel}>{progressLabel}</Text>
            </View>
          ) : null}

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>PRIZE</Text>
              <Text style={[styles.statValue, { color: Colors.success }]}>{prize}</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>TIME LEFT</Text>
              <Text style={[styles.statValue, { color: Colors.error }]}>{timeLeft}</Text>
            </View>
          </View>

          <Button 
            title={buttonLabel} 
            onPress={onPress} 
            variant={typeColor === Colors.missionCleanup ? 'success' : 'primary'}
            style={styles.button}
          />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: Spacing.lg,
  },
  imageContainer: {
    height: 160,
    width: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  overlayBadge: {
    position: 'absolute',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.md,
    ...Shadows.card,
  },
  xpBadge: {
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: '#FFC800',
  },
  xpText: {
    ...Typography.body,
    fontSize: 12,
    fontWeight: '800',
    color: Colors.white,
  },
  premiumBadge: {
    top: Spacing.sm,
    left: Spacing.sm,
    backgroundColor: '#FF9600',
  },
  premiumText: {
    ...Typography.body,
    fontSize: 12,
    fontWeight: '800',
    color: Colors.white,
  },
  distanceBadge: {
    top: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.white,
  },
  distanceText: {
    ...Typography.body,
    fontSize: 12,
    fontWeight: '700',
    color: Colors.textGray,
  },
  content: {
    padding: Spacing.lg,
  },
  type: {
    ...Typography.body,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    ...Typography.heading,
    fontSize: 20,
    marginBottom: Spacing.md,
    textAlign: 'left',
  },
  progressContainer: {
    marginBottom: Spacing.md,
  },
  progressBar: {
    marginBottom: 4,
  },
  progressLabel: {
    ...Typography.body,
    fontSize: 10,
    fontWeight: '800',
    color: Colors.textGray,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: BorderRadius.lg,
    padding: Spacing.sm,
    alignItems: 'center',
    marginHorizontal: Spacing.xs,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  statLabel: {
    ...Typography.body,
    fontSize: 10,
    fontWeight: '700',
    color: Colors.textGray,
    marginBottom: 2,
  },
  statValue: {
    ...Typography.heading,
    fontSize: 18,
  },
  button: {
    width: '100%',
  },
});
