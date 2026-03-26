export type Difficulty = 'easy' | 'medium' | 'hard' | 'golden';
export type QuestMode = 'solo' | 'duo' | 'trio' | 'squad';

export interface Quest {
  id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  xpReward: number;
  coinReward: number;
  completed: boolean;
  lat: number;
  lng: number;
  category: string;
  venue: string;
  route?: [number, number][];   // polyline: array of [lat, lng] waypoints
}

export interface Party {
  id: string;
  name: string;
  code: string;           // 6-char invite code
  leaderId: string;       // username of leader
  members: string[];      // usernames
  mode: QuestMode;        // party size → quest mode
}

export interface ActiveQuestTimer {
  startTime: number;      // Date.now()
  mode: 'stopwatch' | 'timer';
  targetMs?: number;      // timer mode: deadline in ms
}

export interface ShopItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  coinCost?: number;
  icon: string;
  levelRequired: number;
  owned: boolean;
  active: boolean;
}

export interface Friend {
  id: string;
  username: string;
  level: number;
  xp: number;
  streak: number;
  questsCompleted: number;
  coins: number;
  premium: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  level: number;
  xp: number;
  coins: number;
  streak: number;
  questsCompleted: number;
  weeklyQuests: number;
  premium: boolean;
  isCurrentUser?: boolean;
}

export interface CompletedQuest {
  questId: string;
  title: string;
  difficulty: Difficulty;
  xpEarned: number;
  coinsEarned: number;
  completedAt: string;
  week: number;
  year: number;
  photoUrl?: string;
  duration?: number;       // seconds taken
  timerBonus?: boolean;    // completed within self-set timer
  questMode?: QuestMode;   // solo / duo / trio / squad
}

export interface SeasonalEvent {
  id: string;
  name: string;
  description: string;
  icon: string;
  season: string;
  bonusXP: number;
  bonusCoins: number;
  xpMultiplier: number;
  specialQuests: Quest[];
  endsAt: string;
  color: string;
}

export interface ActivityItem {
  uid: string;
  username: string;
  questTitle: string;
  difficulty: Difficulty;
  xpGained: number;
  timestamp: number;
}

export interface ChatMessage {
  id: string;
  uid: string;
  username: string;
  text: string;
  createdAt: number;
}

export interface CoinDrop {
  id: string;
  lat: number;
  lng: number;
  amount: number;
  collected: boolean;
}
