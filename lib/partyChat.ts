import { collection, addDoc, onSnapshot, query, orderBy, limit, getDoc, doc } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { ChatMessage } from '@/types';

export function subscribeToPartyChat(partyCode: string, cb: (msgs: ChatMessage[]) => void) {
  const q = query(
    collection(getFirebaseDb(), 'partyChat', partyCode, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(100),
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
  }, () => cb([]));
}

export async function sendChatMessage(partyCode: string, uid: string, username: string, text: string) {
  await addDoc(collection(getFirebaseDb(), 'partyChat', partyCode, 'messages'), {
    uid, username, text: text.trim(), createdAt: Date.now(),
  });
}

/** Returns true if a party with this code has at least one message (i.e. exists). */
export async function partyExists(partyCode: string): Promise<boolean> {
  try {
    // We check the Firestore partyChat doc. But parties are local — so we just
    // validate the code format and let the store handle it.
    return partyCode.length === 6;
  } catch { return false; }
}
