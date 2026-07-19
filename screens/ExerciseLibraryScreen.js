import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, StyleSheet } from 'react-native';
import { Card, Pill } from '../components/UI';
import { colors, spacing } from '../utils/theme';
import { EXERCISES, MUSCLE_GROUPS, searchExercises } from '../data/exercises';

export default function ExerciseLibraryScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [muscleFilter, setMuscleFilter] = useState(null);

  const results = useMemo(() => {
    let list = searchExercises(query);
    if (muscleFilter) list = list.filter((e) => e.muscle === muscleFilter);
    return list;
  }, [query, muscleFilter]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.search}
        placeholder="Search by name, muscle, or equipment (e.g. 'rope')"
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
        contentContainerStyle={{ padding: spacing.md, paddingTop: 0, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate('ExerciseHistory', { exerciseId: item.id })}>
            <Card style={{ marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 28, marginRight: spacing.md }}>{item.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.exName}>{item.name}</Text>
                <Text style={styles.exMeta}>{item.muscle} · {item.equipment}</Text>
              </View>
            </Card>
          </Pressable>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>No exercises match "{query}"</Text>
        }
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
  exName: { color: colors.text, fontSize: 16, fontWeight: '700' },
  exMeta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
});
