'use client';
import dynamic from 'next/dynamic';

const MapComponent = dynamic(() => import('./MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full" style={{ background: '#0a0f0a' }}>
      <div className="text-center">
        <div className="text-4xl mb-2">🗺️</div>
        <p style={{ color: '#10b981' }}>Loading map...</p>
      </div>
    </div>
  ),
});

export default function MapScreen() {
  return (
    <div style={{ height: 'calc(100vh - 64px)', position: 'relative' }}>
      <MapComponent />
    </div>
  );
}
