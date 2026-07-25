import { Platform } from 'react-native';
import { computeNudges } from './nudges';
import { getWorkouts, getProfile, getSmartRemindersEnabled } from './storage';

// On-device scheduling layer for Smart Notifications. Defensive-require of the
// native module (mirrors authClient's WebBrowser handling) so the app still
// runs on web or an older build without expo-notifications, degrading to
// "no reminders" rather than crashing.
let Notifications = null;
try {
  // eslint-disable-next-line global-require
  Notifications = require('expo-notifications');
  // Show reminders even if the app happens to be foregrounded when they fire.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
} catch (e) {
  // module unavailable — all functions below become safe no-ops
}

const supported = () => Notifications && Platform.OS !== 'web';

export async function ensureNotificationPermission() {
  if (!supported()) return false;
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted || current.status === 'granted') return true;
    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted || asked.status === 'granted';
  } catch (e) {
    return false;
  }
}

async function ensureAndroidChannel() {
  if (!supported() || Platform.OS !== 'android') return;
  try {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Reminders',
      importance: Notifications.AndroidImportance?.DEFAULT ?? 3,
    });
  } catch (e) {
    // channel setup is best-effort
  }
}

/**
 * Recompute nudges from local data and (re)schedule them. Cancels any
 * previously scheduled reminders first so we never stack duplicates. Safe to
 * call often — on app foreground and after finishing a workout. Fire-and-
 * forget: never throws into a caller.
 */
export async function refreshSmartNotifications() {
  if (!supported()) return;
  try {
    const enabled = await getSmartRemindersEnabled();
    if (!enabled) {
      await Notifications.cancelAllScheduledNotificationsAsync();
      return;
    }
    const granted = await ensureNotificationPermission();
    if (!granted) return;
    await ensureAndroidChannel();
    await Notifications.cancelAllScheduledNotificationsAsync();

    const [workouts, profile] = await Promise.all([getWorkouts(), getProfile()]);
    const nudges = computeNudges({ workouts, bodyweight: profile?.weight || 70 });

    const now = Date.now();
    for (const n of nudges) {
      const seconds = Math.max(60, Math.round((n.fireAt.getTime() - now) / 1000));
      // seconds-based one-shot trigger is stable across expo-notifications
      // versions (date-typed triggers changed shape between SDKs).
      await Notifications.scheduleNotificationAsync({
        identifier: n.id,
        content: { title: n.title, body: n.body },
        trigger: { seconds, channelId: 'reminders' },
      });
    }
  } catch (e) {
    console.warn('Smart notifications refresh failed:', e?.message);
  }
}

// Called when the user turns the setting off, to clear anything pending
// immediately rather than waiting for the next refresh.
export async function cancelAllReminders() {
  if (!supported()) return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (e) {
    // ignore
  }
}
