import {
  createInitialChapterRuntime,
  createInitialMultiStationState,
  evaluateChapterUnlockStatus,
  syncSharedProfileWithStations,
  type MultiStationGameState,
} from './chapters';
import { createInitialOperationsState } from './stationOperations';
import { createInitialSimState } from './rules';
import { syncTrainSimulationUnlockedTracks } from './trainManager';
import type {
  AudioSettings,
  CameraMode,
  ChapterId,
  StationOperationsState,
  StationSimState,
  TrackId,
  TrainSimulationState,
  WeatherMode,
} from './types';

export const SAVE_STORAGE_KEY = 'rsm_bd_shift_save_v1';
export const SAVE_V2_STORAGE_KEY = 'rsm_bd_shift_save_v2';

export interface SavedStationShift {
  version: 1;
  savedAt: number;
  simState: StationSimState;
  trainState: TrainSimulationState;
  cameraMode: CameraMode;
  weather: WeatherMode;
  audioSettings: AudioSettings;
}

export interface SavedMultiStationShift {
  version: 2;
  savedAt: number;
  multiState: MultiStationGameState;
  cameraMode: CameraMode;
  weather: WeatherMode;
  audioSettings: AudioSettings;
}

export interface SavedShiftSummary {
  savedAt: number;
  chapterId?: ChapterId;
  chapter2Unlocked?: boolean;
  dayNumber: number;
  stationLevel: number;
  unlockedTracks: number;
  money: number;
  dispatchesCompleted: number;
  playerLevel: number;
}

const DEFAULT_AUDIO: AudioSettings = {
  master: 0.8,
  music: 0.45,
  environment: 0.65,
  train: 0.7,
  announcements: 0.85,
  muted: false,
};

export function serializeShiftData(payload: SavedStationShift): string {
  return JSON.stringify(payload);
}

export function parseShiftData(raw: string | null | undefined): SavedStationShift | null {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SavedStationShift>;
    if (
      !parsed ||
      parsed.version !== 1 ||
      typeof parsed.savedAt !== 'number' ||
      !parsed.simState ||
      !parsed.trainState ||
      typeof parsed.simState.stationLevel !== 'number' ||
      typeof parsed.simState.unlockedTracks !== 'number' ||
      !Array.isArray(parsed.trainState.trains)
    ) {
      return null;
    }
    return {
      version: 1,
      savedAt: parsed.savedAt,
      simState: parsed.simState,
      trainState: parsed.trainState,
      cameraMode: parsed.cameraMode === 'first-person' ? 'first-person' : 'third-person',
      weather: parsed.weather === 'rain' ? 'rain' : 'clear',
      audioSettings: parsed.audioSettings ?? { ...DEFAULT_AUDIO },
    };
  } catch {
    return null;
  }
}

export function serializeMultiShiftData(payload: SavedMultiStationShift): string {
  return JSON.stringify(payload);
}

function hydrateChapterSim(rawSim: StationSimState, chapterId: ChapterId): StationSimState {
  const base = createInitialSimState(chapterId);
  const maxT = chapterId === 2 ? 8 : 6;
  const minT = chapterId === 2 ? 7 : 2;
  const unlockedTracks = Math.max(minT, Math.min(maxT, rawSim.unlockedTracks ?? minT));
  const trackSignals = {
    ...base.trackSignals,
    ...(rawSim.trackSignals ?? {}),
  };
  return {
    ...base,
    ...rawSim,
    chapterId,
    unlockedTracks,
    trackSignals,
    track1Signal: trackSignals[1] ?? rawSim.track1Signal ?? 'red',
    track2Signal: trackSignals[2] ?? rawSim.track2Signal ?? 'red',
  };
}

