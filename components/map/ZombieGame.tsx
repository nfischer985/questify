'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useGameStore } from '@/store/gameStore';
import { X, Heart } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────
interface Zombie {
  id: string;
  lat: number;
  lng: number;
  path: [number, number][];   // road waypoints remaining
  pathStep: number;
  routedAt: number;           // tick when last OSRM-routed
  routing: boolean;           // currently fetching a route
}
interface Pickup { id: string; lat: number; lng: number; type: 'medkit' | 'key'; }
type Phase = 'setup' | 'playing' | 'gameover' | 'victory';

// ── Constants ─────────────────────────────────────────────────────────────────
const TICK_MS        = 800;
const ZOMBIE_KM_TICK = 0.0022;  // ~10 km/h — jog-or-die speed
const HIT_RANGE      = 0.025;
const COLLECT_RANGE  = 0.050;
const HOME_RANGE     = 0.060;
const MEDKIT_HEAL    = 30;
const MAX_HP         = 100;
const KEYS_TO_WIN    = 3;
const MAX_ZOMBIES    = 20;       // large hordes
const SPAWN_BATCH    = 3;        // zombies per spawn wave
const REROUTE_TICKS  = 15;

// ── Helpers ───────────────────────────────────────────────────────────────────
function distKm(a1: number, o1: number, a2: number, o2: number) {
  const R = 6371, r = Math.PI / 180;
  const da = (a2 - a1) * r, dо = (o2 - o1) * r;
  const a = Math.sin(da / 2) ** 2 + Math.cos(a1 * r) * Math.cos(a2 * r) * Math.sin(dо / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function nearby(lat: number, lng: number, minKm: number, maxKm: number) {
  const angle = Math.random() * Math.PI * 2;
  const d = minKm + Math.random() * (maxKm - minKm);
  return {
    lat: lat + (d * Math.cos(angle)) / 111,
    lng: lng + (d * Math.sin(angle)) / (111 * Math.cos((lat * Math.PI) / 180)),
  };
}

// Move zombie one tick along its road path
function advanceAlongPath(z: Zombie, speedKm: number): Zombie {
  if (z.path.length === 0 || z.pathStep >= z.path.length) return z;
  let { lat, lng, pathStep } = z;
  let remaining = speedKm;
  while (remaining > 0 && pathStep < z.path.length) {
    const [tLat, tLng] = z.path[pathStep];
    const d = distKm(lat, lng, tLat, tLng);
    if (d <= remaining) {
      lat = tLat; lng = tLng; remaining -= d; pathStep++;
    } else {
      const r = remaining / d;
      lat += (tLat - lat) * r;
      lng += (tLng - lng) * r;
      remaining = 0;
    }
  }
  return { ...z, lat, lng, pathStep };
}

// Straight-line fallback when OSRM unavailable
function approachStraight(z: Zombie, pLat: number, pLng: number, speedKm: number): Zombie {
  const d = distKm(z.lat, z.lng, pLat, pLng);
  if (d < 0.002) return z;
  const r = Math.min(speedKm / d, 1);
  return { ...z, lat: z.lat + (pLat - z.lat) * r, lng: z.lng + (pLng - z.lng) * r };
}

// Fetch road route via OSRM (foot profile, free public server)
async function fetchRoadPath(
  fromLat: number, fromLng: number,
  toLat: number,   toLng: number,
): Promise<[number, number][] | null> {
  try {
    const url =
      `https://router.project-osrm.org/route/v1/foot/` +
      `${fromLng},${fromLat};${toLng},${toLat}` +
      `?overview=full&geometries=geojson`;
    const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.[0]) return null;
    // GeoJSON coords are [lng, lat]; convert to [lat, lng] for Leaflet
    return (data.routes[0].geometry.coordinates as [number, number][])
      .map(([lng, lat]) => [lat, lng] as [number, number]);
  } catch {
    return null;
  }
}

// ── Icons ─────────────────────────────────────────────────────────────────────
const PLAYER_ICON = L.divIcon({
  html: `<div style="width:22px;height:22px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 14px rgba(59,130,246,0.9)"></div>`,
  className: '', iconSize: [22, 22], iconAnchor: [11, 11],
});
const HOME_ICON = L.divIcon({
  html: `<div style="font-size:36px;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.9));line-height:1">🏠</div>`,
  className: '', iconSize: [40, 40], iconAnchor: [20, 20],
});
function makePickupIcon(type: 'medkit' | 'key') {
  const bg = type === 'medkit' ? '#10b981' : '#f59e0b';
  const em = type === 'medkit' ? '➕' : '🗝';
  return L.divIcon({
    html: `<div style="width:34px;height:34px;border-radius:50%;background:${bg};border:2.5px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;font-size:16px;line-height:1">${em}</div>`,
    className: '', iconSize: [34, 34], iconAnchor: [17, 17],
  });
}
const MEDKIT_ICON = makePickupIcon('medkit');
const KEY_ICON    = makePickupIcon('key');

function makeZombieIcon() {
  return L.divIcon({
    html: '<div class="z-dot"></div>',
    className: '', iconSize: [20, 20], iconAnchor: [10, 10],
  });
}

// ── Inner map helpers ─────────────────────────────────────────────────────────
function PlayerTracker({ onPos }: { onPos: (lat: number, lng: number) => void }) {
  const map = useMap();
  const flew = useRef(false);
  useEffect(() => {
    map.locate({ watch: true, enableHighAccuracy: true });
    const cb = (e: L.LocationEvent) => {
      onPos(e.latlng.lat, e.latlng.lng);
      if (!flew.current) { map.flyTo(e.latlng, 17, { duration: 1.2 }); flew.current = true; }
    };
    map.on('locationfound', cb);
    return () => { map.off('locationfound', cb); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

function ClickHandler({ active, onTap }: { active: boolean; onTap: (lat: number, lng: number) => void }) {
  useMapEvents({ click: e => { if (active) onTap(e.latlng.lat, e.latlng.lng); } });
  return null;
}

function MapFollower({ pos }: { pos: { lat: number; lng: number } | null }) {
  const map = useMap();
  const prev = useRef<{ lat: number; lng: number } | null>(null);
  useEffect(() => {
    if (!pos) return;
    if (!prev.current || distKm(prev.current.lat, prev.current.lng, pos.lat, pos.lng) > 0.004) {
      map.panTo([pos.lat, pos.lng], { animate: true, duration: 0.5 });
      prev.current = pos;
    }
  }, [pos, map]);
  return null;
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ZombieGame({ onClose }: { onClose: () => void }) {
  const { addZombieGameReward } = useGameStore();

  const [phase, setPhase]           = useState<Phase>('setup');
  const [home, setHome]             = useState<{ lat: number; lng: number } | null>(null);
  const [playerPos, setPlayerPos]   = useState<{ lat: number; lng: number } | null>(null);
  const [hp, setHp]                 = useState(MAX_HP);
  const [keysHeld, setKeysHeld]     = useState(0);
  const [zombieCount, setZombieCount] = useState(0);
  const [damageFlash, setDamageFlash] = useState(false);
  const [healFlash, setHealFlash]     = useState(false);
  const [statusMsg, setStatusMsg]     = useState('');
  const [, forceRender]               = useState(0);

  const playerRef  = useRef<{ lat: number; lng: number } | null>(null);
  const homeRef    = useRef<{ lat: number; lng: number } | null>(null);
  const zombiesRef = useRef<Zombie[]>([]);
  const pickupsRef = useRef<Pickup[]>([]);
  const hpRef      = useRef(MAX_HP);
  const keysRef    = useRef(0);
  const phaseRef   = useRef<Phase>('setup');
  const tickRef    = useRef(0);
  const loopRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const msgTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flash = useCallback((type: 'damage' | 'heal', msg: string) => {
    if (type === 'damage') { setDamageFlash(true); setTimeout(() => setDamageFlash(false), 700); }
    else                   { setHealFlash(true);   setTimeout(() => setHealFlash(false), 700); }
    setStatusMsg(msg);
    if (msgTimer.current) clearTimeout(msgTimer.current);
    msgTimer.current = setTimeout(() => setStatusMsg(''), 2200);
  }, []);

  const handlePlayerPos = useCallback((lat: number, lng: number) => {
    playerRef.current = { lat, lng };
    setPlayerPos({ lat, lng });
  }, []);

  const handleMapTap = useCallback((lat: number, lng: number) => {
    if (phaseRef.current !== 'setup') return;
    const h = { lat, lng };
    homeRef.current = h;
    setHome(h);
  }, []);

  const useCurrentAsHome = useCallback(() => {
    // Use real GPS if available, otherwise use Pinellas area default
    const pos = playerRef.current ?? { lat: 28.0836, lng: -82.7635 };
    homeRef.current = { ...pos };
    setHome({ ...pos });
  }, []);

  const startGame = useCallback(() => {
    if (!homeRef.current) return;
    // Use real GPS if available, otherwise fall back to home position
    const pos = playerRef.current ?? homeRef.current;
    if (!playerRef.current) playerRef.current = { ...pos };

    // Spawn initial horde of 8
    zombiesRef.current = Array.from({ length: 8 }, (_, i) => ({
      id: `z${i}`, ...nearby(pos.lat, pos.lng, 0.08, 0.35),
      path: [], pathStep: 0, routedAt: -99, routing: false,
    }));
    pickupsRef.current = [
      ...Array.from({ length: 6 }, (_, i) => ({ id: `m${i}`, type: 'medkit' as const, ...nearby(pos.lat, pos.lng, 0.08, 1.3) })),
      ...Array.from({ length: 3 }, (_, i) => ({ id: `k${i}`, type: 'key'    as const, ...nearby(pos.lat, pos.lng, 0.15, 1.2) })),
    ];
    hpRef.current = MAX_HP; keysRef.current = 0; tickRef.current = 0;
    phaseRef.current = 'playing';
    setHp(MAX_HP); setKeysHeld(0); setZombieCount(8); setPhase('playing');
  }, []);

  // ── Game loop ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'playing') return;

    loopRef.current = setInterval(() => {
      if (phaseRef.current !== 'playing') return;
      const pos = playerRef.current;
      if (!pos) return;
      tickRef.current++;

      // ── 1. Pick one zombie to re-route this tick (stagger OSRM calls) ──
      const needsRoute = zombiesRef.current
        .filter(z => !z.routing && (z.pathStep >= z.path.length || tickRef.current - z.routedAt >= REROUTE_TICKS))
        .sort((a, b) => a.routedAt - b.routedAt)[0];

      if (needsRoute) {
        needsRoute.routing = true;
        const zId = needsRoute.id;
        fetchRoadPath(needsRoute.lat, needsRoute.lng, pos.lat, pos.lng).then(path => {
          const z = zombiesRef.current.find(x => x.id === zId);
          if (!z) return;
          if (path && path.length > 1) {
            z.path = path; z.pathStep = 1; // skip first point (current pos)
          }
          z.routedAt = tickRef.current;
          z.routing = false;
        });
      }

      // ── 2. Move all zombies ──
      zombiesRef.current = zombiesRef.current.map(z => {
        // If routed path is available, walk along it
        if (z.path.length > 0 && z.pathStep < z.path.length) {
          return advanceAlongPath(z, ZOMBIE_KM_TICK);
        }
        // Fallback: straight line while waiting for route
        return approachStraight(z, pos.lat, pos.lng, ZOMBIE_KM_TICK);
      });

      // ── 3. Hit detection ──
      const hitting = zombiesRef.current.filter(z => distKm(z.lat, z.lng, pos.lat, pos.lng) < HIT_RANGE);
      if (hitting.length > 0) {
        const dmg = hitting.length * 10;
        hpRef.current = Math.max(0, hpRef.current - dmg);
        setHp(hpRef.current);
        flash('damage', `🧟 Hit! −${dmg} HP`);
        if (hpRef.current <= 0) { phaseRef.current = 'gameover'; setPhase('gameover'); }
      }

      // ── 4. Pickup collection ──
      const collected = pickupsRef.current.filter(p => distKm(p.lat, p.lng, pos.lat, pos.lng) < COLLECT_RANGE);
      if (collected.length > 0) {
        pickupsRef.current = pickupsRef.current.filter(p => distKm(p.lat, p.lng, pos.lat, pos.lng) >= COLLECT_RANGE);
        for (const p of collected) {
          if (p.type === 'medkit') {
            hpRef.current = Math.min(MAX_HP, hpRef.current + MEDKIT_HEAL);
            setHp(hpRef.current);
            flash('heal', `💊 +${MEDKIT_HEAL} HP`);
          } else {
            keysRef.current = Math.min(KEYS_TO_WIN, keysRef.current + 1);
            setKeysHeld(keysRef.current);
            flash('heal', keysRef.current >= KEYS_TO_WIN ? '🗝 All keys! Get home!' : `🗝 Key ${keysRef.current}/${KEYS_TO_WIN}`);
          }
        }
      }

      // ── 5. Victory ──
      const h = homeRef.current;
      if (keysRef.current >= KEYS_TO_WIN && h && distKm(h.lat, h.lng, pos.lat, pos.lng) < HOME_RANGE) {
        phaseRef.current = 'victory'; setPhase('victory');
      }

      // ── 6. Spawn zombie horde wave periodically ──
      if (tickRef.current % 10 === 0 && zombiesRef.current.length < MAX_ZOMBIES) {
        const slots = MAX_ZOMBIES - zombiesRef.current.length;
        const batch = Math.min(SPAWN_BATCH, slots);
        const newZ = Array.from({ length: batch }, (_, i) => ({
          id: `z${Date.now()}${i}`, ...nearby(pos.lat, pos.lng, 0.08, 0.4),
          path: [], pathStep: 0, routedAt: -99, routing: false,
        }));
        zombiesRef.current = [...zombiesRef.current, ...newZ];
        flash('damage', `🧟 ${batch} zombies incoming!`);
      }

      // ── 7. Emergency medkit ──
      if (hpRef.current < 40 && pickupsRef.current.filter(p => p.type === 'medkit').length === 0) {
        pickupsRef.current = [...pickupsRef.current, {
          id: `m${Date.now()}`, type: 'medkit', ...nearby(pos.lat, pos.lng, 0.05, 0.25),
        }];
      }

      setZombieCount(zombiesRef.current.length);
      forceRender(n => n + 1);
    }, TICK_MS);

    return () => { if (loopRef.current) clearInterval(loopRef.current); };
  }, [phase, flash]);

  useEffect(() => {
    if (phase === 'victory') { if (loopRef.current) clearInterval(loopRef.current); addZombieGameReward(); }
  }, [phase, addZombieGameReward]);

  useEffect(() => () => {
    if (loopRef.current) clearInterval(loopRef.current);
    if (msgTimer.current) clearTimeout(msgTimer.current);
  }, []);

  const hpPct   = (hp / MAX_HP) * 100;
  const hpColor = hp > 60 ? '#10b981' : hp > 30 ? '#f59e0b' : '#ef4444';
  const playing = phase === 'playing';

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9000, background: '#0b0f0b' }}>
      <style>{`
        @keyframes zPulse {
          0%,100%{ transform:scale(1);   box-shadow:0 0 6px #ef4444; }
          50%    { transform:scale(1.4); box-shadow:0 0 18px #ef4444,0 0 35px #dc262650; }
        }
        .z-dot {
          width:18px;height:18px;border-radius:50%;
          background:radial-gradient(circle at 35% 30%,#f87171,#dc2626);
          border:2px solid #fca5a5;
          animation:zPulse 1.2s ease-in-out infinite;
        }
        @keyframes dmgFlash{ 0%,100%{opacity:0}50%{opacity:1} }
        @keyframes healFlash{ 0%,100%{opacity:0}50%{opacity:1} }
        @keyframes slideUp{ from{transform:translateY(20px);opacity:0}to{transform:translateY(0);opacity:1} }
        @keyframes goAppear{ from{transform:scale(0.85);opacity:0}to{transform:scale(1);opacity:1} }
      `}</style>

      {/* Close */}
      <button onClick={onClose} style={{
        position: 'absolute', top: 16, right: 16, zIndex: 9100,
        width: 40, height: 40, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 2px 12px rgba(0,0,0,0.6)',
      }}><X size={18} color="white" /></button>

      {/* ── Map ── */}
      <div style={{ position: 'absolute', inset: 0 }}>
        <MapContainer center={[28.0836, -82.7635]} zoom={18} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' maxZoom={19} />
          <PlayerTracker onPos={handlePlayerPos} />
          <ClickHandler active={phase === 'setup'} onTap={handleMapTap} />
          {playing && <MapFollower pos={playerPos} />}

          {/* Home */}
          {home && <Marker position={[home.lat, home.lng]} icon={HOME_ICON} />}
          {/* Player */}
          {playerPos && <Marker position={[playerPos.lat, playerPos.lng]} icon={PLAYER_ICON} />}

          {/* Zombie road paths (subtle red lines) */}
          {playing && zombiesRef.current.map(z =>
            z.path.length > 1 && z.pathStep < z.path.length ? (
              <Polyline
                key={`path-${z.id}`}
                positions={[[z.lat, z.lng], ...z.path.slice(z.pathStep, z.pathStep + 8)]}
                pathOptions={{ color: '#ef4444', weight: 2, opacity: 0.25, dashArray: '4 6' }}
              />
            ) : null
          )}

          {/* Zombies */}
          {playing && zombiesRef.current.map(z => (
            <Marker key={z.id} position={[z.lat, z.lng]} icon={makeZombieIcon()} />
          ))}

          {/* Pickups */}
          {playing && pickupsRef.current.map(p => (
            <Marker key={p.id} position={[p.lat, p.lng]} icon={p.type === 'medkit' ? MEDKIT_ICON : KEY_ICON} />
          ))}
        </MapContainer>

        {/* Damage / heal flash vignettes */}
        {damageFlash && (
          <div style={{ position:'absolute',inset:0,zIndex:9050,pointerEvents:'none',
            background:'radial-gradient(ellipse at center,transparent 25%,rgba(239,68,68,0.6) 100%)',
            animation:'dmgFlash 0.35s ease-in-out 2' }} />
        )}
        {healFlash && (
          <div style={{ position:'absolute',inset:0,zIndex:9050,pointerEvents:'none',
            background:'radial-gradient(ellipse at center,transparent 25%,rgba(16,185,129,0.4) 100%)',
            animation:'healFlash 0.35s ease-in-out 2' }} />
        )}

        {/* ══ SETUP ══ */}
        {phase === 'setup' && (
          <>
            {/* Top pill */}
            <div style={{
              position:'absolute', top:16, left:'50%', transform:'translateX(-50%)',
              zIndex:9060, animation:'slideUp 0.3s ease-out',
              background:'rgba(8,12,8,0.93)', backdropFilter:'blur(10px)',
              border:'1px solid rgba(239,68,68,0.35)',
              borderRadius:14, padding:'10px 18px',
              display:'flex', alignItems:'center', gap:10,
              boxShadow:'0 4px 20px rgba(0,0,0,0.5)',
              maxWidth:'calc(100vw - 80px)',
            }}>
              <span style={{ fontSize:22, flexShrink:0 }}>🧟</span>
              <div style={{ minWidth:0 }}>
                <p style={{ fontWeight:900, fontSize:14, color:'#ef4444', margin:0 }}>ZOMBIE SURVIVAL</p>
                <p style={{ fontSize:11, color:'#3d5545', margin:0, marginTop:1 }}>
                  {home ? '✅ Home set — tap GO to start' : 'Tap map or use GPS to place your 🏠'}
                </p>
              </div>
            </div>

            {/* Rules (only before home is set) */}
            {!home && (
              <div style={{
                position:'absolute', top:82, left:'50%', transform:'translateX(-50%)',
                zIndex:9060, animation:'slideUp 0.35s ease-out',
                background:'rgba(8,12,8,0.88)', backdropFilter:'blur(10px)',
                border:'1px solid rgba(255,255,255,0.07)',
                borderRadius:12, padding:'10px 14px',
                boxShadow:'0 4px 16px rgba(0,0,0,0.4)',
                maxWidth:260,
              }}>
                {[
                  ['🧟','Zombies chase you along real roads'],
                  ['🗝',`Collect ${KEYS_TO_WIN} keys nearby`],
                  ['💊','Grab medkits to heal HP'],
                  ['🏠','Return home to WIN'],
                  ['🏆','Reward: 1500 🪙 + 750 XP'],
                ].map(([ic, txt]) => (
                  <div key={txt} style={{ display:'flex', gap:7, marginBottom:5, alignItems:'center' }}>
                    <span style={{ fontSize:13 }}>{ic}</span>
                    <span style={{ fontSize:11, color:'#7a9a82' }}>{txt}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Bottom controls */}
            <div style={{
              position:'absolute', bottom:0, left:0, right:0, zIndex:9060,
              padding:'14px 18px',
              paddingBottom:'max(18px, env(safe-area-inset-bottom, 18px))',
            }}>
              {!home ? (
                <button
                  onClick={useCurrentAsHome}
                  style={{
                    width:'100%', padding:'15px', borderRadius:16, border:'none',
                    cursor:'pointer',
                    background:'rgba(16,185,129,0.13)',
                    backdropFilter:'blur(10px)',
                    outline:'1px solid rgba(16,185,129,0.35)',
                    color:'#10b981',
                    fontSize:15, fontWeight:800, fontFamily:'inherit',
                    boxShadow:'0 4px 20px rgba(0,0,0,0.4)',
                    display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                  } as React.CSSProperties}
                >
                  <span style={{ fontSize:17 }}>📍</span>
                  Use My Current Location as Home
                </button>
              ) : (
                <div style={{ animation:'goAppear 0.25s cubic-bezier(0.34,1.56,0.64,1)' }}>
                  {/* Home coords chip */}
                  <div style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    background:'rgba(8,12,8,0.9)', backdropFilter:'blur(10px)',
                    border:'1px solid rgba(239,68,68,0.3)',
                    borderRadius:12, padding:'10px 14px', marginBottom:10,
                  }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <span style={{ fontSize:18 }}>🏠</span>
                      <div>
                        <p style={{ fontSize:10, color:'#3d5545', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em', margin:0 }}>Home Set</p>
                        <p style={{ fontSize:12, color:'#e8f0e8', fontWeight:700, margin:0, marginTop:1, fontVariantNumeric:'tabular-nums' }}>
                          {home.lat.toFixed(4)}, {home.lng.toFixed(4)}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => { setHome(null); homeRef.current = null; }}
                      style={{
                        background:'rgba(255,255,255,0.06)', border:'1px solid rgba(255,255,255,0.1)',
                        borderRadius:8, padding:'5px 10px', cursor:'pointer',
                        fontSize:11, color:'#3d5545', fontWeight:700, fontFamily:'inherit',
                      }}
                    >Change</button>
                  </div>

                  {/* GO */}
                  <button
                    onClick={startGame}
                    style={{
                      width:'100%', padding:'19px', borderRadius:18, border:'none',
                      cursor:'pointer',
                      background:'linear-gradient(135deg,#b91c1c,#ef4444)',
                      color:'white',
                      fontSize:24, fontWeight:900, fontFamily:'inherit',
                      letterSpacing:'0.08em',
                      boxShadow:'0 6px 30px rgba(239,68,68,0.55)',
                      display:'flex', alignItems:'center', justifyContent:'center', gap:12,
                    }}
                  >
                    <span>🧟</span>
                    GO
                    <span>🧟</span>
                  </button>
                </div>
              )}
            </div>
          </>
        )}

        {/* ══ PLAYING HUD ══ */}
        {playing && (
          <>
            <div style={{
              position:'absolute', top:0, left:0, right:0, zIndex:9060,
              background:'rgba(6,10,6,0.92)', backdropFilter:'blur(10px)',
              borderBottom:'1px solid rgba(239,68,68,0.15)',
              padding:'10px 16px',
              paddingTop:'max(10px, env(safe-area-inset-top, 10px))',
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                {/* HP bar */}
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4 }}>
                    <Heart size={11} color={hpColor} fill={hpColor} />
                    <span style={{ fontSize:11, fontWeight:800, color:hpColor, fontVariantNumeric:'tabular-nums' }}>
                      {hp}/{MAX_HP}
                    </span>
                  </div>
                  <div style={{ height:5, background:'rgba(255,255,255,0.08)', borderRadius:3, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:3, width:`${hpPct}%`,
                      background:hpColor, transition:'width 0.3s,background 0.3s',
                      boxShadow:`0 0 6px ${hpColor}90` }} />
                  </div>
                </div>

                {/* Keys */}
                <div style={{ display:'flex', gap:3 }}>
                  {Array.from({ length: KEYS_TO_WIN }).map((_, i) => (
                    <span key={i} style={{ fontSize:19, opacity: i < keysHeld ? 1 : 0.15, transition:'opacity 0.2s' }}>🗝</span>
                  ))}
                </div>

                {/* Zombie count */}
                <div style={{
                  background:'rgba(239,68,68,0.12)', border:'1px solid rgba(239,68,68,0.25)',
                  borderRadius:8, padding:'3px 9px',
                  display:'flex', alignItems:'center', gap:4,
                }}>
                  <span style={{ fontSize:13 }}>🧟</span>
                  <span style={{ fontSize:12, fontWeight:800, color:'#ef4444' }}>{zombieCount}</span>
                </div>
              </div>

              {keysHeld >= KEYS_TO_WIN && (
                <div style={{ marginTop:8, padding:'6px 12px', borderRadius:8,
                  background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.35)',
                  textAlign:'center' }}>
                  <span style={{ fontSize:12, fontWeight:900, color:'#10b981' }}>🏠 ALL KEYS — GET HOME NOW!</span>
                </div>
              )}
            </div>

            {/* Status toast */}
            {statusMsg && (
              <div style={{
                position:'absolute', bottom:32, left:'50%', transform:'translateX(-50%)',
                zIndex:9060, whiteSpace:'nowrap',
                background:'rgba(0,0,0,0.82)', backdropFilter:'blur(8px)',
                border:'1px solid rgba(255,255,255,0.1)',
                borderRadius:99, padding:'9px 20px',
                fontSize:14, fontWeight:800, color:'#e8f0e8',
                boxShadow:'0 4px 16px rgba(0,0,0,0.5)',
                animation:'slideUp 0.2s ease-out',
              }}>
                {statusMsg}
              </div>
            )}
          </>
        )}

        {/* ══ GAME OVER ══ */}
        {phase === 'gameover' && (
          <div style={{ position:'absolute', inset:0, zIndex:9070,
            background:'rgba(0,0,0,0.9)', backdropFilter:'blur(10px)',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            padding:'32px 24px' }}>
            <span style={{ fontSize:72, marginBottom:10 }}>💀</span>
            <p style={{ fontWeight:900, fontSize:38, color:'#ef4444', margin:0 }}>GAME OVER</p>
            <p style={{ fontSize:14, color:'#6b8a72', marginTop:6, marginBottom:28, textAlign:'center' }}>The horde got you.</p>
            <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.18)',
              borderRadius:16, padding:'16px 28px', marginBottom:28, textAlign:'center' }}>
              <p style={{ fontSize:11, color:'#3d5545', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 8px' }}>Keys Collected</p>
              <div style={{ display:'flex', justifyContent:'center', gap:6 }}>
                {Array.from({ length: KEYS_TO_WIN }).map((_, i) => (
                  <span key={i} style={{ fontSize:28, opacity: i < keysHeld ? 1 : 0.18 }}>🗝</span>
                ))}
              </div>
              <p style={{ fontSize:12, color:'#6b8a72', margin:'8px 0 0' }}>{keysHeld} / {KEYS_TO_WIN}</p>
            </div>
            <div style={{ display:'flex', gap:10, width:'100%', maxWidth:310 }}>
              <button onClick={() => {
                zombiesRef.current = []; pickupsRef.current = [];
                keysRef.current = 0; hpRef.current = MAX_HP; phaseRef.current = 'setup';
                setPhase('setup'); setHome(null); homeRef.current = null; setKeysHeld(0); setHp(MAX_HP);
              }} style={{ flex:1, padding:'15px', borderRadius:14, border:'none',
                background:'linear-gradient(135deg,#b91c1c,#ef4444)',
                color:'white', fontSize:15, fontWeight:900, cursor:'pointer', fontFamily:'inherit',
                boxShadow:'0 4px 18px rgba(239,68,68,0.4)' }}>🔄 Try Again</button>
              <button onClick={onClose} style={{ flex:1, padding:'15px', borderRadius:14,
                border:'1px solid rgba(255,255,255,0.1)', background:'rgba(255,255,255,0.05)',
                color:'#7a9a82', fontSize:15, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>Exit</button>
            </div>
          </div>
        )}

        {/* ══ VICTORY ══ */}
        {phase === 'victory' && (
          <div style={{ position:'absolute', inset:0, zIndex:9070,
            background:'rgba(0,0,0,0.92)', backdropFilter:'blur(10px)',
            display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
            padding:'32px 24px' }}>
            <span style={{ fontSize:72, marginBottom:10 }}>🏆</span>
            <p style={{ fontWeight:900, fontSize:30, color:'#10b981', margin:0, textAlign:'center' }}>YOU SURVIVED!</p>
            <p style={{ fontSize:14, color:'#6b8a72', marginTop:6, marginBottom:28, textAlign:'center' }}>All keys collected. You made it home.</p>
            <div style={{ background:'rgba(16,185,129,0.09)', border:'1px solid rgba(16,185,129,0.28)',
              borderRadius:18, padding:'20px 32px', marginBottom:28, textAlign:'center', width:'100%', maxWidth:290 }}>
              <p style={{ fontSize:11, color:'#3d5545', fontWeight:800, textTransform:'uppercase', letterSpacing:'0.07em', margin:'0 0 14px' }}>Rewards Earned</p>
              <div style={{ display:'flex', justifyContent:'center', gap:32 }}>
                <div>
                  <p style={{ fontSize:32, fontWeight:900, color:'#f59e0b', margin:0 }}>1500</p>
                  <p style={{ fontSize:12, color:'#6b8a72', margin:'2px 0 0' }}>🪙 Coins</p>
                </div>
                <div style={{ width:1, background:'rgba(255,255,255,0.07)' }} />
                <div>
                  <p style={{ fontSize:32, fontWeight:900, color:'#a78bfa', margin:0 }}>750</p>
                  <p style={{ fontSize:12, color:'#6b8a72', margin:'2px 0 0' }}>⚡ XP</p>
                </div>
              </div>
            </div>
            <button onClick={onClose} style={{ width:'100%', maxWidth:290, padding:'17px', borderRadius:16, border:'none',
              background:'linear-gradient(135deg,#059669,#10b981)',
              color:'white', fontSize:16, fontWeight:900, cursor:'pointer', fontFamily:'inherit',
              boxShadow:'0 6px 24px rgba(16,185,129,0.45)' }}>🏠 Return to Map</button>
          </div>
        )}
      </div>
    </div>
  );
}
