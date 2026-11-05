import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  Folder,
  Plus,
  Trash2,
  Edit3,
  Check,
  X,
  Download,
  Upload,
  Play,
  Sparkles,
  Flame,
  History,
  Crown,
  Sliders,
  Target,
  ChevronDown,
  ChevronRight,
  Eye,
  RotateCcw,
  Copy,
  AlertCircle,
  CheckCircle2,
  Layers,
  ShieldAlert,
  Info,
  Zap,
  Lock,
  Cloud,
  CloudOff,
  RefreshCw,
  LogIn,
  LogOut,
  User,
  Database
} from 'lucide-react';

// ============================================================================
// 0. SUPABASE CLIENT SINGLETON & CLOUD SYNC ENGINE
// ============================================================================

const SUPABASE_URL = 'https://srrrrfaqkncrplothrrj.supabase.co';
const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_lCNWXgpMeLFuhgrSRtFe4A_IJA_Fiyk';

// Replace this URL with your live Stripe or Lemon Squeezy Payment Link
const CHECKOUT_BASE_URL = 'https://rangeflow.lemonsqueezy.com/checkout/buy/0a27b4ce-c89e-49eb-89d9-99c72db9949b';

const SUPABASE_SESSION_KEY = 'rangeflow_supabase_session_v4';

export interface SupabaseUser {
  id: string;
  email?: string;
  user_metadata?: { [key: string]: any };
}

export interface SupabaseSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user: SupabaseUser;
}

type AuthChangeCallback = (event: string, session: SupabaseSession | null) => void;

