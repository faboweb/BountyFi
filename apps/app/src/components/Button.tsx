/**
 * BountyFi buttons - Playful Victory Edition
 * Primary: blue gradient; Secondary: outline; Success: green
 */
import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { colors, typography, borderRadius, spacing, shadows } from '../theme';

type Variant = 'primary' | 'secondary' | 'success';

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: Variant;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
};

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const buttonStyle = [
    styles.base,
    styles[variant],
    isDisabled && styles.disabled,
  ];

  const getTextColor = (): string => {
    if (variant === 'secondary') return colors.admiralBlueDark;
    return colors.white;
  };

  return (
    <TouchableOpacity
      style={[buttonStyle, style]}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  primary: {
    backgroundColor: colors.admiralBlueBright,
    ...shadows.primary,
  },
  secondary: {
    backgroundColor: 'transparent',
    borderWidth: 3,
    borderColor: colors.admiralBlueBright,
    paddingVertical: spacing.md - 2,
  },
  success: {
    backgroundColor: colors.successGreen,
    ...shadows.card,
  },
  disabled: {
    opacity: 0.6,
  },
  text: {
    ...typography.button,
  },
});
