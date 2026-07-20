import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Card } from '../components/UI';
import { colors, spacing } from '../utils/theme';
import { getWeightUnit, setWeightUnit, getPlateIncrement, setPlateIncrement } from '../utils/storage';

const PLATE_OPTIONS = [1.25, 2.5, 5];

export default function SettingsScreen() {
  const [unit, setUnit] = useState('kg');
  const [increment, setIncrement] = useState(2.5);

  useEffect(() => {
    getWeightUnit().then(setUnit);
    getPlateIncrement().then(setIncrement);
  }, []);

  async function chooseUnit(value) {
    setUnit(value);
    await setWeightUnit(value);
  }

  async function chooseIncrement(value) {
    setIncrement(value);
    await setPlateIncrement(value);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Weight Unit</Text>
      <Text style={styles.helpText}>
        Applies everywhere in the app — Dashboard, Workout Logger, Exercise
        History, Profile, and Analytics.
      </Text>
      <Card style={{ marginBottom: spacing.lg }}>
        <View style={styles.unitRow}>
          {['kg', 'lb'].map((value) => (
            <Pressable
              key={value}
              onPress={() => chooseUnit(value)}
              style={[styles.unitOption, unit === value && styles.unitOptionOn]}
            >
              <Text style={[styles.unitOptionText, unit === value && styles.unitOptionTextOn]}>
                {value.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
      </Card>

      <Text style={styles.sectionLabel}>Smallest Plate Increment</Text>
      <Text style={styles.helpText}>
        Used for barbell, machine, and cable steps and suggested targets, so
        they're always loadable. Dumbbells always step by a fixed 2.5kg pair
        jump, and you can always type an exact number if you need to.
      </Text>
      <Card>
        {PLATE_OPTIONS.map((value) => (
          <Pressable key={value} onPress={() => chooseIncrement(value)} style={styles.optionRow}>
            <Text style={styles.optionLabel}>{value}kg</Text>
            <View style={[styles.radio, increment === value && styles.radioOn]}>
              {increment === value && <View style={styles.radioDot} />}
            </View>
          </Pressable>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, padding: spacing.md },
  sectionLabel: { color: colors.muted, fontSize: 13, fontWeight: '700', textTransform: 'uppercase', marginBottom: spacing.xs },
  helpText: { color: colors.muted, fontSize: 13, marginBottom: spacing.md, lineHeight: 18 },
  unitRow: { flexDirection: 'row', gap: spacing.sm },
  unitOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  unitOptionOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  unitOptionText: { color: colors.text, fontWeight: '800' },
  unitOptionTextOn: { color: colors.bg },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  optionLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.accent },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.accent },
});
