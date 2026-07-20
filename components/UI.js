import React from 'react';
import { View, Text, Pressable, TextInput, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, shadows } from '../utils/theme';

export function Card({ children, style, active }) {
  return <View style={[styles.card, active && styles.cardActive, style]}>{children}</View>;
}

export function PrimaryButton({ title, onPress, style, disabled, variant = 'primary' }) {
  if (variant === 'secondary') {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        style={({ pressed }) => [
          styles.secondaryBtn,
          disabled && { opacity: 0.4 },
          pressed && !disabled && { opacity: 0.8 },
          style,
        ]}
      >
        <Text style={styles.secondaryBtnText}>{title}</Text>
      </Pressable>
    );
  }
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.primaryBtnWrap,
        disabled && { opacity: 0.4 },
        pressed && !disabled && { opacity: 0.85 },
        style,
      ]}
    >
      <LinearGradient
        colors={[colors.accent, colors.accentDim]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.primaryBtnGradient}
      >
        <Text style={styles.primaryBtnText}>{title}</Text>
      </LinearGradient>
    </Pressable>
  );
}

// Value is editable in two ways: the +/- buttons (which respect whatever
// step the caller passes in), or tapping the number and typing an exact
// integer directly.
export function IconStepper({ label, value, unit, onIncrement, onDecrement, onChangeValue }) {
  function handleTextChange(text) {
    if (!onChangeValue) return;
    const digitsOnly = text.replace(/[^0-9]/g, '');
    onChangeValue(digitsOnly === '' ? 0 : parseInt(digitsOnly, 10));
  }

  return (
    <View style={styles.stepperRow}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperControls}>
        <Pressable style={styles.stepBtn} onPress={onDecrement}>
          <Text style={styles.stepBtnText}>–</Text>
        </Pressable>
        {onChangeValue ? (
          <TextInput
            style={styles.stepperInput}
            value={String(value)}
            onChangeText={handleTextChange}
            keyboardType="number-pad"
            selectTextOnFocus
          />
        ) : (
          <Text style={styles.stepperValue}>{value}</Text>
        )}
        <Text style={styles.stepperUnit}>{unit}</Text>
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
  cardActive: {
    borderColor: colors.borderActive,
    backgroundColor: colors.activeTint,
  },
  primaryBtnWrap: {
    borderRadius: radius.md,
    ...shadows.glow,
  },
  primaryBtnGradient: {
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  primaryBtnText: {
    color: colors.ctaText,
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryBtn: {
    backgroundColor: colors.cardAlt,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 16,
  },
  stepperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  stepperLabel: { color: colors.muted, fontSize: 14, fontWeight: '600' },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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
  stepperValue: { color: colors.text, fontSize: 20, fontWeight: '800', minWidth: 56, textAlign: 'center' },
  stepperInput: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    minWidth: 56,
    textAlign: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.borderActive,
    paddingVertical: 2,
  },
  stepperUnit: { fontSize: 12, color: colors.muted, fontWeight: '600' },
  pill: {
    borderWidth: 1,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  pillText: { fontSize: 11, fontWeight: '700' },
});
