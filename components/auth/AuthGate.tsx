'use client';
import { useEffect, useRef, useState } from 'react';
import { onAuthStateChanged, signOut, getIdToken, User } from 'firebase/auth';
import { auth, initFirebaseAppCheck } from '@/lib/firebase';

const ALLOWED_EMAILS = [
  'hendrik.fischer@gmail.com',
  'nfischer985@gmail.com',
  'ericfischer427@gmail.com',
];

initFirebaseAppCheck();

async function generateQuestsForUser(user: User) {
  const { setUserLocation, setQuestsGenerating, loadUserQuests } = useGameStore.getState();
  setQuestsGenerating(true);

  try {
    // Try GPS first, fall back to IP geolocation
    const { lat, lng } = await getLocation();
    setUserLocation(lat, lng);

    const token = await getIdToken(user);
    const res = await fetch('/api/generate-quests', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng }),
    });

    if (res.ok) {
      await loadUserQuests(user.uid);
    }
  } catch {
    // Generation failed silently — user will see retry button
  } finally {
    setQuestsGenerating(false);
  }
}

function getLocation(): Promise<{ lat: number; lng: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('no geolocation')); return; }

    const timeout = setTimeout(async () => {
      // GPS timed out — fall back to IP geolocation
      try {
        const res = await fetch('https://ipapi.co/json/');
        const geo = await res.json();
        if (geo.latitude && geo.longitude) resolve({ lat: geo.latitude, lng: geo.longitude });
        else reject(new Error('ip geo failed'));
      } catch { reject(new Error('ip geo failed')); }
    }, 8000);

    navigator.geolocation.getCurrentPosition(
      pos => { clearTimeout(timeout); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }); },
      async () => {
        clearTimeout(timeout);
        // GPS denied — try IP geolocation
        try {
          const res = await fetch('https://ipapi.co/json/');
          const geo = await res.json();
          if (geo.latitude && geo.longitude) resolve({ lat: geo.latitude, lng: geo.longitude });
          else reject(new Error('ip geo failed'));
        } catch { reject(new Error('all geo failed')); }
      },
      { timeout: 7000 }
    );
  });
}

import { getProfileByUid } from '@/lib/userDb';
import { subscribeToActivity } from '@/lib/activityDb';
import { upsertLeaderboardEntry, computeTotalXp } from '@/lib/leaderboardDb';
import { useGameStore } from '@/store/gameStore';
import SignInScreen from './SignInScreen';
import UsernameSetup from './UsernameSetup';

function ActivityListener() {
  const { friends, addActivityItem } = useGameStore();
  const seenRef = useRef<Set<string>>(new Set());
  const unsubsRef = useRef<(() => void)[]>([]);

  useEffect(() => {
    // Request notification permission once
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    unsubsRef.current.forEach(u => u());
    unsubsRef.current = [];

    friends.forEach(friend => {
      const unsub = subscribeToActivity(friend.id, items => {
        items.forEach(item => {
          const key = `${item.uid}-${item.timestamp}`;
          if (seenRef.current.has(key)) return;
          seenRef.current.add(key);
          // Skip items older than 10 minutes (not truly "new")
          if (Date.now() - item.timestamp > 10 * 60 * 1000) return;
          addActivityItem(item);
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            new Notification(`@${item.username} completed a quest!`, {
              body: `${item.questTitle} · +${item.xpGained} XP`,
              icon: '/favicon.ico',
            });
          }
        });
      });
      unsubsRef.current.push(unsub);
    });

    return () => { unsubsRef.current.forEach(u => u()); };
  }, [friends, addActivityItem]);

  return null;
}

function LeaderboardSync() {
  const {
    authUid, username, displayName, level, xp, coins, streak,
    totalQuestsCompleted, weeklyQuestsCompleted, premium, avatarUrl,
  } = useGameStore();

  useEffect(() => {
    if (!authUid || !username) return;
    upsertLeaderboardEntry(authUid, {
      username,
      displayName: displayName || username,
      level,
      xp,
      totalXp: computeTotalXp(level, xp),
      coins,
      streak,
      questsCompleted: totalQuestsCompleted,
      weeklyQuestsCompleted,
      premium,
      avatarUrl: avatarUrl ?? null,
    }).catch(() => {});
  }, [authUid, username, displayName, level, xp, coins, streak, totalQuestsCompleted, weeklyQuestsCompleted, premium, avatarUrl]);

  return null;
}

function AuthGateInner({ children }: { children: React.ReactNode }) {
  const { userHandle, setUserHandle, setDisplayName, setAuthUid, setUserLocation, loadUserQuests, setQuestsGenerating } = useGameStore();
  const [firebaseUser, setFirebaseUser] = useState<User | null | 'loading' | 'denied'>('loading');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setFirebaseUser(null);
        return;
      }
      if (!ALLOWED_EMAILS.includes(user.email ?? '')) {
        await signOut(auth);
        setFirebaseUser('denied');
        return;
      }
      setAuthUid(user.uid);

      // Use getState() to avoid stale closure
      const hasLocalQuests = useGameStore.getState().weeklyQuests.length > 0;
      if (!hasLocalQuests) {
        const hasFirestoreQuests = await loadUserQuests(user.uid).catch(() => false);
        if (!hasFirestoreQuests) {
          generateQuestsForUser(user);
        }
      }
      // If we already have a handle in store, use it
      if (userHandle) {
        setFirebaseUser(user);
        return;
      }
      // Otherwise look up from Firestore
      try {
        const profile = await getProfileByUid(user.uid);
        if (profile) {
          setUserHandle(profile.username);
          setDisplayName(profile.displayName);
        }
      } catch { /* offline — proceed, UsernameSetup will be skipped if handle exists */ }
      setFirebaseUser(user);
    });
    return unsub;
  }, [userHandle, setUserHandle, setDisplayName, setAuthUid]);

  if (firebaseUser === 'loading') {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100dvh', background: 'var(--c-bg)',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '3px solid rgba(16,185,129,0.2)', borderTopColor: 'var(--c-green)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (firebaseUser === 'denied') return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100dvh', background: 'var(--c-bg)', gap: 12, padding: 24, textAlign: 'center',
    }}>
      <span style={{ fontSize: 48 }}>🚫</span>
      <p style={{ color: 'var(--c-text)', fontSize: 18, fontWeight: 600 }}>Access denied</p>
      <p style={{ color: 'var(--c-text-muted)', fontSize: 14 }}>Your account is not on the invite list.</p>
    </div>
  );
  if (!firebaseUser) return <SignInScreen />;
  if (!userHandle)   return <UsernameSetup firebaseUser={firebaseUser} />;

  return <><ActivityListener /><LeaderboardSync />{children}</>;
}

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  if (!mounted) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100dvh', background: 'var(--c-bg)',
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: '50%',
          border: '3px solid rgba(16,185,129,0.2)', borderTopColor: 'var(--c-green)',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return <AuthGateInner>{children}</AuthGateInner>;
}
