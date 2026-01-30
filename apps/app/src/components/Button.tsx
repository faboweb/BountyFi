import * as React from 'react';
import { TouchableOpacity, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography, Shadows, BorderRadius, Spacing } from '../theme/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'success';
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  loading?: boolean;
}

export function Button({ title, onPress, variant = 'primary', style, textStyle, disabled, loading }: ButtonProps) {
  const isDisabled = disabled || loading;
  const opacity = isDisabled ? 0.5 : 0.8;

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={isDisabled ? undefined : onPress}
        activeOpacity={opacity}
        style={[styles.shadow, style, isDisabled && { opacity: 0.5 }]}
      >
        <LinearGradient
          colors={Colors.primaryGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.primaryButton}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={[styles.buttonText, textStyle]}>{title}</Text>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'success') {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} disabled={isDisabled} style={[styles.shadow, style, isDisabled && { opacity: 0.5 }]}>
        <LinearGradient
          colors={Colors.successGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.successButton}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <Text style={[styles.buttonText, textStyle]}>{title}</Text>
          )}
        </LinearGradient>
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
        <ActivityIndicator size="small" color={Colors.primaryBright} />
      ) : (
        <Text style={[styles.secondaryButtonText, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  shadow: Shadows.primary,
  primaryButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  successButton: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryButton: {
    paddingVertical: Spacing.md - 3, // Adjust for border
    paddingHorizontal: Spacing.xl - 3,
    borderRadius: BorderRadius.md,
    borderWidth: 3,
    borderColor: Colors.primaryBright,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: Typography.button,
  secondaryButtonText: {
    ...Typography.button,
    color: Colors.primaryDark,
  },
});
