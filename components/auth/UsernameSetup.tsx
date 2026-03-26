'use client';
import { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import { registerUsername, isUsernameTaken } from '@/lib/userDb';
import { useGameStore } from '@/store/gameStore';

const HANDLE_RE = /^[a-zA-Z0-9_-]+$/;

export default function UsernameSetup({ firebaseUser }: { firebaseUser: User }) {
  const { setUserHandle, setDisplayName } = useGameStore();

  const [handle, setHandle]       = useState('');
  const [status, setStatus]       = useState<'idle' | 'checking' | 'taken' | 'available' | 'saving'>('idle');
  const [error, setError]         = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pre-fill a suggestion from Google name
  useEffect(() => {
    const suggested = (firebaseUser.displayName ?? '')
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .toLowerCase()
      .slice(0, 20);
    if (suggested) setHandle(suggested);
  }, [firebaseUser.displayName]);

  const validate = (val: string) => {
    if (!val) return '';
    if (val.length < 3) return 'At least 3 characters';
    if (val.length > 24) return 'Max 24 characters';
    if (!HANDLE_RE.test(val)) return 'Letters, numbers, _ and - only';
    return '';
  };

  const handleChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 24);
    setHandle(clean);
    setStatus('idle');

    const err = validate(clean);
    setError(err);
    if (err) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    setStatus('checking');
    debounceRef.current = setTimeout(async () => {
      try {
        const taken = await isUsernameTaken(clean);
        setStatus(taken ? 'taken' : 'available');
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Could not check username. Try again.');
        setStatus('idle');
      }
    }, 500);
  };

  const handleConfirm = async () => {
    const err = validate(handle);
    if (err) { setError(err); return; }
    if (status !== 'available') return;
    setStatus('saving');
    try {
      const displayName = firebaseUser.displayName ?? handle;
      await registerUsername(firebaseUser.uid, handle, displayName);
      setUserHandle(handle);
      setDisplayName(displayName);
    } catch (e: unknown) {
      if (e instanceof Error && e.message === 'USERNAME_TAKEN') {
        setStatus('taken');
        setError('That username was just taken. Try another.');
      } else {
        setError('Something went wrong. Please try again.');
        setStatus('available');
      }
    }
  };

  const borderColor = error || status === 'taken'
    ? '#ef4444'
    : status === 'available'
      ? 'var(--c-green)'
      : 'var(--c-border-m)';

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '100dvh', background: 'var(--c-bg)', padding: '0 28px',
    }}>
      <div style={{
        width: '100%', maxWidth: 360,
        background: 'var(--c-card)', border: '1px solid var(--c-border)',
        borderRadius: 22, padding: '32px 24px',
        boxShadow: '0 8px 40px rgba(0,0,0,0.4)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 44, marginBottom: 10 }}>⚔️</div>
          <h2 style={{ fontWeight: 900, fontSize: 20, color: 'var(--c-t1)', margin: '0 0 8px' }}>Choose your username</h2>
          <p style={{ fontSize: 13, color: 'var(--c-t3)', lineHeight: 1.6, margin: 0 }}>
            This is your permanent handle. It can never be changed, so choose wisely!
          </p>
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{
            display: 'flex', alignItems: 'center',
            background: 'var(--c-input)', border: `1.5px solid ${borderColor}`,
            borderRadius: 12, padding: '0 14px', transition: 'border-color 0.2s',
          }}>
            <span style={{ fontSize: 15, color: 'var(--c-t3)', fontWeight: 700, marginRight: 2 }}>@</span>
            <input
              value={handle}
              onChange={e => handleChange(e.target.value)}
              placeholder="your_username"
              autoFocus
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              style={{
                flex: 1, padding: '14px 0', background: 'none', border: 'none', outline: 'none',
                color: 'var(--c-t1)', fontSize: 16, fontWeight: 700, fontFamily: 'inherit',
                letterSpacing: '0.02em',
              }}
            />
            {status === 'checking' && (
              <div style={{
                width: 16, height: 16, borderRadius: '50%',
                border: '2px solid rgba(16,185,129,0.3)', borderTopColor: 'var(--c-green)',
                animation: 'spin 0.7s linear infinite', flexShrink: 0,
              }} />
            )}
            {status === 'available' && <span style={{ fontSize: 18, flexShrink: 0 }}>✅</span>}
            {status === 'taken'     && <span style={{ fontSize: 18, flexShrink: 0 }}>❌</span>}
          </div>

          <div style={{ minHeight: 18, marginTop: 6 }}>
            {(error || status === 'taken') && (
              <p style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, margin: 0 }}>
                {error || 'Username already taken. Try another.'}
              </p>
            )}
            {status === 'available' && !error && (
              <p style={{ fontSize: 12, color: 'var(--c-green)', fontWeight: 600, margin: 0 }}>
                @{handle} is available!
              </p>
            )}
          </div>
        </div>

        <p style={{ fontSize: 11, color: 'var(--c-t3)', marginBottom: 20, lineHeight: 1.6 }}>
          Letters, numbers, underscores and dashes only · 3–24 characters
        </p>

        <button
          onClick={handleConfirm}
          disabled={status !== 'available' || !!error}
          style={{
            width: '100%', padding: '15px 0', borderRadius: 13, border: 'none',
            background: status === 'available' && !error
              ? 'linear-gradient(135deg,var(--c-green-dk),var(--c-green))'
              : 'var(--c-elevated)',
            color: status === 'available' && !error ? 'white' : 'var(--c-t3)',
            fontSize: 15, fontWeight: 800, cursor: status === 'available' && !error ? 'pointer' : 'default',
            fontFamily: 'inherit', transition: 'all 0.2s',
            boxShadow: status === 'available' && !error ? '0 4px 16px rgba(16,185,129,0.3)' : 'none',
          }}
        >
          {status === 'saving' ? 'Saving…' : 'Claim Username'}
        </button>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
