import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Quest, ShopItem, Friend, CompletedQuest, CoinDrop, Party, ActiveQuestTimer, QuestMode, ActivityItem } from '@/types';

interface GameState {
  username: string;
  level: number;
  xp: number;
  xpToNextLevel: number;
  coins: number;
  streak: number;
  weeklyQuestsCompleted: number;
  totalQuestsCompleted: number;
  premium: boolean;
  showGoldenRing: boolean;
  activeTab: string;
  weeklyQuests: Quest[];
  duoQuests: Quest[];
  trioQuests: Quest[];
  squadQuests: Quest[];
  questMode: QuestMode;
  completedQuestLog: CompletedQuest[];
  shopItems: ShopItem[];
  xpBoostActive: boolean;
  coinBoostActive: boolean;
  streakFrozen: boolean;
  friends: Friend[];
  coinDrops: CoinDrop[];
  completedEventQuests: string[];
  activeQuestTimers: Record<string, ActiveQuestTimer>;
  currentParty: Party | null;
  // Auth
  authUid: string | null;
  userHandle: string | null;   // permanent @username, set once
  displayName: string;         // changeable display name

  avatarUrl: string | null;
  setAvatarUrl: (url: string | null) => void;
  activityFeed: ActivityItem[];
  addActivityItem: (item: ActivityItem) => void;

  // Settings
  theme: 'dark' | 'light';
  hideCompleted: boolean;
  avatarColor: string;
  mapZoom: number;
  mapStyle: 'standard' | 'satellite';
  showQuestRadius: boolean;
  autoFollowLocation: boolean;
  distanceUnit: 'mi' | 'km';
  compactCards: boolean;
  soundEnabled: boolean;
  hapticEnabled: boolean;

  setAuthUid: (uid: string) => void;
  setUserHandle: (handle: string) => void;
  setDisplayName: (name: string) => void;
  setActiveTab: (tab: string) => void;
  setQuestMode: (mode: QuestMode) => void;
  completeQuest: (questId: string, photoUrl?: string, duration?: number, timerBonus?: boolean) => { xpGained: number; coinsGained: number; newLevel: number };
  completeGroupQuest: (questId: string, photoUrl?: string, duration?: number, timerBonus?: boolean) => { xpGained: number; coinsGained: number; newLevel: number };
  completeEventQuest: (questId: string, title: string, difficulty: string, xpReward: number, coinReward: number, photoUrl?: string) => { xpGained: number; coinsGained: number; newLevel: number };
  refreshWeeklyQuests: () => void;
  collectCoinDrop: (coinId: string) => number;
  buyShopItem: (itemId: string) => boolean;
  togglePremium: () => void;
  toggleGoldenRing: () => void;
  addFriend: (username: string) => boolean;
  removeFriend: (friendId: string) => void;
  setUsername: (name: string) => void;
  setTheme: (t: 'dark' | 'light') => void;
  setHideCompleted: (v: boolean) => void;
  setAvatarColor: (c: string) => void;
  setMapZoom: (z: number) => void;
  setMapStyle: (s: 'standard' | 'satellite') => void;
  setShowQuestRadius: (v: boolean) => void;
  setAutoFollowLocation: (v: boolean) => void;
  setDistanceUnit: (u: 'mi' | 'km') => void;
  setCompactCards: (v: boolean) => void;
  setSoundEnabled: (v: boolean) => void;
  setHapticEnabled: (v: boolean) => void;
  addZombieGameReward: () => void;
  resetProgress: () => void;
  startQuestTimer: (questId: string, mode: 'stopwatch' | 'timer', targetMs?: number) => void;
  cancelQuestTimer: (questId: string) => void;
  createParty: (name: string) => Party;
  joinParty: (code: string) => boolean;
  leaveParty: () => void;
}

const XP_PER_LEVEL = (level: number) => Math.floor(100 * Math.pow(1.4, level - 1));

// Pinellas Trail 10-mile route: Pop Stansell Park south through Dunedin
const TRAIL_ROUTE: [number, number][] = [
  [28.0790, -82.7706],
  [28.0640, -82.7758],
  [28.0490, -82.7812],
  [28.0350, -82.7862],
  [28.0190, -82.7895],
  [28.0060, -82.7902],
  [27.9870, -82.7930],
];

// Dunedin Causeway route (mainland → Honeymoon Island)
const CAUSEWAY_ROUTE: [number, number][] = [
  [28.0561, -82.8070],
  [28.0625, -82.8170],
  [28.0695, -82.8270],
  [28.0760, -82.8370],
  [28.0825, -82.8455],
];

