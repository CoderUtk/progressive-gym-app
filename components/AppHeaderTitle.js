import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getProfile } from '../utils/storage';
import { colors } from '../utils/theme';

function formatToday() {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export default function AppHeaderTitle({ title }) {
  const [name, setName] = useState(null);

  useEffect(() => {
    getProfile().then((p) => setName(p?.name || null));
  }, []);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <Text style={styles.subtitle} numberOfLines={1}>
        {name ? `${name} · ` : ''}
        {formatToday()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', maxWidth: 220 },
  title: { color: colors.text, fontSize: 16, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 11, fontWeight: '600', marginTop: 1 },
});
