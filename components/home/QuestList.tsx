'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sound, haptic } from '@/lib/sounds';
import { useGameStore, GOLDEN_QUESTS } from '@/store/gameStore';
import { logActivity } from '@/lib/activityDb';
import { getRankTitle } from '@/components/layout/Header';
import { Quest, QuestMode } from '@/types';
import { CheckCircle2, MapPin, Zap, Lock, RefreshCw, Users } from 'lucide-react';
import { CoinIcon } from '@/components/ui/CoinIcon';
import PhotoCaptureModal, { QuestSnapshot } from './PhotoCaptureModal';
import HardModeSelectModal from './HardModeSelectModal';

const DIFF = {
  easy:   { color: '#10b981', bg: 'rgba(16,185,129,0.08)',  border: 'rgba(16,185,129,0.18)',  label: 'Easy'   },
  medium: { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.18)',  label: 'Medium' },
  hard:   { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.18)',   label: 'Hard'   },
  golden: { color: '#fbbf24', bg: 'rgba(251,191,36,0.08)',  border: 'rgba(245,158,11,0.35)',  label: 'Golden' },
};

const MODE_CFG: Record<QuestMode, { label: string; color: string; players: string }> = {
  solo:  { label: 'Solo',  color: '#10b981', players: '1 player'  },
  duo:   { label: 'Duo',   color: '#6366f1', players: '2 players' },
  trio:  { label: 'Trio',  color: '#8b5cf6', players: '3 players' },
  squad: { label: 'Squad', color: '#f59e0b', players: '4 players' },
};

function formatElapsed(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}:${String(m % 60).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;
  return `${m}:${String(s % 60).padStart(2,'0')}`;
}