// Honeymoon Island Osprey Trail (loop)
const OSPREY_ROUTE: [number, number][] = [
  [28.0717, -82.8323],
  [28.0820, -82.8400],
  [28.0900, -82.8310],
  [28.0875, -82.8210],
  [28.0790, -82.8185],
  [28.0717, -82.8323],
];

// ── Solo Quests ─────────────────────────────────────────────────────────────
const INITIAL_QUESTS: Quest[] = [
  { id: 'q1', title: 'Sponge Docks Stroll', description: 'Walk the historic Sponge Docks on Dodecanese Blvd and try a fresh Greek pastry from one of the waterfront bakeries.', difficulty: 'easy', xpReward: 55, coinReward: 30, completed: false, lat: 28.1557, lng: -82.7610, category: 'culture', venue: 'Sponge Docks, Tarpon Springs' },
  { id: 'q2', title: 'Clearwater Beach Sunrise', description: 'Arrive at Pier 60 before sunrise and photograph the sky the moment the sun breaks over the Gulf.', difficulty: 'easy', xpReward: 60, coinReward: 35, completed: false, lat: 27.9774, lng: -82.8302, category: 'outdoor', venue: 'Pier 60, Clearwater Beach' },
  { id: 'q3', title: 'Wall Springs Park Walk', description: 'Explore the boardwalk trail at Wall Springs County Park and find the historic natural spring.', difficulty: 'easy', xpReward: 50, coinReward: 28, completed: false, lat: 28.1069, lng: -82.7714, category: 'outdoor', venue: 'Wall Springs County Park, Palm Harbor' },
  { id: 'q4', title: 'Downtown Palm Harbor Coffee', description: 'Visit a café along Alt-19 in downtown Palm Harbor you\'ve never tried before. Order something off the specials board.', difficulty: 'easy', xpReward: 45, coinReward: 25, completed: false, lat: 28.0781, lng: -82.7637, category: 'food', venue: 'Downtown Palm Harbor' },
  { id: 'q5', title: 'Honeymoon Island Hike', description: 'Drive to Honeymoon Island State Park and hike the full Osprey Trail. Keep an eye out for dolphins offshore.', difficulty: 'medium', xpReward: 130, coinReward: 85, completed: false, lat: 28.0717, lng: -82.8323, category: 'outdoor', venue: 'Honeymoon Island State Park', route: OSPREY_ROUTE },
  { id: 'q6', title: 'Tarpon Springs Arts Walk', description: 'Explore the Arts District around Tarpon Ave and photograph at least 3 murals or public sculptures.', difficulty: 'medium', xpReward: 120, coinReward: 78, completed: false, lat: 28.1464, lng: -82.7548, category: 'culture', venue: 'Arts District, Tarpon Springs' },
  { id: 'q7', title: 'Clearwater Marine Aquarium', description: 'Visit the Clearwater Marine Aquarium at 249 Windward Passage and learn something new about marine rescue.', difficulty: 'medium', xpReward: 115, coinReward: 75, completed: false, lat: 27.9769, lng: -82.8177, category: 'culture', venue: 'Clearwater Marine Aquarium' },
  { id: 'q8', title: 'Dunedin Causeway Adventure', description: 'Bike or walk the full Dunedin Causeway out to the island and dip your feet in the Gulf when you reach the end.', difficulty: 'medium', xpReward: 125, coinReward: 82, completed: false, lat: 28.0561, lng: -82.8070, category: 'outdoor', venue: 'Dunedin Causeway', route: CAUSEWAY_ROUTE },
  { id: 'q9', title: 'Caladesi Island Explorer', description: 'Take the ferry from Honeymoon Island to Caladesi Island State Park and spend at least an hour on the beach.', difficulty: 'hard', xpReward: 260, coinReward: 160, completed: false, lat: 28.0636, lng: -82.8316, category: 'outdoor', venue: 'Caladesi Island Ferry Dock' },
  { id: 'q10', title: 'Pinellas Trail Challenge', description: 'Complete at least 10 miles on the Pinellas Trail in one go. Screenshot your fitness app route as proof.', difficulty: 'hard', xpReward: 310, coinReward: 190, completed: false, lat: 28.0790, lng: -82.7706, category: 'fitness', venue: 'Pinellas Trail — Pop Stansell Park', route: TRAIL_ROUTE },
];

