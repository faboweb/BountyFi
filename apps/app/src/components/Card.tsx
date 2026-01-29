/**
 * BountyFi card - Playful Victory Edition
 * White bg, 2px border, 16px radius, subtle shadow
 */
import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { colors, borderRadius, spacing, shadows } from '../theme';

type CardProps = {
  children: React.ReactNode;
  style?: ViewStyle;
};

export function Card({ children, style }: CardProps) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderWidth: 2,
    borderColor: colors.borderGray,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    ...shadows.card,
  },
});
