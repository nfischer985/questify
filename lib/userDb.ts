import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';
import { upsertLeaderboardEntry } from './leaderboardDb';
import { validateUsername, sanitizeText, DISPLAY_NAME_MAX } from './validation';
import { allowUsernameCheck } from './rateLimit';

export interface UserProfile {
  uid: string;
  username: string;   // permanent handle (lowercase)
  displayName: string;
  createdAt?: unknown;
}

/**
 * Returns true if the username is already taken.
 * Applies a client-side rate limit to prevent enumeration via rapid polling.
 */
export async function isUsernameTaken(username: string): Promise<boolean> {
  if (!allowUsernameCheck()) {
    throw new Error('Too many checks — please wait a moment.');
  }
  const snap = await getDoc(doc(getFirebaseDb(), 'users', username.toLowerCase()));
  return snap.exists();
}

/**
 * Register a new user's permanent username.
 *
 * Validates format and length (defense-in-depth on top of client-side checks),
 * then atomically writes both lookup documents and seeds the leaderboard entry.
 * Throws 'USERNAME_TAKEN' if the handle is already claimed.
 */
export async function registerUsername(uid: string, username: string, displayName: string): Promise<void> {
  // Validate format server-side — client validation can be bypassed
  const check = validateUsername(username);
  if (!check.ok) throw new Error(check.error);

  const lower       = username.toLowerCase();
  const safeDisplay = sanitizeText(displayName || lower, DISPLAY_NAME_MAX) || lower;

  const taken = await isUsernameTaken(lower);
  if (taken) throw new Error('USERNAME_TAKEN');

  const profile: UserProfile = {
    uid,
    username:    lower,
    displayName: safeDisplay,
    createdAt:   serverTimestamp(),
  };

  // Write both lookup paths
  await setDoc(doc(getFirebaseDb(), 'users',      lower), profile);
  await setDoc(doc(getFirebaseDb(), 'usersByUid', uid),   profile);

  // Seed the leaderboard so the user appears immediately after sign-up
  await upsertLeaderboardEntry(uid, {
    username:              lower,
    displayName:           safeDisplay,
    level:                 1,
    xp:                    0,
    totalXp:               0,
    coins:                 100,
    streak:                0,
    questsCompleted:       0,
    weeklyQuestsCompleted: 0,
    premium:               false,
    avatarUrl:             null,
  });
}

/** Fetch a user's profile by their UID. Returns null if not found. */
export async function getProfileByUid(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(getFirebaseDb(), 'usersByUid', uid));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

/** Fetch a user's profile by username. Returns null if not found. */
export async function getProfileByUsername(username: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(getFirebaseDb(), 'users', username.toLowerCase()));
  return snap.exists() ? (snap.data() as UserProfile) : null;
}
