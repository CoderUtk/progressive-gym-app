import React, { useCallback, useState } from 'react';
import { View, Text, TextInput, Modal, FlatList, Pressable, StyleSheet, Alert, Platform } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Card, Pill, PrimaryButton } from '../components/UI';
import { colors, spacing, fonts } from '../utils/theme';
import { getExerciseById } from '../data/exercises';
import {
  getTemplates,
  saveTemplate,
  deleteTemplate,
  setActiveTemplateId,
  toggleTemplateDay,
} from '../utils/storage';

// Weekday chips shown Monday-first, but stored as JS getDay() values
// (0 = Sun … 6 = Sat) so scheduling checks match new Date().getDay() directly.
const WEEK_DAYS = [
  { v: 1, l: 'M' },
  { v: 2, l: 'T' },
  { v: 3, l: 'W' },
  { v: 4, l: 'T' },
  { v: 5, l: 'F' },
  { v: 6, l: 'S' },
  { v: 0, l: 'S' },
];

export default function TemplateSelectScreen({ route, navigation }) {
  const { activeTemplateId } = route.params || {};
  const [templates, setTemplates] = useState([]);
  const [renaming, setRenaming] = useState(null); // { template, draft }

  const load = useCallback(() => {
    getTemplates().then(setTemplates);
  }, []);

  useFocusEffect(load);

  function useToday(template) {
    setActiveTemplateId(template.id);
    navigation.navigate('WorkoutLogger', { template });
  }

  function editTemplate(template) {
    navigation.navigate('ExercisePicker', {
      title: `Edit ${template.name}`,
      initialSelectedIds: template.exerciseIds,
      onDone: async (ids) => {
        await saveTemplate({ ...template, exerciseIds: ids });
        load();
      },
    });
  }

  function createCustom() {
    navigation.navigate('ExercisePicker', {
      title: 'New Routine',
      initialSelectedIds: [],
      onDone: async (ids) => {
        if (ids.length === 0) return;
        const id = `custom-${Date.now()}`;
        // Auto-name so nothing is ever untitled — user can rename immediately
        // from the ••• menu on the resulting card.
        const nextIndex =
          templates.filter((t) => t.id.startsWith('custom-')).length + 1;
        const template = { id, name: `My Routine ${nextIndex}`, exerciseIds: ids };
        await saveTemplate(template);
        load();
        // Drop straight into rename so the auto-name can be replaced immediately.
        setRenaming({ template, draft: template.name });
      },
    });
  }

  function startRename(template) {
    setRenaming({ template, draft: template.name });
  }

  async function commitRename() {
    const name = (renaming?.draft || '').trim();
    if (!renaming || !name) {
      setRenaming(null);
      return;
    }
    await saveTemplate({ ...renaming.template, name });
    setRenaming(null);
    load();
  }

  function removeTemplate(template) {
    deleteTemplate(template.id).then(load);
  }

  // Pin/unpin a weekday. One-per-day: claiming a day another routine holds
  // moves it here, so the list can shift for two cards at once — reload all.
  function handleToggleDay(template, day) {
    toggleTemplateDay(template.id, day).then(setTemplates);
  }

  // Cross-platform info toast: Alert on native, window.alert on web (RNW's
  // Alert is a no-op).
  function notify(title, message) {
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') window.alert(`${title}\n\n${message}`);
      return;
    }
    Alert.alert(title, message);
  }

  // Cross-platform destructive confirm: Alert on native, window.confirm on web.
  // Built-in and custom routines can both be deleted now, but at least one
  // workout must always remain in the library — block the last deletion.
  function confirmTemplateDelete(template) {
    if (templates.length <= 1) {
      notify('Keep at least one workout', 'You need at least one workout in your library.');
      return;
    }
    const msg = `Remove "${template.name}"? This can't be undone.`;
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm(msg)) removeTemplate(template);
      return;
    }
    Alert.alert('Delete workout', msg, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => removeTemplate(template) },
    ]);
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={templates}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
        renderItem={({ item }) => {
          const isActive = item.id === activeTemplateId;
          return (
            <Card style={styles.card} active={isActive}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  {/* Tap the title to rename inline. */}
                  <Pressable
                    onPress={() => startRename(item)}
                    style={styles.nameRow}
                    accessibilityRole="button"
                    accessibilityLabel={`Rename ${item.name}`}
                  >
                    <Text style={styles.name} numberOfLines={2}>{item.name}</Text>
                    <Feather name="edit-2" size={13} color={colors.mutedDim} style={styles.nameEditIcon} />
                  </Pressable>
                  <Text style={styles.exList}>
                    {item.exerciseIds.map((id) => getExerciseById(id)?.name).filter(Boolean).join(' · ') || 'No exercises yet'}
                  </Text>
                </View>
                {isActive && <Pill label="TODAY" tone="accent" />}
              </View>

              <Text style={styles.scheduleLabel}>Schedule</Text>
              <View style={styles.dayRow}>
                {WEEK_DAYS.map((d) => {
                  const on = (item.days || []).includes(d.v);
                  return (
                    <Pressable
                      key={d.v}
                      onPress={() => handleToggleDay(item, d.v)}
                      style={[styles.dayChip, on && styles.dayChipOn]}
                      accessibilityLabel={`Toggle ${item.name} on weekday ${d.v}`}
                    >
                      <Text style={[styles.dayChipText, on && styles.dayChipTextOn]}>{d.l}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.actionsRow}>
                <Pressable
                  style={styles.smallBtn}
                  onPress={() => editTemplate(item)}
                  accessibilityLabel={`Edit exercises in ${item.name}`}
                >
                  <Feather name="edit-3" size={14} color={colors.text} />
                  <Text style={styles.smallBtnText}>Edit</Text>
                </Pressable>
                <Pressable
                  style={[styles.smallBtn, styles.smallBtnDanger]}
                  onPress={() => confirmTemplateDelete(item)}
                  accessibilityLabel={`Delete ${item.name}`}
                >
                  <Feather name="trash-2" size={14} color={colors.danger} />
                  <Text style={[styles.smallBtnText, styles.smallBtnTextDanger]}>Delete</Text>
                </Pressable>
                <Pressable
                  style={[styles.useBtn, isActive && styles.useBtnActive]}
                  onPress={() => useToday(item)}
                >
                  <Text style={[styles.useBtnText, isActive && styles.useBtnTextActive]}>
                    {isActive ? 'Resume' : 'Use Today'}
                  </Text>
                </Pressable>
              </View>
            </Card>
          );
        }}
      />
      <View style={styles.footer}>
        <PrimaryButton title="+ Create New Routine" onPress={createCustom} />
      </View>

      <Modal visible={!!renaming} transparent animationType="fade" onRequestClose={() => setRenaming(null)}>
        <View style={styles.renameBackdrop}>
          <View style={styles.renameCard}>
            <Text style={styles.renameTitle}>Rename routine</Text>
            <TextInput
              value={renaming?.draft || ''}
              onChangeText={(v) => setRenaming((r) => (r ? { ...r, draft: v } : r))}
              placeholder="e.g. Upper Body"
              placeholderTextColor={colors.mutedDim}
              style={styles.renameInput}
              maxLength={40}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={commitRename}
            />
            <View style={styles.renameActions}>
              <Pressable onPress={() => setRenaming(null)} style={styles.renameCancel}>
                <Text style={styles.renameCancelText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={commitRename} style={styles.renameSave}>
                <Text style={styles.renameSaveText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  card: { marginBottom: spacing.sm },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  name: { color: colors.text, fontFamily: fonts.display, fontSize: 24, marginBottom: 4, lineHeight: 26, includeFontPadding: false },
  nameEditIcon: { marginBottom: 4 },
  renameBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  renameCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: '#151A21',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: spacing.lg,
  },
  renameTitle: { color: colors.text, fontSize: 15, fontWeight: '800', marginBottom: spacing.sm },
  renameInput: {
    backgroundColor: colors.bg,
    color: colors.text,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.borderActive,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 15,
    fontWeight: '600',
  },
  renameActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.md },
  renameCancel: { paddingVertical: 10, paddingHorizontal: 14 },
  renameCancelText: { color: colors.muted, fontWeight: '700' },
  renameSave: {
    backgroundColor: colors.accent, paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10,
  },
  renameSaveText: { color: colors.ctaText, fontWeight: '800' },
  exList: { color: colors.muted, fontFamily: fonts.body, fontSize: 13, lineHeight: 18 },
  scheduleLabel: {
    color: colors.mutedDim,
    fontFamily: fonts.bodySemi,
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  dayRow: { flexDirection: 'row', gap: spacing.xs },
  dayChip: {
    flex: 1,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  dayChipText: { color: colors.muted, fontFamily: fonts.bodyBold, fontSize: 13 },
  dayChipTextOn: { color: colors.ctaText },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginTop: spacing.md },
  smallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 36,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  smallBtnDanger: { borderColor: 'rgba(248,113,113,0.4)' },
  smallBtnText: { color: colors.text, fontFamily: fonts.bodySemi, fontSize: 13 },
  smallBtnTextDanger: { color: colors.danger },
  useBtn: {
    flex: 1,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  useBtnActive: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  useBtnText: { color: colors.bg, fontFamily: fonts.bodyBold, fontSize: 13 },
  useBtnTextActive: { color: colors.accent },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
});
