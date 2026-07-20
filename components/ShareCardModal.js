import React, { useRef, useState } from 'react';
import { Modal, View, Text, Pressable, StyleSheet, ActivityIndicator, Platform, Alert, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import ShareCard from './ShareCard';
import { PrimaryButton } from './UI';
import { colors, spacing } from '../utils/theme';

// Modal that previews the ShareCard and hands the captured PNG to the OS
// share sheet. Web falls back to a download link since expo-sharing has no
// browser share sheet parity.
export default function ShareCardModal({ visible, onClose, profile, session, unit, prCount, topPR }) {
  const shotRef = useRef(null);
  const [busy, setBusy] = useState(false);

  // Scale the card down to fit inside the modal (keeps the 9:16 ratio) but
  // capture at whatever pixel size the renderer produces — on a 3x device
  // that lands very close to the 1080×1920 target.
  const screenW = Dimensions.get('window').width;
  const previewWidth = Math.min(screenW - spacing.lg * 2, 320);

  async function handleShare() {
    if (!shotRef.current) return;
    setBusy(true);
    try {
      const uri = await shotRef.current.capture();
      if (Platform.OS === 'web') {
        // On web, expo-sharing is a no-op. Open the data URI so the user can
        // right-click / save it manually — honest about the platform limit.
        const w = window.open();
        if (w) {
          w.document.write(`<img src="${uri}" style="max-width:100%;display:block;margin:24px auto;background:#0B0E11" />`);
        }
      } else {
        const available = await Sharing.isAvailableAsync();
        if (!available) {
          Alert.alert('Share unavailable', 'Sharing is not available on this device.');
        } else {
          await Sharing.shareAsync(uri, {
            mimeType: 'image/png',
            dialogTitle: 'Share your workout',
          });
        }
      }
    } catch (e) {
      Alert.alert('Could not share', String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <Text style={styles.title}>Share Summary</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Feather name="x" size={20} color={colors.text} />
            </Pressable>
          </View>

          <View style={styles.previewWrap}>
            <ViewShot
              ref={shotRef}
              options={{ format: 'png', quality: 1, result: 'tmpfile' }}
            >
              <ShareCard
                profile={profile}
                session={session}
                unit={unit}
                prCount={prCount}
                topPR={topPR}
                width={previewWidth}
              />
            </ViewShot>
          </View>

          <PrimaryButton
            title={busy ? 'Preparing…' : 'Share to Story / Save Image'}
            onPress={handleShare}
            disabled={busy}
            style={{ marginTop: spacing.md }}
          />
          <Pressable onPress={onClose} style={styles.cancelBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>

          {busy && (
            <View style={styles.busyOverlay}>
              <ActivityIndicator color={colors.accent} />
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#151A21',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: { color: colors.text, fontSize: 17, fontWeight: '800' },
  previewWrap: { alignItems: 'center' },
  cancelBtn: { alignItems: 'center', paddingVertical: spacing.md },
  cancelText: { color: colors.muted, fontSize: 13, fontWeight: '700' },
  busyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
    borderRadius: 24,
  },
});
