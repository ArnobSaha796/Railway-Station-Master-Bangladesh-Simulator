import { createDefaultAchievements } from './securityMissions';
import type {
  AudioSettings,
  ChapterId,
  InteractableKind,
  SignalAspect,
  StationSimState,
  TrackId,
  WeatherMode,
} from './types';

export const STATION_NAME_EN = 'Shaplapur Junction';
export const STATION_NAME_BN = 'শাপলাপুর জংশন';
export const CHAPTER2_STATION_NAME_EN = 'Padma Central Terminal';
export const CHAPTER2_STATION_NAME_BN = 'পদ্মা সেন্ট্রাল টার্মিনাল';

export const BENGALI_ANNOUNCEMENTS: readonly string[] = [
  'সম্মানিত যাত্রীবৃন্দ, ২ নম্বর প্ল্যাটফর্মে আন্তঃনগর ট্রেন প্রবেশ করছে।',
  'ঢাকাগামী ট্রেনটি নির্ধারিত সময়ের চেয়ে ১৫ মিনিট বিলম্বে স্টেশনে পৌঁছাবে।',
  'যাত্রীদের নিরাপত্তার স্বার্থে হলুদ লাইন অতিক্রম করবেন না।',
  'শাপলাপুর জংশনে স্বাগতম। ১ নম্বর প্ল্যাটফর্মে সুবর্ণ আন্তঃনগর এক্সপ্রেস যাত্রার জন্য প্রস্তুত।',
];

export function createDefaultAudioSettings(): AudioSettings {
  return {
    master: 0.8,
    music: 0.45,
    environment: 0.65,
    train: 0.7,
    announcements: 0.85,
    muted: false,
  };
}

export function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function xpThresholdForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return 100 + (safeLevel - 1) * 75;
}

export function nextSignalAspect(current: SignalAspect): SignalAspect {
  if (current === 'red') return 'yellow';
  if (current === 'yellow') return 'green';
  return 'red';
}

export function createInitialSimState(chapterId: ChapterId = 1): StationSimState {
  const isCh2 = chapterId === 2;
  return {
    chapterId,
    level: isCh2 ? 4 : 1,
    xp: 0,
    xpToNext: xpThresholdForLevel(isCh2 ? 4 : 1),
    money: isCh2 ? 3200 : 1000,
    reputation: isCh2 ? 82 : 78,
    satisfaction: isCh2 ? 85 : 84,
    securityRating: isCh2 ? 88 : 86,
    complaints: 0,
    successfulInteractions: 0,
    unresolvedIncidents: 0,
    crimesPrevented: 0,
    emergenciesResolved: 0,
    emergenciesFailed: 0,
    achievements: createDefaultAchievements(),
    gameMinutes: 7 * 60 + 15, // 07:15 AM — bright morning golden light
    dayNumber: 1,
    stationLevel: 1,
    unlockedTracks: isCh2 ? 7 : 2,
    completedUpgradeLevels: [1],
    track1Signal: 'red',
    track2Signal: 'red',
    trackSignals: {
      1: 'red',
      2: 'red',
      3: 'red',
      4: 'red',
      5: 'red',
      6: 'red',
      7: 'red',
      8: 'red',
    },
    crossingGateClosed: false,
    inspectedTrains: {},
    dispatchesCompleted: 0,
    onTimeDispatches: 0,
    signalsRepaired: 0,
    lastEventMessage: isCh2
      ? 'Welcome to Padma Central Terminal (Chapter 2 · 7-Track Hub)! Press [O] Operations Hub, [T] Trains, [C] Stations.'
      : 'Welcome to Shaplapur Junction. Press [T] Train Control, [U] Station Upgrades, [G] Security Center, or walk platforms.',
    lastEventTimestamp: 0,
  };
}

export function applyXpAndRewards(
  state: StationSimState,
  deltas: { moneyDelta?: number; xpDelta?: number; repDelta?: number; message: string },
  nowMs: number,
): StationSimState {
  let xp = state.xp + (deltas.xpDelta ?? 0);
  let level = state.level;
  let xpToNext = state.xpToNext;

  while (xp >= xpToNext) {
    xp -= xpToNext;
    level += 1;
    xpToNext = xpThresholdForLevel(level);
  }

  const money = Math.max(0, state.money + (deltas.moneyDelta ?? 0));
  const reputation = Math.max(0, Math.min(100, Math.round(state.reputation + (deltas.repDelta ?? 0))));

  return {
    ...state,
    level,
    xp,
    xpToNext,
    money,
    reputation,
    lastEventMessage: deltas.message,
    lastEventTimestamp: nowMs,
  };
}

export const GAME_MINUTES_PER_REAL_SECOND = 6;

