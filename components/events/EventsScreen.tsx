'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Zap, CheckCircle2, Star, Flower2, Gem,
  Sunset, UtensilsCrossed, Leaf, Waves, Store,
  TrendingDown, Hourglass, Award,
} from 'lucide-react';
import { useGameStore } from '@/store/gameStore';
import { getRankTitle } from '@/components/layout/Header';
import PhotoCaptureModal, { QuestSnapshot } from '@/components/home/PhotoCaptureModal';
import type { LucideIcon } from 'lucide-react';

// ── Event data ────────────────────────────────────────────────────────────────

interface EventQuest {
  id: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  Icon: LucideIcon;
  maxXp: number;
  maxCoins: number;
  venue: string;
}

interface Event {
  id: string;
  name: string;
  description: string;
  Icon: LucideIcon;
  color: string;
  bonusXP: number;
  bonusCoins: number;
  xpMultiplier: number;
  endsAt: string;
  totalDays: number;
  quests: EventQuest[];
}

const EVENTS: Event[] = [
  {
    id: 'spring_bloom',
    name: 'Spring Bloom Festival',
    description: 'Cherry blossoms are here! Explore nature and collect springtime memories.',
    Icon: Flower2, color: '#ec4899',
    bonusXP: 50, bonusCoins: 100, xpMultiplier: 1.25,
    endsAt: '2026-04-20', totalDays: 29,
    quests: [
      { id: 'se1', title: 'Sunset at Clearwater Beach',   description: 'Watch the sunset from Pier 60 and photograph the sky as the sun dips below the Gulf horizon.',  difficulty: 'easy',   Icon: Sunset,          maxXp: 150, maxCoins: 100, venue: 'Pier 60, Clearwater Beach' },
      { id: 'se2', title: 'Picnic at Philippe Park',       description: 'Pack lunch and spend at least an hour picnicking at Philippe Park in Safety Harbor.',              difficulty: 'easy',   Icon: UtensilsCrossed, maxXp: 120, maxCoins: 80,  venue: 'Philippe Park, Safety Harbor' },
      { id: 'se3', title: 'Spring Garden at Wall Springs', description: 'Find and photograph 3 different spring wildflowers along the boardwalk at Wall Springs County Park.', difficulty: 'medium', Icon: Leaf,            maxXp: 240, maxCoins: 160, venue: 'Wall Springs Park, Palm Harbor' },
    ],
  },
  {
    id: 'easter_hunt',
    name: 'Spring Egg Hunt',
    description: 'Spring is in the air! Find hidden treasures across the area.',
    Icon: Gem, color: '#a855f7',
    bonusXP: 60, bonusCoins: 120, xpMultiplier: 1.35,
    endsAt: '2026-04-06', totalDays: 15,
    quests: [
      { id: 'eh1', title: 'Honeymoon Island Shell Hunt', description: 'Find and photograph 5 distinctly different types of shells along the beach at Honeymoon Island.',  difficulty: 'easy',   Icon: Waves, maxXp: 110, maxCoins: 70,  venue: 'Honeymoon Island State Park' },
      { id: 'eh2', title: 'Downtown Dunedin Explore',    description: 'Visit 3 small independent shops or restaurants in downtown Dunedin you have never been to before.', difficulty: 'medium', Icon: Store, maxXp: 180, maxCoins: 120, venue: 'Downtown Dunedin' },
    ],
  },
];

// ── Reward scaling ────────────────────────────────────────────────────────────
// Linear decay: full reward at full time remaining → 15% of max at 0 days left

const MIN_FRACTION = 0.15;

function calcRewards(maxXp: number, maxCoins: number, daysLeft: number, totalDays: number) {
  const t = Math.max(0, Math.min(1, daysLeft / totalDays));
  const xp    = Math.round(maxXp    * (MIN_FRACTION + (1 - MIN_FRACTION) * t));
  const coins = Math.round(maxCoins * (MIN_FRACTION + (1 - MIN_FRACTION) * t));
  return { xp, coins, fraction: t };
}

