'use client';
import { useState, useRef, useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import { subscribeToPartyChat, sendChatMessage } from '@/lib/partyChat';
import { getActivity } from '@/lib/activityDb';
import { saveParty, fetchParty } from '@/lib/partiesDb';
import { ChatMessage, ActivityItem, Friend } from '@/types';
import { UserPlus, BookOpen, Users, Settings, Trash2, Crown, Sun, Moon, Eye, EyeOff, Palette, RotateCcw, ChevronRight, Swords, Copy, Check, LogOut, Map, Ruler, Volume2, VolumeX, CircleDot, Smartphone, LayoutList, Navigation2, LogIn, Send, ArrowLeft } from 'lucide-react';
import { sound, haptic } from '@/lib/sounds';
import LogbookView from './LogbookView';
import { getRankTitle } from '@/components/layout/Header';
import { CoinIcon } from '@/components/ui/CoinIcon';
import { signOut as firebaseSignOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getProfileByUsername } from '@/lib/userDb';

const AVATAR_COLORS = [
  '#10b981', '#059669', '#6366f1', '#8b5cf6', '#ec4899',
  '#ef4444', '#f59e0b', '#3b82f6', '#06b6d4', '#84cc16',
];

function Toggle({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={() => { sound('tap'); haptic(); onToggle(); }}
      style={{
        width: 48, height: 26, borderRadius: 13, border: 'none',
        cursor: 'pointer', position: 'relative', flexShrink: 0,
        background: on ? 'var(--c-green)' : 'var(--c-elevated)',
        transition: 'background 0.2s',
      }}
    >
      <div style={{
        position: 'absolute', top: 3, width: 20, height: 20,
        borderRadius: '50%', background: 'white',
        left: on ? 25 : 3, transition: 'left 0.2s',
        boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
      }} />
    </button>
  );
}

function SettingRow({ icon, label, sub, right }: {
  icon: React.ReactNode; label: string; sub?: string; right: React.ReactNode;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '13px 16px', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 10,
          background: 'var(--c-elevated)', border: '1px solid var(--c-border)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>{icon}</div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontWeight: 700, color: 'var(--c-t1)', fontSize: 14, margin: 0 }}>{label}</p>
          {sub && <p style={{ fontSize: 12, color: 'var(--c-t3)', margin: 0, marginTop: 1 }}>{sub}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

export default function ProfileScreen() {
  const {
    username, level, xp, xpToNextLevel, coins, streak, totalQuestsCompleted,
    premium, showGoldenRing, toggleGoldenRing, togglePremium,
    friends, addFriend, removeFriend, setUsername,
    userHandle, displayName, setDisplayName,
    theme, setTheme,
    hideCompleted, setHideCompleted,
    avatarColor, setAvatarColor,
    mapStyle, setMapStyle,
    showQuestRadius, setShowQuestRadius,
    autoFollowLocation, setAutoFollowLocation,
    distanceUnit, setDistanceUnit,
    compactCards, setCompactCards,
    soundEnabled, setSoundEnabled,
    hapticEnabled, setHapticEnabled,
    resetProgress,
    currentParty, createParty, joinParty, leaveParty, setQuestMode,
    avatarUrl, setAvatarUrl, authUid, activityFeed,
  } = useGameStore();

  const [view, setView] = useState<'profile' | 'friends' | 'logbook' | 'settings' | 'party'>('profile');
  const [friendInput, setFriendInput] = useState('');
  const [friendMsg, setFriendMsg] = useState('');
  const [editing, setEditing] = useState(false);
  const [nameInput, setNameInput] = useState(displayName || username);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [partyNameInput, setPartyNameInput] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [partyMsg, setPartyMsg] = useState('');
  const [codeCopied, setCodeCopied] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [viewFriend, setViewFriend] = useState<Friend | null>(null);
  const [friendActivity, setFriendActivity] = useState<ActivityItem[]>([]);
  const [joiningParty, setJoiningParty] = useState(false);
  const xpPct = Math.min((xp / xpToNextLevel) * 100, 100);
  const rank = getRankTitle(level);
  const aColor = avatarColor || '#10b981';

  const handleAddFriend = async () => {
    if (!friendInput.trim()) return;
    const handle = friendInput.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!handle) return;
    setFriendMsg('Searching…');
    try {
      const profile = await getProfileByUsername(handle);
      if (!profile) {
        setFriendMsg('No user found with that username.');
        setTimeout(() => setFriendMsg(''), 3000);
        return;
      }
      const ok = addFriend(profile.username);
      setFriendMsg(ok ? `Added @${profile.username}!` : 'Already on your list.');
    } catch {
      setFriendMsg('Could not search. Try again.');
    }
    setFriendInput('');
    setTimeout(() => setFriendMsg(''), 3000);
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const SIZE = 200;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE;
        canvas.height = SIZE;
        const ctx = canvas.getContext('2d')!;
        // Crop to square from center
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, SIZE, SIZE);
        setAvatarUrl(canvas.toDataURL('image/jpeg', 0.7));
        setAvatarUploading(false);
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Subscribe to party chat
  useEffect(() => {
    if (!currentParty) { setChatMessages([]); return; }
    const unsub = subscribeToPartyChat(currentParty.code, setChatMessages);
    return unsub;
  }, [currentParty?.code]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Load friend activity when viewing a friend profile
  useEffect(() => {
    if (!viewFriend) return;
    setFriendActivity([]);
    getActivity(viewFriend.id).then(setFriendActivity);
  }, [viewFriend]);

  const handleSendChat = async () => {
    if (!chatInput.trim() || !currentParty || !authUid || !userHandle) return;
    const text = chatInput.trim();
    setChatInput('');
    await sendChatMessage(currentParty.code, authUid, userHandle, text);
  };

  const handleJoinParty = async () => {
    if (!joinCodeInput.trim()) return;
    setJoiningParty(true);
    const code = joinCodeInput.trim().toUpperCase();
    const party = await fetchParty(code);
    if (!party) {
      setPartyMsg('Party not found. Check the code and try again.');
      setTimeout(() => setPartyMsg(''), 3000);
    } else {
      joinParty(code);
      setJoinCodeInput('');
    }
    setJoiningParty(false);
  };

  if (view === 'logbook') return (
    <div>
      <button
        onClick={() => setView('profile')}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '14px 16px 4px', background: 'none', border: 'none',
          cursor: 'pointer', color: 'var(--c-green)', fontWeight: 600, fontSize: 14, fontFamily: 'inherit',
        }}
      >← Back</button>
      <LogbookView />
    </div>
  );

  if (viewFriend) return (
    <div style={{ paddingBottom: 100 }}>
      <button
        onClick={() => setViewFriend(null)}
        style={{
          display: 'flex', alignItems: 'center', gap: 6,
          padding: '14px 16px 4px', background: 'none', border: 'none',
          cursor: 'pointer', color: 'var(--c-green)', fontWeight: 600, fontSize: 14, fontFamily: 'inherit',
        }}
      ><ArrowLeft size={16} /> Back</button>
      <div style={{ padding: '8px 16px 0' }}>
        {/* Friend profile card */}
        <div style={{ background: 'var(--c-card)', border: '1px solid var(--c-border)', borderRadius: 18, padding: '20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', flexShrink: 0,
            background: 'linear-gradient(135deg, #059669, #10b981)',
            border: viewFriend.premium ? '2px solid #f59e0b' : '2px solid rgba(16,185,129,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 26, fontWeight: 900, color: 'white',
          }}>{viewFriend.username[0].toUpperCase()}</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 900, fontSize: 18, color: 'var(--c-t1)' }}>{viewFriend.username}</span>
              {viewFriend.premium && <span style={{ fontSize: 11, color: 'var(--c-gold)', fontWeight: 800 }}>PRO</span>}
            </div>
            <div style={{ display: 'flex', gap: 14, marginTop: 6, fontSize: 13 }}>
              <span style={{ color: 'var(--c-green)', fontWeight: 700 }}>Lv {viewFriend.level}</span>
              <span style={{ color: 'var(--c-gold)' }}>🔥 {viewFriend.streak}</span>
              <span style={{ color: 'var(--c-t2)' }}>⚔️ {viewFriend.questsCompleted} quests</span>
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: 'var(--c-t3)' }}>{viewFriend.xp.toLocaleString()} XP total</div>
          </div>
        </div>

        {/* Recent activity */}
        <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--c-t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Recent Activity</p>
        {friendActivity.length === 0
          ? <div style={{ background: 'var(--c-card)', border: '1px solid var(--c-border-s)', borderRadius: 14, padding: '24px', textAlign: 'center' }}>
              <p style={{ color: 'var(--c-t3)', fontSize: 13 }}>No recent activity yet.</p>
            </div>
          : friendActivity.map((item, i) => (
            <div key={i} style={{ background: 'var(--c-card)', border: '1px solid var(--c-border-s)', borderRadius: 12, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ fontWeight: 700, color: 'var(--c-t1)', fontSize: 14, marginBottom: 2 }}>{item.questTitle}</p>
                <p style={{ fontSize: 12, color: 'var(--c-t3)' }}>{new Date(item.timestamp).toLocaleDateString()}</p>
              </div>
              <span style={{ fontWeight: 800, color: 'var(--c-green)', fontSize: 13 }}>+{item.xpGained} XP</span>
            </div>
          ))
        }
      </div>
    </div>
  );

  const handleCopyCode = () => {
    if (!currentParty) return;
    navigator.clipboard.writeText(currentParty.code).catch(() => {});
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const NAV = [
    { id: 'party' as const,    Icon: Swords,   label: 'Party'    },
    { id: 'friends' as const,  Icon: Users,    label: 'Friends'  },
    { id: 'logbook' as const,  Icon: BookOpen, label: 'Logbook'  },
    { id: 'settings' as const, Icon: Settings, label: 'Settings' },
  ];

  return (
    <div style={{ paddingBottom: 100 }}>
      {/* Profile card */}
      <div style={{
        margin: '14px 16px',
        background: 'var(--c-card)',
        border: premium && showGoldenRing ? '1px solid rgba(245,158,11,0.4)' : '1px solid var(--c-border)',
        borderRadius: 18,
      }}>
        {premium && <div style={{ height: 2, background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)', borderRadius: '18px 18px 0 0' }} />}

        <div style={{ padding: '18px 18px 14px' }}>
          {/* Avatar row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div
                className={premium && showGoldenRing ? 'gold-glow' : ''}
                style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: avatarUrl ? 'transparent' : `linear-gradient(135deg, ${aColor}cc, ${aColor})`,
                  border: premium && showGoldenRing ? '3px solid #f59e0b' : '2px solid rgba(16,185,129,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 28, fontWeight: 900, color: 'white', userSelect: 'none',
                  overflow: 'hidden',
                }}
              >
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (displayName || username)[0].toUpperCase()
                }
              </div>

              {/* Upload overlay — premium only */}
              {premium && (
                <>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleAvatarUpload}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={avatarUploading}
                    title="Change profile picture"
                    style={{
                      position: 'absolute', inset: 0, borderRadius: '50%', border: 'none',
                      background: avatarUploading ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0)',
                      cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => { if (!avatarUploading) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0.45)'; }}
                    onMouseLeave={e => { if (!avatarUploading) (e.currentTarget as HTMLButtonElement).style.background = 'rgba(0,0,0,0)'; }}
                  >
                    {avatarUploading
                      ? <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.4)', borderTopColor: 'white', animation: 'spin 0.8s linear infinite' }} />
                      : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0 }} className="avatar-cam"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    }
                  </button>
                </>
              )}

              {/* Premium badge */}
              {premium && (
                <div style={{
                  position: 'absolute', bottom: -2, right: -2,
                  width: 22, height: 22, borderRadius: '50%',
                  background: 'var(--c-card)', border: '2px solid #f59e0b',
                  fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'var(--c-gold)', fontWeight: 900, pointerEvents: 'none',
                }}>P</div>
              )}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              {editing ? (
                <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                  <input
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { setUsername(nameInput); setDisplayName(nameInput); setEditing(false); } }}
                    autoFocus
                    style={{
                      flex: 1, padding: '6px 10px', borderRadius: 8,
                      background: 'var(--c-input)', border: '1px solid var(--c-border-m)',
                      color: 'var(--c-t1)', fontSize: 14, fontWeight: 700,
                      outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                  <button
                    onClick={() => { setUsername(nameInput); setDisplayName(nameInput); setEditing(false); }}
                    style={{
                      padding: '6px 12px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: 'var(--c-green)', color: 'white', fontWeight: 700, fontSize: 12, fontFamily: 'inherit',
                    }}
                  >Save</button>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 800, fontSize: 20, color: 'var(--c-t1)' }}>{displayName || username}</span>
                  {premium && <span className="shimmer-text" style={{ fontSize: 12, fontWeight: 800 }}>PRO</span>}
                  <button
                    onClick={() => { setNameInput(displayName || username); setEditing(true); }}
                    style={{
                      fontSize: 11, padding: '2px 8px', borderRadius: 99, border: 'none',
                      background: 'var(--c-elevated)', color: 'var(--c-t3)',
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >✏️ Edit</button>
                </div>
              )}
              {userHandle && (
                <div style={{ marginBottom: 4 }}>
                  <span style={{
                    fontSize: 12, fontWeight: 700, color: 'var(--c-green)',
                    background: 'rgba(16,185,129,0.1)', padding: '2px 8px',
                    borderRadius: 99, border: '1px solid rgba(16,185,129,0.2)',
                  }}>@{userHandle}</span>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: 'var(--c-green)', fontWeight: 700 }}>Lv {level}</span>
                <span style={{ fontSize: 12, color: 'var(--c-t3)' }}>·</span>
                <span style={{ fontSize: 12, color: 'var(--c-t2)', fontWeight: 500 }}>{rank}</span>
              </div>

              <div style={{ height: 5, borderRadius: 3, background: 'var(--c-elevated)', overflow: 'hidden', marginBottom: 3 }}>
                <div style={{
                  height: '100%', borderRadius: 3,
                  width: `${xpPct}%`,
                  background: 'linear-gradient(90deg, var(--c-green-dk), var(--c-green))',
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <p style={{ fontSize: 11, color: 'var(--c-t3)' }}>{xp} / {xpToNextLevel} XP</p>
            </div>
          </div>

          {/* Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[
              { icon: '🔥', val: streak,                 label: 'Streak' },
              { icon: '⚔️', val: totalQuestsCompleted,   label: 'Quests' },
              { icon: null, val: coins.toLocaleString(), label: 'Coins'  },
            ].map(({ icon, val, label }) => (
              <div key={label} style={{
                background: 'var(--c-elevated)', border: '1px solid var(--c-border-s)',
                borderRadius: 12, padding: '10px 8px', textAlign: 'center',
              }}>
                {icon
                  ? <span style={{ fontSize: 20, display: 'block', marginBottom: 4 }}>{icon}</span>
                  : <span style={{ display: 'flex', justifyContent: 'center', marginBottom: 4 }}><CoinIcon size={20} /></span>
                }
                <span style={{ fontWeight: 800, color: 'var(--c-t1)', fontSize: 16, display: 'block' }}>{val}</span>
                <span style={{ fontSize: 11, color: 'var(--c-t3)' }}>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Nav pills */}
      <div style={{ display: 'flex', gap: 8, padding: '0 16px', marginBottom: 0 }}>
        {NAV.map(({ id, Icon, label }) => (
          <button
            key={id}
            onClick={() => setView(view === id ? 'profile' : id)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, padding: '10px 0', borderRadius: 10,
              border: `1px solid ${view === id ? 'var(--c-border-m)' : 'var(--c-border-s)'}`,
              background: view === id ? 'rgba(16,185,129,0.1)' : 'var(--c-card)',
              color: view === id ? 'var(--c-green)' : 'var(--c-t3)',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {/* Party panel */}
      {view === 'party' && (
        <div style={{ padding: '14px 16px 0' }}>
          {currentParty ? (
            /* Active party */
            <div>
              <div style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.08))',
                border: '1px solid rgba(99,102,241,0.3)',
                borderRadius: 16, padding: '18px', marginBottom: 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div>
                    <p style={{ fontSize: 11, color: 'rgba(99,102,241,0.7)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>Active Party</p>
                    <p style={{ fontWeight: 900, color: 'var(--c-t1)', fontSize: 18 }}>{currentParty.name}</p>
                  </div>
                  <button
                    onClick={() => { leaveParty(); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '7px 12px', borderRadius: 10,
                      border: '1px solid rgba(239,68,68,0.3)',
                      background: 'rgba(239,68,68,0.08)',
                      color: '#ef4444', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  ><LogOut size={13} /> Leave</button>
                </div>

                {/* Invite code */}
                <div style={{
                  background: 'rgba(0,0,0,0.3)', borderRadius: 10, padding: '10px 14px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
                }}>
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--c-t3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>Invite Code</p>
                    <p style={{ fontWeight: 900, fontSize: 20, color: '#6366f1', letterSpacing: '0.15em', fontVariantNumeric: 'tabular-nums' }}>{currentParty.code}</p>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 5,
                      padding: '8px 14px', borderRadius: 10,
                      border: '1px solid rgba(99,102,241,0.3)',
                      background: codeCopied ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.12)',
                      color: codeCopied ? '#10b981' : '#6366f1',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >
                    {codeCopied ? <Check size={13} /> : <Copy size={13} />}
                    {codeCopied ? 'Copied!' : 'Copy'}
                  </button>
                </div>

                {/* Party mode selector */}
                <p style={{ fontSize: 12, color: 'var(--c-t3)', fontWeight: 700, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Party Size → Quest Mode</p>
                <div style={{ display: 'flex', gap: 6 }}>
                  {(['duo', 'trio', 'squad'] as const).map(m => (
                    <button
                      key={m}
                      onClick={() => { setQuestMode(m); }}
                      style={{
                        flex: 1, padding: '8px 4px', borderRadius: 10, border: 'none', cursor: 'pointer',
                        background: currentParty.mode === m ? '#6366f1' : 'rgba(99,102,241,0.08)',
                        color: currentParty.mode === m ? 'white' : '#6366f1',
                        fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                      }}
                    >
                      {m === 'duo' ? '2P Duo' : m === 'trio' ? '3P Trio' : '4P Squad'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Members */}
              <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--c-t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Members</p>
              {currentParty.members.map((m, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  background: 'var(--c-card)', border: '1px solid var(--c-border-s)',
                  borderRadius: 12, padding: '12px', marginBottom: 8,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg,#4f46e5,#6366f1)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, color: 'white', fontSize: 14,
                  }}>{m[0]?.toUpperCase()}</div>
                  <div>
                    <p style={{ fontWeight: 700, color: 'var(--c-t1)', fontSize: 14 }}>{m}</p>
                    {i === 0 && <p style={{ fontSize: 11, color: '#6366f1' }}>Party Leader</p>}
                  </div>
                </div>
              ))}

              {/* Party Chat */}
              <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--c-t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, marginTop: 16 }}>Party Chat</p>
              <div style={{
                background: 'var(--c-card)', border: '1px solid var(--c-border)',
                borderRadius: 14, overflow: 'hidden',
              }}>
                <div style={{ height: 220, overflowY: 'auto', padding: '12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {chatMessages.length === 0
                    ? <p style={{ fontSize: 12, color: 'var(--c-t3)', textAlign: 'center', marginTop: 'auto', marginBottom: 'auto' }}>No messages yet. Say hello!</p>
                    : chatMessages.map(msg => {
                        const isMe = msg.uid === authUid;
                        return (
                          <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                            {!isMe && <span style={{ fontSize: 10, color: 'var(--c-t3)', marginBottom: 2 }}>@{msg.username}</span>}
                            <div style={{
                              maxWidth: '80%', padding: '8px 12px', borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                              background: isMe ? 'var(--c-green)' : 'var(--c-elevated)',
                              color: isMe ? 'white' : 'var(--c-t1)', fontSize: 13,
                            }}>{msg.text}</div>
                          </div>
                        );
                      })
                  }
                  <div ref={chatEndRef} />
                </div>
                <div style={{ display: 'flex', borderTop: '1px solid var(--c-border)', padding: '8px' }}>
                  <input
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                    placeholder="Type a message…"
                    style={{
                      flex: 1, padding: '8px 12px', background: 'var(--c-input)',
                      border: '1px solid var(--c-border)', borderRadius: 10,
                      color: 'var(--c-t1)', fontSize: 13, outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                  <button
                    onClick={handleSendChat}
                    style={{
                      marginLeft: 8, padding: '8px 12px', borderRadius: 10, border: 'none',
                      background: 'var(--c-green)', cursor: 'pointer', display: 'flex', alignItems: 'center',
                    }}
                  ><Send size={15} color="white" /></button>
                </div>
              </div>
            </div>
          ) : (
            /* No party — create or join */
            <div>
              {partyMsg && (
                <p style={{ fontSize: 13, color: 'var(--c-green)', textAlign: 'center', marginBottom: 10, fontWeight: 600 }}>{partyMsg}</p>
              )}

              {/* Create party */}
              <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--c-t3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Create a Party</p>
              <div style={{
                background: 'var(--c-card)', border: '1px solid var(--c-border)',
                borderRadius: 14, padding: '16px', marginBottom: 16,
              }}>
                <p style={{ fontSize: 13, color: 'var(--c-t2)', marginBottom: 12, lineHeight: 1.5 }}>
                  Start a party and share the invite code with your friends to do group quests together.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={partyNameInput}
                    onChange={e => setPartyNameInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && partyNameInput.trim()) {
                        const p = createParty(partyNameInput.trim());
                        saveParty(p);
                        setPartyNameInput('');
                      }
                    }}
                    placeholder="Party name..."
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: 10,
                      background: 'var(--c-input)', border: '1px solid var(--c-border)',
                      color: 'var(--c-t1)', fontSize: 13, outline: 'none', fontFamily: 'inherit',
                    }}
                  />
                  <button
                    onClick={() => {
                      if (!partyNameInput.trim()) return;
                      const p = createParty(partyNameInput.trim());
                      saveParty(p);
                      setPartyNameInput('');
                    }}
                    style={{
                      padding: '10px 16px', borderRadius: 10, border: 'none',
                      background: '#6366f1', color: 'white',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >Create</button>
                </div>
              </div>

              {/* Join party */}
              <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--c-t3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>Join a Party</p>
              <div style={{
                background: 'var(--c-card)', border: '1px solid var(--c-border)',
                borderRadius: 14, padding: '16px',
              }}>
                <p style={{ fontSize: 13, color: 'var(--c-t2)', marginBottom: 12, lineHeight: 1.5 }}>
                  Have a friend's party code? Enter it here to join their group.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    value={joinCodeInput}
                    onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && joinCodeInput.trim()) {
                        joinParty(joinCodeInput.trim());
                        setJoinCodeInput('');
                      }
                    }}
                    placeholder="Enter code (e.g. XK7Q4P)"
                    maxLength={6}
                    style={{
                      flex: 1, padding: '10px 14px', borderRadius: 10,
                      background: 'var(--c-input)', border: '1px solid var(--c-border)',
                      color: 'var(--c-t1)', fontSize: 13, outline: 'none', fontFamily: 'inherit',
                      letterSpacing: '0.1em', textTransform: 'uppercase',
                    }}
                  />
                  <button
                    onClick={handleJoinParty}
                    disabled={joiningParty}
                    style={{
                      padding: '10px 16px', borderRadius: 10, border: 'none',
                      background: 'var(--c-green)', color: 'white',
                      fontSize: 13, fontWeight: 700, cursor: joiningParty ? 'wait' : 'pointer',
                      fontFamily: 'inherit', opacity: joiningParty ? 0.7 : 1,
                    }}
                  >{joiningParty ? '…' : 'Join'}</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Friends panel */}
      {view === 'friends' && (
        <div style={{ padding: '14px 16px 0' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <input
              value={friendInput}
              onChange={e => setFriendInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddFriend()}
              placeholder="Enter username..."
              style={{
                flex: 1, padding: '10px 14px', borderRadius: 10,
                background: 'var(--c-card)', border: '1px solid var(--c-border)',
                color: 'var(--c-t1)', fontSize: 13, outline: 'none', fontFamily: 'inherit',
              }}
            />
            <button
              onClick={handleAddFriend}
              style={{
                padding: '10px 14px', borderRadius: 10, border: 'none',
                background: 'var(--c-green)', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            ><UserPlus size={18} color="white" /></button>
          </div>
          {friendMsg && <p style={{ fontSize: 13, color: 'var(--c-green)', textAlign: 'center', marginBottom: 10, fontWeight: 600 }}>{friendMsg}</p>}
          {friends.length === 0 ? (
            <div style={{
              background: 'var(--c-card)', border: '1px solid var(--c-border-s)',
              borderRadius: 14, padding: '32px', textAlign: 'center',
            }}>
              <span style={{ fontSize: 36, display: 'block', marginBottom: 8 }}>👥</span>
              <p style={{ fontWeight: 700, color: 'var(--c-t1)', marginBottom: 4 }}>No friends yet</p>
              <p style={{ fontSize: 13, color: 'var(--c-t3)' }}>Search by username to add friends.</p>
            </div>
          ) : (
            friends.map(f => (
              <div key={f.id} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                background: 'var(--c-card)', border: '1px solid var(--c-border-s)',
                borderRadius: 12, padding: '12px', marginBottom: 8,
                cursor: 'pointer',
              }}
                onClick={() => setViewFriend(f)}
              >
                <div style={{
                  width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, #059669, #10b981)',
                  border: f.premium ? '2px solid #f59e0b' : '2px solid rgba(16,185,129,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, color: 'white', fontSize: 15,
                }}>{f.username[0].toUpperCase()}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontWeight: 700, color: 'var(--c-t1)', fontSize: 14 }}>{f.username}</span>
                    {f.premium && <span style={{ fontSize: 11, color: 'var(--c-gold)', fontWeight: 800 }}>PRO</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 10, fontSize: 12, marginTop: 2 }}>
                    <span style={{ color: 'var(--c-green)' }}>Lvl {f.level}</span>
                    <span style={{ color: 'var(--c-gold)' }}>🔥 {f.streak}</span>
                    <span style={{ color: 'var(--c-t2)' }}>⚔️ {f.questsCompleted}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <ChevronRight size={15} color="var(--c-t3)" />
                  <button
                    onClick={e => { e.stopPropagation(); removeFriend(f.id); }}
                    style={{
                      padding: '7px', borderRadius: 8, border: 'none',
                      background: 'rgba(239,68,68,0.1)', cursor: 'pointer',
                      display: 'flex', alignItems: 'center',
                    }}
                  ><Trash2 size={15} color="#ef4444" /></button>
                </div>
              </div>
            ))
          )}

          {/* Activity feed */}
          {activityFeed.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--c-t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Friend Activity</p>
              {activityFeed.slice(0, 10).map((item, i) => (
                <div key={i} style={{
                  background: 'var(--c-card)', border: '1px solid var(--c-border-s)',
                  borderRadius: 12, padding: '10px 14px', marginBottom: 8,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--c-t1)', marginBottom: 2 }}>
                      <span style={{ color: 'var(--c-green)' }}>@{item.username}</span> completed a quest
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--c-t3)' }}>{item.questTitle}</p>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 800, color: 'var(--c-green)', flexShrink: 0 }}>+{item.xpGained} XP</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Settings panel */}
      {view === 'settings' && (
        <div style={{ padding: '14px 16px 0' }}>

          {/* === APPEARANCE === */}
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--c-t3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Appearance</p>
          <div style={{
            background: 'var(--c-card)', border: '1px solid var(--c-border)',
            borderRadius: 14, overflow: 'hidden', marginBottom: 14,
          }}>
            {/* Theme toggle */}
            <SettingRow
              icon={theme === 'dark' ? <Moon size={16} color="var(--c-t2)" /> : <Sun size={16} color="var(--c-gold)" />}
              label={theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
              sub="Switch between dark and light theme"
              right={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Moon size={13} color={theme === 'dark' ? 'var(--c-green)' : 'var(--c-t3)'} />
                  <Toggle on={theme === 'light'} onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
                  <Sun size={13} color={theme === 'light' ? 'var(--c-gold)' : 'var(--c-t3)'} />
                </div>
              }
            />

            <div style={{ height: 1, background: 'var(--c-border-s)', margin: '0 16px' }} />

            {/* Avatar color */}
            <div>
              <SettingRow
                icon={<Palette size={16} color="var(--c-t2)" />}
                label="Avatar Color"
                sub="Customize your profile avatar"
                right={
                  <button
                    onClick={() => setShowColorPicker(v => !v)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '6px 10px', borderRadius: 8, border: '1px solid var(--c-border)',
                      background: 'var(--c-elevated)', cursor: 'pointer',
                    }}
                  >
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: aColor, border: '2px solid rgba(255,255,255,0.3)' }} />
                    <ChevronRight size={13} color="var(--c-t3)" style={{ transform: showColorPicker ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                  </button>
                }
              />
              {showColorPicker && (
                <div style={{ padding: '0 16px 14px', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {AVATAR_COLORS.map(c => (
                    <button
                      key={c}
                      onClick={() => { setAvatarColor(c); setShowColorPicker(false); }}
                      style={{
                        width: 34, height: 34, borderRadius: '50%', border: 'none', cursor: 'pointer',
                        background: c,
                        boxShadow: aColor === c ? `0 0 0 3px var(--c-bg), 0 0 0 5px ${c}` : 'none',
                        transform: aColor === c ? 'scale(1.1)' : 'scale(1)',
                        transition: 'all 0.15s',
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* === QUESTS === */}
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--c-t3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Quests</p>
          <div style={{
            background: 'var(--c-card)', border: '1px solid var(--c-border)',
            borderRadius: 14, overflow: 'hidden', marginBottom: 14,
          }}>
            <SettingRow
              icon={hideCompleted ? <EyeOff size={16} color="var(--c-t2)" /> : <Eye size={16} color="var(--c-t2)" />}
              label="Hide Completed"
              sub="Hide finished quests from the list"
              right={<Toggle on={hideCompleted} onToggle={() => setHideCompleted(!hideCompleted)} />}
            />
            <div style={{ height: 1, background: 'var(--c-border-s)', margin: '0 16px' }} />
            <SettingRow
              icon={<Ruler size={16} color="var(--c-t2)" />}
              label="Distance Units"
              sub="How distances are displayed"
              right={
                <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--c-border)' }}>
                  {(['mi', 'km'] as const).map(u => (
                    <button
                      key={u}
                      onClick={() => { sound('tap'); haptic(); setDistanceUnit(u); }}
                      style={{
                        padding: '6px 14px', border: 'none', cursor: 'pointer',
                        background: distanceUnit === u ? 'var(--c-green)' : 'var(--c-elevated)',
                        color: distanceUnit === u ? 'white' : 'var(--c-t3)',
                        fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
                        transition: 'all 0.15s',
                      }}
                    >{u.toUpperCase()}</button>
                  ))}
                </div>
              }
            />
            <div style={{ height: 1, background: 'var(--c-border-s)', margin: '0 16px' }} />
            <SettingRow
              icon={<LayoutList size={16} color="var(--c-t2)" />}
              label="Compact Cards"
              sub="Hide quest descriptions to save space"
              right={<Toggle on={compactCards} onToggle={() => setCompactCards(!compactCards)} />}
            />
          </div>

          {/* === MAP === */}
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--c-t3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Map</p>
          <div style={{
            background: 'var(--c-card)', border: '1px solid var(--c-border)',
            borderRadius: 14, overflow: 'hidden', marginBottom: 14,
          }}>
            <SettingRow
              icon={<Map size={16} color="var(--c-t2)" />}
              label="Map Style"
              sub={mapStyle === 'satellite' ? 'Satellite imagery' : 'Street map view'}
              right={
                <div style={{ display: 'flex', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--c-border)' }}>
                  {(['standard', 'satellite'] as const).map(s => (
                    <button
                      key={s}
                      onClick={() => { sound('tap'); haptic(); setMapStyle(s); }}
                      style={{
                        padding: '6px 10px', border: 'none', cursor: 'pointer',
                        background: mapStyle === s ? 'var(--c-green)' : 'var(--c-elevated)',
                        color: mapStyle === s ? 'white' : 'var(--c-t3)',
                        fontSize: 11, fontWeight: 700, fontFamily: 'inherit',
                        transition: 'all 0.15s',
                      }}
                    >{s === 'standard' ? '🗺 Street' : '🛰 Satellite'}</button>
                  ))}
                </div>
              }
            />
            <div style={{ height: 1, background: 'var(--c-border-s)', margin: '0 16px' }} />
            <div style={{ height: 1, background: 'var(--c-border-s)', margin: '0 16px' }} />
            <SettingRow
              icon={<CircleDot size={16} color="var(--c-t2)" />}
              label="Quest Radius Circles"
              sub="Show proximity circles around quest pins"
              right={<Toggle on={showQuestRadius} onToggle={() => setShowQuestRadius(!showQuestRadius)} />}
            />
            <div style={{ height: 1, background: 'var(--c-border-s)', margin: '0 16px' }} />
            <SettingRow
              icon={<Navigation2 size={16} color="var(--c-t2)" />}
              label="Auto-follow Location"
              sub="Map keeps your GPS dot centered"
              right={<Toggle on={autoFollowLocation} onToggle={() => setAutoFollowLocation(!autoFollowLocation)} />}
            />
          </div>

          {/* === SOUND === */}
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--c-t3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Sound</p>
          <div style={{
            background: 'var(--c-card)', border: '1px solid var(--c-border)',
            borderRadius: 14, overflow: 'hidden', marginBottom: 14,
          }}>
            <SettingRow
              icon={soundEnabled ? <Volume2 size={16} color="var(--c-t2)" /> : <VolumeX size={16} color="var(--c-t2)" />}
              label="Sound Effects"
              sub="Play sounds on quest completion and rewards"
              right={<Toggle on={soundEnabled} onToggle={() => setSoundEnabled(!soundEnabled)} />}
            />
            <div style={{ height: 1, background: 'var(--c-border-s)', margin: '0 16px' }} />
            <SettingRow
              icon={<Smartphone size={16} color="var(--c-t2)" />}
              label="Haptic Feedback"
              sub="Vibrate on taps and actions"
              right={<Toggle on={hapticEnabled} onToggle={() => setHapticEnabled(!hapticEnabled)} />}
            />
          </div>

          {/* === PREMIUM === */}
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--c-t3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Premium</p>
          <div style={{
            background: premium ? 'linear-gradient(135deg, var(--c-card), rgba(245,158,11,0.06))' : 'var(--c-card)',
            border: premium ? '1px solid rgba(245,158,11,0.35)' : '1px solid var(--c-border)',
            borderRadius: 14, overflow: 'hidden', marginBottom: 10,
          }}>
            {premium && <div style={{ height: 1, background: 'linear-gradient(90deg, transparent, #f59e0b, transparent)' }} />}
            <SettingRow
              icon={<Crown size={16} color="#f59e0b" />}
              label={premium ? 'Premium Active' : 'Questify Premium'}
              sub={premium ? 'Golden quests, badge & ring unlocked' : 'Golden quests, badge, ring · $1.99/mo'}
              right={<Toggle on={premium} onToggle={togglePremium} />}
            />
            {premium && (
              <>
                <div style={{ height: 1, background: 'var(--c-border-s)', margin: '0 16px' }} />
                <SettingRow
                  icon={<span style={{ fontSize: 16 }}>💍</span>}
                  label="Gold Profile Ring"
                  sub="Show gold ring around your avatar"
                  right={<Toggle on={showGoldenRing} onToggle={toggleGoldenRing} />}
                />
              </>
            )}
          </div>

          {/* === DANGER ZONE === */}
          <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--c-t3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6, marginTop: 4 }}>Danger Zone</p>
          <div style={{
            background: 'var(--c-card)', border: '1px solid rgba(239,68,68,0.15)',
            borderRadius: 14, overflow: 'hidden', marginBottom: 20,
          }}>
            {!showResetConfirm ? (
              <SettingRow
                icon={<RotateCcw size={16} color="#ef4444" />}
                label="Reset Progress"
                sub="Wipe all XP, coins, quests, and logbook"
                right={
                  <button
                    onClick={() => setShowResetConfirm(true)}
                    style={{
                      padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)',
                      background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >Reset</button>
                }
              />
            ) : (
              <div style={{ padding: '16px' }}>
                <p style={{ fontWeight: 700, color: '#ef4444', fontSize: 14, marginBottom: 6 }}>Are you sure?</p>
                <p style={{ fontSize: 12, color: 'var(--c-t3)', marginBottom: 14, lineHeight: 1.5 }}>
                  This will permanently erase all your progress, coins, XP, quest history, and logbook photos.
                </p>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 10, border: '1px solid var(--c-border)',
                      background: 'var(--c-elevated)', color: 'var(--c-t2)',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >Cancel</button>
                  <button
                    onClick={() => { resetProgress(); setShowResetConfirm(false); setView('profile'); }}
                    style={{
                      flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                      background: '#ef4444', color: 'white',
                      fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >Yes, Reset</button>
                </div>
              </div>
            )}
            <div style={{ height: 1, background: 'var(--c-border-s)', margin: '0 16px' }} />
            <SettingRow
              icon={<LogIn size={16} color="#ef4444" style={{ transform: 'scaleX(-1)' }} />}
              label="Sign Out"
              sub="You'll need to sign in again"
              right={
                <button
                  onClick={() => firebaseSignOut(auth)}
                  style={{
                    padding: '7px 14px', borderRadius: 8, border: '1px solid rgba(239,68,68,0.3)',
                    background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                    fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >Sign out</button>
              }
            />
          </div>
        </div>
      )}
    </div>
  );
}