export const GOLDEN_QUESTS: Quest[] = [
  { id: 'gq1', title: 'Anclote Key Sunrise Expedition', description: 'Launch from Anclote River Park by kayak or boat at dawn, reach the Anclote Key lighthouse, and photograph the untouched barrier island at sunrise.', difficulty: 'golden', xpReward: 550, coinReward: 420, completed: false, lat: 28.1762, lng: -82.7881, category: 'outdoor', venue: 'Anclote River Park, Tarpon Springs' },
  { id: 'gq2', title: 'Tarpon Springs Greek Food Tour', description: 'Self-guided food tour of Tarpon Springs — loukoumades at Hellas, fresh grouper, baklava, and a sponge cake to finish.', difficulty: 'golden', xpReward: 620, coinReward: 510, completed: false, lat: 28.1557, lng: -82.7610, category: 'food', venue: 'Sponge Docks, Tarpon Springs' },
];

// ── Duo Quests ───────────────────────────────────────────────────────────────
const INITIAL_DUO_QUESTS: Quest[] = [
  { id: 'dq1', title: 'Tandem Kayak at Fred Howard Park', description: 'Rent or bring a tandem kayak and paddle together around Fred Howard Park. Make it out to the sandbar!', difficulty: 'easy', xpReward: 70, coinReward: 42, completed: false, lat: 28.1530, lng: -82.7992, category: 'outdoor', venue: 'Fred Howard Park, Tarpon Springs' },
  { id: 'dq2', title: 'Duo Photography Walk', description: 'Take turns photographing each other at 5 landmark spots around Clearwater Beach. Compare shots and pick a favorite together.', difficulty: 'easy', xpReward: 60, coinReward: 36, completed: false, lat: 27.9774, lng: -82.8302, category: 'culture', venue: 'Clearwater Beach' },
  { id: 'dq3', title: 'Partner Greek Food Challenge', description: 'Each order one dish at the Sponge Docks — without looking at the menu first. Whoever finishes first wins bragging rights.', difficulty: 'medium', xpReward: 145, coinReward: 92, completed: false, lat: 28.1557, lng: -82.7610, category: 'food', venue: 'Sponge Docks, Tarpon Springs' },
  { id: 'dq4', title: 'Honeymoon Island Partner Hike', description: 'Complete the Osprey Trail together and spot the most unique wildlife. Memory only — no phones to identify species.', difficulty: 'medium', xpReward: 138, coinReward: 88, completed: false, lat: 28.0717, lng: -82.8323, category: 'outdoor', venue: 'Honeymoon Island State Park', route: OSPREY_ROUTE },
  { id: 'dq5', title: 'Sunset Dunedin Stroll', description: 'Walk Dunedin\'s Main Street together, stopping at every mural. Find one shop you\'d both visit again.', difficulty: 'easy', xpReward: 62, coinReward: 38, completed: false, lat: 28.0121, lng: -82.7898, category: 'culture', venue: 'Downtown Dunedin' },
  { id: 'dq6', title: 'Safety Harbor Shoreline Walk', description: 'Walk the full Safety Harbor waterfront loop together and find the oldest tree in Philippe Park.', difficulty: 'easy', xpReward: 58, coinReward: 34, completed: false, lat: 27.9891, lng: -82.6862, category: 'outdoor', venue: 'Safety Harbor Waterfront' },
  { id: 'dq7', title: 'Pier 60 Sunset Challenge', description: 'Arrive at Pier 60 at least 15 minutes before sunset. Both photograph the exact moment of sunset. Compare shots!', difficulty: 'easy', xpReward: 72, coinReward: 44, completed: false, lat: 27.9774, lng: -82.8302, category: 'outdoor', venue: 'Pier 60, Clearwater Beach' },
  { id: 'dq8', title: 'Tarpon Arts Duo Tour', description: 'Explore the Arts District and find every mural together. Agree on a top-3 list and debate the winner.', difficulty: 'medium', xpReward: 132, coinReward: 84, completed: false, lat: 28.1464, lng: -82.7548, category: 'culture', venue: 'Arts District, Tarpon Springs' },
  { id: 'dq9', title: 'Caladesi Island Duo Expedition', description: 'Ferry over to Caladesi Island together and make it to Shell Key before heading back. Count the pelicans.', difficulty: 'hard', xpReward: 285, coinReward: 178, completed: false, lat: 28.0636, lng: -82.8316, category: 'outdoor', venue: 'Caladesi Island Ferry Dock' },
  { id: 'dq10', title: 'Pinellas Trail Duo Ride', description: 'Bike the Pinellas Trail together for 10 miles. Set a pace, don\'t leave your partner behind, and celebrate at the finish.', difficulty: 'hard', xpReward: 325, coinReward: 202, completed: false, lat: 28.0790, lng: -82.7706, category: 'fitness', venue: 'Pinellas Trail — Pop Stansell Park', route: TRAIL_ROUTE },
];

