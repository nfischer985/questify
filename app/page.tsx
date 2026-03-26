'use client';
export const dynamic = 'force-dynamic';
import { useEffect } from 'react';
import { useGameStore } from '@/store/gameStore';
import BottomNav from '@/components/layout/BottomNav';
import Header from '@/components/layout/Header';
import HomeScreen from '@/components/home/HomeScreen';
import MapScreen from '@/components/map/MapScreen';
import LeaderboardScreen from '@/components/leaderboard/LeaderboardScreen';
import ProfileScreen from '@/components/profile/ProfileScreen';
import EventsScreen from '@/components/events/EventsScreen';
import AuthGate from '@/components/auth/AuthGate';

export default function Home() {
  const { activeTab, theme } = useGameStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const renderScreen = () => {
    switch (activeTab) {
      case 'home':        return <HomeScreen />;
      case 'map':         return <MapScreen />;
      case 'leaderboard': return <LeaderboardScreen />;
      case 'profile':     return <ProfileScreen />;
      case 'events':      return <EventsScreen />;
      default:            return <HomeScreen />;
    }
  };

  return (
    <AuthGate>
      <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', background: 'var(--c-bg)' }}>
        {activeTab !== 'map' && <Header />}
        <main style={{ flex: 1, overflowY: 'auto', paddingBottom: 80 }}>
          {renderScreen()}
        </main>
        <BottomNav />
      </div>
    </AuthGate>
  );
}
