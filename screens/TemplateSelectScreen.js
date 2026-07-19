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

// route.params:
//   activeTemplateId: string
//   onSelect: (template) => void   -- called when user picks a template to use today
export default function TemplateSelectScreen({ route, navigation }) {
  const { activeTemplateId, onSelect } = route.params;
  const [templates, setTemplates] = useState([]);

  const load = useCallback(() => {
    getTemplates().then(setTemplates);
  }, []);

  useFocusEffect(load);

  function useToday(template) {
    setActiveTemplateId(template.id);
    onSelect(template);
    navigation.goBack();
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
    const isBuiltIn = DEFAULT_TEMPLATES.some((d) => d.id === template.id);
    if (isBuiltIn) {
      Alert.alert('Can\'t delete', 'Built-in templates can be edited but not deleted.');
      return;
    }
    Alert.alert('Delete Template', `Remove "${template.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTemplate(template.id).then(load) },
    ]);
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={templates}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: spacing.md, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <Card style={[styles.card, item.id === activeTemplateId && { borderColor: colors.accent }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.exList}>
                  {item.exerciseIds.map((id) => getExerciseById(id)?.name).filter(Boolean).join(' · ') || 'No exercises yet'}
                </Text>
              </View>
              {item.id === activeTemplateId && <Pill label="TODAY" tone="accent" />}
            </View>
            <View style={styles.actionsRow}>
              <Pressable style={styles.actionBtn} onPress={() => editTemplate(item)}>
                <Text style={styles.actionText}>Edit</Text>
              </Pressable>
              <Pressable style={styles.actionBtn} onPress={() => removeTemplate(item)}>
                <Text style={[styles.actionText, { color: colors.danger }]}>Delete</Text>
              </Pressable>
              <Pressable style={[styles.actionBtn, styles.useBtn]} onPress={() => useToday(item)}>
                <Text style={[styles.actionText, { color: colors.bg, fontWeight: '800' }]}>Use Today</Text>
              </Pressable>
            </View>
          </Card>
        )}
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
  actionsRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.md },
  actionBtn: { paddingVertical: 8, paddingHorizontal: spacing.sm },
  actionText: { color: colors.text, fontWeight: '700', fontSize: 13 },
  useBtn: { backgroundColor: colors.accent, borderRadius: 10, marginLeft: 'auto' },
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
