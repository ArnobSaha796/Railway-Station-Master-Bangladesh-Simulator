import { createDefaultAchievements } from './securityMissions';
import type { AudioSettings, InteractableKind, SignalAspect, StationSimState } from './types';

export const STATION_NAME_EN = 'Shaplapur Junction';
export const STATION_NAME_BN = 'শাপলাপুর জংশন';

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

export function createInitialSimState(): StationSimState {
  return {
    level: 1,
    xp: 0,
    xpToNext: xpThresholdForLevel(1),
    money: 1000,
    reputation: 78,
    satisfaction: 84,
    securityRating: 86,
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
    unlockedTracks: 2,
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
    },
    crossingGateClosed: false,
    inspectedTrains: {},
    dispatchesCompleted: 0,
    lastEventMessage:
      'Welcome to Shaplapur Junction. Press [T] Train Control, [U] Station Upgrades, [G] Security Center, or walk platforms.',
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
  return 'Evening';
}

export interface InteractionResult {
  nextState: StationSimState;
  sound: 'coin' | 'signal' | 'bell' | 'horn' | 'gate';
  leveledUp: boolean;
  openDashboard?: boolean;
  openUpgradeDashboard?: boolean;
}

export function getTrackSignal(state: StationSimState, trackId: 1 | 2 | 3 | 4 | 5 | 6): SignalAspect {
  if (state.trackSignals && state.trackSignals[trackId]) {
    return state.trackSignals[trackId];
  }
  return trackId === 1 ? state.track1Signal : trackId === 2 ? state.track2Signal : 'red';
}

export function withTrackSignal(
  state: StationSimState,
  trackId: 1 | 2 | 3 | 4 | 5 | 6,
  aspect: SignalAspect,
): StationSimState {
  const nextSignals = {
    ...(state.trackSignals ?? {
      1: state.track1Signal,
      2: state.track2Signal,
      3: 'red',
      4: 'red',
      5: 'red',
      6: 'red',
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

  switch (target) {
    case 'signal_track1':
    case 'signal_track2':
    case 'signal_track3':
    case 'signal_track4':
    case 'signal_track5':
    case 'signal_track6': {
      const trackNum = Number(target.slice(-1)) as 1 | 2 | 3 | 4 | 5 | 6;
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
    case 'platform_train_6': {
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
  }

  return {
    nextState,
    sound,
    leveledUp: nextState.level > prevLevel,
    openDashboard,
    openUpgradeDashboard,
  };
}
