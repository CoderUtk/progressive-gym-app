import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Card } from '../components/UI';
import { colors, spacing } from '../utils/theme';
import { getWeightUnit, setWeightUnit } from '../utils/storage';

export default function SettingsScreen() {
  const [unit, setUnit] = useState('kg');

  useEffect(() => {
    getWeightUnit().then(setUnit);
  }, []);

  async function chooseUnit(value) {
    setUnit(value);
    await setWeightUnit(value);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.sectionLabel}>Weight Unit</Text>
      <Text style={styles.helpText}>
        Applies everywhere in the app — Dashboard, Workout Logger, Exercise
        History, Profile, and Analytics. Weight steps by 1 either way.
      </Text>
      <Card>
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
});
