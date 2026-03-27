import { collection, addDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { ChatMessage } from '@/types';
import { validateChatMessage, validatePartyCode, sanitizeText, CHAT_MSG_MAX } from './validation';
import { allowChat, retryAfterMs } from './rateLimit';

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

/**
 * Sends a party chat message.
 *
 * Validates text length and sanitizes control characters before writing.
 * Enforces a client-side rate limit (5 messages / 10 s) to prevent spam.
 * Throws a typed error on rate-limit or validation failure so callers can
 * surface a meaningful message to the user.
 */
export async function sendChatMessage(
  partyCode: string,
  uid:       string,
  username:  string,
  text:      string,
): Promise<void> {
  // 1. Validate party code format
  const codeCheck = validatePartyCode(partyCode);
  if (!codeCheck.ok) throw new Error(codeCheck.error);

  // 2. Sanitize and validate message text
  const clean = sanitizeText(text, CHAT_MSG_MAX);
  const msgCheck = validateChatMessage(clean);
  if (!msgCheck.ok) throw new Error(msgCheck.error);

  // 3. Client-side rate limit (server-side Firestore rules are the hard stop)
  if (!allowChat(uid)) {
    const waitMs = retryAfterMs(`chat:${uid}`, 10_000);
    const waitS  = Math.ceil(waitMs / 1000);
    throw new Error(`Slow down — wait ${waitS}s before sending another message.`);
  }

  await addDoc(
    collection(getFirebaseDb(), 'partyChat', partyCode, 'messages'),
    { uid, username, text: clean, createdAt: Date.now() },
  );
}

/** Returns true if a party code passes the format check. */
export async function partyExists(partyCode: string): Promise<boolean> {
  return validatePartyCode(partyCode).ok;
}
