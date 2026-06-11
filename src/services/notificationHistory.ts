import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

// Persistent notification history. getPresentedNotificationsAsync() only
// returns what is still sitting in Notification Center, so without this the
// Notifications screen goes blank as soon as the user opens or dismisses a
// notification. Every received notification is recorded here (last 50).

const STORAGE_KEY = 'notification_history_v1';
const MAX_ITEMS = 50;

export interface StoredNotification {
  id: string;
  title: string;
  body: string;
  date: string; // ISO
  read: boolean;
}

export async function listNotificationHistory(): Promise<StoredNotification[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredNotification[]) : [];
  } catch {
    return [];
  }
}

async function save(items: StoredNotification[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
  } catch {
    // best effort — history is a convenience, never block on it
  }
}

export async function recordNotification(n: Notifications.Notification) {
  const item: StoredNotification = {
    id: n.request.identifier,
    title: n.request.content.title || 'MarketingTool',
    body: n.request.content.body || '',
    date: new Date(n.date).toISOString(),
    read: false,
  };
  const items = await listNotificationHistory();
  if (items.some((i) => i.id === item.id)) return;
  await save([item, ...items]);
}

export async function markNotificationRead(id: string) {
  const items = await listNotificationHistory();
  await save(items.map((i) => (i.id === id ? { ...i, read: true } : i)));
}

export async function clearNotificationHistory() {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

let subscription: Notifications.EventSubscription | null = null;

// Call once at app root. Safe to call repeatedly.
export function initNotificationHistory() {
  if (subscription) return;
  subscription = Notifications.addNotificationReceivedListener((n) => {
    recordNotification(n);
  });
  // Also sweep anything currently in Notification Center (e.g. notifications
  // that arrived while the app was killed) into history on startup.
  Notifications.getPresentedNotificationsAsync()
    .then((presented) => Promise.all(presented.map(recordNotification)))
    .catch(() => {});
}
