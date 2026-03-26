'use client';
import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Trophy, Globe, Zap, Users } from 'lucide-react';
import { getRankTitle } from '@/components/layout/Header';

type Sort = 'xp' | 'streak' | 'questsCompleted' | 'weeklyQuests';

export default function LeaderboardScreen() {
  const { username, level, xp, coins, streak, totalQuestsCompleted, weeklyQuestsCompleted, friends, premium, avatarUrl } = useGameStore();
  const [tab, setTab] = useState<'global' | 'weekly' | 'friends'>('global');
  const [sort, setSort] = useState<Sort>('xp');

  const me = {
    username, level, xp, coins, streak,
    questsCompleted: totalQuestsCompleted,
    weeklyQuests: weeklyQuestsCompleted,
    premium, isMe: true, avatarUrl,
  };

  const list = (tab === 'friends'
    ? [me, ...friends.map(f => ({ ...f, questsCompleted: f.questsCompleted, weeklyQuests: Math.min(f.questsCompleted, 10), isMe: false }))]
    : [me]
  ).sort((a, b) => b[sort] - a[sort]);

  const TABS = [
    { id: 'global' as const,  Icon: Globe,  label: 'Global'  },
    { id: 'weekly' as const,  Icon: Zap,    label: 'Weekly'  },
    { id: 'friends' as const, Icon: Users,  label: 'Friends' },
  ];

  const SORTS: [Sort, string][] = [
    ['xp',              '⚡ XP'],
    ['streak',          '🔥 Streak'],
    ['questsCompleted', '⚔️ Quests'],
    ['weeklyQuests',    '📅 Weekly'],
  ];

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Header */}
      <div style={{
        background: '#111811', borderBottom: '1px solid rgba(16,185,129,0.1)',
        padding: '16px 16px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <Trophy size={20} color="#f59e0b" />
          <h1 style={{ fontWeight: 900, fontSize: 22, color: '#e8f0e8' }}>Leaderboard</h1>
        </div>
        <p style={{ fontSize: 12, color: '#3d5545' }}>Your standing as an adventurer</p>
      </div>

      <div style={{ padding: '14px 16px' }}>
        {/* Tab row */}
        <div style={{
          display: 'flex', background: '#0e160e',
          border: '1px solid rgba(16,185,129,0.12)',
          borderRadius: 12, padding: 3, gap: 3, marginBottom: 12,
        }}>
          {TABS.map(({ id, Icon, label }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 5, padding: '9px 0', borderRadius: 9,
                border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 12,
                background: tab === id ? '#10b981' : 'transparent',
                color: tab === id ? 'white' : '#3d5545',
                fontFamily: 'inherit',
              }}
            >
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>

        {/* Sort chips */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', marginBottom: 14, paddingBottom: 2 }}>
          {SORTS.map(([k, label]) => (
            <button
              key={k}
              onClick={() => setSort(k)}
              style={{
                flexShrink: 0, padding: '6px 12px', borderRadius: 99,
                border: `1px solid ${sort === k ? 'rgba(245,158,11,0.4)' : 'rgba(16,185,129,0.1)'}`,
                background: sort === k ? 'rgba(245,158,11,0.12)' : '#0e160e',
                color: sort === k ? '#f59e0b' : '#3d5545',
                fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >{label}</button>
          ))}
        </div>

        {/* Column headers */}
        <div style={{
          display: 'flex', alignItems: 'center',
          padding: '6px 12px', marginBottom: 8,
          fontSize: 11, fontWeight: 700, color: '#3d5545', textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          <span style={{ width: 32 }}>#</span>
          <span style={{ flex: 1 }}>Player</span>
          <span style={{ width: 52, textAlign: 'right' }}>XP</span>
          <span style={{ width: 44, textAlign: 'right' }}>🪙</span>
          <span style={{ width: 36, textAlign: 'right' }}>🔥</span>
        </div>

        {/* Rows */}
        {list.map((entry, i) => {
          const rank = i + 1;
          const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : null;
          return (
            <div
              key={entry.username + i}
              style={{
                display: 'flex', alignItems: 'center',
                background: entry.isMe ? 'rgba(16,185,129,0.07)' : '#131f13',
                border: `1px solid ${entry.isMe ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.08)'}`,
                borderRadius: 12, padding: '12px',
                marginBottom: 8,
              }}
            >
              <div style={{ width: 32, flexShrink: 0 }}>
                {medal
                  ? <span style={{ fontSize: 20 }}>{medal}</span>
                  : <span style={{ fontSize: 13, fontWeight: 800, color: '#3d5545' }}>#{rank}</span>
                }
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: (entry as typeof me).avatarUrl ? 'transparent' : 'linear-gradient(135deg, #059669, #10b981)',
                  border: entry.premium ? '2px solid #f59e0b' : '2px solid rgba(16,185,129,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, color: 'white', fontSize: 14, overflow: 'hidden',
                }}>
                  {(entry as typeof me).avatarUrl
                    ? <img src={(entry as typeof me).avatarUrl!} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : entry.username[0].toUpperCase()
                  }
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, color: '#e8f0e8', fontSize: 14 }}>{entry.username}</span>
                    {entry.premium && <span style={{ fontSize: 12 }}>🧭</span>}
                    {entry.isMe && (
                      <span style={{
                        fontSize: 10, fontWeight: 700, color: '#10b981',
                        background: 'rgba(16,185,129,0.15)', borderRadius: 99, padding: '1px 6px',
                      }}>You</span>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 12, color: '#10b981', fontWeight: 600 }}>Lv {entry.level}</span>
                    <span style={{ fontSize: 12, color: '#3d5545' }}>·</span>
                    <span style={{ fontSize: 12, color: '#3d5545' }}>{getRankTitle(entry.level)}</span>
                  </div>
                </div>
              </div>
              <span style={{ width: 52, textAlign: 'right', fontWeight: 800, color: '#10b981', fontSize: 13 }}>
                {entry.xp >= 1000 ? `${(entry.xp/1000).toFixed(1)}k` : entry.xp}
              </span>
              <span style={{ width: 44, textAlign: 'right', color: '#f59e0b', fontSize: 13, fontWeight: 600 }}>
                {entry.coins >= 1000 ? `${(entry.coins/1000).toFixed(1)}k` : entry.coins}
              </span>
              <span style={{ width: 36, textAlign: 'right', color: '#e8f0e8', fontSize: 13, fontWeight: 700 }}>
                {entry.streak}
              </span>
            </div>
          );
        })}

        {/* Empty friends state */}
        {tab === 'friends' && friends.length === 0 && (
          <div style={{
            background: '#131f13', border: '1px solid rgba(16,185,129,0.08)',
            borderRadius: 14, padding: '32px 20px', textAlign: 'center', marginTop: 8,
          }}>
            <span style={{ fontSize: 36, display: 'block', marginBottom: 10 }}>👥</span>
            <p style={{ fontWeight: 700, color: '#e8f0e8', marginBottom: 4 }}>No friends yet</p>
            <p style={{ fontSize: 13, color: '#3d5545' }}>Add friends from your Profile to compete here.</p>
          </div>
        )}

        {/* Coming soon notice */}
        {tab !== 'friends' && (
          <div style={{
            background: '#131f13', border: '1px solid rgba(16,185,129,0.08)',
            borderRadius: 12, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <span style={{ fontSize: 24, flexShrink: 0 }}>🌍</span>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: '#e8f0e8', marginBottom: 3 }}>
                You're the first adventurer!
              </p>
              <p style={{ fontSize: 12, color: '#3d5545', lineHeight: 1.4 }}>
                Global rankings unlock as more players join. Invite friends to compete!
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
