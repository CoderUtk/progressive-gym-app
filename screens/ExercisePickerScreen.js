import React, { useLayoutEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet } from 'react-native';
import { Card, Pill, PrimaryButton } from '../components/UI';
import MuscleIcon from '../components/MuscleIcon';
import { colors, spacing } from '../utils/theme';
import { MUSCLE_GROUPS, searchExercises } from '../data/exercises';

// route.params:
//   initialSelectedIds: string[]
//   title: string (optional)
//   onDone: (ids: string[]) => void            -- multi-select save
//   mode: 'single'  (optional)                 -- tap immediately returns via onPick
//   onPick: (id: string) => void               -- single-select handler
//   preferMuscle: string (optional)            -- preselect this filter for swap flow
//   excludeIds: string[] (optional)            -- hide these from the picker
export default function ExercisePickerScreen({ route, navigation }) {
  const {
    initialSelectedIds = [],
    title = 'Select Exercises',
    onDone,
    mode,
    onPick,
    preferMuscle = null,
    excludeIds = [],
  } = route.params;
  const [selected, setSelected] = useState(new Set(initialSelectedIds));
  const [query, setQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState(preferMuscle);

  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [title]);

  const results = useMemo(() => {
    let list = searchExercises(query);
    if (muscleFilter) list = list.filter((e) => e.muscle === muscleFilter);
    if (excludeIds.length) list = list.filter((e) => !excludeIds.includes(e.id));
    return list;
  }, [query, muscleFilter, excludeIds]);

  function toggle(id) {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function save() {
    onDone(Array.from(selected));
    navigation.goBack();
  }

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search exercises…"
        placeholderTextColor={colors.muted}
        value={query}
        onChangeText={setQuery}
      />

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={MUSCLE_GROUPS}
        keyExtractor={(m) => m}
        style={{ flexGrow: 0, marginBottom: spacing.sm }}
        contentContainerStyle={{ gap: spacing.xs, paddingVertical: spacing.xs }}
        renderItem={({ item }) => (
          <Pressable onPress={() => setMuscleFilter(muscleFilter === item ? null : item)}>
            <Pill label={item} tone={muscleFilter === item ? 'accent' : 'default'} />
          </Pressable>
        )}
      />

      <FlatList
        data={results}
        keyExtractor={(e) => e.id}
        contentContainerStyle={{ paddingBottom: 120 }}
        renderItem={({ item }) => {
          const isSelected = selected.has(item.id);
          const handlePress = () => {
            if (mode === 'single') {
              onPick && onPick(item.id);
              navigation.goBack();
              return;
            }
            toggle(item.id);
          };
          return (
            <Pressable onPress={handlePress}>
              <Card
                style={[
                  styles.row,
                  isSelected && { borderColor: colors.accent, backgroundColor: colors.cardAlt },
                ]}
              >
                <View style={styles.iconWrap}>
                  <MuscleIcon equipment={item.equipment} muscle={item.muscle} size={22} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exName}>{item.name}</Text>
                  <Text style={styles.exMeta}>{item.muscle} · {item.equipment}</Text>
                </View>
                <View style={[styles.checkbox, isSelected && styles.checkboxOn]}>
                  {isSelected && <Text style={styles.checkmark}>✓</Text>}
                </View>
              </Card>
            </Pressable>
          );
        }}
      />

      {mode !== 'single' && (
        <View style={styles.footer}>
          <PrimaryButton title={`Save (${selected.size} selected)`} onPress={save} />
        </View>
      )}
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
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  exName: { color: colors.text, fontSize: 15, fontWeight: '700' },
  exMeta: { color: colors.muted, fontSize: 12, marginTop: 2 },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkmark: { color: colors.bg, fontWeight: '900' },
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
