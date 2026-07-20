import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Easing, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useWorkoutSession, formatElapsed } from '../utils/workoutSession';
import { colors } from '../utils/theme';

// Floating pill anchored just below the OS status bar. Rendered once at the
// root so it persists across tab and stack navigation while a workout is
// active. Hidden entirely when there's no session — it should not add chrome
// when the app is not tracking anything.
export default function ActiveSessionPill() {
  const { active, paused, elapsedSeconds } = useWorkoutSession();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const pulse = useRef(new Animated.Value(1)).current;

  // Subtle breathing glow on the dot so the eye catches the pill without a
  // hard blink. Skipped when paused — a paused session is not "live."
  useEffect(() => {
    if (!active || paused) {
      pulse.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: true, easing: Easing.inOut(Easing.quad) }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [active, paused, pulse]);

  if (!active) return null;

  function returnToLogger() {
    navigation.navigate('WorkoutLogger');
  }

  const topInset = insets.top || (Platform.OS === 'ios' ? 44 : 24);

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: topInset + 4 }]}>
      <Pressable onPress={returnToLogger} style={styles.pill}>
        <Animated.View style={[styles.dot, { opacity: pulse }]} />
        <Text style={styles.label}>
          {paused ? 'Paused' : 'Workout in Progress'}
        </Text>
        <Text style={styles.time}>{formatElapsed(elapsedSeconds)}</Text>
        <Feather name="chevron-right" size={14} color={colors.accent} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 1000,
    elevation: 20,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(21, 26, 33, 0.95)',
    borderWidth: 1,
    borderColor: 'rgba(62, 224, 158, 0.45)',
    borderRadius: 999,
    // Mint glow so the pill reads as "live" from a glance.
    shadowColor: colors.accent,
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  label: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  time: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
});
