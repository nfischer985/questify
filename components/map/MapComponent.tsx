'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useGameStore } from '@/store/gameStore';
import {
  Map, Building2, Navigation, X,
  ArrowUp, CornerUpLeft, CornerUpRight, RotateCw, MapPin,
  AlertTriangle,
} from 'lucide-react';
import dynamic from 'next/dynamic';

const ZombieGame = dynamic(() => import('./ZombieGame'), { ssr: false });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl:       'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl:     'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const C: Record<string, string> = {
  easy: '#10b981', medium: '#f59e0b', hard: '#ef4444', golden: '#fbbf24',
};

// ── Pin factories ────────────────────────────────────────────────────────────
const makeQuestPin = (color: string, done: boolean) => L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:36px;height:44px;">
      <div style="position:absolute;bottom:-3px;left:50%;transform:translateX(-50%);
        width:12px;height:5px;border-radius:50%;background:rgba(0,0,0,0.35);filter:blur(2px)"></div>
      <div style="position:absolute;top:0;left:2px;width:32px;height:32px;
        border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        background:${done ? '#1c2c1c' : color};
        border:2.5px solid ${done ? '#2e4a2e' : 'rgba(255,255,255,0.9)'};
        box-shadow:0 3px 12px rgba(0,0,0,0.5)${done ? '' : `,0 0 8px ${color}90`};"></div>
      <div style="position:absolute;top:6px;left:8px;width:20px;height:20px;
        border-radius:50% 50% 50% 0;transform:rotate(-45deg);
        display:flex;align-items:center;justify-content:center;">
        <span style="transform:rotate(45deg);font-size:11px;line-height:1;display:block;">
          ${done ? '✓' : '⚔'}
        </span>
      </div>
    </div>`,
  iconSize: [36, 44], iconAnchor: [18, 44], popupAnchor: [0, -46],
});

const makeCoinPin = (amt: number) => L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:34px;height:40px;">
      <div style="position:absolute;bottom:-2px;left:50%;transform:translateX(-50%);
        width:10px;height:4px;border-radius:50%;background:rgba(0,0,0,0.3);filter:blur(2px)"></div>
      <div style="width:34px;height:34px;border-radius:50%;
        background:radial-gradient(circle at 35% 30%,#fef3c7,#f59e0b 60%,#d97706);
        border:2px solid rgba(255,255,255,0.7);display:flex;align-items:center;justify-content:center;
        font-size:16px;box-shadow:0 3px 12px rgba(0,0,0,0.4),0 0 12px rgba(245,158,11,0.6);">🪙</div>
      <div style="position:absolute;bottom:-14px;left:50%;transform:translateX(-50%);
        background:rgba(245,158,11,0.9);color:#1a1000;font-size:9px;font-weight:800;
        border-radius:4px;padding:1px 5px;white-space:nowrap;">+${amt}</div>
    </div>`,
  iconSize: [34, 50], iconAnchor: [17, 50], popupAnchor: [0, -52],
});

const makeUrbexPin = () => L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:32px;height:40px;">
      <div style="position:absolute;bottom:-2px;left:50%;transform:translateX(-50%);
        width:10px;height:4px;border-radius:50%;background:rgba(0,0,0,0.3);filter:blur(2px)"></div>
      <div style="width:32px;height:32px;border-radius:6px;
        background:linear-gradient(135deg,#3d1a1a,#7c2626);
        border:2px solid rgba(239,68,68,0.7);display:flex;align-items:center;justify-content:center;
        box-shadow:0 3px 12px rgba(0,0,0,0.5),0 0 8px rgba(239,68,68,0.3);">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef9999" stroke-width="2.2"
          stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      </div>
    </div>`,
  iconSize: [32, 40], iconAnchor: [16, 40], popupAnchor: [0, -42],
});

const makeUserPin = () => L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:24px;height:24px;">
      <div style="position:absolute;inset:-6px;border-radius:50%;
        background:rgba(16,185,129,0.15);"></div>
      <div style="width:24px;height:24px;border-radius:50%;
        background:linear-gradient(135deg,#34d399,#059669);border:3px solid white;
        box-shadow:0 0 0 3px rgba(16,185,129,0.4),0 3px 8px rgba(0,0,0,0.5);"></div>
      <div style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        width:8px;height:8px;border-radius:50%;background:white;opacity:0.6;"></div>
    </div>`,
  iconSize: [24, 24], iconAnchor: [12, 12],
});

