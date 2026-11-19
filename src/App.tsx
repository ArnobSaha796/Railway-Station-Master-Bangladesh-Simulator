import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AudioMixerModal } from './components/AudioMixerModal';
import {
  EmergencyDashboardModal,
  type EmergencyControlCallbacks,
} from './components/EmergencyDashboardModal';
import {
  GameCanvas,
  type NpcDialogueCallbacks,
  type PersistenceActions,
  type PointerLockActions,
  type TouchControlInput,
} from './components/GameCanvas';
import { GameHUD } from './components/GameHUD';
import { MobileControls } from './components/MobileControls';
import { NpcBubblesOverlay } from './components/NpcBubblesOverlay';
import {
  NpcDialogueModal,
  type DialogueOutcomeFeedback,
} from './components/NpcDialogueModal';
import { PauseModal } from './components/PauseModal';
import {
  StationUpgradeModal,
  type StationUpgradeCallbacks,
} from './components/StationUpgradeModal';
import { TitleOverlay } from './components/TitleOverlay';
import {
  TrainDashboardModal,
  type TrainControlCallbacks,
} from './components/TrainDashboardModal';
import { buildStationUpgradeSnapshot } from './game/progression';
import {
  createDefaultAudioSettings,
  createInitialSimState,
  formatGameTime,
  getDayPeriodLabel,
  STATION_NAME_BN,
  STATION_NAME_EN,
} from './game/rules';
import {
  getSavedShiftSummary,
  type SavedShiftSummary,
  type SavedStationShift,
} from './game/storage';
import { createInitialTrainSimulation } from './game/trainManager';
import type {
  ActiveNpcDialogue,
  AudioSettings,
  CameraMode,
  EmergencyDashboardSnapshot,
  GamePhase,
  HudSnapshot,
  NpcFloatingBubble,
  StationUpgradeSnapshot,
  TouchControlsMode,
  TrainDashboardSnapshot,
  WeatherMode,
} from './game/types';

function detectTouchViewport(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(pointer: coarse)').matches ||
    (navigator.maxTouchPoints > 0 && window.innerWidth <= 1024)
  );
}

function createInitialHud(): HudSnapshot {
  const s = createInitialSimState();
  const ts = createInitialTrainSimulation(1);
  const firstTrain = ts.trains[0] ?? null;
  return {
    stationName: STATION_NAME_EN,
    stationNameBn: STATION_NAME_BN,
    dayNumber: ts.dayNumber,
    stationLevel: s.stationLevel,
    unlockedTracks: s.unlockedTracks,
    nextUpgradeReady: false,
    nextUpgradeTrackCount: 3,
    level: s.level,
    xp: s.xp,
    xpToNext: s.xpToNext,
    money: s.money,
    reputation: s.reputation,
    satisfaction: s.satisfaction,
    securityRating: s.securityRating,
    crimesPrevented: s.crimesPrevented,
    emergenciesResolved: s.emergenciesResolved,
    complaints: s.complaints,
    successfulInteractions: s.successfulInteractions,
    unresolvedIncidents: s.unresolvedIncidents,
    activeCrowdCount: 25,
    activeIncident: null,
    activeMissionsCount: 0,
    primaryMission: null,
    availableOfficersCount: 3,
    timeFormatted: formatGameTime(s.gameMinutes),
    dayPeriodLabel: getDayPeriodLabel(s.gameMinutes),
    trackSignals: s.trackSignals,
    trackOccupancies: {
      1: ts.track1Occupancy.occupied,
      2: ts.track2Occupancy.occupied,
      3: false,
      4: false,
      5: false,
      6: false,
    },
    track1Signal: s.track1Signal,
    track2Signal: s.track2Signal,
    track1Occupied: ts.track1Occupancy.occupied,
    track2Occupied: ts.track2Occupancy.occupied,
    switchPosition: ts.switchPosition,
    crossingGateClosed: s.crossingGateClosed,
    activeAlertCount: ts.alerts.length,
    urgentTrainsCount: 1,
    nearbyPrompt: null,
    activeTrainSummary: firstTrain
      ? {
          trainId: firstTrain.id,
          trainNumber: firstTrain.trainNumber,
          name: firstTrain.name,
          nameBn: firstTrain.nameBn,
          destination: firstTrain.destination,
          destinationBn: firstTrain.destinationBn,
          assignedPlatform: firstTrain.assignedPlatform,
          status: firstTrain.status,
          scheduledArrivalStr: formatGameTime(
            firstTrain.scheduledArrivalMin + firstTrain.delayMinutes,
          ),
          scheduledDepartureStr: formatGameTime(
            firstTrain.scheduledDepartureMin + firstTrain.delayMinutes,
          ),
          delayMinutes: firstTrain.delayMinutes,
          currentPassengers: firstTrain.currentPassengers,
          passengerCapacity: firstTrain.passengerCapacity,
          doorState: firstTrain.doorState,
          departureStage: firstTrain.departureStage,
          signalAspect:
            firstTrain.assignedPlatform === 2 ? s.track2Signal : s.track1Signal,
          hasOperationalEvent: Boolean(
            firstTrain.operationalEvent && !firstTrain.operationalEvent.resolved,
          ),
          operationalEventTitle: firstTrain.operationalEvent?.title ?? null,
        }
      : null,
    lastEventMessage: s.lastEventMessage,
    dispatchesCompleted: s.dispatchesCompleted,
  };
}