// ── Difficulty colors ─────────────────────────────────────────────────────────
const DC: Record<string, string> = { easy: '#10b981', medium: '#f59e0b', hard: '#ef4444' };
const DL: Record<string, string> = { easy: 'Easy', medium: 'Medium', hard: 'Hard' };

// ── Component ─────────────────────────────────────────────────────────────────
export default function EventsScreen() {
  const { completedEventQuests, completeEventQuest, level } = useGameStore();
  const [activeQuest, setActiveQuest] = useState<(QuestSnapshot & { _xp: number; _coins: number }) | null>(null);
  const [rewardMsg, setRewardMsg] = useState<{ xp: number; coins: number; newLevel: number } | null>(null);
  const now = new Date();

  const handlePhotoConfirm = (photoUrl: string) => {
    if (!activeQuest) return;
    const prevLevel = useGameStore.getState().level;
    const r = completeEventQuest(
      activeQuest.id, activeQuest.title, activeQuest.difficulty,
      activeQuest._xp, activeQuest._coins, photoUrl,
    );
    setActiveQuest(null);
    setRewardMsg({ xp: r.xpGained, coins: r.coinsGained, newLevel: r.newLevel });
    setTimeout(() => setRewardMsg(null), 3000);
  };

  return (
    <div style={{ paddingBottom: 100 }}>

      {/* Header */}
      <div style={{
        background: '#111811', borderBottom: '1px solid rgba(16,185,129,0.1)',
        padding: '16px 16px 14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <Award size={20} color="#f59e0b" />
          <h1 style={{ fontWeight: 900, fontSize: 22, color: '#e8f0e8' }}>Live Events</h1>
        </div>
        <p style={{ fontSize: 12, color: '#3d5545' }}>Complete early for maximum XP &amp; coins</p>
      </div>

      {/* Reward toast */}
      <AnimatePresence>
        {rewardMsg && (
          <motion.div
            initial={{ opacity: 0, y: -16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.9 }}
            style={{
              position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)',
              zIndex: 999, pointerEvents: 'none',
              background: 'linear-gradient(135deg,#131f13,#1a2e1a)',
              border: '1px solid rgba(16,185,129,0.4)',
              borderRadius: 14, padding: '12px 22px', textAlign: 'center',
              boxShadow: '0 8px 32px rgba(16,185,129,0.2)',
            }}
          >
            <div style={{ fontSize: 11, color: '#3d5545', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>
              {rewardMsg.newLevel > level ? 'Level Up!' : 'Quest Complete!'}
            </div>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#10b981' }}>
              +{rewardMsg.xp} XP &middot; +{rewardMsg.coins} coins
            </div>
            {rewardMsg.newLevel > level && (
              <div className="shimmer-text" style={{ fontSize: 13, fontWeight: 800, marginTop: 2 }}>
                Lv {rewardMsg.newLevel} &middot; {getRankTitle(rewardMsg.newLevel)}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ padding: '14px 16px' }}>
        {EVENTS.map(event => {
          const daysLeft = Math.ceil((new Date(event.endsAt).getTime() - now.getTime()) / 86400000);
          const expired  = daysLeft < 0;
          const eventDone = event.quests.every(q => completedEventQuests.includes(q.id));
          const EventIcon = event.Icon;

          return (
            <div key={event.id} style={{
              background: '#131f13',
              border: `1px solid ${event.color}30`,
              borderRadius: 18, overflow: 'hidden', marginBottom: 16,
              opacity: expired ? 0.55 : 1,
            }}>
              {/* Top accent bar */}
              <div style={{ height: 3, background: `linear-gradient(90deg,transparent,${event.color},transparent)` }} />

              {/* Event header */}
              <div style={{ padding: '16px 16px 14px', background: `linear-gradient(135deg,${event.color}12,transparent)` }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 12 }}>
                  {/* Icon badge */}
                  <div style={{
                    width: 52, height: 52, borderRadius: 14, flexShrink: 0,
                    background: `${event.color}18`,
                    border: `1px solid ${event.color}35`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <EventIcon size={26} color={event.color} strokeWidth={1.8} />
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <h2 style={{ fontWeight: 800, fontSize: 17, color: '#e8f0e8' }}>{event.name}</h2>
                      {eventDone && (
                        <span style={{
                          fontSize: 10, fontWeight: 800, color: '#10b981',
                          background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.25)',
                          borderRadius: 99, padding: '2px 7px',
                        }}>ALL DONE</span>
                      )}
                    </div>
                    <p style={{ fontSize: 13, color: '#7a9a82', lineHeight: 1.4 }}>{event.description}</p>
                  </div>
                </div>

                {/* Timer */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: expired ? 'rgba(239,68,68,0.08)' : 'rgba(16,185,129,0.08)',
                    border: `1px solid ${expired ? 'rgba(239,68,68,0.2)' : 'rgba(16,185,129,0.2)'}`,
                    borderRadius: 99, padding: '4px 12px',
                  }}>
                    {expired
                      ? <Clock size={12} color="#ef4444" />
                      : <Hourglass size={12} color="#10b981" />
                    }
                    <span style={{ fontSize: 12, color: expired ? '#ef4444' : '#10b981', fontWeight: 700 }}>
                      {expired ? 'Expired' : daysLeft === 1 ? 'Last day!' : `${daysLeft} days left`}
                    </span>
                  </div>
                  {!expired && (
                    <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#10b981', boxShadow: '0 0 6px #10b981' }} />
                  )}
                </div>

                {/* Early bird notice */}
                {!expired && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.18)',
                    borderRadius: 10, padding: '8px 12px', marginBottom: 12,
                  }}>
                    <TrendingDown size={13} color="#f59e0b" />
                    <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>
                      Rewards decrease as the deadline approaches — complete early for max XP &amp; coins.
                    </span>
                  </div>
                )}

                {/* Bonus chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                    borderRadius: 99, padding: '4px 11px',
                    fontSize: 12, fontWeight: 700, color: '#10b981',
                  }}>
                    <Zap size={12} /> {event.xpMultiplier}x XP Multiplier
                  </div>
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                    borderRadius: 99, padding: '4px 11px',
                    fontSize: 12, fontWeight: 700, color: '#f59e0b',
                  }}>
                    <Star size={12} /> +{event.bonusCoins} Bonus Coins
                  </div>
                </div>
              </div>

              {/* Quest list */}
              <div style={{ padding: '0 16px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
                  <Star size={14} color="#e8f0e8" />
                  <p style={{ fontWeight: 700, color: '#e8f0e8', fontSize: 13 }}>Special Quests</p>
                </div>

                {event.quests.map(q => {
                  const done = completedEventQuests.includes(q.id);
                  const { xp, coins, fraction } = calcRewards(q.maxXp, q.maxCoins, daysLeft, event.totalDays);
                  const dc = DC[q.difficulty];
                  const QIcon = q.Icon;

                  // Color the reward based on how much time is left
                  const rewardColor = fraction > 0.6 ? '#10b981' : fraction > 0.3 ? '#f59e0b' : '#ef4444';

                  return (
                    <div key={q.id} style={{
                      background: done ? 'rgba(16,185,129,0.05)' : '#0c110c',
                      border: `1px solid ${done ? 'rgba(16,185,129,0.2)' : `${dc}25`}`,
                      borderRadius: 14, marginBottom: 10, overflow: 'hidden',
                      opacity: done ? 0.65 : 1,
                    }}>
                      <div style={{ padding: '12px 12px 10px', display: 'flex', gap: 10 }}>
                        {/* Quest icon */}
                        <div style={{
                          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                          background: done ? 'rgba(16,185,129,0.1)' : `${dc}15`,
                          border: `1px solid ${done ? 'rgba(16,185,129,0.2)' : `${dc}30`}`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <QIcon size={18} color={done ? '#10b981' : dc} strokeWidth={1.8} />
                        </div>

                        {/* Text */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                            <span style={{
                              fontSize: 10, fontWeight: 800, color: dc,
                              background: `${dc}15`, border: `1px solid ${dc}30`,
                              borderRadius: 99, padding: '1px 7px',
                            }}>{DL[q.difficulty].toUpperCase()}</span>
                          </div>
                          <p style={{ fontWeight: 700, color: done ? '#3d5545' : '#e8f0e8', fontSize: 13, marginBottom: 3 }}>{q.title}</p>
                          <p style={{ fontSize: 12, color: '#7a9a82', lineHeight: 1.4 }}>{q.description}</p>
                        </div>

                        {/* Complete button */}
                        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'flex-start', paddingTop: 2 }}>
                          {done ? (
                            <CheckCircle2 size={26} color="#10b981" />
                          ) : expired ? (
                            <span style={{ fontSize: 11, color: '#3d5545', paddingTop: 6 }}>Expired</span>
                          ) : (
                            <button
                              onClick={() => setActiveQuest({
                                id: q.id, title: q.title, description: q.description,
                                difficulty: q.difficulty, xpReward: xp,
                                coinReward: coins, venue: q.venue,
                                _xp: xp, _coins: coins,
                              } as QuestSnapshot & { _xp: number; _coins: number })}
                              style={{
                                width: 30, height: 30, borderRadius: '50%', border: 'none',
                                cursor: 'pointer', background: 'transparent',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                transition: 'transform 0.12s',
                              }}
                              onPointerDown={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.82)'; }}
                              onPointerUp={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; }}
                            >
                              <div style={{
                                width: 30, height: 30, borderRadius: '50%',
                                border: `2.5px solid ${dc}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: `0 0 8px ${dc}40`,
                              }}>
                                <div style={{ width: 10, height: 10, borderRadius: '50%', background: dc, opacity: 0.45 }} />
                              </div>
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Reward bar (only for active, uncompleted quests) */}
                      {!done && !expired && (
                        <div style={{ padding: '0 12px 12px' }}>
                          {/* Reward values */}
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <Zap size={12} color={rewardColor} />
                                <span style={{ fontSize: 13, fontWeight: 800, color: rewardColor }}>{xp} XP</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <Star size={12} color="#f59e0b" />
                                <span style={{ fontSize: 13, fontWeight: 800, color: '#f59e0b' }}>{coins} coins</span>
                              </div>
                            </div>
                            <span style={{ fontSize: 11, color: '#3d5545' }}>
                              max: {q.maxXp} XP
                            </span>
                          </div>

                          {/* Decay bar */}
                          <div style={{
                            height: 5, borderRadius: 3, overflow: 'hidden',
                            background: 'rgba(255,255,255,0.05)',
                          }}>
                            <motion.div
                              animate={{ width: `${fraction * 100}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              style={{
                                height: '100%', borderRadius: 3,
                                background: fraction > 0.6
                                  ? 'linear-gradient(90deg,#059669,#10b981)'
                                  : fraction > 0.3
                                    ? 'linear-gradient(90deg,#d97706,#f59e0b)'
                                    : 'linear-gradient(90deg,#dc2626,#ef4444)',
                              }}
                            />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                            <span style={{ fontSize: 10, color: '#3d5545' }}>min ({Math.round(q.maxXp * MIN_FRACTION)} XP)</span>
                            <span style={{ fontSize: 10, color: '#3d5545' }}>max ({q.maxXp} XP)</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Photo capture modal */}
      <AnimatePresence>
        {activeQuest && (
          <PhotoCaptureModal
            quest={activeQuest}
            onConfirm={handlePhotoConfirm}
            onClose={() => setActiveQuest(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
