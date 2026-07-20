import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Card, Pill, PrimaryButton } from '../components/UI';
import { colors, spacing } from '../utils/theme';
import { getExerciseById } from '../data/exercises';
import {
  getTemplates,
  saveTemplate,
  deleteTemplate,
  setActiveTemplateId,
  DEFAULT_TEMPLATES,
} from '../utils/storage';

export default function TemplateSelectScreen({ route, navigation }) {
  const { activeTemplateId } = route.params || {};
  const [templates, setTemplates] = useState([]);

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
      title: 'New Workout',
      initialSelectedIds: [],
      onDone: async (ids) => {
        if (ids.length === 0) return;
        const id = `custom-${Date.now()}`;
        const template = { id, name: 'Custom Workout', exerciseIds: ids };
        await saveTemplate(template);
        load();
      },
    });
  }

  function removeTemplate(template) {
    deleteTemplate(template.id).then(load);
  }

  // Destructive "Delete" now lives behind a "•••" context menu instead of
  // sitting next to "Edit", so it can't be tapped by accident.
  function openMenu(template) {
    const isBuiltIn = DEFAULT_TEMPLATES.some((d) => d.id === template.id);
    const buttons = [
      { text: 'Edit', onPress: () => editTemplate(template) },
    ];
    if (isBuiltIn) {
      buttons.push({ text: 'Delete (unavailable for built-in)', onPress: () => {} });
    } else {
      buttons.push({
        text: 'Delete',
        style: 'destructive',
        onPress: () =>
          Alert.alert('Delete Template', `Remove "${template.name}"? This can't be undone.`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Delete', style: 'destructive', onPress: () => removeTemplate(template) },
          ]),
      });
    }
    buttons.push({ text: 'Cancel', style: 'cancel' });
    Alert.alert(template.name, 'Choose an action', buttons);
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
            <Card style={[styles.card, isActive && { borderColor: colors.accent }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.exList}>
                    {item.exerciseIds.map((id) => getExerciseById(id)?.name).filter(Boolean).join(' · ') || 'No exercises yet'}
                  </Text>
                </View>
                {isActive && <Pill label="TODAY" tone="accent" />}
              </View>
              <View style={styles.actionsRow}>
                <Pressable style={styles.menuBtn} onPress={() => openMenu(item)}>
                  <Text style={styles.menuBtnText}>•••</Text>
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
        <PrimaryButton title="+ Create Custom Workout" onPress={createCustom} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  card: { marginBottom: spacing.sm },
  name: { color: colors.text, fontSize: 17, fontWeight: '800', marginBottom: 4 },
  exList: { color: colors.muted, fontSize: 13 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  menuBtn: {
    width: 40,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuBtnText: { color: colors.muted, fontWeight: '900', fontSize: 16, letterSpacing: 1 },
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
  useBtnText: { color: colors.bg, fontWeight: '800', fontSize: 13 },
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
