import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../utils/theme';

export function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function PrimaryButton({ title, onPress, style, disabled }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryBtn,
        disabled && { opacity: 0.4 },
        pressed && !disabled && { opacity: 0.8 },
        style,
      ]}
    >
      <Text style={styles.primaryBtnText}>{title}</Text>
    </Pressable>
  );
}

export function IconStepper({ label, value, unit, onIncrement, onDecrement }) {
  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable style={styles.stepBtn} onPress={onDecrement}>
          <Text style={styles.stepBtnText}>–</Text>
        </Pressable>
        <Text style={styles.stepperValue}>
          {value}
          <Text style={styles.stepperUnit}> {unit}</Text>
        </Text>
        <Pressable style={styles.stepBtn} onPress={onIncrement}>
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function Pill({ label, tone = 'default' }) {
  const toneColor = {
    default: colors.muted,
    accent: colors.accent,
    gold: colors.gold,
  }[tone];
  return (
    <View style={[styles.pill, { borderColor: toneColor }]}>
      <Text style={[styles.pillText, { color: toneColor }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  primaryBtn: {
    backgroundColor: colors.accent,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: colors.bg,
    fontWeight: '800',
    fontSize: 16,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  stepperLabel: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  stepBtn: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepBtnText: { color: colors.text, fontSize: 20, fontWeight: '700' },
  stepperValue: { color: colors.text, fontSize: 20, fontWeight: '800', minWidth: 70, textAlign: 'center' },
  stepperUnit: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  pill: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  pillText: { fontSize: 11, fontWeight: '700' },
});
