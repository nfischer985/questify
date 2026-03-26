import { doc, setDoc, getDoc } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { Party } from '@/types';

export async function saveParty(party: Party): Promise<void> {
  try {
    await setDoc(doc(getFirebaseDb(), 'parties', party.code), party);
  } catch { /* silently fail */ }
}

export async function fetchParty(code: string): Promise<Party | null> {
  try {
    const snap = await getDoc(doc(getFirebaseDb(), 'parties', code.toUpperCase()));
    return snap.exists() ? (snap.data() as Party) : null;
  } catch { return null; }
}
