/**
 * BountyFi badge / ticket chip - Playful Victory Edition
 * Gold gradient feel, admiral blue text, 8px radius
 */
import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { colors, typography, borderRadius, spacing } from '../theme';

type BadgeProps = {
  label: string;
  style?: ViewStyle;
};

export function Badge({ label, style }: BadgeProps) {
  return (
    <View style={[styles.badge, style]}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: colors.winnerGold,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  text: {
    ...typography.button,
    fontSize: 14,
    letterSpacing: 1,
    color: colors.admiralBlueDark,
  },
});
