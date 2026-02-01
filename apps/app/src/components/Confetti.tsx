import * as React from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { Colors } from '../theme/theme';

const PARTICLE_COUNT = 50;
const DURATION = 2500;
const COLORS = [Colors.chartBlue, Colors.coral, Colors.grass, Colors.lavender, Colors.accent, Colors.xp];

function useConfetti(active: boolean) {
  const particles = React.useRef(
    Array.from({ length: PARTICLE_COUNT }, () => ({
      x: new Animated.Value(Math.random() * Dimensions.get('window').width),
      y: new Animated.Value(-20),
      rotate: new Animated.Value(0),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 8,
      delay: Math.random() * 400,
    }))
  ).current;

  React.useEffect(() => {
    if (!active) return;
    particles.forEach((p) => {
      p.y.setValue(-20);
      p.rotate.setValue(0);
    });
    const anims = particles.map((p) =>
      Animated.parallel([
        Animated.timing(p.y, {
          toValue: Dimensions.get('window').height + 30,
          duration: DURATION + p.delay,
          useNativeDriver: true,
        }),
        Animated.timing(p.rotate, {
          toValue: 1,
          duration: DURATION,
          useNativeDriver: true,
        }),
      ])
    );
    Animated.stagger(0, anims).start();
  }, [active]);

  return particles;
}

interface ConfettiProps {
  active: boolean;
  style?: object;
}

export function Confetti({ active, style }: ConfettiProps) {
  const particles = useConfetti(active);
  if (!active || !particles?.length) return null;
  return (
    <View style={[StyleSheet.absoluteFill, style]} pointerEvents="none">
      {particles.map((p, i) => (
        <Animated.View
          key={i}
          style={[
            styles.particle,
            {
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              borderRadius: p.size / 2,
              transform: [
                { translateX: p.x },
                { translateY: p.y },
                {
                  rotate: p.rotate.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '720deg'],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {},
});
