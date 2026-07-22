import React, { useEffect, useRef } from 'react';
import { Image, Animated, View, Text, StyleSheet, Platform } from 'react-native';
import { colors } from '../utils/theme';

// Cross-platform monospace face — gives the wordmark a distinct "digital /
// terminal" feel that separates the brand type from the body UI type.
const MONO = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

// Two modes:
//   default (header)  — tiny 26px icon, no name, no animation.
//   showName=true     — big centered lockup with fade+scale intro. The icon
//                       and its glow live inside a fixed-size wrapper so the
//                       wordmark below flows in normal layout instead of
//                       overlapping the glow disc.
export default function AppLogo({ size = 26, showName = false, animated = false }) {
  const scale = useRef(new Animated.Value(animated ? 0.85 : 1)).current;
  const opacity = useRef(new Animated.Value(animated ? 0 : 1)).current;
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animated) return;
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 6, tension: 40 }),
      Animated.timing(opacity, { toValue: 1, duration: 550, useNativeDriver: true }),
    ]).start();
    // Subtle infinite glow pulse — signals "alive" without being distracting.
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.08, duration: 1600, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1600, useNativeDriver: true }),
      ])
    ).start();
  }, [animated, scale, opacity, pulse]);

  if (!showName) {
    return (
      <Image
        source={require('../assets/icon.png')}
        style={{ width: size, height: size, borderRadius: size / 4, marginLeft: 12 }}
      />
    );
  }

  // Fixed square so the glow disc can't push the wordmark down or overlap it.
  const wrapSize = Math.round(size * 2.4);

  return (
    <Animated.View style={[styles.lockup, { opacity, transform: [{ scale }] }]}>
      <View style={[styles.iconWrap, { width: wrapSize, height: wrapSize }]}>
        <Animated.View
          style={[
            styles.glow,
            {
              width: wrapSize,
              height: wrapSize,
              borderRadius: wrapSize / 2,
              transform: [{ scale: pulse }],
            },
          ]}
        />
        <Image
          source={require('../assets/icon.png')}
          style={{ width: size, height: size, borderRadius: size / 4 }}
        />
      </View>

      <Text style={[styles.name, { fontSize: Math.round(size * 0.45) }]}>PROGRESSIVE</Text>
      <View style={styles.underline} />
      <Text style={styles.tagline}>Lift smarter · Track everything</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  lockup: { alignItems: 'center', justifyContent: 'center' },
  iconWrap: { alignItems: 'center', justifyContent: 'center' },
  glow: {
    position: 'absolute',
    backgroundColor: 'rgba(94, 234, 212, 0.18)',
  },
  name: {
    color: '#5EEAD4',                     // brighter cyan-mint, distinct from CTA green
    fontFamily: MONO,
    fontWeight: '900',
    letterSpacing: 4,
    marginTop: 22,
    textShadowColor: 'rgba(94, 234, 212, 0.55)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 14,
  },
  underline: {
    height: 2,
    width: 44,
    backgroundColor: colors.accent,
    borderRadius: 2,
    marginTop: 10,
    opacity: 0.7,
  },
  tagline: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 10,
    fontFamily: MONO,
    letterSpacing: 1.2,
  },
});
