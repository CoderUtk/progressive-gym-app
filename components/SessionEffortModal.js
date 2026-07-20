import React, { useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { PrimaryButton } from './UI';
import { colors, spacing } from '../utils/theme';

// Session RPE (rate of perceived exertion) — quick 1-10 tap so we don't ask
// the user to fumble with a slider on a small screen. Number pills are
// tab-target friendly and score selection is one tap.
const LABELS = {
  1: 'Very light',
  3: 'Light',
  5: 'Moderate',
  7: 'Hard',
  9: 'Very hard',
  10: 'All-out max',
};

export default function SessionEffortModal({ visible, onSubmit, onSkip }) {
  const [value, setValue] = useState(7);
  const label = LABELS[value] || (
    value < 3 ? LABELS[1] :
    value < 5 ? LABELS[3] :
    value < 7 ? LABELS[5] :
    value < 9 ? LABELS[7] :
    LABELS[9]
  );

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onSkip}>
      <View style={styles.backdrop}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.card}>
          <Text style={styles.title}>How hard was that?</Text>
          <Text style={styles.subtitle}>Session effort · 1 easy, 10 all-out</Text>

          <View style={styles.scale}>
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <Pressable
                key={n}
                onPress={() => setValue(n)}
                style={[styles.pill, value === n && styles.pillActive]}
              >
                <Text style={[styles.pillText, value === n && styles.pillTextActive]}>{n}</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.hintLabel}>{label}</Text>

          <PrimaryButton title={`Save · RPE ${value}`} onPress={() => onSubmit(value)} style={{ marginTop: spacing.md }} />
          <Pressable onPress={onSkip} style={styles.skipBtn}>
            <Text style={styles.skipText}>Skip</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: spacing.lg },
  card: {
    backgroundColor: '#151A21',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: spacing.lg,
  },
  title: { color: colors.text, fontSize: 19, fontWeight: '800', textAlign: 'center', marginBottom: 4 },
  subtitle: { color: colors.muted, fontSize: 12, textAlign: 'center', marginBottom: spacing.lg },
  scale: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 },
  pill: {
    width: '18%',
    aspectRatio: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  pillActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  pillText: { color: colors.text, fontSize: 15, fontWeight: '800' },
  pillTextActive: { color: colors.ctaText },
  hintLabel: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    textAlign: 'center',
    marginTop: spacing.md,
    textTransform: 'uppercase',
  },
  skipBtn: { alignItems: 'center', paddingVertical: spacing.md },
  skipText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
});
