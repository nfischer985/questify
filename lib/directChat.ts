import { collection, addDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { ChatMessage } from '@/types';
import { sanitizeText, CHAT_MSG_MAX, validateChatMessage } from './validation';
import { allowChat, retryAfterMs } from './rateLimit';

/** Deterministic chat room ID from two UIDs (always sorted). */
export function getChatId(uid1: string, uid2: string): string {
  return [uid1, uid2].sort().join('_');
}

export function subscribeToDirectChat(chatId: string, cb: (msgs: ChatMessage[]) => void) {
  const q = query(
    collection(getFirebaseDb(), 'directMessages', chatId, 'messages'),
    orderBy('createdAt', 'asc'),
    limit(100),
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage)));
  }, () => cb([]));
}

export async function sendDirectMessage(
  chatId:   string,
  uid:      string,
  username: string,
  text:     string,
): Promise<void> {
  const clean = sanitizeText(text, CHAT_MSG_MAX);
  const check = validateChatMessage(clean);
  if (!check.ok) throw new Error(check.error);

  if (!allowChat(uid)) {
    const waitS = Math.ceil(retryAfterMs(`chat:${uid}`, 10_000) / 1000);
    throw new Error(`Slow down — wait ${waitS}s.`);
  }

  await addDoc(
    collection(getFirebaseDb(), 'directMessages', chatId, 'messages'),
    { uid, username, text: clean, createdAt: Date.now() },
  );
}
