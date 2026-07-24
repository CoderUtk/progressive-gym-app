import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing } from '../utils/theme';

// GitHub-style contribution grid: 26 weeks × 7 rows, one cell per day.
// Cells tint proportionally to how many working sets were logged that day —
// nothing (bg), light, medium, dark accent. Tap a cell to jump to that
// day's workout details.

const GAP = 3;

function intensity(sets) {
  // Bucket set counts to 4 tint levels. Chosen to feel like reasonable
  // effort thresholds: >0 = light, >5 = medium, >15 = dark.
  if (!sets) return 0;
  if (sets >= 15) return 3;
  if (sets >= 5) return 2;
  return 1;
}

const TINT_BY_LEVEL = [
  colors.card,          // 0 — empty
  'rgba(62,224,158,0.20)',
  'rgba(62,224,158,0.50)',
  colors.accent,        // 3 — max
];

export default function StreakGrid({ grid, onDayPress }) {
  const [containerWidth, setContainerWidth] = useState(0);
  const cols = grid.length;
  const totalGap = GAP * (cols - 1);
  // Cell size derived from available width so the grid always fits the screen.
  const cellSize = containerWidth > 0
    ? Math.max(8, Math.floor((containerWidth - totalGap) / cols))
    : 0;

  return (
    <View>
      <View onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
        {cellSize > 0 && (
          <View style={{ flexDirection: 'row' }}>
            {grid.map((col, ci) => (
              <View key={ci} style={{ marginRight: ci === cols - 1 ? 0 : GAP }}>
                {col.map((cell) => {
                  const level = intensity(cell.sets);
                  const bg = TINT_BY_LEVEL[level];
                  const showToday = cell.isToday;
                  return (
                    <Pressable
                      key={cell.key}
                      onPress={() =>
                        !cell.isFuture && cell.sets > 0 && onDayPress?.(cell.key)
                      }
                      style={[
                        styles.cell,
                        {
                          width: cellSize,
                          height: cellSize,
                          backgroundColor: cell.isFuture ? 'transparent' : bg,
                        },
                        showToday && styles.today,
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.legend}>
        <Text style={styles.legendLabel}>Less</Text>
        {TINT_BY_LEVEL.map((c, i) => (
          <View
            key={i}
            style={[
              styles.legendCell,
              { backgroundColor: c, marginLeft: 4 },
            ]}
          />
        ))}
        <Text style={[styles.legendLabel, { marginLeft: 6 }]}>More</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cell: {
    borderRadius: 3,
    marginBottom: GAP,
  },
  today: {
    borderWidth: 1,
    borderColor: colors.accent,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  legendLabel: { color: colors.mutedDim, fontSize: 10, fontWeight: '700' },
  legendCell: { width: 12, height: 12, borderRadius: 3 },
});
