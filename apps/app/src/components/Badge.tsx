import * as React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Shadows, BorderRadius, Spacing } from '../theme/theme';

interface BadgeProps {
  label: string;
  variant?: 'gold' | 'success' | 'blue';
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Badge({ label, variant = 'gold', style, textStyle }: BadgeProps) {
  let colors: readonly [string, string, ...string[]] = Colors.goldGradient;
  let textColor = Colors.primaryDark;

  if (variant === 'success') {
    colors = Colors.successGradient;
    textColor = Colors.white;
  } else if (variant === 'blue') {
    colors = Colors.primaryGradient;
    textColor = Colors.white;
  }

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.badge, style]}
    >
      <Text style={[styles.label, { color: textColor }, textStyle]}>{label}</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    alignSelf: 'flex-start',
    ...Shadows.card,
  },
  label: {
    ...Typography.body,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