function createClient(supabaseUrl: string, supabaseKey: string) {
  let currentSession: SupabaseSession | null = null;
  const listeners = new Set<AuthChangeCallback>();

  try {
    const saved = localStorage.getItem(SUPABASE_SESSION_KEY);
    if (saved) {
      currentSession = JSON.parse(saved);
    }
  } catch {
    currentSession = null;
  }

  const saveSession = (sess: SupabaseSession | null, eventName: string) => {
    currentSession = sess;
    try {
      if (sess) {
        localStorage.setItem(SUPABASE_SESSION_KEY, JSON.stringify(sess));
      } else {
        localStorage.removeItem(SUPABASE_SESSION_KEY);
      }
    } catch {
      // Ignore storage quota errors
    }
    listeners.forEach(cb => {
      try {
        cb(eventName, currentSession);
      } catch {
        // Ignore callback errors
      }
    });
  };

  const getHeaders = (useAuth = true): Record<string, string> => {
    const headers: Record<string, string> = {
      apikey: supabaseKey,
      'Content-Type': 'application/json'
    };
    if (useAuth && currentSession?.access_token) {
      headers['Authorization'] = `Bearer ${currentSession.access_token}`;
    } else {
      headers['Authorization'] = `Bearer ${supabaseKey}`;
    }
    return headers;
  };

  return {
    supabaseUrl,
    supabaseKey,
    auth: {
      async getSession() {
        if (!currentSession?.access_token) {
          return { data: { session: null }, error: null };
        }
        try {
          const res = await fetch(`https://srrrrfaqkncrplothrrj.supabase.co/auth/v1/user`, {
            method: 'GET',
            headers: getHeaders(true)
          });
          if (res.ok) {
            const user = await res.json();
            currentSession = { ...currentSession, user };
            saveSession(currentSession, 'INITIAL_SESSION');
            return { data: { session: currentSession }, error: null };
          } else if (res.status === 401 || res.status === 403) {
            saveSession(null, 'SIGNED_OUT');
            return { data: { session: null }, error: null };
          }
        } catch {
          // Offline fallback: keep cached session
        }
        return { data: { session: currentSession }, error: null };
      },

      async signUp({ email, password, options }: { email: string; password: string; options?: { data?: any } }) {
        try {
          const res = await fetch(`https://srrrrfaqkncrplothrrj.supabase.co/auth/v1/signup`, {
            method: 'POST',
            headers: getHeaders(false),
            body: JSON.stringify({
              email,
              password,
              data: options?.data || {}
            })
          });
          const data = await res.json();
          if (!res.ok) {
            return {
              data: { user: null, session: null },
              error: { message: data.msg || data.error_description || data.message || 'Sign up failed' }
            };
          }
          const session: SupabaseSession | null = data.access_token
            ? {
                access_token: data.access_token,
                refresh_token: data.refresh_token,
                user: data.user
              }
            : null;
          if (session) {
            saveSession(session, 'SIGNED_IN');
          }
          return { data: { user: data.user || data, session }, error: null };
        } catch (err: any) {
          return {
            data: { user: null, session: null },
            error: { message: err?.message || 'Network error connecting to Supabase' }
          };
        }
      },

      async signInWithPassword({ email, password }: { email: string; password: string }) {
        try {
          const res = await fetch(`https://srrrrfaqkncrplothrrj.supabase.co/auth/v1/token?grant_type=password`, {
            method: 'POST',
            headers: getHeaders(false),
            body: JSON.stringify({ email, password })
          });
          const data = await res.json();
          if (!res.ok) {
            return {
              data: { user: null, session: null },
              error: { message: data.msg || data.error_description || data.message || 'Invalid login credentials' }
            };
          }
          const session: SupabaseSession = {
            access_token: data.access_token,
            refresh_token: data.refresh_token,
            user: data.user
          };
          saveSession(session, 'SIGNED_IN');
          return { data: { user: data.user, session }, error: null };
        } catch (err: any) {
          return {
            data: { user: null, session: null },
            error: { message: err?.message || 'Network error connecting to Supabase' }
          };
        }
      },

      async signInWithOtp({ email }: { email: string }) {
        try {
          const res = await fetch(`https://srrrrfaqkncrplothrrj.supabase.co/auth/v1/otp`, {
            method: 'POST',
            headers: getHeaders(false),
            body: JSON.stringify({ email, create_user: true })
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            return {
              data: {},
              error: { message: data.msg || data.error_description || data.message || 'Failed to send magic link' }
            };
          }
          return { data, error: null };
        } catch (err: any) {
          return { data: {}, error: { message: err?.message || 'Network error connecting to Supabase' } };
        }
      },

      async updateUser(attributes: { data?: Record<string, any> }) {
        if (!currentSession?.access_token) {
          return { data: { user: null }, error: { message: 'Not authenticated' } };
        }
        try {
          const res = await fetch(`https://srrrrfaqkncrplothrrj.supabase.co/auth/v1/user`, {
            method: 'PUT',
            headers: getHeaders(true),
            body: JSON.stringify(attributes)
          });
          const data = await res.json();
          if (!res.ok) {
            return {
              data: { user: null },
              error: { message: data.msg || data.message || 'Failed to update user metadata' }
            };
          }
          currentSession = { ...currentSession, user: data };
          saveSession(currentSession, 'USER_UPDATED');
          return { data: { user: data }, error: null };
        } catch (err: any) {
          return { data: { user: null }, error: { message: err?.message || 'Network error' } };
        }
      },

      async signOut() {
        if (currentSession?.access_token) {
          try {
            await fetch(`https://srrrrfaqkncrplothrrj.supabase.co/auth/v1/logout`, {
              method: 'POST',
              headers: getHeaders(true)
            });
          } catch {
            // Ignore network error on logout
          }
        }
        saveSession(null, 'SIGNED_OUT');
        return { error: null };
      },

      onAuthStateChange(callback: AuthChangeCallback) {
        listeners.add(callback);
        return {
          data: {
            subscription: {
              unsubscribe: () => {
                listeners.delete(callback);
              }
            }
          }
        };
      }
    },

    from(table: string) {
      return {
        async select(columns = '*', filterCol?: string, filterVal?: string) {
          try {
            const query = filterCol && filterVal
              ? `?select=${encodeURIComponent(columns)}&${encodeURIComponent(filterCol)}=eq.${encodeURIComponent(filterVal)}`
              : `?select=${encodeURIComponent(columns)}`;
            const res = await fetch(`https://srrrrfaqkncrplothrrj.supabase.co/rest/v1/${table}${query}`, {
              method: 'GET',
              headers: getHeaders(true)
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
              return { data: null, error: data || { message: `HTTP ${res.status}` } };
            }
            return { data, error: null };
          } catch (err: any) {
            return { data: null, error: { message: err?.message || 'Network error' } };
          }
        },

        async upsert(values: Record<string, any> | Record<string, any>[], options?: { onConflict?: string }) {
          try {
            const query = options?.onConflict ? `?on_conflict=${encodeURIComponent(options.onConflict)}` : '';
            const res = await fetch(`https://srrrrfaqkncrplothrrj.supabase.co/rest/v1/${table}${query}`, {
              method: 'POST',
              headers: {
                ...getHeaders(true),
                Prefer: 'resolution=merge-duplicates,return=representation'
              },
              body: JSON.stringify(values)
            });
            const data = await res.json().catch(() => null);
            if (!res.ok) {
              return { data: null, error: data || { message: `HTTP ${res.status}` } };
            }
            return { data, error: null };
          } catch (err: any) {
            return { data: null, error: { message: err?.message || 'Network error' } };
          }
        }
      };
    }
  };
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

// ============================================================================
// 1. CORE CONSTANTS & TYPES
// ============================================================================

export type ScenarioType = 'Open Raise (RFI)' | 'Facing Open' | 'Facing 3-Bet' | 'Facing 4-Bet';
export type StrategyMode = 'raw' | 'pure';

export interface FolderItem {
  id: string;
  name: string;
}

export interface ChartAction {
  id: string;
  name: string;
  size: string;
  color: string;
}

export interface ChartData {
  spotId: string;
  folderId: string;
  tableSize: number;
  stackDepth: number;
  scenarioType: ScenarioType;
  heroPos: string;
  villainPos: string;
  villainSize: string;
  villainBetSize?: number;
  facingBetSize?: number;
  strategyMode: StrategyMode;
  actions: ChartAction[];
  rawHands: { [handKey: string]: { [actionId: string]: number } };
  pureSwaps: { [handKey: string]: string };
  customTrainingHands: string[] | null;
}

export interface LeakEntry {
  leakKey: string;
  spotId: string;
  folderId: string;
  scenarioType: ScenarioType;
  heroPos: string;
  villainPos: string;
  handKey: string;
  level: 0 | 1 | 2;
  lastSeenHandNum: number;
  mistakes: number;
}

export interface HandHistoryItem {
  id: string;
  timestamp: number;
  spotId: string;
  spotTitle: string;
  scenarioType: ScenarioType;
  heroPos: string;
  villainPos: string;
  handKey: string;
  cards: [string, string];
  rngRoll: number;
  chosenActionId: string;
  chosenActionName: string;
  expectedActionName: string;
  isCorrect: boolean;
  isLeakSession: boolean;
}

export interface StudioState {
  folders: FolderItem[];
  activeFolderId: string;
  playerOptions: number[];
  stackOptions: number[];
  customStacks?: string[];
  activePositions?: string[];
  activeTableSize: number;
  activeStackDepth: number;
  activeScenario: ScenarioType;
  activeHeroPos: string;
  activeVillainPos: string;
  charts: { [spotId: string]: ChartData };
  leaks: { [leakKey: string]: LeakEntry };
  history: HandHistoryItem[];
  totalHandsTrained: number;
  dailyHands: { date: string; count: number };
  dailyHandsCount: number;
  dailyHandsDate: string;
  isPro: boolean;
  scenarioStats: { [key in ScenarioType]?: { total: number; correct: number } };
  positionStats: { [pos: string]: { total: number; correct: number } };
}

export const STORAGE_KEY = 'rangeflow_studio_v4';

export const STUDIO_SWATCHES = [
  '#E06C75', '#D15A66', '#E07A5F', '#E59866',
  '#E5C07B', '#D4B46A', '#98C379', '#68B388',
  '#56B6C2', '#4FA6B8', '#61AFEF', '#528BFF',
  '#7C83FD', '#C678DD', '#D670AD', '#7F8C9A'
];

export const RANKS = ['A', 'K', 'Q', 'J', 'T', '9', '8', '7', '6', '5', '4', '3', '2'] as const;

export const SCENARIOS: ScenarioType[] = [
  'Open Raise (RFI)',
  'Facing Open',
  'Facing 3-Bet',
  'Facing 4-Bet'
];

export function getSeatsForTableSize(tableSize: number): string[] {
  switch (tableSize) {
    case 2:
      return ['BTN', 'BB'];
    case 3:
      return ['BTN', 'SB', 'BB'];
    case 4:
      return ['CO', 'BTN', 'SB', 'BB'];
    case 5:
      return ['HJ', 'CO', 'BTN', 'SB', 'BB'];
    case 6:
      return ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
    case 7:
      return ['UTG', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
    case 8:
      return ['UTG', 'UTG+1', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
    case 9:
      return ['UTG', 'UTG+1', 'UTG+2', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
    case 10:
      return ['UTG', 'UTG+1', 'UTG+2', 'MP', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
    default:
      return ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
  }
}

export function getDefaultVillainSize(scenario: ScenarioType): string {
  if (scenario === 'Facing Open') return '2.5bb';
  if (scenario === 'Facing 3-Bet') return '7.5bb';
  if (scenario === 'Facing 4-Bet') return '22bb';
  return '0bb';
}

export function getDefaultActions(scenario: ScenarioType): ChartAction[] {
  switch (scenario) {
    case 'Open Raise (RFI)':
      return [
        { id: 'raise', name: 'Raise', size: '2.5bb', color: '#E06C75' },
        { id: 'call', name: 'Call', size: '', color: '#68B388' }
      ];
    case 'Facing Open':
      return [
        { id: 'threeBet', name: '3-Bet', size: '7.5bb', color: '#E5C07B' },
        { id: 'call', name: 'Call', size: '', color: '#68B388' }
      ];
    case 'Facing 3-Bet':
      return [
        { id: 'fourBet', name: '4-Bet', size: '22bb', color: '#C678DD' },
        { id: 'call', name: 'Call', size: '', color: '#68B388' }
      ];
    case 'Facing 4-Bet':
      return [
        { id: 'allIn', name: 'All-In', size: '100bb', color: '#C678DD' },
        { id: 'call', name: 'Call', size: '', color: '#68B388' }
      ];
  }
}

// Generate 13x13 matrix of 169 hands
export const HAND_MATRIX: string[][] = RANKS.map((r1, i) =>
  RANKS.map((r2, j) => {
    if (i === j) return `${r1}${r2}`;
    if (i < j) return `${r1}${r2}s`;
    return `${r2}${r1}o`;
  })
);

export const ALL_169_HANDS: string[] = HAND_MATRIX.flat();

export const HAND_COORDS: { [handKey: string]: [number, number] } = {};
HAND_MATRIX.forEach((row, rIdx) => {
  row.forEach((h, cIdx) => {
    HAND_COORDS[h] = [rIdx, cIdx];
  });
});

export function getHandCombos(handKey: string): number {
  if (handKey.length === 2) return 6;
  if (handKey.endsWith('s')) return 4;
  return 12;
}

// ============================================================================
// 2. 12 STRATEGIC BUCKETS (MUTUALLY EXCLUSIVE, COVERING ALL 169 HANDS)
// ============================================================================

export interface StrategicBucket {
  id: string;
  title: string;
  shorthand: string;
  hands: string[];
}

function classifyHandBucket(handKey: string): string {
  if (handKey.length === 2) return 'pocket_pairs';
  const r1 = handKey[0];
  const r2 = handKey[1];
  const suited = handKey.endsWith('s');
  const i1 = RANKS.indexOf(r1 as typeof RANKS[number]); // 0 (A) to 12 (2)
  const i2 = RANKS.indexOf(r2 as typeof RANKS[number]); // i2 > i1 always
  const gap = i2 - i1;

  // Broadway ranks: A(0), K(1), Q(2), J(3), T(4)
  if (i1 <= 4 && i2 <= 4) {
    return suited ? 'suited_broadways' : 'offsuit_broadways';
  }
  // Remaining Aces: A9 - A2
  if (i1 === 0) {
    return suited ? 'suited_aces' : 'offsuit_aces';
  }
  // Remaining Kings & Queens: K9-K2, Q9-Q2
  if (i1 === 1 || i1 === 2) {
    return suited ? 'suited_kings_queens' : 'offsuit_kings_queens';
  }
  // Now i1 >= 3 (J through 2) and i2 >= 5 (9 through 2)
  if (suited) {
    if (gap === 1) return 'suited_connectors'; // T9s down to 32s (8 hands)
    if (gap === 2 || gap === 3) return 'suited_gappers'; // 1-gappers and 2-gappers from J down to 2
    return 'suited_low_misc';
  } else {
    if (gap <= 3) return 'offsuit_connectors_gappers';
    return 'offsuit_low_trash';
  }
}

export const STRATEGIC_BUCKETS: StrategicBucket[] = (() => {
  const defs: { id: string; title: string; shorthand: string }[] = [
    { id: 'pocket_pairs', title: 'Pocket Pairs', shorthand: 'AA - 22' },
    { id: 'suited_broadways', title: 'Suited Broadways', shorthand: 'AKs - JTs' },
    { id: 'suited_aces', title: 'Suited Aces', shorthand: 'A9s - A2s' },
    { id: 'suited_kings_queens', title: 'Suited Kings & Queens', shorthand: 'K9s - Q2s' },
    { id: 'suited_connectors', title: 'Suited Connectors', shorthand: 'T9s - 32s' },
    { id: 'suited_gappers', title: 'Suited Gappers', shorthand: 'J9s - 42s' },
    { id: 'suited_low_misc', title: 'Suited Low / Misc', shorthand: 'J7s - 62s' },
    { id: 'offsuit_broadways', title: 'Offsuit Broadways', shorthand: 'AKo - JTo' },
    { id: 'offsuit_aces', title: 'Offsuit Aces', shorthand: 'A9o - A2o' },
    { id: 'offsuit_kings_queens', title: 'Offsuit Kings & Queens', shorthand: 'K9o - Q2o' },
    { id: 'offsuit_connectors_gappers', title: 'Offsuit Connectors & Gappers', shorthand: 'J9o - 32o' },
    { id: 'offsuit_low_trash', title: 'Offsuit Low / Trash', shorthand: 'J7o - 62o' }
  ];

  const map: { [id: string]: string[] } = {};
  defs.forEach(d => { map[d.id] = []; });

  // Sort hands inside each bucket by strength/rank order
  ALL_169_HANDS.forEach(h => {
    const bId = classifyHandBucket(h);
    if (map[bId]) map[bId].push(h);
  });

  return defs.map(d => ({
    ...d,
    hands: map[d.id]
  }));
})();

export const HAND_TO_BUCKET_ID: { [handKey: string]: string } = {};
STRATEGIC_BUCKETS.forEach(b => {
  b.hands.forEach(h => {
    HAND_TO_BUCKET_ID[h] = b.id;
  });
});

// Hand strength ordering inside each bucket for Auto-Pure sorting
function getHandStrengthScore(handKey: string): number {
  const r1 = RANKS.indexOf(handKey[0] as typeof RANKS[number]);
  const r2 = RANKS.indexOf(handKey[1] as typeof RANKS[number]);
  const v1 = 14 - r1;
  const v2 = 14 - r2;
  if (handKey.length === 2) {
    return 1000 + v1 * 20;
  }
  const suitedBonus = handKey.endsWith('s') ? 15 : 0;
  const gapPenalty = Math.max(0, (v1 - v2 - 1) * 1.5);
  return v1 * 18 + v2 * 4 + suitedBonus - gapPenalty;
}

// ============================================================================
// 3. SPOT HELPERS, AUTO-PURE ALGORITHM & SMART TRAINING HANDS
// ============================================================================

export function buildSpotId(
  folderId: string,
  tableSize: number,
  stackDepth: number,
  scenarioType: ScenarioType,
  heroPos: string,
  villainPos: string
): string {
  return `${folderId}__${tableSize}__${stackDepth}__${scenarioType}__${heroPos}__${villainPos}`;
}

export const POS_ORDER = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'] as const;

export interface TableSeatState {
  pos: string;
  isHero: boolean;
  isVillain: boolean;
  status: string;
  bet: number;
  stack: number;
  hasCards: boolean;
  dimmed: boolean;
  isActingNow: boolean;
}

export interface TableFrame {
  seats: TableSeatState[];
  deadBlinds: number;
  totalPot: number;
  awaitingHeroDecision: boolean;
  stepDelayMs: number;
}

export function buildPreflopFrames(
  situation: string,
  heroPos: string,
  villainPos: string,
  activeChart?: ChartData | null
): TableFrame[] {
  const hIdx = Math.max(0, POS_ORDER.indexOf(heroPos as any));
  const vIdx = POS_ORDER.indexOf(villainPos as any);

  const isRFI = situation.toLowerCase().includes('rfi') || situation.toLowerCase().includes('first in');
  const isVsOpen = situation.toLowerCase().includes('open') && !isRFI;
  const isVs3Bet = situation.toLowerCase().includes('3-bet') || situation.toLowerCase().includes('3bet');

  const stackDepth = activeChart?.stackDepth || 100;
  const customVillainBet = parseFloat(
    String(activeChart?.villainBetSize ?? activeChart?.facingBetSize ?? activeChart?.villainSize ?? '')
  );
  const validVillainBet = !isNaN(customVillainBet) && customVillainBet > 0 ? customVillainBet : null;

  let deadBlinds = 0;

  // Frame 0 (Blinds Posted): All 6 seats have hole cards, SB has 0.5 BB, BB has 1.0 BB
  const workingSeats: TableSeatState[] = POS_ORDER.map((pos, idx) => {
    const isHero = idx === hIdx;
    const isVillain = !isRFI && idx === vIdx;
    const initialBlind = pos === 'SB' ? 0.5 : pos === 'BB' ? 1.0 : 0;
    const initialBadge =
      pos === 'SB' ? 'SB 0.5 BB' : pos === 'BB' ? 'BB 1.0 BB' : 'WAIT';

    return {
      pos,
      isHero,
      isVillain,
      status: initialBadge,
      bet: initialBlind,
      stack: Number((stackDepth - initialBlind).toFixed(1)),
      hasCards: true,
      dimmed: false,
      isActingNow: false
    };
  });

  const frames: TableFrame[] = [];

  const pushSnapshot = (actingIdx: number | null, awaitingHero: boolean, stepDelayMs: number) => {
    const clonedSeats = workingSeats.map((s, idx) => ({
      ...s,
      isActingNow: actingIdx === idx
    }));
    const sumOfActiveBets = clonedSeats.reduce((sum, s) => sum + s.bet, 0);
    const totalPot = Number((deadBlinds + sumOfActiveBets).toFixed(1));
    frames.push({
      seats: clonedSeats,
      deadBlinds,
      totalPot,
      awaitingHeroDecision: awaitingHero,
      stepDelayMs
    });
  };

  // Push Frame 0 (Blinds Posted)
  pushSnapshot(null, false, 220);

  const recordFold = (seatIdx: number) => {
    const s = workingSeats[seatIdx];
    if (s.bet > 0) {
      deadBlinds = Number((deadBlinds + s.bet).toFixed(1));
      s.bet = 0;
    }
    s.status = 'FOLD';
    s.hasCards = false;
    s.dimmed = true;
    pushSnapshot(seatIdx, false, 180);
  };

  const recordBetOrRaise = (seatIdx: number, amountBB: number, badgeText: string) => {
    const s = workingSeats[seatIdx];
    s.bet = amountBB;
    s.stack = Number((stackDepth - amountBB).toFixed(1));
    s.status = badgeText;
    s.hasCards = true;
    s.dimmed = false;
    pushSnapshot(seatIdx, false, 260);
  };

  const recordHeroTurnReady = (badgeText: string) => {
    const s = workingSeats[hIdx];
    s.status = badgeText;
    pushSnapshot(hIdx, true, 0);
  };

  if (isRFI) {
    // Case A: RFI (Hero is at hIdx)
    // 1. Clockwise from UTG (0) to hIdx - 1: Each player acts in turn and Folds
    for (let i = 0; i < hIdx; i++) {
      recordFold(i);
    }
    // 2. Action arrives at hIdx (Hero): Playback finishes, Hero's seat highlights with YOUR TURN
    recordHeroTurnReady('YOUR TURN');
    return frames;
  }

  if (isVsOpen) {
    // Case B: vs Open (Villain at vIdx < Hero at hIdx)
    const safeVIdx = vIdx >= 0 && vIdx < hIdx ? vIdx : 0;
    // 1. Clockwise from UTG (0) to vIdx - 1: Each player Folds one by one
    for (let i = 0; i < safeVIdx; i++) {
      recordFold(i);
    }
    // 2. At vIdx (Villain): Villain Opens to validVillainBet or 2.5 BB
    const openSize = validVillainBet ?? 2.5;
    recordBetOrRaise(safeVIdx, openSize, `OPEN ${openSize} BB`);
    // 3. Clockwise from vIdx + 1 to hIdx - 1: Each player between Villain and Hero Folds one by one
    for (let i = safeVIdx + 1; i < hIdx; i++) {
      recordFold(i);
    }
    // 4. Action arrives at hIdx (Hero): Playback finishes, Hero's seat highlights with YOUR TURN
    recordHeroTurnReady('YOUR TURN');
    return frames;
  }

  if (isVs3Bet) {
    // Case C: vs 3-Bet (Hero at hIdx < Villain at vIdx)
    const safeVIdx = vIdx > hIdx ? vIdx : Math.min(POS_ORDER.length - 1, hIdx + 1);
    // 1. Clockwise from UTG (0) to hIdx - 1: Each player before Hero Folds one by one
    for (let i = 0; i < hIdx; i++) {
      recordFold(i);
    }
    // 2. At hIdx (Hero): Hero automatically Open Raises to 2.5 BB
    const heroOpenSize = 2.5;
    recordBetOrRaise(hIdx, heroOpenSize, `OPEN ${heroOpenSize} BB`);
    // 3. Clockwise from hIdx + 1 to vIdx - 1: Each player between Hero and Villain Folds one by one
    for (let i = hIdx + 1; i < safeVIdx; i++) {
      recordFold(i);
    }
    // 4. At vIdx (Villain): Villain 3-Bets to validVillainBet or 7.5 BB
    const villain3BetSize = validVillainBet ?? 7.5;
    recordBetOrRaise(safeVIdx, villain3BetSize, `3-BET ${villain3BetSize} BB`);
    // 5. Clockwise from vIdx + 1 to BB (5): Every remaining player after Villain Folds one by one
    for (let i = safeVIdx + 1; i < POS_ORDER.length; i++) {
      recordFold(i);
    }
    // 6. Action returns to hIdx (Hero): Playback finishes, Hero's seat shows YOUR TURN (vs 3-BET)
    recordHeroTurnReady('YOUR TURN (vs 3-BET)');
    return frames;
  }

  // Case D: vs 4-Bet (Villain at vIdx < Hero at hIdx, e.g., HJ vs UTG 4-Bet)
  const safeVIdx = vIdx >= 0 && vIdx < hIdx ? vIdx : 0;
  // 1. Clockwise from UTG (0) to vIdx - 1: Each player before Villain Folds one by one
  for (let i = 0; i < safeVIdx; i++) {
    recordFold(i);
  }
  // 2. At vIdx (Villain): Villain Opens to 2.5 BB
  const vOpenSize = 2.5;
  recordBetOrRaise(safeVIdx, vOpenSize, `OPEN ${vOpenSize} BB`);
  // 3. Clockwise from vIdx + 1 to hIdx - 1: Each player between Villain and Hero Folds one by one
  for (let i = safeVIdx + 1; i < hIdx; i++) {
    recordFold(i);
  }
  // 4. At hIdx (Hero): Hero automatically 3-Bets to 7.5 BB
  const hero3BetSize = 7.5;
  recordBetOrRaise(hIdx, hero3BetSize, `3-BET ${hero3BetSize} BB`);
  // 5. Clockwise from hIdx + 1 to BB (5): Every remaining player Folds one by one (sweeping SB 0.5 BB and BB 1.0 BB into deadBlinds)
  for (let i = hIdx + 1; i < POS_ORDER.length; i++) {
    recordFold(i);
  }
  // 6. Action wraps back around to vIdx (Villain): Villain 4-Bets to validVillainBet or 22 BB
  const villain4BetSize = validVillainBet ?? 22;
  recordBetOrRaise(safeVIdx, villain4BetSize, `4-BET ${villain4BetSize} BB`);
  // 7. Action returns to hIdx (Hero): Playback finishes, Hero's seat highlights with YOUR TURN while keeping Hero's 7.5 BB 3-bet chip
  recordHeroTurnReady('YOUR TURN');
  return frames;
}

export function applyHeroDecisionToFrame(
  frame: TableFrame,
  situation: string,
  heroPos: string,
  heroFinalAction?: { label: string; betSize?: number } | null,
  activeChart?: ChartData | null
): TableFrame {
  if (!heroFinalAction) return frame;
  const hIdx = POS_ORDER.indexOf(heroPos as any);
  if (hIdx < 0 || hIdx >= frame.seats.length) return frame;

  const isRFI = situation.toLowerCase().includes('rfi') || situation.toLowerCase().includes('first in');
  const isVsOpen = situation.toLowerCase().includes('open') && !isRFI;
  const isVs3Bet = situation.toLowerCase().includes('3-bet') || situation.toLowerCase().includes('3bet');

  const stackDepth = activeChart?.stackDepth || 100;
  const customVillainBet = parseFloat(
    String(activeChart?.villainBetSize ?? activeChart?.facingBetSize ?? activeChart?.villainSize ?? '')
  );
  const validVillainBet = !isNaN(customVillainBet) && customVillainBet > 0 ? customVillainBet : null;

  const nextSeats = frame.seats.map(s => ({ ...s, isActingNow: false }));
  const heroSeat = nextSeats[hIdx];
  let nextDeadBlinds = frame.deadBlinds;

  const actUpper = heroFinalAction.label.toUpperCase();
  const maxVillainBet = validVillainBet ?? Math.max(...nextSeats.map(s => s.bet));

  if (actUpper.includes('FOLD')) {
    nextDeadBlinds = Number((nextDeadBlinds + heroSeat.bet).toFixed(1));
    heroSeat.bet = 0;
    heroSeat.status = 'FOLD';
    heroSeat.dimmed = true;
  } else if (actUpper.includes('CALL')) {
    heroSeat.bet = maxVillainBet;
    heroSeat.stack = Number((stackDepth - maxVillainBet).toFixed(1));
    heroSeat.status = `CALL ${maxVillainBet} BB`;
  } else {
    const matchedAction = activeChart?.actions.find(
      a => a.name.trim().toUpperCase() === actUpper || a.id.toUpperCase() === actUpper
    );
    const configuredActionSize =
      heroFinalAction.betSize && heroFinalAction.betSize > 0
        ? heroFinalAction.betSize
        : matchedAction
        ? parseFloat(String(matchedAction.size).replace(/[^0-9.]/g, ''))
        : NaN;
    const validActionSize =
      !isNaN(configuredActionSize) && configuredActionSize > 0 ? configuredActionSize : null;

    const defaultFallbackSize =
      actUpper.includes('4-BET') || actUpper.includes('4BET')
        ? 22
        : actUpper.includes('3-BET') || actUpper.includes('3BET')
        ? 7.5
        : actUpper.includes('ALL-IN') || actUpper.includes('ALL IN') || actUpper.includes('JAM')
        ? stackDepth
        : isRFI
        ? 2.5
        : isVsOpen
        ? 7.5
        : isVs3Bet
        ? 22
        : stackDepth;

    const raiseTo = validActionSize ?? defaultFallbackSize;
    heroSeat.bet = raiseTo;
    heroSeat.stack = Number((stackDepth - raiseTo).toFixed(1));
    heroSeat.status = `${actUpper} ${raiseTo} BB`;
  }

  const totalPot = Number((nextDeadBlinds + nextSeats.reduce((sum, s) => sum + s.bet, 0)).toFixed(1));
  return {
    ...frame,
    seats: nextSeats,
    deadBlinds: nextDeadBlinds,
    totalPot
  };
}

export function getValidPositions(
  tableSize: number,
  scenario: ScenarioType,
  currentHero: string,
  currentVillain: string,
  customPositions?: string[]
) {
  const baseSeats = getSeatsForTableSize(tableSize);
  const seats =
    tableSize === 6 && Array.isArray(customPositions) && customPositions.length >= 2
      ? customPositions
      : baseSeats;
  let heroPos = seats.includes(currentHero) ? currentHero : seats[0];

  if (scenario === 'Open Raise (RFI)') {
    // BB cannot Open Raise (RFI)
    if (heroPos === 'BB') {
      heroPos = seats[0];
    }
    return { heroPos, villainPos: 'none', seats };
  }

  if (scenario === 'Facing Open') {
    // Villain opened BEFORE Hero (vIdx < hIdx), so Hero cannot be the very first seat (index 0)
    const heroIdx = seats.indexOf(heroPos);
    const validHeroIdx = heroIdx <= 0 ? Math.min(seats.length - 1, 1) : heroIdx;
    heroPos = seats[validHeroIdx];
    const priorSeats = seats.slice(0, validHeroIdx);
    const villainPos = priorSeats.includes(currentVillain) ? currentVillain : priorSeats[priorSeats.length - 1] || seats[0];
    return { heroPos, villainPos, seats };
  }

  if (scenario === 'Facing 3-Bet') {
    // Hero opened first (cannot be BB), and Villain 3-bet AFTER Hero (vIdx > hIdx)
    const heroIdx = seats.indexOf(heroPos);
    const validHeroIdx = heroIdx < 0 || heroIdx >= seats.length - 1 ? 0 : heroIdx;
    heroPos = seats[validHeroIdx];
    const afterSeats = seats.slice(validHeroIdx + 1);
    const villainPos = afterSeats.includes(currentVillain) ? currentVillain : afterSeats[0] || 'BB';
    return { heroPos, villainPos, seats };
  }

  // Facing 4-Bet: Villain opened BEFORE Hero (vIdx < hIdx), Hero 3-bet, Villain 4-bet
  const heroIdx = seats.indexOf(heroPos);
  const validHeroIdx = heroIdx <= 0 ? Math.min(seats.length - 1, 1) : heroIdx;
  heroPos = seats[validHeroIdx];
  const priorSeats = seats.slice(0, validHeroIdx);
  const villainPos = priorSeats.includes(currentVillain) ? currentVillain : priorSeats[0] || seats[0];
  return { heroPos, villainPos, seats };
}

export function createDefaultChart(
  folderId: string,
  tableSize: number,
  stackDepth: number,
  scenarioType: ScenarioType,
  heroPos: string,
  villainPos: string
): ChartData {
  const spotId = buildSpotId(folderId, tableSize, stackDepth, scenarioType, heroPos, villainPos);
  return {
    spotId,
    folderId,
    tableSize,
    stackDepth,
    scenarioType,
    heroPos,
    villainPos,
    villainSize: getDefaultVillainSize(scenarioType),
    strategyMode: 'raw',
    actions: getDefaultActions(scenarioType),
    rawHands: {},
    pureSwaps: {},
    customTrainingHands: null
  };
}

export function isChartPopulated(chart?: ChartData): boolean {
  if (!chart || !chart.rawHands) return false;
  for (const h of Object.keys(chart.rawHands)) {
    const weights = chart.rawHands[h];
    if (!weights) continue;
    const total = Object.values(weights).reduce((a, b) => a + (b || 0), 0);
    if (total > 0.01) return true;
  }
  return false;
}

export function getPopulatedChartCount(charts: { [spotId: string]: ChartData }): number {
  return Object.values(charts).filter(isChartPopulated).length;
}

export function formatSpotTitle(chart: Pick<ChartData, 'scenarioType' | 'heroPos' | 'villainPos'>): string {
  if (chart.scenarioType === 'Open Raise (RFI)') {
    return `${chart.heroPos} Open (RFI)`;
  }
  if (chart.scenarioType === 'Facing Open') {
    return `${chart.heroPos} vs ${chart.villainPos} Open`;
  }
  if (chart.scenarioType === 'Facing 3-Bet') {
    return `${chart.heroPos} vs ${chart.villainPos} 3-Bet`;
  }
  return `${chart.heroPos} vs ${chart.villainPos} 4-Bet`;
}

// EV-Preserving Auto-Pure (100%) Mode computation — Deterministic Quota Accumulator
export function getDisplayedGrid(chart: ChartData): { [handKey: string]: { [actionId: string]: number } } {
  if (chart.strategyMode !== 'pure') {
    return chart.rawHands || {};
  }

  const pureGrid: { [handKey: string]: { [actionId: string]: number } } = {};
  const actionIds = chart.actions.map(a => a.id);
  let carryOverContinueCombos = 0;

  // Iterate through the 12 Strategic Buckets in order with running carryOverContinueCombos
  for (const bucket of STRATEGIC_BUCKETS) {
    const bucketHands = [...bucket.hands].sort((a, b) => getHandStrengthScore(b) - getHandStrengthScore(a));

    const mixedHands: {
      hand: string;
      combos: number;
      cell: { [actionId: string]: number };
      sumOfActiveWeights: number;
      strength: number;
    }[] = [];

    // 3. Inside each bucket, separate hands into Pure Hands vs. Mixed Hands
    for (const h of bucketHands) {
      const cell = chart.rawHands[h] || {};
      const sumOfActiveWeights = actionIds.reduce(
        (acc, id) => acc + Math.max(0, Math.min(100, cell[id] || 0)),
        0
      );

      // Pure Fold (0%)
      if (sumOfActiveWeights <= 0) {
        continue;
      }

      // Check if a single action is already 100%
      const singlePureActionId = actionIds.find(id => Math.round(cell[id] || 0) >= 100 && Math.round(sumOfActiveWeights) >= 100);
      if (singlePureActionId) {
        pureGrid[h] = { [singlePureActionId]: 100 };
        continue;
      }

      // Otherwise it is a Mixed Hand (0 < sumOfActiveWeights < 100 or split across multiple actions)
      mixedHands.push({
        hand: h,
        combos: getHandCombos(h),
        cell,
        sumOfActiveWeights: Math.min(100, sumOfActiveWeights),
        strength: getHandStrengthScore(h)
      });
    }

    if (mixedHands.length === 0) {
      continue;
    }

    // 4. For the Mixed Hands in the bucket, compute exact target combos
    const targetActionCombos: { [actionId: string]: number } = {};
    actionIds.forEach(id => {
      targetActionCombos[id] = 0;
    });

    let bucketMixedContinueCombos = 0;
    for (const item of mixedHands) {
      for (const actId of actionIds) {
        const rawW = Math.max(0, Math.min(100, item.cell[actId] || 0));
        const weightedCombos = item.combos * (rawW / 100);
        targetActionCombos[actId] += weightedCombos;
        bucketMixedContinueCombos += weightedCombos;
      }
    }

    const targetContinueCombos = bucketMixedContinueCombos + carryOverContinueCombos;

    // 5. Allocate Continue (100%) vs. Fold (0%)
    const sortedMixed = [...mixedHands].sort((a, b) => {
      if (Math.abs(b.sumOfActiveWeights - a.sumOfActiveWeights) > 1e-6) {
        return b.sumOfActiveWeights - a.sumOfActiveWeights;
      }
      return b.strength - a.strength;
    });

    const continuingMixedHands: typeof mixedHands = [];
    let assignedCombos = 0;

    for (const item of sortedMixed) {
      if (targetContinueCombos - assignedCombos >= item.combos / 2) {
        continuingMixedHands.push(item);
        assignedCombos += item.combos;
      }
      // Otherwise 100% Fold ({})
    }

    // Update carryOverContinueCombos for the next bucket
    carryOverContinueCombos = targetContinueCombos - assignedCombos;

    // 6. Assign the Specific Action Among Continuing Mixed Hands
    const remainingActionQuotas: { [actionId: string]: number } = { ...targetActionCombos };
    const unassignedHands = new Set<string>(continuingMixedHands.map(x => x.hand));

    // Build candidate (hand, actionId) pairs ordered descending by rawWeight(h, actionId), tie-breaking by strength
    const candidateAssignments: {
      item: (typeof mixedHands)[number];
      actionId: string;
      rawWeight: number;
    }[] = [];

    for (const item of continuingMixedHands) {
      for (const actId of actionIds) {
        const w = Math.max(0, Math.min(100, item.cell[actId] || 0));
        if (w > 0) {
          candidateAssignments.push({ item, actionId: actId, rawWeight: w });
        }
      }
    }

    candidateAssignments.sort((a, b) => {
      if (Math.abs(b.rawWeight - a.rawWeight) > 1e-6) {
        return b.rawWeight - a.rawWeight;
      }
      return b.item.strength - a.item.strength;
    });

    // First pass: assign in descending order of rawWeight while action quota needs combos
    for (const cand of candidateAssignments) {
      if (!unassignedHands.has(cand.item.hand)) continue;
      if (remainingActionQuotas[cand.actionId] >= cand.item.combos / 2) {
        pureGrid[cand.item.hand] = { [cand.actionId]: 100 };
        remainingActionQuotas[cand.actionId] -= cand.item.combos;
        unassignedHands.delete(cand.item.hand);
      }
    }

    // Fallback pass for any remaining continuing hand whose action quotas had fractional remainders < combos/2
    for (const item of continuingMixedHands) {
      if (!unassignedHands.has(item.hand)) continue;
      let chosenAct = actionIds[0];
      let bestScore = -Infinity;
      for (const actId of actionIds) {
        const w = Math.max(0, Math.min(100, item.cell[actId] || 0));
        if (w <= 0) continue;
        const score = remainingActionQuotas[actId] * 100 + w;
        if (score > bestScore) {
          bestScore = score;
          chosenAct = actId;
        }
      }
      if (chosenAct) {
        pureGrid[item.hand] = { [chosenAct]: 100 };
        remainingActionQuotas[chosenAct] -= item.combos;
        unassignedHands.delete(item.hand);
      }
    }
  }

  // 7. Finally, apply any manual swaps stored in chart.pureSwaps
  if (chart.pureSwaps) {
    for (const [handKey, actionId] of Object.entries(chart.pureSwaps)) {
      if (actionId === 'FOLD') {
        delete pureGrid[handKey];
      } else if (actionIds.includes(actionId)) {
        pureGrid[handKey] = { [actionId]: 100 };
      }
    }
  }

  return pureGrid;
}

// Compute Smart Default Training Hands: all hands with > 0% active weight + 1-cell border of 100% Fold hands
export function getSmartDefaultTrainingHands(chart: ChartData): string[] {
  const displayed = getDisplayedGrid(chart);
  const activeSet = new Set<string>();

  for (const h of ALL_169_HANDS) {
    const weights = displayed[h];
    if (!weights) continue;
    const sum = Object.values(weights).reduce((a, b) => a + (b || 0), 0);
    if (sum > 0) activeSet.add(h);
  }

  if (activeSet.size === 0) {
    return [];
  }

  const resultSet = new Set<string>(activeSet);
  for (const activeHand of activeSet) {
    const [r, c] = HAND_COORDS[activeHand];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr;
        const nc = c + dc;
        if (nr >= 0 && nr < 13 && nc >= 0 && nc < 13) {
          resultSet.add(HAND_MATRIX[nr][nc]);
        }
      }
    }
  }

  return ALL_169_HANDS.filter(h => resultSet.has(h));
}

export function getInRangeHands(chart: ChartData): string[] {
  const displayed = getDisplayedGrid(chart);
  return ALL_169_HANDS.filter(h => {
    const weights = displayed[h];
    if (!weights) return false;
    return Object.values(weights).reduce((a, b) => a + (b || 0), 0) > 0;
  });
}

export function getEffectiveTrainingHands(chart: ChartData): string[] {
  if (Array.isArray(chart.customTrainingHands)) {
    return chart.customTrainingHands;
  }
  return getSmartDefaultTrainingHands(chart);
}

// ============================================================================
// 4. FOOLPROOF RANGE STRING PARSER (SOLVER WEIGHTS & SHORTHAND RANGES)
// ============================================================================

export function parseRangeString(input: string): { [handKey: string]: number } {
  const result: { [handKey: string]: number } = {};
  if (!input || !input.trim()) return result;

  // Normalize '10' -> 'T'
  const normalized = input.replace(/10/g, 'T');

  // Split by comma, semicolon, or newline
  const tokens = normalized
    .split(/[,;\n\r]+/)
    .map(t => t.trim())
    .filter(Boolean);

  const expandToken = (rawHandPart: string): string[] => {
    const clean = rawHandPart.trim();
    if (!clean) return [];

    // Direct single hand match (case-insensitive rank, lowercase s/o)
    const normalizeHandToken = (s: string): string | null => {
      if (s.length === 2) {
        const r1 = s[0].toUpperCase();
        const r2 = s[1].toUpperCase();
        if (!RANKS.includes(r1 as any) || !RANKS.includes(r2 as any)) return null;
        if (r1 === r2) return `${r1}${r2}`;
        return null;
      }
      if (s.length === 3) {
        const r1 = s[0].toUpperCase();
        const r2 = s[1].toUpperCase();
        const su = s[2].toLowerCase();
        if (!RANKS.includes(r1 as any) || !RANKS.includes(r2 as any)) return null;
        if (su !== 's' && su !== 'o') return null;
        const i1 = RANKS.indexOf(r1 as any);
        const i2 = RANKS.indexOf(r2 as any);
        if (i1 === i2) return `${r1}${r2}`;
        return i1 < i2 ? `${r1}${r2}${su}` : `${r2}${r1}${su}`;
      }
      return null;
    };

    // 1. Plus notation: e.g. JJ+, ATs+, ATo+, AT+
    if (clean.endsWith('+')) {
      const base = clean.slice(0, -1);
      if (base.length === 2 && base[0].toUpperCase() === base[1].toUpperCase()) {
        const r = base[0].toUpperCase();
        const idx = RANKS.indexOf(r as any);
        if (idx === -1) return [];
        const hands: string[] = [];
        for (let i = 0; i <= idx; i++) {
          hands.push(`${RANKS[i]}${RANKS[i]}`);
        }
        return hands;
      }
      if (base.length === 3) {
        const hNorm = normalizeHandToken(base);
        if (!hNorm) return [];
        const r1 = hNorm[0];
        const r2 = hNorm[1];
        const su = hNorm[2];
        const i1 = RANKS.indexOf(r1 as any);
        const i2 = RANKS.indexOf(r2 as any);
        const hands: string[] = [];
        for (let j = i1 + 1; j <= i2; j++) {
          hands.push(`${r1}${RANKS[j]}${su}`);
        }
        return hands;
      }
      if (base.length === 2) {
        const r1 = base[0].toUpperCase();
        const r2 = base[1].toUpperCase();
        const i1 = RANKS.indexOf(r1 as any);
        const i2 = RANKS.indexOf(r2 as any);
        if (i1 === -1 || i2 === -1) return [];
        const high = Math.min(i1, i2);
        const low = Math.max(i1, i2);
        const hands: string[] = [];
        for (let j = high + 1; j <= low; j++) {
          hands.push(`${RANKS[high]}${RANKS[j]}s`);
          hands.push(`${RANKS[high]}${RANKS[j]}o`);
        }
        return hands;
      }
    }

    // 2. Dash notation: e.g. 99-66, 98s-65s, A9s-A5s
    if (clean.includes('-')) {
      const [left, right] = clean.split('-').map(s => s.trim());
      const hLeft = normalizeHandToken(left);
      const hRight = normalizeHandToken(right);
      if (hLeft && hRight) {
        // Pair span: 99-66
        if (hLeft.length === 2 && hRight.length === 2) {
          const i1 = RANKS.indexOf(hLeft[0] as any);
          const i2 = RANKS.indexOf(hRight[0] as any);
          const start = Math.min(i1, i2);
          const end = Math.max(i1, i2);
          const hands: string[] = [];
          for (let i = start; i <= end; i++) {
            hands.push(`${RANKS[i]}${RANKS[i]}`);
          }
          return hands;
        }
        // Same high card span: A9s-A5s
        if (hLeft.length === 3 && hRight.length === 3 && hLeft[0] === hRight[0] && hLeft[2] === hRight[2]) {
          const r1 = hLeft[0];
          const su = hLeft[2];
          const i1 = RANKS.indexOf(hLeft[1] as any);
          const i2 = RANKS.indexOf(hRight[1] as any);
          const start = Math.min(i1, i2);
          const end = Math.max(i1, i2);
          const hands: string[] = [];
          for (let i = start; i <= end; i++) {
            hands.push(`${r1}${RANKS[i]}${su}`);
          }
          return hands;
        }
        // Connector/gapper span: 98s-65s
        if (hLeft.length === 3 && hRight.length === 3 && hLeft[2] === hRight[2]) {
          const su = hLeft[2];
          const l1 = RANKS.indexOf(hLeft[0] as any);
          const l2 = RANKS.indexOf(hLeft[1] as any);
          const r1 = RANKS.indexOf(hRight[0] as any);
          const r2 = RANKS.indexOf(hRight[1] as any);
          const gapLeft = l2 - l1;
          const gapRight = r2 - r1;
          if (gapLeft === gapRight) {
            const start = Math.min(l1, r1);
            const end = Math.max(l1, r1);
            const hands: string[] = [];
            for (let i = start; i <= end; i++) {
              if (i + gapLeft < RANKS.length) {
                hands.push(`${RANKS[i]}${RANKS[i + gapLeft]}${su}`);
              }
            }
            return hands;
          }
        }
      }
    }

    // 3. Unpaired 2-char token like "AK" => both AKs and AKo
    if (clean.length === 2 && clean[0].toUpperCase() !== clean[1].toUpperCase()) {
      const r1 = clean[0].toUpperCase();
      const r2 = clean[1].toUpperCase();
      if (RANKS.includes(r1 as any) && RANKS.includes(r2 as any)) {
        const i1 = RANKS.indexOf(r1 as any);
        const i2 = RANKS.indexOf(r2 as any);
        const high = RANKS[Math.min(i1, i2)];
        const low = RANKS[Math.max(i1, i2)];
        return [`${high}${low}s`, `${high}${low}o`];
      }
    }

    const single = normalizeHandToken(clean);
    return single ? [single] : [];
  };

  for (const token of tokens) {
    let handPart = token;
    let weight = 100;

    if (token.includes(':')) {
      const [hStr, wStr] = token.split(':');
      handPart = hStr.trim();
      const parsed = parseFloat(wStr.replace('%', '').trim());
      if (!isNaN(parsed)) {
        // Convert 0-1 decimal to 0-100%, unless > 1
        if (parsed > 0 && parsed <= 1 && !wStr.includes('%')) {
          weight = Math.round(parsed * 100);
        } else {
          weight = Math.round(Math.max(0, Math.min(100, parsed)));
        }
      }
    }

    const matchedHands = expandToken(handPart);
    for (const h of matchedHands) {
      if (ALL_169_HANDS.includes(h) && weight > 0) {
        result[h] = weight;
      }
    }
  }

  return result;
}

// ============================================================================
// 5. INITIAL STATE & LOCALSTORAGE PERSISTENCE
// ============================================================================

function getTodayDateString(): string {
  try {
    return new Date().toISOString().slice(0, 10);
  } catch {
    return '2026-11-02';
  }
}

export function getInitialStudioState(): StudioState {
  const defaultState: StudioState = {
    folders: [{ id: 'my-own-charts', name: 'My Own Charts' }],
    activeFolderId: 'my-own-charts',
    playerOptions: [2, 6, 9, 10],
    stackOptions: [200, 100, 50],
    customStacks: ['100 BB', '50 BB', '200 BB'],
    activePositions: ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'],
    activeTableSize: 6,
    activeStackDepth: 100,
    activeScenario: 'Open Raise (RFI)',
    activeHeroPos: 'UTG',
    activeVillainPos: 'none',
    charts: {},
    leaks: {},
    history: [],
    totalHandsTrained: 0,
    dailyHands: { date: getTodayDateString(), count: 0 },
    dailyHandsCount: 0,
    dailyHandsDate: getTodayDateString(),
    isPro: false,
    scenarioStats: {},
    positionStats: {}
  };

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return defaultState;

    const folders: FolderItem[] =
      Array.isArray(parsed.folders) && parsed.folders.length > 0
        ? parsed.folders
        : [{ id: 'my-own-charts', name: 'My Own Charts' }];

    const activeFolderId = folders.some(f => f.id === parsed.activeFolderId)
      ? parsed.activeFolderId
      : folders[0].id;

    const playerOptions = Array.isArray(parsed.playerOptions) && parsed.playerOptions.length > 0
      ? [...new Set<number>(parsed.playerOptions)].sort((a, b) => a - b)
      : [2, 6, 9, 10];

    const stackOptions = Array.isArray(parsed.stackOptions) && parsed.stackOptions.length > 0
      ? [...new Set<number>(parsed.stackOptions)].sort((a, b) => b - a)
      : [200, 100, 50];

    const activePositions =
      Array.isArray(parsed.activePositions) && parsed.activePositions.length > 0
        ? parsed.activePositions
        : ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];

    const customStacks =
      Array.isArray(parsed.customStacks) && parsed.customStacks.length > 0
        ? parsed.customStacks
        : stackOptions.map(s => `${s} BB`);

    const today = getTodayDateString();
    const parsedDailyObj =
      parsed.dailyHands && typeof parsed.dailyHands === 'object'
        ? parsed.dailyHands
        : null;
    const dailyHandsCount =
      parsedDailyObj && parsedDailyObj.date === today
        ? Number(parsedDailyObj.count) || 0
        : parsed.dailyHandsDate === today
        ? Number(parsed.dailyHandsCount) || 0
        : 0;

    return {
      ...defaultState,
      ...parsed,
      isPro: false,
      folders,
      activeFolderId,
      playerOptions,
      stackOptions,
      customStacks,
      activePositions,
      dailyHands: { date: today, count: dailyHandsCount },
      dailyHandsDate: today,
      dailyHandsCount,
      charts: Object.fromEntries(
        Object.entries(parsed.charts || {}).map(([k, v]: [string, any]) => {
          if (!v || typeof v !== 'object') return [k, v];
          let vSize = v.villainSize;
          if (v.scenarioType === 'Facing 3-Bet' && (vSize === '8.5bb' || vSize === '10bb' || !vSize) && v.villainBetSize === undefined) {
            vSize = '7.5bb';
          } else if (v.scenarioType === 'Facing 4-Bet' && (vSize === '20bb' || !vSize) && v.villainBetSize === undefined) {
            vSize = '22bb';
          }
          const cleanedActions = Array.isArray(v.actions)
            ? v.actions.map((act: any) => {
                const rawLabel = String(act?.label ?? act?.name ?? '').trim();
                const isCall =
                  act?.id === 'call' ||
                  rawLabel.toLowerCase().startsWith('call') ||
                  rawLabel.toLowerCase() === 'limp / call';
                if (isCall) {
                  return { ...act, name: 'Call', size: '' };
                }
                if (act?.id === 'threeBet' && (act?.size === '8.5bb' || act?.size === '10bb')) {
                  return { ...act, size: '7.5bb' };
                }
                if (act?.id === 'fourBet' && act?.size === '20bb') {
                  return { ...act, size: '22bb' };
                }
                return act;
              })
            : v.actions;
          return [k, { ...v, villainSize: vSize, actions: cleanedActions }];
        })
      ),
      leaks: parsed.leaks || {},
      history: Array.isArray(parsed.history) ? parsed.history : []
    };
  } catch {
    return defaultState;
  }
}

// ============================================================================
// 6. CARD SUIT & DEALING HELPERS FOR TABLE TRAINER
// ============================================================================

const SUITS = [
  { char: 's', symbol: '♠', color: '#111827' },
  { char: 'h', symbol: '♥', color: '#DC2626' },
  { char: 'd', symbol: '♦', color: '#DC2626' },
  { char: 'c', symbol: '♣', color: '#111827' }
];

function dealSpecificCardsForHandKey(handKey: string): [string, string] {
  if (handKey.length === 2) {
    const r = handKey[0];
    const s1 = Math.floor(Math.random() * 4);
    let s2 = Math.floor(Math.random() * 3);
    if (s2 >= s1) s2++;
    return [`${r}${SUITS[s1].char}`, `${r}${SUITS[s2].char}`];
  }
  const r1 = handKey[0];
  const r2 = handKey[1];
  const isSuited = handKey.endsWith('s');
  if (isSuited) {
    const s = Math.floor(Math.random() * 4);
    return [`${r1}${SUITS[s].char}`, `${r2}${SUITS[s].char}`];
  } else {
    const s1 = Math.floor(Math.random() * 4);
    let s2 = Math.floor(Math.random() * 3);
    if (s2 >= s1) s2++;
    return [`${r1}${SUITS[s1].char}`, `${r2}${SUITS[s2].char}`];
  }
}

function parseNumericBB(sizeStr: string): number {
  const m = String(sizeStr || '').match(/[\d.]+/);
  return m ? parseFloat(m[0]) : 2.5;
}

// ============================================================================
// 7. MAIN APPLICATION COMPONENT
// ============================================================================

export default function App() {
  const [state, setState] = useState<StudioState>(getInitialStudioState);
  const [activeView, setActiveView] = useState<'editor' | 'trainer' | 'leaks'>('editor');

  // Persist to localStorage safely
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore storage quota errors in sandboxed environments
    }
  }, [state]);

  // Ensure heroPos and villainPos are always valid for activeTableSize, activeScenario & activePositions
  const validPos = useMemo(
    () =>
      getValidPositions(
        state.activeTableSize,
        state.activeScenario,
        state.activeHeroPos,
        state.activeVillainPos,
        state.activePositions
      ),
    [state.activeTableSize, state.activeScenario, state.activeHeroPos, state.activeVillainPos, state.activePositions]
  );

  const currentSpotId = useMemo(
    () =>
      buildSpotId(
        state.activeFolderId,
        state.activeTableSize,
        state.activeStackDepth,
        state.activeScenario,
        validPos.heroPos,
        validPos.villainPos
      ),
    [state.activeFolderId, state.activeTableSize, state.activeStackDepth, state.activeScenario, validPos.heroPos, validPos.villainPos]
  );

  const currentChart: ChartData = useMemo(() => {
    return (
      state.charts[currentSpotId] ||
      createDefaultChart(
        state.activeFolderId,
        state.activeTableSize,
        state.activeStackDepth,
        state.activeScenario,
        validPos.heroPos,
        validPos.villainPos
      )
    );
  }, [state.charts, currentSpotId, state.activeFolderId, state.activeTableSize, state.activeStackDepth, state.activeScenario, validPos.heroPos, validPos.villainPos]);

  const displayedGrid = useMemo(
    () =>
      getDisplayedGrid(
        state.isPro ? currentChart : { ...currentChart, strategyMode: 'raw' }
      ),
    [currentChart, state.isPro]
  );

  // Active Brush & Painting State
  const [selectedActionId, setSelectedActionId] = useState<string>(currentChart.actions[0]?.id || 'raise');
  const [brushWeight, setBrushWeight] = useState<number>(100);
  const [isDraggingPaint, setIsDraggingPaint] = useState<boolean>(false);
  const [dragTargetWeight, setDragTargetWeight] = useState<number | null>(null);
  const [pressedHandKey, setPressedHandKey] = useState<string | null>(null);
  const [hoveredHandKey, setHoveredHandKey] = useState<string | null>(null);
  const [hoveredBucketId, setHoveredBucketId] = useState<string | null>(null);
  const [pureDragSourceHand, setPureDragSourceHand] = useState<string | null>(null);
  const [draggedActionId, setDraggedActionId] = useState<string | null>(null);
  const [dragOverActionId, setDragOverActionId] = useState<string | null>(null);

  // Training Hands Drawer Click-and-Drag Painting Refs
  const isDraggingTrainingGrid = useRef<boolean>(false);
  const dragTrainingMode = useRef<'select' | 'deselect'>('select');

  // All Charts Browser & Position Customizer State
  const [showAllChartsBrowser, setShowAllChartsBrowser] = useState<boolean>(false);
  const [addingPosition, setAddingPosition] = useState<boolean>(false);
  const [newPositionName, setNewPositionName] = useState<string>('');

  // Sync selectedActionId when scenario/chart changes
  useEffect(() => {
    if (!currentChart.actions.some(a => a.id === selectedActionId)) {
      setSelectedActionId(currentChart.actions[0]?.id || '');
    }
  }, [currentChart.actions, selectedActionId]);

  // Global mouseup to end drag painting (both main 13x13 grid and Training Hands mini-matrix)
  useEffect(() => {
    const handleMouseUp = () => {
      setIsDraggingPaint(false);
      setDragTargetWeight(null);
      setPressedHandKey(null);
      setPureDragSourceHand(null);
      isDraggingTrainingGrid.current = false;
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Modals & Drawers State
  const [showTrainingHandsDrawer, setShowTrainingHandsDrawer] = useState<boolean>(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState<boolean>(false);
  const [showProModal, setShowProModal] = useState<boolean>(false);
  const [proModalReason, setProModalReason] = useState<string>('');
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalNotice, setAuthModalNotice] = useState<string | null>(null);

  // Supabase Auth, User Tier & Cloud Sync State (default userTier strictly to 'free')
  const [userTier, setUserTier] = useState<'free' | 'pro'>('free');
  const [authUser, setAuthUser] = useState<SupabaseUser | null>(null);
  const [syncStatus, setSyncStatus] = useState<'local' | 'syncing' | 'synced' | 'error'>('local');
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [syncErrorMessage, setSyncErrorMessage] = useState<string | null>(null);
  const isInitialCloudLoadComplete = useRef<boolean>(false);
  const isApplyingRemoteRef = useRef<boolean>(false);
  const syncTimeoutRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<number | null>(null);

  // Custom Confirmation Modal State (never use window.confirm/alert/prompt)
  const [confirmModal, setConfirmModal] = useState<{
    title: string;
    message: string;
    confirmLabel: string;
    danger?: boolean;
    onConfirm: () => void;
  } | null>(null);

  // Toast message
  const [toast, setToast] = useState<string | null>(null);
  const triggerToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast(prev => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  // Pull state from Supabase Cloud (fetches from user_data before enabling any cloud upserts)
  const pullFromCloud = useCallback(
    async (user: SupabaseUser, silent = false) => {
      isInitialCloudLoadComplete.current = false;
      try {
        let remoteState: Partial<StudioState> | null = null;
        let remoteTier: string | null = null;

        const { data: rows, error: tableErr } = await supabase
          .from('user_data')
          .select('tier, app_state', 'user_id', user.id);

        if (!tableErr && Array.isArray(rows) && rows.length > 0) {
          const row = rows[0];
          if (row?.app_state && typeof row.app_state === 'object') {
            remoteState = row.app_state;
          } else if (row?.state_data && typeof row.state_data === 'object') {
            remoteState = row.state_data;
          }
          if (typeof row?.tier === 'string') {
            remoteTier = row.tier;
          }
        }

        const resolvedTier: 'free' | 'pro' = remoteTier === 'pro' ? 'pro' : 'free';
        const resolvedIsPro = resolvedTier === 'pro';
        setUserTier(resolvedTier);

        if (!remoteState && user.user_metadata?.rangeflow_studio_v4) {
          remoteState = user.user_metadata.rangeflow_studio_v4;
        }

        if (remoteState && typeof remoteState === 'object') {
          isApplyingRemoteRef.current = true;
          setState(prev => {
            const folders =
              Array.isArray(remoteState!.folders) && remoteState!.folders.length > 0
                ? remoteState!.folders
                : prev.folders;
            const activeFolderId = folders.some(f => f.id === remoteState!.activeFolderId)
              ? remoteState!.activeFolderId!
              : folders[0].id;
            const playerOptions =
              Array.isArray(remoteState!.playerOptions) && remoteState!.playerOptions.length > 0
                ? [...new Set<number>(remoteState!.playerOptions)].sort((a, b) => a - b)
                : prev.playerOptions;
            const stackOptions =
              Array.isArray(remoteState!.stackOptions) && remoteState!.stackOptions.length > 0
                ? [...new Set<number>(remoteState!.stackOptions)].sort((a, b) => b - a)
                : prev.stackOptions;
            const today = getTodayDateString();
            const remoteDailyObj =
              remoteState!.dailyHands && typeof remoteState!.dailyHands === 'object'
                ? remoteState!.dailyHands
                : null;
            const syncedDailyCount =
              remoteDailyObj && remoteDailyObj.date === today
                ? Number(remoteDailyObj.count) || 0
                : remoteState!.dailyHandsDate === today
                ? Number(remoteState!.dailyHandsCount) || 0
                : prev.dailyHands?.date === today
                ? prev.dailyHands.count
                : 0;
            return {
              ...prev,
              ...remoteState,
              isPro: resolvedIsPro,
              dailyHands: { date: today, count: syncedDailyCount },
              dailyHandsDate: today,
              dailyHandsCount: syncedDailyCount,
              folders,
              activeFolderId,
              playerOptions,
              stackOptions,
              charts: remoteState!.charts || prev.charts,
              leaks: remoteState!.leaks || prev.leaks,
              history: Array.isArray(remoteState!.history) ? remoteState!.history : prev.history
            };
          });
          window.setTimeout(() => {
            isApplyingRemoteRef.current = false;
          }, 100);
          setLastSyncedAt(new Date().toLocaleTimeString());
          setSyncStatus('synced');
          if (!silent) triggerToast('Loaded cloud data from Supabase!');
        } else {
          setState(prev => ({ ...prev, isPro: resolvedIsPro }));
          setSyncStatus('synced');
        }
      } catch (err: any) {
        console.warn('Initial Supabase cloud load warning:', err);
      } finally {
        isInitialCloudLoadComplete.current = true;
      }
    },
    [triggerToast]
  );

  // Re-fetch only .select('tier') from public.user_data on window focus or Refresh PRO Status button click
  const refreshTierStatus = useCallback(
    async (silent = true) => {
      if (!authUser) {
        if (!silent) {
          setShowProModal(false);
          setAuthModalNotice('Please log in or create a free account first to upgrade to PRO.');
          setShowAuthModal(true);
        }
        return;
      }
      try {
        const { data: rows, error } = await supabase
          .from('user_data')
          .select('tier', 'user_id', authUser.id);
        if (!error && Array.isArray(rows) && rows.length > 0) {
          const nextTier: 'free' | 'pro' = rows[0]?.tier === 'pro' ? 'pro' : 'free';
          setUserTier(nextTier);
          setState(prev => (prev.isPro === (nextTier === 'pro') ? prev : { ...prev, isPro: nextTier === 'pro' }));
          if (!silent) {
            if (nextTier === 'pro') {
              setShowProModal(false);
              triggerToast('PRO Status Unlocked! Welcome to RangeFlow PRO.');
            } else {
              triggerToast('Still on FREE tier. Complete checkout first or wait a moment for webhook sync.');
            }
          }
        } else if (!silent) {
          triggerToast('Still on FREE tier. Complete checkout first or wait a moment for webhook sync.');
        }
      } catch (err) {
        console.warn('Tier status refresh warning:', err);
      }
    },
    [authUser, triggerToast]
  );

  // Window 'focus' listener so if a user upgrades in another tab, their account switches to PRO automatically
  useEffect(() => {
    const handleWindowFocus = () => {
      if (authUser) {
        refreshTierStatus(true);
      }
    };
    window.addEventListener('focus', handleWindowFocus);
    return () => window.removeEventListener('focus', handleWindowFocus);
  }, [authUser, refreshTierStatus]);

  // Push current state to Supabase user_data with explicit { onConflict: 'user_id' } (DO NOT send tier from browser)
  const pushToCloud = useCallback(
    async (stateToSave: StudioState, sessionUser: SupabaseUser, isRetry = false) => {
      if (!isInitialCloudLoadComplete.current) return;

      try {
        const { error } = await supabase
          .from('user_data')
          .upsert(
            {
              user_id: sessionUser.id,
              app_state: stateToSave,
              updated_at: new Date().toISOString()
            },
            { onConflict: 'user_id' }
          );

        if (error) {
          console.warn('Supabase background upsert warning:', error);
          if (!isRetry) {
            if (retryTimeoutRef.current !== null) {
              window.clearTimeout(retryTimeoutRef.current);
            }
            retryTimeoutRef.current = window.setTimeout(() => {
              pushToCloud(stateToSave, sessionUser, true);
            }, 4000);
          }
          return;
        }

        setLastSyncedAt(new Date().toLocaleTimeString());
        setSyncStatus('synced');
      } catch (err: any) {
        console.warn('Supabase background upsert network blip:', err);
        if (!isRetry) {
          if (retryTimeoutRef.current !== null) {
            window.clearTimeout(retryTimeoutRef.current);
          }
          retryTimeoutRef.current = window.setTimeout(() => {
            pushToCloud(stateToSave, sessionUser, true);
          }, 4000);
        }
      }
    },
    []
  );

  // Initialize Supabase session on mount and subscribe to auth changes
  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (data?.session?.user) {
        setAuthUser(data.session.user);
        pullFromCloud(data.session.user, true);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      const nextUser = session?.user || null;
      setAuthUser(nextUser);
      if (event === 'SIGNED_IN' && nextUser) {
        pullFromCloud(nextUser, false);
      } else if (event === 'SIGNED_OUT') {
        isInitialCloudLoadComplete.current = false;
        setUserTier('free');
        setState(prev => ({ ...prev, isPro: false }));
        setSyncStatus('local');
        setLastSyncedAt(null);
      }
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
      if (retryTimeoutRef.current !== null) {
        window.clearTimeout(retryTimeoutRef.current);
      }
    };
  }, [pullFromCloud]);

  // Debounced auto-sync (2500ms) to Supabase Cloud whenever state changes after initial cloud load completes
  useEffect(() => {
    if (!authUser || !isInitialCloudLoadComplete.current || isApplyingRemoteRef.current) return;
    if (syncTimeoutRef.current !== null) {
      window.clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = window.setTimeout(() => {
      pushToCloud(state, authUser, false);
    }, 2500);
    return () => {
      if (syncTimeoutRef.current !== null) {
        window.clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [state, authUser, pushToCloud]);

  // Inline Inputs State (Folders, Players, Stacks, Villain Size, Action Editor)
  const [addingFolder, setAddingFolder] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>('');
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameFolderValue, setRenameFolderValue] = useState<string>('');

  const [addingPlayer, setAddingPlayer] = useState<boolean>(false);
  const [newPlayerVal, setNewPlayerVal] = useState<string>('8');

  const [addingStack, setAddingStack] = useState<boolean>(false);
  const [newStackVal, setNewStackVal] = useState<string>('50');

  const [editingVillainSize, setEditingVillainSize] = useState<boolean>(false);
  const [villainSizeInput, setVillainSizeInput] = useState<string>(
    String(currentChart.villainBetSize ?? currentChart.facingBetSize ?? currentChart.villainSize ?? '')
  );
  const stateChartsRef = useRef(state.charts);
  stateChartsRef.current = state.charts;

  useEffect(() => {
    const storedVal =
      currentChart.villainBetSize !== undefined
        ? `${currentChart.villainBetSize}bb`
        : currentChart.facingBetSize !== undefined
        ? `${currentChart.facingBetSize}bb`
        : currentChart.villainSize;
    setVillainSizeInput(storedVal);
  }, [currentSpotId, currentChart.villainBetSize, currentChart.facingBetSize, currentChart.villainSize]);

  const saveVillainBetSize = useCallback(
    (rawVal: string) => {
      const parsed = parseFloat(String(rawVal).replace(/[^0-9.]/g, ''));
      if (isNaN(parsed) || parsed <= 0) {
        const storedVal =
          currentChart.villainBetSize !== undefined
            ? `${currentChart.villainBetSize}bb`
            : currentChart.facingBetSize !== undefined
            ? `${currentChart.facingBetSize}bb`
            : currentChart.villainSize;
        setVillainSizeInput(storedVal);
        return;
      }
      const formatted = `${parsed}bb`;
      setVillainSizeInput(formatted);
      setState(prev => {
        const base =
          prev.charts[currentSpotId] ||
          createDefaultChart(
            prev.activeFolderId,
            prev.activeTableSize,
            prev.activeStackDepth,
            prev.activeScenario,
            validPos.heroPos,
            validPos.villainPos
          );
        const nextCharts = {
          ...prev.charts,
          [currentSpotId]: {
            ...base,
            villainSize: formatted,
            villainBetSize: parsed,
            facingBetSize: parsed
          }
        };
        stateChartsRef.current = nextCharts;
        return {
          ...prev,
          charts: nextCharts
        };
      });
    },
    [currentChart, currentSpotId, validPos.heroPos, validPos.villainPos]
  );

  const [showAddActionModal, setShowAddActionModal] = useState<boolean>(false);
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [actionFormName, setActionFormName] = useState<string>('Raise');
  const [actionFormSize, setActionFormSize] = useState<string>('2.5bb');
  const [actionFormColor, setActionFormColor] = useState<string>(STUDIO_SWATCHES[0]);

  // Free vs Pro check helper (Max 5 Saved Charts on Free)
  const populatedChartCount = useMemo(() => getPopulatedChartCount(state.charts), [state.charts]);

  const canModifyChart = useCallback(
    (targetSpotId: string): boolean => {
      if (userTier === 'pro' || state.isPro) return true;
      const existing = state.charts[targetSpotId];
      if (isChartPopulated(existing)) {
        // Editing or clearing an already-saved chart is allowed on Free tier
        return true;
      }
      if (populatedChartCount >= 5) {
        setProModalReason('Free Tier includes up to 5 Saved Charts. Upgrade to PRO for unlimited charts.');
        setShowProModal(true);
        return false;
      }
      return true;
    },
    [userTier, state.isPro, state.charts, populatedChartCount]
  );

  // Update a chart and automatically delete any corresponding leak keys on modified hands
  const updateChart = useCallback(
    (
      spotId: string,
      updater: (chart: ChartData) => ChartData,
      editedHandKeys: string[] = []
    ) => {
      const existingChart = state.charts[spotId];
      if (userTier !== 'pro' && !state.isPro && !isChartPopulated(existingChart) && populatedChartCount >= 5) {
        setProModalReason('Free Tier includes up to 5 Saved Charts. Upgrade to PRO for unlimited charts.');
        setShowProModal(true);
        return;
      }
      setState(prev => {
        const base =
          prev.charts[spotId] ||
          createDefaultChart(
            prev.activeFolderId,
            prev.activeTableSize,
            prev.activeStackDepth,
            prev.activeScenario,
            validPos.heroPos,
            validPos.villainPos
          );
        const updatedChart = updater(base);
        const nextCharts = { ...prev.charts };
        if (isChartPopulated(updatedChart) || updatedChart.villainBetSize !== undefined) {
          nextCharts[spotId] = updatedChart;
        } else {
          delete nextCharts[spotId];
        }
        stateChartsRef.current = nextCharts;
        const nextLeaks = { ...prev.leaks };
        for (const hk of editedHandKeys) {
          delete nextLeaks[`${spotId}__${hk}`];
        }
        return {
          ...prev,
          charts: nextCharts,
          leaks: nextLeaks
        };
      });
    },
    [state.charts, userTier, state.isPro, populatedChartCount, validPos.heroPos, validPos.villainPos]
  );

  // ============================================================================
  // 8. PAINTING LOGIC (STRICT 3-STEP CYCLE + DRAG PAINTING + AUTO-PURE SWAPS)
  // ============================================================================

  const computeNextCellWeights = useCallback(
    (
      currentCell: { [actionId: string]: number } | undefined,
      actionId: string,
      targetWeight: number
    ): { [actionId: string]: number } => {
      const next: { [actionId: string]: number } = { ...(currentCell || {}) };
      if (targetWeight <= 0) {
        delete next[actionId];
        return next;
      }
      next[actionId] = Math.min(100, Math.max(0, targetWeight));

      // Ensure sum of all active weights does not exceed 100%
      const otherIds = Object.keys(next).filter(id => id !== actionId);
      const otherSum = otherIds.reduce((s, id) => s + (next[id] || 0), 0);
      if (next[actionId] + otherSum > 100) {
        const allowedOther = Math.max(0, 100 - next[actionId]);
        if (allowedOther === 0) {
          for (const id of otherIds) delete next[id];
        } else if (otherSum > 0) {
          let remaining = allowedOther;
          for (let i = 0; i < otherIds.length; i++) {
            const id = otherIds[i];
            if (i === otherIds.length - 1) {
              next[id] = remaining;
            } else {
              const scaled = Math.round(((next[id] || 0) / otherSum) * allowedOther);
              next[id] = scaled;
              remaining -= scaled;
            }
            if (next[id] <= 0) delete next[id];
          }
        }
      }
      return next;
    },
    []
  );

  const handleCellMouseDown = (handKey: string) => {
    if (!selectedActionId) return;

    // If in Auto-Pure mode, allow drag-swapping between two cells or toggling
    if (currentChart.strategyMode === 'pure') {
      setPureDragSourceHand(handKey);
      setPressedHandKey(handKey);
      return;
    }

    if (!canModifyChart(currentSpotId)) return;

    const currentCell = currentChart.rawHands[handKey] || {};
    const currentW = currentCell[selectedActionId] || 0;

    // Strict 3-Step Painting Logic:
    // 1. 0% -> brushWeight
    // 2. 0 < weight < 100 -> 100%
    // 3. 100% -> 0%
    let nextW = brushWeight;
    if (currentW === 0) {
      nextW = brushWeight;
    } else if (currentW > 0 && currentW < 100) {
      nextW = 100;
    } else {
      nextW = 0;
    }

    setIsDraggingPaint(true);
    setDragTargetWeight(nextW);
    setPressedHandKey(handKey);

    updateChart(
      currentSpotId,
      chart => {
        const nextRaw = { ...chart.rawHands };
        const updatedCell = computeNextCellWeights(nextRaw[handKey], selectedActionId, nextW);
        if (Object.keys(updatedCell).length === 0) {
          delete nextRaw[handKey];
        } else {
          nextRaw[handKey] = updatedCell;
        }
        return { ...chart, rawHands: nextRaw };
      },
      [handKey]
    );
  };

  const handleCellMouseEnter = (handKey: string) => {
    setHoveredHandKey(handKey);
    if (!isDraggingPaint || dragTargetWeight === null || !selectedActionId) return;
    if (currentChart.strategyMode === 'pure') return;

    setPressedHandKey(handKey);
    updateChart(
      currentSpotId,
      chart => {
        const nextRaw = { ...chart.rawHands };
        const updatedCell = computeNextCellWeights(nextRaw[handKey], selectedActionId, dragTargetWeight);
        if (Object.keys(updatedCell).length === 0) {
          delete nextRaw[handKey];
        } else {
          nextRaw[handKey] = updatedCell;
        }
        return { ...chart, rawHands: nextRaw };
      },
      [handKey]
    );
  };

  const handleCellMouseUp = (targetHandKey: string) => {
    if (currentChart.strategyMode === 'pure' && pureDragSourceHand) {
      if (pureDragSourceHand !== targetHandKey) {
        // Swap pure assignments between pureDragSourceHand and targetHandKey
        const srcWeights = displayedGrid[pureDragSourceHand] || {};
        const dstWeights = displayedGrid[targetHandKey] || {};
        const srcAction = Object.keys(srcWeights).find(k => srcWeights[k] > 0) || 'FOLD';
        const dstAction = Object.keys(dstWeights).find(k => dstWeights[k] > 0) || 'FOLD';

        if (srcAction !== dstAction) {
          updateChart(
            currentSpotId,
            chart => ({
              ...chart,
              pureSwaps: {
                ...(chart.pureSwaps || {}),
                [pureDragSourceHand]: dstAction,
                [targetHandKey]: srcAction
              }
            }),
            [pureDragSourceHand, targetHandKey]
          );
          triggerToast(`Swapped Auto-Pure assignments: ${pureDragSourceHand} ↔ ${targetHandKey}`);
        }
      } else {
        // Single click in Auto-Pure mode toggles 100% selectedAction vs Fold
        const curWeights = displayedGrid[targetHandKey] || {};
        const curAction = Object.keys(curWeights).find(k => curWeights[k] > 0);
        const nextAct = curAction === selectedActionId ? 'FOLD' : selectedActionId;
        updateChart(
          currentSpotId,
          chart => ({
            ...chart,
            pureSwaps: {
              ...(chart.pureSwaps || {}),
              [targetHandKey]: nextAct
            }
          }),
          [targetHandKey]
        );
      }
      setPureDragSourceHand(null);
      setPressedHandKey(null);
    }
  };

  // Cycle Strategic Bucket (`0% -> brushWeight -> 100% -> 0%`)
  const handleBucketClick = (bucket: StrategicBucket) => {
    if (!selectedActionId) return;
    if (!canModifyChart(currentSpotId)) return;

    const weights = bucket.hands.map(h => currentChart.rawHands[h]?.[selectedActionId] || 0);
    const allZero = weights.every(w => w === 0);
    const allFull = weights.every(w => w === 100);
    const allBrush = weights.every(w => w === brushWeight);

    let nextW = brushWeight;
    if (allZero) {
      nextW = brushWeight;
    } else if (allFull) {
      nextW = 0;
    } else if (allBrush && brushWeight < 100) {
      nextW = 100;
    } else {
      const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
      nextW = avg < 99 ? 100 : 0;
    }

    updateChart(
      currentSpotId,
      chart => {
        const nextRaw = { ...chart.rawHands };
        for (const h of bucket.hands) {
          const updatedCell = computeNextCellWeights(nextRaw[h], selectedActionId, nextW);
          if (Object.keys(updatedCell).length === 0) {
            delete nextRaw[h];
          } else {
            nextRaw[h] = updatedCell;
          }
        }
        return { ...chart, rawHands: nextRaw };
      },
      bucket.hands
    );
  };

  // ============================================================================
  // 9. CHART METRICS & COMBO BREAKDOWN
  // ============================================================================

  const chartStats = useMemo(() => {
    const actionCombos: { [actionId: string]: number } = {};
    currentChart.actions.forEach(a => { actionCombos[a.id] = 0; });
    let playableCombos = 0;

    for (const h of ALL_169_HANDS) {
      const combos = getHandCombos(h);
      const cell = displayedGrid[h] || {};
      let cellActivePct = 0;
      for (const act of currentChart.actions) {
        const w = Math.max(0, Math.min(100, cell[act.id] || 0));
        actionCombos[act.id] += combos * (w / 100);
        cellActivePct += w;
      }
      cellActivePct = Math.min(100, cellActivePct);
      playableCombos += combos * (cellActivePct / 100);
    }

    const foldCombos = Math.max(0, 1326 - playableCombos);
    return {
      actionCombos,
      playableCombos,
      playablePct: (playableCombos / 1326) * 100,
      foldCombos,
      foldPct: (foldCombos / 1326) * 100
    };
  }, [currentChart.actions, displayedGrid]);

  // ============================================================================
  // 10. TABLE TRAINER STATE & 3-PHASE ANIMATION CHOREOGRAPHY
  // ============================================================================

  const [selectedTrainerSpots, setSelectedTrainerSpots] = useState<string[]>([]);
  const [showSpotSelectorDrawer, setShowSpotSelectorDrawer] = useState<boolean>(false);
  const [trainerSpeed, setTrainerSpeed] = useState<'1x' | '2x' | 'Instant'>('1x');
  const [isPeekHeld, setIsPeekHeld] = useState<boolean>(false);

  // Filter controls inside the Spot Selector Drawer
  const [drawerFolderId, setDrawerFolderId] = useState<string>(state.activeFolderId);
  const [drawerTableSize, setDrawerTableSize] = useState<number>(state.activeTableSize);
  const [drawerStackDepth, setDrawerStackDepth] = useState<number>(state.activeStackDepth);

  // Leak training mode state
  const [isLeakTrainingMode, setIsLeakTrainingMode] = useState<boolean>(false);
  const [leakFilterCriteria, setLeakFilterCriteria] = useState<{
    folderId: string | 'ALL';
    scenarioType: ScenarioType | 'ALL';
    heroPos: string | 'ALL';
    label: string;
  } | null>(null);

  // Active Hand State Machine & Step-by-Step Preflop Action Playback
  const [trainerPhase, setTrainerPhase] = useState<'IDLE' | 'PRE_ACTION' | 'HERO_TURN' | 'SHOWING_RESULT'>('IDLE');
  const [activeTrainedChart, setActiveTrainedChart] = useState<ChartData | null>(null);
  const [dealtHandKey, setDealtHandKey] = useState<string>('AKs');
  const [dealtCards, setDealtCards] = useState<[string, string]>(['As', 'Ks']);
  const [rngRoll, setRngRoll] = useState<number>(50);
  const [frames, setFrames] = useState<TableFrame[]>([]);
  const [frameIdx, setFrameIdx] = useState<number>(0);
  const [heroFinalAction, setHeroFinalAction] = useState<{ label: string; betSize?: number } | null>(null);
  const [lastResult, setLastResult] = useState<{
    isCorrect: boolean;
    chosenActionName: string;
    expectedActionName: string;
    breakdownText: string;
    leakLevelText?: string;
  } | null>(null);
  const [activeLeakKeyForHand, setActiveLeakKeyForHand] = useState<string | null>(null);
  const lastDealtLeakKeyRef = useRef<string | null>(null);

  const preActionTimersRef = useRef<number[]>([]);
  const resultTimerRef = useRef<number | null>(null);

  const clearTrainerTimers = useCallback(() => {
    preActionTimersRef.current.forEach(id => window.clearTimeout(id));
    preActionTimersRef.current = [];
    if (resultTimerRef.current !== null) {
      window.clearTimeout(resultTimerRef.current);
      resultTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTrainerTimers();
  }, [clearTrainerTimers]);

  // All populated charts across state
  const allPopulatedCharts = useMemo(() => {
    return Object.values(state.charts).filter(isChartPopulated);
  }, [state.charts]);

  // Start or deal next hand in Trainer
  const dealNextTrainerHand = useCallback(
    (
      overrideSpots?: string[],
      overrideLeakMode?: boolean,
      overrideLeakCriteria?: {
        folderId: string | 'ALL';
        scenarioType: ScenarioType | 'ALL';
        heroPos: string | 'ALL';
        label: string;
      } | null
    ) => {
      clearTrainerTimers();

      // Check Free tier 50 hands/day limit via dailyHands: { date: 'YYYY-MM-DD', count: number }
      const todayDate = getTodayDateString();
      const todayCount =
        state.dailyHands?.date === todayDate
          ? state.dailyHands.count
          : state.dailyHandsDate === todayDate
          ? state.dailyHandsCount
          : 0;
      if (userTier !== 'pro' && !state.isPro && todayCount >= 50) {
        setProModalReason('You have reached the Free Tier limit of 50 Training Hands per day. Upgrade to PRO for unlimited daily training.');
        setShowProModal(true);
        setTrainerPhase('IDLE');
        return;
      }

      const leakMode = overrideLeakMode !== undefined ? overrideLeakMode : isLeakTrainingMode;
      const criteria = overrideLeakCriteria !== undefined ? overrideLeakCriteria : leakFilterCriteria;

      let chosenChart: ChartData | null = null;
      let chosenHandKey: string | null = null;
      let chosenLeakKey: string | null = null;

      if (leakMode && criteria) {
        // Filter active leaks matching the selected Folder / Situation / Position filter
        const activeLeaks = Object.values(state.leaks).filter(lk => {
          const c = state.charts[lk.spotId];
          if (!isChartPopulated(c)) return false;
          if (criteria.folderId !== 'ALL' && lk.folderId !== criteria.folderId) return false;
          if (criteria.scenarioType !== 'ALL' && lk.scenarioType !== criteria.scenarioType) return false;
          if (criteria.heroPos !== 'ALL' && lk.heroPos !== criteria.heroPos) return false;
          return true;
        });

        if (activeLeaks.length === 0) {
          triggerToast('All leaks in this filter have been mastered and removed!');
          setIsLeakTrainingMode(false);
          setTrainerPhase('IDLE');
          return;
        }

        // Check cooldowns: Level 0 = 4, Level 1 = 10, Level 2 = 25 (round(4 * 2.5^L))
        const getCooldown = (lvl: 0 | 1 | 2) => (lvl === 0 ? 4 : lvl === 1 ? 10 : 25);
        const readyLeaks = activeLeaks.filter(lk => {
          const handsSince = state.totalHandsTrained - lk.lastSeenHandNum;
          return handsSince >= getCooldown(lk.level);
        });

        let picked: LeakEntry;

        if (readyLeaks.length > 0) {
          // Case A (Eligible off-cooldown leaks exist): Pick one using 9 : 3 : 1 weighted random formula (Weight = 3^(2 - level))
          const pool =
            readyLeaks.length > 1
              ? readyLeaks.filter(lk => lk.leakKey !== lastDealtLeakKeyRef.current)
              : readyLeaks;
          const drawPool = pool.length > 0 ? pool : readyLeaks;
          const weights = drawPool.map(lk => Math.pow(3, 2 - lk.level));
          const totalWeight = weights.reduce((a, b) => a + b, 0);
          let r = Math.random() * totalWeight;
          picked = drawPool[0];
          for (let i = 0; i < drawPool.length; i++) {
            r -= weights[i];
            if (r <= 0) {
              picked = drawPool[i];
              break;
            }
          }
        } else if (activeLeaks.length > 1) {
          // Case B (Not enough hands to satisfy cooldowns, but activeLeaks.length > 1):
          // Ignore cooldown timer, exclude the exact hand just dealt, prioritize lowest level and oldest lastSeenHandNum
          const nonRepeat = activeLeaks.filter(lk => lk.leakKey !== lastDealtLeakKeyRef.current);
          const candidateLeaks = nonRepeat.length > 0 ? nonRepeat : activeLeaks;
          const sorted = [...candidateLeaks].sort((a, b) => {
            if (a.level !== b.level) return a.level - b.level;
            return a.lastSeenHandNum - b.lastSeenHandNum;
          });
          picked = sorted[0];
        } else {
          // Case C (Only 1 hand exists in activeLeaks): Immediately repeat that single leak hand until cleared
          picked = activeLeaks[0];
        }

        chosenChart = stateChartsRef.current[picked.spotId] || state.charts[picked.spotId];
        chosenHandKey = picked.handKey;
        chosenLeakKey = picked.leakKey;
        lastDealtLeakKeyRef.current = picked.leakKey;
      } else {
        // Normal Spot Training Mode
        const chartsMap = stateChartsRef.current;
        const activeSpots = (overrideSpots ?? selectedTrainerSpots).filter(id => isChartPopulated(chartsMap[id]));
        if (activeSpots.length === 0) {
          setTrainerPhase('IDLE');
          return;
        }
        const pickedSpotId = activeSpots[Math.floor(Math.random() * activeSpots.length)];
        chosenChart = chartsMap[pickedSpotId];
        const pool = getEffectiveTrainingHands(chosenChart);
        const nonRepeatPool = pool.length > 1 ? pool.filter(h => h !== dealtHandKey) : pool;
        const finalPool = nonRepeatPool.length > 0 ? nonRepeatPool : ALL_169_HANDS;
        chosenHandKey = finalPool[Math.floor(Math.random() * finalPool.length)];
        chosenLeakKey = null;
      }

      if (!chosenChart || !chosenHandKey) {
        setTrainerPhase('IDLE');
        return;
      }

      const newCards = dealSpecificCardsForHandKey(chosenHandKey);
      // Roll RNG 0-99
      const newRng = Math.floor(Math.random() * 100);
      const handFrames = buildPreflopFrames(
        chosenChart.scenarioType,
        chosenChart.heroPos,
        chosenChart.villainPos,
        chosenChart
      );

      setActiveTrainedChart(chosenChart);
      setDealtHandKey(chosenHandKey);
      setDealtCards(newCards);
      setRngRoll(newRng);
      setActiveLeakKeyForHand(chosenLeakKey);
      setFrames(handFrames);
      setFrameIdx(trainerSpeed === 'Instant' ? Math.max(0, handFrames.length - 1) : 0);
      setHeroFinalAction(null);
      setLastResult(null);
      setTrainerPhase('HERO_TURN');
    },
    [
      clearTrainerTimers,
      userTier,
      state.isPro,
      state.dailyHands,
      state.dailyHandsDate,
      state.dailyHandsCount,
      state.leaks,
      state.charts,
      state.totalHandsTrained,
      isLeakTrainingMode,
      leakFilterCriteria,
      selectedTrainerSpots,
      dealtHandKey,
      trainerSpeed,
      triggerToast
    ]
  );

  // Keep activeTrainedChart and its preflop frames synced when chart settings (e.g. villainBetSize) change
  useEffect(() => {
    if (!activeTrainedChart) return;
    const latest = state.charts[activeTrainedChart.spotId];
    if (latest && latest !== activeTrainedChart) {
      setActiveTrainedChart(latest);
      const updatedFrames = buildPreflopFrames(
        latest.scenarioType,
        latest.heroPos,
        latest.villainPos,
        latest
      );
      setFrames(updatedFrames);
    }
  }, [state.charts, activeTrainedChart]);

  // Step-by-Step Preflop Action Playback Timer (180ms for folds, 260ms for raises)
  useEffect(() => {
    if (trainerPhase !== 'HERO_TURN' || frames.length === 0) return;
    if (frameIdx >= frames.length - 1) return;

    if (trainerSpeed === 'Instant') {
      setFrameIdx(frames.length - 1);
      return;
    }

    const nextFrame = frames[frameIdx + 1];
    const baseDelay = nextFrame?.stepDelayMs || 220;
    const delay = trainerSpeed === '2x' ? Math.round(baseDelay * 0.55) : baseDelay;

    const timerId = window.setTimeout(() => {
      setFrameIdx(prev => Math.min(frames.length - 1, prev + 1));
    }, delay);

    return () => window.clearTimeout(timerId);
  }, [trainerPhase, frames, frameIdx, trainerSpeed]);

  // Grade Hero's action during HERO_TURN (if clicked early during playback, immediately jump to final frame)
  const handleTrainerAction = useCallback(
    (chosenActionId: string) => {
      if (trainerPhase !== 'HERO_TURN' || !activeTrainedChart) return;
      clearTrainerTimers();
      if (frames.length > 0 && frameIdx < frames.length - 1) {
        setFrameIdx(frames.length - 1);
      }

      const grid = getDisplayedGrid(activeTrainedChart);
      const cell = grid[dealtHandKey] || {};

      // Cumulative 1-100 RNG intervals: Action 1 -> Action 2 -> ... -> Fold
      let cumulative = 0;
      let expectedActionId = 'FOLD';
      let expectedActionName = 'Fold';
      const breakdownParts: string[] = [];

      for (const act of activeTrainedChart.actions) {
        const w = Math.max(0, Math.min(100, cell[act.id] || 0));
        if (w > 0) {
          breakdownParts.push(`${act.name} ${w}%`);
          if (expectedActionId === 'FOLD' && rngRoll < cumulative + w) {
            expectedActionId = act.id;
            const isActCall =
              act.id === 'call' || String((act as any).label ?? act.name ?? '').trim().toLowerCase().startsWith('call');
            expectedActionName = isActCall ? 'Call' : `${act.name} ${act.size}`.trim();
          }
          cumulative += w;
        }
      }

      const foldWeight = Math.max(0, 100 - cumulative);
      if (foldWeight > 0) {
        breakdownParts.push(`Fold ${foldWeight}%`);
      }

      const chosenActObj = activeTrainedChart.actions.find(a => a.id === chosenActionId);
      const isChosenCall =
        chosenActObj &&
        (chosenActObj.id === 'call' ||
          String((chosenActObj as any).label ?? chosenActObj.name ?? '').trim().toLowerCase().startsWith('call'));
      const chosenActionName = chosenActObj
        ? isChosenCall
          ? 'Call'
          : `${chosenActObj.name} ${chosenActObj.size}`.trim()
        : 'Fold';

      // A choice is correct if it matches the RNG roll interval OR if the chosen action has 100% weight
      const chosenWeight = chosenActionId === 'FOLD' ? foldWeight : (cell[chosenActionId] || 0);
      const isCorrect = chosenActionId === expectedActionId || chosenWeight >= 100;

      // Immediately update Hero's seat badge & bet chip via getSeatStatesForSpot(situation, heroPos, villainPos, heroFinalAction)
      setHeroFinalAction({
        label: chosenActObj ? chosenActObj.name : 'FOLD',
        betSize: chosenActObj ? parseNumericBB(chosenActObj.size) : 0
      });

      const leakKey = `${activeTrainedChart.spotId}__${dealtHandKey}`;
      let leakLevelText = '';

      setState(prev => {
        const nextTotal = prev.totalHandsTrained + 1;
        const todayStr = getTodayDateString();
        const prevDailyCount =
          prev.dailyHands?.date === todayStr
            ? prev.dailyHands.count
            : prev.dailyHandsDate === todayStr
            ? prev.dailyHandsCount
            : 0;
        const nextDaily = prevDailyCount + 1;
        const nextLeaks = { ...prev.leaks };
        const existingLeak = nextLeaks[leakKey];

        if (!isCorrect) {
          // Every mistake in Spot Training or Leak Training creates/resets leak to level: 0
          nextLeaks[leakKey] = {
            leakKey,
            spotId: activeTrainedChart.spotId,
            folderId: activeTrainedChart.folderId,
            scenarioType: activeTrainedChart.scenarioType,
            heroPos: activeTrainedChart.heroPos,
            villainPos: activeTrainedChart.villainPos,
            handKey: dealtHandKey,
            level: 0,
            lastSeenHandNum: nextTotal,
            mistakes: (existingLeak?.mistakes || 0) + 1
          };
          leakLevelText = 'Leak Level → 0 (Reset)';
        } else if (isLeakTrainingMode && activeLeakKeyForHand === leakKey && existingLeak) {
          // Answering a leak hand correctly in Leak Training increments level 0 -> 1 -> 2 -> Removed
          if (existingLeak.level === 2) {
            delete nextLeaks[leakKey];
            leakLevelText = 'Mastered! (3/3 Correct — Removed from Leaks)';
          } else {
            const nextLevel = (existingLeak.level + 1) as 0 | 1 | 2;
            nextLeaks[leakKey] = {
              ...existingLeak,
              level: nextLevel,
              lastSeenHandNum: nextTotal
            };
            leakLevelText = `SRS Level Up → Level ${nextLevel}`;
          }
        }

        // Update scenario and position accuracy stats
        const curScen = prev.scenarioStats[activeTrainedChart.scenarioType] || { total: 0, correct: 0 };
        const curPos = prev.positionStats[activeTrainedChart.heroPos] || { total: 0, correct: 0 };

        const historyItem: HandHistoryItem = {
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          timestamp: Date.now(),
          spotId: activeTrainedChart.spotId,
          spotTitle: formatSpotTitle(activeTrainedChart),
          scenarioType: activeTrainedChart.scenarioType,
          heroPos: activeTrainedChart.heroPos,
          villainPos: activeTrainedChart.villainPos,
          handKey: dealtHandKey,
          cards: dealtCards,
          rngRoll,
          chosenActionId,
          chosenActionName,
          expectedActionName,
          isCorrect,
          isLeakSession: isLeakTrainingMode
        };

        return {
          ...prev,
          totalHandsTrained: nextTotal,
          dailyHands: { date: todayStr, count: nextDaily },
          dailyHandsDate: todayStr,
          dailyHandsCount: nextDaily,
          leaks: nextLeaks,
          history: [historyItem, ...prev.history.slice(0, 99)],
          scenarioStats: {
            ...prev.scenarioStats,
            [activeTrainedChart.scenarioType]: {
              total: curScen.total + 1,
              correct: curScen.correct + (isCorrect ? 1 : 0)
            }
          },
          positionStats: {
            ...prev.positionStats,
            [activeTrainedChart.heroPos]: {
              total: curPos.total + 1,
              correct: curPos.correct + (isCorrect ? 1 : 0)
            }
          }
        };
      });

      setLastResult({
        isCorrect,
        chosenActionName,
        expectedActionName,
        breakdownText: breakdownParts.join(' • ') || 'Fold 100%',
        leakLevelText
      });

      setTrainerPhase('SHOWING_RESULT');

      // If Hero's action is CORRECT: show green "✓ Correct" badge for a quick 650ms and automatically deal next hand.
      // If Hero's action is WRONG / MISTAKE: remove all auto-advance timers and wait for Spacebar!
      if (isCorrect) {
        resultTimerRef.current = window.setTimeout(() => {
          dealNextTrainerHand();
        }, 650);
      }
    },
    [
      trainerPhase,
      activeTrainedChart,
      clearTrainerTimers,
      frames.length,
      frameIdx,
      dealtHandKey,
      rngRoll,
      isLeakTrainingMode,
      activeLeakKeyForHand,
      dealtCards,
      dealNextTrainerHand
    ]
  );

  // Global Escape key listener to close any open slide-over drawer or modal
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showSpotSelectorDrawer) setShowSpotSelectorDrawer(false);
        if (showTrainingHandsDrawer) setShowTrainingHandsDrawer(false);
        if (showHistoryDrawer) setShowHistoryDrawer(false);
        if (showAddActionModal) setShowAddActionModal(false);
        if (showProModal) setShowProModal(false);
        if (showAuthModal) setShowAuthModal(false);
        if (confirmModal) setConfirmModal(null);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [
    showSpotSelectorDrawer,
    showTrainingHandsDrawer,
    showHistoryDrawer,
    showAddActionModal,
    showProModal,
    showAuthModal,
    confirmModal
  ]);

  // Trainer keyboard shortcuts: Space = Fold (during HERO_TURN) or Next Hand (during SHOWING_RESULT), 1/2/3/4 = Actions, Tab = Peek Chart
  useEffect(() => {
    if (activeView !== 'trainer') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        showSpotSelectorDrawer ||
        showTrainingHandsDrawer ||
        showHistoryDrawer ||
        showAddActionModal ||
        showProModal ||
        showAuthModal ||
        confirmModal
      ) {
        return;
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        setIsPeekHeld(true);
        return;
      }
      if (trainerPhase === 'SHOWING_RESULT') {
        if (e.code === 'Space' || e.key === ' ') {
          e.preventDefault();
          e.stopPropagation();
          dealNextTrainerHand();
        }
        return;
      }
      if (trainerPhase === 'HERO_TURN' && activeTrainedChart) {
        if (e.code === 'Space' || e.key === ' ') {
          if (e.repeat) return;
          e.preventDefault();
          handleTrainerAction('FOLD');
        } else if (['1', '2', '3', '4', '5'].includes(e.key)) {
          const idx = parseInt(e.key, 10) - 1;
          const nonFoldActions = activeTrainedChart.actions.filter(
            a => a.id !== 'fold' && !((a as any).label || a.name || '').toLowerCase().includes('fold')
          );
          const act = nonFoldActions[idx];
          if (act) {
            e.preventDefault();
            handleTrainerAction(act.id);
          }
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        setIsPeekHeld(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    activeView,
    trainerPhase,
    activeTrainedChart,
    handleTrainerAction,
    dealNextTrainerHand,
    showSpotSelectorDrawer,
    showTrainingHandsDrawer,
    showHistoryDrawer,
    showAddActionModal,
    showProModal,
    confirmModal
  ]);

  // Launch "Train This Spot" from Editor
  const handleTrainCurrentSpot = () => {
    if (!isChartPopulated(currentChart)) {
      triggerToast('Paint or import at least 1 hand in this chart before training.');
      return;
    }
    setIsLeakTrainingMode(false);
    setLeakFilterCriteria(null);
    setSelectedTrainerSpots([currentSpotId]);
    setActiveView('trainer');
    setTimeout(() => {
      dealNextTrainerHand([currentSpotId], false, null);
    }, 30);
  };

  // Launch Leak Training with specific filter
  const startLeakTraining = (
    folderId: string | 'ALL',
    scenarioType: ScenarioType | 'ALL',
    heroPos: string | 'ALL',
    label: string
  ) => {
    if (userTier !== 'pro' && !state.isPro) {
      setProModalReason('Spaced Repetition Leak Trainer is a PRO feature. Upgrade to PRO to drill and clear your leaks.');
      setShowProModal(true);
      return;
    }

    const matching = Object.values(state.leaks).filter(lk => {
      const c = state.charts[lk.spotId];
      if (!isChartPopulated(c)) return false;
      if (folderId !== 'ALL' && lk.folderId !== folderId) return false;
      if (scenarioType !== 'ALL' && lk.scenarioType !== scenarioType) return false;
      if (heroPos !== 'ALL' && lk.heroPos !== heroPos) return false;
      return true;
    });

    if (matching.length === 0) {
      triggerToast('No active leaks match this filter yet.');
      return;
    }

    const criteria = { folderId, scenarioType, heroPos, label };
    setIsLeakTrainingMode(true);
    setLeakFilterCriteria(criteria);
    setActiveView('trainer');
    setTimeout(() => {
      dealNextTrainerHand(undefined, true, criteria);
    }, 30);
  };

  // ============================================================================
  // 11. FOLDER, PLAYER, STACK & ACTION MANAGEMENT HANDLERS
  // ============================================================================

  const handleAddFolder = () => {
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    const newId = `folder-${Date.now()}`;
    setState(prev => ({
      ...prev,
      folders: [...prev.folders, { id: newId, name: trimmed }],
      activeFolderId: newId
    }));
    setNewFolderName('');
    setAddingFolder(false);
    triggerToast(`Created folder "${trimmed}"`);
  };

  const handleDeleteFolder = (folder: FolderItem) => {
    setConfirmModal({
      title: `Delete Folder "${folder.name}"?`,
      message: `All charts and associated leak pointers inside "${folder.name}" will be permanently removed.`,
      confirmLabel: 'Delete Folder',
      danger: true,
      onConfirm: () => {
        setState(prev => {
          const remainingFolders = prev.folders.filter(f => f.id !== folder.id);
          // CRITICAL: If the last folder is deleted, automatically create a fresh empty "My Own Charts" folder
          const finalFolders =
            remainingFolders.length > 0
              ? remainingFolders
              : [{ id: 'my-own-charts', name: 'My Own Charts' }];

          const nextActiveId = finalFolders.some(f => f.id === prev.activeFolderId)
            ? prev.activeFolderId
            : finalFolders[0].id;

          const nextCharts: { [spotId: string]: ChartData } = {};
          for (const [k, v] of Object.entries(prev.charts)) {
            if (v.folderId !== folder.id) nextCharts[k] = v;
          }

          const nextLeaks: { [leakKey: string]: LeakEntry } = {};
          for (const [k, v] of Object.entries(prev.leaks)) {
            if (v.folderId !== folder.id) nextLeaks[k] = v;
          }

          return {
            ...prev,
            folders: finalFolders,
            activeFolderId: nextActiveId,
            charts: nextCharts,
            leaks: nextLeaks
          };
        });
        setConfirmModal(null);
        triggerToast(`Deleted folder "${folder.name}"`);
      }
    });
  };

  const handleAddPlayerOption = () => {
    const val = parseInt(newPlayerVal, 10);
    if (isNaN(val) || val < 2 || val > 10) {
      triggerToast('Players must be between 2 and 10.');
      return;
    }
    setState(prev => {
      // Automatically sort playerOptions in logical ascending order
      const next = [...new Set([...prev.playerOptions, val])].sort((a, b) => a - b);
      return {
        ...prev,
        playerOptions: next,
        activeTableSize: val
      };
    });
    setAddingPlayer(false);
  };

  const handleAddStackOption = () => {
    const val = parseInt(newStackVal, 10);
    if (isNaN(val) || val < 5 || val > 500) {
      triggerToast('Stack depth must be between 5 BB and 500 BB.');
      return;
    }
    setState(prev => {
      // Automatically sort stackOptions in logical descending order
      const next = [...new Set([...prev.stackOptions, val])].sort((a, b) => b - a);
      return {
        ...prev,
        stackOptions: next,
        customStacks: next.map(s => `${s} BB`),
        activeStackDepth: val
      };
    });
    setAddingStack(false);
  };

  const handleDeleteStackOption = (stackToRemove: number) => {
    setState(prev => {
      if (prev.stackOptions.length <= 1) {
        triggerToast('At least 1 stack size must remain.');
        return prev;
      }
      const next = prev.stackOptions.filter(s => s !== stackToRemove);
      const nextActive = prev.activeStackDepth === stackToRemove ? next[0] : prev.activeStackDepth;
      return {
        ...prev,
        stackOptions: next,
        customStacks: next.map(s => `${s} BB`),
        activeStackDepth: nextActive
      };
    });
  };

  const handleDeletePlayerOption = (playerToRemove: number) => {
    setState(prev => {
      if (prev.playerOptions.length <= 1) {
        triggerToast('At least 1 player count must remain.');
        return prev;
      }
      const next = prev.playerOptions.filter(p => p !== playerToRemove);
      const nextActive = prev.activeTableSize === playerToRemove ? next[0] : prev.activeTableSize;
      return {
        ...prev,
        playerOptions: next,
        activeTableSize: nextActive
      };
    });
  };

  const handleDeletePosition = (posToRemove: string) => {
    setState(prev => {
      const currentPositions =
        Array.isArray(prev.activePositions) && prev.activePositions.length > 0
          ? prev.activePositions
          : getSeatsForTableSize(prev.activeTableSize);
      if (currentPositions.length <= 2) {
        triggerToast('At least 2 positions must remain on the table.');
        return prev;
      }
      const next = currentPositions.filter(p => p !== posToRemove);
      const nextHero = prev.activeHeroPos === posToRemove ? next[0] : prev.activeHeroPos;
      return {
        ...prev,
        activePositions: next,
        activeHeroPos: nextHero
      };
    });
  };

  const handleAddPosition = (posLabel: string) => {
    const clean = posLabel.trim().toUpperCase();
    if (!clean) return;
    setState(prev => {
      const currentPositions =
        Array.isArray(prev.activePositions) && prev.activePositions.length > 0
          ? prev.activePositions
          : getSeatsForTableSize(prev.activeTableSize);
      if (currentPositions.includes(clean)) {
        return { ...prev, activeHeroPos: clean };
      }
      const canonicalOrder = ['UTG', 'UTG+1', 'UTG+2', 'MP', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
      const next = [...currentPositions, clean].sort((a, b) => {
        const ia = canonicalOrder.indexOf(a);
        const ib = canonicalOrder.indexOf(b);
        if (ia !== -1 && ib !== -1) return ia - ib;
        if (ia !== -1) return -1;
        if (ib !== -1) return 1;
        return 0;
      });
      return {
        ...prev,
        activePositions: next,
        activeHeroPos: clean
      };
    });
    setNewPositionName('');
    setAddingPosition(false);
  };

  const handleJumpToSavedChart = (chart: ChartData) => {
    setState(prev => {
      // Ensure the chart's folder exists (if orphaned, re-attach or create its folder so it is never hidden)
      const folderExists = prev.folders.some(f => f.id === chart.folderId);
      const nextFolders = folderExists
        ? prev.folders
        : [...prev.folders, { id: chart.folderId || 'recovered-folder', name: 'Recovered Charts' }];
      const nextFolderId = folderExists ? chart.folderId : (chart.folderId || 'recovered-folder');

      // Ensure tableSize, stackDepth, and positions include this chart's coordinates
      const nextPlayers = prev.playerOptions.includes(chart.tableSize)
        ? prev.playerOptions
        : [...new Set([...prev.playerOptions, chart.tableSize])].sort((a, b) => a - b);

      const nextStacks = prev.stackOptions.includes(chart.stackDepth)
        ? prev.stackOptions
        : [...new Set([...prev.stackOptions, chart.stackDepth])].sort((a, b) => b - a);

      const curPositions =
        Array.isArray(prev.activePositions) && prev.activePositions.length > 0
          ? prev.activePositions
          : ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
      const neededPositions = [chart.heroPos, chart.villainPos].filter(
        p => p && p !== 'none' && !curPositions.includes(p)
      );
      const canonicalOrder = ['UTG', 'UTG+1', 'UTG+2', 'MP', 'LJ', 'HJ', 'CO', 'BTN', 'SB', 'BB'];
      const nextPositions =
        neededPositions.length > 0
          ? [...curPositions, ...neededPositions].sort((a, b) => {
              const ia = canonicalOrder.indexOf(a);
              const ib = canonicalOrder.indexOf(b);
              if (ia !== -1 && ib !== -1) return ia - ib;
              return 0;
            })
          : curPositions;

      return {
        ...prev,
        folders: nextFolders,
        activeFolderId: nextFolderId,
        playerOptions: nextPlayers,
        stackOptions: nextStacks,
        customStacks: nextStacks.map(s => `${s} BB`),
        activePositions: nextPositions,
        activeTableSize: chart.tableSize,
        activeStackDepth: chart.stackDepth,
        activeScenario: chart.scenarioType,
        activeHeroPos: chart.heroPos,
        activeVillainPos: chart.villainPos
      };
    });
  };

  const handleDeleteSavedChart = (spotIdToDelete: string, titleLabel: string) => {
    setConfirmModal({
      title: `Delete Chart "${titleLabel}"?`,
      message: `This will permanently delete "${titleLabel}" and any associated leak entries.`,
      confirmLabel: 'Delete Chart',
      danger: true,
      onConfirm: () => {
        setState(prev => {
          const nextCharts = { ...prev.charts };
          delete nextCharts[spotIdToDelete];
          const nextLeaks: { [k: string]: LeakEntry } = {};
          for (const [lk, lv] of Object.entries(prev.leaks)) {
            if (lv.spotId !== spotIdToDelete) nextLeaks[lk] = lv;
          }
          return {
            ...prev,
            charts: nextCharts,
            leaks: nextLeaks
          };
        });
        setConfirmModal(null);
        triggerToast(`Deleted chart "${titleLabel}"`);
      }
    });
  };

  const handleSaveActionModal = () => {
    const trimmedName = actionFormName.trim() || 'Action';
    const trimmedSize = actionFormSize.trim() || '2.5bb';
    updateChart(currentSpotId, chart => {
      if (editingActionId) {
        return {
          ...chart,
          actions: chart.actions.map(a =>
            a.id === editingActionId
              ? { ...a, name: trimmedName, size: trimmedSize, color: actionFormColor }
              : a
          )
        };
      } else {
        const newAct: ChartAction = {
          id: `act_${Date.now()}`,
          name: trimmedName,
          size: trimmedSize,
          color: actionFormColor
        };
        setSelectedActionId(newAct.id);
        return {
          ...chart,
          actions: [...chart.actions, newAct]
        };
      }
    });
    setShowAddActionModal(false);
    setEditingActionId(null);
  };

  const handleDeleteAction = (actionId: string) => {
    if (currentChart.actions.length <= 1) {
      triggerToast('A chart must have at least 1 active action.');
      return;
    }
    updateChart(
      currentSpotId,
      chart => {
        const nextActions = chart.actions.filter(a => a.id !== actionId);
        const nextRaw: { [handKey: string]: { [actId: string]: number } } = {};
        for (const [hk, weights] of Object.entries(chart.rawHands)) {
          const copy = { ...weights };
          delete copy[actionId];
          if (Object.keys(copy).length > 0) nextRaw[hk] = copy;
        }
        return {
          ...chart,
          actions: nextActions,
          rawHands: nextRaw
        };
      },
      ALL_169_HANDS
    );
  };

  const handleActionReorder = (sourceId: string, targetId: string) => {
    const activeChart = currentChart;
    if (!activeChart || sourceId === targetId) return;
    const nonFoldActions = activeChart.actions.filter(
      a => a.id !== 'fold' && !((a as any).label || a.name || '').toLowerCase().includes('fold')
    );
    const foldActions = activeChart.actions.filter(
      a => a.id === 'fold' || ((a as any).label || a.name || '').toLowerCase().includes('fold')
    );
    const fromIdx = nonFoldActions.findIndex(a => a.id === sourceId);
    const toIdx = nonFoldActions.findIndex(a => a.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const reorderedNonFold = [...nonFoldActions];
    const movedItem = reorderedNonFold.splice(fromIdx, 1)[0];
    reorderedNonFold.splice(toIdx, 0, movedItem);
    const nextActions = [...reorderedNonFold, ...foldActions];
    setState(prev => {
      const base =
        prev.charts[currentSpotId] ||
        createDefaultChart(
          prev.activeFolderId,
          prev.activeTableSize,
          prev.activeStackDepth,
          prev.activeScenario,
          validPos.heroPos,
          validPos.villainPos
        );
      return {
        ...prev,
        charts: {
          ...prev.charts,
          [currentSpotId]: {
            ...base,
            actions: nextActions
          }
        }
      };
    });
  };

  // ============================================================================
  // 12. ACTIVE LEAKS COUNT & DASHBOARD DATA
  // ============================================================================

  const activeLeaksList = useMemo(() => {
    return Object.values(state.leaks).filter(lk => isChartPopulated(state.charts[lk.spotId]));
  }, [state.leaks, state.charts]);

  const [leaksFolderFilter, setLeaksFolderFilter] = useState<string | 'ALL'>('ALL');
  const [leaksScenarioFilter, setLeaksScenarioFilter] = useState<ScenarioType | 'ALL'>('ALL');
  const [leaksPositionFilter, setLeaksPositionFilter] = useState<string | 'ALL'>('ALL');

  const filteredLeaks = useMemo(() => {
    return activeLeaksList.filter(lk => {
      if (leaksFolderFilter !== 'ALL' && lk.folderId !== leaksFolderFilter) return false;
      if (leaksScenarioFilter !== 'ALL' && lk.scenarioType !== leaksScenarioFilter) return false;
      if (leaksPositionFilter !== 'ALL' && lk.heroPos !== leaksPositionFilter) return false;
      return true;
    });
  }, [activeLeaksList, leaksFolderFilter, leaksScenarioFilter, leaksPositionFilter]);

  // ============================================================================
  // 13. RENDER HELPERS FOR 3-ROW POSITION MATRIX
  // ============================================================================

  const seats = validPos.seats;
  const heroIdx = seats.indexOf(validPos.heroPos);

  const hasSeatPaintedChart = (seat: string): boolean => {
    const testPos = getValidPositions(
      state.activeTableSize,
      state.activeScenario,
      seat,
      validPos.villainPos,
      state.activePositions
    );
    const sid = buildSpotId(
      state.activeFolderId,
      state.activeTableSize,
      state.activeStackDepth,
      state.activeScenario,
      testPos.heroPos,
      testPos.villainPos
    );
    return isChartPopulated(state.charts[sid]);
  };

  return (
    <div className="min-h-screen bg-[#0B0D12] text-[#E6EDF3] font-sans selection:bg-[#6366F1]/30 selection:text-white flex flex-col">
      {/* ====================================================================
          TOP NAVIGATION HEADER
         ==================================================================== */}
      <header className="h-14 bg-[#12161F] border-b border-[#232938] px-4 flex items-center justify-between shrink-0 z-30">
        {/* Left: Coral emblem + clean RangeFlow branding */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#4F46E5] hover:bg-[#6366F1] text-white flex items-center justify-center shadow-sm shadow-[#4F46E5]/25">
            <Layers className="w-4 h-4 text-white stroke-[2.5]" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tight text-lg text-white">RangeFlow</span>
          </div>
        </div>

        {/* Center Segmented Switcher */}
        <div className="flex items-center bg-[#0B0D12] p-1 rounded-lg border border-[#232938]">
          <button
            type="button"
            onClick={() => setActiveView('editor')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeView === 'editor'
                ? 'bg-[#181D29] text-white shadow-sm border border-white/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-[#818CF8]" />
            <span>Charts (Editor)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveView('trainer');
              if (trainerPhase === 'IDLE') {
                // Auto-select current editor chart if populated, or all populated charts
                const initialPool = isChartPopulated(currentChart)
                  ? [currentSpotId]
                  : allPopulatedCharts.map(c => c.spotId);
                if (initialPool.length > 0 && selectedTrainerSpots.length === 0) {
                  setSelectedTrainerSpots(initialPool);
                  setTimeout(() => dealNextTrainerHand(initialPool, false, null), 20);
                } else if (selectedTrainerSpots.length > 0) {
                  setTimeout(() => dealNextTrainerHand(selectedTrainerSpots, false, null), 20);
                }
              }
            }}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeView === 'trainer'
                ? 'bg-[#181D29] text-white shadow-sm border border-white/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Play className="w-3.5 h-3.5 text-[#68B388]" />
            <span>Table Trainer</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView('leaks')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-2 ${
              activeView === 'leaks'
                ? 'bg-[#181D29] text-white shadow-sm border border-white/10'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-[#E06C75]" />
            <span>Leaks</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#E06C75]/20 text-[#E06C75] border border-[#E06C75]/40">
              {activeLeaksList.length}
            </span>
          </button>
        </div>

        {/* Right Controls: History + Account / Pro + Clean Auth / Log Out (No Email or Sync Error Flashes) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHistoryDrawer(true)}
            className="px-3 py-1.5 rounded-lg bg-[#181D29] hover:bg-[#232938] border border-[#232938] text-xs font-medium text-slate-200 flex items-center gap-1.5 transition-colors"
          >
            <History className="w-3.5 h-3.5 text-slate-400" />
            <span>History</span>
            {state.history.length > 0 && (
              <span className="text-[10px] text-slate-400">({state.history.length})</span>
            )}
          </button>

          {userTier === 'pro' || state.isPro ? (
            <div className="px-3 py-1.5 rounded-lg bg-[#181D29] border border-[#E5C07B]/60 shadow-[0_0_12px_rgba(229,192,123,0.3)] text-xs font-extrabold text-[#E5C07B] flex items-center gap-1.5 select-none">
              <Crown className="w-3.5 h-3.5 text-[#E5C07B]" />
              <span>PRO</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md bg-[#181D29] border border-[#232938] text-[11px] font-bold uppercase text-slate-300 select-none">
                FREE
              </span>
              <button
                type="button"
                onClick={() => {
                  setProModalReason('');
                  setShowProModal(true);
                }}
                className="px-3 py-1.5 rounded-lg bg-[#E5C07B] hover:bg-[#D4B46A] text-[#0B0D12] text-xs font-extrabold flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Upgrade to PRO</span>
              </button>
            </div>
          )}

          {authUser ? (
            <button
              type="button"
              onClick={async () => {
                await supabase.auth.signOut();
                triggerToast('Logged out.');
              }}
              className="px-3 py-1.5 rounded-lg bg-[#181D29] hover:bg-[#232938] border border-[#232938] text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-400" />
              <span>Log Out</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAuthModalNotice(null);
                setShowAuthModal(true);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#181D29] hover:bg-[#232938] border border-[#232938] text-xs font-semibold text-slate-200 hover:text-white flex items-center gap-1.5 transition-colors"
            >
              <LogIn className="w-3.5 h-3.5 text-[#818CF8]" />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </header>

      {/* ====================================================================
          VIEW 1: CHARTS (EDITOR)
         ==================================================================== */}
      {activeView === 'editor' && (
        <main className="flex-1 max-w-[1600px] w-full mx-auto px-4 py-3 flex flex-col gap-3">
          {/* TOP BAR 1: PRIMARY FOLDERS & TRAINING HANDS PILL */}
          <div className="bg-[#12161F] border border-[#232938] rounded-xl px-3.5 py-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1.5">
                PRIMARY FOLDERS:
              </span>

              {state.folders.map(folder => {
                const isActive = folder.id === state.activeFolderId;
                const isRenaming = renamingFolderId === folder.id;

                if (isRenaming) {
                  return (
                    <div
                      key={folder.id}
                      className="flex items-center gap-1 bg-[#181D29] border border-[#818CF8]/60 rounded-lg px-2 py-1"
                    >
                      <input
                        type="text"
                        value={renameFolderValue}
                        onChange={e => setRenameFolderValue(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter' && renameFolderValue.trim()) {
                            setState(prev => ({
                              ...prev,
                              folders: prev.folders.map(f =>
                                f.id === folder.id ? { ...f, name: renameFolderValue.trim() } : f
                              )
                            }));
                            setRenamingFolderId(null);
                          } else if (e.key === 'Escape') {
                            setRenamingFolderId(null);
                          }
                        }}
                        className="bg-transparent text-xs text-white focus:outline-none w-28"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (renameFolderValue.trim()) {
                            setState(prev => ({
                              ...prev,
                              folders: prev.folders.map(f =>
                                f.id === folder.id ? { ...f, name: renameFolderValue.trim() } : f
                              )
                            }));
                          }
                          setRenamingFolderId(null);
                        }}
                        className="text-[#68B388] hover:text-white"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={folder.id}
                    className={`group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                      isActive
                        ? 'bg-[#6366F1]/15 border border-[#818CF8]/50 text-[#EEF2FF] font-semibold shadow-[0_0_12px_rgba(99,102,241,0.12)]'
                        : 'bg-[#181D29] text-slate-300 border-[#232938] hover:border-slate-600'
                    }`}
                    onClick={() => setState(prev => ({ ...prev, activeFolderId: folder.id }))}
                  >
                    <Folder className={`w-3.5 h-3.5 ${isActive ? 'text-[#818CF8]' : 'text-slate-400'}`} />
                    <span>{folder.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                      <button
                        type="button"
                        title="Rename Folder"
                        onClick={e => {
                          e.stopPropagation();
                          setRenamingFolderId(folder.id);
                          setRenameFolderValue(folder.name);
                        }}
                        className="p-0.5 hover:text-[#E5C07B] text-slate-400"
                      >
                        <Edit3 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        title="Delete Folder"
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteFolder(folder);
                        }}
                        className="p-0.5 hover:text-[#E06C75] text-slate-400"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {addingFolder ? (
                <div className="flex items-center gap-1 bg-[#181D29] border border-[#818CF8]/60 rounded-lg px-2 py-1">
                  <input
                    type="text"
                    placeholder="Folder name"
                    value={newFolderName}
                    onChange={e => setNewFolderName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleAddFolder();
                      if (e.key === 'Escape') setAddingFolder(false);
                    }}
                    className="bg-transparent text-xs text-white focus:outline-none w-28"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleAddFolder}
                    className="text-[#68B388] hover:text-white p-0.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddingFolder(false)}
                    className="text-slate-400 hover:text-white p-0.5"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingFolder(true)}
                  className="px-2.5 py-1.5 rounded-lg bg-[#181D29] hover:bg-[#232938] border border-dashed border-slate-600 text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4 text-[#818CF8]" />
                  <span>New Folder</span>
                </button>
              )}
            </div>

            {/* Right: All Charts ({allPopulatedCharts.length}) Browser Toggle & Training Hands X/169 button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAllChartsBrowser(prev => !prev)}
                className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  showAllChartsBrowser
                    ? 'bg-[#6366F1]/15 border border-[#818CF8]/50 text-[#EEF2FF] font-semibold shadow-[0_0_12px_rgba(99,102,241,0.12)]'
                    : 'bg-[#181D29] hover:bg-[#232938] border-[#232938] text-slate-200'
                }`}
              >
                <Layers className="w-3.5 h-3.5 text-[#818CF8]" />
                <span>All Charts ({allPopulatedCharts.length})</span>
                {showAllChartsBrowser ? (
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowTrainingHandsDrawer(true)}
                className="px-3 py-1.5 rounded-lg bg-[#181D29] hover:bg-[#232938] border border-[#232938] text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors"
              >
                <span>🎯 Training Hands {getEffectiveTrainingHands(currentChart).length}/169</span>
              </button>
            </div>
          </div>

          {/* EXPANDABLE ALL CHARTS BROWSER (Lists every saved chart per folder + any orphaned/hidden charts) */}
          {showAllChartsBrowser && (
            <div className="bg-[#12161F] border border-[#232938] rounded-xl p-3.5 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-[#232938] pb-2">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#818CF8]" />
                  <span className="text-xs font-bold uppercase tracking-wider text-white">
                    All Saved Charts Browser ({allPopulatedCharts.length} total)
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Click any chart to jump directly to its Folder, Situation, Positions & Stack Size.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAllChartsBrowser(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {allPopulatedCharts.length === 0 ? (
                <div className="text-xs text-slate-400 py-4 text-center bg-[#0B0D12] rounded-lg border border-[#232938]">
                  No painted charts saved yet. Paint hands on the 13×13 matrix below to save your first chart.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {state.folders.map(folder => {
                    const folderCharts = allPopulatedCharts.filter(c => c.folderId === folder.id);
                    return (
                      <div key={folder.id} className="bg-[#0B0D12] border border-[#232938] rounded-lg p-2.5 flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                            <Folder className="w-3.5 h-3.5 text-[#818CF8]" />
                            <span>{folder.name}</span>
                            <span className="text-[11px] text-slate-400">({folderCharts.length})</span>
                          </span>
                        </div>
                        {folderCharts.length === 0 ? (
                          <div className="text-[11px] text-slate-500 pl-5">No painted charts in this folder.</div>
                        ) : (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                            {folderCharts.map(c => {
                              const isCurrent = c.spotId === currentSpotId;
                              const label = `${formatSpotTitle(c)} • ${c.stackDepth} BB (${c.tableSize}-Max)`;
                              const handCount = Object.keys(c.rawHands || {}).filter(hk => {
                                const w = c.rawHands[hk];
                                return w && Object.values(w).reduce((a, b) => a + (b || 0), 0) > 0;
                              }).length;

                              return (
                                <div
                                  key={c.spotId}
                                  onClick={() => handleJumpToSavedChart(c)}
                                  className={`group px-2.5 py-2 rounded-lg border text-xs flex items-center justify-between gap-2 cursor-pointer transition-all ${
                                    isCurrent
                                      ? 'bg-[#6366F1]/15 border border-[#818CF8]/50 text-[#EEF2FF] shadow-[0_0_12px_rgba(99,102,241,0.12)]'
                                      : 'bg-[#181D29] border-[#232938] text-slate-200 hover:border-slate-500'
                                  }`}
                                >
                                  <div className="min-w-0 flex-1">
                                    <div className="font-bold truncate">{formatSpotTitle(c)} • {c.stackDepth} BB</div>
                                    <div className="text-[10px] text-slate-400">
                                      {c.tableSize}-Max • {handCount} hands painted
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    title="Delete Chart"
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleDeleteSavedChart(c.spotId, label);
                                    }}
                                    className="p-1 text-slate-400 hover:text-[#E06C75] opacity-70 group-hover:opacity-100 shrink-0"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Orphaned Charts (charts whose folderId does not match any current folder) */}
                  {(() => {
                    const folderIds = new Set(state.folders.map(f => f.id));
                    const orphanedCharts = allPopulatedCharts.filter(c => !folderIds.has(c.folderId));
                    if (orphanedCharts.length === 0) return null;
                    return (
                      <div className="bg-[#0B0D12] border border-[#E5C07B]/50 rounded-lg p-2.5 flex flex-col gap-2">
                        <div className="text-xs font-bold text-[#E5C07B] flex items-center gap-1.5">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Other / Unassigned Folder Charts ({orphanedCharts.length})</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {orphanedCharts.map(c => {
                            const isCurrent = c.spotId === currentSpotId;
                            const label = `${formatSpotTitle(c)} • ${c.stackDepth} BB (${c.tableSize}-Max)`;
                            const handCount = Object.keys(c.rawHands || {}).filter(hk => {
                              const w = c.rawHands[hk];
                              return w && Object.values(w).reduce((a, b) => a + (b || 0), 0) > 0;
                            }).length;

                            return (
                              <div
                                key={c.spotId}
                                onClick={() => handleJumpToSavedChart(c)}
                                className={`group px-2.5 py-2 rounded-lg border text-xs flex items-center justify-between gap-2 cursor-pointer transition-all ${
                                  isCurrent
                                    ? 'bg-[#6366F1]/15 border border-[#818CF8]/50 text-[#EEF2FF] shadow-[0_0_12px_rgba(99,102,241,0.12)]'
                                    : 'bg-[#181D29] border-[#232938] text-slate-200 hover:border-slate-500'
                                }`}
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold truncate">{formatSpotTitle(c)} • {c.stackDepth} BB</div>
                                  <div className="text-[10px] text-slate-400">
                                    {c.tableSize}-Max • {handCount} hands painted
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  title="Delete Chart"
                                  onClick={e => {
                                    e.stopPropagation();
                                    handleDeleteSavedChart(c.spotId, label);
                                  }}
                                  className="p-1 text-slate-400 hover:text-[#E06C75] opacity-70 group-hover:opacity-100 shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}
            </div>
          )}

          {/* TOP BAR 2: SPOT CONFIGURATION & 3-ROW POSITION MATRIX CARD */}
          <div className="bg-[#12161F] border border-[#232938] rounded-xl p-3.5 flex flex-col gap-3">
            {/* Row 1: Players & Stack */}
            <div className="flex flex-wrap items-center gap-3 pb-2.5 border-b border-[#232938]">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-slate-400 mr-1">Players:</span>
                {state.playerOptions.map(p => (
                  <div
                    key={p}
                    onClick={() => setState(prev => ({ ...prev, activeTableSize: p }))}
                    className={`group px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                      state.activeTableSize === p
                        ? 'bg-[#6366F1]/15 border border-[#818CF8]/50 text-[#EEF2FF] font-semibold shadow-[0_0_12px_rgba(99,102,241,0.12)]'
                        : 'bg-[#181D29] text-slate-300 hover:bg-[#232938] border border-[#232938]'
                    }`}
                  >
                    <span>{p}-Max</span>
                    {state.playerOptions.length > 1 && (
                      <button
                        type="button"
                        title={`Remove ${p}-Max`}
                        onClick={e => {
                          e.stopPropagation();
                          handleDeletePlayerOption(p);
                        }}
                        className={`opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 rounded hover:bg-black/20 ${
                          state.activeTableSize === p ? 'text-[#EEF2FF]' : 'text-slate-400 hover:text-[#E06C75]'
                        }`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
                {addingPlayer ? (
                  <div className="flex items-center gap-1 bg-[#181D29] border border-[#818CF8]/60 rounded-md px-2 py-0.5">
                    <input
                      type="number"
                      min={2}
                      max={10}
                      value={newPlayerVal}
                      onChange={e => setNewPlayerVal(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddPlayerOption();
                        if (e.key === 'Escape') setAddingPlayer(false);
                      }}
                      className="w-10 bg-transparent text-xs text-white focus:outline-none"
                      autoFocus
                    />
                    <button type="button" onClick={handleAddPlayerOption} className="text-[#68B388]">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => setAddingPlayer(false)} className="text-slate-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingPlayer(true)}
                    title="Add custom player count (2-10)"
                    className="w-6 h-6 rounded-md bg-[#181D29] hover:bg-[#232938] border border-[#232938] text-slate-300 flex items-center justify-center text-xs font-bold"
                  >
                    +
                  </button>
                )}
              </div>

              <span className="text-slate-600 font-bold select-none">|</span>

              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs font-semibold text-slate-400 mr-1">Stack:</span>
                {state.stackOptions.map(s => (
                  <div
                    key={s}
                    onClick={() => setState(prev => ({ ...prev, activeStackDepth: s }))}
                    className={`group px-2.5 py-1 rounded-md text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                      state.activeStackDepth === s
                        ? 'bg-[#6366F1]/15 border border-[#818CF8]/50 text-[#EEF2FF] font-semibold shadow-[0_0_12px_rgba(99,102,241,0.12)]'
                        : 'bg-[#181D29] text-slate-300 hover:bg-[#232938] border border-[#232938]'
                    }`}
                  >
                    <span>{s} BB</span>
                    {state.stackOptions.length > 1 && (
                      <button
                        type="button"
                        title={`Delete ${s} BB stack`}
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteStackOption(s);
                        }}
                        className={`opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 rounded hover:bg-black/20 ${
                          state.activeStackDepth === s ? 'text-[#EEF2FF]' : 'text-slate-400 hover:text-[#E06C75]'
                        }`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
                {addingStack ? (
                  <div className="flex items-center gap-1 bg-[#181D29] border border-[#818CF8]/60 rounded-md px-2 py-0.5">
                    <input
                      type="number"
                      min={5}
                      max={500}
                      value={newStackVal}
                      onChange={e => setNewStackVal(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddStackOption();
                        if (e.key === 'Escape') setAddingStack(false);
                      }}
                      className="w-14 bg-transparent text-xs text-white focus:outline-none"
                      autoFocus
                    />
                    <button type="button" onClick={handleAddStackOption} className="text-[#68B388]">
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => setAddingStack(false)} className="text-slate-400">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setAddingStack(true)}
                    title="Add custom BB stack (5-500)"
                    className="w-6 h-6 rounded-md bg-[#181D29] hover:bg-[#232938] border border-[#232938] text-slate-300 flex items-center justify-center text-xs font-bold"
                  >
                    +
                  </button>
                )}
              </div>
            </div>

            {/* Row 2: Scenario Tabs + Villain Size + Train This Spot CTA */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#232938]">
              <div className="flex flex-wrap items-center gap-2">
                {SCENARIOS.map(scen => (
                  <button
                    key={scen}
                    type="button"
                    onClick={() => setState(prev => ({ ...prev, activeScenario: scen }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      state.activeScenario === scen
                        ? 'bg-[#6366F1]/15 border border-[#818CF8]/50 text-[#EEF2FF] font-semibold shadow-[0_0_12px_rgba(99,102,241,0.12)]'
                        : 'bg-[#0B0D12] text-slate-400 border-[#232938] hover:text-slate-200'
                    }`}
                  >
                    {scen}
                  </button>
                ))}

                {state.activeScenario !== 'Open Raise (RFI)' && (
                  <div className="flex items-center gap-1.5 bg-[#181D29] border border-[#232938] rounded-lg px-2.5 py-1">
                    <span className="text-[11px] text-slate-400">Villain Size:</span>
                    <input
                      type="text"
                      value={villainSizeInput}
                      onChange={e => setVillainSizeInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          saveVillainBetSize(e.currentTarget.value);
                          e.currentTarget.blur();
                        } else if (e.key === 'Escape') {
                          setEditingVillainSize(false);
                          e.currentTarget.blur();
                        }
                      }}
                      onBlur={e => {
                        saveVillainBetSize(e.currentTarget.value);
                        setEditingVillainSize(false);
                      }}
                      className="w-16 bg-[#0B0D12] px-1.5 py-0.5 rounded text-xs font-bold text-[#E5C07B] border border-[#232938] focus:border-[#818CF8] focus:outline-none text-center"
                    />
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleTrainCurrentSpot}
                  className="px-3.5 py-1.5 rounded-lg bg-[#4F46E5] hover:bg-[#6366F1] text-white font-bold text-xs shadow-sm shadow-[#4F46E5]/25 transition-all flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Train This Spot</span>
                </button>
              </div>

              <div className="text-xs text-slate-400">
                Active Spot Key:{' '}
                <code className="text-[11px] text-slate-300 bg-[#0B0D12] px-2 py-0.5 rounded border border-[#232938]">
                  {formatSpotTitle(currentChart)}
                </code>
              </div>
            </div>

            {/* Rows 3-5: The 3-Row Interactive Position Grid */}
            <div className="overflow-x-auto">
              <div className="min-w-[600px] flex flex-col gap-1.5">
                {/* Row 3: 1. Hero Position (with hover delete × and + restore/add position) */}
                <div className="grid grid-cols-[150px_1fr] items-center gap-2">
                  <div className="flex items-center justify-between pr-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      1. Hero Position
                    </span>
                    {addingPosition ? (
                      <div className="flex items-center gap-1 bg-[#181D29] border border-[#818CF8]/60 rounded px-1.5 py-0.5">
                        <input
                          type="text"
                          placeholder="POS"
                          value={newPositionName}
                          onChange={e => setNewPositionName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') handleAddPosition(newPositionName);
                            if (e.key === 'Escape') setAddingPosition(false);
                          }}
                          className="w-10 bg-transparent text-[10px] text-white uppercase focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="button"
                          onClick={() => handleAddPosition(newPositionName)}
                          className="text-[#68B388]"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setAddingPosition(false)}
                          className="text-slate-400"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        title="Add or restore a position (e.g. UTG, HJ, CO, BTN, SB, BB)"
                        onClick={() => {
                          const missing = ['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'].find(
                            p => !seats.includes(p)
                          );
                          if (missing) {
                            handleAddPosition(missing);
                          } else {
                            setAddingPosition(true);
                          }
                        }}
                        className="w-5 h-5 rounded bg-[#181D29] hover:bg-[#232938] border border-[#232938] text-slate-300 flex items-center justify-center text-xs font-bold"
                      >
                        +
                      </button>
                    )}
                  </div>
                  <div
                    className="grid gap-1.5"
                    style={{ gridTemplateColumns: `repeat(${seats.length}, minmax(0, 1fr))` }}
                  >
                    {seats.map((seat, idx) => {
                      const isHero = seat === validPos.heroPos;
                      const isDisabled =
                        ((state.activeScenario === 'Open Raise (RFI)' || state.activeScenario === 'Facing 3-Bet') && seat === 'BB') ||
                        ((state.activeScenario === 'Facing Open' || state.activeScenario === 'Facing 4-Bet') && idx === 0);
                      const hasPainted = hasSeatPaintedChart(seat);

                      return (
                        <div
                          key={seat}
                          onClick={() => {
                            if (!isDisabled) {
                              setState(prev => ({ ...prev, activeHeroPos: seat }));
                            }
                          }}
                          className={`group relative h-8 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 border ${
                            isDisabled
                              ? 'bg-[#0B0D12]/50 text-slate-600 border-[#232938]/50 cursor-not-allowed'
                              : isHero
                              ? 'bg-[#6366F1]/15 border-[#818CF8]/50 text-[#EEF2FF] font-semibold shadow-[0_0_12px_rgba(99,102,241,0.12)] cursor-pointer'
                              : 'bg-[#181D29] text-slate-200 border-[#232938] hover:border-slate-500 cursor-pointer'
                          }`}
                        >
                          <span>{seat}</span>
                          {hasPainted && (
                            <span
                              className={`text-sm leading-none ${
                                isHero ? 'text-[#818CF8]' : 'text-[#68B388]'
                              }`}
                            >
                              •
                            </span>
                          )}
                          {seats.length > 2 && (
                            <button
                              type="button"
                              title={`Delete position ${seat}`}
                              onClick={e => {
                                e.stopPropagation();
                                handleDeletePosition(seat);
                              }}
                              className={`absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-black/20 ${
                                isHero ? 'text-[#EEF2FF]' : 'text-slate-400 hover:text-[#E06C75]'
                              }`}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Row 4: 2. Action Before Hero */}
                <div className="grid grid-cols-[150px_1fr] items-center gap-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    2. Action Before Hero
                  </div>
                  <div
                    className="grid gap-1.5"
                    style={{ gridTemplateColumns: `repeat(${seats.length}, minmax(0, 1fr))` }}
                  >
                    {seats.map((seat, idx) => {
                      if (idx === heroIdx) {
                        return (
                          <div
                            key={seat}
                            className="h-7 rounded-md bg-[#6366F1]/15 border border-[#818CF8]/40 text-[#818CF8] text-[11px] font-bold flex items-center justify-center"
                          >
                            HERO
                          </div>
                        );
                      }

                      if (idx > heroIdx) {
                        return (
                          <div
                            key={seat}
                            className="h-7 rounded-md bg-[#0B0D12] border border-[#232938]/60 text-slate-600 text-[11px] flex items-center justify-center"
                          >
                            —
                          </div>
                        );
                      }

                      // Seat is BEFORE Hero (idx < heroIdx)
                      if (
                        state.activeScenario === 'Open Raise (RFI)' ||
                        state.activeScenario === 'Facing 3-Bet'
                      ) {
                        return (
                          <div
                            key={seat}
                            className="h-7 rounded-md bg-[#181D29]/60 border border-[#232938] text-slate-400 text-[11px] flex items-center justify-center"
                          >
                            Fold
                          </div>
                        );
                      }

                      const isVillain = seat === validPos.villainPos;
                      const actionLabel =
                        state.activeScenario === 'Facing Open'
                          ? 'Open'
                          : '4-Bet';

                      return (
                        <button
                          key={seat}
                          type="button"
                          onClick={() => setState(prev => ({ ...prev, activeVillainPos: seat }))}
                          className={`h-7 rounded-md text-[11px] font-semibold transition-all border ${
                            isVillain
                              ? 'bg-[#E5C07B]/20 text-[#E5C07B] border-[#E5C07B]'
                              : 'bg-[#181D29] text-slate-400 border-[#232938] hover:text-slate-200'
                          }`}
                        >
                          {isVillain ? actionLabel : 'Fold'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Row 5: 3. Action After Hero */}
                <div className="grid grid-cols-[150px_1fr] items-center gap-2">
                  <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    3. Action After Hero
                  </div>
                  <div
                    className="grid gap-1.5"
                    style={{ gridTemplateColumns: `repeat(${seats.length}, minmax(0, 1fr))` }}
                  >
                    {seats.map((seat, idx) => {
                      if (idx === heroIdx) {
                        return (
                          <div
                            key={seat}
                            className="h-7 rounded-md bg-[#6366F1]/15 border border-[#818CF8]/40 text-[#818CF8] text-[11px] font-bold flex items-center justify-center"
                          >
                            HERO
                          </div>
                        );
                      }

                      if (idx < heroIdx) {
                        return (
                          <div
                            key={seat}
                            className="h-7 rounded-md bg-[#0B0D12] border border-[#232938]/60 text-slate-600 text-[11px] flex items-center justify-center"
                          >
                            Acted
                          </div>
                        );
                      }

                      // Seat is AFTER Hero (idx > heroIdx)
                      if (state.activeScenario === 'Facing 3-Bet') {
                        const isVillain = seat === validPos.villainPos;
                        const label = '3-Bet';
                        return (
                          <button
                            key={seat}
                            type="button"
                            onClick={() => setState(prev => ({ ...prev, activeVillainPos: seat }))}
                            className={`h-7 rounded-md text-[11px] font-semibold transition-all border ${
                              isVillain
                                ? 'bg-[#C678DD]/25 text-[#C678DD] border-[#C678DD]'
                                : 'bg-[#181D29] text-slate-400 border-[#232938] hover:text-slate-200'
                            }`}
                          >
                            {isVillain ? label : 'Fold'}
                          </button>
                        );
                      }

                      if (state.activeScenario === 'Facing 4-Bet') {
                        return (
                          <div
                            key={seat}
                            className="h-7 rounded-md bg-[#181D29]/50 border border-[#232938] text-slate-500 text-[11px] flex items-center justify-center"
                          >
                            Fold
                          </div>
                        );
                      }

                      return (
                        <div
                          key={seat}
                          className="h-7 rounded-md bg-[#181D29]/50 border border-[#232938] text-slate-400 text-[11px] flex items-center justify-center"
                        >
                          Yet to Act
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* MAIN SPLIT WORKSPACE (LEFT: 13x13 KEYCAP MATRIX | RIGHT: ACTIONS PALETTE & 12 BUCKETS) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch">
            {/* LEFT COLUMN: 13x13 Tactile Keycap Matrix Card */}
            <div className="lg:col-span-6 bg-[#12161F] border border-[#232938] rounded-xl p-3 flex flex-col justify-between gap-2 self-stretch h-full">
              {/* Card Header */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <h2 className="text-base font-bold text-white tracking-tight">
                    {formatSpotTitle(currentChart)}
                  </h2>
                  <span className="text-xs font-medium text-slate-400 bg-[#181D29] px-2.5 py-0.5 rounded-md border border-[#232938]">
                    {state.activeTableSize}-Max • {state.activeStackDepth} BB
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* 2-way Strategy Mode toggle: Raw (Mixed) | ✨ Auto-Pure (100%) PRO */}
                  <div className="flex items-center bg-[#0B0D12] p-0.5 rounded-lg border border-[#232938]">
                    <button
                      type="button"
                      onClick={() =>
                        updateChart(currentSpotId, c => ({ ...c, strategyMode: 'raw' }))
                      }
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                        currentChart.strategyMode === 'raw'
                          ? 'bg-[#181D29] text-white shadow-sm border border-white/10'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Raw (Mixed)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (userTier !== 'pro' && !state.isPro) {
                          setProModalReason('Auto-Pure (100%) Simplifier is a PRO feature. Upgrade to PRO to purify mixed frequencies with zero EV loss.');
                          setShowProModal(true);
                          return;
                        }
                        updateChart(currentSpotId, c => ({ ...c, strategyMode: 'pure' }));
                      }}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 ${
                        currentChart.strategyMode === 'pure' && (userTier === 'pro' || state.isPro)
                          ? 'bg-[#6366F1]/15 border border-[#818CF8]/50 text-[#EEF2FF] font-semibold shadow-[0_0_12px_rgba(99,102,241,0.12)]'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {userTier !== 'pro' && !state.isPro && (
                        <Lock className="w-3 h-3 text-[#E5C07B]" />
                      )}
                      <span>Auto-Pure (100%)</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Sub-header */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 border-b border-[#232938] pb-1.5">
                <span>
                  {currentChart.strategyMode === 'pure'
                    ? 'Auto-Pure active: drag one hand onto another to swap pure assignments, or click to toggle.'
                    : 'Hover any hand cell for exact combo breakdown, or click/drag to paint.'}
                </span>
                <span className="font-semibold text-slate-200">
                  Playable: <span className="text-[#818CF8]">{chartStats.playablePct.toFixed(1)}%</span> ({Math.round(chartStats.playableCombos)} combos)
                </span>
              </div>

              {/* 13x13 Flat Cut-Corner Cell Grid */}
              <div
                className="flex-1 w-full h-full grid grid-cols-13 grid-rows-13 gap-1 select-none"
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(13, minmax(0, 1fr))',
                  gridTemplateRows: 'repeat(13, minmax(0, 1fr))'
                }}
                onMouseLeave={() => setHoveredHandKey(null)}
              >
                {ALL_169_HANDS.map(handKey => {
                  const combos = getHandCombos(handKey);
                  const cellWeights = displayedGrid[handKey] || {};
                  const bucketId = HAND_TO_BUCKET_ID[handKey];

                  // Check bucket spotlight hover state
                  const isBucketSpotlight = hoveredBucketId !== null;
                  const belongsToHoveredBucket = hoveredBucketId === bucketId;

                  // Build proportional horizontal color bar segments
                  let cumulativePct = 0;
                  const segments: { color: string; start: number; end: number; weight: number }[] = [];
                  for (const act of currentChart.actions) {
                    const w = Math.max(0, Math.min(100, cellWeights[act.id] || 0));
                    if (w > 0) {
                      const start = cumulativePct;
                      const end = Math.min(100, cumulativePct + w);
                      segments.push({ color: act.color, start, end, weight: w });
                      cumulativePct = end;
                    }
                  }

                  let bgStyle: React.CSSProperties = { backgroundColor: '#1C212E' };
                  if (segments.length > 0) {
                    const stops: string[] = [];
                    for (const seg of segments) {
                      stops.push(`${seg.color} ${seg.start}%`);
                      stops.push(`${seg.color} ${seg.end}%`);
                    }
                    if (cumulativePct < 100) {
                      stops.push(`#1C212E ${cumulativePct}%`);
                      stops.push(`#1C212E 100%`);
                    }
                    bgStyle = {
                      background: `linear-gradient(to right, ${stops.join(', ')})`
                    };
                  }

                  // Partial weight display in bottom-right if 0 < weight < 100
                  const activeSelectedW = cellWeights[selectedActionId] || 0;
                  const primaryPartialW =
                    activeSelectedW > 0 && activeSelectedW < 100
                      ? activeSelectedW
                      : cumulativePct > 0 && cumulativePct < 100
                      ? cumulativePct
                      : null;

                  return (
                    <div
                      key={handKey}
                      onMouseDown={() => handleCellMouseDown(handKey)}
                      onMouseEnter={() => handleCellMouseEnter(handKey)}
                      onMouseUp={() => handleCellMouseUp(handKey)}
                      style={bgStyle}
                      className={`relative w-full h-full min-h-[28px] rounded-[6px] overflow-hidden border border-[#262C3A] p-1 flex flex-col justify-between transition-opacity duration-75 select-none cursor-pointer ${
                        isBucketSpotlight
                          ? belongsToHoveredBucket
                            ? 'opacity-100 scale-[1.03] z-10 ring-2 ring-white/80 shadow-lg'
                            : 'opacity-20'
                          : 'opacity-100'
                      }`}
                    >
                      {/* Top row: Hand label top-left, combo number top-right */}
                      <div className="flex items-start justify-between leading-none w-full">
                        <span
                          className={`text-[10px] sm:text-[11px] leading-none font-bold tracking-tight drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)] ${
                            cumulativePct > 0 ? 'text-white' : 'text-slate-300'
                          }`}
                        >
                          {handKey}
                        </span>
                        <span className="text-[8px] leading-none font-semibold text-white/60 drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]">
                          {combos}
                        </span>
                      </div>

                      {/* Bottom row: Partial weight percentage in bottom-right */}
                      <div className="flex items-end justify-end leading-none w-full">
                        {primaryPartialW !== null && (
                          <span className="text-[8px] sm:text-[9px] leading-none font-extrabold text-white bg-black/45 px-1 rounded-[3px]">
                            {Math.round(primaryPartialW)}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Hover Hand Breakdown Bar */}
              <div className="h-7 bg-[#181D29] border border-[#232938] rounded-lg px-2.5 flex items-center justify-between text-[11px] shrink-0">
                {hoveredHandKey ? (
                  <>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white bg-[#0B0D12] px-2 py-0.5 rounded border border-[#232938]">
                        {hoveredHandKey}
                      </span>
                      <span className="text-slate-400">
                        {getHandCombos(hoveredHandKey)} combos •{' '}
                        {STRATEGIC_BUCKETS.find(b => b.id === HAND_TO_BUCKET_ID[hoveredHandKey])?.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {currentChart.actions.map(act => {
                        const w = displayedGrid[hoveredHandKey]?.[act.id] || 0;
                        if (w <= 0) return null;
                        return (
                          <span key={act.id} className="flex items-center gap-1 font-semibold text-slate-200">
                            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: act.color }} />
                            {act.name}: {w}% ({((getHandCombos(hoveredHandKey) * w) / 100).toFixed(1)}c)
                          </span>
                        );
                      })}
                      {(() => {
                        const sumA = currentChart.actions.reduce(
                          (s, a) => s + (displayedGrid[hoveredHandKey]?.[a.id] || 0),
                          0
                        );
                        const foldW = Math.max(0, 100 - sumA);
                        return (
                          <span className="text-slate-400">
                            Fold: {foldW}%
                          </span>
                        );
                      })()}
                    </div>
                  </>
                ) : (
                  <span className="text-slate-500">
                    Hover any hand keycap on the 13×13 matrix to inspect exact action weights and combo breakdown.
                  </span>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN: ACTIONS PALETTE & 12 STRATEGIC BUCKETS */}
            <div className="lg:col-span-6 flex flex-col justify-between gap-3 self-stretch h-full">
              {/* RIGHT COLUMN TOP CARD: ACTIONS PALETTE */}
              <div className="bg-[#12161F] border border-[#232938] rounded-xl p-3 flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    ACTIONS PALETTE
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingActionId(null);
                      setActionFormName('Raise');
                      setActionFormSize('2.5bb');
                      setActionFormColor(STUDIO_SWATCHES[currentChart.actions.length % STUDIO_SWATCHES.length]);
                      setShowAddActionModal(true);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#181D29] hover:bg-[#232938] border border-[#232938] text-xs font-semibold text-[#818CF8] transition-colors"
                  >
                    + Add Action
                  </button>
                </div>

                {/* Full-Width Stacked Action Bars */}
                <div className="flex flex-col gap-2">
                  {currentChart.actions
                    .filter(a => a.id !== 'fold' && !((a as any).label || a.name || '').toLowerCase().includes('fold'))
                    .map(action => {
                    const isSelected = selectedActionId === action.id;
                    const combos = chartStats.actionCombos[action.id] || 0;
                    const pct = (combos / 1326) * 100;
                    const rawLabel = String((action as any).label ?? action.name ?? '').trim();
                    const isCallAction =
                      action.id === 'call' ||
                      rawLabel.toLowerCase().startsWith('call') ||
                      rawLabel.toLowerCase() === 'limp / call';
                    const displayActionLabel = isCallAction ? 'Call' : rawLabel;

                    return (
                      <div
                        key={action.id}
                        draggable={true}
                        onDragStart={(e) => {
                          setDraggedActionId(action.id);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (draggedActionId && draggedActionId !== action.id) {
                            setDragOverActionId(action.id);
                          }
                        }}
                        onDragLeave={() => {
                          if (dragOverActionId === action.id) setDragOverActionId(null);
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedActionId && draggedActionId !== action.id) {
                            handleActionReorder(draggedActionId, action.id);
                          }
                          setDraggedActionId(null);
                          setDragOverActionId(null);
                        }}
                        onDragEnd={() => {
                          setDraggedActionId(null);
                          setDragOverActionId(null);
                        }}
                        onClick={() => setSelectedActionId(action.id)}
                        className={`group rounded-lg p-2.5 flex items-center justify-between transition-all cursor-pointer border ${
                          isSelected
                            ? 'bg-[#181D29] border-[#818CF8]/60 shadow-sm ring-1 ring-[#6366F1]/50'
                            : 'bg-[#181D29]/70 border-[#232938] hover:border-slate-600'
                        } ${draggedActionId === action.id ? 'opacity-50' : ''} ${
                          dragOverActionId === action.id ? 'ring-2 ring-[#6366F1]/50 border-[#818CF8]/60' : ''
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-slate-500 hover:text-slate-300 text-xs cursor-grab active:cursor-grabbing select-none leading-none">
                            ⋮⋮
                          </span>
                          <span
                            className="w-4 h-4 rounded shadow-sm shrink-0 border border-white/20"
                            style={{ backgroundColor: action.color }}
                          />
                          <span className="text-xs font-bold text-white">{displayActionLabel}</span>

                          {/* Inline clickable Sizing Input (hidden for Call actions) */}
                          {!isCallAction && (
                            <input
                              type="text"
                              value={action.size}
                              draggable={false}
                              onMouseDown={(e) => e.stopPropagation()}
                              onClick={e => e.stopPropagation()}
                              onChange={e => {
                                const val = e.target.value;
                                updateChart(currentSpotId, c => ({
                                  ...c,
                                  actions: c.actions.map(a => (a.id === action.id ? { ...a, size: val } : a))
                                }));
                              }}
                              className="w-16 bg-[#0B0D12] border border-[#232938] focus:border-[#818CF8] rounded px-1.5 py-0.5 text-[11px] font-semibold text-slate-200 focus:outline-none"
                            />
                          )}

                          {/* Small edit/delete icons on hover */}
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              title="Edit Action Color & Name"
                              onClick={e => {
                                e.stopPropagation();
                                setEditingActionId(action.id);
                                setActionFormName(action.name);
                                setActionFormSize(action.size);
                                setActionFormColor(action.color);
                                setShowAddActionModal(true);
                              }}
                              className="p-1 text-slate-400 hover:text-white"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            {currentChart.actions.length > 1 && (
                              <button
                                type="button"
                                title="Delete Action"
                                onClick={e => {
                                  e.stopPropagation();
                                  handleDeleteAction(action.id);
                                }}
                                className="p-1 text-slate-400 hover:text-[#E06C75]"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="text-xs font-bold text-slate-200 tabular-nums">
                          {pct.toFixed(1)}% <span className="text-slate-400 font-normal">({Math.round(combos)})</span>
                        </div>
                      </div>
                    );
                  })}

                  {/* Read-only Fold bar */}
                  <div className="rounded-lg p-2.5 flex items-center justify-between bg-[#0B0D12] border border-[#232938] text-slate-400">
                    <div className="flex items-center gap-2.5">
                      <span className="w-4 h-4 rounded bg-[#1C212E] border border-white/10 shrink-0" />
                      <span className="text-xs font-semibold">Fold</span>
                    </div>
                    <div className="text-xs font-semibold tabular-nums">
                      {chartStats.foldPct.toFixed(1)}%{' '}
                      <span className="text-slate-500 font-normal">({Math.round(chartStats.foldCombos)})</span>
                    </div>
                  </div>
                </div>

                {/* Brush Weight Slider & Presets */}
                <div className="pt-2 border-t border-[#232938] flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300">
                      Brush Weight: <strong className="text-[#818CF8]">{brushWeight}%</strong>
                    </span>
                    <div className="flex items-center gap-1">
                      {[25, 50, 75, 100].map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setBrushWeight(preset)}
                          className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors ${
                            brushWeight === preset
                              ? 'bg-[#6366F1]/15 border border-[#818CF8]/50 text-[#EEF2FF] shadow-[0_0_12px_rgba(99,102,241,0.12)]'
                              : 'bg-[#181D29] text-slate-300 hover:bg-[#232938] border border-[#232938]'
                          }`}
                        >
                          {preset}%
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={100}
                    value={brushWeight}
                    onChange={e => setBrushWeight(parseInt(e.target.value, 10))}
                    className="w-full accent-[#6366F1] cursor-pointer h-1.5 bg-[#181D29] rounded-lg"
                  />
                </div>
              </div>

              {/* RIGHT COLUMN BOTTOM CARD: STRATEGIC BUCKETS (12 FAMILIES) WITH HOVER SPOTLIGHT */}
              <div className="bg-[#12161F] border border-[#232938] rounded-xl p-3 flex-1 flex flex-col justify-between gap-2.5 h-full">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                    STRATEGIC BUCKETS (12 FAMILIES)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setConfirmModal({
                        title: 'Clear Entire 13×13 Grid?',
                        message: `This will reset all painted hands on ${formatSpotTitle(currentChart)} back to 100% Fold.`,
                        confirmLabel: 'Clear Grid',
                        danger: true,
                        onConfirm: () => {
                          updateChart(
                            currentSpotId,
                            c => ({ ...c, rawHands: {}, pureSwaps: {} }),
                            ALL_169_HANDS
                          );
                          setConfirmModal(null);
                          triggerToast('Cleared chart grid.');
                        }
                      });
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#181D29] hover:bg-[#E06C75]/20 border border-[#232938] hover:border-[#E06C75]/50 text-xs font-semibold text-slate-300 hover:text-[#E06C75] transition-colors"
                  >
                    Clear Grid
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 flex-1 auto-rows-fr">
                  {STRATEGIC_BUCKETS.map(bucket => {
                    const paintedCount = bucket.hands.filter(h => {
                      const weights = displayedGrid[h];
                      if (!weights) return false;
                      return Object.values(weights).reduce((a, b) => a + (b || 0), 0) > 0;
                    }).length;

                    const isHovered = hoveredBucketId === bucket.id;

                    return (
                      <div
                        key={bucket.id}
                        onMouseEnter={() => setHoveredBucketId(bucket.id)}
                        onMouseLeave={() => setHoveredBucketId(null)}
                        onClick={() => handleBucketClick(bucket)}
                        className={`relative rounded-lg p-2.5 bg-[#181D29] border transition-all cursor-pointer select-none flex flex-col gap-1 ${
                          isHovered
                            ? 'border-[#818CF8]/60 shadow-md bg-[#1C2230]'
                            : 'border-[#232938] hover:border-slate-600'
                        }`}
                      >
                        {/* Floating Tooltip above bucket on hover showing exact hands */}
                        {isHovered && (
                          <div className="absolute bottom-full left-0 right-0 mb-1.5 p-2 rounded-lg bg-[#0B0D12] border border-[#818CF8]/60 shadow-xl z-30 pointer-events-none">
                            <div className="text-[10px] font-bold text-[#818CF8] mb-0.5">
                              {bucket.title} ({bucket.hands.length} hands)
                            </div>
                            <div className="text-[10px] text-slate-200 leading-relaxed break-words">
                              {bucket.hands.join(', ')}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs font-bold text-white truncate">{bucket.title}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              paintedCount > 0
                                ? 'bg-[#6366F1]/20 text-[#818CF8] border border-[#818CF8]/40'
                                : 'bg-[#0B0D12] text-slate-400 border border-[#232938]'
                            }`}
                          >
                            {paintedCount}/{bucket.hands.length}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {bucket.shorthand} ({bucket.hands.length})
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ====================================================================
          VIEW 2: TABLE TRAINER
         ==================================================================== */}
      {activeView === 'trainer' && (
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 py-3 flex flex-col gap-3">
          {/* Trainer Top Bar */}
          <div className="bg-[#12161F] border border-[#232938] rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
            {/* Left: Select Spots (X) + Training Hands button */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setDrawerFolderId(state.activeFolderId);
                  setDrawerTableSize(state.activeTableSize);
                  setDrawerStackDepth(state.activeStackDepth);
                  setShowSpotSelectorDrawer(true);
                }}
                className="px-3.5 py-1.5 rounded-lg bg-[#181D29] hover:bg-[#232938] border border-[#818CF8]/60/50 text-xs font-bold text-white flex items-center gap-1.5 transition-colors"
              >
                <span>▽ Select Spots ({selectedTrainerSpots.filter(id => isChartPopulated(state.charts[id])).length})</span>
              </button>

              <button
                type="button"
                onClick={() => setShowTrainingHandsDrawer(true)}
                className="px-3 py-1.5 rounded-lg bg-[#181D29] hover:bg-[#232938] border border-[#232938] text-xs font-semibold text-slate-200 transition-colors"
              >
                🎯 Training Hands
              </button>

              <button
                type="button"
                onClick={() => startLeakTraining('ALL', 'ALL', 'ALL', 'All Active Leaks')}
                className="px-3 py-1.5 rounded-lg bg-[#181D29] hover:bg-[#232938] border border-[#232938] text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition-colors"
              >
                {userTier !== 'pro' && !state.isPro ? (
                  <Lock className="w-3 h-3 text-[#E5C07B]" />
                ) : (
                  <Flame className="w-3.5 h-3.5 text-[#E06C75]" />
                )}
                <span>Train Leaks</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-[#E06C75]/20 text-[#E06C75] border border-[#E06C75]/40">
                  {activeLeaksList.length} Leaks
                </span>
              </button>

              {isLeakTrainingMode && leakFilterCriteria && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-[#E06C75]/15 border border-[#E06C75]/50 text-xs font-bold text-[#E06C75]">
                  <Flame className="w-3.5 h-3.5" />
                  <span>SRS Leak Session: {leakFilterCriteria.label}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsLeakTrainingMode(false);
                      setLeakFilterCriteria(null);
                      const fallback = isChartPopulated(currentChart)
                        ? [currentSpotId]
                        : allPopulatedCharts.map(c => c.spotId);
                      setSelectedTrainerSpots(fallback);
                      dealNextTrainerHand(fallback, false, null);
                    }}
                    className="ml-1 text-slate-300 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Right: Animation Speed pills (1x, 2x, Instant), Session Accuracy badge, History button */}
            <div className="flex items-center gap-2.5">
              <div className="flex items-center bg-[#0B0D12] p-0.5 rounded-lg border border-[#232938]">
                {(['1x', '2x', 'Instant'] as const).map(spd => (
                  <button
                    key={spd}
                    type="button"
                    onClick={() => setTrainerSpeed(spd)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
                      trainerSpeed === spd
                        ? 'bg-[#6366F1]/15 border border-[#818CF8]/50 text-[#EEF2FF] font-semibold shadow-[0_0_12px_rgba(99,102,241,0.12)]'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {spd}
                  </button>
                ))}
              </div>

              {userTier !== 'pro' && !state.isPro && (
                <div className="px-3 py-1.5 rounded-lg bg-[#181D29] border border-[#232938] text-xs font-semibold text-slate-300">
                  Daily Hands:{' '}
                  <strong className="text-[#818CF8]">
                    {(state.dailyHands?.date === getTodayDateString()
                      ? state.dailyHands.count
                      : state.dailyHandsDate === getTodayDateString()
                      ? state.dailyHandsCount
                      : 0)}{' '}
                    / 50
                  </strong>
                </div>
              )}

              <div className="px-3 py-1.5 rounded-lg bg-[#181D29] border border-[#232938] text-xs font-semibold text-slate-200">
                Accuracy:{' '}
                <strong className="text-[#68B388]">
                  {state.history.length > 0
                    ? `${Math.round((state.history.filter(h => h.isCorrect).length / state.history.length) * 100)}%`
                    : '—'}
                </strong>{' '}
                <span className="text-slate-400">
                  ({state.history.filter(h => h.isCorrect).length}/{state.history.length})
                </span>
              </div>

              <button
                type="button"
                onClick={() => setShowHistoryDrawer(true)}
                className="px-3 py-1.5 rounded-lg bg-[#181D29] hover:bg-[#232938] border border-[#232938] text-xs font-semibold text-slate-200 flex items-center gap-1"
              >
                <History className="w-3.5 h-3.5 text-slate-400" />
                <span>History</span>
              </button>
            </div>
          </div>

          {/* Animated Poker Table Canvas */}
          <div className="flex-1 bg-[#12161F] border border-[#232938] rounded-2xl p-6 flex flex-col justify-between relative min-h-[540px] overflow-hidden">
            {!activeTrainedChart || trainerPhase === 'IDLE' ? (
              <div className="m-auto max-w-md text-center flex flex-col items-center gap-4 py-12">
                <div className="w-14 h-14 rounded-2xl bg-[#181D29] border border-[#232938] flex items-center justify-center text-[#818CF8]">
                  <Play className="w-7 h-7" />
                </div>
                <h3 className="text-lg font-bold text-white">Ready to Train Your Ranges</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Select one or more painted charts in the Spot Selector Drawer, or paint your first chart in the Editor and click <strong>Train This Spot</strong>.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowSpotSelectorDrawer(true)}
                    className="px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#6366F1] text-white shadow-sm shadow-[#4F46E5]/25 font-bold text-xs transition-colors"
                  >
                    ▽ Open Spot Selector
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView('editor')}
                    className="px-4 py-2 rounded-lg bg-[#181D29] hover:bg-[#232938] border border-[#232938] text-slate-200 font-semibold text-xs transition-colors"
                  >
                    Go to Chart Editor
                  </button>
                </div>
              </div>
            ) : (
              <>
                {/* Top Spot Context Pill */}
                <div className="flex items-center justify-between z-10">
                  <div className="flex items-center gap-2 bg-[#181D29] border border-[#232938] px-3 py-1.5 rounded-lg">
                    <span className="text-xs font-bold text-white">{formatSpotTitle(activeTrainedChart)}</span>
                    <span className="text-xs text-slate-400">
                      • {activeTrainedChart.tableSize}-Max • {activeTrainedChart.stackDepth} BB
                    </span>
                  </div>

                  {/* Hold to Peek Chart Button */}
                  <button
                    type="button"
                    onMouseDown={() => setIsPeekHeld(true)}
                    onMouseUp={() => setIsPeekHeld(false)}
                    onMouseLeave={() => setIsPeekHeld(false)}
                    className="px-3 py-1.5 rounded-lg bg-[#181D29] hover:bg-[#232938] border border-[#232938] text-xs font-semibold text-slate-200 flex items-center gap-1.5 select-none"
                  >
                    <Eye className="w-3.5 h-3.5 text-[#818CF8]" />
                    <span>Hold to Peek Chart [Tab]</span>
                  </button>
                </div>

                {/* Oval Poker Table Felt — Step-by-Step Preflop Action Playback */}
                {(() => {
                  const activeFrames =
                    frames.length > 0
                      ? frames
                      : buildPreflopFrames(
                          activeTrainedChart.scenarioType,
                          activeTrainedChart.heroPos,
                          activeTrainedChart.villainPos,
                          activeTrainedChart
                        );
                  const clampedIdx = Math.min(frameIdx, activeFrames.length - 1);
                  const baseFrame = activeFrames[clampedIdx] || activeFrames[activeFrames.length - 1];
                  const currentFrame =
                    trainerPhase === 'SHOWING_RESULT'
                      ? applyHeroDecisionToFrame(
                          activeFrames[activeFrames.length - 1],
                          activeTrainedChart.scenarioType,
                          activeTrainedChart.heroPos,
                          heroFinalAction,
                          activeTrainedChart
                        )
                      : baseFrame;

                  const hIdx = POS_ORDER.indexOf(activeTrainedChart.heroPos as any);
                  const safeHeroIdx = hIdx >= 0 ? hIdx : 0;
                  // Rotate POS_ORDER clockwise so Hero is anchored at bottom center (index 0)
                  const rotatedSeats = POS_ORDER.map(
                    (_, i) => currentFrame.seats[(safeHeroIdx + i) % POS_ORDER.length]
                  );

                  return (
                    <div className="relative my-auto mx-auto w-full max-w-[880px] h-[340px] rounded-[170px] bg-gradient-to-b from-[#16242F] to-[#0F1822] border-[8px] border-[#1E2534] shadow-2xl flex items-center justify-center">
                      {/* Inner Felt Rim Line */}
                      <div className="absolute inset-4 rounded-[150px] border border-white/10 pointer-events-none" />

                      {/* Center Total Pot Pill (No RNG on the table felt) */}
                      <div className="flex flex-col items-center z-10 -translate-y-4">
                        <div className="px-4 py-1.5 rounded-full bg-[#0B0D12]/90 border border-[#232938] text-xs font-bold text-[#E5C07B] shadow-md">
                          Pot: {currentFrame.totalPot} BB
                        </div>
                      </div>

                      {/* Seats Arranged Clockwise Around the Table (Hero anchored at bottom center) */}
                      {rotatedSeats.map((seatObj, idx) => {
                        const angleDeg = 90 + (idx * 360) / rotatedSeats.length;
                        const angleRad = (angleDeg * Math.PI) / 180;
                        const rx = 42; // % of width
                        const ry = 41; // % of height
                        const leftPct = 50 + rx * Math.cos(angleRad);
                        const topPct = 50 + ry * Math.sin(angleRad);

                        const isHeroSeat = seatObj.isHero;
                        const chipLeftPct = 50 + rx * 0.52 * Math.cos(angleRad);
                        const chipTopPct = 50 + ry * 0.48 * Math.sin(angleRad);

                        return (
                          <React.Fragment key={seatObj.pos}>
                            {/* Seat Pod */}
                            <div
                              style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                              className={`absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-150 flex flex-col items-center ${
                                seatObj.dimmed ? 'opacity-40' : 'opacity-100'
                              }`}
                            >
                              {/* Non-Hero Card Backs (only shown when seatObj.hasCards is true) */}
                              {!isHeroSeat && seatObj.hasCards && (
                                <div className="flex items-center gap-0.5 mb-1 transition-all duration-150">
                                  <div className="w-5 h-7 rounded bg-gradient-to-br from-[#E06C75] to-[#9B3B44] border border-white/30 shadow" />
                                  <div className="w-5 h-7 rounded bg-gradient-to-br from-[#E06C75] to-[#9B3B44] border border-white/30 shadow -ml-1.5" />
                                </div>
                              )}

                              {/* Hero's Two Hole Cards — Crisp White Playing Cards */}
                              {isHeroSeat && (
                                <div
                                  className={`flex items-center gap-1.5 mb-1.5 transition-all duration-200 transform ${
                                    seatObj.dimmed
                                      ? 'opacity-40 scale-95'
                                      : 'translate-y-0 scale-100 opacity-100'
                                  }`}
                                >
                                  {dealtCards.map((cardStr, cIdx) => {
                                    const rank = cardStr[0];
                                    const suitChar = cardStr[1];
                                    const suitObj = SUITS.find(s => s.char === suitChar) || SUITS[0];
                                    return (
                                      <div
                                        key={cIdx}
                                        className={`w-12 h-16 bg-white text-slate-900 border border-slate-300 shadow-xl rounded-xl flex flex-col justify-between p-1.5 select-none ${
                                          cIdx === 0 ? '-rotate-2' : 'rotate-2'
                                        }`}
                                      >
                                        <span
                                          style={{ color: suitObj.color }}
                                          className="text-sm font-black leading-none"
                                        >
                                          {rank}
                                        </span>
                                        <span
                                          style={{ color: suitObj.color }}
                                          className="text-lg leading-none self-end"
                                        >
                                          {suitObj.symbol}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}

                              {/* Seat Name, Stack & Status Badge (Highlights seatObj.isActingNow with crisp amber/coral border glow) */}
                              <div
                                className={`px-3 py-1 rounded-xl border text-center min-w-[92px] shadow-lg transition-all duration-150 ${
                                  seatObj.isActingNow
                                    ? isHeroSeat
                                      ? 'bg-[#181D29] border-[#818CF8]/60 text-white ring-2 ring-[#6366F1]/50 shadow-[0_0_16px_rgba(99,102,241,0.35)]'
                                      : 'bg-[#181D29] border-[#E5C07B] text-white ring-2 ring-[#E5C07B] shadow-[0_0_16px_rgba(229,192,123,0.45)]'
                                    : isHeroSeat
                                    ? 'bg-[#181D29] border-[#818CF8]/60/70 text-white'
                                    : seatObj.isVillain && seatObj.bet > 1
                                    ? 'bg-[#181D29] border-[#E5C07B]/80 text-white'
                                    : seatObj.dimmed
                                    ? 'bg-[#0B0D12] border-[#232938] text-slate-400'
                                    : 'bg-[#12161F] border-[#232938] text-slate-200'
                                }`}
                              >
                                <div className="text-[11px] font-extrabold tracking-wide flex items-center justify-center gap-1">
                                  <span>{seatObj.pos}</span>
                                  {isHeroSeat && (
                                    <span className="text-[9px] bg-[#6366F1] text-white px-1 rounded font-black">
                                      HERO
                                    </span>
                                  )}
                                </div>
                                <div className="text-[10px] text-slate-400 font-semibold">
                                  {seatObj.stack} BB
                                </div>
                                {seatObj.status && (
                                  <div
                                    className={`mt-0.5 px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                                      seatObj.status === 'FOLD'
                                        ? 'bg-slate-800/90 text-slate-300'
                                        : seatObj.status.startsWith('YOUR TURN')
                                        ? 'bg-[#6366F1] text-white'
                                        : seatObj.isVillain && seatObj.bet > 1
                                        ? 'bg-[#E5C07B]/20 text-[#E5C07B] border border-[#E5C07B]/40'
                                        : isHeroSeat && seatObj.bet > 1
                                        ? 'bg-[#6366F1]/20 text-[#818CF8] border border-[#818CF8]/40'
                                        : 'bg-[#181D29] text-slate-300 border border-[#232938]'
                                    }`}
                                  >
                                    {seatObj.status}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Bet Chip on the Felt: Hero's bet chip placed at bottom-[118px] left-1/2 -translate-x-1/2 */}
                            {seatObj.bet > 0 && (
                              isHeroSeat ? (
                                <div className="absolute bottom-[118px] left-1/2 -translate-x-1/2 z-20 transition-all duration-150 pointer-events-none">
                                  <div className="px-2.5 py-0.5 rounded-full font-extrabold text-[11px] shadow-lg border bg-[#6366F1] text-white border-white/50 whitespace-nowrap flex items-center gap-1">
                                    <span className="w-2 h-2 rounded-full bg-current opacity-40" />
                                    <span>{seatObj.bet} BB</span>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  style={{ left: `${chipLeftPct}%`, top: `${chipTopPct}%` }}
                                  className="absolute -translate-x-1/2 -translate-y-1/2 z-20 transition-all duration-150 pointer-events-none"
                                >
                                  <div
                                    className={`px-2.5 py-0.5 rounded-full font-extrabold text-[11px] shadow-lg border whitespace-nowrap flex items-center gap-1 ${
                                      seatObj.isVillain && seatObj.bet > 1
                                        ? 'bg-[#E5C07B] text-[#0B0D12] border-white/50'
                                        : 'bg-[#181D29] text-slate-200 border-slate-500'
                                    }`}
                                  >
                                    <span className="w-2 h-2 rounded-full bg-current opacity-40" />
                                    <span>{seatObj.bet} BB</span>
                                  </div>
                                </div>
                              )
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* Result Feedback Banner during SHOWING_RESULT */}
                {trainerPhase === 'SHOWING_RESULT' && lastResult && (
                  <div
                    className={`mx-auto max-w-xl w-full rounded-xl px-4 py-2.5 border flex items-center justify-between gap-4 shadow-xl z-20 ${
                      lastResult.isCorrect
                        ? 'bg-[#143323]/95 border-[#68B388] text-white'
                        : 'bg-[#3B181E]/95 border-[#E06C75] text-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {lastResult.isCorrect ? (
                        <CheckCircle2 className="w-5 h-5 text-[#68B388] shrink-0" />
                      ) : (
                        <AlertCircle className="w-5 h-5 text-[#E06C75] shrink-0" />
                      )}
                      <div>
                        <div className="text-xs font-extrabold flex items-center gap-2">
                          <span>
                            {lastResult.isCorrect
                              ? `✓ Correct (${dealtHandKey}: ${lastResult.chosenActionName})`
                              : `✗ Mistake — Expected ${lastResult.expectedActionName} (You chose ${lastResult.chosenActionName})`}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-200/90">
                          Chart Strategy: <strong>{lastResult.breakdownText}</strong>
                          {lastResult.leakLevelText && (
                            <span className="ml-2 text-[#E5C07B] font-bold">• {lastResult.leakLevelText}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!lastResult.isCorrect && (
                      <button
                        type="button"
                        onClick={() => dealNextTrainerHand()}
                        className="px-3 py-1.5 rounded-lg bg-white text-[#0B0D12] font-bold text-xs shrink-0 hover:bg-slate-200 transition-colors"
                      >
                        Press [Spacebar] for Next Hand
                      </button>
                    )}
                  </div>
                )}

                {/* Bottom Action Dock with Non-Clickable RNG Pill Next to Action Buttons */}
                <div
                  className={`pt-2 flex flex-wrap items-center justify-center gap-2.5 z-10 transition-opacity duration-150 ${
                    trainerPhase === 'HERO_TURN' && frames.length > 0 && frameIdx < frames.length - 1
                      ? 'opacity-75'
                      : 'opacity-100'
                  }`}
                >
                  <div className="px-3.5 py-3 rounded-xl bg-[#1C202B] border border-[#262C3A] text-xs font-mono font-bold text-slate-200 select-none flex items-center gap-1.5">
                    <span className="text-slate-400">RNG</span>
                    <span className="text-[#818CF8] tabular-nums">{rngRoll}</span>
                  </div>

                  <button
                    type="button"
                    disabled={trainerPhase !== 'HERO_TURN'}
                    onClick={() => handleTrainerAction('FOLD')}
                    className={`px-5 py-3 rounded-xl font-bold text-xs border transition-all flex items-center gap-2 ${
                      trainerPhase === 'HERO_TURN'
                        ? 'bg-[#1C212E] hover:bg-[#252C3D] text-white border-white/15 shadow-lg'
                        : 'bg-[#181D29]/50 text-slate-500 border-[#232938] cursor-not-allowed'
                    }`}
                  >
                    <span className="px-1.5 py-0.5 rounded bg-black/40 text-[10px] text-slate-300 font-mono">
                      [Space]
                    </span>
                    <span>Fold</span>
                  </button>

                  {activeTrainedChart.actions
                    .filter(a => a.id !== 'fold' && !((a as any).label || a.name || '').toLowerCase().includes('fold'))
                    .map((act, idx) => (
                    <button
                      key={act.id}
                      type="button"
                      disabled={trainerPhase !== 'HERO_TURN'}
                      onClick={() => handleTrainerAction(act.id)}
                      style={
                        trainerPhase === 'HERO_TURN'
                          ? { backgroundColor: act.color, borderColor: 'rgba(255,255,255,0.25)' }
                          : undefined
                      }
                      className={`px-5 py-3 rounded-xl font-bold text-xs border transition-all flex items-center gap-2 ${
                        trainerPhase === 'HERO_TURN'
                          ? 'text-[#0B0D12] shadow-lg hover:brightness-110'
                          : 'bg-[#181D29]/50 text-slate-500 border-[#232938] cursor-not-allowed'
                      }`}
                    >
                      <span className="px-1.5 py-0.5 rounded bg-black/25 text-[10px] text-white font-mono">
                        [{idx + 1}]
                      </span>
                      <span>
                        {act.id === 'call' ||
                        String((act as any).label ?? act.name ?? '').trim().toLowerCase().startsWith('call')
                          ? 'Call'
                          : `${act.name} ${act.size}`.trim()}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Peek Chart Overlay when holding Tab or button */}
                {isPeekHeld && (
                  <div className="absolute inset-0 bg-[#0B0D12]/90 backdrop-blur-sm z-30 flex items-center justify-center p-6">
                    <div className="bg-[#12161F] border border-[#818CF8]/60 rounded-xl p-4 max-w-xl w-full shadow-2xl">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white">
                          Peek Chart: {formatSpotTitle(activeTrainedChart)}
                        </span>
                        <span className="text-[11px] text-slate-400">Release [Tab] to close</span>
                      </div>
                      <div
                        className="grid gap-1"
                        style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}
                      >
                        {ALL_169_HANDS.map(hk => {
                          const pGrid = getDisplayedGrid(activeTrainedChart);
                          const cw = pGrid[hk] || {};
                          const combos = getHandCombos(hk);
                          let cumulativePct = 0;
                          const segments: { color: string; start: number; end: number; weight: number }[] = [];
                          for (const act of activeTrainedChart.actions) {
                            const w = Math.max(0, Math.min(100, cw[act.id] || 0));
                            if (w > 0) {
                              const start = cumulativePct;
                              const end = Math.min(100, cumulativePct + w);
                              segments.push({ color: act.color, start, end, weight: w });
                              cumulativePct = end;
                            }
                          }
                          let bgStyle: React.CSSProperties = { backgroundColor: '#1C212E' };
                          if (segments.length > 0) {
                            const stops: string[] = [];
                            for (const seg of segments) {
                              stops.push(`${seg.color} ${seg.start}%`);
                              stops.push(`${seg.color} ${seg.end}%`);
                            }
                            if (cumulativePct < 100) {
                              stops.push(`#1C212E ${cumulativePct}%`);
                              stops.push(`#1C212E 100%`);
                            }
                            bgStyle = {
                              background: `linear-gradient(to right, ${stops.join(', ')})`
                            };
                          }
                          const partialW = cumulativePct > 0 && cumulativePct < 100 ? cumulativePct : null;
                          const isDealt = hk === dealtHandKey;
                          return (
                            <div
                              key={hk}
                              style={bgStyle}
                              className={`aspect-square rounded-[7px] overflow-hidden border border-[#262C3A] p-0.5 flex flex-col justify-between select-none cursor-pointer ${
                                isDealt ? 'ring-2 ring-white text-white z-10' : 'text-white/90'
                              }`}
                            >
                              <div className="flex items-start justify-between leading-none w-full">
                                <span className="text-[8px] font-bold">{hk}</span>
                                <span className="text-[7px] text-white/60">{combos}</span>
                              </div>
                              <div className="flex items-end justify-end leading-none w-full">
                                {partialW !== null && (
                                  <span className="text-[7px] font-extrabold text-white bg-black/45 px-0.5 rounded-[2px]">
                                    {Math.round(partialW)}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </main>
      )}

      {/* ====================================================================
          VIEW 3: LEAKS (3 PRACTICAL POKER FILTERS + 0 -> 1 -> 2 -> REMOVED SRS)
         ==================================================================== */}
      {activeView === 'leaks' && (
        <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 py-4 flex flex-col gap-4">
          {/* Header & Primary Folder Filter */}
          <div className="bg-[#12161F] border border-[#232938] rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-base font-bold text-white flex items-center gap-2">
                <Flame className="w-4 h-4 text-[#E06C75]" />
                <span>Spaced Repetition Leak Engine (0 → 1 → 2 → Removed)</span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                Every mistake enters at Level 0. Answer correctly 3 consecutive times across spaced cooldown intervals to permanently clear the leak.
              </p>
            </div>

            {/* 1. Primary Folder Filter */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-slate-400 mr-1">Folder:</span>
              <button
                type="button"
                onClick={() => setLeaksFolderFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                  leaksFolderFilter === 'ALL'
                    ? 'bg-[#6366F1]/15 border-[#818CF8]/50 text-[#EEF2FF] font-semibold shadow-[0_0_12px_rgba(99,102,241,0.12)]'
                    : 'bg-[#181D29] text-slate-300 border-[#232938] hover:border-slate-500'
                }`}
              >
                All Folders
              </button>
              {state.folders.map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setLeaksFolderFilter(f.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                    leaksFolderFilter === f.id
                      ? 'bg-[#6366F1]/15 border-[#818CF8]/50 text-[#EEF2FF] font-semibold shadow-[0_0_12px_rgba(99,102,241,0.12)]'
                      : 'bg-[#181D29] text-slate-300 border-[#232938] hover:border-slate-500'
                  }`}
                >
                  {f.name}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Situation / Scenario Cards (Open Raise (RFI), Facing Open, Facing 3-Bet, Facing 4-Bet) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {SCENARIOS.map(scen => {
              const scenLeaks = activeLeaksList.filter(
                lk =>
                  (leaksFolderFilter === 'ALL' || lk.folderId === leaksFolderFilter) &&
                  lk.scenarioType === scen
              );
              const l0 = scenLeaks.filter(l => l.level === 0).length;
              const l1 = scenLeaks.filter(l => l.level === 1).length;
              const l2 = scenLeaks.filter(l => l.level === 2).length;
              const st = state.scenarioStats[scen] || { total: 0, correct: 0 };
              const acc = st.total > 0 ? `${Math.round((st.correct / st.total) * 100)}%` : '100%';
              const isSelectedScen = leaksScenarioFilter === scen;

              return (
                <div
                  key={scen}
                  onClick={() => setLeaksScenarioFilter(isSelectedScen ? 'ALL' : scen)}
                  className={`bg-[#12161F] rounded-xl p-4 border transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    isSelectedScen
                      ? 'border-[#818CF8]/60 ring-1 ring-[#6366F1]/50/40'
                      : 'border-[#232938] hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-white">{scen}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Accuracy: <strong className="text-[#68B388]">{acc}</strong>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-xs font-extrabold bg-[#E06C75]/15 text-[#E06C75] border border-[#E06C75]/30">
                      {scenLeaks.length} Leaks
                    </span>
                  </div>

                  {/* Level 0 / 1 / 2 breakdown */}
                  <div className="grid grid-cols-3 gap-1.5 bg-[#0B0D12] p-2 rounded-lg border border-[#232938] text-center">
                    <div>
                      <div className="text-[10px] text-slate-400">Lvl 0</div>
                      <div className="text-xs font-bold text-[#E06C75]">{l0}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Lvl 1</div>
                      <div className="text-xs font-bold text-[#E5C07B]">{l1}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400">Lvl 2</div>
                      <div className="text-xs font-bold text-[#68B388]">{l2}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={e => {
                      e.stopPropagation();
                      startLeakTraining(leaksFolderFilter, scen, 'ALL', scen);
                    }}
                    className="w-full py-1.5 rounded-lg bg-[#181D29] hover:bg-[#E06C75] hover:text-[#0B0D12] text-xs font-bold text-[#E06C75] border border-[#E06C75]/40 transition-colors flex items-center justify-center gap-1.5"
                  >
                    {userTier !== 'pro' && !state.isPro ? (
                      <Lock className="w-3.5 h-3.5" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current" />
                    )}
                    <span>Train Leaks</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* 3. Hero Position Breakdown Bar (UTG, HJ, CO, BTN, SB, BB) */}
          <div className="bg-[#12161F] border border-[#232938] rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                HERO POSITION BREAKDOWN
              </span>
              {leaksPositionFilter !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setLeaksPositionFilter('ALL')}
                  className="text-xs text-[#818CF8] hover:underline"
                >
                  Clear Position Filter ({leaksPositionFilter})
                </button>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {['UTG', 'HJ', 'CO', 'BTN', 'SB', 'BB'].map(pos => {
                const posLeaks = activeLeaksList.filter(
                  lk =>
                    (leaksFolderFilter === 'ALL' || lk.folderId === leaksFolderFilter) &&
                    (leaksScenarioFilter === 'ALL' || lk.scenarioType === leaksScenarioFilter) &&
                    lk.heroPos === pos
                );
                const pst = state.positionStats[pos] || { total: 0, correct: 0 };
                const acc = pst.total > 0 ? `${Math.round((pst.correct / pst.total) * 100)}%` : '100%';
                const isSelectedPos = leaksPositionFilter === pos;

                return (
                  <div
                    key={pos}
                    onClick={() => setLeaksPositionFilter(isSelectedPos ? 'ALL' : pos)}
                    className={`rounded-xl p-3 bg-[#181D29] border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      isSelectedPos ? 'border-[#818CF8]/60' : 'border-[#232938] hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold text-white">{pos}</span>
                      <span className="text-[11px] font-bold text-[#E06C75]">{posLeaks.length} leaks</span>
                    </div>
                    <div className="text-[11px] text-slate-400">
                      Accuracy: <strong className="text-slate-200">{acc}</strong>
                    </div>
                    <button
                      type="button"
                      onClick={e => {
                        e.stopPropagation();
                        startLeakTraining(leaksFolderFilter, leaksScenarioFilter, pos, `${pos} Leaks`);
                      }}
                      className="w-full py-1 rounded-md bg-[#0B0D12] hover:bg-[#E06C75] hover:text-[#0B0D12] text-[11px] font-bold text-[#E06C75] border border-[#E06C75]/40 transition-colors flex items-center justify-center gap-1"
                    >
                      {userTier !== 'pro' && !state.isPro ? (
                        <Lock className="w-3 h-3" />
                      ) : (
                        <Play className="w-3 h-3 fill-current" />
                      )}
                      <span>Train Leaks</span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Active Leak Queue Table */}
          <div className="bg-[#12161F] border border-[#232938] rounded-xl p-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  ACTIVE LEAK QUEUE ({filteredLeaks.length})
                </span>
                {(leaksFolderFilter !== 'ALL' || leaksScenarioFilter !== 'ALL' || leaksPositionFilter !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setLeaksFolderFilter('ALL');
                      setLeaksScenarioFilter('ALL');
                      setLeaksPositionFilter('ALL');
                    }}
                    className="text-xs text-slate-400 hover:text-white underline"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() =>
                  startLeakTraining(
                    leaksFolderFilter,
                    leaksScenarioFilter,
                    leaksPositionFilter,
                    'All Matching Leaks'
                  )
                }
                className="px-4 py-2 rounded-lg bg-[#E06C75] hover:bg-[#EF4444] text-[#0B0D12] font-bold text-xs shadow-sm transition-colors flex items-center gap-1.5"
              >
                {userTier !== 'pro' && !state.isPro ? (
                  <Lock className="w-3.5 h-3.5" />
                ) : (
                  <Flame className="w-3.5 h-3.5" />
                )}
                <span>Train Leaks ({filteredLeaks.length})</span>
              </button>
            </div>

            {filteredLeaks.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400 bg-[#0B0D12] rounded-xl border border-[#232938]">
                No active leaks match the selected filters. Train hands in the Table Trainer—any mistake will automatically populate here at Level 0.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#232938] text-[11px] uppercase text-slate-400">
                      <th className="py-2.5 px-3">Hand</th>
                      <th className="py-2.5 px-3">Spot Description</th>
                      <th className="py-2.5 px-3">SRS Progress (0 → 1 → 2)</th>
                      <th className="py-2.5 px-3">Cooldown Status</th>
                      <th className="py-2.5 px-3">Expected Chart Weights</th>
                      <th className="py-2.5 px-3 text-right">Mistakes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#232938]">
                    {filteredLeaks.map(lk => {
                      const chart = state.charts[lk.spotId];
                      if (!chart) return null;
                      const grid = getDisplayedGrid(chart);
                      const cell = grid[lk.handKey] || {};
                      const reqCooldown = Math.round(4 * Math.pow(2.5, lk.level));
                      const handsElapsed = state.totalHandsTrained - lk.lastSeenHandNum;
                      const remainingCooldown = Math.max(0, reqCooldown - handsElapsed);

                      // Build expected weights summary
                      const weightBadges = chart.actions
                        .map(a => ({ name: a.name, size: a.size, color: a.color, w: cell[a.id] || 0 }))
                        .filter(x => x.w > 0);
                      const sumAct = weightBadges.reduce((s, x) => s + x.w, 0);
                      const foldW = Math.max(0, 100 - sumAct);

                      return (
                        <tr key={lk.leakKey} className="hover:bg-[#181D29]/60">
                          <td className="py-2.5 px-3">
                            <span className="px-2 py-1 rounded bg-[#181D29] border border-white/15 font-extrabold text-white">
                              {lk.handKey}
                            </span>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-200">{formatSpotTitle(chart)}</div>
                            <div className="text-[11px] text-slate-400">
                              {chart.tableSize}-Max • {chart.stackDepth} BB • {chart.scenarioType}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              {[0, 1, 2].map(step => (
                                <span
                                  key={step}
                                  className={`w-3 h-3 rounded-full border ${
                                    lk.level >= step
                                      ? step === 0
                                        ? 'bg-[#E06C75] border-[#E06C75]'
                                        : step === 1
                                        ? 'bg-[#E5C07B] border-[#E5C07B]'
                                        : 'bg-[#68B388] border-[#68B388]'
                                      : 'bg-[#0B0D12] border-slate-600'
                                  }`}
                                />
                              ))}
                              <span className="ml-1 font-semibold text-slate-300">Level {lk.level}</span>
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            {remainingCooldown === 0 ? (
                              <span className="px-2 py-0.5 rounded bg-[#68B388]/15 text-[#68B388] border border-[#68B388]/30 font-bold text-[11px]">
                                Ready Now
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded bg-[#181D29] text-slate-400 border border-[#232938] text-[11px]">
                                Cooldown: {remainingCooldown} hands
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="flex flex-wrap items-center gap-2">
                              {weightBadges.map((wb, idx) => (
                                <span
                                  key={idx}
                                  className="px-2 py-0.5 rounded text-[11px] font-bold text-[#0B0D12]"
                                  style={{ backgroundColor: wb.color }}
                                >
                                  {wb.name} {wb.size}: {wb.w}%
                                </span>
                              ))}
                              {foldW > 0 && (
                                <span className="px-2 py-0.5 rounded bg-[#1C212E] text-slate-300 text-[11px]">
                                  Fold: {foldW}%
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-[#E06C75]">{lk.mistakes}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </main>
      )}

      {/* ====================================================================
          SELECT TRAINING SPOTS RIGHT SLIDE-OVER DRAWER (V4)
         ==================================================================== */}
      {showSpotSelectorDrawer && (
        <div
          onClick={() => setShowSpotSelectorDrawer(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 flex justify-end"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-xl bg-[#12161F] border-l border-[#232938] h-full flex flex-col justify-between overflow-hidden shadow-2xl"
          >
            <div className="p-4 border-b border-[#232938] flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                Select Training Spots
              </h2>
              <button
                type="button"
                onClick={() => setShowSpotSelectorDrawer(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
              {/* Top Banner Card (Inside Strict Bounds: min-w-0 flex-1 on left, shrink-0 on right) */}
              <div className="bg-[#181D29] border border-[#232938] rounded-xl p-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Current Editor Chart
                  </div>
                  <div className="text-xs font-bold text-white truncate">
                    {state.folders.find(f => f.id === state.activeFolderId)?.name} • {state.activeTableSize}-Max •{' '}
                    {state.activeStackDepth} BB / {state.activeScenario} • {validPos.heroPos}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!isChartPopulated(currentChart)) {
                      triggerToast('Current Editor Chart is empty. Paint hands first.');
                      return;
                    }
                    setSelectedTrainerSpots([currentSpotId]);
                    setIsLeakTrainingMode(false);
                    setShowSpotSelectorDrawer(false);
                    dealNextTrainerHand([currentSpotId], false, null);
                  }}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-[#4F46E5] hover:bg-[#6366F1] text-white shadow-sm shadow-[#4F46E5]/25 font-bold text-xs transition-colors"
                >
                  Select Only Current Editor Chart
                </button>
              </div>

              {/* ALL SAVED CHARTS QUICK BROWSER (Filter Out Nothing) */}
              <div className="bg-[#0B0D12] border border-[#232938] rounded-xl p-3 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    All Saved Charts ({allPopulatedCharts.length})
                  </span>
                  {allPopulatedCharts.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedTrainerSpots(allPopulatedCharts.map(c => c.spotId))}
                      className="text-[11px] font-semibold text-[#68B388] hover:underline"
                    >
                      Select All ({allPopulatedCharts.length})
                    </button>
                  )}
                </div>
                {allPopulatedCharts.length === 0 ? (
                  <div className="text-[11px] text-slate-500">No painted charts yet.</div>
                ) : (
                  <div className="max-h-36 overflow-y-auto flex flex-wrap gap-1.5">
                    {allPopulatedCharts.map(c => {
                      const isSel = selectedTrainerSpots.includes(c.spotId);
                      const fName = state.folders.find(f => f.id === c.folderId)?.name || 'Unassigned';
                      return (
                        <div
                          key={c.spotId}
                          className={`group flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-all cursor-pointer ${
                            isSel
                              ? 'bg-[#6366F1]/15 border-[#818CF8]/50 text-[#EEF2FF] font-semibold shadow-[0_0_12px_rgba(99,102,241,0.12)]'
                              : 'bg-[#181D29] text-slate-200 border-[#232938] hover:border-slate-500'
                          }`}
                          onClick={() =>
                            setSelectedTrainerSpots(prev =>
                              prev.includes(c.spotId) ? prev.filter(id => id !== c.spotId) : [...prev, c.spotId]
                            )
                          }
                        >
                          <span>
                            {formatSpotTitle(c)} • {c.stackDepth} BB ({fName})
                          </span>
                          <button
                            type="button"
                            title="Delete Chart"
                            onClick={e => {
                              e.stopPropagation();
                              handleDeleteSavedChart(c.spotId, `${formatSpotTitle(c)} • ${c.stackDepth} BB`);
                            }}
                            className={`p-0.5 rounded hover:bg-black/20 ${
                              isSel ? 'text-[#EEF2FF]' : 'text-slate-400 hover:text-[#E06C75]'
                            }`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 1. PRIMARY FOLDER SOURCE */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  1. PRIMARY FOLDER SOURCE
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {state.folders.map(f => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setDrawerFolderId(f.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        drawerFolderId === f.id
                          ? 'bg-[#6366F1]/15 border-[#818CF8]/50 text-[#EEF2FF] font-semibold shadow-[0_0_12px_rgba(99,102,241,0.12)]'
                          : 'bg-[#181D29] text-slate-300 border-[#232938]'
                      }`}
                    >
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. TABLE SIZE & STACK DEPTH FILTER */}
              <div className="flex flex-col gap-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  2. TABLE SIZE & STACK DEPTH FILTER
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {state.playerOptions.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setDrawerTableSize(p)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                        drawerTableSize === p
                          ? 'bg-[#6366F1]/15 border-[#818CF8]/50 text-[#EEF2FF] font-semibold shadow-[0_0_12px_rgba(99,102,241,0.12)]'
                          : 'bg-[#181D29] text-slate-300 border-[#232938]'
                      }`}
                    >
                      {p}-Max
                    </button>
                  ))}
                  <span className="text-slate-600">|</span>
                  {state.stackOptions.map(s => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setDrawerStackDepth(s)}
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                        drawerStackDepth === s
                          ? 'bg-[#6366F1]/15 border-[#818CF8]/50 text-[#EEF2FF] font-semibold shadow-[0_0_12px_rgba(99,102,241,0.12)]'
                          : 'bg-[#181D29] text-slate-300 border-[#232938]'
                      }`}
                    >
                      {s} BB
                    </button>
                  ))}
                </div>
              </div>

              {/* 3. EXACT CHARTS BY SCENARIO */}
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    3. EXACT CHARTS BY SCENARIO
                  </span>
                  <div className="flex items-center gap-3 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        const paintedInFilter = Object.values(state.charts)
                          .filter(
                            c =>
                              c.folderId === drawerFolderId &&
                              c.tableSize === drawerTableSize &&
                              c.stackDepth === drawerStackDepth &&
                              isChartPopulated(c)
                          )
                          .map(c => c.spotId);
                        setSelectedTrainerSpots(prev => [...new Set([...prev, ...paintedInFilter])]);
                      }}
                      className="text-[#68B388] hover:underline font-semibold"
                    >
                      Select Painted Charts
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedTrainerSpots([])}
                      className="text-slate-400 hover:text-white underline"
                    >
                      Clear All Spots
                    </button>
                  </div>
                </div>

                {SCENARIOS.map(scen => {
                  const dSeats = getSeatsForTableSize(drawerTableSize);
                  const savedForScen = Object.values(state.charts).filter(
                    c =>
                      c.folderId === drawerFolderId &&
                      c.tableSize === drawerTableSize &&
                      c.stackDepth === drawerStackDepth &&
                      c.scenarioType === scen &&
                      isChartPopulated(c)
                  );

                  return (
                    <div
                      key={scen}
                      className="bg-[#181D29] border border-[#232938] rounded-xl p-3 flex flex-col gap-2"
                    >
                      <div className="text-xs font-bold text-white">{scen}</div>

                      {/* Position pills */}
                      <div className="flex flex-wrap gap-1.5">
                        {dSeats.map(pos => {
                          if (scen === 'Open Raise (RFI)' && pos === 'BB') return null;
                          const matchingChart = savedForScen.find(c => c.heroPos === pos);
                          const isPop = Boolean(matchingChart);
                          const isSelected = matchingChart
                            ? selectedTrainerSpots.includes(matchingChart.spotId)
                            : false;

                          return (
                            <button
                              key={pos}
                              type="button"
                              disabled={!isPop}
                              onClick={() => {
                                if (!matchingChart) return;
                                setSelectedTrainerSpots(prev =>
                                  prev.includes(matchingChart.spotId)
                                    ? prev.filter(id => id !== matchingChart.spotId)
                                    : [...prev, matchingChart.spotId]
                                );
                              }}
                              className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1 border transition-all ${
                                !isPop
                                  ? 'bg-[#0B0D12]/50 text-slate-600 border-[#232938] cursor-not-allowed'
                                  : isSelected
                                  ? 'bg-[#6366F1]/15 border-[#818CF8]/50 text-[#EEF2FF] font-semibold shadow-[0_0_12px_rgba(99,102,241,0.12)]'
                                  : 'bg-[#12161F] text-slate-200 border-slate-600 hover:border-white'
                              }`}
                            >
                              <span>{pos}</span>
                              {isPop && (
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    isSelected ? 'bg-[#0B0D12]' : 'bg-[#68B388]'
                                  }`}
                                />
                              )}
                            </button>
                          );
                        })}
                      </div>

                      {/* SAVED CHARTS: villain-pair pills */}
                      {scen !== 'Open Raise (RFI)' && savedForScen.length > 0 && (
                        <div className="pt-1.5 border-t border-[#232938] flex flex-wrap items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase text-slate-400 mr-1">
                            SAVED CHARTS:
                          </span>
                          {savedForScen.map(c => {
                            const isSel = selectedTrainerSpots.includes(c.spotId);
                            return (
                              <button
                                key={c.spotId}
                                type="button"
                                onClick={() =>
                                  setSelectedTrainerSpots(prev =>
                                    prev.includes(c.spotId)
                                      ? prev.filter(id => id !== c.spotId)
                                      : [...prev, c.spotId]
                                  )
                                }
                                className={`px-2 py-0.5 rounded text-[11px] font-semibold border transition-all ${
                                  isSel
                                    ? 'bg-[#6366F1]/15 border-[#818CF8]/50 text-[#EEF2FF] font-semibold shadow-[0_0_12px_rgba(99,102,241,0.12)]'
                                    : 'bg-[#0B0D12] text-slate-300 border-[#232938]'
                                }`}
                              >
                                {c.heroPos} vs {c.villainPos}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="p-4 border-t border-[#232938] flex items-center justify-between bg-[#0B0D12]">
              <span className="text-xs text-slate-400">
                Active Pool:{' '}
                <strong className="text-white">
                  {selectedTrainerSpots.filter(id => isChartPopulated(state.charts[id])).length} chart(s)
                </strong>
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowSpotSelectorDrawer(false);
                  setIsLeakTrainingMode(false);
                  dealNextTrainerHand(selectedTrainerSpots, false, null);
                }}
                className="px-4 py-2 rounded-lg bg-[#4F46E5] hover:bg-[#6366F1] text-white shadow-sm shadow-[#4F46E5]/25 font-bold text-xs transition-colors"
              >
                Start Training Selected Spots
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          TRAINING HANDS CUSTOMIZATION DRAWER (🎯 Training Hands X/169)
         ==================================================================== */}
      {showTrainingHandsDrawer && (
        <div
          onClick={() => setShowTrainingHandsDrawer(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 flex justify-end"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-lg bg-[#12161F] border-l border-[#232938] h-full flex flex-col justify-between p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#232938]">
              <div>
                <h3 className="text-sm font-bold text-white">
                  🎯 Customize Training Hands ({getEffectiveTrainingHands(currentChart).length}/169)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Smart Default automatically includes all playable hands (&gt;0%) + 1-cell border of adjacent Fold hands.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowTrainingHandsDrawer(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {(() => {
              const effective = getEffectiveTrainingHands(currentChart);
              const effectiveSet = new Set(effective);
              const smartBorderHands = getSmartDefaultTrainingHands(currentChart);
              const inRangeHands = getInRangeHands(currentChart);

              const isAll169Active = effective.length === 169;
              const isSmartBorderActive =
                smartBorderHands.length > 0 &&
                effective.length === smartBorderHands.length &&
                smartBorderHands.every(h => effectiveSet.has(h));
              const isOnlyInRangeActive =
                inRangeHands.length > 0 &&
                effective.length === inRangeHands.length &&
                inRangeHands.every(h => effectiveSet.has(h));

              const applyTrainingHandMode = (hk: string, mode: 'select' | 'deselect') => {
                updateChart(currentSpotId, c => {
                  const curList = getEffectiveTrainingHands(c);
                  const nextSet = new Set(curList);
                  if (mode === 'select') nextSet.add(hk);
                  else nextSet.delete(hk);
                  return {
                    ...c,
                    customTrainingHands: ALL_169_HANDS.filter(x => nextSet.has(x))
                  };
                });
              };

              return (
                <>
                  <div className="my-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Smart Border 2-Step Toggle Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isSmartBorderActive) {
                            // 2nd Click: Strip away border fold hands and keep ONLY inRangeHands
                            updateChart(currentSpotId, c => ({
                              ...c,
                              customTrainingHands: inRangeHands
                            }));
                          } else {
                            // 1st Click: Set selection to inRangeHands + borderFoldHands
                            updateChart(currentSpotId, c => ({
                              ...c,
                              customTrainingHands: smartBorderHands
                            }));
                          }
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                          isSmartBorderActive
                            ? 'bg-[#6366F1]/15 border-[#818CF8]/50 text-[#EEF2FF] font-semibold shadow-[0_0_12px_rgba(99,102,241,0.12)]'
                            : isOnlyInRangeActive
                            ? 'bg-[#6366F1]/15 border-[#818CF8]/50 text-[#818CF8]'
                            : 'bg-[#181D29] text-slate-300 border-[#232938] hover:border-slate-500'
                        }`}
                      >
                        {isSmartBorderActive
                          ? 'Smart Border (Click for In-Range Only)'
                          : isOnlyInRangeActive
                          ? 'In-Range Only (Click for +Border)'
                          : 'Smart Border'}
                      </button>

                      {/* All 169 2-Step Toggle Button */}
                      <button
                        type="button"
                        onClick={() => {
                          if (isAll169Active) {
                            // 2nd Click: Clear selection completely (0 hands selected)
                            updateChart(currentSpotId, c => ({
                              ...c,
                              customTrainingHands: []
                            }));
                          } else {
                            // 1st Click: Select all 169 hands
                            updateChart(currentSpotId, c => ({
                              ...c,
                              customTrainingHands: [...ALL_169_HANDS]
                            }));
                          }
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                          isAll169Active
                            ? 'bg-[#6366F1]/15 border-[#818CF8]/50 text-[#EEF2FF] font-semibold shadow-[0_0_12px_rgba(99,102,241,0.12)]'
                            : 'bg-[#181D29] text-slate-300 border-[#232938] hover:border-slate-500'
                        }`}
                      >
                        {isAll169Active ? 'All 169 (Click to Clear 0)' : 'All 169'}
                      </button>
                    </div>

                    {/* Two Distinct Color Legend Pills */}
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#E06C75]/25 text-[#E06C75] border border-[#E06C75] flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#E06C75]" />
                        In Range (Painted)
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#6366F1]/20 text-[#818CF8] border border-[#818CF8]/60 flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-[#818CF8]" />
                        Added Fold Hand
                      </span>
                    </div>
                  </div>

                  {/* Click-and-Drag 13x13 Mini-Matrix */}
                  <div
                    className="grid gap-1 my-auto select-none"
                    style={{ gridTemplateColumns: 'repeat(13, minmax(0, 1fr))' }}
                  >
                    {ALL_169_HANDS.map(hk => {
                      const isIncluded = effectiveSet.has(hk);
                      const cellWeights = displayedGrid[hk] || {};
                      const sumOfActiveWeights = Object.values(cellWeights).reduce((a, b) => a + (b || 0), 0);
                      const isInPaintedRange = sumOfActiveWeights > 0;

                      return (
                        <div
                          key={hk}
                          onMouseDown={e => {
                            e.preventDefault();
                            isDraggingTrainingGrid.current = true;
                            const nextMode: 'select' | 'deselect' = isIncluded ? 'deselect' : 'select';
                            dragTrainingMode.current = nextMode;
                            applyTrainingHandMode(hk, nextMode);
                          }}
                          onMouseEnter={() => {
                            if (!isDraggingTrainingGrid.current) return;
                            applyTrainingHandMode(hk, dragTrainingMode.current);
                          }}
                          className={`aspect-square rounded-[7px] text-[9px] font-bold border flex items-center justify-center select-none cursor-pointer transition-colors ${
                            isIncluded
                              ? isInPaintedRange
                                ? 'bg-[#E06C75] text-[#0B0D12] border-[#818CF8]/60 ring-1 ring-[#6366F1]/50'
                                : 'bg-[#6366F1]/25 text-[#EEF2FF] border-[#818CF8]/60 ring-1 ring-[#6366F1]/50'
                              : 'bg-[#14171F] opacity-40 text-slate-400 border-[#232938]'
                          }`}
                        >
                          {hk}
                        </div>
                      );
                    })}
                  </div>
                </>
              );
            })()}

            <div className="pt-3 border-t border-[#232938] flex justify-end">
              <button
                type="button"
                onClick={() => setShowTrainingHandsDrawer(false)}
                className="px-4 py-1.5 rounded-lg bg-[#4F46E5] hover:bg-[#6366F1] text-white font-bold text-xs shadow-sm shadow-[#4F46E5]/25"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          HISTORY SLIDE-OVER DRAWER
         ==================================================================== */}
      {showHistoryDrawer && (
        <div
          onClick={() => setShowHistoryDrawer(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 flex justify-end"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="w-full max-w-md bg-[#12161F] border-l border-[#232938] h-full flex flex-col justify-between p-4 shadow-2xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#232938]">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <History className="w-4 h-4 text-[#818CF8]" />
                <span>Recent Session Hands ({state.history.length})</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowHistoryDrawer(false)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto my-3 flex flex-col gap-2">
              {state.history.length === 0 ? (
                <div className="text-center text-xs text-slate-500 my-auto">
                  No hands trained yet in this session.
                </div>
              ) : (
                state.history.map(item => (
                  <div
                    key={item.id}
                    className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                      item.isCorrect
                        ? 'bg-[#143323]/30 border-[#68B388]/40'
                        : 'bg-[#3B181E]/30 border-[#E06C75]/40'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 rounded bg-[#0B0D12] border border-[#232938]">
                          {item.handKey}
                        </span>
                        <span>{item.spotTitle}</span>
                        <span className="text-[10px] text-slate-400">RNG: {item.rngRoll}</span>
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5">
                        Chose: <strong>{item.chosenActionName}</strong> • Expected:{' '}
                        <strong>{item.expectedActionName}</strong>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.isCorrect ? 'bg-[#68B388] text-[#0B0D12]' : 'bg-[#E06C75] text-[#0B0D12]'
                      }`}
                    >
                      {item.isCorrect ? 'PASS' : 'LEAK'}
                    </span>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-[#232938] flex justify-between">
              <button
                type="button"
                onClick={() => setState(prev => ({ ...prev, history: [] }))}
                className="text-xs text-slate-400 hover:text-[#E06C75]"
              >
                Clear History
              </button>
              <button
                type="button"
                onClick={() => setShowHistoryDrawer(false)}
                className="px-4 py-1.5 rounded-lg bg-[#181D29] text-white font-semibold text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          ADD / EDIT ACTION MODAL (16-COLOR STUDIO SWATCH PALETTE)
         ==================================================================== */}
      {showAddActionModal && (
        <div
          onClick={() => setShowAddActionModal(false)}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-[#12161F] border border-[#232938] rounded-xl max-w-md w-full p-5 flex flex-col gap-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                {editingActionId ? 'Edit Chart Action' : 'Add New Chart Action'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddActionModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Action Name</label>
                <input
                  type="text"
                  value={actionFormName}
                  onChange={e => setActionFormName(e.target.value)}
                  className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg px-3 py-1.5 text-xs text-white focus:border-[#818CF8] focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Sizing</label>
                <input
                  type="text"
                  value={actionFormSize}
                  onChange={e => setActionFormSize(e.target.value)}
                  className="w-full bg-[#0B0D12] border border-[#232938] rounded-lg px-3 py-1.5 text-xs text-white focus:border-[#818CF8] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-2">
                16-Color Studio Swatch Palette
              </label>
              <div className="grid grid-cols-8 gap-2">
                {STUDIO_SWATCHES.map(color => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setActionFormColor(color)}
                    style={{ backgroundColor: color }}
                    className={`h-7 rounded-md border transition-transform ${
                      actionFormColor === color
                        ? 'scale-110 ring-2 ring-white border-white'
                        : 'border-black/30 hover:scale-105'
                    }`}
                  />
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddActionModal(false)}
                className="px-3 py-1.5 rounded-lg bg-[#181D29] text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveActionModal}
                className="px-4 py-1.5 rounded-lg bg-[#4F46E5] hover:bg-[#6366F1] text-white text-xs font-bold shadow-sm shadow-[#4F46E5]/25"
              >
                Save Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          UPGRADE TO PRO MODAL (CLOSES ON BACKDROP CLICK)
         ==================================================================== */}
      {showProModal && (
        <div
          onClick={() => setShowProModal(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-[#12161F] border border-[#E5C07B]/50 rounded-2xl max-w-lg w-full p-6 flex flex-col gap-4 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-[#E5C07B]" />
                <h3 className="text-base font-bold text-white">Upgrade to PRO</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowProModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {proModalReason && (
              <div className="p-3 rounded-lg bg-[#6366F1]/15 border border-[#818CF8]/40 text-xs text-[#818CF8] font-medium">
                {proModalReason}
              </div>
            )}

            {/* Clean Comparison of FREE vs. PRO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#0B0D12] border border-[#232938] flex flex-col gap-2">
                <div className="font-bold text-slate-300 uppercase">FREE</div>
                <ul className="text-slate-400 space-y-1.5 text-[11px]">
                  <li>• Up to 5 Charts ({populatedChartCount}/5 used)</li>
                  <li>
                    • 50 Training Hands / Day (
                    {state.dailyHands?.date === getTodayDateString()
                      ? state.dailyHands.count
                      : state.dailyHandsDate === getTodayDateString()
                      ? state.dailyHandsCount
                      : 0}
                    /50 today)
                  </li>
                  <li>• Unlimited Folders & Custom Stacks</li>
                  <li>• Full 6-Max Spot Trainer</li>
                </ul>
              </div>
              <div className="p-3.5 rounded-xl bg-[#181D29] border border-[#E5C07B]/50 flex flex-col gap-2">
                <div className="font-bold text-[#E5C07B] uppercase">PRO</div>
                <ul className="text-slate-200 space-y-1.5 text-[11px]">
                  <li>• Unlimited Charts</li>
                  <li>• Unlimited Daily Training Hands</li>
                  <li>• Spaced Repetition Leak Trainer</li>
                  <li>• Auto-Pure (100%) Simplifier</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-2 border-t border-[#232938]">
              {/* Primary CTA Button ("Upgrade to PRO") */}
              <button
                type="button"
                onClick={() => {
                  const sessionUser = authUser;
                  if (!sessionUser) {
                    setShowProModal(false);
                    setAuthModalNotice('Please log in or create a free account first to upgrade to PRO.');
                    setShowAuthModal(true);
                    return;
                  }
                  const url =
                    CHECKOUT_BASE_URL +
                    '?client_reference_id=' +
                    sessionUser.id +
                    '&prefilled_email=' +
                    encodeURIComponent(sessionUser.email || '') +
                    '&checkout[custom][user_id]=' +
                    sessionUser.id +
                    '&checkout[email]=' +
                    encodeURIComponent(sessionUser.email || '');
                  window.open(url, '_blank', 'noopener,noreferrer');
                }}
                className="w-full py-2.5 rounded-xl bg-[#E5C07B] hover:bg-[#D4B46A] text-[#0B0D12] font-extrabold text-xs transition-colors flex items-center justify-center gap-2 shadow-md"
              >
                <Crown className="w-4 h-4" />
                <span>Upgrade to PRO</span>
              </button>

              {/* Secondary Button: "Already upgraded? Refresh PRO Status" */}
              <button
                type="button"
                onClick={() => refreshTierStatus(false)}
                className="w-full py-2 rounded-xl bg-[#181D29] hover:bg-[#232938] border border-[#232938] text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#E5C07B]" />
                <span>Already upgraded? Refresh PRO Status</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          CUSTOM CONFIRMATION MODAL
         ==================================================================== */}
      {confirmModal && (
        <div
          onClick={() => setConfirmModal(null)}
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-[#12161F] border border-[#232938] rounded-xl max-w-md w-full p-5 flex flex-col gap-4 shadow-2xl"
          >
            <h3 className="text-sm font-bold text-white">{confirmModal.title}</h3>
            <p className="text-xs text-slate-300 leading-relaxed">{confirmModal.message}</p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-3.5 py-1.5 rounded-lg bg-[#181D29] text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold ${
                  confirmModal.danger
                    ? 'bg-[#E06C75] text-[#0B0D12] hover:bg-[#D15A66]'
                    : 'bg-[#68B388] text-[#0B0D12]'
                }`}
              >
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          SUPABASE AUTH & CLOUD SYNC MODAL
         ==================================================================== */}
      {showAuthModal && (
        <SupabaseAuthModal
          authUser={authUser}
          syncStatus={syncStatus}
          lastSyncedAt={lastSyncedAt}
          syncErrorMessage={syncErrorMessage}
          initialNotice={authModalNotice}
          onClose={() => {
            setAuthModalNotice(null);
            setShowAuthModal(false);
          }}
          onManualPush={() => {
            if (authUser) pushToCloud(state, authUser, false);
          }}
          onManualPull={() => {
            if (authUser) pullFromCloud(authUser, false);
          }}
          triggerToast={triggerToast}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-[#181D29] border border-[#818CF8]/60 text-white px-4 py-2.5 rounded-xl shadow-2xl text-xs font-semibold z-50 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#818CF8]" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// 14. SUPABASE AUTH & CLOUD SYNC MODAL COMPONENT
// ============================================================================

interface SupabaseAuthModalProps {
  authUser: SupabaseUser | null;
  syncStatus: 'local' | 'syncing' | 'synced' | 'error';
  lastSyncedAt: string | null;
  syncErrorMessage: string | null;
  initialNotice?: string | null;
  onClose: () => void;
  onManualPush: () => void;
  onManualPull: () => void;
  triggerToast: (msg: string) => void;
}

function SupabaseAuthModal({
  initialNotice,
  onClose,
  triggerToast
}: SupabaseAuthModalProps) {
  const [authTab, setAuthTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const handleLogIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setFeedback(null);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password
    });
    setLoading(false);
    if (error) {
      setFeedback({ type: 'error', text: error.message });
    } else if (data?.user) {
      triggerToast('Logged in to RangeFlow Cloud!');
      onClose();
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || password.length < 6) {
      setFeedback({ type: 'error', text: 'Enter a valid email and a password of at least 6 characters.' });
      return;
    }
    setLoading(true);
    setFeedback(null);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password
    });
    setLoading(false);
    if (error) {
      setFeedback({ type: 'error', text: error.message });
    } else if (data?.session) {
      triggerToast('Account created & logged in!');
      onClose();
    } else {
      setFeedback({
        type: 'success',
        text: 'Account created! Check your email inbox to confirm your address, then log in.'
      });
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4"
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-[#12161F] border border-[#232938] rounded-2xl max-w-md w-full p-5 flex flex-col gap-4 shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-[#232938] pb-3">
          <h3 className="text-sm font-bold text-white">
            {authTab === 'login' ? 'Log In to RangeFlow' : 'Create RangeFlow Account'}
          </h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Clean 2-way toggle between Log In and Sign Up */}
        <div className="grid grid-cols-2 bg-[#0B0D12] p-1 rounded-xl border border-[#232938]">
          <button
            type="button"
            onClick={() => {
              setAuthTab('login');
              setFeedback(null);
            }}
            className={`py-1.5 rounded-lg text-xs font-bold transition-colors ${
              authTab === 'login' ? 'bg-[#181D29] text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Log In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthTab('signup');
              setFeedback(null);
            }}
            className={`py-1.5 rounded-lg text-xs font-bold transition-colors ${
              authTab === 'signup' ? 'bg-[#181D29] text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign Up
          </button>
        </div>

        {initialNotice && (
          <div className="p-3 rounded-lg border bg-[#E5C07B]/15 border-[#E5C07B]/50 text-[#E5C07B] text-xs font-medium">
            {initialNotice}
          </div>
        )}

        {feedback && (
          <div
            className={`p-3 rounded-lg border text-xs font-medium ${
              feedback.type === 'error'
                ? 'bg-[#3B181E]/60 border-[#E06C75] text-[#E06C75]'
                : 'bg-[#143323]/60 border-[#68B388] text-[#68B388]'
            }`}
          >
            {feedback.text}
          </div>
        )}

        <form onSubmit={authTab === 'login' ? handleLogIn : handleSignUp} className="flex flex-col gap-3">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-[#0B0D12] border border-[#232938] focus:border-[#818CF8] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full bg-[#0B0D12] border border-[#232938] focus:border-[#818CF8] rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-1 w-full py-2.5 rounded-lg bg-[#4F46E5] hover:bg-[#6366F1] text-white shadow-sm shadow-[#4F46E5]/25 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>
              {loading
                ? 'Please wait...'
                : authTab === 'login'
                ? 'Log In'
                : 'Sign Up'}
            </span>
          </button>
        </form>
      </div>
    </div>
  );
}
