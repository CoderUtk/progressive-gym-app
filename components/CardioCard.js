import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing } from '../utils/theme';
import { computePace, formatDuration } from '../utils/setSchema';

const NUM_FONT = Platform.select({ ios: 'Menlo', android: 'monospace' });

// Full cardio input card. Owns duration MM/SS steppers with quick-add chips,
// a Distance ↔ Level primary-metric toggle, and a collapsible drawer for
// incline / calories / heart rate. Reads/writes a `current` object that the
// parent workout logger passes down; keeping the state up there means the
// pause/swap/finish flows don't have to sync a second source of truth.
export default function CardioCard({ current, setCurrent, sessionElapsedSec }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const durSec = Number(current.durationSec) || 0;
  const mins = Math.floor(durSec / 60);
  const secs = durSec % 60;

  function bumpDuration(deltaSec) {
    setCurrent((c) => ({ ...c, durationSec: Math.max(0, (Number(c.durationSec) || 0) + deltaSec) }));
  }

  function setMinutes(text) {
    const n = Math.max(0, parseInt(text || '0', 10) || 0);
    setCurrent((c) => ({ ...c, durationSec: n * 60 + secs }));
  }

  function setSeconds(text) {
    const n = Math.max(0, Math.min(59, parseInt(text || '0', 10) || 0));
    setCurrent((c) => ({ ...c, durationSec: mins * 60 + n }));
  }

  function grabElapsed() {
    if (!sessionElapsedSec) return;
    setCurrent((c) => ({ ...c, durationSec: sessionElapsedSec }));
  }

  const pace = computePace({
    durationSec: durSec,
    distance: Number(current.distance),
    distanceUnit: current.distanceUnit,
  });

  return (
    <View>
      {/* Duration */}
      <Text style={styles.sectionLabel}>Duration</Text>
      <View style={styles.durationRow}>
        <TextInput
          value={String(mins)}
          onChangeText={setMinutes}
          keyboardType="number-pad"
          style={styles.timeInput}
          maxLength={3}
          selectTextOnFocus
        />
        <Text style={styles.timeSep}>:</Text>
        <TextInput
          value={String(secs).padStart(2, '0')}
          onChangeText={setSeconds}
          keyboardType="number-pad"
          style={styles.timeInput}
          maxLength={2}
          selectTextOnFocus
        />
        <View style={styles.chipCol}>
          <View style={styles.chipRow}>
            {[1, 5, 10].map((m) => (
              <Pressable key={m} onPress={() => bumpDuration(m * 60)} style={styles.chip}>
                <Text style={styles.chipText}>+{m}m</Text>
              </Pressable>
            ))}
          </View>
          {sessionElapsedSec > 0 && (
            <Pressable onPress={grabElapsed} style={styles.grabChip} hitSlop={6}>
              <Feather name="clock" size={11} color={colors.accent} />
              <Text style={styles.grabChipText}>Use session {formatDuration(sessionElapsedSec)}</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Primary metric — Distance OR Level */}
      <View style={styles.modeToggle}>
        <ModeBtn
          label="Distance"
          active={current.primaryMode === 'distance'}
          onPress={() => setCurrent((c) => ({ ...c, primaryMode: 'distance' }))}
        />
        <ModeBtn
          label="Level"
          active={current.primaryMode === 'level'}
          onPress={() => setCurrent((c) => ({ ...c, primaryMode: 'level' }))}
        />
      </View>

      {current.primaryMode === 'level' ? (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Level / Resistance</Text>
          <TextInput
            value={String(current.level ?? '')}
            onChangeText={(v) => setCurrent((c) => ({ ...c, level: v.replace(/[^0-9]/g, '') }))}
            keyboardType="number-pad"
            style={styles.numInput}
            placeholder="1–20"
            placeholderTextColor={colors.mutedDim}
            maxLength={3}
          />
        </View>
      ) : (
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Distance</Text>
          <View style={styles.distanceRow}>
            <TextInput
              value={String(current.distance ?? '')}
              onChangeText={(v) => setCurrent((c) => ({ ...c, distance: v.replace(/[^0-9.]/g, '') }))}
              keyboardType="decimal-pad"
              style={[styles.numInput, { flex: 1 }]}
              placeholder="0.00"
              placeholderTextColor={colors.mutedDim}
              maxLength={7}
            />
            <View style={styles.unitToggle}>
              {['km', 'mi'].map((u) => (
                <Pressable
                  key={u}
                  onPress={() => setCurrent((c) => ({ ...c, distanceUnit: u }))}
                  style={[styles.unitBtn, current.distanceUnit === u && styles.unitBtnActive]}
                >
                  <Text style={[styles.unitBtnText, current.distanceUnit === u && styles.unitBtnTextActive]}>
                    {u}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
          {pace && (
            <Text style={styles.paceLine}>
              Pace: <Text style={styles.paceValue}>{pace}</Text>
            </Text>
          )}
        </View>
      )}

      {/* Collapsible drawer */}
      <Pressable onPress={() => setDrawerOpen((v) => !v)} style={styles.drawerToggle}>
        <Feather name={drawerOpen ? 'chevron-up' : 'chevron-down'} size={14} color={colors.muted} />
        <Text style={styles.drawerToggleText}>
          {drawerOpen ? 'Hide' : 'Add'} incline · calories · heart rate
        </Text>
      </Pressable>

      {drawerOpen && (
        <View style={styles.drawer}>
          <SmallField
            label="Incline %"
            value={current.incline}
            onChange={(v) => setCurrent((c) => ({ ...c, incline: v.replace(/[^0-9.]/g, '') }))}
          />
          <SmallField
            label="Calories"
            value={current.calories}
            onChange={(v) => setCurrent((c) => ({ ...c, calories: v.replace(/[^0-9]/g, '') }))}
          />
          <SmallField
            label="Avg HR (bpm)"
            value={current.heartRate}
            onChange={(v) => setCurrent((c) => ({ ...c, heartRate: v.replace(/[^0-9]/g, '') }))}
          />
        </View>
      )}
    </View>
  );
}

function ModeBtn({ label, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.modeBtn, active && styles.modeBtnActive]}>
      <Text style={[styles.modeBtnText, active && styles.modeBtnTextActive]}>{label}</Text>
    </Pressable>
  );
}

function SmallField({ label, value, onChange }) {
  return (
    <View style={styles.smallField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={String(value ?? '')}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        style={styles.numInput}
        placeholder="—"
        placeholderTextColor={colors.mutedDim}
        maxLength={5}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.4,
    marginBottom: spacing.xs,
    textTransform: 'uppercase',
  },
  durationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: spacing.md },
  timeInput: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    fontFamily: NUM_FONT,
    fontVariant: ['tabular-nums'],
    minWidth: 62,
    textAlign: 'center',
    borderBottomWidth: 2,
    borderBottomColor: colors.borderActive,
    paddingVertical: 2,
  },
  timeSep: { color: colors.text, fontSize: 24, fontWeight: '800' },
  chipCol: { flex: 1, marginLeft: spacing.sm },
  chipRow: { flexDirection: 'row', gap: 6 },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  chipText: { color: colors.muted, fontSize: 11, fontWeight: '800' },
  grabChip: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(62,224,158,0.35)',
  },
  grabChipText: { color: colors.accent, fontSize: 10, fontWeight: '700' },

  modeToggle: {
    flexDirection: 'row',
    backgroundColor: colors.bg,
    borderRadius: 10,
    padding: 3,
    marginBottom: spacing.sm,
  },
  modeBtn: { flex: 1, paddingVertical: 8, borderRadius: 7, alignItems: 'center' },
  modeBtnActive: { backgroundColor: colors.cardAlt },
  modeBtnText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  modeBtnTextActive: { color: colors.text },

  field: { marginBottom: spacing.md },
  fieldLabel: { color: colors.muted, fontSize: 11, fontWeight: '700', marginBottom: 4, letterSpacing: 0.5 },
  numInput: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
    fontFamily: NUM_FONT,
    fontVariant: ['tabular-nums'],
    backgroundColor: colors.bg,
    borderRadius: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
  },
  distanceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  unitToggle: { flexDirection: 'row', backgroundColor: colors.bg, borderRadius: 10, padding: 3 },
  unitBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  unitBtnActive: { backgroundColor: colors.cardAlt },
  unitBtnText: { color: colors.muted, fontSize: 12, fontWeight: '700' },
  unitBtnTextActive: { color: colors.accent },
  paceLine: { color: colors.muted, fontSize: 12, marginTop: 6, fontWeight: '600' },
  paceValue: { color: colors.accent, fontWeight: '800', fontFamily: NUM_FONT },

  drawerToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingVertical: 6,
  },
  drawerToggleText: { color: colors.muted, fontSize: 11, fontWeight: '700' },
  drawer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  smallField: { flex: 1 },
});
