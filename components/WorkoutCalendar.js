import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { colors } from '../utils/theme';

const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const GAP = 4;

// Cell size is measured from the actual rendered container width (not a
// percentage), then used for every cell — this guarantees exactly 7 columns
// per row regardless of screen size.
export default function WorkoutCalendar({ workoutDates, onDayPress }) {
  const [containerWidth, setContainerWidth] = useState(0);
  const cellSize = containerWidth > 0 ? (containerWidth - GAP * 6) / 7 : 0;

  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10);
  const monthLabel = today.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  // getDay() is 0=Sunday..6=Saturday; shift so the grid starts on Monday.
  const offset = (startOfMonth.getDay() + 6) % 7;

  const cells = [];
  for (let i = 0; i < offset; i += 1) cells.push(null);
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), day);
    const key = date.toISOString().slice(0, 10);
    cells.push({ day, key, workedOut: workoutDates.includes(key), isToday: key === todayKey });
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <View>
      <Text style={styles.monthLabel}>{monthLabel}</Text>
      <View onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
        <View style={styles.headerRow}>
          {WEEKDAY_LABELS.map((label, i) => (
            <Text
              key={label}
              style={[styles.headerCell, { width: cellSize, marginRight: i === 6 ? 0 : GAP }]}
            >
              {label}
            </Text>
          ))}
        </View>
        {weeks.map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map((cell, ci) =>
              cell ? (
                <Pressable
                  key={cell.key}
                  onPress={() => onDayPress && onDayPress(cell.key)}
                  style={[
                    styles.cell,
                    { width: cellSize, height: cellSize, marginRight: ci === 6 ? 0 : GAP },
                    cell.workedOut ? styles.workedOutCell : styles.emptyCell,
                    cell.isToday && styles.todayCell,
                  ]}
                >
                  <Text style={[styles.dayText, cell.workedOut && styles.workedOutText, cell.isToday && !cell.workedOut && styles.todayText]}>
                    {cell.day}
                  </Text>
                </Pressable>
              ) : (
                <View
                  key={`empty-${wi}-${ci}`}
                  style={[styles.cell, styles.blankCell, { width: cellSize, height: cellSize, marginRight: ci === 6 ? 0 : GAP }]}
                />
              )
            )}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  monthLabel: { color: colors.muted, fontSize: 12, fontWeight: '700', marginBottom: 8, textTransform: 'uppercase' },
  headerRow: { flexDirection: 'row', marginBottom: 6 },
  headerCell: { textAlign: 'center', color: colors.muted, fontSize: 11, fontWeight: '700' },
  weekRow: { flexDirection: 'row', marginBottom: GAP },
  cell: {
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  blankCell: { borderWidth: 0, backgroundColor: 'transparent' },
  emptyCell: { backgroundColor: colors.card },
  workedOutCell: { backgroundColor: colors.accent, borderColor: colors.accent },
  todayCell: { borderColor: colors.accent, borderWidth: 2 },
  dayText: { color: colors.text, fontSize: 12, fontWeight: '700' },
  workedOutText: { color: colors.bg },
  todayText: { color: colors.accent, fontWeight: '900' },
});
