import {
  advanceGameClock,
  CHAPTER2_STATION_NAME_BN,
  CHAPTER2_STATION_NAME_EN,
  createInitialSimState,
  STATION_NAME_BN,
  STATION_NAME_EN,
  xpThresholdForLevel,
} from './rules';
import { createDefaultAchievements } from './securityMissions';
import {
  computeFinancePreview,
  createInitialOperationsState,
  recordFinanceIncome,
  recordTaskMetric,
  stepStationOperations,
} from './stationOperations';
import {
  assignTrainPlatform,
  authorizeTrainDeparture,
  createInitialTrainSimulation,
  setTrackSignalAspect,
  stepTrainSimulation,
} from './trainManager';
import type {
  ChapterId,
  ChapterUnlockRequirement,
  ChapterUnlockStatus,
  SharedPlayerProfile,
  StationCardSummary,
  StationOperationsState,
  StationSimState,
  TrackId,
  TrainSimulationState,
} from './types';

export interface ChapterConfig {
  chapterId: ChapterId;
  title: string;
  stationName: string;
  stationNameBn: string;
  initialTracks: number;
  maxTracks: number;
  subtitle: string;
}

export const CHAPTER_CONFIGS: Record<ChapterId, ChapterConfig> = {
  1: {
    chapterId: 1,
    title: 'Chapter 1 · Regional to Grand Central',
    stationName: STATION_NAME_EN,
    stationNameBn: STATION_NAME_BN,
    initialTracks: 2,
    maxTracks: 6,
    subtitle: 'Expand Shaplapur Junction from 2 to 6 tracks & unlock national terminal ops.',
  },
  2: {
    chapterId: 2,
    title: 'Chapter 2 · Padma Central Megahub',
    stationName: CHAPTER2_STATION_NAME_EN,
    stationNameBn: CHAPTER2_STATION_NAME_BN,
    initialTracks: 7,
    maxTracks: 8,
    subtitle: 'Command 7–8 high-speed & cross-border tracks at Padma Central Terminal.',
  },
};

export interface ChapterRuntimeState {
  chapterId: ChapterId;
  simState: StationSimState;
  trainState: TrainSimulationState;
  opsState: StationOperationsState;
}

export interface MultiStationGameState {
  activeChapterId: ChapterId;
  chapter1Completed: boolean;
  chapter2Unlocked: boolean;
  celebrationDismissed: boolean;
  sharedProfile: SharedPlayerProfile;
  chapter1: ChapterRuntimeState;
  chapter2: ChapterRuntimeState;
}

export function createInitialSharedProfile(): SharedPlayerProfile {
  return {
    playerName: 'Station Master',
    level: 1,
    xp: 0,
    xpToNext: xpThresholdForLevel(1),
    achievements: createDefaultAchievements(),
    unlockedAbilities: [],
    totalDispatchesAllStations: 0,
    totalTasksCompleted: 0,
    totalEmergenciesResolved: 0,
  };
}

export function createInitialChapterRuntime(
  chapterId: ChapterId,
  sharedProfile?: SharedPlayerProfile,
): ChapterRuntimeState {
  const simState = createInitialSimState(chapterId);
  if (sharedProfile) {
    simState.level = Math.max(simState.level, sharedProfile.level);
    simState.xp = sharedProfile.xp;
    simState.xpToNext = sharedProfile.xpToNext;
    simState.achievements = sharedProfile.achievements.map((a) => ({ ...a }));
  }
  const trainState = createInitialTrainSimulation(1, CHAPTER_CONFIGS[chapterId].initialTracks);
  const opsState = createInitialOperationsState(chapterId);
  return {
    chapterId,
    simState,
    trainState,
    opsState,
  };
}

export function createInitialMultiStationState(): MultiStationGameState {
  const sharedProfile = createInitialSharedProfile();
  return {
    activeChapterId: 1,
    chapter1Completed: false,
    chapter2Unlocked: false,
    celebrationDismissed: false,
    sharedProfile,
    chapter1: createInitialChapterRuntime(1, sharedProfile),
    chapter2: createInitialChapterRuntime(2, sharedProfile),
  };
}

