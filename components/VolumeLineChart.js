import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polyline, Circle, Line } from 'react-native-svg';
import { colors } from '../utils/theme';

const HEIGHT = 170;
const PAD_TOP = 16;
const PAD_BOTTOM = 8;
const PAD_SIDE = 12;

export default function VolumeLineChart({ points, labels }) {
  const [width, setWidth] = useState(0);
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const maxVal = Math.max(...points, 1);
  const n = points.length;

  const coords = points.map((val, i) => {
    const x = n > 1 ? PAD_SIDE + (i * (width - PAD_SIDE * 2)) / (n - 1) : width / 2;
    const y = PAD_TOP + (1 - val / maxVal) * plotHeight;
    return { x, y };
  });

  const polylinePoints = coords.map((c) => `${c.x},${c.y}`).join(' ');

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <Svg width={width} height={HEIGHT}>
          <Line
            x1={0}
            y1={HEIGHT - PAD_BOTTOM}
            x2={width}
            y2={HEIGHT - PAD_BOTTOM}
            stroke={colors.border}
            strokeWidth={1}
          />
          {n > 1 && (
            <Polyline
              points={polylinePoints}
              fill="none"
              stroke={colors.accent}
              strokeWidth={2.5}
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {coords.map((c, i) => (
            <Circle key={i} cx={c.x} cy={c.y} r={4} fill={colors.accent} />
          ))}
        </Svg>
      )}
      <View style={styles.labelRow}>
        {labels.map((label, i) => (
          <View key={i} style={styles.labelSlot}>
            <Text style={styles.labelText} numberOfLines={2}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: { flexDirection: 'row', marginTop: 6 },
  labelSlot: { flex: 1, alignItems: 'center' },
  labelText: { color: colors.muted, fontSize: 9, textAlign: 'center' },
});