// ── Trio Quests ──────────────────────────────────────────────────────────────
const INITIAL_TRIO_QUESTS: Quest[] = [
  { id: 'tq1', title: 'Clearwater Beach Trio Volleyball', description: 'Find a net on Clearwater Beach and challenge another group to volleyball. Best of 3 games!', difficulty: 'medium', xpReward: 155, coinReward: 98, completed: false, lat: 27.9774, lng: -82.8302, category: 'fitness', venue: 'Clearwater Beach' },
  { id: 'tq2', title: 'Greek Food Tour for Three', description: 'Each person orders a different course at three Sponge Docks spots and shares with the group. End with baklava — required.', difficulty: 'medium', xpReward: 148, coinReward: 95, completed: false, lat: 28.1557, lng: -82.7610, category: 'food', venue: 'Sponge Docks, Tarpon Springs' },
  { id: 'tq3', title: 'Palm Harbor Trio Scavenger Hunt', description: 'Split roles: Navigator, Photographer, Historian. Find 10 historical markers around downtown Palm Harbor together.', difficulty: 'easy', xpReward: 74, coinReward: 44, completed: false, lat: 28.0781, lng: -82.7637, category: 'culture', venue: 'Downtown Palm Harbor' },
  { id: 'tq4', title: 'Anclote Park Group Kayak', description: 'Rent three kayaks and paddle together from Anclote River Park. First person to spot a manatee or dolphin wins.', difficulty: 'hard', xpReward: 300, coinReward: 188, completed: false, lat: 28.1762, lng: -82.7881, category: 'outdoor', venue: 'Anclote River Park, Tarpon Springs' },
  { id: 'tq5', title: 'Dunedin Craft Breweries Tour', description: 'Visit three different craft breweries in Dunedin. Sample one flight each and vote on the group\'s favorite pint.', difficulty: 'medium', xpReward: 158, coinReward: 100, completed: false, lat: 28.0121, lng: -82.7898, category: 'food', venue: 'Downtown Dunedin' },
  { id: 'tq6', title: 'Trio Honeymoon Island Blitz', description: 'Race to complete the full Osprey Trail. Each person takes a different fork at every junction. Reunite at the end.', difficulty: 'medium', xpReward: 142, coinReward: 90, completed: false, lat: 28.0717, lng: -82.8323, category: 'outdoor', venue: 'Honeymoon Island State Park', route: OSPREY_ROUTE },
  { id: 'tq7', title: 'Safety Harbor Relay Run', description: 'Run a relay from Safety Harbor pier to Philippe Park and back. Each person covers a third — switch at marked points.', difficulty: 'medium', xpReward: 150, coinReward: 95, completed: false, lat: 27.9891, lng: -82.6862, category: 'fitness', venue: 'Safety Harbor Waterfront Park' },
  { id: 'tq8', title: 'Wall Springs Trio Nature Walk', description: 'Walk the Wall Springs boardwalk: each person must identify 5 unique plants or animals by the time you reach the spring.', difficulty: 'easy', xpReward: 67, coinReward: 40, completed: false, lat: 28.1069, lng: -82.7714, category: 'outdoor', venue: 'Wall Springs County Park, Palm Harbor' },
  { id: 'tq9', title: 'Clearwater Aquarium Trio Mission', description: 'Each member finds one rescued animal, learns its full story, then presents it to the others at the end of the visit.', difficulty: 'medium', xpReward: 138, coinReward: 87, completed: false, lat: 27.9769, lng: -82.8177, category: 'culture', venue: 'Clearwater Marine Aquarium' },
  { id: 'tq10', title: 'Pinellas Trail Trio Relay', description: 'Complete 15 miles on the Pinellas Trail as a relay — each person takes a 5-mile leg. Support each other at handoffs.', difficulty: 'hard', xpReward: 340, coinReward: 212, completed: false, lat: 28.0790, lng: -82.7706, category: 'fitness', venue: 'Pinellas Trail — Pop Stansell Park', route: TRAIL_ROUTE },
];

