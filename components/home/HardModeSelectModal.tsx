'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Timer, Hourglass, X, Zap } from 'lucide-react';

interface Props {
  questTitle: string;
  onSelect: (mode: 'stopwatch' | 'timer', targetMs?: number) => void;
  onClose: () => void;
}

const TIME_PRESETS = [
  { label: '15 min', ms: 15 * 60 * 1000 },
  { label: '30 min', ms: 30 * 60 * 1000 },
  { label: '45 min', ms: 45 * 60 * 1000 },
  { label: '1 hr',  ms: 60 * 60 * 1000 },
  { label: '2 hr',  ms: 120 * 60 * 1000 },
  { label: '3 hr',  ms: 180 * 60 * 1000 },
];

export default function HardModeSelectModal({ questTitle, onSelect, onClose }: Props) {
  const [mode, setMode] = useState<'stopwatch' | 'timer' | null>(null);
  const [selectedMs, setSelectedMs] = useState<number>(TIME_PRESETS[1].ms);

  const confirm = () => {
    if (!mode) return;
    onSelect(mode, mode === 'timer' ? selectedMs : undefined);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: 'rgba(0,0,0,0.88)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          width: '100%', maxWidth: 430,
          background: '#111811',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: '24px 24px 0 0',
          overflow: 'hidden',
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
        }}
      >
        <div style={{ height: 3, background: 'linear-gradient(90deg, transparent, #ef4444, transparent)' }} />

        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }} />
        </div>

        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16,
          width: 32, height: 32, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}><X size={16} color="#7a9a82" /></button>

        <div style={{ padding: '0 20px 24px' }}>
          <div style={{ marginBottom: 20 }}>
            <span style={{
              display: 'inline-block', fontSize: 10, fontWeight: 800,
              color: '#ef4444', background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.25)',
              borderRadius: 99, padding: '2px 9px', marginBottom: 8, letterSpacing: '0.05em',
            }}>HARD QUEST</span>
            <h2 style={{ fontWeight: 900, fontSize: 17, color: '#e8f0e8', lineHeight: 1.3, marginBottom: 4 }}>
              {questTitle}
            </h2>
            <p style={{ fontSize: 13, color: '#6b8a72' }}>Choose your challenge mode:</p>
          </div>

          {/* Mode cards */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
            {/* Stopwatch */}
            <button
              onClick={() => setMode('stopwatch')}
              style={{
                flex: 1, padding: '18px 12px', borderRadius: 16, border: 'none', cursor: 'pointer',
                background: mode === 'stopwatch' ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.03)',
                outline: mode === 'stopwatch' ? '2px solid #10b981' : '1px solid rgba(16,185,129,0.15)',
                transition: 'all 0.15s', textAlign: 'center',
              }}
            >
              <Hourglass size={28} color={mode === 'stopwatch' ? '#10b981' : '#3d5545'} style={{ marginBottom: 10 }} />
              <p style={{ fontWeight: 800, color: mode === 'stopwatch' ? '#10b981' : '#e8f0e8', fontSize: 15, marginBottom: 6 }}>
                Stopwatch
              </p>
              <p style={{ fontSize: 12, color: '#3d5545', lineHeight: 1.4 }}>
                Track how long your quest takes. Duration saved in logbook.
              </p>
            </button>

            {/* Timer */}
            <button
              onClick={() => setMode('timer')}
              style={{
                flex: 1, padding: '18px 12px', borderRadius: 16, border: 'none', cursor: 'pointer',
                background: mode === 'timer' ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.03)',
                outline: mode === 'timer' ? '2px solid #f59e0b' : '1px solid rgba(245,158,11,0.12)',
                transition: 'all 0.15s', textAlign: 'center',
              }}
            >
              <Timer size={28} color={mode === 'timer' ? '#f59e0b' : '#3d5545'} style={{ marginBottom: 10 }} />
              <p style={{ fontWeight: 800, color: mode === 'timer' ? '#f59e0b' : '#e8f0e8', fontSize: 15, marginBottom: 6 }}>
                Timer
              </p>
              <p style={{ fontSize: 12, color: '#3d5545', lineHeight: 1.4 }}>
                Set a target time. Finish before it runs out for
              </p>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4, marginTop: 4 }}>
                <Zap size={11} color="#f59e0b" />
                <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700 }}>+25% bonus XP & coins</span>
              </div>
            </button>
          </div>

          {/* Timer presets (only shown if timer selected) */}
          {mode === 'timer' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ marginBottom: 20 }}
            >
              <p style={{ fontSize: 12, color: '#3d5545', fontWeight: 700, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Set your target time:
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {TIME_PRESETS.map(p => (
                  <button
                    key={p.ms}
                    onClick={() => setSelectedMs(p.ms)}
                    style={{
                      padding: '8px 14px', borderRadius: 99, border: 'none', cursor: 'pointer',
                      background: selectedMs === p.ms ? '#f59e0b' : 'rgba(245,158,11,0.08)',
                      color: selectedMs === p.ms ? '#1a1000' : '#f59e0b',
                      fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
                      transition: 'all 0.15s',
                    }}
                  >{p.label}</button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Confirm */}
          <button
            onClick={confirm}
            disabled={!mode}
            style={{
              width: '100%', padding: '15px', borderRadius: 14, border: 'none',
              cursor: mode ? 'pointer' : 'not-allowed',
              fontWeight: 800, fontSize: 15, fontFamily: 'inherit',
              background: !mode
                ? 'rgba(255,255,255,0.04)'
                : mode === 'timer'
                  ? 'linear-gradient(135deg, #d97706, #f59e0b)'
                  : 'linear-gradient(135deg, #059669, #10b981)',
              color: mode ? 'white' : '#3d5545',
              transition: 'all 0.2s',
              boxShadow: mode ? (mode === 'timer' ? '0 4px 16px rgba(245,158,11,0.3)' : '0 4px 16px rgba(16,185,129,0.3)') : 'none',
            }}
          >
            {!mode ? 'Choose a Mode' : `▶ Start${mode === 'timer' ? ` ${TIME_PRESETS.find(p => p.ms === selectedMs)?.label} Timer` : ' Stopwatch'}`}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
