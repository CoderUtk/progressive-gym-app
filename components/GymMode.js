import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  PanResponder,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { colors, spacing, radius } from '../utils/theme';
import { formatSet } from '../utils/setSchema';
import { formatWeight } from '../utils/units';
import { roundToIncrement } from '../utils/progressiveOverload';
import { TRACKING } from '../data/exercises';

// Optional wake-lock — keeps the screen on between sets. Guarded require so a
// missing native module (older build) degrades to "screen may sleep" instead
// of crashing, matching the app's defensive-require pattern for native deps.
let useKeepAwake = () => {};
try {
  // eslint-disable-next-line global-require
  useKeepAwake = require('expo-keep-awake').useKeepAwake || (() => {});
} catch (e) {
  // no-op
}

const REST_DEFAULT_SEC = 90;

function fmtClock(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

// Immersive "phone on the bench" logger. Presentation-only: it reads the live
// set state and calls back into the parent logger for the actual commit, so
// there's a single source of truth for progressive-overload logic.
export default function GymMode({
  activeEx,
  exerciseData,
  activeIndex,
  onPrev,
  onNext,
  current,
  setCurrent,
  unit,
  step,
  onLogSet,
  onFinish,
  onExit,
  elapsedLabel,
}) {
  useKeepAwake();
  const [rest, setRest] = useState(0); // seconds remaining; 0 = not resting
  const restRef = useRef(null);

  const exercise = activeEx.exercise;
  const type = exercise.tracking_type || TRACKING.WEIGHT_REPS;
  const isBodyweight = type === TRACKING.BODYWEIGHT_REPS;
  const isSteppable = type === TRACKING.WEIGHT_REPS || isBodyweight;
  const lastSession = activeEx.history[0];

  // Rest countdown ticker.
  useEffect(() => {
    if (rest <= 0) return undefined;
    restRef.current = setInterval(() => {
      setRest((r) => (r <= 1 ? 0 : r - 1));
    }, 1000);
    return () => clearInterval(restRef.current);
  }, [rest > 0]);

  function handleLog() {
    onLogSet();
    setRest(REST_DEFAULT_SEC);
  }

  // Horizontal swipe changes exercise; vertical drags are ignored so the
  // steppers stay tappable. Thresholds keep accidental taps from switching.
  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_e, g) =>
        Math.abs(g.dx) > 24 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderRelease: (_e, g) => {
        if (g.dx <= -60) onNext?.();
        else if (g.dx >= 60) onPrev?.();
      },
    })
  ).current;

  const weightVal = current.weight ?? 0;
  const repsVal = current.reps ?? 0;
  const addedVal = current.addedWeight ?? 0;

  function bump(field, delta) {
    setCurrent((c) => {
      if (field === 'weight') {
        return { ...c, weight: roundToIncrement(Math.max(0, (c.weight || 0) + delta), step) };
      }
      if (field === 'reps') {
        return { ...c, reps: Math.max(0, (c.reps || 0) + delta) };
      }
      if (field === 'addedWeight') {
        return { ...c, addedWeight: (c.addedWeight || 0) + delta };
      }
      return c;
    });
  }

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      {/* ── Top bar ─────────────────────────────────────────── */}
      <View style={styles.topBar}>
        <Pressable onPress={onExit} hitSlop={12} style={styles.topBtn}>
          <Feather name="chevron-down" size={22} color={colors.muted} />
          <Text style={styles.topBtnText}>Exit</Text>
        </Pressable>
        <Text style={styles.timer}>{elapsedLabel}</Text>
        <Pressable onPress={onFinish} hitSlop={12} style={styles.topBtn}>
          <Feather name="flag" size={18} color={colors.accent} />
          <Text style={[styles.topBtnText, { color: colors.accent }]}>Finish</Text>
        </Pressable>
      </View>

      {/* ── Exercise position dots ──────────────────────────── */}
      <View style={styles.dots}>
        {exerciseData.map((e, i) => (
          <View
            key={e.exercise.id}
            style={[
              styles.dot,
              i === activeIndex && styles.dotActive,
              e.loggedSets.length > 0 && i !== activeIndex && styles.dotDone,
            ]}
          />
        ))}
      </View>

      {/* ── Main swipeable area ─────────────────────────────── */}
      <View style={styles.main} {...pan.panHandlers}>
        <Text style={styles.exerciseName} numberOfLines={3}>{exercise.name}</Text>

        {rest > 0 ? (
          <View style={styles.restWrap}>
            <Text style={styles.restLabel}>REST</Text>
            <Text style={styles.restClock}>{fmtClock(rest)}</Text>
            <View style={styles.restBtns}>
              <Pressable style={styles.restBtn} onPress={() => setRest((r) => r + 15)}>
                <Text style={styles.restBtnText}>+15s</Text>
              </Pressable>
              <Pressable style={styles.restBtn} onPress={() => setRest(0)}>
                <Text style={styles.restBtnText}>Skip</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            <Text style={styles.metaLine}>
              Last: {lastSession && lastSession.sets.length
                ? formatSet(exercise, lastSession.sets[lastSession.sets.length - 1], unit)
                : '—'}
            </Text>
            {type === TRACKING.WEIGHT_REPS && (
              <Text style={styles.targetLine}>
                Target: {activeEx.suggestion?.weight != null
                  ? `${formatWeight(activeEx.suggestion.weight, unit)} × ${activeEx.suggestion.reps}`
                  : 'Log first set'}
              </Text>
            )}

            {isSteppable ? (
              <View style={styles.steppers}>
                {type === TRACKING.WEIGHT_REPS && (
                  <BigStepper
                    label={unit}
                    value={weightVal}
                    onMinus={() => bump('weight', -step)}
                    onPlus={() => bump('weight', step)}
                  />
                )}
                {isBodyweight && (
                  <BigStepper
                    label={`+${unit}`}
                    value={addedVal}
                    onMinus={() => bump('addedWeight', -step)}
                    onPlus={() => bump('addedWeight', step)}
                  />
                )}
                <BigStepper
                  label="reps"
                  value={repsVal}
                  onMinus={() => bump('reps', -1)}
                  onPlus={() => bump('reps', 1)}
                />
              </View>
            ) : (
              <Text style={styles.fallbackNote}>
                Exit Gym Mode to log this exercise type.
              </Text>
            )}
          </>
        )}

        <View style={styles.swipeHint}>
          <Feather name="chevron-left" size={14} color={colors.mutedDim} />
          <Text style={styles.swipeHintText}>swipe to change exercise</Text>
          <Feather name="chevron-right" size={14} color={colors.mutedDim} />
        </View>
      </View>

      {/* ── Big log button ──────────────────────────────────── */}
      {isSteppable && (
        <Pressable
          style={({ pressed }) => [styles.logBtn, pressed && { opacity: 0.85 }]}
          onPress={handleLog}
        >
          <Text style={styles.logBtnText}>
            LOG SET {activeEx.loggedSets.length + 1}
          </Text>
        </Pressable>
      )}
    </SafeAreaView>
  );
}

