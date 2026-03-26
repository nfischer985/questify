'use client';
import { useGameStore } from '@/store/gameStore';
import { Flame } from 'lucide-react';
import { CoinIcon } from '@/components/ui/CoinIcon';

export function getRankTitle(level: number): string {
  if (level >= 20) return 'Legend';
  if (level >= 15) return 'Hero';
  if (level >= 10) return 'Champion';
  if (level >= 6)  return 'Adventurer';
  if (level >= 3)  return 'Explorer';
  return 'Wanderer';
}

function QuestifyLogo() {
  return (
    <svg width="30" height="30" viewBox="0 0 30 30" fill="none">
      {/* Outer shield */}
      <path
        d="M15 2L27 7V17C27 23.5 15 28 15 28C15 28 3 23.5 3 17V7L15 2Z"
        fill="rgba(16,185,129,0.18)"
        stroke="var(--c-green)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      {/* Inner shield highlight */}
      <path
        d="M15 6L23 10V17.5C23 21.5 15 24.5 15 24.5C15 24.5 7 21.5 7 17.5V10L15 6Z"
        fill="rgba(16,185,129,0.08)"
      />
      {/* Q letter body */}
      <circle cx="15" cy="16" r="5" fill="none" stroke="var(--c-green)" strokeWidth="2" />
      {/* Q tail */}
      <line x1="18.5" y1="19" x2="21" y2="22" stroke="var(--c-green)" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export default function Header() {
  const { username, level, xp, xpToNextLevel, coins, streak, premium, showGoldenRing, avatarColor, avatarUrl } = useGameStore();
  const pct  = Math.min((xp / xpToNextLevel) * 100, 100);
  const rank = getRankTitle(level);
  const aColor = avatarColor || '#10b981';

  return (
    <header style={{ background: 'var(--c-nav)', borderBottom: '1px solid var(--c-border)' }}>
      {/* Wordmark bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 16px 0',
      }}>
        {/* Logo + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <QuestifyLogo />
          <span style={{
            fontWeight: 900, fontSize: 16, letterSpacing: '0.1em', textTransform: 'uppercase',
            background: 'linear-gradient(90deg,var(--c-green),#34d399)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
          }}>Questify</span>
        </div>

        {/* Streak + coins */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: streak > 0 ? 'rgba(245,158,11,0.1)' : 'var(--c-elevated)',
            border: `1px solid ${streak > 0 ? 'rgba(245,158,11,0.25)' : 'var(--c-border)'}`,
            borderRadius: 20, padding: '4px 10px',
          }}>
            <Flame size={13} color={streak > 0 ? 'var(--c-gold)' : 'var(--c-t3)'} />
            <span style={{ fontSize: 13, fontWeight: 800, color: streak > 0 ? 'var(--c-gold)' : 'var(--c-t3)' }}>{streak}</span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 5,
            background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.18)',
            borderRadius: 20, padding: '4px 10px',
          }}>
            <CoinIcon size={14} />
            <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--c-gold-br)' }}>{coins.toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div style={{ padding: '10px 16px 12px' }}>
        {/* User row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          {/* Avatar */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div
              className={premium && showGoldenRing ? 'gold-glow' : ''}
              style={{
                width: 42, height: 42, borderRadius: '50%',
                background: avatarUrl ? 'transparent' : `linear-gradient(135deg, ${aColor}cc, ${aColor})`,
                border: premium && showGoldenRing ? '2.5px solid var(--c-gold)' : '2px solid rgba(16,185,129,0.35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 17, fontWeight: 800, color: 'white', userSelect: 'none',
                overflow: 'hidden',
              }}
            >
              {avatarUrl
                ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : username[0].toUpperCase()
              }
            </div>
            {premium && (
              <div style={{
                position: 'absolute', top: -3, right: -3,
                width: 16, height: 16, borderRadius: '50%',
                background: 'var(--c-card)', border: '1px solid var(--c-gold)',
                fontSize: 9, display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--c-gold)', fontWeight: 900,
              }}>P</div>
            )}
          </div>

          {/* Name + rank */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 700, color: 'var(--c-t1)', fontSize: 14 }}>{username}</span>
              {premium && <span className="shimmer-text" style={{ fontSize: 10, fontWeight: 800 }}>PRO</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
              <span style={{ fontSize: 11, color: 'var(--c-green)', fontWeight: 600 }}>Lv {level}</span>
              <span style={{ fontSize: 11, color: 'var(--c-t3)' }}>·</span>
              <span style={{ fontSize: 11, color: 'var(--c-t3)', fontWeight: 500 }}>{rank}</span>
            </div>
          </div>

          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: 'var(--c-t3)' }}>{(xpToNextLevel - xp).toLocaleString()} XP to Lv {level + 1}</span>
          </div>
        </div>

        {/* XP bar */}
        <div style={{
          height: 6, borderRadius: 3, overflow: 'hidden',
          background: 'var(--c-elevated)', border: '1px solid var(--c-border)',
        }}>
          <div style={{
            height: '100%', borderRadius: 3,
            width: `${pct}%`,
            background: 'linear-gradient(90deg,var(--c-green-dk),var(--c-green),#34d399)',
            transition: 'width 0.7s ease',
            boxShadow: pct > 0 ? '0 0 6px rgba(16,185,129,0.4)' : 'none',
          }} />
        </div>
      </div>
    </header>
  );
}