// Pulsing circle that shows elapsed time or countdown
function TimerCircle({
  color, startTime, mode, targetMs,
}: {
  color: string; startTime: number; mode: 'stopwatch' | 'timer'; targetMs?: number;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const elapsed = now - startTime;
  const isTimer = mode === 'timer' && targetMs;
  const remaining = isTimer ? Math.max(0, targetMs! - elapsed) : null;
  const displayMs = isTimer ? remaining! : elapsed;
  const text = formatElapsed(displayMs);
  const inTime = isTimer && remaining! > 0;
  const displayColor = isTimer
    ? (remaining! / targetMs! > 0.5 ? '#10b981' : remaining! / targetMs! > 0.2 ? '#f59e0b' : '#ef4444')
    : color;

  return (
    <div style={{
      width: 48, height: 48, borderRadius: '50%', flexShrink: 0,
      border: `2.5px solid ${displayColor}`,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      boxShadow: `0 0 12px ${displayColor}60`,
      background: `${displayColor}10`,
      animation: 'pulse-soft 2s ease-in-out infinite',
      cursor: 'pointer',
    }}>
      <span style={{ fontSize: 9, fontWeight: 700, color: displayColor, lineHeight: 1, marginBottom: 1 }}>
        {isTimer ? (inTime ? 'LEFT' : 'UP') : 'LIVE'}
      </span>
      <span style={{ fontSize: 10, fontWeight: 900, color: displayColor, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {text}
      </span>
    </div>
  );
}

function QuestCard({ quest, onTap, reward, timer, compact = false }: {
  quest: Quest;
  onTap: (quest: Quest) => void;
  reward: { xp: number; coins: number } | null;
  timer: { startTime: number; mode: 'stopwatch' | 'timer'; targetMs?: number } | null;
  compact?: boolean;
}) {
  const d = DIFF[quest.difficulty];
  const isGolden = quest.difficulty === 'golden';
  const isActive = !!timer;

  return (
    <motion.div layout style={{
      position: 'relative',
      background: isGolden ? 'linear-gradient(135deg,#1a1200,#231800)' : 'var(--c-card)',
      border: `1px solid ${quest.completed ? 'var(--c-border-s)' : isActive ? d.color + '55' : d.border}`,
      borderRadius: 16, marginBottom: 10, overflow: 'hidden',
      opacity: quest.completed ? 0.55 : 1, transition: 'opacity 0.3s',
      boxShadow: isActive ? `0 0 0 1px ${d.color}20, 0 4px 20px ${d.color}15` : 'none',
    }}>
      {isGolden && <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,#f59e0b,transparent)' }} />}
      {isActive  && <div style={{ height: 2, background: `linear-gradient(90deg,transparent,${d.color},transparent)` }} />}

      {/* Left bar */}
      <div style={{
        position: 'absolute', left: 0, top: 0, bottom: 0, width: 3,
        background: quest.completed ? 'var(--c-border)' : d.color,
        borderRadius: '16px 0 0 16px',
        boxShadow: quest.completed ? 'none' : `0 0 6px ${d.color}80`,
      }} />

      {/* Floating reward popup */}
      <AnimatePresence>
        {reward && (
          <motion.div
            initial={{ opacity: 1, y: 0, scale: 0.85 }}
            animate={{ opacity: 0, y: -60, scale: 1.1 }}
            exit={{}}
            transition={{ duration: 1.5, ease: 'easeOut' }}
            style={{
              position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
              zIndex: 20, pointerEvents: 'none',
              background: 'rgba(10,16,10,0.97)', border: '1px solid rgba(245,158,11,0.6)',
              borderRadius: 99, padding: '5px 16px',
              fontSize: 13, fontWeight: 900, color: '#fbbf24', whiteSpace: 'nowrap',
              boxShadow: '0 4px 20px rgba(245,158,11,0.3)',
            }}
          >
            +{reward.xp} XP · +{reward.coins} coins
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ padding: '13px 12px 13px 18px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{
            display: 'inline-block', fontSize: 10, fontWeight: 800, letterSpacing: '0.05em',
            color: d.color, background: d.bg, border: `1px solid ${d.border}`,
            borderRadius: 99, padding: '2px 8px', marginBottom: 6,
          }}>{isGolden ? '✦ ' : ''}{d.label.toUpperCase()}</span>

          <p className={isGolden ? 'shimmer-text' : ''} style={{
            fontWeight: 800, fontSize: 15, lineHeight: 1.3,
            color: quest.completed ? 'var(--c-t3)' : 'var(--c-t1)', marginBottom: 5,
          }}>{quest.title}</p>

          {!compact && (
            <p style={{ fontSize: 13, color: 'var(--c-t4)', lineHeight: 1.5, marginBottom: 8 }}>
              {quest.description}
            </p>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Zap size={11} color="var(--c-green)" />
              <span style={{ fontSize: 12, color: 'var(--c-green)', fontWeight: 700 }}>{quest.xpReward} XP</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <CoinIcon size={12} />
              <span style={{ fontSize: 12, color: 'var(--c-gold)', fontWeight: 700 }}>{quest.coinReward}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <MapPin size={11} color="var(--c-t3)" />
              <span style={{ fontSize: 12, color: 'var(--c-t3)', fontWeight: 500 }}>{quest.venue}</span>
            </div>
          </div>
        </div>

        {/* Right-side button — same position as original, just context-aware */}
        <button
          onClick={() => { if (!quest.completed) { sound('tap'); haptic(8); onTap(quest); } }}
          disabled={quest.completed}
          style={{
            width: 44, height: 44, flexShrink: 0, marginTop: 2,
            borderRadius: '50%', border: 'none',
            cursor: quest.completed ? 'default' : 'pointer',
            background: 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.12s',
          }}
          onPointerDown={e => { if (!quest.completed) (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.82)'; }}
          onPointerUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
        >
          {quest.completed ? (
            <CheckCircle2 size={28} color="var(--c-green)" />
          ) : isActive ? (
            <TimerCircle
              color={d.color}
              startTime={timer.startTime}
              mode={timer.mode}
              targetMs={timer.targetMs}
            />
          ) : (
            /* Original empty circle — first tap starts timer */
            <div style={{
              width: 30, height: 30, borderRadius: '50%',
              border: `2.5px solid ${d.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 8px ${d.color}40`,
            }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: d.color, opacity: 0.45 }} />
            </div>
          )}
        </button>
      </div>
    </motion.div>
  );
}

export default function QuestList() {
  const {
    weeklyQuests, duoQuests, trioQuests, squadQuests,
    completeQuest, completeGroupQuest, refreshWeeklyQuests,
    premium, setActiveTab, hideCompleted, compactCards,
    questMode, setQuestMode,
    activeQuestTimers, startQuestTimer, cancelQuestTimer,
    authUid, userHandle, questsGenerating, rateLimitedUntil,
  } = useGameStore();

  const [levelUpMsg, setLevelUpMsg]   = useState<string | null>(null);
  const [activeQuest, setActiveQuest] = useState<(QuestSnapshot & { _duration?: number; _timerBonus?: boolean }) | null>(null);
  const [hardPending, setHardPending] = useState<Quest | null>(null);
  const [rewards, setRewards]         = useState<Record<string, { xp: number; coins: number }>>({});
  const [showCelebration, setShowCelebration] = useState(false);
  const prevAllDone = useRef(false);

  const currentQuests = questMode === 'solo' ? weeklyQuests
    : questMode === 'duo'   ? duoQuests
    : questMode === 'trio'  ? trioQuests
    : squadQuests;

  const soloCompleted = weeklyQuests.filter(q => q.completed).length;
  const completed = questMode === 'solo' ? soloCompleted : currentQuests.filter(q => q.completed).length;
  const allDone   = completed === 10;
  const pct       = (completed / 10) * 100;

  useEffect(() => {
    if (questMode === 'solo' && allDone && !prevAllDone.current) {
      prevAllDone.current = true;
      setShowCelebration(true);
      const t = setTimeout(() => {
        refreshWeeklyQuests();
        setShowCelebration(false);
        prevAllDone.current = false;
      }, 3500);
      return () => clearTimeout(t);
    }
    if (!allDone) prevAllDone.current = false;
  }, [allDone, questMode, refreshWeeklyQuests]);

  // Called when user taps the circle button on a quest card
  const handleCardTap = (quest: Quest) => {
    const timer = activeQuestTimers[quest.id];

    if (timer) {
      // Second tap — complete the quest
      const elapsed = Math.floor((Date.now() - timer.startTime) / 1000);
      const timerBonus = !!(timer.mode === 'timer' && timer.targetMs && (Date.now() - timer.startTime) < timer.targetMs);
      const bonusXp = timerBonus ? Math.round(quest.xpReward * 0.25) : 0;
      const bonusCoins = timerBonus ? Math.round(quest.coinReward * 0.25) : 0;
      setActiveQuest({
        ...quest,
        timerBonus,
        bonusXp,
        bonusCoins,
        _duration: elapsed,
        _timerBonus: timerBonus,
      });
    } else {
      // First tap — start timer (hard quests show mode select first)
      if (quest.difficulty === 'hard') {
        setHardPending(quest);
      } else {
        startQuestTimer(quest.id, 'stopwatch');
      }
    }
  };

  const handleHardSelect = (mode: 'stopwatch' | 'timer', targetMs?: number) => {
    if (!hardPending) return;
    startQuestTimer(hardPending.id, mode, targetMs);
    setHardPending(null);
  };

  const handlePhotoConfirm = (photoUrl: string) => {
    if (!activeQuest) return;
    const prevLevel = useGameStore.getState().level;
    const duration = activeQuest._duration;
    const timerBonus = activeQuest._timerBonus;

    const r = questMode === 'solo'
      ? completeQuest(activeQuest.id, photoUrl, duration, timerBonus)
      : completeGroupQuest(activeQuest.id, photoUrl, duration, timerBonus);

    if (authUid && userHandle) {
      logActivity(authUid, {
        username: userHandle,
        questTitle: activeQuest.title,
        difficulty: activeQuest.difficulty as import('@/types').Difficulty,
        xpGained: r.xpGained,
        timestamp: Date.now(),
      });
    }

    setRewards(prev => ({ ...prev, [activeQuest.id]: { xp: r.xpGained, coins: r.coinsGained } }));
    setTimeout(() => setRewards(prev => { const n = { ...prev }; delete n[activeQuest.id]; return n; }), 1800);
    setActiveQuest(null);
    if (r.newLevel > prevLevel) {
      sound('levelup'); haptic([30, 60, 30]);
      setLevelUpMsg(`Level ${r.newLevel} · ${getRankTitle(r.newLevel)}`);
      setTimeout(() => setLevelUpMsg(null), 3000);
    } else {
      sound('complete'); haptic([15, 30, 15]);
    }
  };

  const visibleQuests = hideCompleted ? currentQuests.filter(q => !q.completed) : currentQuests;

  if (questsGenerating) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16, padding: 24 }}>
      <div style={{ width: 40, height: 40, borderRadius: '50%', border: '3px solid rgba(16,185,129,0.2)', borderTopColor: 'var(--c-green)', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: 16 }}>Generating your quests…</p>
      <p style={{ color: 'var(--c-text-muted)', fontSize: 13, textAlign: 'center' }}>Claude is finding real places near you. This takes about 15 seconds.</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (weeklyQuests.length === 0 && !questsGenerating) {
    const isRateLimited = rateLimitedUntil && rateLimitedUntil > Date.now();
    const daysLeft = isRateLimited ? Math.ceil((rateLimitedUntil - Date.now()) / 86400000) : 0;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 16, padding: 24, textAlign: 'center' }}>
        <span style={{ fontSize: 48 }}>🗺️</span>
        {isRateLimited ? (
          <>
            <p style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: 16 }}>Come back in {daysLeft} day{daysLeft !== 1 ? 's' : ''}</p>
            <p style={{ color: 'var(--c-text-muted)', fontSize: 13 }}>Free users get a new set of quests each week. Upgrade to premium for unlimited refreshes.</p>
          </>
        ) : (
          <>
            <p style={{ color: 'var(--c-text)', fontWeight: 700, fontSize: 16 }}>No quests yet</p>
            <p style={{ color: 'var(--c-text-muted)', fontSize: 13 }}>Tap below to generate personalised quests for your location.</p>
            <button
              onClick={() => refreshWeeklyQuests()}
              style={{ marginTop: 8, padding: '12px 28px', borderRadius: 14, border: 'none', background: 'var(--c-green)', color: 'white', fontWeight: 800, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Generate My Quests
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '12px 16px 100px', position: 'relative' }}>

      {/* Level-up toast */}
      <AnimatePresence>
        {levelUpMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }} transition={{ duration: 0.35 }}
            style={{
              position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)',
              zIndex: 999, pointerEvents: 'none',
              background: 'linear-gradient(135deg,#1a1200,#231800)',
              border: '1px solid rgba(245,158,11,0.6)',
              borderRadius: 14, padding: '12px 22px', textAlign: 'center',
              boxShadow: '0 8px 32px rgba(245,158,11,0.3)',
            }}
          >
            <div style={{ fontSize: 11, color: '#7a6030', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 1 }}>Level Up!</div>
            <div className="shimmer-text" style={{ fontSize: 16, fontWeight: 900 }}>{levelUpMsg}</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* All-done celebration */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 800, pointerEvents: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)',
            }}
          >
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 280, damping: 20 }}
              style={{
                background: 'linear-gradient(135deg,#0d1f0d,#1a3a1a)',
                border: '1px solid rgba(16,185,129,0.5)',
                borderRadius: 24, padding: '36px 40px', textAlign: 'center',
                boxShadow: '0 0 60px rgba(16,185,129,0.3)',
              }}
            >
              <div style={{ fontSize: 56, marginBottom: 12 }}>🏆</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: '#e8f0e8', marginBottom: 6 }}>All Quests Complete!</div>
              <div style={{ fontSize: 14, color: '#7a9a82', marginBottom: 16 }}>Streak maintained. New quests loading…</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                <RefreshCw size={16} color="#10b981" style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: 13, color: '#10b981', fontWeight: 700 }}>Refreshing in 3s</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quest mode switcher — compact pill row */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 14,
        background: 'var(--c-elevated)', border: '1px solid var(--c-border)',
        borderRadius: 12, padding: 3,
      }}>
        {(['solo', 'duo', 'trio', 'squad'] as QuestMode[]).map(m => {
          const cfg = MODE_CFG[m];
          const active = questMode === m;
          return (
            <button
              key={m}
              onClick={() => setQuestMode(m)}
              style={{
                flex: 1, padding: '8px 2px', borderRadius: 9, border: 'none',
                cursor: 'pointer', fontFamily: 'inherit',
                background: active ? cfg.color : 'transparent',
                color: active ? 'white' : 'var(--c-t3)',
                fontSize: 12, fontWeight: 700,
                transition: 'all 0.18s',
                boxShadow: active ? `0 2px 8px ${cfg.color}40` : 'none',
              }}
            >
              {m === 'solo' ? 'Solo' : m.charAt(0).toUpperCase() + m.slice(1)}
            </button>
          );
        })}
      </div>

      {/* Progress card */}
      <div style={{
        background: 'var(--c-card)', border: '1px solid var(--c-border-m)',
        borderRadius: 14, padding: '14px 16px', marginBottom: 14,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--c-t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
              {questMode === 'solo' ? 'Weekly' : MODE_CFG[questMode].label} Progress
            </p>
            <p style={{ fontSize: 22, fontWeight: 900, color: 'var(--c-t1)', lineHeight: 1 }}>
              {completed}<span style={{ fontSize: 14, color: 'var(--c-t3)', fontWeight: 600 }}>/10 quests</span>
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {questMode !== 'solo' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <Users size={12} color={MODE_CFG[questMode].color} />
                <span style={{ fontSize: 11, color: MODE_CFG[questMode].color, fontWeight: 600 }}>{MODE_CFG[questMode].players}</span>
              </div>
            )}
            <div style={{
              padding: '6px 14px', borderRadius: 99, fontWeight: 800, fontSize: 13,
              background: allDone ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.08)',
              color: allDone ? 'var(--c-gold)' : 'var(--c-green)',
              border: `1px solid ${allDone ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.2)'}`,
            }}>
              {allDone ? 'All done!' : `${10 - completed} left`}
            </div>
          </div>
        </div>
        <div style={{ height: 8, borderRadius: 4, overflow: 'hidden', background: 'var(--c-elevated)', border: '1px solid var(--c-border)' }}>
          <motion.div
            animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }}
            style={{
              height: '100%', borderRadius: 4,
              background: allDone
                ? 'linear-gradient(90deg,#d97706,#f59e0b,#fbbf24)'
                : 'linear-gradient(90deg,#059669,#10b981,#34d399)',
              boxShadow: pct > 0 ? '0 0 8px rgba(16,185,129,0.4)' : 'none',
            }}
          />
        </div>
        {allDone && <p style={{ fontSize: 12, color: 'var(--c-gold)', marginTop: 8, textAlign: 'center', fontWeight: 700 }}>🔥 Streak maintained! New quests loading…</p>}
      </div>

      {/* Premium regen button */}
      {premium && questMode === 'solo' && (
        <button
          onClick={() => refreshWeeklyQuests()}
          disabled={questsGenerating}
          style={{
            width: '100%', marginBottom: 14, padding: '11px 0', borderRadius: 12, border: '1px solid rgba(245,158,11,0.3)',
            background: 'rgba(245,158,11,0.08)', color: '#f59e0b',
            fontWeight: 700, fontSize: 13, cursor: questsGenerating ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            opacity: questsGenerating ? 0.5 : 1,
          }}
        >
          <RefreshCw size={13} style={questsGenerating ? { animation: 'spin 1s linear infinite' } : undefined} />
          {questsGenerating ? 'Generating…' : '✨ Regenerate Quests'}
        </button>
      )}

      {/* Difficulty summary pills */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {(['easy','medium','hard'] as const).map(diff => {
          const total = currentQuests.filter(q => q.difficulty === diff).length;
          const done  = currentQuests.filter(q => q.difficulty === diff && q.completed).length;
          const d = DIFF[diff];
          const allDiff = done === total && total > 0;
          return (
            <div key={diff} style={{
              flex: 1, background: allDiff ? `${d.color}12` : 'var(--c-card)',
              border: `1px solid ${allDiff ? d.color + '50' : d.border}`,
              borderRadius: 10, padding: '8px 10px', textAlign: 'center', transition: 'all 0.3s',
            }}>
              <p style={{ fontSize: 11, color: d.color, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{diff}</p>
              <p style={{ fontSize: 16, fontWeight: 900, color: 'var(--c-t1)', marginTop: 2 }}>
                {done}<span style={{ fontSize: 11, color: 'var(--c-t3)', fontWeight: 600 }}>/{total}</span>
              </p>
            </div>
          );
        })}
      </div>

      {/* Golden quests (solo only) */}
      {questMode === 'solo' && (
        premium ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 15, color: '#fbbf24' }}>✦</span>
              <span className="shimmer-text" style={{ fontWeight: 900, fontSize: 14 }}>Golden Quests</span>
              <span style={{ fontSize: 10, fontWeight: 800, color: '#f59e0b', background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 99, padding: '2px 7px' }}>PRO</span>
            </div>
            {GOLDEN_QUESTS.map(q => (
              <QuestCard
                key={q.id} quest={q}
                onTap={handleCardTap}
                reward={rewards[q.id] ?? null}
                timer={activeQuestTimers[q.id] ?? null}
              />
            ))}
            <div style={{ height: 6 }} />
          </>
        ) : (
          <button
            onClick={() => setActiveTab('profile')}
            style={{
              width: '100%', textAlign: 'left', cursor: 'pointer',
              background: 'linear-gradient(135deg,#1a1200,#231800)',
              borderWidth: 1, borderStyle: 'solid', borderColor: 'rgba(245,158,11,0.3)',
              borderRadius: 14, padding: '14px 16px', marginBottom: 14,
              display: 'flex', alignItems: 'center', gap: 12,
              fontFamily: 'inherit',
            } as React.CSSProperties}
          >
            <div style={{ height: 2, background: 'linear-gradient(90deg,transparent,#f59e0b,transparent)', margin: '-14px -16px 14px', borderRadius: '14px 14px 0 0' }} />
            <span className="float-anim" style={{ fontSize: 24, flexShrink: 0 }}>👑</span>
            <div>
              <p className="shimmer-text" style={{ fontWeight: 900, fontSize: 14, marginBottom: 3 }}>Unlock Golden Quests</p>
              <p style={{ fontSize: 12, color: '#7a6030' }}>Exclusive PRO missions with 500+ XP · <span style={{ color: '#f59e0b' }}>$1.99/mo</span></p>
            </div>
            <Lock size={16} color="#f59e0b" style={{ flexShrink: 0, marginLeft: 'auto' }} />
          </button>
        )
      )}

      {/* Quest list header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontWeight: 800, fontSize: 14, color: 'var(--c-t1)' }}>
          {questMode === 'solo' ? "This Week's Quests" : `${MODE_CFG[questMode].label} Quests`}
        </p>
        <p style={{ fontSize: 11, color: 'var(--c-t3)' }}>Palm Harbor area</p>
      </div>

      {visibleQuests.map(q => (
        <QuestCard
          key={q.id} quest={q}
          onTap={handleCardTap}
          reward={rewards[q.id] ?? null}
          timer={activeQuestTimers[q.id] ?? null}
          compact={compactCards}
        />
      ))}
      {hideCompleted && currentQuests.some(q => q.completed) && (
        <p style={{ fontSize: 12, color: 'var(--c-t3)', textAlign: 'center', marginTop: 4 }}>
          {currentQuests.filter(q => q.completed).length} completed quests hidden
        </p>
      )}

      {/* Hard mode select modal */}
      <AnimatePresence>
        {hardPending && (
          <HardModeSelectModal
            questTitle={hardPending.title}
            onSelect={handleHardSelect}
            onClose={() => { cancelQuestTimer(hardPending.id); setHardPending(null); }}
          />
        )}
      </AnimatePresence>

      {/* Photo modal */}
      <AnimatePresence>
        {activeQuest && (
          <PhotoCaptureModal
            quest={activeQuest}
            onConfirm={handlePhotoConfirm}
            onClose={() => setActiveQuest(null)}
          />
        )}
      </AnimatePresence>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-soft {
          0%, 100% { box-shadow: 0 0 8px var(--pulse-color, rgba(16,185,129,0.4)); }
          50% { box-shadow: 0 0 18px var(--pulse-color, rgba(16,185,129,0.7)); }
        }
      `}</style>
    </div>
  );
}
