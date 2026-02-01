import * as React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, Shadows, BorderRadius, Spacing } from '../theme/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success';
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  loading?: boolean;
  /** Ionicons name for leading icon (e.g. 'play', 'add') */
  icon?: keyof typeof Ionicons.glyphMap;
}

export function Button({ title, onPress, variant = 'primary', style, textStyle, disabled, loading, icon }: ButtonProps) {
  const isDisabled = disabled || loading;
  const opacity = isDisabled ? 0.5 : 0.9;
  const iconColor = variant === 'success' ? Colors.white : Colors.textPrimary;

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={isDisabled ? undefined : onPress}
        activeOpacity={opacity}
        style={[styles.primaryButton, style, isDisabled && { opacity: 0.5 }]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={Colors.textPrimary} />
        ) : (
          <View style={styles.buttonContent}>
            {icon != null && (
              <Ionicons name={icon} size={20} color={iconColor} style={styles.buttonIcon} />
            )}
            <Text style={[styles.primaryButtonText, textStyle]}>{title.toUpperCase()}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  if (variant === 'success') {
    return (
      <TouchableOpacity
        onPress={isDisabled ? undefined : onPress}
        activeOpacity={opacity}
        disabled={isDisabled}
        style={[styles.successButton, style, isDisabled && { opacity: 0.5 }]}
      >
        {loading ? (
          <ActivityIndicator size="small" color={Colors.white} />
        ) : (
          <View style={styles.buttonContent}>
            {icon != null && (
              <Ionicons name={icon} size={20} color={Colors.white} style={styles.buttonIcon} />
            )}
            <Text style={[styles.successButtonText, textStyle]}>{title.toUpperCase()}</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      onPress={isDisabled ? undefined : onPress}
      activeOpacity={0.7}
      disabled={isDisabled}
      style={[styles.secondaryButton, style, isDisabled && { opacity: 0.5 }]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={Colors.textPrimary} />
      ) : (
        <View style={styles.buttonContent}>
          {icon != null && (
            <Ionicons name={icon} size={18} color={Colors.textPrimary} style={styles.buttonIcon} />
          )}
          <Text style={[styles.secondaryButtonText, textStyle]}>{title.toUpperCase()}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonIcon: {
    marginRight: 8,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing.md + 6,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.primary,
  },
  primaryButtonText: {
    ...Typography.button,
    color: Colors.textPrimary,
  },
  successButton: {
    backgroundColor: Colors.grass,
    paddingVertical: Spacing.md + 6,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.primary,
  },
  successButtonText: {
    ...Typography.button,
    color: Colors.white,
  },
  secondaryButton: {
    backgroundColor: Colors.primaryLight,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  secondaryButtonText: {
    ...Typography.button,
    color: Colors.textPrimary,
    fontSize: 14,
  },
});
