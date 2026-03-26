'use client';
import { useState } from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase';

export default function SignInScreen() {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithPopup(getFirebaseAuth(), new GoogleAuthProvider());
    } catch (e: unknown) {
      setError('Sign-in failed. Please try again.');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100dvh', background: 'var(--c-bg)', padding: '0 32px',
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 40, textAlign: 'center' }}>
        <svg width="72" height="72" viewBox="0 0 30 30" fill="none" style={{ marginBottom: 16 }}>
          <path d="M15 2L27 7V17C27 23.5 15 28 15 28C15 28 3 23.5 3 17V7L15 2Z"
            fill="rgba(16,185,129,0.18)" stroke="var(--c-green)" strokeWidth="1.6" strokeLinejoin="round"/>
          <path d="M15 6L23 10V17.5C23 21.5 15 24.5 15 24.5C15 24.5 7 21.5 7 17.5V10L15 6Z"
            fill="rgba(16,185,129,0.08)"/>
          <circle cx="15" cy="16" r="5" fill="none" stroke="var(--c-green)" strokeWidth="2"/>
          <line x1="18.5" y1="19" x2="21" y2="22" stroke="var(--c-green)" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <h1 style={{
          fontWeight: 900, fontSize: 32, letterSpacing: '0.1em', textTransform: 'uppercase',
          background: 'linear-gradient(90deg,var(--c-green),#34d399)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          margin: 0,
        }}>Questify</h1>
        <p style={{ fontSize: 14, color: 'var(--c-t3)', marginTop: 8 }}>Complete real-world adventures. Level up your life.</p>
      </div>

      {/* Sign-in card */}
      <div style={{
        width: '100%', maxWidth: 340,
        background: 'var(--c-card)', border: '1px solid var(--c-border)',
        borderRadius: 20, padding: '28px 24px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
      }}>
        <h2 style={{ fontWeight: 800, fontSize: 18, color: 'var(--c-t1)', textAlign: 'center', marginBottom: 6 }}>Welcome back</h2>
        <p style={{ fontSize: 13, color: 'var(--c-t3)', textAlign: 'center', marginBottom: 24 }}>Sign in to track your quests and compete globally.</p>

        <button
          onClick={handleGoogle}
          disabled={loading}
          style={{
            width: '100%', padding: '14px 0', borderRadius: 12,
            border: '1px solid var(--c-border-m)', cursor: loading ? 'wait' : 'pointer',
            background: 'var(--c-elevated)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            fontFamily: 'inherit', fontSize: 15, fontWeight: 700, color: 'var(--c-t1)',
            transition: 'all 0.15s',
            opacity: loading ? 0.6 : 1,
          }}
        >
          {loading ? (
            <div style={{
              width: 18, height: 18, borderRadius: '50%',
              border: '2.5px solid rgba(16,185,129,0.3)', borderTopColor: 'var(--c-green)',
              animation: 'spin 0.8s linear infinite',
            }} />
          ) : (
            <svg viewBox="0 0 48 48" width="20" height="20">
              <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16.1 19 13 24 13c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34.5 6.5 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.3 35.2 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8H6.1C9.5 35.6 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-.8 2.3-2.4 4.2-4.4 5.5l6.2 5.2C36.9 39.3 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"/>
            </svg>
          )}
          {loading ? 'Signing in…' : 'Continue with Google'}
        </button>

        {error && (
          <p style={{ fontSize: 13, color: '#ef4444', textAlign: 'center', marginTop: 14, fontWeight: 600 }}>{error}</p>
        )}

        <p style={{ fontSize: 11, color: 'var(--c-t3)', textAlign: 'center', marginTop: 20, lineHeight: 1.6 }}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
