import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing } from '../utils/theme';
import { getProfile, getTemplates, setActiveTemplateId } from '../utils/storage';

export default function DailyPlanScreen() {
  const navigation = useNavigation();
  const [profile, setProfile] = useState(null);
  const [templates, setTemplates] = useState([]);

  useEffect(() => {
    async function load() {
      const profileData = await getProfile();
      const availableTemplates = await getTemplates();
      setProfile(profileData);
      setTemplates(availableTemplates);
    }
    load();
  }, []);

  async function pickTemplate(templateId) {
    const selectedTemplate = templates.find((item) => item.id === templateId);
    if (!selectedTemplate) return;

    await setActiveTemplateId(templateId);
    navigation.navigate('WorkoutLogger', { template: selectedTemplate });
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Today’s plan</Text>
      {profile ? (
        <Text style={styles.subtitle}>Hi {profile.name}, choose a workout for today.</Text>
      ) : null}

      {templates.map((template) => (
        <TouchableOpacity key={template.id} style={styles.card} onPress={() => pickTemplate(template.id)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>{template.name}</Text>
            <Text style={styles.cardMeta}>{template.exerciseIds.length} exercises</Text>
          </View>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, paddingTop: spacing.xl },
  title: { color: colors.text, fontSize: 28, fontWeight: '800', marginBottom: spacing.xs },
  subtitle: { color: colors.muted, fontSize: 15, marginBottom: spacing.lg },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', alignItems: 'center' },
  cardTitle: { color: colors.text, fontSize: 17, fontWeight: '700' },
  cardMeta: { color: colors.muted, fontSize: 12, marginTop: spacing.xs },
  chevron: { color: colors.muted, fontSize: 26, fontWeight: '700', marginLeft: spacing.sm },
});