function BigStepper({ label, value, onMinus, onPlus }) {
  return (
    <View style={styles.stepper}>
      <Pressable style={styles.stepBtn} onPress={onMinus} hitSlop={8}>
        <Feather name="minus" size={26} color={colors.text} />
      </Pressable>
      <View style={styles.stepValueWrap}>
        <Text style={styles.stepValue}>{value}</Text>
        <Text style={styles.stepLabel}>{label}</Text>
      </View>
      <Pressable style={styles.stepBtn} onPress={onPlus} hitSlop={8}>
        <Feather name="plus" size={26} color={colors.text} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.lg },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  topBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  topBtnText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  timer: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: spacing.md },
  dot: { width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.border },
  dotActive: { backgroundColor: colors.accent, width: 20 },
  dotDone: { backgroundColor: colors.accentDim },
  main: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  exerciseName: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
    lineHeight: 40,
  },
  metaLine: { color: colors.muted, fontSize: 16, fontWeight: '600' },
  targetLine: { color: colors.accent, fontSize: 18, fontWeight: '800' },
  fallbackNote: { color: colors.muted, fontSize: 15, textAlign: 'center', marginTop: spacing.md },
  steppers: { width: '100%', gap: spacing.md, marginTop: spacing.md },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  stepBtn: {
    width: 60,
    height: 60,
    borderRadius: radius.full,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepValueWrap: { alignItems: 'center', minWidth: 96 },
  stepValue: { color: colors.text, fontSize: 40, fontWeight: '900', fontVariant: ['tabular-nums'] },
  stepLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  restWrap: { alignItems: 'center', gap: spacing.sm, marginVertical: spacing.lg },
  restLabel: { color: colors.muted, fontSize: 14, fontWeight: '800', letterSpacing: 3 },
  restClock: {
    color: colors.accent,
    fontSize: 72,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace' }),
  },
  restBtns: { flexDirection: 'row', gap: spacing.md },
  restBtn: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  restBtnText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  swipeHint: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: spacing.md },
  swipeHintText: { color: colors.mutedDim, fontSize: 11, fontWeight: '600' },
  logBtn: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  logBtnText: { color: colors.ctaText, fontSize: 20, fontWeight: '900', letterSpacing: 1 },
});