const CENTER: [number, number] = [28.0784, -82.7810];

const COIN_DROPS = [
  { id:'cd1', lat:28.0121, lng:-82.7898, amt:25, name:'Downtown Dunedin (Main St & Broadway)' },
  { id:'cd2', lat:27.9891, lng:-82.6862, amt:18, name:'Safety Harbor Waterfront Park' },
  { id:'cd3', lat:27.9774, lng:-82.8302, amt:30, name:'Pier 60, Clearwater Beach' },
  { id:'cd4', lat:28.0074, lng:-82.6795, amt:20, name:'Philippe Park, Safety Harbor' },
  { id:'cd5', lat:28.1530, lng:-82.7992, amt:35, name:'Fred Howard Park Beach' },
  { id:'cd6', lat:28.1557, lng:-82.7610, amt:22, name:'Sponge Docks, Tarpon Springs' },
];

// ── Routing types ────────────────────────────────────────────────────────────
interface NavStep {
  instruction: string;
  distance: number;
  type: string;
  modifier?: string;
}
interface NavRoute {
  path: [number, number][];
  steps: NavStep[];
  totalDistance: number;
  totalDuration: number;
}
interface NavTarget {
  title: string;
  venue: string;
}

interface UrbexLocation {
  id: string;
  lat: number;
  lng: number;
  name: string;
  tags: Record<string, string>;
}

// ── Routing helpers ──────────────────────────────────────────────────────────
function fmtInstruction(type: string, mod: string | undefined, name: string): string {
  const on = name ? ` on ${name}` : '';
  switch (type) {
    case 'depart':          return `Head ${mod || 'forward'}${on}`;
    case 'arrive':          return 'Arrive at destination';
    case 'turn':
      if (mod === 'left')         return `Turn left${on}`;
      if (mod === 'right')        return `Turn right${on}`;
      if (mod === 'sharp left')   return `Turn sharp left${on}`;
      if (mod === 'sharp right')  return `Turn sharp right${on}`;
      if (mod === 'slight left')  return `Bear left${on}`;
      if (mod === 'slight right') return `Bear right${on}`;
      return `Go straight${on}`;
    case 'new name':        return `Continue${on}`;
    case 'continue':        return mod === 'straight' ? `Go straight${on}` : `Continue${on}`;
    case 'merge':           return `Merge${mod ? ` ${mod}` : ''}${on}`;
    case 'roundabout':      return `Enter roundabout${on}`;
    case 'exit roundabout': return `Exit roundabout${on}`;
    case 'fork':
      if (mod?.includes('left'))  return `Keep left${on}`;
      if (mod?.includes('right')) return `Keep right${on}`;
      return `Fork${on}`;
    case 'end of road':
      return mod?.includes('left') ? `Turn left${on}` : `Turn right${on}`;
    default: return `Continue${on}`;
  }
}