function createInitialDashboard(): TrainDashboardSnapshot {
  const s = createInitialSimState();
  const ts = createInitialTrainSimulation(1);
  return {
    dayNumber: ts.dayNumber,
    timeFormatted: formatGameTime(s.gameMinutes),
    gameMinutes: s.gameMinutes,
    stationLevel: s.stationLevel,
    unlockedTracks: s.unlockedTracks,
    trackSignals: s.trackSignals,
    track1Signal: s.track1Signal,
    track2Signal: s.track2Signal,
    crossingGateClosed: s.crossingGateClosed,
    switchPosition: ts.switchPosition,
    trackOccupancies: ts.trackOccupancies,
    track1Occupancy: ts.track1Occupancy,
    track2Occupancy: ts.track2Occupancy,
    trains: ts.trains,
    alerts: ts.alerts,
  };
}

function createInitialUpgradeSnapshot(): StationUpgradeSnapshot {
  return buildStationUpgradeSnapshot(createInitialSimState());
}

function createInitialEmergencySnapshot(): EmergencyDashboardSnapshot {
  const s = createInitialSimState();
  return {
    securityRating: s.securityRating,
    crimesPrevented: s.crimesPrevented,
    emergenciesResolved: s.emergenciesResolved,
    emergenciesFailed: s.emergenciesFailed,
    activeMissions: [],
    recentResolvedMissions: [],
    officers: [],
    achievements: s.achievements,
  };
}

const NOOP_UPGRADE_ACTIONS: StationUpgradeCallbacks = {
  purchaseUpgrade: () => {},
};

const NOOP_ACTIONS: TrainControlCallbacks = {
  assignPlatform: () => {},
  setSignal: () => {},
  toggleSwitch: () => {},
  toggleCrossingGate: () => {},
  toggleEmergencyStop: () => {},
  authorizeDeparture: () => {},
  advanceDepartureSequence: () => {},
  resolveOperationalEvent: () => {},
  announceTrain: () => {},
  announceSafety: () => {},
};

const NOOP_EMERGENCY_ACTIONS: EmergencyControlCallbacks = {
  dispatchOfficer: () => {},
  requestPatrolSweep: () => {},
  broadcastEmergencyPa: () => {},
};

const NOOP_POINTER_LOCK: PointerLockActions = {
  lock: () => {},
  unlock: () => {},
};

