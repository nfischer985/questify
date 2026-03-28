import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Quest } from '@/types';

export interface UserQuestsData {
  solo: Quest[];
  duo: Quest[];
  trio: Quest[];
  squad: Quest[];
}

export async function getUserQuests(uid: string): Promise<UserQuestsData | null> {
  const snap = await getDoc(doc(db, 'userQuests', uid));
  if (!snap.exists()) return null;
  const d = snap.data();
  return {
    solo:  (d.solo  ?? []).map((q: Quest) => ({ ...q, completed: false })),
    duo:   (d.duo   ?? []).map((q: Quest) => ({ ...q, completed: false })),
    trio:  (d.trio  ?? []).map((q: Quest) => ({ ...q, completed: false })),
    squad: (d.squad ?? []).map((q: Quest) => ({ ...q, completed: false })),
  };
}