// ── Squad Quests (4 players) ─────────────────────────────────────────────────
const INITIAL_SQUAD_QUESTS: Quest[] = [
  { id: 'sq1', title: 'Four Corners Pinellas Tour', description: 'Each squad member photographs a different corner of Pinellas County: North, South, East, West. Meet back in Palm Harbor!', difficulty: 'medium', xpReward: 168, coinReward: 106, completed: false, lat: 28.0781, lng: -82.7637, category: 'adventure', venue: 'Pinellas County' },
  { id: 'sq2', title: 'Clearwater Beach Squad Olympics', description: 'Four events: frisbee distance, swimming sprint, sandcastle speed build, volleyball point. Winner gets eternal bragging rights.', difficulty: 'hard', xpReward: 315, coinReward: 196, completed: false, lat: 27.9774, lng: -82.8302, category: 'fitness', venue: 'Clearwater Beach' },
  { id: 'sq3', title: 'Full Squad Sponge Docks Feast', description: 'Each person orders one appetizer, one main, and one dessert from different Sponge Docks vendors. Share everything.', difficulty: 'medium', xpReward: 162, coinReward: 102, completed: false, lat: 28.1557, lng: -82.7610, category: 'food', venue: 'Sponge Docks, Tarpon Springs' },
  { id: 'sq4', title: 'Four-Kayak Race at Fred Howard Park', description: 'Race from the Fred Howard boat launch to the sandbar and back. No paddling assist allowed — pure technique wins.', difficulty: 'hard', xpReward: 328, coinReward: 204, completed: false, lat: 28.1530, lng: -82.7992, category: 'outdoor', venue: 'Fred Howard Park, Tarpon Springs' },
  { id: 'sq5', title: 'Honeymoon Island Squad Nature Walk', description: 'Walk the entire Osprey Trail in single file. Whoever breaks formation does 10 push-ups on the spot. No exceptions.', difficulty: 'easy', xpReward: 82, coinReward: 49, completed: false, lat: 28.0717, lng: -82.8323, category: 'outdoor', venue: 'Honeymoon Island State Park', route: OSPREY_ROUTE },
  { id: 'sq6', title: 'Dunedin Causeway Full Squad March', description: 'Walk or bike the entire Dunedin Causeway together and make it to the Gulf. Last one in buys lunch.', difficulty: 'medium', xpReward: 165, coinReward: 104, completed: false, lat: 28.0561, lng: -82.8070, category: 'outdoor', venue: 'Dunedin Causeway', route: CAUSEWAY_ROUTE },
  { id: 'sq7', title: 'Beach Clean-Up Squad Mission', description: 'Spend 1 hour cleaning Clearwater Beach as a squad. Each person brings a bag. Take a before-and-after photo together.', difficulty: 'easy', xpReward: 78, coinReward: 47, completed: false, lat: 27.9774, lng: -82.8302, category: 'community', venue: 'Clearwater Beach' },
  { id: 'sq8', title: 'Safety Harbor Spa + Fitness Day', description: 'Morning: 2-mile run around Philippe Park. Afternoon: spa treatment at Safety Harbor Spa. Wellness achieved.', difficulty: 'medium', xpReward: 164, coinReward: 103, completed: false, lat: 27.9891, lng: -82.6862, category: 'fitness', venue: 'Safety Harbor Spa & Resort' },
  { id: 'sq9', title: 'Four-Way Brewery Trivia Night', description: 'Form two teams of two at a Dunedin brewery. Play trivia night. Losing team buys the next round — no complaining.', difficulty: 'medium', xpReward: 155, coinReward: 98, completed: false, lat: 28.0121, lng: -82.7898, category: 'food', venue: 'Downtown Dunedin' },
  { id: 'sq10', title: 'Grand Pinellas Squad Tour', description: 'In one day: visit Sponge Docks, Pier 60, Safety Harbor Pier, Dunedin Main St, and Honeymoon Island. Photo proof at each.', difficulty: 'hard', xpReward: 420, coinReward: 262, completed: false, lat: 28.0784, lng: -82.7810, category: 'adventure', venue: 'Pinellas County' },
];

const INITIAL_SHOP_ITEMS: ShopItem[] = [
  { id: 'streak_freeze', name: 'Streak Freezer', description: 'Freeze your weekly streak for one week if you miss quests.', cost: 200, icon: '🧊', levelRequired: 1, owned: false, active: false },
  { id: 'xp_boost', name: 'XP Boost', description: 'Earn 2x XP from all quests for 7 days.', cost: 300, icon: '⚡', levelRequired: 3, owned: false, active: false },
  { id: 'coin_boost', name: 'Coin Boost', description: 'Earn 2x coins from all quests for 7 days.', cost: 350, icon: '💰', levelRequired: 5, owned: false, active: false },
  { id: 'quest_skip', name: 'Quest Skip', description: 'Skip one quest without losing streak progress.', cost: 150, icon: '⏭️', levelRequired: 2, owned: false, active: false },
  { id: 'coin_magnet', name: 'Coin Magnet', description: 'Double your coin drop collection radius on the map.', cost: 400, icon: '🧲', levelRequired: 7, owned: false, active: false },
  { id: 'legendary_title', name: 'Legendary Title', description: 'Display a "Legend" badge next to your name on the leaderboard.', cost: 1000, icon: '👑', levelRequired: 10, owned: false, active: false },
  { id: 'extra_quest', name: 'Bonus Quest Slot', description: 'Unlock an 11th quest each week for extra XP and coins.', cost: 500, icon: '➕', levelRequired: 8, owned: false, active: false },
  { id: 'dark_map', name: 'Dark Explorer Map', description: 'Unlock an exclusive dark-themed map skin with custom markers.', cost: 250, icon: '🗺️', levelRequired: 4, owned: false, active: false },
];

function genPartyCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      username: 'Adventurer',
      authUid: null,
      userHandle: null,
      displayName: '',
      level: 1,
      xp: 0,
      xpToNextLevel: XP_PER_LEVEL(1),
      coins: 100,
      streak: 0,
      weeklyQuestsCompleted: 0,
      totalQuestsCompleted: 0,
      premium: false,
      showGoldenRing: false,
      activeTab: 'home',
      weeklyQuests: INITIAL_QUESTS,
      duoQuests: INITIAL_DUO_QUESTS,
      trioQuests: INITIAL_TRIO_QUESTS,
      squadQuests: INITIAL_SQUAD_QUESTS,
      questMode: 'solo',
      completedQuestLog: [],
      shopItems: INITIAL_SHOP_ITEMS,
      xpBoostActive: false,
      coinBoostActive: false,
      streakFrozen: false,
      friends: [],
      coinDrops: [],
      completedEventQuests: [],
      activeQuestTimers: {},
      currentParty: null,
      theme: 'dark',
      hideCompleted: false,
      avatarColor: '#10b981',
      avatarUrl: null,
      activityFeed: [],
      mapZoom: 12,
      mapStyle: 'standard',
      showQuestRadius: true,
      autoFollowLocation: false,
      distanceUnit: 'mi',
      compactCards: false,
      soundEnabled: true,
      hapticEnabled: true,

      setAuthUid: (authUid) => set({ authUid }),
      setUserHandle: (userHandle) => set({ userHandle }),
      setDisplayName: (displayName) => set({ displayName }),
      setActiveTab: (tab) => set({ activeTab: tab }),
      setQuestMode: (questMode) => set({ questMode }),

      completeQuest: (questId, photoUrl, duration, timerBonus) => {
        const state = get();
        const quest = [...state.weeklyQuests, ...GOLDEN_QUESTS].find(q => q.id === questId);
        if (!quest || quest.completed) return { xpGained: 0, coinsGained: 0, newLevel: state.level };

        const xpMult = state.xpBoostActive ? 2 : 1;
        const coinMult = state.coinBoostActive ? 2 : 1;
        const bonusMult = timerBonus ? 1.25 : 1;
        const xpGained = Math.round(quest.xpReward * xpMult * bonusMult);
        const coinsGained = Math.round(quest.coinReward * coinMult * bonusMult);

        let newXP = state.xp + xpGained;
        let newLevel = state.level;
        while (newXP >= XP_PER_LEVEL(newLevel)) { newXP -= XP_PER_LEVEL(newLevel); newLevel++; }

        const newCompleted = state.weeklyQuestsCompleted + 1;

        const logEntry: CompletedQuest = {
          questId: quest.id, title: quest.title, difficulty: quest.difficulty,
          xpEarned: xpGained, coinsEarned: coinsGained,
          completedAt: new Date().toISOString(),
          week: Math.ceil(new Date().getDate() / 7), year: new Date().getFullYear(),
          photoUrl, duration, timerBonus, questMode: 'solo',
        };

        // remove timer if exists
        const timers = { ...state.activeQuestTimers };
        delete timers[questId];

        set({
          weeklyQuests: state.weeklyQuests.map(q => q.id === questId ? { ...q, completed: true } : q),
          xp: newXP, xpToNextLevel: XP_PER_LEVEL(newLevel), level: newLevel,
          coins: state.coins + coinsGained,
          weeklyQuestsCompleted: newCompleted,
          totalQuestsCompleted: state.totalQuestsCompleted + 1,
          completedQuestLog: [logEntry, ...state.completedQuestLog],
          streak: newCompleted === 10 ? state.streak + 1 : state.streak,
          activeQuestTimers: timers,
        });

        return { xpGained, coinsGained, newLevel };
      },

      completeGroupQuest: (questId, photoUrl, duration, timerBonus) => {
        const state = get();
        const mode = state.questMode;
        const arr = mode === 'duo' ? state.duoQuests : mode === 'trio' ? state.trioQuests : state.squadQuests;
        const quest = arr.find(q => q.id === questId);
        if (!quest || quest.completed) return { xpGained: 0, coinsGained: 0, newLevel: state.level };

        const xpMult = state.xpBoostActive ? 2 : 1;
        const coinMult = state.coinBoostActive ? 2 : 1;
        const bonusMult = timerBonus ? 1.25 : 1;
        const xpGained = Math.round(quest.xpReward * xpMult * bonusMult);
        const coinsGained = Math.round(quest.coinReward * coinMult * bonusMult);

        let newXP = state.xp + xpGained;
        let newLevel = state.level;
        while (newXP >= XP_PER_LEVEL(newLevel)) { newXP -= XP_PER_LEVEL(newLevel); newLevel++; }

        const logEntry: CompletedQuest = {
          questId: quest.id, title: quest.title, difficulty: quest.difficulty,
          xpEarned: xpGained, coinsEarned: coinsGained,
          completedAt: new Date().toISOString(),
          week: Math.ceil(new Date().getDate() / 7), year: new Date().getFullYear(),
          photoUrl, duration, timerBonus, questMode: mode,
        };

        const timers = { ...state.activeQuestTimers };
        delete timers[questId];

        const updatedArr = arr.map(q => q.id === questId ? { ...q, completed: true } : q);
        set({
          duoQuests: mode === 'duo' ? updatedArr : state.duoQuests,
          trioQuests: mode === 'trio' ? updatedArr : state.trioQuests,
          squadQuests: mode === 'squad' ? updatedArr : state.squadQuests,
          xp: newXP, xpToNextLevel: XP_PER_LEVEL(newLevel), level: newLevel,
          coins: state.coins + coinsGained,
          totalQuestsCompleted: state.totalQuestsCompleted + 1,
          completedQuestLog: [logEntry, ...state.completedQuestLog],
          activeQuestTimers: timers,
        });

        return { xpGained, coinsGained, newLevel };
      },

      completeEventQuest: (questId, title, difficulty, xpReward, coinReward, photoUrl) => {
        const state = get();
        if (state.completedEventQuests.includes(questId)) return { xpGained: 0, coinsGained: 0, newLevel: state.level };

        const xpMult = state.xpBoostActive ? 2 : 1;
        const coinMult = state.coinBoostActive ? 2 : 1;
        const xpGained = xpReward * xpMult;
        const coinsGained = coinReward * coinMult;

        let newXP = state.xp + xpGained;
        let newLevel = state.level;
        while (newXP >= XP_PER_LEVEL(newLevel)) { newXP -= XP_PER_LEVEL(newLevel); newLevel++; }

        const logEntry: CompletedQuest = {
          questId, title, difficulty: difficulty as import('@/types').Difficulty,
          xpEarned: xpGained, coinsEarned: coinsGained,
          completedAt: new Date().toISOString(),
          week: Math.ceil(new Date().getDate() / 7), year: new Date().getFullYear(),
          photoUrl,
        };

        set({
          completedEventQuests: [...state.completedEventQuests, questId],
          xp: newXP, xpToNextLevel: XP_PER_LEVEL(newLevel), level: newLevel,
          coins: state.coins + coinsGained,
          totalQuestsCompleted: state.totalQuestsCompleted + 1,
          completedQuestLog: [logEntry, ...state.completedQuestLog],
        });

        return { xpGained, coinsGained, newLevel };
      },

      collectCoinDrop: (coinId) => {
        const state = get();
        const drop = state.coinDrops.find(d => d.id === coinId);
        if (!drop || drop.collected) return 0;
        set({
          coinDrops: state.coinDrops.map(d => d.id === coinId ? { ...d, collected: true } : d),
          coins: state.coins + drop.amount,
        });
        return drop.amount;
      },

      buyShopItem: (itemId) => {
        const state = get();
        const item = state.shopItems.find(i => i.id === itemId);
        if (!item || item.owned || state.coins < item.cost || state.level < item.levelRequired) return false;
        set({
          shopItems: state.shopItems.map(i => i.id === itemId ? { ...i, owned: true, active: true } : i),
          coins: state.coins - item.cost,
          xpBoostActive: itemId === 'xp_boost' ? true : state.xpBoostActive,
          coinBoostActive: itemId === 'coin_boost' ? true : state.coinBoostActive,
          streakFrozen: itemId === 'streak_freeze' ? true : state.streakFrozen,
        });
        return true;
      },

      refreshWeeklyQuests: () => set(() => ({
        weeklyQuests: INITIAL_QUESTS.map(q => ({ ...q, completed: false })),
        weeklyQuestsCompleted: 0,
      })),

      startQuestTimer: (questId, mode, targetMs) => set(s => ({
        activeQuestTimers: {
          ...s.activeQuestTimers,
          [questId]: { startTime: Date.now(), mode, targetMs },
        },
      })),

      cancelQuestTimer: (questId) => set(s => {
        const timers = { ...s.activeQuestTimers };
        delete timers[questId];
        return { activeQuestTimers: timers };
      }),

      createParty: (name) => {
        const state = get();
        const party: Party = {
          id: `p${Date.now()}`,
          name,
          code: genPartyCode(),
          leaderId: state.username,
          members: [state.username],
          mode: 'duo',
        };
        set({ currentParty: party, questMode: 'duo' });
        return party;
      },

      joinParty: (code) => {
        const state = get();
        // Simulate joining: create a party with the given code
        const party: Party = {
          id: `p${Date.now()}`,
          name: `Party ${code}`,
          code,
          leaderId: 'Unknown',
          members: ['Unknown', state.username],
          mode: 'duo',
        };
        set({ currentParty: party, questMode: 'duo' });
        return true;
      },

      leaveParty: () => set({ currentParty: null, questMode: 'solo' }),

      togglePremium: () => set(s => ({ premium: !s.premium })),
      toggleGoldenRing: () => set(s => ({ showGoldenRing: !s.showGoldenRing })),

      setTheme: (theme) => set({ theme }),
      setHideCompleted: (hideCompleted) => set({ hideCompleted }),
      setAvatarColor: (avatarColor) => set({ avatarColor }),
      setAvatarUrl: (avatarUrl) => set({ avatarUrl }),
      addActivityItem: (item) => set(s => ({
        activityFeed: [item, ...s.activityFeed.filter(a => !(a.uid === item.uid && a.timestamp === item.timestamp))].slice(0, 50),
      })),
      setMapZoom: (mapZoom) => set({ mapZoom }),
      setMapStyle: (mapStyle) => set({ mapStyle }),
      setShowQuestRadius: (showQuestRadius) => set({ showQuestRadius }),
      setAutoFollowLocation: (autoFollowLocation) => set({ autoFollowLocation }),
      setDistanceUnit: (distanceUnit) => set({ distanceUnit }),
      setCompactCards: (compactCards) => set({ compactCards }),
      setSoundEnabled: (soundEnabled) => set({ soundEnabled }),
      setHapticEnabled: (hapticEnabled) => set({ hapticEnabled }),

      addZombieGameReward: () => {
        const s = get();
        let xp    = s.xp + 750;
        let level = s.level;
        let xpToNextLevel = s.xpToNextLevel;
        while (xp >= xpToNextLevel) {
          xp -= xpToNextLevel;
          level++;
          xpToNextLevel = XP_PER_LEVEL(level);
        }
        set({
          coins: s.coins + 1500,
          xp, level, xpToNextLevel,
          totalQuestsCompleted: s.totalQuestsCompleted + 1,
          completedQuestLog: [
            {
              questId: `zombie-${Date.now()}`,
              title: 'Zombie Survival',
              difficulty: 'hard' as const,
              xpEarned: 750,
              coinsEarned: 1500,
              completedAt: new Date().toISOString(),
              week: new Date().getDay(),
              year: new Date().getFullYear(),
            },
            ...s.completedQuestLog,
          ],
        });
      },

      resetProgress: () => set({
        level: 1, xp: 0, xpToNextLevel: XP_PER_LEVEL(1), coins: 100,
        streak: 0, weeklyQuestsCompleted: 0, totalQuestsCompleted: 0,
        weeklyQuests: INITIAL_QUESTS.map(q => ({ ...q, completed: false })),
        duoQuests: INITIAL_DUO_QUESTS.map(q => ({ ...q, completed: false })),
        trioQuests: INITIAL_TRIO_QUESTS.map(q => ({ ...q, completed: false })),
        squadQuests: INITIAL_SQUAD_QUESTS.map(q => ({ ...q, completed: false })),
        completedQuestLog: [], completedEventQuests: [],
        shopItems: INITIAL_SHOP_ITEMS,
        xpBoostActive: false, coinBoostActive: false, streakFrozen: false,
        premium: false, showGoldenRing: false,
        activeQuestTimers: {}, currentParty: null, questMode: 'solo',
      }),

      addFriend: (username) => {
        const state = get();
        if (state.friends.find(f => f.username.toLowerCase() === username.toLowerCase())) return false;
        const newFriend: Friend = {
          id: `f${Date.now()}`, username,
          level: Math.floor(Math.random() * 15) + 1,
          xp: Math.floor(Math.random() * 20000),
          streak: Math.floor(Math.random() * 10),
          questsCompleted: Math.floor(Math.random() * 200),
          coins: Math.floor(Math.random() * 5000),
          premium: Math.random() > 0.5,
        };
        set({ friends: [...state.friends, newFriend] });
        return true;
      },

      removeFriend: (friendId) => set(s => ({ friends: s.friends.filter(f => f.id !== friendId) })),
      setUsername: (name) => set({ username: name }),
    }),
    { name: 'questify-v6' }
  )
);
