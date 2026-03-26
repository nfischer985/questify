'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { Lock, CheckCircle2, Crown } from 'lucide-react';

export default function ShopScreen() {
  const { shopItems, coins, level, buyShopItem, premium, togglePremium } = useGameStore();
  const [tab, setTab] = useState<'items' | 'premium'>('items');
  const [toast, setToast] = useState('');

  const handleBuy = (itemId: string) => {
    const ok = buyShopItem(itemId);
    const item = shopItems.find(i => i.id === itemId);
    if (ok) setToast('✨  Purchased!');
    else if (item && level < item.levelRequired) setToast(`🔒  Requires Level ${item.levelRequired}`);
    else if (item && coins < item.cost) setToast('🪙  Not enough coins');
    else setToast('Already owned');
    setTimeout(() => setToast(''), 2000);
  };

  const S = { fontFamily: 'inherit' };

  return (
    <div style={{ padding: '12px 16px 100px' }}>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{
              background: '#131f13', border: '1px solid rgba(16,185,129,0.3)',
              borderRadius: 12, padding: '10px 16px', marginBottom: 12,
              textAlign: 'center', color: '#10b981', fontWeight: 700, fontSize: 14,
            }}
          >{toast}</motion.div>
        )}
      </AnimatePresence>

      {/* Tab row */}
      <div style={{
        display: 'flex', background: '#0e160e',
        border: '1px solid rgba(16,185,129,0.12)',
        borderRadius: 12, padding: 3, gap: 3, marginBottom: 14,
      }}>
        {(['items', 'premium'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '9px 0', borderRadius: 9,
              border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
              background: t === 'items'
                ? (tab === t ? '#10b981' : 'transparent')
                : (tab === t ? 'linear-gradient(135deg, #c77b0a, #f59e0b)' : 'transparent'),
              color: tab === t ? 'white' : '#3d5545',
              transition: 'all 0.2s',
              ...S,
            }}
          >
            {t === 'items' ? '🏪  Items' : '👑  Premium'}
          </button>
        ))}
      </div>

      {/* ── ITEMS TAB ── */}
      {tab === 'items' && (
        <>
          {/* Balance */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: '#131f13', border: '1px solid rgba(245,158,11,0.15)',
            borderRadius: 12, padding: '12px 14px', marginBottom: 14,
          }}>
            <span style={{ fontSize: 22 }}>🪙</span>
            <div>
              <p style={{ fontSize: 11, color: '#3d5545', marginBottom: 1 }}>Your balance</p>
              <p style={{ fontSize: 18, fontWeight: 800, color: '#fbbf24' }}>{coins.toLocaleString()} coins</p>
            </div>
          </div>

          {/* Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {shopItems.map((item) => {
              const locked = level < item.levelRequired;
              const afford = coins >= item.cost;
              return (
                <div
                  key={item.id}
                  style={{
                    background: item.owned ? 'rgba(16,185,129,0.06)' : '#131f13',
                    border: `1px solid ${item.owned ? 'rgba(16,185,129,0.25)' : 'rgba(16,185,129,0.1)'}`,
                    borderRadius: 14, padding: '14px 12px',
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    opacity: locked ? 0.5 : 1,
                  }}
                >
                  <span style={{ fontSize: 30, marginBottom: 8 }}>{item.icon}</span>
                  <p style={{ fontWeight: 700, color: '#e8f0e8', fontSize: 13, textAlign: 'center', marginBottom: 4 }}>{item.name}</p>
                  <p style={{ fontSize: 11, color: '#7a9a82', textAlign: 'center', lineHeight: 1.4, marginBottom: 10, flex: 1 }}>{item.description}</p>

                  {locked ? (
                    <div style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      fontSize: 12, color: '#3d5545', fontWeight: 600,
                    }}>
                      <Lock size={12} color="#3d5545" /> Lvl {item.levelRequired}
                    </div>
                  ) : item.owned ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#10b981', fontSize: 12, fontWeight: 700 }}>
                      <CheckCircle2 size={14} color="#10b981" /> Owned
                    </div>
                  ) : (
                    <button
                      onClick={() => handleBuy(item.id)}
                      style={{
                        width: '100%', padding: '8px 0',
                        borderRadius: 8, border: 'none', cursor: 'pointer',
                        fontWeight: 700, fontSize: 12,
                        background: afford ? 'linear-gradient(135deg, #059669, #10b981)' : '#0e160e',
                        color: afford ? 'white' : '#3d5545',
                        ...S,
                      }}
                    >
                      🪙 {item.cost.toLocaleString()}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ── PREMIUM TAB ── */}
      {tab === 'premium' && (
        <div>
          {/* Hero card */}
          <div style={{
            background: 'linear-gradient(160deg, #1a1200, #221800)',
            border: '1px solid rgba(245,158,11,0.4)',
            borderRadius: 18, overflow: 'hidden', marginBottom: 16,
          }}>
            <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)' }} />
            <div style={{ padding: '24px 20px', textAlign: 'center' }}>
              <span className="float-anim" style={{ fontSize: 44, display: 'block', marginBottom: 10 }}>👑</span>
              <p className="shimmer-text" style={{ fontSize: 22, fontWeight: 900, marginBottom: 4 }}>Questify PRO</p>
              <p style={{ fontSize: 13, color: '#7a6030', marginBottom: 16 }}>Unlock the full adventurer experience</p>

              {/* Price pill */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                borderRadius: 99, padding: '6px 18px', marginBottom: 18,
              }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: '#fbbf24' }}>$1.99</span>
                <span style={{ fontSize: 13, color: '#7a6030' }}>/ month</span>
              </div>

              {/* Toggle button */}
              <button
                onClick={togglePremium}
                style={{
                  width: '100%', padding: '14px 0',
                  borderRadius: 14, cursor: 'pointer',
                  fontWeight: 800, fontSize: 15,
                  background: premium
                    ? 'rgba(245,158,11,0.08)'
                    : 'linear-gradient(135deg, #c77b0a, #f59e0b)',
                  color: premium ? '#7a6030' : 'white',
                  border: premium ? '1px solid rgba(245,158,11,0.2)' : 'none',
                  boxShadow: premium ? 'none' : '0 4px 16px rgba(245,158,11,0.35)',
                  ...S,
                }}
              >
                {premium ? '✓  Premium Active — Tap to Cancel' : '✨  Activate Premium (Demo)'}
              </button>

              {!premium && (
                <p style={{ fontSize: 11, color: '#3d5545', marginTop: 8 }}>
                  Payment coming soon · free demo for now
                </p>
              )}
            </div>
          </div>

          {/* Features */}
          {[
            { icon: '✨', title: 'Golden Quests', desc: '2 exclusive quests every week with up to 600 XP and 500 coins.' },
            { icon: '🧭', title: 'Compass Badge', desc: 'Golden compass badge next to your name on leaderboards & profiles.' },
            { icon: '⭕', title: 'Gold Profile Ring', desc: 'Glowing gold border around your avatar. Toggle on/off in settings.' },
            { icon: '🌟', title: 'Exclusive Items', desc: 'Premium-only shop items and all future PRO features.' },
          ].map((f, i) => (
            <div
              key={f.title}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12,
                background: '#131f13', border: '1px solid rgba(245,158,11,0.1)',
                borderRadius: 14, padding: '14px', marginBottom: 10,
              }}
            >
              <div style={{
                width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
              }}>{f.icon}</div>
              <div>
                <p style={{ fontWeight: 700, color: '#e8f0e8', fontSize: 14, marginBottom: 3 }}>{f.title}</p>
                <p style={{ fontSize: 12, color: '#7a9a82', lineHeight: 1.4 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
