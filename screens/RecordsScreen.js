import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card } from '../components/UI';
import { colors, spacing, fonts } from '../utils/theme';
import { getWorkouts, getWeightUnit, getProfile } from '../utils/storage';
import { formatVolume, formatWeight } from '../utils/units';
import { computeRecords } from '../utils/records';

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatDurationMin(seconds) {
  if (!seconds || !Number.isFinite(seconds)) return '—';
  const min = Math.round(seconds / 60);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}h ${m}m`;
}

function formatRecordValue(row, unit) {
  if (row.value == null || !Number.isFinite(row.value)) return '—';
  if (row.format === 'volume') return formatVolume(row.value, unit);
  if (row.format === 'duration') return formatDurationMin(row.value);
  return `${row.value.toLocaleString()} ${row.unit || ''}`.trim();
}

export default function RecordsScreen({ navigation }) {
  const [sections, setSections] = useState([]);
  const [unit, setUnit] = useState('kg');
  const [empty, setEmpty] = useState(false);

  useFocusEffect(
    useCallback(() => {
      Promise.all([getWorkouts(), getWeightUnit(), getProfile()]).then(
        ([workouts, weightUnit, profile]) => {
          const bw = profile?.weight || 70;
          const { sections } = computeRecords(workouts, bw);
          setSections(sections);
          setUnit(weightUnit);
          setEmpty(!workouts || workouts.length === 0);
        }
      );
    }, [])
  );

  if (empty) {
    return (
      <View style={styles.centerWrap}>
        <Text style={styles.emptyText}>Log a few workouts to unlock records.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: spacing.md, paddingBottom: 40 }}>
      <Text style={styles.helpText}>
        Beyond just "heaviest weight" — the biggest workouts, longest weeks,
        and densest sessions you've ever logged.
      </Text>

      {sections.map((section) => (
        <View key={section.title} style={{ marginBottom: spacing.md }}>
          <Text style={styles.sectionLabel}>{section.title}</Text>
          <Card>
            {section.rows.map((row, idx) => (
              <Pressable
                key={row.id}
                onPress={() => {
                  if (row.sourceWorkout?.date) {
                    navigation.navigate('DayWorkout', { date: row.sourceWorkout.date });
                  }
                }}
                style={[styles.row, idx < section.rows.length - 1 && styles.rowBorder]}
              >
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.rowLabel} numberOfLines={2}>{row.label}</Text>
                  {row.date ? (
                    <Text style={styles.rowDate}>{formatDate(row.date)}</Text>
                  ) : null}
                </View>
                <Text style={styles.rowValue}>{formatRecordValue(row, unit)}</Text>
              </Pressable>
            ))}
          </Card>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  centerWrap: { flex: 1, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  emptyText: { color: colors.muted, fontFamily: fonts.body, fontSize: 14, textAlign: 'center' },
  helpText: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 18, marginBottom: spacing.md },
  sectionLabel: {
    color: colors.muted,
    fontFamily: fonts.bodySemi,
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 1.4,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  rowLabel: { color: colors.text, fontFamily: fonts.bodySemi, fontSize: 14, lineHeight: 18 },
  rowDate: { color: colors.mutedDim, fontFamily: fonts.body, fontSize: 11, marginTop: 2 },
  rowValue: { color: colors.accent, fontFamily: fonts.displaySemi, fontSize: 22, includeFontPadding: false, fontVariant: ['tabular-nums'] },
});