function fmtDist(m: number) { return m < 1000 ? `${Math.round(m)} m` : `${(m/1000).toFixed(1)} km`; }
function fmtTime(s: number) {
  const m = Math.round(s / 60);
  return m < 60 ? `${m} min` : `${Math.floor(m/60)}h ${m%60}m`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function stepIcon(type: string, mod?: string): React.ComponentType<any> {
  if (type === 'arrive')                              return MapPin;
  if (type === 'depart')                              return Navigation;
  if (mod?.includes('left'))                          return CornerUpLeft;
  if (mod?.includes('right'))                         return CornerUpRight;
  if (type === 'roundabout' || type === 'exit roundabout') return RotateCw;
  return ArrowUp;
}

async function fetchRoute(
  fromLat: number, fromLng: number,
  toLat: number,   toLng: number,
): Promise<NavRoute | null> {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?steps=true&geometries=geojson&overview=full`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== 'Ok' || !data.routes?.length) return null;

    const route = data.routes[0];
    const path: [number,number][] = route.geometry.coordinates.map(
      ([lng, lat]: [number, number]) => [lat, lng]
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const steps: NavStep[] = route.legs[0].steps.map((s: any) => ({
      instruction: fmtInstruction(s.maneuver.type, s.maneuver.modifier, s.name),
      distance: s.distance,
      type: s.maneuver.type,
      modifier: s.maneuver.modifier,
    }));
    return { path, steps, totalDistance: route.distance, totalDuration: route.duration };
  } catch { return null; }
}

// ── Sub-components ───────────────────────────────────────────────────────────
function UserLocation({
  onLocationUpdate, showRadius, autoFollow,
}: {
  onLocationUpdate: (pos: [number, number]) => void;
  showRadius: boolean;
  autoFollow: boolean;
}) {
  const map = useMap();
  const [pos, setPos] = useState<[number, number] | null>(null);
  const located = useRef(false);

  useEffect(() => {
    map.locate({ watch: true, enableHighAccuracy: true });

    const onFound = (e: L.LocationEvent) => {
      const p: [number, number] = [e.latlng.lat, e.latlng.lng];
      setPos(p);
      onLocationUpdate(p);
      if (!located.current) {
        map.flyTo(e.latlng, 14, { duration: 1.5 });
        located.current = true;
      } else if (autoFollow) {
        map.panTo(e.latlng, { animate: true, duration: 0.5 });
      }
    };
    map.on('locationfound', onFound);
    map.on('locationerror', () => {
      if (!located.current) { setPos(CENTER); located.current = true; }
    });
    return () => { map.off('locationfound', onFound); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!pos) return null;
  return (
    <>
      {showRadius && (
        <Circle center={pos} radius={800} pathOptions={{
          color:'#10b981', fillColor:'#10b981', fillOpacity:0.04, weight:1.5, dashArray:'6 4',
        }} />
      )}
      <Marker position={pos} icon={makeUserPin()}>
        <Popup>
          <div style={{ padding:'10px 12px' }}>
            <p style={{ fontWeight:800, color:'#10b981', fontSize:13 }}>📍 You are here</p>
          </div>
        </Popup>
      </Marker>
    </>
  );
}

// Closes all Leaflet popups when navTarget becomes non-null
function PopupCloser({ trigger }: { trigger: unknown }) {
  const map = useMap();
  useEffect(() => { if (trigger) map.closePopup(); }, [trigger, map]);
  return null;
}

function QuestPopupContent({ q, onNavigate }: {
  q: { title: string; difficulty: string; description: string; xpReward: number; coinReward: number; completed: boolean; venue: string; lat: number; lng: number };
  onNavigate: () => void;
}) {
  const color = C[q.difficulty] || '#10b981';
  return (
    <div style={{ padding:'14px', minWidth:200, maxWidth:240 }}>
      <span style={{
        display:'inline-block', fontSize:10, fontWeight:800, letterSpacing:'0.06em',
        color, background:`${color}20`, borderRadius:99, padding:'2px 8px', marginBottom:8,
      }}>{q.difficulty.toUpperCase()}</span>
      <p style={{ fontWeight:900, fontSize:15, color:'#e8f0e8', lineHeight:1.3, marginBottom:4 }}>{q.title}</p>
      <p style={{ fontSize:12, color:'#10b981', fontWeight:600, marginBottom:6 }}>📍 {q.venue}</p>
      <p style={{ fontSize:12, color:'#7a9a82', lineHeight:1.5, marginBottom:10 }}>{q.description}</p>
      <div style={{ display:'flex', gap:12, marginBottom:10 }}>
        <span style={{ fontSize:12, fontWeight:800, color:'#10b981' }}>+{q.xpReward} XP</span>
        <span style={{ fontSize:12, fontWeight:800, color:'#f59e0b' }}>+{q.coinReward} 🪙</span>
      </div>
      {q.completed ? (
        <div style={{ fontSize:12, color:'#10b981', fontWeight:800 }}>✓ Completed</div>
      ) : (
        <button
          onClick={onNavigate}
          style={{
            width:'100%', textAlign:'center', padding:'9px 0',
            background:'linear-gradient(135deg,#1d4ed8,#3b82f6)',
            color:'white', fontWeight:800, fontSize:12,
            borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit',
            display:'flex', alignItems:'center', justifyContent:'center', gap:6,
          } as React.CSSProperties}
        >
          <Navigation size={13} /> Get Directions
        </button>
      )}
    </div>
  );
}

// ── Navigation panel (bottom overlay) ───────────────────────────────────────
function NavPanel({ target, route, onClose }: {
  target: NavTarget; route: NavRoute; onClose: () => void;
}) {
  return (
    <div style={{
      position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 1000,
      background: 'rgba(9,14,9,0.97)',
      border: '1px solid rgba(59,130,246,0.3)',
      borderRadius: '20px 20px 0 0',
      backdropFilter: 'blur(12px)',
      maxHeight: '48%',
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 -4px 32px rgba(0,0,0,0.5)',
    }}>
      {/* Handle */}
      <div style={{ display:'flex', justifyContent:'center', padding:'10px 0 6px', flexShrink:0 }}>
        <div style={{ width:36, height:4, borderRadius:2, background:'rgba(255,255,255,0.1)' }} />
      </div>

      {/* Header */}
      <div style={{
        display:'flex', alignItems:'flex-start', justifyContent:'space-between',
        padding:'0 16px 12px', borderBottom:'1px solid rgba(59,130,246,0.12)', flexShrink:0,
      }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
            <Navigation size={13} color="#3b82f6" />
            <span style={{ fontSize:11, fontWeight:800, color:'#3b82f6', textTransform:'uppercase', letterSpacing:'0.06em' }}>Directions</span>
          </div>
          <p style={{ fontWeight:900, color:'#e8f0e8', fontSize:15, marginBottom:6 }}>{target.title}</p>
          <div style={{ display:'flex', gap:14 }}>
            <div style={{ display:'flex', alignItems:'center', gap:5 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:'#3b82f6' }} />
              <span style={{ fontSize:13, color:'#e8f0e8', fontWeight:700 }}>{fmtDist(route.totalDistance)}</span>
            </div>
            <span style={{ fontSize:13, color:'#7a9a82' }}>{fmtTime(route.totalDuration)} by car</span>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            width:34, height:34, borderRadius:'50%', cursor:'pointer',
            background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.2)',
            display:'flex', alignItems:'center', justifyContent:'center',
          } as React.CSSProperties}
        ><X size={15} color="#ef4444" /></button>
      </div>

      {/* Steps — scrollable */}
      <div style={{ overflowY:'auto', flex:1, padding:'4px 0' }}>
        {route.steps.map((step, i) => {
          const Icon = stepIcon(step.type, step.modifier);
          const isLast = i === route.steps.length - 1;
          return (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:12, padding:'10px 16px',
              borderBottom: isLast ? 'none' : '1px solid rgba(255,255,255,0.04)',
            }}>
              <div style={{
                width:32, height:32, borderRadius:'50%', flexShrink:0,
                background: isLast ? 'rgba(16,185,129,0.12)' : 'rgba(59,130,246,0.1)',
                border:`1px solid ${isLast ? 'rgba(16,185,129,0.25)' : 'rgba(59,130,246,0.2)'}`,
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                <Icon size={15} color={isLast ? '#10b981' : '#3b82f6'} />
              </div>
              <p style={{ flex:1, fontSize:13, fontWeight:600, color:'#e8f0e8', lineHeight:1.3 }}>
                {step.instruction}
              </p>
              {step.distance > 0 && (
                <span style={{ fontSize:11, color:'#3d5545', fontWeight:600, flexShrink:0 }}>
                  {fmtDist(step.distance)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function MapComponent() {
  const { weeklyQuests, mapStyle, showQuestRadius, autoFollowLocation } = useGameStore();

  const [mapMode, setMapMode]       = useState<'quests' | 'urbex'>('quests');
  const [showZombieGame, setShowZombieGame] = useState(false);
  const [urbexLocs, setUrbexLocs]   = useState<UrbexLocation[]>([]);
  const [urbexLoading, setUrbexLoading] = useState(false);
  const urbexFetched = useRef(false);

  const userPosRef = useRef<[number, number] | null>(null);
  const [navTarget, setNavTarget] = useState<NavTarget | null>(null);
  const [navRoute,  setNavRoute]  = useState<NavRoute  | null>(null);
  const [navLoading, setNavLoading] = useState(false);
  const [navError,   setNavError]   = useState<string | null>(null);

  const handleLocationUpdate = useCallback((pos: [number, number]) => {
    userPosRef.current = pos;
  }, []);

  const startNavigation = useCallback(async (
    q: { title: string; venue: string; lat: number; lng: number }
  ) => {
    setNavError(null);
    const pos = userPosRef.current;
    if (!pos) { setNavError('Waiting for your location…'); return; }
    setNavLoading(true);
    setNavTarget({ title: q.title, venue: q.venue });
    const route = await fetchRoute(pos[0], pos[1], q.lat, q.lng);
    setNavLoading(false);
    if (!route) {
      setNavError('Could not find a route. Try again.');
      setNavTarget(null);
    } else {
      setNavRoute(route);
    }
  }, []);

  const stopNavigation = useCallback(() => {
    setNavTarget(null);
    setNavRoute(null);
    setNavError(null);
  }, []);

  const fetchUrbex = async () => {
    if (urbexFetched.current) return;
    urbexFetched.current = true;
    setUrbexLoading(true);
    try {
      const query = `[out:json][timeout:30][bbox:26.63,-84.48,29.53,-81.08];(node["abandoned:building"];node["building"="abandoned"];node["historic"="ruins"];node["disused:building"];node["ruins"="yes"];way["abandoned:building"];way["building"="abandoned"];way["historic"="ruins"];way["disused:building"];way["ruins"="yes"];);out center 300;`;
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
      });
      const data = await res.json();
      const locs: UrbexLocation[] = [];
      for (const el of data.elements || []) {
        const lat = el.lat ?? el.center?.lat;
        const lng = el.lon ?? el.center?.lon;
        if (!lat || !lng) continue;
        locs.push({
          id: String(el.id),
          lat, lng,
          name: el.tags?.name
            ? el.tags.name
            : el.tags?.['addr:street']
              ? `${el.tags?.['addr:housenumber'] || ''} ${el.tags['addr:street']}`.trim()
              : 'Abandoned Structure',
          tags: el.tags || {},
        });
      }
      setUrbexLocs(locs);
    } catch { /* silently fail */ }
    finally { setUrbexLoading(false); }
  };

  const handleModeToggle = (mode: 'quests' | 'urbex') => {
    setMapMode(mode);
    if (mode === 'urbex') fetchUrbex();
  };

  return (
    <div style={{ height:'100%', width:'100%', position:'relative' }}>

      {/* ── Mode toggle ── */}
      <div style={{
        position:'absolute', top:14, left:'50%', transform:'translateX(-50%)', zIndex:1000,
        display:'flex', gap:4,
        background:'rgba(11,16,11,0.95)', border:'1px solid rgba(16,185,129,0.2)',
        borderRadius:12, padding:'4px', backdropFilter:'blur(10px)',
        boxShadow:'0 4px 20px rgba(0,0,0,0.4)',
      }}>
        <button onClick={() => handleModeToggle('quests')} style={{
          display:'flex', alignItems:'center', gap:5,
          padding:'7px 12px', borderRadius:8, border:'none', cursor:'pointer',
          background: mapMode === 'quests' ? 'rgba(16,185,129,0.2)' : 'transparent',
          color: mapMode === 'quests' ? '#10b981' : '#3d5545',
          fontSize:12, fontWeight:700, fontFamily:'inherit', transition:'all 0.15s',
        }}>
          <Map size={13} /> Quests
        </button>
        <button onClick={() => handleModeToggle('urbex')} style={{
          display:'flex', alignItems:'center', gap:5,
          padding:'7px 12px', borderRadius:8, border:'none', cursor:'pointer',
          background: mapMode === 'urbex' ? 'rgba(239,68,68,0.2)' : 'transparent',
          color: mapMode === 'urbex' ? '#ef4444' : '#3d5545',
          fontSize:12, fontWeight:700, fontFamily:'inherit', transition:'all 0.15s',
        }}>
          <Building2 size={13} /> Urbex
        </button>
      </div>

      {/* ── Zombie Game floating button (bottom-right, above nav) ── */}
      <button
        onClick={() => setShowZombieGame(true)}
        style={{
          position:'absolute', bottom:80, right:14, zIndex:1000,
          width:54, height:54, borderRadius:'50%', border:'none', cursor:'pointer',
          background:'linear-gradient(135deg,#7f1d1d,#ef4444)',
          boxShadow:'0 4px 20px rgba(239,68,68,0.5)',
          display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
          backdropFilter:'blur(8px)',
        }}
      >
        <span style={{ fontSize:22, lineHeight:1 }}>🧟</span>
      </button>

      {/* ── Quest legend ── */}
      {mapMode === 'quests' && (
        <div style={{
          position:'absolute', top:14, right:14, zIndex:1000,
          background:'rgba(11,16,11,0.93)', border:'1px solid rgba(16,185,129,0.2)',
          borderRadius:12, padding:'10px 14px', backdropFilter:'blur(10px)',
          boxShadow:'0 4px 20px rgba(0,0,0,0.4)',
        }}>
          <p style={{ fontSize:10, fontWeight:800, color:'#e8f0e8', marginBottom:8, letterSpacing:'0.08em', textTransform:'uppercase' }}>Legend</p>
          {[['Easy','#10b981'],['Medium','#f59e0b'],['Hard','#ef4444']].map(([l,c]) => (
            <div key={l} style={{ display:'flex', alignItems:'center', gap:7, marginBottom:5 }}>
              <div style={{ width:9, height:9, borderRadius:'50%', background:c, boxShadow:`0 0 5px ${c}` }} />
              <span style={{ fontSize:11, color:'#7a9a82', fontWeight:600 }}>{l} Quest</span>
            </div>
          ))}
          <div style={{ display:'flex', alignItems:'center', gap:7, marginTop:3, borderTop:'1px solid rgba(16,185,129,0.1)', paddingTop:6 }}>
            <span style={{ fontSize:12 }}>🪙</span>
            <span style={{ fontSize:11, color:'#7a9a82', fontWeight:600 }}>Coin Drop</span>
          </div>
          {navRoute && (
            <div style={{ display:'flex', alignItems:'center', gap:7, marginTop:3, borderTop:'1px solid rgba(59,130,246,0.15)', paddingTop:6 }}>
              <div style={{ width:9, height:3, borderRadius:2, background:'#3b82f6' }} />
              <span style={{ fontSize:11, color:'#7a9a82', fontWeight:600 }}>Route</span>
            </div>
          )}
        </div>
      )}

      {/* ── Urbex panel ── */}
      {mapMode === 'urbex' && (
        <div style={{
          position:'absolute', top:14, right:14, zIndex:1000,
          background:'rgba(20,8,8,0.95)', border:'1px solid rgba(239,68,68,0.25)',
          borderRadius:12, padding:'10px 14px', backdropFilter:'blur(10px)',
          boxShadow:'0 4px 20px rgba(0,0,0,0.4)', maxWidth:150,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
            <Building2 size={12} color="#ef4444" />
            <span style={{ fontSize:10, fontWeight:800, color:'#ef9999', letterSpacing:'0.06em', textTransform:'uppercase' }}>Urbex Mode</span>
          </div>
          <span style={{ fontSize:11, color:'#7a3a3a' }}>
            {urbexLocs.length > 0 ? `${urbexLocs.length} locations found` : 'No data yet'}
          </span>
          <p style={{ fontSize:10, color:'#5a2a2a', marginTop:6, lineHeight:1.4 }}>
            Abandoned structures within 100 mi
          </p>
        </div>
      )}

      {/* ── Quest count badge ── */}
      {mapMode === 'quests' && (
        <div style={{
          position:'absolute', top:14, left:14, zIndex:1000,
          background:'rgba(11,16,11,0.93)', border:'1px solid rgba(16,185,129,0.2)',
          borderRadius:12, padding:'8px 12px', backdropFilter:'blur(10px)',
        }}>
          <p style={{ fontSize:10, fontWeight:800, color:'#3d5545', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:4 }}>Quests</p>
          <div style={{ display:'flex', gap:10 }}>
            {(['easy','medium','hard'] as const).map(d => {
              const count = weeklyQuests.filter(q => q.difficulty === d).length;
              const done  = weeklyQuests.filter(q => q.difficulty === d && q.completed).length;
              return (
                <div key={d} style={{ textAlign:'center' }}>
                  <div style={{ width:8, height:8, borderRadius:'50%', background:C[d], margin:'0 auto 2px' }} />
                  <span style={{ fontSize:11, fontWeight:800, color:'#e8f0e8' }}>{done}/{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Nav loading / error toast ── */}
      {(navLoading || navError) && (
        <div style={{
          position:'absolute', bottom: navRoute ? 'calc(48% + 16px)' : 80, left:'50%',
          transform:'translateX(-50%)', zIndex:1001, whiteSpace:'nowrap',
          background:'rgba(9,14,9,0.95)', border:`1px solid ${navError ? 'rgba(239,68,68,0.4)' : 'rgba(59,130,246,0.4)'}`,
          borderRadius:12, padding:'10px 18px', backdropFilter:'blur(8px)',
          display:'flex', alignItems:'center', gap:8,
        }}>
          {navLoading ? (
            <>
              <div style={{
                width:14, height:14, borderRadius:'50%',
                border:'2px solid rgba(59,130,246,0.3)', borderTopColor:'#3b82f6',
                animation:'spin 0.8s linear infinite', flexShrink:0,
              }} />
              <span style={{ fontSize:13, color:'#3b82f6', fontWeight:700 }}>Finding route…</span>
            </>
          ) : (
            <>
              <AlertTriangle size={14} color="#ef4444" />
              <span style={{ fontSize:13, color:'#ef9999', fontWeight:700 }}>{navError}</span>
              <button onClick={() => setNavError(null)} style={{
                background:'none', border:'none', cursor:'pointer', padding:0, lineHeight:1,
              }}><X size={12} color="#ef4444" /></button>
            </>
          )}
        </div>
      )}

      {/* ── Urbex scanning overlay ── */}
      {mapMode === 'urbex' && urbexLoading && (
        <div style={{
          position:'absolute', inset:0, zIndex:999, pointerEvents:'none',
          overflow:'hidden',
        }}>
          {/* Red vignette */}
          <div style={{
            position:'absolute', inset:0,
            background:'radial-gradient(ellipse at center, transparent 40%, rgba(239,68,68,0.08) 100%)',
          }} />
          {/* Scanning line */}
          <div style={{
            position:'absolute', left:0, right:0, height:3,
            background:'linear-gradient(90deg, transparent, rgba(239,68,68,0.9), rgba(255,100,100,1), rgba(239,68,68,0.9), transparent)',
            boxShadow:'0 0 18px 6px rgba(239,68,68,0.5)',
            animation:'urbexScan 2s ease-in-out infinite',
          }} />
          {/* Grid overlay */}
          <div style={{
            position:'absolute', inset:0,
            backgroundImage:'linear-gradient(rgba(239,68,68,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(239,68,68,0.05) 1px, transparent 1px)',
            backgroundSize:'40px 40px',
            animation:'gridPulse 2s ease-in-out infinite',
          }} />
          {/* Scan label */}
          <div style={{
            position:'absolute', bottom:120, left:'50%', transform:'translateX(-50%)',
            background:'rgba(20,8,8,0.9)', border:'1px solid rgba(239,68,68,0.5)',
            borderRadius:12, padding:'10px 20px', backdropFilter:'blur(8px)',
            display:'flex', alignItems:'center', gap:10,
          }}>
            <div style={{
              width:10, height:10, borderRadius:'50%', background:'#ef4444',
              boxShadow:'0 0 8px #ef4444',
              animation:'redPulse 1s ease-in-out infinite',
            }} />
            <span style={{ fontSize:13, color:'#ef9999', fontWeight:800, letterSpacing:'0.06em' }}>
              SCANNING AREA FOR URBEX LOCATIONS…
            </span>
          </div>
        </div>
      )}

      <MapContainer center={CENTER} zoom={12} style={{ height:'100%', width:'100%' }} zoomControl={false}>
        {mapStyle === 'satellite' ? (
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='&copy; <a href="https://www.esri.com">Esri</a>'
            maxZoom={19}
          />
        ) : (
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com">CARTO</a>'
            maxZoom={19}
          />
        )}
        <UserLocation onLocationUpdate={handleLocationUpdate} showRadius={showQuestRadius} autoFollow={autoFollowLocation} />
        <PopupCloser trigger={navTarget} />

        {/* Active navigation route */}
        {navRoute && (
          <>
            <Polyline
              positions={navRoute.path}
              pathOptions={{ color:'#3b82f6', weight:6, opacity:0.85, lineCap:'round', lineJoin:'round' }}
            />
            {/* Slightly wider glowing underline */}
            <Polyline
              positions={navRoute.path}
              pathOptions={{ color:'#93c5fd', weight:12, opacity:0.15, lineCap:'round' }}
            />
          </>
        )}

        {mapMode === 'quests' && (
          <>
            {weeklyQuests.map(q => (
              <React.Fragment key={q.id}>
                {q.route && q.route.length > 1 && (
                  <Polyline
                    positions={q.route}
                    pathOptions={{
                      color: q.completed ? '#2e4a2e' : (C[q.difficulty] || '#10b981'),
                      weight:4, opacity: q.completed ? 0.4 : 0.75,
                      dashArray: q.completed ? '8 6' : undefined,
                    }}
                  />
                )}
                <Marker position={[q.lat, q.lng]} icon={makeQuestPin(C[q.difficulty]||'#10b981', q.completed)}>
                  <Popup maxWidth={260}>
                    <QuestPopupContent
                      q={{ ...q, venue: q.venue || '' }}
                      onNavigate={() => startNavigation(q)}
                    />
                  </Popup>
                </Marker>
              </React.Fragment>
            ))}
            {COIN_DROPS.map(c => (
              <Marker key={c.id} position={[c.lat, c.lng]} icon={makeCoinPin(c.amt)}>
                <Popup>
                  <div style={{ padding:'12px 14px' }}>
                    <p style={{ fontWeight:900, color:'#fbbf24', fontSize:16, marginBottom:3 }}>🪙 +{c.amt} Coins</p>
                    <p style={{ fontSize:12, color:'#7a9a82', marginBottom:8 }}>{c.name}</p>
                    <p style={{ fontSize:11, color:'#3d5545' }}>Walk to this spot to collect!</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </>
        )}

        {mapMode === 'urbex' && urbexLocs.map(loc => (
          <Marker key={loc.id} position={[loc.lat, loc.lng]} icon={makeUrbexPin()}>
            <Popup>
              <div style={{ padding:'12px 14px', minWidth:180 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                  <Building2 size={13} color="#ef4444" />
                  <span style={{ fontSize:10, fontWeight:800, color:'#ef4444', letterSpacing:'0.06em', textTransform:'uppercase' }}>Urbex</span>
                </div>
                <p style={{ fontWeight:900, fontSize:14, color:'#e8f0e8', lineHeight:1.3, marginBottom:6 }}>{loc.name}</p>
                {loc.tags['addr:street'] && (
                  <p style={{ fontSize:11, color:'#7a9a82', marginBottom:4 }}>
                    📍 {[loc.tags['addr:housenumber'], loc.tags['addr:street']].filter(Boolean).join(' ')}
                  </p>
                )}
                {loc.tags['building'] && (
                  <p style={{ fontSize:11, color:'#5a2a2a', marginBottom:8 }}>Type: {loc.tags['building']}</p>
                )}
                <button
                  onClick={() => startNavigation({ title: loc.name, venue: loc.name, lat: loc.lat, lng: loc.lng })}
                  style={{
                    display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                    width:'100%', padding:'8px 0', marginTop:4,
                    background:'linear-gradient(135deg,#1d4ed8,#3b82f6)',
                    color:'white', fontWeight:800, fontSize:12,
                    borderRadius:8, border:'none', cursor:'pointer', fontFamily:'inherit',
                  }}
                ><Navigation size={12} /> Get Directions</button>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Navigation directions panel */}
      {navRoute && navTarget && (
        <NavPanel target={navTarget} route={navRoute} onClose={stopNavigation} />
      )}

      {/* ── Zombie Game overlay ── */}
      {showZombieGame && (
        <ZombieGame onClose={() => setShowZombieGame(false)} />
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes urbexScan {
          0%   { top: -4px; }
          50%  { top: calc(100% + 4px); }
          100% { top: -4px; }
        }
        @keyframes redPulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 8px #ef4444; }
          50%       { opacity: 0.5; box-shadow: 0 0 4px #ef4444; }
        }
        @keyframes gridPulse {
          0%, 100% { opacity: 0.6; }
          50%       { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