export function evaluateChapterUnlockStatus(
  ch1Sim: StationSimState,
  ch1Ops: StationOperationsState,
  celebrationDismissed = false,
): ChapterUnlockStatus {
  const claimedOrDoneTasks = ch1Ops.tasks.filter((t) => t.completed || t.claimed).length;
  const totalMilestones =
    ch1Sim.emergenciesResolved + ch1Sim.crimesPrevented + claimedOrDoneTasks;

  const requirements: ChapterUnlockRequirement[] = [
    {
      id: 'ch1_tracks',
      label: 'Expand Chapter 1 Station to All 6 Tracks',
      current: Math.min(6, ch1Sim.unlockedTracks || 2),
      target: 6,
      unit: ' Tracks',
      met: (ch1Sim.unlockedTracks || 2) >= 6,
    },
    {
      id: 'ch1_level',
      label: 'Reach Station Tier Level 5 (Grand Central)',
      current: ch1Sim.stationLevel || 1,
      target: 5,
      met: (ch1Sim.stationLevel || 1) >= 5,
    },
    {
      id: 'ch1_reputation',
      label: 'Achieve 85% Station Reputation',
      current: ch1Sim.reputation,
      target: 85,
      unit: '%',
      met: ch1Sim.reputation >= 85,
    },
    {
      id: 'ch1_dispatches',
      label: 'Complete 10 Train Dispatches at Shaplapur',
      current: ch1Sim.dispatchesCompleted,
      target: 10,
      met: ch1Sim.dispatchesCompleted >= 10,
    },
    {
      id: 'ch1_milestone',
      label: 'Complete at Least 2 Operations/Security Milestones',
      current: totalMilestones,
      target: 2,
      met: totalMilestones >= 2,
    },
  ];

  const completed = requirements.every((r) => r.met);
  return {
    chapter1Completed: completed,
    chapter2Unlocked: completed,
    celebrationDismissed,
    requirements,
  };
}

export function syncSharedProfileWithStations(
  profile: SharedPlayerProfile,
  ch1: ChapterRuntimeState,
  ch2: ChapterRuntimeState,
  activeSim: StationSimState,
): SharedPlayerProfile {
  const mergedAchievements = profile.achievements.map((a) => {
    const a1 = ch1.simState.achievements.find((x) => x.id === a.id);
    const a2 = ch2.simState.achievements.find((x) => x.id === a.id);
    const unlocked = Boolean(a.unlocked || a1?.unlocked || a2?.unlocked);
    const unlockedDay = a.unlockedDay ?? a1?.unlockedDay ?? a2?.unlockedDay ?? null;
    return { ...a, unlocked, unlockedDay };
  });

  const abilitySet = new Set(profile.unlockedAbilities);
  [...ch1.opsState.tasks, ...ch2.opsState.tasks].forEach((t) => {
    if (t.claimed && t.unlockAbility) abilitySet.add(t.unlockAbility);
  });

  return {
    playerName: profile.playerName,
    level: Math.max(profile.level, activeSim.level),
    xp: activeSim.level >= profile.level ? activeSim.xp : profile.xp,
    xpToNext: activeSim.level >= profile.level ? activeSim.xpToNext : profile.xpToNext,
    achievements: mergedAchievements,
    unlockedAbilities: Array.from(abilitySet),
    totalDispatchesAllStations:
      ch1.simState.dispatchesCompleted + ch2.simState.dispatchesCompleted,
    totalTasksCompleted:
      ch1.opsState.tasks.filter((t) => t.completed).length +
      ch2.opsState.tasks.filter((t) => t.completed).length,
    totalEmergenciesResolved:
      ch1.simState.emergenciesResolved +
      ch2.simState.emergenciesResolved +
      ch1.simState.crimesPrevented +
      ch2.simState.crimesPrevented,
  };
}

/**
 * Simulates the inactive station in the background so trains keep running,
 * staff execute duties, and revenue/expenses continue ticking independently.
 */
