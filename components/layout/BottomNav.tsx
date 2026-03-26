'use client';
import { useGameStore } from '@/store/gameStore';
import { Home, Trophy, Map, User, Sparkles } from 'lucide-react';
import { sound, haptic } from '@/lib/sounds';

const TABS = [
  { id: 'home',        Icon: Home,     label: 'Home'    },
  { id: 'leaderboard', Icon: Trophy,   label: 'Ranks'   },
  { id: 'map',         Icon: Map,      label: 'Map',    center: true },
  { id: 'profile',     Icon: User,     label: 'Profile' },
  { id: 'events',      Icon: Sparkles, label: 'Events'  },
];

export default function BottomNav() {
  const { activeTab, setActiveTab } = useGameStore();

  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
      width: '100%', maxWidth: 430,
      background: 'var(--c-nav)',
      borderTop: '1px solid var(--c-border)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'space-around',
      padding: '6px 8px 10px',
      zIndex: 100,
    }}>
      {TABS.map(({ id, Icon, label, center }) => {
        const active = activeTab === id;
        if (center) {
          return (
            <button
              key={id}
              onClick={() => { sound('nav'); haptic(6); setActiveTab(id); }}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                marginTop: -22, border: 'none', background: 'none', cursor: 'pointer',
              }}
            >
              <div
                className={active ? 'pulse-map' : ''}
                style={{
                  width: 56, height: 56, borderRadius: '50%',
                  background: active
                    ? 'linear-gradient(135deg,var(--c-green-dk),var(--c-green))'
                    : 'linear-gradient(135deg,rgba(16,185,129,0.15),rgba(16,185,129,0.35))',
                  border: '3px solid var(--c-bg)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: active
                    ? '0 0 20px rgba(16,185,129,0.5), 0 4px 16px rgba(0,0,0,0.4)'
                    : '0 4px 16px rgba(0,0,0,0.3)',
                  transition: 'all 0.2s',
                }}
              >
                <Icon size={24} color="white" strokeWidth={active ? 2.5 : 2} />
              </div>
              <span style={{ fontSize: 10, marginTop: 2, fontWeight: 600, color: active ? 'var(--c-green)' : 'var(--c-t3)' }}>{label}</span>
            </button>
          );
        }
        return (
          <button
            key={id}
            onClick={() => { sound('nav'); haptic(6); setActiveTab(id); }}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              gap: 2, padding: '4px 12px',
              border: 'none', background: 'none', cursor: 'pointer',
              position: 'relative',
            }}
          >
            {active && (
              <div style={{
                position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
                width: 24, height: 2, borderRadius: 1, background: 'var(--c-gold)',
              }} />
            )}
            <Icon size={21} color={active ? 'var(--c-green)' : 'var(--c-t3)'} strokeWidth={active ? 2.5 : 1.8} />
            <span style={{ fontSize: 10, fontWeight: 600, color: active ? 'var(--c-green)' : 'var(--c-t3)' }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