export function advanceGameClock(currentMinutes: number, dtSeconds: number): number {
  const safeDt = Math.max(0, dtSeconds);
  return (((currentMinutes + safeDt * GAME_MINUTES_PER_REAL_SECOND) % 1440) + 1440) % 1440;
}

export interface AutoWeatherState {
  mode: WeatherMode;
  timerSeconds: number;
  nextChangeSeconds: number;
  cycleIndex: number;
}

const CLEAR_DURATIONS_SEC = [45, 65, 55, 75] as const;
const RAIN_DURATIONS_SEC = [35, 45, 30, 40] as const;

export function createInitialAutoWeatherState(initialMode: WeatherMode = 'clear'): AutoWeatherState {
  return {
    mode: initialMode,
    timerSeconds: 0,
    nextChangeSeconds: initialMode === 'rain' ? RAIN_DURATIONS_SEC[0] : CLEAR_DURATIONS_SEC[0],
    cycleIndex: 0,
  };
}

export function stepAutoWeather(
  state: AutoWeatherState,
  dtSeconds: number,
  dayNumber = 1,
): { state: AutoWeatherState; changed: boolean; message: string | null } {
  const safeDt = Math.max(0, dtSeconds);
  const nextTimer = state.timerSeconds + safeDt;
  if (nextTimer < state.nextChangeSeconds) {
    return {
      state: {
        ...state,
        timerSeconds: nextTimer,
      },
      changed: false,
      message: null,
    };
  }

  const nextCycle = state.cycleIndex + 1;
  const nextMode: WeatherMode = state.mode === 'clear' ? 'rain' : 'clear';
  const durationList = nextMode === 'rain' ? RAIN_DURATIONS_SEC : CLEAR_DURATIONS_SEC;
  const duration = durationList[(nextCycle + Math.max(0, dayNumber - 1)) % durationList.length];

  return {
    state: {
      mode: nextMode,
      timerSeconds: 0,
      nextChangeSeconds: duration,
      cycleIndex: nextCycle,
    },
    changed: true,
    message:
      nextMode === 'rain'
        ? 'Monsoon showers rolling across Shaplapur Junction.'
        : 'Monsoon clouds clearing; skies brightening over the station.',
  };
}

export function formatGameTime(totalMinutes: number): string {
  const wrapped = ((Math.floor(totalMinutes) % 1440) + 1440) % 1440;
  const hours24 = Math.floor(wrapped / 60);
  const mins = wrapped % 60;
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  const hh = String(hours12).padStart(2, '0');
  const mm = String(mins).padStart(2, '0');
  return `${hh}:${mm} ${period}`;
}

export function getDayPeriodLabel(totalMinutes: number): string {
  const wrapped = ((Math.floor(totalMinutes) % 1440) + 1440) % 1440;
  const hour = wrapped / 60;
  if (hour >= 5 && hour < 8) return 'Dawn';
  if (hour >= 8 && hour < 12) return 'Morning';
  if (hour >= 12 && hour < 16.5) return 'Afternoon';
  if (hour >= 16.5 && hour < 19) return 'Golden Dusk';
  if (hour >= 19 && hour < 21) return 'Evening';
  return 'Night';
}

export interface InteractionResult {
  nextState: StationSimState;
  sound: 'coin' | 'signal' | 'bell' | 'horn' | 'gate';
  leveledUp: boolean;
  openDashboard?: boolean;
  openUpgradeDashboard?: boolean;
  openOperationsDashboard?: boolean;
}

export function getTrackSignal(state: StationSimState, trackId: TrackId): SignalAspect {
  if (state.trackSignals && state.trackSignals[trackId]) {
    return state.trackSignals[trackId];
  }
  return trackId === 1 ? state.track1Signal : trackId === 2 ? state.track2Signal : 'red';
}

export function withTrackSignal(
  state: StationSimState,
  trackId: TrackId,
  aspect: SignalAspect,
): StationSimState {
  const nextSignals: Record<TrackId, SignalAspect> = {
    ...(state.trackSignals ?? {
      1: state.track1Signal,
      2: state.track2Signal,
      3: 'red',
      4: 'red',
      5: 'red',
      6: 'red',
      7: 'red',
      8: 'red',
    }),
    [trackId]: aspect,
  };
  return {
    ...state,
    trackSignals: nextSignals,
    track1Signal: trackId === 1 ? aspect : state.track1Signal,
    track2Signal: trackId === 2 ? aspect : state.track2Signal,
  };
}