export function parseMultiShiftData(raw: string | null | undefined): SavedMultiStationShift | null {
  if (!raw || typeof raw !== 'string') return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SavedMultiStationShift>;
    if (
      !parsed ||
      parsed.version !== 2 ||
      typeof parsed.savedAt !== 'number' ||
      !parsed.multiState ||
      !parsed.multiState.chapter1 ||
      !parsed.multiState.chapter2 ||
      !parsed.multiState.chapter1.simState ||
      !parsed.multiState.chapter1.trainState ||
      !parsed.multiState.chapter2.simState ||
      !parsed.multiState.chapter2.trainState
    ) {
      return null;
    }

    const defaults = createInitialMultiStationState();
    const rawM = parsed.multiState;
    const ch1Sim = hydrateChapterSim(rawM.chapter1.simState, 1);
    const ch2Sim = hydrateChapterSim(rawM.chapter2.simState, 2);

    const ch1Train = syncTrainSimulationUnlockedTracks(
      rawM.chapter1.trainState,
      ch1Sim.unlockedTracks,
      ch1Sim.gameMinutes,
    );
    const ch2Train = syncTrainSimulationUnlockedTracks(
      rawM.chapter2.trainState,
      ch2Sim.unlockedTracks,
      ch2Sim.gameMinutes,
    );

    const hydrateVipProtocol = (
      rawVip: StationOperationsState['vipProtocol'] | null | undefined,
    ): StationOperationsState['vipProtocol'] => {
      if (!rawVip) return null;
      const locked = Array.isArray(rawVip.lockedPlatforms) ? rawVip.lockedPlatforms : [];
      const designated: TrackId[] =
        Array.isArray(rawVip.designatedPlatforms) && rawVip.designatedPlatforms.length > 0
          ? rawVip.designatedPlatforms
          : locked.length > 0
            ? locked
            : ([1] as TrackId[]);
      return {
        ...rawVip,
        designatedPlatforms: designated,
        securedPlatforms: Array.isArray(rawVip.securedPlatforms) ? rawVip.securedPlatforms : locked,
        lockedPlatforms: locked,
        platformDensityTargets: rawVip.platformDensityTargets ?? {},
        securityClearanceVerified: Boolean(rawVip.securityClearanceVerified),
      };
    };

    const baseOps1 = createInitialOperationsState(1);
    const ch1Ops = {
      ...baseOps1,
      ...(rawM.chapter1.opsState ?? {}),
      tasks: rawM.chapter1.opsState?.tasks?.length ? rawM.chapter1.opsState.tasks : baseOps1.tasks,
      staff: rawM.chapter1.opsState?.staff?.length ? rawM.chapter1.opsState.staff : baseOps1.staff,
      facilities: rawM.chapter1.opsState?.facilities?.length
        ? rawM.chapter1.opsState.facilities
        : baseOps1.facilities,
      finance: { ...baseOps1.finance, ...(rawM.chapter1.opsState?.finance ?? {}) },
      vipProtocol: hydrateVipProtocol(rawM.chapter1.opsState?.vipProtocol),
    };

    const baseOps2 = createInitialOperationsState(2);
    const ch2Ops = {
      ...baseOps2,
      ...(rawM.chapter2.opsState ?? {}),
      tasks: rawM.chapter2.opsState?.tasks?.length ? rawM.chapter2.opsState.tasks : baseOps2.tasks,
      staff: rawM.chapter2.opsState?.staff?.length ? rawM.chapter2.opsState.staff : baseOps2.staff,
      facilities: rawM.chapter2.opsState?.facilities?.length
        ? rawM.chapter2.opsState.facilities
        : baseOps2.facilities,
      finance: { ...baseOps2.finance, ...(rawM.chapter2.opsState?.finance ?? {}) },
      vipProtocol: hydrateVipProtocol(rawM.chapter2.opsState?.vipProtocol),
    };

    const unlockEval = evaluateChapterUnlockStatus(ch1Sim, ch1Ops, Boolean(rawM.celebrationDismissed));
    const chapter2Unlocked = Boolean(rawM.chapter2Unlocked || unlockEval.chapter2Unlocked);
    const activeChapterId: ChapterId = rawM.activeChapterId === 2 && chapter2Unlocked ? 2 : 1;
    const ch1Runtime = { chapterId: 1 as const, simState: ch1Sim, trainState: ch1Train, opsState: ch1Ops };
    const ch2Runtime = { chapterId: 2 as const, simState: ch2Sim, trainState: ch2Train, opsState: ch2Ops };
    const activeSim = activeChapterId === 2 ? ch2Sim : ch1Sim;
    const sharedProfile = syncSharedProfileWithStations(
      { ...defaults.sharedProfile, ...(rawM.sharedProfile ?? {}) },
      ch1Runtime,
      ch2Runtime,
      activeSim,
    );

    return {
      version: 2,
      savedAt: parsed.savedAt,
      multiState: {
        activeChapterId,
        chapter1Completed: Boolean(rawM.chapter1Completed || unlockEval.chapter1Completed),
        chapter2Unlocked,
        celebrationDismissed: Boolean(rawM.celebrationDismissed),
        sharedProfile,
        chapter1: ch1Runtime,
        chapter2: ch2Runtime,
      },
      cameraMode: parsed.cameraMode === 'first-person' ? 'first-person' : 'third-person',
      weather: parsed.weather === 'rain' ? 'rain' : 'clear',
      audioSettings: parsed.audioSettings ?? { ...DEFAULT_AUDIO },
    };
  } catch {
    return null;
  }
}

