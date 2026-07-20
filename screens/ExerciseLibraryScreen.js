import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, FlatList, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Card, Pill } from '../components/UI';
import MuscleIcon from '../components/MuscleIcon';
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
        contentContainerStyle={{ padding: spacing.md, paddingTop: 0, paddingBottom: 40 }}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate('ExerciseHistory', { exerciseId: item.id })}>
            <Card style={{ marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.iconWrap}>
                <MuscleIcon equipment={item.equipment} size={26} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.exName} numberOfLines={2}>{item.name}</Text>
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
  filterScroll: { flexGrow: 0, marginBottom: spacing.sm, marginTop: 2 },
  filterRow: { gap: spacing.xs, paddingVertical: 6, paddingRight: spacing.md, alignItems: 'center' },
  exName: { color: colors.text, fontSize: 16, fontWeight: '700', lineHeight: 20 },
  exMeta: { color: colors.muted, fontSize: 13, marginTop: 2 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.cardAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  empty: { color: colors.muted, textAlign: 'center', marginTop: 40 },
});