const NOOP_NPC_DIALOGUE: NpcDialogueCallbacks = {
  selectChoice: () => null,
};

const NOOP_PERSISTENCE: PersistenceActions = {
  saveShift: () => false,
  loadSavedShift: () => false,
};

export default function App() {
  const autostart = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return new URLSearchParams(window.location.search).get('autostart') === '1';
  }, []);

  const [phase, setPhase] = useState<GamePhase>(autostart ? 'playing' : 'title');
  const [cameraMode, setCameraMode] = useState<CameraMode>('third-person');
  const [weather, setWeather] = useState<WeatherMode>('clear');
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(createDefaultAudioSettings);
  const [savedShiftSummary, setSavedShiftSummary] = useState<SavedShiftSummary | null>(() =>
    getSavedShiftSummary(),
  );
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [audioMixerOpen, setAudioMixerOpen] = useState(false);
  const [trainDashboardOpen, setTrainDashboardOpen] = useState(false);
  const [upgradeDashboardOpen, setUpgradeDashboardOpen] = useState(false);
  const [emergencyDashboardOpen, setEmergencyDashboardOpen] = useState(false);
  const [activeNpcDialogue, setActiveNpcDialogue] = useState<ActiveNpcDialogue | null>(null);
  const [dialogueOutcome, setDialogueOutcome] = useState<DialogueOutcomeFeedback | null>(null);
  const [npcBubbles, setNpcBubbles] = useState<NpcFloatingBubble[]>([]);
  const [pointerLocked, setPointerLocked] = useState(false);
  const [announcementBanner, setAnnouncementBanner] = useState<string | null>(null);

  const [resetSignal, setResetSignal] = useState(0);
  const [interactTriggerSignal, setInteractTriggerSignal] = useState(0);
  const [announceSignal, setAnnounceSignal] = useState(0);
  const [timeCycleSignal, setTimeCycleSignal] = useState(0);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [hud, setHud] = useState<HudSnapshot>(createInitialHud);
  const [dashboardSnapshot, setDashboardSnapshot] =
    useState<TrainDashboardSnapshot>(createInitialDashboard);
  const [upgradeSnapshot, setUpgradeSnapshot] =
    useState<StationUpgradeSnapshot>(createInitialUpgradeSnapshot);
  const [emergencySnapshot, setEmergencySnapshot] =
    useState<EmergencyDashboardSnapshot>(createInitialEmergencySnapshot);

  const [touchMode, setTouchMode] = useState<TouchControlsMode>('auto');
  const [autoTouchDetected, setAutoTouchDetected] = useState<boolean>(detectTouchViewport);

  const touchInputRef = useRef<TouchControlInput>({
    moveX: 0,
    moveY: 0,
    cameraDeltaX: 0,
    cameraDeltaY: 0,
    jumpRequested: false,
    interactRequested: false,
    sprintActive: false,
  });

  const trainActionsRef = useRef<TrainControlCallbacks>(NOOP_ACTIONS);
  const upgradeActionsRef = useRef<StationUpgradeCallbacks>(NOOP_UPGRADE_ACTIONS);
  const emergencyActionsRef = useRef<EmergencyControlCallbacks>(NOOP_EMERGENCY_ACTIONS);
  const npcDialogueActionsRef = useRef<NpcDialogueCallbacks>(NOOP_NPC_DIALOGUE);
  const pointerLockActionsRef = useRef<PointerLockActions>(NOOP_POINTER_LOCK);
  const persistenceActionsRef = useRef<PersistenceActions>(NOOP_PERSISTENCE);
  const bannerTimeoutRef = useRef<number | null>(null);
  const saveFeedbackTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    document.body.dataset.state = phase;
  }, [phase]);

  useEffect(() => {
    const updateTouchDetect = () => {
      setAutoTouchDetected(detectTouchViewport());
      if (window.innerWidth < 640) {
        pointerLockActionsRef.current.unlock();
      }
    };
    window.addEventListener('resize', updateTouchDetect);
    return () => window.removeEventListener('resize', updateTouchDetect);
  }, []);

  useEffect(() => {
    return () => {
      if (bannerTimeoutRef.current !== null) {
        window.clearTimeout(bannerTimeoutRef.current);
      }
      if (saveFeedbackTimeoutRef.current !== null) {
        window.clearTimeout(saveFeedbackTimeoutRef.current);
      }
    };
  }, []);

  const refreshSavedShiftSummary = useCallback(() => {
    setSavedShiftSummary(getSavedShiftSummary());
  }, []);

  const handleRestoreEnvironment = useCallback((saved: SavedStationShift) => {
    setCameraMode(saved.cameraMode);
    setWeather(saved.weather);
    setAudioSettings(saved.audioSettings);
  }, []);

  const isTouchModeActive =
    touchMode === 'on' ? true : touchMode === 'off' ? false : autoTouchDetected;

  useEffect(() => {
    if (isTouchModeActive || window.innerWidth < 640) {
      pointerLockActionsRef.current.unlock();
    }
  }, [isTouchModeActive]);

  const handleAnnouncement = useCallback((text: string) => {
    setAnnouncementBanner(text);
    if (bannerTimeoutRef.current !== null) {
      window.clearTimeout(bannerTimeoutRef.current);
    }
    bannerTimeoutRef.current = window.setTimeout(() => {
      setAnnouncementBanner(null);
    }, 8500);
  }, []);

  const blurActiveButton = useCallback(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  }, []);

  const lockDesktopPointerNow = useCallback(() => {
    if (!isTouchModeActive && !detectTouchViewport() && window.innerWidth >= 640) {
      pointerLockActionsRef.current.lock();
    }
  }, [isTouchModeActive]);

  const unlockPointerNow = useCallback(() => {
    pointerLockActionsRef.current.unlock();
  }, []);

  const startGame = useCallback(() => {
    blurActiveButton();
    document.body.dataset.state = 'playing';
    setPhase('playing');
    lockDesktopPointerNow();
  }, [blurActiveButton, lockDesktopPointerNow]);

  const handleContinueSavedShift = useCallback(() => {
    if (persistenceActionsRef.current.loadSavedShift()) {
      startGame();
    }
  }, [startGame]);

  const resumeGame = useCallback(() => {
    blurActiveButton();
    setSaveFeedback(null);
    setAudioMixerOpen(false);
    setTrainDashboardOpen(false);
    setUpgradeDashboardOpen(false);
    setEmergencyDashboardOpen(false);
    setActiveNpcDialogue(null);
    setDialogueOutcome(null);
    document.body.dataset.state = 'playing';
    setPhase('playing');
    lockDesktopPointerNow();
  }, [blurActiveButton, lockDesktopPointerNow]);

  const pauseGame = useCallback(() => {
    unlockPointerNow();
    setSaveFeedback(null);
    setTrainDashboardOpen(false);
    setUpgradeDashboardOpen(false);
    setEmergencyDashboardOpen(false);
    setActiveNpcDialogue(null);
    setDialogueOutcome(null);
    document.body.dataset.state = 'paused';
    setPhase('paused');
  }, [unlockPointerNow]);

  const handleSaveShiftFromPause = useCallback(() => {
    const ok = persistenceActionsRef.current.saveShift();
    refreshSavedShiftSummary();
    setSaveFeedback(ok ? 'Shift saved to browser storage.' : 'Unable to save shift.');
    if (saveFeedbackTimeoutRef.current !== null) {
      window.clearTimeout(saveFeedbackTimeoutRef.current);
    }
    saveFeedbackTimeoutRef.current = window.setTimeout(() => {
      setSaveFeedback(null);
    }, 3200);
  }, [refreshSavedShiftSummary]);

  const handleLoadShiftFromPause = useCallback(() => {
    if (persistenceActionsRef.current.loadSavedShift()) {
      resumeGame();
    }
  }, [resumeGame]);

  const handleRestart = useCallback(() => {
    blurActiveButton();
    setSaveFeedback(null);
    setResetSignal((n) => n + 1);
    setAudioMixerOpen(false);
    setTrainDashboardOpen(false);
    setUpgradeDashboardOpen(false);
    setEmergencyDashboardOpen(false);
    setActiveNpcDialogue(null);
    setDialogueOutcome(null);
    document.body.dataset.state = 'playing';
    setPhase('playing');
    lockDesktopPointerNow();
  }, [blurActiveButton, lockDesktopPointerNow]);

  const openTrainDashboard = useCallback(() => {
    unlockPointerNow();
    setAudioMixerOpen(false);
    setUpgradeDashboardOpen(false);
    setEmergencyDashboardOpen(false);
    document.body.dataset.state = 'playing';
    setPhase('playing');
    setTrainDashboardOpen(true);
  }, [unlockPointerNow]);

  const closeTrainDashboard = useCallback(
    (restorePointerLock = true) => {
      blurActiveButton();
      setTrainDashboardOpen(false);
      if (restorePointerLock && phase === 'playing') {
        lockDesktopPointerNow();
      }
    },
    [blurActiveButton, phase, lockDesktopPointerNow],
  );

  const openUpgradeDashboard = useCallback(() => {
    unlockPointerNow();
    setAudioMixerOpen(false);
    setTrainDashboardOpen(false);
    setEmergencyDashboardOpen(false);
    setActiveNpcDialogue(null);
    document.body.dataset.state = 'playing';
    setPhase('playing');
    setUpgradeDashboardOpen(true);
  }, [unlockPointerNow]);

  const closeUpgradeDashboard = useCallback(
    (restorePointerLock = true) => {
      blurActiveButton();
      setUpgradeDashboardOpen(false);
      if (restorePointerLock && phase === 'playing') {
        lockDesktopPointerNow();
      }
    },
    [blurActiveButton, phase, lockDesktopPointerNow],
  );

  const openEmergencyDashboard = useCallback(() => {
    unlockPointerNow();
    setAudioMixerOpen(false);
    setTrainDashboardOpen(false);
    setUpgradeDashboardOpen(false);
    setActiveNpcDialogue(null);
    document.body.dataset.state = 'playing';
    setPhase('playing');
    setEmergencyDashboardOpen(true);
  }, [unlockPointerNow]);

  const closeEmergencyDashboard = useCallback(
    (restorePointerLock = true) => {
      blurActiveButton();
      setEmergencyDashboardOpen(false);
      if (restorePointerLock && phase === 'playing') {
        lockDesktopPointerNow();
      }
    },
    [blurActiveButton, phase, lockDesktopPointerNow],
  );

  const openNpcDialogue = useCallback(
    (dialogue: ActiveNpcDialogue) => {
      unlockPointerNow();
      setAudioMixerOpen(false);
      setTrainDashboardOpen(false);
      setUpgradeDashboardOpen(false);
      setEmergencyDashboardOpen(false);
      setDialogueOutcome(null);
      setActiveNpcDialogue(dialogue);
    },
    [unlockPointerNow],
  );

  const closeNpcDialogue = useCallback(
    (restorePointerLock = true) => {
      blurActiveButton();
      setActiveNpcDialogue(null);
      setDialogueOutcome(null);
      if (restorePointerLock && phase === 'playing') {
        lockDesktopPointerNow();
      }
    },
    [blurActiveButton, phase, lockDesktopPointerNow],
  );

  const openAudioMixer = useCallback(() => {
    unlockPointerNow();
    setTrainDashboardOpen(false);
    setUpgradeDashboardOpen(false);
    setEmergencyDashboardOpen(false);
    setActiveNpcDialogue(null);
    setAudioMixerOpen(true);
  }, [unlockPointerNow]);

  const closeAudioMixer = useCallback(
    (restorePointerLock = true) => {
      blurActiveButton();
      setAudioMixerOpen(false);
      if (restorePointerLock && phase === 'playing') {
        lockDesktopPointerNow();
      }
    },
    [blurActiveButton, phase, lockDesktopPointerNow],
  );

  // Global keyboard shortcuts: Title Start, Pause (P/Escape), Train Control (T), Security Center (G), Camera (V), Mute (M), Dialogue (1-4/Enter)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (phase === 'title') {
        if (e.code === 'Enter' || e.code === 'Space') {
          e.preventDefault();
          startGame();
        }
        return;
      }

      if (activeNpcDialogue && phase === 'playing') {
        if (e.code === 'Escape') {
          e.preventDefault();
          closeNpcDialogue(false);
          return;
        }
        if (e.code === 'Enter' && dialogueOutcome) {
          e.preventDefault();
          closeNpcDialogue(true);
          return;
        }
        if (!dialogueOutcome) {
          const digitMatch = /^Digit([1-4])$/.exec(e.code);
          if (digitMatch) {
            const idx = Number(digitMatch[1]) - 1;
            const chosen = activeNpcDialogue.choices[idx];
            if (chosen) {
              e.preventDefault();
              const res = npcDialogueActionsRef.current.selectChoice(activeNpcDialogue.npcId, chosen);
              if (res) setDialogueOutcome(res);
            }
            return;
          }
        }
        return;
      }

      if (e.code === 'KeyT' && phase === 'playing' && !audioMixerOpen) {
        e.preventDefault();
        if (trainDashboardOpen) {
          closeTrainDashboard(true);
        } else {
          openTrainDashboard();
        }
        return;
      }

      if (e.code === 'KeyU' && phase === 'playing' && !audioMixerOpen) {
        e.preventDefault();
        if (upgradeDashboardOpen) {
          closeUpgradeDashboard(true);
        } else {
          openUpgradeDashboard();
        }
        return;
      }

      if (e.code === 'KeyG' && phase === 'playing' && !audioMixerOpen) {
        e.preventDefault();
        if (emergencyDashboardOpen) {
          closeEmergencyDashboard(true);
        } else {
          openEmergencyDashboard();
        }
        return;
      }

      if (e.code === 'KeyP' || e.code === 'Escape') {
        e.preventDefault();
        if (audioMixerOpen) {
          closeAudioMixer(e.code === 'KeyP');
          return;
        }
        if (trainDashboardOpen) {
          closeTrainDashboard(e.code === 'KeyP');
          return;
        }
        if (upgradeDashboardOpen) {
          closeUpgradeDashboard(e.code === 'KeyP');
          return;
        }
        if (emergencyDashboardOpen) {
          closeEmergencyDashboard(e.code === 'KeyP');
          return;
        }
        if (phase === 'playing') {
          pauseGame();
        } else {
          resumeGame();
        }
      } else if (
        e.code === 'KeyV' &&
        phase === 'playing' &&
        !audioMixerOpen &&
        !trainDashboardOpen &&
        !upgradeDashboardOpen &&
        !emergencyDashboardOpen
      ) {
        setCameraMode((prev) => (prev === 'third-person' ? 'first-person' : 'third-person'));
      } else if (
        e.code === 'KeyL' &&
        phase === 'playing' &&
        !audioMixerOpen &&
        !trainDashboardOpen &&
        !upgradeDashboardOpen &&
        !emergencyDashboardOpen
      ) {
        setTimeCycleSignal((n) => n + 1);
      } else if (e.code === 'KeyM') {
        setAudioSettings((prev) => ({ ...prev, muted: !prev.muted }));
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    phase,
    audioMixerOpen,
    trainDashboardOpen,
    upgradeDashboardOpen,
    emergencyDashboardOpen,
    activeNpcDialogue,
    dialogueOutcome,
    startGame,
    pauseGame,
    resumeGame,
    openTrainDashboard,
    closeTrainDashboard,
    openUpgradeDashboard,
    closeUpgradeDashboard,
    openEmergencyDashboard,
    closeEmergencyDashboard,
    closeNpcDialogue,
    closeAudioMixer,
  ]);

  const anyModalOpen =
    trainDashboardOpen ||
    upgradeDashboardOpen ||
    emergencyDashboardOpen ||
    audioMixerOpen ||
    Boolean(activeNpcDialogue);

  return (
    <main className="relative w-full h-full overflow-hidden bg-[#162820]">
      {webglError ? (
        <div className="flex items-center justify-center w-full h-full p-6 text-center text-[#fbf4e2]">
          <div className="max-w-md rounded-xl border border-[#e8b84b]/40 bg-[#143022] p-6">
            <h1 className="font-display text-xl font-bold">3D Graphics Unavailable</h1>
            <p className="mt-2 text-sm text-[#dfd5bc]">{webglError}</p>
          </div>
        </div>
      ) : (
        <GameCanvas
          phase={phase}
          cameraMode={cameraMode}
          weather={weather}
          audioSettings={audioSettings}
          dashboardOpen={trainDashboardOpen}
          upgradeDashboardOpen={upgradeDashboardOpen}
          emergencyDashboardOpen={emergencyDashboardOpen}
          modalOpen={anyModalOpen}
          resetSignal={resetSignal}
          interactTriggerSignal={interactTriggerSignal}
          announceSignal={announceSignal}
          timeCycleSignal={timeCycleSignal}
          touchInputRef={touchInputRef}
          trainActionsRef={trainActionsRef}
          upgradeActionsRef={upgradeActionsRef}
          emergencyActionsRef={emergencyActionsRef}
          npcDialogueActionsRef={npcDialogueActionsRef}
          pointerLockActionsRef={pointerLockActionsRef}
          persistenceActionsRef={persistenceActionsRef}
          onHudUpdate={setHud}
          onDashboardUpdate={setDashboardSnapshot}
          onUpgradeUpdate={setUpgradeSnapshot}
          onEmergencyUpdate={setEmergencySnapshot}
          onOpenTrainDashboard={openTrainDashboard}
          onOpenUpgradeDashboard={openUpgradeDashboard}
          onOpenNpcDialogue={openNpcDialogue}
          onBubblesUpdate={setNpcBubbles}
          onAnnouncement={handleAnnouncement}
          onPointerLockChange={setPointerLocked}
          onRestoreEnvironment={handleRestoreEnvironment}
          onSavedShiftChange={refreshSavedShiftSummary}
          onEscUnlock={() => {
            if (
              !audioMixerOpen &&
              !trainDashboardOpen &&
              !upgradeDashboardOpen &&
              !emergencyDashboardOpen &&
              !activeNpcDialogue &&
              phase === 'playing'
            ) {
              pauseGame();
            }
          }}
          onWebglError={setWebglError}
        />
      )}

      {phase === 'title' && (
        <TitleOverlay
          savedShift={savedShiftSummary}
          onStart={startGame}
          onContinueSaved={handleContinueSavedShift}
        />
      )}

      {phase === 'playing' && (
        <>
          {!anyModalOpen && <NpcBubblesOverlay bubbles={npcBubbles} />}

          <GameHUD
            hud={hud}
            muted={audioSettings.muted}
            cameraMode={cameraMode}
            weather={weather}
            pointerLocked={pointerLocked}
            announcementBanner={announcementBanner}
            isTouchMode={isTouchModeActive}
            onToggleMute={() => setAudioSettings((prev) => ({ ...prev, muted: !prev.muted }))}
            onToggleCameraMode={() =>
              setCameraMode((prev) => (prev === 'third-person' ? 'first-person' : 'third-person'))
            }
            onToggleWeather={() => setWeather((prev) => (prev === 'clear' ? 'rain' : 'clear'))}
            onCycleTimeOfDay={() => setTimeCycleSignal((n) => n + 1)}
            onOpenAudioMixer={openAudioMixer}
            onOpenTrainDashboard={openTrainDashboard}
            onOpenUpgradeDashboard={openUpgradeDashboard}
            onOpenEmergencyDashboard={openEmergencyDashboard}
            onPause={pauseGame}
            onInteractClick={() => setInteractTriggerSignal((n) => n + 1)}
          />

          {isTouchModeActive && !anyModalOpen && (
            <MobileControls
              touchInputRef={touchInputRef}
              hasNearbyInteraction={Boolean(hud.nearbyPrompt)}
              nearbyActionLabel={hud.nearbyPrompt?.actionLabel}
            />
          )}
        </>
      )}

      {activeNpcDialogue && (
        <NpcDialogueModal
          dialogue={activeNpcDialogue}
          outcome={dialogueOutcome}
          onSelectChoice={(choice) => {
            const res = npcDialogueActionsRef.current.selectChoice(activeNpcDialogue.npcId, choice);
            if (res) setDialogueOutcome(res);
          }}
          onClose={() => closeNpcDialogue(true)}
        />
      )}

      {trainDashboardOpen && (
        <TrainDashboardModal
          snapshot={dashboardSnapshot}
          actions={trainActionsRef.current}
          onClose={() => closeTrainDashboard(true)}
        />
      )}

      {upgradeDashboardOpen && (
        <StationUpgradeModal
          snapshot={upgradeSnapshot}
          actions={upgradeActionsRef.current}
          onClose={() => closeUpgradeDashboard(true)}
        />
      )}

      {emergencyDashboardOpen && (
        <EmergencyDashboardModal
          snapshot={emergencySnapshot}
          actions={emergencyActionsRef.current}
          onClose={() => closeEmergencyDashboard(true)}
        />
      )}

      {phase === 'paused' && !anyModalOpen && (
        <PauseModal
          stationName={`${hud.stationName} (${hud.stationNameBn})`}
          level={hud.level}
          money={hud.money}
          reputation={hud.reputation}
          cameraMode={cameraMode}
          weather={weather}
          touchMode={touchMode}
          hasSavedShift={Boolean(savedShiftSummary)}
          saveFeedback={saveFeedback}
          onChangeCameraMode={setCameraMode}
          onChangeWeather={setWeather}
          onCycleTimeOfDay={() => setTimeCycleSignal((n) => n + 1)}
          onChangeTouchMode={setTouchMode}
          onOpenAudioMixer={openAudioMixer}
          onOpenTrainDashboard={openTrainDashboard}
          onOpenUpgradeDashboard={openUpgradeDashboard}
          onOpenEmergencyDashboard={openEmergencyDashboard}
          onSaveShift={handleSaveShiftFromPause}
          onLoadSavedShift={handleLoadShiftFromPause}
          onResume={resumeGame}
          onRestart={handleRestart}
          onExitToTitle={() => {
            unlockPointerNow();
            refreshSavedShiftSummary();
            setResetSignal((n) => n + 1);
            setAudioMixerOpen(false);
            setTrainDashboardOpen(false);
            setUpgradeDashboardOpen(false);
            setEmergencyDashboardOpen(false);
            document.body.dataset.state = 'title';
            setPhase('title');
          }}
        />
      )}

      {audioMixerOpen && (
        <AudioMixerModal
          settings={audioSettings}
          weather={weather}
          onChangeSettings={setAudioSettings}
          onChangeWeather={setWeather}
          onTriggerAnnouncement={() => setAnnounceSignal((n) => n + 1)}
          onClose={() => closeAudioMixer(true)}
        />
      )}
    </main>
  );
}
