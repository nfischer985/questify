'use client';
import { useState } from 'react';
import QuestList from './QuestList';
import ShopScreen from '../shop/ShopScreen';

export default function HomeScreen() {
  const [view, setView] = useState<'quests' | 'shop'>('quests');

  return (
    <div style={{ minHeight: '100%' }}>
      {/* Tab bar */}
      <div style={{ padding: '12px 16px 0' }}>
        <div style={{
          display: 'flex', background: '#0e160e',
          border: '1px solid rgba(16,185,129,0.12)',
          borderRadius: 12, padding: 3, gap: 3,
        }}>
          {(['quests', 'shop'] as const).map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                flex: 1, padding: '9px 0',
                borderRadius: 9, border: 'none', cursor: 'pointer',
                fontWeight: 700, fontSize: 13,
                background: view === v ? '#10b981' : 'transparent',
                color: view === v ? 'white' : '#3d5545',
                boxShadow: view === v ? '0 2px 8px rgba(16,185,129,0.25)' : 'none',
                transition: 'all 0.2s',
              }}
            >
              {v === 'quests' ? '⚔️  Quests' : '🏪  Shop'}
            </button>
          ))}
        </div>
      </div>

      {view === 'quests' ? <QuestList /> : <ShopScreen />}
    </div>
  );
}
