import {
  doc, setDoc, collection, query, orderBy, limit,
  onSnapshot, serverTimestamp, where, documentId,
} from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { validateLeaderboardStats, validateUsername, sanitizeText, DISPLAY_NAME_MAX } from './validation';
import { allowLeaderboardUpdate } from './rateLimit';

export interface LeaderboardEntry {
  uid: string;
  username: string;
  displayName: string;
  level: number;
  xp: number;          // XP within current level
  totalXp: number;     // cumulative XP for ranking
  coins: number;
  streak: number;
  questsCompleted: number;
  weeklyQuestsCompleted: number;
  premium: boolean;
  avatarUrl: string | null;
  updatedAt?: unknown;
}

const XP_PER_LEVEL = (level: number) => Math.floor(100 * Math.pow(1.4, level - 1));

export function computeTotalXp(level: number, xp: number): number {
  let total = 0;
  for (let i = 1; i < level; i++) total += XP_PER_LEVEL(i);
  return total + xp;
}

/**
 * Writes (or merges) a user's live stats into the leaderboard collection.
 *
 * Validates all numeric fields to prevent score injection, and enforces a
 * client-side rate limit so a runaway render loop can't flood Firestore.
 * Silently skips the write if the rate limit is hit — the next stat change
 * will trigger a fresh sync.
 */
export async function upsertLeaderboardEntry(
  uid:  string,
  data: Omit<LeaderboardEntry, 'uid' | 'updatedAt'>,
): Promise<void> {
  // Rate limit: max 1 write per 4 s per user
  if (!allowLeaderboardUpdate(uid)) return;

  // Validate stat fields before writing to Firestore
  const statsCheck = validateLeaderboardStats(data);
  if (!statsCheck.ok) {
    console.warn('[leaderboard] invalid stats, skipping write:', statsCheck.error);
    return;
  }

  // Validate and sanitize string fields
  const usernameCheck = validateUsername(data.username);
  if (!usernameCheck.ok) {
    console.warn('[leaderboard] invalid username, skipping write:', usernameCheck.error);
    return;
  }

  const safeEntry: Omit<LeaderboardEntry, 'updatedAt'> = {
    uid,
    username:              data.username.toLowerCase().trim(),
    displayName:           sanitizeText(data.displayName || data.username, DISPLAY_NAME_MAX),
    level:                 data.level,
    xp:                    data.xp,
    totalXp:               data.totalXp,
    coins:                 data.coins,
    streak:                data.streak,
    questsCompleted:       data.questsCompleted,
    weeklyQuestsCompleted: data.weeklyQuestsCompleted,
    premium:               !!data.premium,
    avatarUrl:             data.avatarUrl ?? null,
  };

  await setDoc(
    doc(getFirebaseDb(), 'leaderboard', uid),
    { ...safeEntry, updatedAt: serverTimestamp() },
    { merge: true },
  );
}

/** Real-time top-100 global leaderboard ordered by total XP. */
export function subscribeToGlobalLeaderboard(
  cb: (entries: LeaderboardEntry[]) => void,
): () => void {
  const q = query(
    collection(getFirebaseDb(), 'leaderboard'),
    orderBy('totalXp', 'desc'),
    limit(100),
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => d.data() as LeaderboardEntry));
  }, () => cb([]));
}

/** Real-time leaderboard for a specific set of UIDs (current user + friends). */
export function subscribeToFriendsLeaderboard(
  uids: string[],
  cb:   (entries: LeaderboardEntry[]) => void,
): () => void {
  if (uids.length === 0) { cb([]); return () => {}; }
  // Firestore 'in' supports up to 30 items
  const chunk = uids.slice(0, 30);
  const q = query(
    collection(getFirebaseDb(), 'leaderboard'),
    where(documentId(), 'in', chunk),
  );
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => d.data() as LeaderboardEntry));
  }, () => cb([]));
}