export function stepBackgroundStation(
  runtime: ChapterRuntimeState,
  dtSeconds: number,
  nowMs = Date.now(),
): ChapterRuntimeState {
  const safeDt = Math.max(0, Math.min(dtSeconds, 0.5));
  let sim = {
    ...runtime.simState,
    gameMinutes: advanceGameClock(runtime.simState.gameMinutes, safeDt),
  };
  let trainState = runtime.trainState;
  let ops = runtime.opsState;

  // Background auto-dispatcher assists unassigned approaching trains and clears ready platform departures
  const maxTracks = runtime.chapterId === 2 ? 8 : 6;
  const unlocked = Math.max(2, Math.min(maxTracks, sim.unlockedTracks || 2));

  const vipLockedPlatforms: readonly TrackId[] = ops.vipProtocol?.active
    ? ops.vipProtocol.lockedPlatforms
    : [];

  for (const t of trainState.trains) {
    if ((t.status === 'Approaching' || t.status === 'Delayed') && t.assignedPlatform === null) {
      // Find a free platform track
      for (let trackNum = 1; trackNum <= unlocked; trackNum++) {
        const trackId = trackNum as TrackId;
        if (!trainState.trackOccupancies[trackId]?.occupied && !vipLockedPlatforms.includes(trackId)) {
          const assigned = assignTrainPlatform(
            sim,
            trainState,
            t.id,
            trackId,
            nowMs,
            vipLockedPlatforms,
          );
          if (assigned.accepted) {
            sim = assigned.simState;
            trainState = assigned.trainState;
            const sigRes = setTrackSignalAspect(sim, trainState, trackId, 'green', nowMs);
            sim = sigRes.simState;
            trainState = sigRes.trainState;
          }
          break;
        }
      }
    } else if (
      (t.status === 'At Platform' || t.status === 'Boarding') &&
      t.boardingProgress >= 0.92 &&
      t.assignedPlatform
    ) {
      if (t.operationalEvent && !t.operationalEvent.resolved) {
        t.operationalEvent.resolved = true;
        t.doorsObstructed = false;
      }
      if (!sim.crossingGateClosed) {
        sim = { ...sim, crossingGateClosed: true };
      }
      const sigRes = setTrackSignalAspect(sim, trainState, t.assignedPlatform, 'green', nowMs);
      sim = sigRes.simState;
      trainState = sigRes.trainState;
      const dep = authorizeTrainDeparture(sim, trainState, t.id, nowMs);
      if (dep.accepted) {
        sim = dep.simState;
        trainState = dep.trainState;
        ops = recordFinanceIncome(ops, 'ticket', 95);
        ops = recordTaskMetric(ops, 'on_time_dispatches', 1);
      }
    }
  }

  const stepped = stepTrainSimulation(sim, trainState, safeDt, nowMs, vipLockedPlatforms);
  sim = stepped.simState;
  trainState = stepped.trainState;

  const opsStep = stepStationOperations(sim, ops, safeDt, nowMs);
  sim = opsStep.simState;
  ops = opsStep.opsState;

  return {
    chapterId: runtime.chapterId,
    simState: sim,
    trainState,
    opsState: ops,
  };
}

export function buildStationCardSummaries(
  state: MultiStationGameState,
): StationCardSummary[] {
  const buildCard = (
    chapterId: ChapterId,
    runtime: ChapterRuntimeState,
    unlocked: boolean,
  ): StationCardSummary => {
    const cfg = CHAPTER_CONFIGS[chapterId];
    const preview = computeFinancePreview(runtime.opsState, runtime.simState);
    const activeTrainsCount = runtime.trainState.trains.filter(
      (t) => t.status !== 'Scheduled' && t.status !== 'Departed',
    ).length;
    const f = runtime.opsState.finance;
    const dailyIncome =
      f.ticketIncomeToday + f.rentalIncomeToday + f.cargoIncomeToday + preview.projectedPassiveIncome;
    const dailyExpenses =
      preview.dailySalaries +
      preview.dailyElectricity +
      preview.dailyMaintenance +
      f.emergencyRepairSpendToday;

    return {
      chapterId,
      title: cfg.title,
      stationName: cfg.stationName,
      stationNameBn: cfg.stationNameBn,
      unlocked,
      isCurrent: state.activeChapterId === chapterId,
      tracksCount: runtime.simState.unlockedTracks,
      maxTracks: cfg.maxTracks,
      stationLevel: runtime.simState.stationLevel,
      reputation: runtime.simState.reputation,
      satisfaction: runtime.simState.satisfaction,
      money: runtime.simState.money,
      dailyIncome,
      dailyExpenses,
      activeTrainsCount,
      activeEmergenciesCount: runtime.opsState.activeOpsEvents.length,
      statusLabel: !unlocked
        ? 'Locked · Complete Chapter 1'
        : state.activeChapterId === chapterId
          ? 'Active (On Site)'
          : 'Auto-Operating (Background)',
    };
  };

  return [
    buildCard(1, state.chapter1, true),
    buildCard(2, state.chapter2, state.chapter2Unlocked),
  ];
}
