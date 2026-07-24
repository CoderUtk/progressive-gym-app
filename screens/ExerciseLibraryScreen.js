import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, TextInput, FlatList, Pressable, ScrollView, StyleSheet, Platform, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { Card, Pill } from '../components/UI';
import MuscleIcon from '../components/MuscleIcon';
import AddExerciseModal from '../components/AddExerciseModal';
import { colors, spacing, muscleTint } from '../utils/theme';
import {
  MUSCLE_GROUPS,
  searchExercises,
  isBuiltInExercise,
  hideExerciseInMemory,
  deleteCustomExerciseInMemory,
} from '../data/exercises';
import { hideExerciseStored, deleteCustomExerciseStored } from '../utils/storage';

// Destructive-action confirm that works on both native (Alert) and web
// (react-native-web's Alert is a no-op, so fall back to window.confirm).
function confirmDelete(name, onConfirm) {
  const msg = `Remove "${name}" from your library? Past workouts that used it are kept.`;
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(msg)) onConfirm();
    return;
  }
  Alert.alert('Delete exercise', msg, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

export default function ExerciseLibraryScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  // Bumped whenever a custom exercise is added or on focus, so the useMemo
  // below re-runs and picks up the freshly-added entry.
  const [tick, setTick] = useState(0);

  useFocusEffect(useCallback(() => setTick((t) => t + 1), []));

  // Deleting a built-in hides it (id recorded in storage, filtered from the
  // catalog); deleting a custom removes it outright. Both update the in-memory
  // list immediately so the row disappears without a reload.
  function handleDelete(item) {
    confirmDelete(item.name, async () => {
      if (isBuiltInExercise(item.id)) {
        hideExerciseInMemory(item.id);
        await hideExerciseStored(item.id);
      } else {
        deleteCustomExerciseInMemory(item.id);
        await deleteCustomExerciseStored(item.id);
      }
      setTick((t) => t + 1);
    });
  }

  const results = useMemo(() => {
    let list = searchExercises(query);
    if (muscleFilter) list = list.filter((e) => e.muscle === muscleFilter);
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, muscleFilter, tick]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search by name, muscle, or equipment (e.g. 'rope')"
        placeholderTextColor={colors.muted}
        value={query}
        onChangeText={setQuery}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterRow}
      >
        {MUSCLE_GROUPS.map((item) => (
          <Pressable key={item} onPress={() => setMuscleFilter(muscleFilter === item ? null : item)}>
            <Pill label={item} tone={muscleFilter === item ? 'accent' : 'default'} />
          </Pressable>
        ))}
      </ScrollView>

      <FlatList
        data={results}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ padding: spacing.md, paddingTop: 0, paddingBottom: 100 }}
        renderItem={({ item }) => {
          const tint = muscleTint(item.muscle);
          return (
            <Card style={{ marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' }}>
              <Pressable
                style={styles.rowContent}
                onPress={() => navigation.navigate('ExerciseHistory', { exerciseId: item.id })}
              >
                <View style={[styles.iconWrap, { backgroundColor: tint + '22', borderColor: tint + '55' }]}>
                  <MuscleIcon equipment={item.equipment} muscle={item.muscle} size={26} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={styles.exName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.exMeta}>
                    {item.muscle} · {item.equipment}
                    {item.custom ? '  · Custom' : ''}
                  </Text>
                </View>
              </Pressable>
              <Pressable
                onPress={() => handleDelete(item)}
                hitSlop={10}
                style={styles.deleteBtn}
                accessibilityLabel={`Delete ${item.name}`}
              >
                <Feather name="trash-2" size={18} color={colors.mutedDim} />
              </Pressable>
            </Card>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.empty}>No exercises match "{query}"</Text>
        }
        ListFooterComponent={
          <Pressable onPress={() => setAddOpen(true)} style={styles.addRow}>
            <Feather name="plus" size={18} color={colors.accent} />
            <Text style={styles.addText}>Add Custom Exercise</Text>
          </Pressable>
        }
      />

      <AddExerciseModal
        visible={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={() => setTick((t) => t + 1)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  search: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  filterScroll: { flexGrow: 0, flexShrink: 0, marginBottom: spacing.sm, marginTop: 2, minHeight: 44 },
  filterRow: { gap: spacing.xs, paddingVertical: 10, paddingRight: spacing.md, alignItems: 'center' },
  rowContent: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center' },
  deleteBtn: { paddingLeft: spacing.sm, paddingVertical: spacing.xs },
  exName: { color: colors.text, fontSize: 16, fontWeight: '700', lineHeight: 20 },
  exMeta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  addText: { color: colors.accent, fontSize: 14, fontWeight: '700' },
});
