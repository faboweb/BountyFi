import * as React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '../theme/theme';

export type SegmentOption<T = string> = { value: T; label: string };

interface SegmentedControlProps<T = string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  style?: object;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  style,
}: SegmentedControlProps<T>) {
  return (
    <View style={[styles.wrapper, style]}>
      {options.map((opt) => {
        const isSelected = opt.value === value;
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.8}
            style={[styles.segment, isSelected && styles.segmentSelected]}
          >
            <Text style={[styles.label, isSelected && styles.labelSelected]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flexDirection: 'row',
    backgroundColor: Colors.primaryLight,
    borderRadius: BorderRadius.lg,
    padding: 4,
    ...Shadows.inset,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: {
    backgroundColor: Colors.primary,
    ...Shadows.sm,
  },
  label: {
    ...Typography.caption,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  labelSelected: {
    color: Colors.textPrimary,
    fontWeight: '700',
  },
});
