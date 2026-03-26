import { doc, setDoc, onSnapshot, getDoc } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { ActivityItem } from '@/types';

export async function logActivity(uid: string, item: Omit<ActivityItem, 'uid'>) {
  try {
    const ref = doc(getFirebaseDb(), 'userActivity', uid);
    const snap = await getDoc(ref);
    const existing: ActivityItem[] = snap.exists() ? (snap.data().recentActivity ?? []) : [];
    const updated = [{ ...item, uid }, ...existing].slice(0, 20);
    await setDoc(ref, { recentActivity: updated });
  } catch { /* silently fail — non-critical */ }
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
