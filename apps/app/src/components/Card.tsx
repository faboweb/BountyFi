import * as React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Colors, Shadows, BorderRadius, Spacing } from '../theme/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  noPadding?: boolean;
  elevated?: boolean;
}

export function Card({ children, style, noPadding, elevated }: CardProps) {
  return (
    <View style={[styles.card, elevated && styles.cardElevated, noPadding && { padding: 0 }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: BorderRadius.xl,
    padding: Spacing.lg,
    borderWidth: 0,
    ...Shadows.card,
    overflow: 'hidden',
  },
  cardElevated: {
    ...Shadows.cardElevated,
  },
});
