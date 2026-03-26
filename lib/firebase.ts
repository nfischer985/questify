import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider, AppCheck } from 'firebase/app-check';

const firebaseConfig = {
  apiKey:             process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:         process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:          process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:      process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:  process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:              process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let _app: FirebaseApp | null = null;
let _auth: Auth | null = null;
let _db: Firestore | null = null;
let _appCheck: AppCheck | null = null;

function getFirebaseApp(): FirebaseApp {
  if (!_app) {
    _app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  }
  return _app;
}

export function initFirebaseAppCheck(): void {
  if (_appCheck || typeof window === 'undefined') return;
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY;
  if (!siteKey) return;
  _appCheck = initializeAppCheck(getFirebaseApp(), {
    provider: new ReCaptchaV3Provider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

// Lazy getters — safe to import anywhere, only initialize on first call
export function getFirebaseAuth(): Auth {
  if (!_auth) _auth = getAuth(getFirebaseApp());
  return _auth;
}

export function getFirebaseDb(): Firestore {
  if (!_db) _db = getFirestore(getFirebaseApp());
  return _db;
}

// Convenience re-exports as lazy proxy objects that behave like the real instances
// These are evaluated lazily, so importing this module does NOT initialize Firebase.
// Call getFirebaseAuth() / getFirebaseDb() directly for guaranteed initialization.

export const auth: Auth = new Proxy({} as Auth, {
  get(_target, prop) {
    return (getFirebaseAuth() as unknown as Record<string | symbol, unknown>)[prop];
  },
  set(_target, prop, value) {
    (getFirebaseAuth() as unknown as Record<string | symbol, unknown>)[prop] = value;
    return true;
  },
});

export const db: Firestore = new Proxy({} as Firestore, {
  get(_target, prop) {
    return (getFirebaseDb() as unknown as Record<string | symbol, unknown>)[prop];
  },
  set(_target, prop, value) {
    (getFirebaseDb() as unknown as Record<string | symbol, unknown>)[prop] = value;
    return true;
  },
});
