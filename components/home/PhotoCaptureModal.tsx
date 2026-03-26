'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, X, CheckCircle2, RotateCcw, Zap } from 'lucide-react';

export interface QuestSnapshot {
  id: string;
  title: string;
  description: string;
  difficulty: string;
  xpReward: number;
  coinReward: number;
  venue?: string;
  timerBonus?: boolean;
  bonusXp?: number;
  bonusCoins?: number;
}

const DIFF_COLOR: Record<string, string> = {
  easy: '#10b981', medium: '#f59e0b', hard: '#ef4444', golden: '#fbbf24',
};

function compressCanvas(canvas: HTMLCanvasElement): string {
  const MAX = 800;
  let { width, height } = canvas;
  if (width > MAX || height > MAX) {
    if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
    else { width = Math.round(width * MAX / height); height = MAX; }
  }
  const out = document.createElement('canvas');
  out.width = width; out.height = height;
  out.getContext('2d')!.drawImage(canvas, 0, 0, width, height);
  return out.toDataURL('image/jpeg', 0.72);
}

interface Props {
  quest: QuestSnapshot;
  onConfirm: (photoUrl: string) => void;
  onClose: () => void;
}

export default function PhotoCaptureModal({ quest, onConfirm, onClose }: Props) {
  const [phase, setPhase] = useState<'camera' | 'preview' | 'confirmed'>('camera');
  const [photo, setPhoto] = useState<string | null>(null);
  const [camError, setCamError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const color = DIFF_COLOR[quest.difficulty] || '#10b981';
  const isGolden = quest.difficulty === 'golden';

  const openCamera = async () => {
    setCamError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch {
      setCamError('Camera access denied. Please allow camera permission and try again.');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    openCamera();
    return () => stopCamera();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    canvas.getContext('2d')!.drawImage(video, 0, 0);
    const url = compressCanvas(canvas);
    stopCamera();
    setPhoto(url);
    setPhase('preview');
  };

  const retake = () => {
    setPhoto(null);
    setPhase('camera');
    openCamera();
  };

  const handleConfirm = () => {
    if (!photo) return;
    setPhase('confirmed');
    setTimeout(() => onConfirm(photo), 500);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        background: 'rgba(0,0,0,0.92)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{
          width: '100%', maxWidth: 430,
          background: '#111811',
          border: '1px solid rgba(16,185,129,0.15)',
          borderRadius: '24px 24px 0 0',
          overflow: 'hidden',
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
        }}
      >
        <div style={{ height: 3, background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />

        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 8px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)' }} />
        </div>

        <button
          onClick={handleClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            width: 32, height: 32, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)', border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        ><X size={16} color="#7a9a82" /></button>

        <div style={{ padding: '0 20px 20px' }}>
          {/* Quest info */}
          <div style={{ marginBottom: 16 }}>
            <span style={{
              display: 'inline-block', fontSize: 10, fontWeight: 800,
              color, background: `${color}18`, border: `1px solid ${color}30`,
              borderRadius: 99, padding: '2px 9px', marginBottom: 8, letterSpacing: '0.05em',
            }}>
              {isGolden ? '✨ ' : ''}{quest.difficulty.toUpperCase()}
            </span>
            <h2 style={{ fontWeight: 900, fontSize: 18, color: '#e8f0e8', lineHeight: 1.3, marginBottom: 4 }}>
              {quest.title}
            </h2>
            {quest.timerBonus && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 4 }}>
                <Zap size={13} color="#f59e0b" />
                <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 700 }}>
                  Timer Bonus Active! +{quest.bonusXp} XP, +{quest.bonusCoins} coins if completed!
                </span>
              </div>
            )}
          </div>

          {/* Camera / Preview area */}
          <div style={{
            position: 'relative',
            height: 240,
            borderRadius: 16,
            overflow: 'hidden',
            background: '#000',
            marginBottom: 16,
          }}>
            {/* Live camera feed */}
            {phase === 'camera' && (
              <>
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
                {camError ? (
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: '#0c110c',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    padding: 20, textAlign: 'center',
                  }}>
                    <Camera size={32} color="#3d5545" style={{ marginBottom: 12 }} />
                    <p style={{ fontSize: 13, color: '#7a9a82', lineHeight: 1.5, marginBottom: 14 }}>{camError}</p>
                    <button
                      onClick={openCamera}
                      style={{
                        padding: '8px 20px', borderRadius: 10, border: '1px solid rgba(16,185,129,0.3)',
                        background: 'rgba(16,185,129,0.1)', color: '#10b981',
                        fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      }}
                    >Try Again</button>
                  </div>
                ) : (
                  <>
                    {/* Viewfinder corners */}
                    {[['top','left'],['top','right'],['bottom','left'],['bottom','right']].map(([v,h]) => (
                      <div key={`${v}${h}`} style={{
                        position: 'absolute',
                        [v]: 16, [h]: 16,
                        width: 20, height: 20,
                        borderTop: v === 'top' ? `2px solid ${color}` : 'none',
                        borderBottom: v === 'bottom' ? `2px solid ${color}` : 'none',
                        borderLeft: h === 'left' ? `2px solid ${color}` : 'none',
                        borderRight: h === 'right' ? `2px solid ${color}` : 'none',
                      }} />
                    ))}
                    {/* Capture button */}
                    <button
                      onClick={capturePhoto}
                      style={{
                        position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
                        width: 60, height: 60, borderRadius: '50%', border: '4px solid white',
                        background: 'rgba(255,255,255,0.15)', cursor: 'pointer',
                        backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'white' }} />
                    </button>
                    <div style={{
                      position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
                      background: 'rgba(0,0,0,0.6)', borderRadius: 99, padding: '4px 12px',
                    }}>
                      <span style={{ fontSize: 11, color: 'white', fontWeight: 600 }}>
                        <Camera size={11} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                        Tap the circle to capture
                      </span>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Photo preview */}
            {(phase === 'preview' || phase === 'confirmed') && photo && (
              <>
                <img src={photo} alt="Quest proof" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                {phase === 'preview' && (
                  <button
                    onClick={retake}
                    style={{
                      position: 'absolute', bottom: 12, right: 12,
                      display: 'flex', alignItems: 'center', gap: 5,
                      background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.2)',
                      borderRadius: 99, padding: '6px 12px', cursor: 'pointer',
                      fontSize: 12, color: 'white', fontWeight: 600,
                    }}
                  >
                    <RotateCcw size={12} /> Retake
                  </button>
                )}
                <AnimatePresence>
                  {phase === 'confirmed' && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(16,185,129,0.35)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <CheckCircle2 size={56} color="white" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>

          {/* Rewards row */}
          <div style={{
            display: 'flex', gap: 10, marginBottom: 16,
            background: '#131f13', border: '1px solid rgba(16,185,129,0.1)',
            borderRadius: 12, padding: '10px 14px',
          }}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#3d5545', marginBottom: 2 }}>XP Reward</p>
              <p style={{ fontSize: 15, fontWeight: 900, color: '#10b981' }}>
                +{quest.xpReward}
                {quest.timerBonus && <span style={{ fontSize: 11, color: '#f59e0b' }}> +{quest.bonusXp}</span>}
              </p>
            </div>
            <div style={{ width: 1, background: 'rgba(16,185,129,0.1)' }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#3d5545', marginBottom: 2 }}>Coins</p>
              <p style={{ fontSize: 15, fontWeight: 900, color: '#f59e0b' }}>
                +{quest.coinReward}
                {quest.timerBonus && <span style={{ fontSize: 11, color: '#f59e0b' }}> +{quest.bonusCoins}</span>}
              </p>
            </div>
            <div style={{ width: 1, background: 'rgba(16,185,129,0.1)' }} />
            <div style={{ flex: 1, textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: '#3d5545', marginBottom: 2 }}>Location</p>
              <p style={{ fontSize: 11, fontWeight: 600, color: '#7a9a82', lineHeight: 1.3 }}>
                {quest.venue?.split(',')[0] ?? '—'}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={handleClose}
              style={{
                flex: 1, padding: '14px 0', borderRadius: 14,
                border: '1px solid rgba(16,185,129,0.15)',
                background: 'transparent', cursor: 'pointer',
                fontWeight: 700, fontSize: 14, color: '#3d5545', fontFamily: 'inherit',
              }}
            >Cancel</button>
            <button
              onClick={handleConfirm}
              disabled={phase !== 'preview'}
              style={{
                flex: 2, padding: '14px 0', borderRadius: 14, border: 'none',
                cursor: phase === 'preview' ? 'pointer' : 'not-allowed',
                fontWeight: 800, fontSize: 15, fontFamily: 'inherit',
                background: phase === 'preview'
                  ? `linear-gradient(135deg, ${color}cc, ${color})`
                  : 'rgba(255,255,255,0.04)',
                color: phase === 'preview' ? 'white' : '#3d5545',
                transition: 'all 0.2s',
                boxShadow: phase === 'preview' ? `0 4px 16px ${color}40` : 'none',
              }}
            >
              {phase === 'confirmed' ? '✓ Quest Complete!'
                : phase === 'preview' ? '⚔️  Complete Quest'
                : 'Take a Photo First'}
            </button>
          </div>
        </div>
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </motion.div>
  );
}
