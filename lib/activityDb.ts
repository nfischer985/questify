import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { ActivityItem } from '@/types';
import { sanitizeText, validateQuestTitle, QUEST_TITLE_MAX } from './validation';
import { allowActivityLog } from './rateLimit';

export async function logActivity(uid: string, item: Omit<ActivityItem, 'uid'>) {
  try {
    // Validate and sanitize the quest title before persisting
    const cleanTitle = sanitizeText(item.questTitle, QUEST_TITLE_MAX);
    const check = validateQuestTitle(cleanTitle);
    if (!check.ok) return; // silently drop invalid entries

    // Client-side rate limit: max 10 activity logs per minute per user
    if (!allowActivityLog(uid)) return;

    const safeItem: ActivityItem = {
      uid,
      username:   sanitizeText(item.username, 24),
      questTitle: cleanTitle,
      difficulty: item.difficulty,
      xpGained:   Math.max(0, Math.min(item.xpGained, 100_000)), // clamp to sane range
      timestamp:  item.timestamp,
    };

    const ref = doc(getFirebaseDb(), 'userActivity', uid);
    const snap = await getDoc(ref);
    const existing: ActivityItem[] = snap.exists() ? (snap.data().recentActivity ?? []) : [];
    const updated = [safeItem, ...existing].slice(0, 20); // keep last 20
    await setDoc(ref, { recentActivity: updated });
  } catch { /* non-critical — silently fail */ }
}

export async function getActivity(uid: string): Promise<ActivityItem[]> {
  try {
    const snap = await getDoc(doc(getFirebaseDb(), 'userActivity', uid));
    return snap.exists() ? (snap.data().recentActivity ?? []) : [];
  } catch { return []; }
}

export function subscribeToActivity(uid: string, cb: (items: ActivityItem[]) => void) {
  const ref = doc(getFirebaseDb(), 'userActivity', uid);
  return onSnapshot(ref, snap => {
    cb(snap.exists() ? (snap.data().recentActivity ?? []) : []);
  }, () => cb([]));
}
