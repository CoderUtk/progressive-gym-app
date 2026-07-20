import React from 'react';
import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { spacing } from '../utils/theme';

// Design tokens per spec — kept literal here rather than pulled from the
// shared theme so this modal's exact look is locked regardless of future
// theme tweaks.
const MODAL_BG = '#151A21';
const MODAL_BORDER = 'rgba(255, 255, 255, 0.1)';
const TEXT_PRIMARY = '#FFFFFF';
const PR_HIGHLIGHT = '#3EE09E';

export default function PRModal({ visible, isPR, lines, onDone, onShare }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <View style={styles.backdropTint}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.centerWrap}>
          <View style={styles.card}>
            <Text style={styles.emoji}>{isPR ? '🎉' : '✅'}</Text>
            <Text style={styles.title}>{isPR ? 'New Personal Records!' : 'Workout Saved'}</Text>
            {isPR ? (
              <View style={styles.linesWrap}>
                {lines.map((line, i) => (
                  <Text key={i} style={styles.prLine}>{line}</Text>
                ))}
              </View>
            ) : (
              <Text style={styles.bodyText}>Great work — see you next time.</Text>
            )}
            {onShare && (
              <Pressable style={styles.shareBtn} onPress={onShare}>
                <Text style={styles.shareBtnText}>Share Summary</Text>
              </Pressable>
            )}
            <Pressable style={styles.doneBtn} onPress={onDone}>
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdropTint: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: MODAL_BG,
    borderWidth: 1,
    borderColor: MODAL_BORDER,
    borderRadius: 16,
    padding: spacing.lg,
    alignItems: 'center',
  },
  emoji: { fontSize: 36, marginBottom: spacing.sm },
  title: { color: TEXT_PRIMARY, fontSize: 19, fontWeight: '800', marginBottom: spacing.sm, textAlign: 'center' },
  linesWrap: { width: '100%', marginTop: spacing.xs },
  prLine: { color: PR_HIGHLIGHT, fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: spacing.xs },
  bodyText: { color: TEXT_PRIMARY, fontSize: 14, textAlign: 'center', opacity: 0.85 },
  shareBtn: {
    width: '100%',
    marginTop: spacing.lg,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: PR_HIGHLIGHT,
    alignItems: 'center',
  },
  shareBtnText: { color: '#0B0E11', fontWeight: '800', fontSize: 15 },
  doneBtn: {
    width: '100%',
    marginTop: spacing.sm,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
  },
  doneBtnText: { color: TEXT_PRIMARY, fontWeight: '700', fontSize: 15 },
});