export function migrateV1ToMultiStation(saved: SavedStationShift): SavedMultiStationShift {
  const baseMulti = createInitialMultiStationState();
  const ch1Sim = hydrateChapterSim(saved.simState, 1);
  const ch1Train = syncTrainSimulationUnlockedTracks(
    saved.trainState,
    ch1Sim.unlockedTracks,
    ch1Sim.gameMinutes,
  );
  const ch1Ops = createInitialOperationsState(1);
  const unlockEval = evaluateChapterUnlockStatus(ch1Sim, ch1Ops, false);
  const ch1Runtime = { chapterId: 1 as const, simState: ch1Sim, trainState: ch1Train, opsState: ch1Ops };
  const sharedProfile = syncSharedProfileWithStations(
    baseMulti.sharedProfile,
    ch1Runtime,
    baseMulti.chapter2,
    ch1Sim,
  );
  const ch2Runtime = createInitialChapterRuntime(2, sharedProfile);

  return {
    version: 2,
    savedAt: saved.savedAt,
    multiState: {
      activeChapterId: 1,
      chapter1Completed: unlockEval.chapter1Completed,
      chapter2Unlocked: unlockEval.chapter2Unlocked,
      celebrationDismissed: false,
      sharedProfile,
      chapter1: ch1Runtime,
      chapter2: ch2Runtime,
    },
    cameraMode: saved.cameraMode,
    weather: saved.weather,
    audioSettings: saved.audioSettings,
  };
}

export function saveStationShift(
  payload: Omit<SavedStationShift, 'version' | 'savedAt'>,
  nowMs = Date.now(),
): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const full: SavedStationShift = {
      version: 1,
      savedAt: nowMs,
      ...payload,
    };
    window.localStorage.setItem(SAVE_STORAGE_KEY, serializeShiftData(full));
    return true;
  } catch {
    return false;
  }
}

export function saveMultiStationShift(
  payload: Omit<SavedMultiStationShift, 'version' | 'savedAt'>,
  nowMs = Date.now(),
): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return false;
  try {
    const full: SavedMultiStationShift = {
      version: 2,
      savedAt: nowMs,
      ...payload,
    };
    window.localStorage.setItem(SAVE_V2_STORAGE_KEY, serializeMultiShiftData(full));
    // Also mirror active chapter into v1 key for backwards summary tools
    const activeRuntime =
      payload.multiState.activeChapterId === 2
        ? payload.multiState.chapter2
        : payload.multiState.chapter1;
    saveStationShift(
      {
        simState: activeRuntime.simState,
        trainState: activeRuntime.trainState,
        cameraMode: payload.cameraMode,
        weather: payload.weather,
        audioSettings: payload.audioSettings,
      },
      nowMs,
    );
    return true;
  } catch {
    return false;
  }
}

export function loadStationShift(): SavedStationShift | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    return parseShiftData(window.localStorage.getItem(SAVE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function loadMultiStationShift(): SavedMultiStationShift | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const v2 = parseMultiShiftData(window.localStorage.getItem(SAVE_V2_STORAGE_KEY));
    if (v2) return v2;
    const v1 = loadStationShift();
    return v1 ? migrateV1ToMultiStation(v1) : null;
  } catch {
    return null;
  }
}

export function getSavedShiftSummary(): SavedShiftSummary | null {
  const v2 = loadMultiStationShift();
  if (v2) {
    const m = v2.multiState;
    const active = m.activeChapterId === 2 ? m.chapter2 : m.chapter1;
    return {
      savedAt: v2.savedAt,
      chapterId: m.activeChapterId,
      chapter2Unlocked: m.chapter2Unlocked,
      dayNumber: active.simState.dayNumber ?? 1,
      stationLevel: Math.max(1, active.simState.stationLevel ?? 1),
      unlockedTracks: Math.max(2, Math.min(8, active.simState.unlockedTracks ?? 2)),
      money: active.simState.money ?? 0,
      dispatchesCompleted: m.sharedProfile.totalDispatchesAllStations ?? active.simState.dispatchesCompleted ?? 0,
      playerLevel: m.sharedProfile.level ?? active.simState.level ?? 1,
    };
  }
  const saved = loadStationShift();
  if (!saved) return null;
  return {
    savedAt: saved.savedAt,
    dayNumber: saved.simState.dayNumber ?? 1,
    stationLevel: Math.max(1, saved.simState.stationLevel ?? 1),
    unlockedTracks: Math.max(2, Math.min(8, saved.simState.unlockedTracks ?? 2)),
    money: saved.simState.money ?? 0,
    dispatchesCompleted: saved.simState.dispatchesCompleted ?? 0,
    playerLevel: saved.simState.level ?? 1,
  };
}

export function clearSavedStationShift(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(SAVE_STORAGE_KEY);
    window.localStorage.removeItem(SAVE_V2_STORAGE_KEY);
  } catch {
    // Ignore storage errors in restricted iframes
  }
}