export function performStationInteraction(
  state: StationSimState,
  target: InteractableKind,
  nowMs: number,
  activeTrainLabel?: string,
): InteractionResult {
  const prevLevel = state.level;
  let nextState = state;
  let sound: InteractionResult['sound'] = 'coin';
  let openDashboard = false;
  let openUpgradeDashboard = false;
  let openOperationsDashboard = false;

  switch (target) {
    case 'signal_track1':
    case 'signal_track2':
    case 'signal_track3':
    case 'signal_track4':
    case 'signal_track5':
    case 'signal_track6':
    case 'signal_track7':
    case 'signal_track8': {
      const trackNum = Number(target.slice(-1)) as TrackId;
      const nextSignal = nextSignalAspect(getTrackSignal(state, trackNum));
      const updated = withTrackSignal(state, trackNum, nextSignal);
      const label =
        nextSignal === 'green'
          ? 'GREEN (Clear — Full Speed)'
          : nextSignal === 'yellow'
            ? 'YELLOW (Caution — Reduced Speed)'
            : 'RED (Stop / Hold)';
      nextState = applyXpAndRewards(
        updated,
        {
          xpDelta: 15,
          moneyDelta: 0,
          repDelta: 1,
          message: `Track ${trackNum} Signal set to ${label}.`,
        },
        nowMs,
      );
      sound = 'signal';
      break;
    }
    case 'crossing_gate': {
      const nextClosed = !state.crossingGateClosed;
      const updated = { ...state, crossingGateClosed: nextClosed };
      nextState = applyXpAndRewards(
        updated,
        {
          xpDelta: 15,
          repDelta: nextClosed ? 2 : 0,
          message: nextClosed
            ? 'Level crossing barriers LOWERED. City avenue traffic safely halted.'
            : 'Level crossing barriers RAISED. Metropolitan crossing open.',
        },
        nowMs,
      );
      sound = 'gate';
      break;
    }
    case 'tea_stall': {
      nextState = applyXpAndRewards(
        state,
        {
          moneyDelta: 45,
          xpDelta: 20,
          repDelta: 2,
          message: "Collected 45 coins in stall rent from Mama's Cha & Singara Stall.",
        },
        nowMs,
      );
      sound = 'coin';
      break;
    }
    case 'jhalmuri_stall': {
      nextState = applyXpAndRewards(
        state,
        {
          moneyDelta: 35,
          xpDelta: 20,
          repDelta: 1,
          message: 'Collected 35 coins from Platform 2 Jhalmuri & Drinks Kiosk.',
        },
        nowMs,
      );
      sound = 'coin';
      break;
    }
    case 'platform_train_1':
    case 'platform_train_2':
    case 'platform_train_3':
    case 'platform_train_4':
    case 'platform_train_5':
    case 'platform_train_6':
    case 'platform_train_7':
    case 'platform_train_8': {
      const platNum = Number(target.slice(-1));
      const trainLabel = activeTrainLabel || `Platform ${platNum} Train`;
      const inspectKey = `${target}_${trainLabel}`;
      const alreadyInspected = Boolean(state.inspectedTrains[inspectKey]);
      const moneyGain = alreadyInspected ? 25 : 80;
      const xpGain = alreadyInspected ? 15 : 35;
      const repGain = alreadyInspected ? 1 : 3;
      const updated: StationSimState = {
        ...state,
        inspectedTrains: { ...state.inspectedTrains, [inspectKey]: true },
      };
      nextState = applyXpAndRewards(
        updated,
        {
          moneyDelta: moneyGain,
          xpDelta: xpGain,
          repDelta: repGain,
          message: alreadyInspected
            ? `Checked passenger tickets on ${trainLabel} (+${moneyGain} coins).`
            : `Completed safety & ticket inspection on ${trainLabel} (+${moneyGain} coins, +${xpGain} XP)!`,
        },
        nowMs,
      );
      sound = 'horn';
      break;
    }
    case 'dispatch_desk': {
      openDashboard = true;
      nextState = applyXpAndRewards(
        state,
        {
          xpDelta: 5,
          message: 'Opened Station Master Train Control Dashboard.',
        },
        nowMs,
      );
      sound = 'bell';
      break;
    }
    case 'upgrade_desk': {
      openUpgradeDashboard = true;
      nextState = applyXpAndRewards(
        state,
        {
          xpDelta: 5,
          message: 'Opened Station Expansion & Infrastructure Center.',
        },
        nowMs,
      );
      sound = 'bell';
      break;
    }
    case 'operations_desk': {
      openOperationsDashboard = true;
      nextState = applyXpAndRewards(
        state,
        {
          xpDelta: 5,
          message: 'Opened Station Operations, Staff & Facilities Hub.',
        },
        nowMs,
      );
      sound = 'bell';
      break;
    }
  }

  return {
    nextState,
    sound,
    leveledUp: nextState.level > prevLevel,
    openDashboard,
    openUpgradeDashboard,
    openOperationsDashboard,
  };
}
