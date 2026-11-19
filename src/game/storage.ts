import type { AudioSettings, CameraMode, StationSimState, TrainSimulationState, WeatherMode } from './types';

export const SAVE_STORAGE_KEY = 'rsm_bd_shift_save_v1';

export interface SavedStationShift {
  version: 1;
  savedAt: number;
  simState: StationSimState;
  trainState: TrainSimulationState;
  cameraMode: CameraMode;
  weather: WeatherMode;
  audioSettings: AudioSettings;
}

export interface SavedShiftSummary {
  savedAt: number;
  dayNumber: number;
  stationLevel: number;
  unlockedTracks: number;
  money: number;
  dispatchesCompleted: number;
  playerLevel: number;
}

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
      audioSettings: parsed.audioSettings ?? {
        master: 0.8,
        music: 0.45,
        environment: 0.65,
        train: 0.7,
        announcements: 0.85,
        muted: false,
      },
    };
  } catch {
    return null;
  }
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

export function loadStationShift(): SavedStationShift | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    return parseShiftData(window.localStorage.getItem(SAVE_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function getSavedShiftSummary(): SavedShiftSummary | null {
  const saved = loadStationShift();
  if (!saved) return null;
  return {
    savedAt: saved.savedAt,
    dayNumber: saved.simState.dayNumber ?? 1,
    stationLevel: Math.max(1, saved.simState.stationLevel ?? 1),
    unlockedTracks: Math.max(2, Math.min(6, saved.simState.unlockedTracks ?? 2)),
    money: saved.simState.money ?? 0,
    dispatchesCompleted: saved.simState.dispatchesCompleted ?? 0,
    playerLevel: saved.simState.level ?? 1,
  };
}

export function clearSavedStationShift(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.removeItem(SAVE_STORAGE_KEY);
  } catch {
    // Ignore storage errors in restricted iframes
  }
}
