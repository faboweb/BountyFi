import * as React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors, BorderRadius } from '../theme/theme';

interface ProgressBarProps {
  progress: number; // 0 to 100
  color?: string;
  style?: ViewStyle;
}

export function ProgressBar({ progress, color = Colors.primaryBright, style }: ProgressBarProps) {
  return (
    <View style={[styles.container, style]}>
      <View 
        style={[
          styles.fill, 
          { width: `${Math.min(100, Math.max(0, progress))}%`, backgroundColor: color }
        ]} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 12,
    backgroundColor: '#E5E7EB',
    borderRadius: BorderRadius.full,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    borderRadius: BorderRadius.full,
  },
});
