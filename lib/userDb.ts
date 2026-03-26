import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getFirebaseDb } from './firebase';

export interface UserProfile {
  uid: string;
  username: string;   // permanent handle (lowercase)
  displayName: string;
  createdAt?: unknown;
}

/** Returns true if the username is already taken. */
export async function isUsernameTaken(username: string): Promise<boolean> {
  const snap = await getDoc(doc(getFirebaseDb(), 'users', username.toLowerCase()));
  return snap.exists();
}

/** Register a new user's username. Throws if taken. */
export async function registerUsername(uid: string, username: string, displayName: string): Promise<void> {
  const lower = username.toLowerCase();
  const taken = await isUsernameTaken(lower);
  if (taken) throw new Error('USERNAME_TAKEN');

  const profile: UserProfile = { uid, username: lower, displayName, createdAt: serverTimestamp() };
  // Write both lookup paths atomically-ish
  await setDoc(doc(getFirebaseDb(), 'users', lower), profile);
  await setDoc(doc(getFirebaseDb(), 'usersByUid', uid), profile);
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
