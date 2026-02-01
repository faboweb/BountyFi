import * as React from 'react';
import { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Colors, Shadows } from '../theme/theme';

interface BirdMascotProps {
  size?: number;
  active?: boolean; // sweating / exerting pose
  style?: object;
}

const WINK_INTERVAL_MS = 3000;
const WINK_DURATION_MS = 200;

export function BirdMascot({ size = 120, active = false, style }: BirdMascotProps) {
  const [winking, setWinking] = useState(false);
  const eyeSize = Math.max(10, size * 0.12);
  const beakWidth = Math.max(12, size * 0.2);
  const beakHeight = Math.max(8, size * 0.08);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setWinking(true);
      setTimeout(() => setWinking(false), WINK_DURATION_MS);
    }, WINK_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <View style={[styles.wrapper, { width: size, height: size }, style]}>
      {/* Sweat drops when active */}
      {active ? (
        <>
          <View style={[styles.sweat, styles.sweat1, { width: size * 0.08, height: size * 0.12 }]} />
          <View style={[styles.sweat, styles.sweat2, { width: size * 0.06, height: size * 0.1 }]} />
          <View style={[styles.sweat, styles.sweat3, { width: size * 0.07, height: size * 0.11 }]} />
        </>
      ) : null}
      {/* Body - light blue sphere */}
      <View style={[styles.body, { width: size, height: size, borderRadius: size / 2 }]} />
      {/* Wings - simple arcs */}
      <View style={[styles.wing, styles.wingLeft, { width: size * 0.35, height: size * 0.2, top: size * 0.35, left: -size * 0.05 }]} />
      <View style={[styles.wing, styles.wingRight, { width: size * 0.35, height: size * 0.2, top: size * 0.35, right: -size * 0.05 }]} />
      {/* Eyes - circles or closed (wink) */}
      <View style={[styles.eyesRow, { top: size * 0.38, width: size, paddingHorizontal: size * 0.2 }]}>
        {winking ? (
          <>
            <View style={[styles.eyeClosed, { width: eyeSize, height: 2 }]} />
            <View style={[styles.eyeClosed, { width: eyeSize, height: 2 }]} />
          </>
        ) : (
          <>
            <View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2 }]} />
            <View style={[styles.eye, { width: eyeSize, height: eyeSize, borderRadius: eyeSize / 2 }]} />
          </>
        )}
      </View>
      {/* Beak - orange triangle pointing down */}
      <View
        style={[
          styles.beak,
          {
            bottom: size * 0.26,
            borderLeftWidth: beakWidth / 2,
            borderRightWidth: beakWidth / 2,
            borderTopWidth: beakHeight,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: Colors.accent,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  body: {
    backgroundColor: Colors.mascotBlue,
    position: 'absolute',
    ...Shadows.glow,
  },
  wing: {
    position: 'absolute',
    backgroundColor: Colors.mascotBlueLight,
    borderRadius: 999,
    opacity: 0.8,
  },
  wingLeft: {
    transform: [{ rotate: '-20deg' }],
  },
  wingRight: {
    transform: [{ rotate: '20deg' }],
  },
  eyesRow: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eye: {
    backgroundColor: Colors.textPrimary,
  },
  eyeClosed: {
    backgroundColor: Colors.textPrimary,
    borderRadius: 1,
  },
  beak: {
    position: 'absolute',
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    alignSelf: 'center',
  },
  sweat: {
    position: 'absolute',
    backgroundColor: Colors.white,
    borderRadius: 999,
    opacity: 0.9,
  },
  sweat1: { top: '18%', right: '22%' },
  sweat2: { top: '25%', left: '15%' },
  sweat3: { top: '12%', right: '8%' },
});
