'use client';
import { useState } from 'react';
import { useGameStore } from '@/store/gameStore';
import { Difficulty, QuestMode } from '@/types';
import { X, Clock, Users, Zap } from 'lucide-react';

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const MODE_COLORS: Record<QuestMode, string> = {
  solo: '#10b981', duo: '#6366f1', trio: '#8b5cf6', squad: '#f59e0b',
};

const DIFF_COLOR: Record<Difficulty, string> = {
  easy: '#10b981', medium: '#f59e0b', hard: '#ef4444', golden: '#fbbf24',
};
const DIFF_LABEL: Record<Difficulty, string> = {
  easy: 'Easy', medium: 'Medium', hard: 'Hard', golden: 'Golden',
};

export default function LogbookView() {
  const { completedQuestLog, totalQuestsCompleted, xp, coins, streak } = useGameStore();
  const [lightbox, setLightbox] = useState<string | null>(null);

  return (
    <div style={{ padding: '8px 16px 100px' }}>
      <h2 style={{ fontWeight: 800, fontSize: 20, color: '#e8f0e8', marginBottom: 14 }}>📖 Logbook</h2>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 20 }}>
        {[
          ['⚔️', totalQuestsCompleted,    'Total Quests'],
          ['⚡', xp.toLocaleString(),     'Total XP'],
          ['🪙', coins.toLocaleString(), 'Coins'],
          ['🔥', streak,                  'Streak'],
        ].map(([icon, val, label]) => (
          <div key={String(label)} style={{
            background: '#131f13', border: '1px solid rgba(16,185,129,0.1)',
            borderRadius: 12, padding: '14px',
          }}>
            <span style={{ fontSize: 22, display: 'block', marginBottom: 6 }}>{icon}</span>
            <span style={{ fontWeight: 800, color: '#e8f0e8', fontSize: 18, display: 'block' }}>{val}</span>
            <span style={{ fontSize: 12, color: '#3d5545' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Quest history */}
      <p style={{ fontWeight: 700, color: '#e8f0e8', fontSize: 14, marginBottom: 10 }}>Recent Completions</p>
      {completedQuestLog.length === 0 ? (
        <div style={{
          background: '#131f13', border: '1px solid rgba(16,185,129,0.08)',
          borderRadius: 14, padding: '40px 20px', textAlign: 'center',
        }}>
          <span style={{ fontSize: 40, display: 'block', marginBottom: 10 }}>📜</span>
          <p style={{ fontWeight: 700, color: '#e8f0e8', marginBottom: 4 }}>Nothing here yet</p>
          <p style={{ fontSize: 13, color: '#3d5545' }}>Complete quests to fill your logbook.</p>
        </div>
      ) : (
        completedQuestLog.slice(0, 50).map((e, i) => (
          <div key={i} style={{
            background: '#131f13', border: `1px solid ${DIFF_COLOR[e.difficulty]}18`,
            borderRadius: 14, marginBottom: 10, overflow: 'hidden',
          }}>
            {/* Photo (if exists) */}
            {e.photoUrl && (
              <div
                onClick={() => setLightbox(e.photoUrl!)}
                style={{
                  height: 160, overflow: 'hidden', cursor: 'pointer', position: 'relative',
                }}
              >
                <img
                  src={e.photoUrl}
                  alt={e.title}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                {/* Difficulty tint overlay */}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: `linear-gradient(to bottom, transparent 50%, #131f13 100%)`,
                }} />
                {/* Difficulty pill on photo */}
                <span style={{
                  position: 'absolute', top: 10, left: 10,
                  fontSize: 10, fontWeight: 800, letterSpacing: '0.05em',
                  color: DIFF_COLOR[e.difficulty],
                  background: 'rgba(0,0,0,0.75)',
                  border: `1px solid ${DIFF_COLOR[e.difficulty]}50`,
                  borderRadius: 99, padding: '2px 8px',
                }}>
                  {e.difficulty === 'golden' ? '✨ ' : ''}{DIFF_LABEL[e.difficulty].toUpperCase()}
                </span>
                {/* Tap to expand hint */}
                <span style={{
                  position: 'absolute', bottom: 10, right: 10,
                  fontSize: 10, color: 'rgba(255,255,255,0.5)',
                  background: 'rgba(0,0,0,0.5)', borderRadius: 99, padding: '2px 7px',
                }}>tap to expand</span>
              </div>
            )}

            {/* Entry row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px' }}>
              {!e.photoUrl && (
                <div style={{
                  width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                  background: DIFF_COLOR[e.difficulty],
                  boxShadow: `0 0 6px ${DIFF_COLOR[e.difficulty]}60`,
                }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 }}>
                  <p style={{ fontWeight: 700, color: '#e8f0e8', fontSize: 13, margin: 0 }}>{e.title}</p>
                  {e.questMode && e.questMode !== 'solo' && (
                    <span style={{
                      fontSize: 9, fontWeight: 800, color: MODE_COLORS[e.questMode],
                      background: `${MODE_COLORS[e.questMode]}15`,
                      border: `1px solid ${MODE_COLORS[e.questMode]}30`,
                      borderRadius: 99, padding: '1px 6px', textTransform: 'uppercase',
                    }}>{e.questMode}</span>
                  )}
                  {e.timerBonus && (
                    <span style={{
                      fontSize: 9, fontWeight: 800, color: '#f59e0b',
                      background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                      borderRadius: 99, padding: '1px 6px',
                      display: 'flex', alignItems: 'center', gap: 2,
                    }}>
                      <Zap size={8} /> Timer Bonus
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <p style={{ fontSize: 11, color: '#3d5545', margin: 0 }}>
                    {new Date(e.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  {e.duration != null && e.duration > 0 && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 11, color: '#10b981', fontWeight: 600 }}>
                      <Clock size={10} /> {formatDuration(e.duration)}
                    </span>
                  )}
                  {!e.photoUrl && (
                    <span style={{
                      fontSize: 10, color: '#2d4030',
                      background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.08)',
                      borderRadius: 99, padding: '1px 6px',
                    }}>No photo</span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 700, color: '#10b981' }}>+{e.xpEarned} XP</p>
                <p style={{ fontSize: 12, color: '#f59e0b' }}>+{e.coinsEarned} 🪙</p>
              </div>
            </div>
          </div>
        ))
      )}

      {/* Lightbox */}
      {lightbox && (
        <div
          onClick={() => setLightbox(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 999,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
        >
          <button
            onClick={() => setLightbox(null)}
            style={{
              position: 'absolute', top: 20, right: 20,
              width: 36, height: 36, borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)', border: 'none',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          ><X size={18} color="white" /></button>
          <img
            src={lightbox}
            alt="Quest photo"
            style={{
              maxWidth: '100%', maxHeight: '80vh',
              borderRadius: 16, objectFit: 'contain',
              boxShadow: '0 8px 40px rgba(0,0,0,0.8)',
            }}
          />
        </div>
      )}
    </div>
  );
}
