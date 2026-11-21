import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import type { EmergencyControlCallbacks } from './EmergencyDashboardModal';
import type { StationOperationsCallbacks } from './StationOperationsModal';
import type { StationUpgradeCallbacks } from './StationUpgradeModal';
import type { TrainControlCallbacks } from './TrainDashboardModal';
import { SoundEngine } from '../game/audio';
import {
  buildStationCardSummaries,
  CHAPTER_CONFIGS,
  createInitialMultiStationState,
  evaluateChapterUnlockStatus,
  type MultiStationGameState,
  stepBackgroundStation,
  syncSharedProfileWithStations,
} from '../game/chapters';
import { createFirstPersonArms } from '../game/models';
import {
  applyVipPassengerDensityAdjustment,
  broadcastMissionBanglaPa,
  buildEmergencyDashboardSnapshot,
  dispatchOfficerToMission,
  findNearestTalkableNpc,
  interactWithEmergencyHazard,
  openNpcDialogueForAgent,
  requestSecurityPatrolSweep,
  resolveNpcDialogueChoice,
} from '../game/npcManager';
import {
  CHAPTER2_MAX_Z,
  groundHeightAt,
  PLAYER_RADIUS,
  resolveCircleAabbCollisions,
} from '../game/physics';
import {
  buildStationUpgradeSnapshot,
  evaluateStationUpgrade,
  getUpgradeTierSpec,
  purchaseNextStationUpgrade,
} from '../game/progression';
import {
  assignStaffDuty,
  claimTaskReward,
  constructFacility,
  getPrimaryDailyTask,
  hireStaffMember,
  orderClearVipPlatform,
  recordFinanceExpense,
  recordFinanceIncome,
  recordTaskMetric,
  repairFacility,
  replaceAbsentStaff,
  resolveOpsEmergency,
  setStaffShift,
  spawnOpsEmergency,
  stepStationOperations,
  syncVipPlatformOccupancy,
  toggleVipPlatformLock,
  trainStaffMember,
  triggerEmergencyVipSecurity,
  upgradeFacility,
  verifySecurityClearance,
  verifyVipCredential,
} from '../game/stationOperations';
import {
  loadMultiStationShift,
  saveMultiStationShift,
  type SavedMultiStationShift,
} from '../game/storage';
import {
  advanceGameClock,
  type AutoWeatherState,
  createInitialAutoWeatherState,
  formatGameTime,
  getDayPeriodLabel,
  getTrackSignal,
  nextSignalAspect,
  performStationInteraction,
  stepAutoWeather,
} from '../game/rules';
import {
  advanceTrainDepartureSequence,
  assignTrainPlatform,
  authorizeTrainDeparture,
  BANGLA_SAFETY_ANNOUNCEMENTS,
  buildTrainBanglaAnnouncement,
  divertTrainToPlatform,
  injectUnexpectedTrain,
  resolveTrainOperationalEvent,
  setTrackSignalAspect,
  stepTrainSimulation,
  syncTrainSimulationUnlockedTracks,
  toggleEmergencyStopTrain,
  toggleSwitchPosition,
  triggerSimultaneousPeakArrivals,
} from '../game/trainManager';
import type {
  ActiveNpcDialogue,
  AudioSettings,
  CameraMode,
  ChapterId,
  EmergencyDashboardSnapshot,
  FacilityId,
  GamePhase,
  HudSnapshot,
  InteractablePoint,
  NpcDialogueChoice,
  NpcFloatingBubble,
  PlayerState,
  SignalAspect,
  StaffDuty,
  StaffRole,
  StaffShift,
  StationOperationsSnapshot,
  StationOperationsState,
  StationSimState,
  StationUpgradeSnapshot,
  TrackId,
  TrainDashboardSnapshot,
  TrainSimulationState,
  WeatherMode,
} from '../game/types';
import { buildStationWorld, type StationWorldHandle } from '../game/world';
import type { DialogueOutcomeFeedback } from './NpcDialogueModal';

export interface TouchControlInput {
  moveX: number; // -1..1 (right positive)
  moveY: number; // -1..1 (up/forward positive)
  cameraDeltaX: number;
  cameraDeltaY: number;
  jumpRequested: boolean;
  interactRequested: boolean;
  sprintActive: boolean;
}

export interface PointerLockActions {
  lock: () => void;
  unlock: () => void;
}

export interface NpcDialogueCallbacks {
  selectChoice: (npcId: string, choice: NpcDialogueChoice) => DialogueOutcomeFeedback | null;
}

export interface PersistenceActions {
  saveShift: () => boolean;
  loadSavedShift: () => boolean;
}

export interface ChapterSwitchActions {
  selectChapter: (chapterId: ChapterId) => void;
  dismissCelebration: () => void;
}

interface GameCanvasProps {
  phase: GamePhase;
  cameraMode: CameraMode;
  weather: WeatherMode;
  audioSettings: AudioSettings;
  dashboardOpen: boolean;
  upgradeDashboardOpen: boolean;
  emergencyDashboardOpen: boolean;
  operationsModalOpen: boolean;
  stationSelectorOpen: boolean;
  modalOpen: boolean;
  resetSignal: number;
  interactTriggerSignal: number;
  announceSignal: number;
  touchInputRef: React.MutableRefObject<TouchControlInput>;
  trainActionsRef: React.MutableRefObject<TrainControlCallbacks>;
  upgradeActionsRef: React.MutableRefObject<StationUpgradeCallbacks>;
  emergencyActionsRef: React.MutableRefObject<EmergencyControlCallbacks>;
  opsActionsRef: React.MutableRefObject<StationOperationsCallbacks>;
  chapterActionsRef: React.MutableRefObject<ChapterSwitchActions>;
  npcDialogueActionsRef: React.MutableRefObject<NpcDialogueCallbacks>;
  pointerLockActionsRef: React.MutableRefObject<PointerLockActions>;
  persistenceActionsRef: React.MutableRefObject<PersistenceActions>;
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onDashboardUpdate: (snapshot: TrainDashboardSnapshot) => void;
  onUpgradeUpdate: (snapshot: StationUpgradeSnapshot) => void;
  onEmergencyUpdate: (snapshot: EmergencyDashboardSnapshot) => void;
  onOperationsUpdate: (snapshot: StationOperationsSnapshot) => void;
  onOpenTrainDashboard: () => void;
  onOpenUpgradeDashboard: () => void;
  onOpenOperationsModal: () => void;
  onOpenNpcDialogue: (dialogue: ActiveNpcDialogue) => void;
  onBubblesUpdate: (bubbles: NpcFloatingBubble[]) => void;
  onAnnouncement: (text: string) => void;
  onWeatherChange: (weather: WeatherMode) => void;
  onPointerLockChange: (locked: boolean) => void;
  onEscUnlock: () => void;
  onWebglError: (msg: string) => void;
  onRestoreEnvironment?: (saved: SavedMultiStationShift) => void;
  onSavedShiftChange?: () => void;
}

// Module-scope reusable vectors (zero GC inside animation loop)
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _moveVec = new THREE.Vector3();
const _camTarget = new THREE.Vector3();
const _camDesired = new THREE.Vector3();
const _lookPoint = new THREE.Vector3();

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) ?? '');
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return true;
  }
}

function tryRequestPointerLock(canvas: HTMLCanvasElement | null) {
  if (!canvas || typeof canvas.requestPointerLock !== 'function') return;
  try {
    const maybePromise = canvas.requestPointerLock() as unknown;
    if (maybePromise && typeof (maybePromise as Promise<void>).catch === 'function') {
      (maybePromise as Promise<void>).catch(() => {});
    }
  } catch {
    // Ignore pointer lock rejection in unsupported/headless environments
  }
}

export function GameCanvas({
  phase,
  cameraMode,
  weather,
  audioSettings,
  dashboardOpen,
  upgradeDashboardOpen,
  emergencyDashboardOpen,
  operationsModalOpen,
  stationSelectorOpen,
  modalOpen,
  resetSignal,
  interactTriggerSignal,
  announceSignal,
  touchInputRef,
  trainActionsRef,
  upgradeActionsRef,
  emergencyActionsRef,
  opsActionsRef,
  chapterActionsRef,
  npcDialogueActionsRef,
  pointerLockActionsRef,
  persistenceActionsRef,
  onHudUpdate,
  onDashboardUpdate,
  onUpgradeUpdate,
  onEmergencyUpdate,
  onOperationsUpdate,
  onOpenTrainDashboard,
  onOpenUpgradeDashboard,
  onOpenOperationsModal,
  onOpenNpcDialogue,
  onBubblesUpdate,
  onAnnouncement,
  onWeatherChange,
  onPointerLockChange,
  onEscUnlock,
  onWebglError,
  onRestoreEnvironment,
  onSavedShiftChange,
}: GameCanvasProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const canvasElRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef<GamePhase>(phase);
  const cameraModeRef = useRef<CameraMode>(cameraMode);
  const weatherRef = useRef<WeatherMode>(weather);
  const autoWeatherRef = useRef<AutoWeatherState>(createInitialAutoWeatherState(weather));
  const audioSettingsRef = useRef<AudioSettings>(audioSettings);
  const dashboardOpenRef = useRef<boolean>(dashboardOpen);
  const upgradeDashboardOpenRef = useRef<boolean>(upgradeDashboardOpen);
  const emergencyDashboardOpenRef = useRef<boolean>(emergencyDashboardOpen);
  const operationsModalOpenRef = useRef<boolean>(operationsModalOpen);
  const stationSelectorOpenRef = useRef<boolean>(stationSelectorOpen);
  const modalOpenRef = useRef<boolean>(modalOpen);
  const intentionalUnlockRef = useRef<boolean>(false);
  const clearInputsRef = useRef<() => void>(() => {});
  const onHudUpdateRef = useRef(onHudUpdate);
  const onDashboardUpdateRef = useRef(onDashboardUpdate);
  const onUpgradeUpdateRef = useRef(onUpgradeUpdate);
  const onEmergencyUpdateRef = useRef(onEmergencyUpdate);
  const onOperationsUpdateRef = useRef(onOperationsUpdate);
  const onOpenTrainDashboardRef = useRef(onOpenTrainDashboard);
  const onOpenUpgradeDashboardRef = useRef(onOpenUpgradeDashboard);
  const onOpenOperationsModalRef = useRef(onOpenOperationsModal);
  const onOpenNpcDialogueRef = useRef(onOpenNpcDialogue);
  const onBubblesUpdateRef = useRef(onBubblesUpdate);
  const onAnnouncementRef = useRef(onAnnouncement);
  const onWeatherChangeRef = useRef(onWeatherChange);
  const onPointerLockChangeRef = useRef(onPointerLockChange);
  const onEscUnlockRef = useRef(onEscUnlock);
  const onWebglErrorRef = useRef(onWebglError);
  const onRestoreEnvironmentRef = useRef(onRestoreEnvironment);
  const onSavedShiftChangeRef = useRef(onSavedShiftChange);
  const soundRef = useRef<SoundEngine | null>(null);

  // Sync critical flags synchronously during render so pointerlockchange never sees stale values
  phaseRef.current = phase;
  dashboardOpenRef.current = dashboardOpen;
  upgradeDashboardOpenRef.current = upgradeDashboardOpen;
  emergencyDashboardOpenRef.current = emergencyDashboardOpen;
  operationsModalOpenRef.current = operationsModalOpen;
  stationSelectorOpenRef.current = stationSelectorOpen;
  modalOpenRef.current = modalOpen;

  const multiStateRef = useRef<MultiStationGameState>(createInitialMultiStationState());
  const simStateRef = useRef<StationSimState>(multiStateRef.current.chapter1.simState);
  const trainStateRef = useRef<TrainSimulationState>(multiStateRef.current.chapter1.trainState);
  const opsStateRef = useRef<StationOperationsState>(multiStateRef.current.chapter1.opsState);
  const triggerResetRef = useRef<() => void>(() => {});
  const triggerInteractRef = useRef<() => void>(() => {});
  const pushDashboardRef = useRef<(force?: boolean) => void>(() => {});
  const pushUpgradeRef = useRef<(force?: boolean) => void>(() => {});
  const pushEmergencyRef = useRef<(force?: boolean) => void>(() => {});
  const pushOperationsRef = useRef<(force?: boolean) => void>(() => {});

  useEffect(() => {
    soundRef.current?.setActive(phase === 'playing');
    if (phase !== 'playing' && document.pointerLockElement && document.pointerLockElement === canvasElRef.current) {
      intentionalUnlockRef.current = true;
      try {
        document.exitPointerLock();
      } catch {
        // Ignore
      }
    }
    if (phase !== 'playing') {
      clearInputsRef.current();
    }
  }, [phase]);

  useEffect(() => {
    if (modalOpen) {
      clearInputsRef.current();
      if (document.pointerLockElement && document.pointerLockElement === canvasElRef.current) {
        intentionalUnlockRef.current = true;
        try {
          document.exitPointerLock();
        } catch {
          // Ignore
        }
      }
    }
    if (dashboardOpen) {
      pushDashboardRef.current(true);
      pushOperationsRef.current(true);
    }
    if (upgradeDashboardOpen) {
      pushUpgradeRef.current(true);
    }
    if (emergencyDashboardOpen) {
      pushEmergencyRef.current(true);
    }
    if (operationsModalOpen || stationSelectorOpen) {
      pushOperationsRef.current(true);
    }
  }, [
    modalOpen,
    dashboardOpen,
    upgradeDashboardOpen,
    emergencyDashboardOpen,
    operationsModalOpen,
    stationSelectorOpen,
  ]);

  useEffect(() => {
    cameraModeRef.current = cameraMode;
  }, [cameraMode]);

  useEffect(() => {
    weatherRef.current = weather;
    soundRef.current?.setWeather(weather);
  }, [weather]);

  useEffect(() => {
    soundRef.current?.updateSettings(audioSettings);
    audioSettingsRef.current = audioSettings;
  }, [audioSettings]);

  useEffect(() => {
    onRestoreEnvironmentRef.current = onRestoreEnvironment;
  }, [onRestoreEnvironment]);

  useEffect(() => {
    onSavedShiftChangeRef.current = onSavedShiftChange;
  }, [onSavedShiftChange]);

  useEffect(() => {
    onHudUpdateRef.current = onHudUpdate;
  }, [onHudUpdate]);

  useEffect(() => {
    onDashboardUpdateRef.current = onDashboardUpdate;
  }, [onDashboardUpdate]);

  useEffect(() => {
    onUpgradeUpdateRef.current = onUpgradeUpdate;
  }, [onUpgradeUpdate]);

  useEffect(() => {
    onEmergencyUpdateRef.current = onEmergencyUpdate;
  }, [onEmergencyUpdate]);

  useEffect(() => {
    onOperationsUpdateRef.current = onOperationsUpdate;
  }, [onOperationsUpdate]);

  useEffect(() => {
    onOpenTrainDashboardRef.current = onOpenTrainDashboard;
  }, [onOpenTrainDashboard]);

  useEffect(() => {
    onOpenUpgradeDashboardRef.current = onOpenUpgradeDashboard;
  }, [onOpenUpgradeDashboard]);

  useEffect(() => {
    onOpenOperationsModalRef.current = onOpenOperationsModal;
  }, [onOpenOperationsModal]);

  useEffect(() => {
    onOpenNpcDialogueRef.current = onOpenNpcDialogue;
  }, [onOpenNpcDialogue]);

  useEffect(() => {
    onBubblesUpdateRef.current = onBubblesUpdate;
  }, [onBubblesUpdate]);

  useEffect(() => {
    onAnnouncementRef.current = onAnnouncement;
  }, [onAnnouncement]);

  useEffect(() => {
    onWeatherChangeRef.current = onWeatherChange;
  }, [onWeatherChange]);

  useEffect(() => {
    onPointerLockChangeRef.current = onPointerLockChange;
  }, [onPointerLockChange]);

  useEffect(() => {
    onEscUnlockRef.current = onEscUnlock;
  }, [onEscUnlock]);

  useEffect(() => {
    onWebglErrorRef.current = onWebglError;
  }, [onWebglError]);

  useEffect(() => {
    if (resetSignal > 0) {
      triggerResetRef.current();
    }
  }, [resetSignal]);

  useEffect(() => {
    if (interactTriggerSignal > 0) {
      triggerInteractRef.current();
    }
  }, [interactTriggerSignal]);

  useEffect(() => {
    if (announceSignal > 0) {
      soundRef.current?.playNextBengaliAnnouncement();
    }
  }, [announceSignal]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const isLikelyMobile =
      typeof window !== 'undefined' &&
      (window.matchMedia('(pointer: coarse)').matches || window.innerWidth <= 1024);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl && !isLikelyMobile,
        powerPreference: 'high-performance',
        preserveDrawingBuffer: true,
      });
    } catch {
      onWebglErrorRef.current('WebGL is not available in this browser context.');
      return;
    }

    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(
      isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, isLikelyMobile ? 1.5 : 2),
    );
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    renderer.setSize(width, height);
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.setAttribute('data-testid', 'station-canvas');
    container.innerHTML = '';
    container.appendChild(renderer.domElement);
    canvasElRef.current = renderer.domElement;

    pointerLockActionsRef.current = {
      lock: () => {
        intentionalUnlockRef.current = false;
        tryRequestPointerLock(canvasElRef.current);
      },
      unlock: () => {
        if (document.pointerLockElement === canvasElRef.current) {
          intentionalUnlockRef.current = true;
          try {
            document.exitPointerLock();
          } catch {
            // Ignore
          }
        }
      },
    };

    const sound = new SoundEngine();
    sound.updateSettings(audioSettings);
    sound.setWeather(weatherRef.current);
    sound.setOnAnnouncement((text) => {
      onAnnouncementRef.current(text);
    });
    sound.setActive(phaseRef.current === 'playing');
    soundRef.current = sound;

    const maxAnisotropy = isSoftwareGl ? 1 : Math.min(4, renderer.capabilities.getMaxAnisotropy());
    let currentWorldChapterId: ChapterId = multiStateRef.current.activeChapterId;
    let world: StationWorldHandle = buildStationWorld(
      maxAnisotropy,
      isSoftwareGl,
      currentWorldChapterId,
    );

    let envTex: THREE.Texture | null = null;
    if (!isSoftwareGl) {
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
      world.scene.environment = envTex;
      pmremGenerator.dispose();
    }

    const camera = new THREE.PerspectiveCamera(58, width / height, 0.12, 260);
    world.scene.add(camera);

    const fpArms = createFirstPersonArms();
    fpArms.group.visible = false;
    camera.add(fpArms.group);

    const rebuildWorldForChapter = (targetChapterId: ChapterId) => {
      if (targetChapterId === currentWorldChapterId) return;
      world.scene.remove(camera);
      world.dispose();
      currentWorldChapterId = targetChapterId;
      world = buildStationWorld(maxAnisotropy, isSoftwareGl, targetChapterId);
      if (envTex) {
        world.scene.environment = envTex;
      }
      world.scene.add(camera);
      if (!isSoftwareGl) {
        renderer.compile(world.scene, camera);
      }
    };

    const player: PlayerState = {
      x: -2,
      y: groundHeightAt(-2, -7.2),
      z: -7.2,
      vy: 0,
      yaw: Math.PI * 0.5,
      grounded: true,
      distanceWalked: 0,
      speed: 0,
      sprinting: false,
    };

    let camYaw = -Math.PI * 0.42;
    let tpPitch = 0.17;
    let fpPitch = -0.02;
    let camDistance = isLikelyMobile ? 6.8 : 5.6;
    let squashScaleY = 1;
    let prevFootCycle = 0;
    let flagSwingTimer = 0;
    let thunderFlashTimer = 0;

    camera.position.set(22, 10.5, 16);
    camera.lookAt(0, 1.8, -4);

    if (!isSoftwareGl) {
      renderer.compile(world.scene, camera);
    }

    const keys = new Set<string>();
    let jumpJustPressed = false;
    let interactJustPressed = false;
    let mouseDragging = false;
    let activePointerId: number | null = null;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let wasPointerLocked = false;

    const findNearestInteractable = (): InteractablePoint | null => {
      let best: InteractablePoint | null = null;
      let bestDistSq = Infinity;
      for (const item of world.interactables) {
        const dx = player.x - item.x;
        const dz = player.z - item.z;
        const dy = Math.abs(player.y - item.y);
        const distSq = dx * dx + dz * dz;
        if (dy < 1.8 && distSq <= item.radius * item.radius && distSq < bestDistSq) {
          bestDistSq = distSq;
          best = item;
        }
      }
      return best;
    };

    const getNearbyInteractionTarget = ():
      | { kind: 'static'; item: InteractablePoint }
      | { kind: 'npc'; npcId: string; title: string; actionLabel: string }
      | null => {
      const staticItem = findNearestInteractable();
      const talkNpc = findNearestTalkableNpc(world.getNpcState(), player.x, player.y, player.z, 2.75);
      if (talkNpc) {
        const npcDist = Math.hypot(talkNpc.x - player.x, talkNpc.z - player.z);
        const staticDist = staticItem
          ? Math.hypot(staticItem.x - player.x, staticItem.z - player.z)
          : Infinity;
        const isPolice = talkNpc.role === 'railway_police' || talkNpc.role === 'bd_police';
        const isMissionActor = Boolean(talkNpc.assignedMissionId && talkNpc.missionRole);
        if (
          isMissionActor ||
          talkNpc.incidentKind ||
          talkNpc.wantsToTalk ||
          isPolice ||
          npcDist < staticDist - 0.15
        ) {
          return {
            kind: 'npc',
            npcId: talkNpc.id,
            title: `${talkNpc.nameBn} · ${talkNpc.name}`,
            actionLabel:
              talkNpc.missionRole === 'suspect'
                ? 'Confront / Detain Suspect [E]'
                : talkNpc.missionRole === 'lost_child'
                  ? 'Rescue & Reunite Child [E]'
                  : talkNpc.missionRole === 'witness'
                    ? 'Question Witness for Clues [E]'
                    : talkNpc.missionRole === 'victim'
                      ? 'Investigate Emergency [E]'
                      : isPolice
                        ? 'Coordinate Police Officer [E]'
                        : talkNpc.incidentKind
                          ? 'Resolve Station Incident [E]'
                          : 'Talk / Answer Question [E]',
          };
        }
      }
      return staticItem ? { kind: 'static', item: staticItem } : null;
    };

    const playOutcomeEffects = (
      soundKind: 'signal' | 'bell' | 'horn' | 'coin' | 'gate' | null,
      announcement: string | null,
    ) => {
      if (soundKind === 'coin') sound.playCoin();
      else if (soundKind === 'signal') sound.playSignalLever();
      else if (soundKind === 'bell') sound.playStationBell();
      else if (soundKind === 'horn') sound.playTrainHorn();
      else if (soundKind === 'gate') sound.playGateBell();

      if (announcement) {
        sound.playBengaliAnnouncement(announcement);
      }
    };

    let lastHudPushTime = 0;
    let lastHudSig = '';
    let lastDashPushTime = 0;
    let lastUpgradePushTime = 0;
    let lastEmergencyPushTime = 0;
    let lastOpsPushTime = 0;
    let lastBubblePushTime = 0;
    let lastBubbleSig = '';

    const syncActiveRuntime = (
      nextSim = simStateRef.current,
      nextTrain = trainStateRef.current,
      nextOps = opsStateRef.current,
    ) => {
      simStateRef.current = nextSim;
      trainStateRef.current = nextTrain;
      opsStateRef.current = nextOps;
      const activeId = multiStateRef.current.activeChapterId;
      if (activeId === 2) {
        multiStateRef.current.chapter2 = {
          chapterId: 2,
          simState: nextSim,
          trainState: nextTrain,
          opsState: nextOps,
        };
      } else {
        multiStateRef.current.chapter1 = {
          chapterId: 1,
          simState: nextSim,
          trainState: nextTrain,
          opsState: nextOps,
        };
      }
      multiStateRef.current.sharedProfile = syncSharedProfileWithStations(
        multiStateRef.current.sharedProfile,
        multiStateRef.current.chapter1,
        multiStateRef.current.chapter2,
        nextSim,
      );
      const unlockEval = evaluateChapterUnlockStatus(
        multiStateRef.current.chapter1.simState,
        multiStateRef.current.chapter1.opsState,
        multiStateRef.current.celebrationDismissed,
      );
      if (unlockEval.chapter2Unlocked && !multiStateRef.current.chapter2Unlocked) {
        multiStateRef.current.chapter1Completed = true;
        multiStateRef.current.chapter2Unlocked = true;
        sound.playAchievementUnlock();
        sound.playBengaliAnnouncement(
          'অভিনন্দন! অধ্যায় ১ সম্পন্ন হয়েছে। পদ্মা সেন্ট্রাল টার্মিনাল এখন আনলক হয়েছে!',
        );
      }
    };

    function pushDashboardSnapshot(force = false) {
      const now = performance.now();
      if (!force && !dashboardOpenRef.current) return;
      if (!force && now - lastDashPushTime < 260) return;
      lastDashPushTime = now;
      const s = simStateRef.current;
      const ts = trainStateRef.current;
      onDashboardUpdateRef.current({
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
        vipLockedPlatforms: opsStateRef.current.vipProtocol?.active
          ? opsStateRef.current.vipProtocol.lockedPlatforms
          : [],
      });
    }
    pushDashboardRef.current = pushDashboardSnapshot;

    function pushUpgradeSnapshot(force = false) {
      const now = performance.now();
      if (!force && !upgradeDashboardOpenRef.current) return;
      if (!force && now - lastUpgradePushTime < 260) return;
      lastUpgradePushTime = now;
      onUpgradeUpdateRef.current(buildStationUpgradeSnapshot(simStateRef.current));
    }
    pushUpgradeRef.current = pushUpgradeSnapshot;

    function pushEmergencySnapshot(force = false) {
      const now = performance.now();
      if (!force && !emergencyDashboardOpenRef.current) return;
      if (!force && now - lastEmergencyPushTime < 240) return;
      lastEmergencyPushTime = now;
      onEmergencyUpdateRef.current(
        buildEmergencyDashboardSnapshot(world.getNpcState(), simStateRef.current),
      );
    }
    pushEmergencyRef.current = pushEmergencySnapshot;

    function pushOperationsSnapshot(force = false) {
      const now = performance.now();
      if (
        !force &&
        !operationsModalOpenRef.current &&
        !stationSelectorOpenRef.current &&
        !dashboardOpenRef.current
      ) {
        return;
      }
      if (!force && now - lastOpsPushTime < 240) return;
      lastOpsPushTime = now;
      syncActiveRuntime();
      const activeId = multiStateRef.current.activeChapterId;
      const cfg = CHAPTER_CONFIGS[activeId];
      const s = simStateRef.current;
      const o = opsStateRef.current;
      const unlockStatus = evaluateChapterUnlockStatus(
        multiStateRef.current.chapter1.simState,
        multiStateRef.current.chapter1.opsState,
        multiStateRef.current.celebrationDismissed,
      );
      if (multiStateRef.current.chapter2Unlocked) {
        unlockStatus.chapter1Completed = true;
        unlockStatus.chapter2Unlocked = true;
      }
      onOperationsUpdateRef.current({
        chapterId: activeId,
        stationName: cfg.stationName,
        money: s.money,
        reputation: s.reputation,
        satisfaction: s.satisfaction,
        tasks: o.tasks,
        activeOpsEvents: o.activeOpsEvents,
        recentResolvedOps: o.recentResolvedOps,
        staff: o.staff,
        facilities: o.facilities,
        finance: o.finance,
        faultedSignalTracks: o.faultedSignalTracks,
        obstructedTracks: o.obstructedTracks,
        powerOutageActive: o.powerOutageActive,
        paSystemFailed: o.paSystemFailed,
        vipProtocol: o.vipProtocol,
        chapterUnlockStatus: unlockStatus,
        stationCards: buildStationCardSummaries(multiStateRef.current),
      });
    }
    pushOperationsRef.current = pushOperationsSnapshot;

    function pushHudSnapshot(force = false) {
      const now = performance.now();
      syncActiveRuntime();
      const activeId = multiStateRef.current.activeChapterId;
      const cfg = CHAPTER_CONFIGS[activeId];
      const s = simStateRef.current;
      const ts = trainStateRef.current;
      const o = opsStateRef.current;
      const npcSt = world.getNpcState();
      const nearby = getNearbyInteractionTarget();
      const prompt = nearby
        ? nearby.kind === 'npc'
          ? { id: 'npc_talk' as const, title: nearby.title, actionLabel: nearby.actionLabel }
          : {
              id: nearby.item.id,
              title: nearby.item.title,
              actionLabel: nearby.item.actionLabel,
              missionId: nearby.item.missionId,
              trainId: nearby.item.trainId,
            }
        : null;
      const timeStr = formatGameTime(s.gameMinutes);
      const urgentCount = ts.trains.filter(
        (t) =>
          ((t.status === 'Approaching' || t.status === 'Delayed') &&
            t.assignedPlatform === null &&
            Math.abs(t.x) <= 98) ||
          ((t.status === 'At Platform' || t.status === 'Boarding') && t.boardingProgress >= 0.9) ||
          Boolean(t.operationalEvent && !t.operationalEvent.resolved),
      ).length;

      const priorityTrain =
        ts.trains.find((t) => t.status === 'Boarding' || t.status === 'At Platform') ??
        ts.trains.find((t) => t.status === 'Departing') ??
        ts.trains.find((t) => t.status === 'Arriving' || t.status === 'Approaching') ??
        ts.trains.find((t) => t.status !== 'Departed') ??
        null;

      const activeTrainSummary = priorityTrain
        ? {
            trainId: priorityTrain.id,
            trainNumber: priorityTrain.trainNumber,
            name: priorityTrain.name,
            nameBn: priorityTrain.nameBn,
            destination: priorityTrain.destination,
            destinationBn: priorityTrain.destinationBn,
            assignedPlatform: priorityTrain.assignedPlatform,
            status: priorityTrain.status,
            scheduledArrivalStr: formatGameTime(
              priorityTrain.scheduledArrivalMin + priorityTrain.delayMinutes,
            ),
            scheduledDepartureStr: formatGameTime(
              priorityTrain.scheduledDepartureMin + priorityTrain.delayMinutes,
            ),
            delayMinutes: priorityTrain.delayMinutes,
            currentPassengers: priorityTrain.currentPassengers,
            passengerCapacity: priorityTrain.passengerCapacity,
            doorState: priorityTrain.doorState,
            departureStage: priorityTrain.departureStage,
            signalAspect: getTrackSignal(s, priorityTrain.assignedPlatform ?? 1),
            hasOperationalEvent: Boolean(
              priorityTrain.operationalEvent && !priorityTrain.operationalEvent.resolved,
            ),
            operationalEventTitle:
              priorityTrain.operationalEvent && !priorityTrain.operationalEvent.resolved
                ? priorityTrain.operationalEvent.title
                : null,
          }
        : null;

      const upgradeEval = evaluateStationUpgrade(s);
      const trackOccupied: Record<TrackId, boolean> = {
        1: Boolean(ts.trackOccupancies[1]?.occupied),
        2: Boolean(ts.trackOccupancies[2]?.occupied),
        3: Boolean(ts.trackOccupancies[3]?.occupied),
        4: Boolean(ts.trackOccupancies[4]?.occupied),
        5: Boolean(ts.trackOccupancies[5]?.occupied),
        6: Boolean(ts.trackOccupancies[6]?.occupied),
        7: Boolean(ts.trackOccupancies[7]?.occupied),
        8: Boolean(ts.trackOccupancies[8]?.occupied),
      };

      const primaryMission = npcSt.missions[0] ? { ...npcSt.missions[0] } : null;
      const primaryDaily = getPrimaryDailyTask(o);
      const availableOfficersCount = npcSt.npcs.filter(
        (n) => (n.role === 'railway_police' || n.role === 'bd_police') && !n.assignedMissionId,
      ).length;
      const incId = npcSt.activeIncident?.id ?? '';
      const missionSig = primaryMission
        ? `${primaryMission.id}:${primaryMission.status}:${Math.ceil(primaryMission.timeRemainingSec)}:${primaryMission.cluesCollected.length}`
        : '';
      const taskSig = primaryDaily
        ? `${primaryDaily.id}:${primaryDaily.current}:${primaryDaily.completed ? 1 : 0}:${primaryDaily.claimed ? 1 : 0}`
        : '';
      const trainSig = activeTrainSummary
        ? `${activeTrainSummary.trainId}:${activeTrainSummary.status}:${activeTrainSummary.currentPassengers}:${activeTrainSummary.doorState}:${activeTrainSummary.departureStage}:${activeTrainSummary.hasOperationalEvent}`
        : '';
      const trackSig = ([1, 2, 3, 4, 5, 6, 7, 8] as const)
        .map((t) => `${getTrackSignal(s, t)}:${trackOccupied[t] ? 1 : 0}`)
        .join(',');
      const vipSig = o.vipProtocol?.active
        ? `${o.vipProtocol.eventId}:${o.vipProtocol.lockedPlatforms.join(',')}:${o.vipProtocol.corridorEvacuationPct}:${o.vipProtocol.clearedPlatforms.join(',')}:${o.vipProtocol.securityClearanceVerified ? 1 : 0}:${Math.ceil(o.vipProtocol.timeRemainingSec)}`
        : '0';
      const sig = `${activeId}|${multiStateRef.current.chapter2Unlocked}|${multiStateRef.current.celebrationDismissed}|${s.dayNumber}|${s.stationLevel}|${s.unlockedTracks}|${upgradeEval.canUpgradeNow}|${s.level}|${s.xp}|${s.money}|${s.reputation}|${s.satisfaction}|${s.securityRating}|${s.crimesPrevented}|${s.emergenciesResolved}|${s.complaints}|${s.successfulInteractions}|${npcSt.npcs.length}|${npcSt.missions.length}|${o.activeOpsEvents.length}|${o.powerOutageActive}|${vipSig}|${taskSig}|${missionSig}|${trainSig}|${availableOfficersCount}|${incId}|${timeStr}|${trackSig}|${ts.switchPosition}|${s.crossingGateClosed}|${urgentCount}|${ts.alerts.length}|${prompt?.id ?? ''}|${prompt?.title ?? ''}|${s.lastEventTimestamp}`;
      if (!force && sig === lastHudSig && now - lastHudPushTime < 450) {
        return;
      }
      lastHudSig = sig;
      lastHudPushTime = now;
      onHudUpdateRef.current({
        chapterId: activeId,
        chapter2Unlocked: multiStateRef.current.chapter2Unlocked,
        chapter1JustCompleted:
          multiStateRef.current.chapter2Unlocked && !multiStateRef.current.celebrationDismissed,
        stationName: cfg.stationName,
        stationNameBn: cfg.stationNameBn,
        dayNumber: ts.dayNumber,
        stationLevel: s.stationLevel,
        unlockedTracks: s.unlockedTracks,
        nextUpgradeReady: upgradeEval.canUpgradeNow,
        nextUpgradeTrackCount:
          upgradeEval.nextTier.tracksUnlocked > s.unlockedTracks
            ? upgradeEval.nextTier.tracksUnlocked
            : null,
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
        activeCrowdCount: npcSt.npcs.length,
        activeIncident: npcSt.activeIncident,
        activeMissionsCount: npcSt.missions.length,
        activeOpsCount: o.activeOpsEvents.length,
        primaryMission,
        activeDailyTask: primaryDaily
          ? {
              id: primaryDaily.id,
              title: primaryDaily.title,
              current: primaryDaily.current,
              target: primaryDaily.target,
              completed: primaryDaily.completed,
              claimed: primaryDaily.claimed,
            }
          : null,
        powerOutageActive: o.powerOutageActive,
        paSystemFailed: o.paSystemFailed,
        vipSecurityActive: Boolean(o.vipProtocol?.active),
        vipLockedPlatforms: o.vipProtocol?.active
          ? o.vipProtocol.lockedPlatforms.length > 0
            ? o.vipProtocol.lockedPlatforms
            : o.vipProtocol.designatedPlatforms
          : [],
        availableOfficersCount,
        timeFormatted: timeStr,
        dayPeriodLabel: getDayPeriodLabel(s.gameMinutes),
        trackSignals: s.trackSignals,
        trackOccupancies: trackOccupied,
        track1Signal: s.track1Signal,
        track2Signal: s.track2Signal,
        track1Occupied: ts.track1Occupancy.occupied,
        track2Occupied: ts.track2Occupancy.occupied,
        switchPosition: ts.switchPosition,
        crossingGateClosed: s.crossingGateClosed,
        activeAlertCount: ts.alerts.length,
        urgentTrainsCount: urgentCount,
        nearbyPrompt: prompt,
        activeTrainSummary,
        lastEventMessage: s.lastEventMessage,
        dispatchesCompleted: s.dispatchesCompleted,
      });
    }

    const playGuardedAnnouncement = (text: string | null) => {
      if (!text) return;
      if (opsStateRef.current.paSystemFailed) {
        onAnnouncementRef.current('[PA OFFLINE — Repair Public Address System in Ops Hub!]');
        return;
      }
      sound.playBengaliAnnouncement(text);
    };

    const pushAllSnapshots = () => {
      pushHudSnapshot(true);
      pushDashboardSnapshot(true);
      pushUpgradeSnapshot(true);
      pushEmergencySnapshot(true);
      pushOperationsSnapshot(true);
    };

    const getActiveVipLockedPlatforms = (): readonly TrackId[] =>
      opsStateRef.current.vipProtocol?.active
        ? opsStateRef.current.vipProtocol.lockedPlatforms
        : [];

    // Wire imperative Train Control Dashboard callbacks directly into simulation refs
    trainActionsRef.current = {
      assignPlatform: (trainId: string, platform: TrackId) => {
        const res = assignTrainPlatform(
          simStateRef.current,
          trainStateRef.current,
          trainId,
          platform,
          performance.now(),
          getActiveVipLockedPlatforms(),
        );
        simStateRef.current = res.simState;
        trainStateRef.current = res.trainState;
        playOutcomeEffects(res.sound, null);
        playGuardedAnnouncement(res.announcement);
        pushAllSnapshots();
      },
      setSignal: (track: TrackId, aspect: SignalAspect) => {
        const res = setTrackSignalAspect(
          simStateRef.current,
          trainStateRef.current,
          track,
          aspect,
          performance.now(),
        );
        simStateRef.current = res.simState;
        trainStateRef.current = res.trainState;
        playOutcomeEffects(res.sound, null);
        playGuardedAnnouncement(res.announcement);
        pushAllSnapshots();
      },
      toggleSwitch: () => {
        const res = toggleSwitchPosition(
          simStateRef.current,
          trainStateRef.current,
          performance.now(),
        );
        simStateRef.current = res.simState;
        trainStateRef.current = res.trainState;
        playOutcomeEffects(res.sound, null);
        playGuardedAnnouncement(res.announcement);
        pushAllSnapshots();
      },
      toggleCrossingGate: () => {
        const res = performStationInteraction(
          simStateRef.current,
          'crossing_gate',
          performance.now(),
        );
        simStateRef.current = res.nextState;
        playOutcomeEffects(res.sound, null);
        pushAllSnapshots();
      },
      toggleEmergencyStop: (trainId: string) => {
        const res = toggleEmergencyStopTrain(
          simStateRef.current,
          trainStateRef.current,
          trainId,
          performance.now(),
        );
        simStateRef.current = res.simState;
        trainStateRef.current = res.trainState;
        playOutcomeEffects(res.sound, null);
        playGuardedAnnouncement(res.announcement);
        pushAllSnapshots();
      },
      authorizeDeparture: (trainId: string) => {
        const dispatchedTrain = trainStateRef.current.trains.find((t) => t.id === trainId);
        const res = authorizeTrainDeparture(
          simStateRef.current,
          trainStateRef.current,
          trainId,
          performance.now(),
        );
        simStateRef.current = res.simState;
        trainStateRef.current = res.trainState;
        if (res.accepted) {
          const isCargo = dispatchedTrain?.category === 'freight';
          const revenue = isCargo
            ? 140
            : 110 + Math.round((dispatchedTrain?.currentPassengers ?? 0) * 0.65);
          opsStateRef.current = recordFinanceIncome(
            opsStateRef.current,
            isCargo ? 'cargo' : 'ticket',
            revenue,
          );
          opsStateRef.current = recordTaskMetric(opsStateRef.current, 'on_time_dispatches', 1);
        }
        playOutcomeEffects(res.sound, null);
        playGuardedAnnouncement(res.announcement);
        persistCurrentShift();
        pushAllSnapshots();
      },
      advanceDepartureSequence: (
        trainId: string,
        step: 'announce_boarding' | 'safety_checks' | 'close_doors',
      ) => {
        const res = advanceTrainDepartureSequence(
          simStateRef.current,
          trainStateRef.current,
          trainId,
          step,
          performance.now(),
        );
        simStateRef.current = res.simState;
        trainStateRef.current = res.trainState;
        if (step === 'close_doors' && res.accepted) {
          sound.playDoorChime(false);
        }
        playOutcomeEffects(res.sound, null);
        playGuardedAnnouncement(res.announcement);
        pushAllSnapshots();
      },
      resolveOperationalEvent: (trainId: string, choice: 'primary' | 'secondary' = 'primary') => {
        const res = resolveTrainOperationalEvent(
          simStateRef.current,
          trainStateRef.current,
          trainId,
          choice,
          performance.now(),
        );
        simStateRef.current = res.simState;
        trainStateRef.current = res.trainState;
        if (res.accepted) {
          opsStateRef.current = recordTaskMetric(opsStateRef.current, 'passenger_assists', 1);
        }
        playOutcomeEffects(res.sound, null);
        playGuardedAnnouncement(res.announcement);
        pushAllSnapshots();
      },
      announceTrain: (trainId: string) => {
        const train = trainStateRef.current.trains.find((t) => t.id === trainId);
        if (!train) return;
        const kind =
          train.status === 'Delayed' || train.delayMinutes > 0
            ? 'delay'
            : train.status === 'At Platform' || train.status === 'Boarding'
              ? 'boarding'
              : 'arrival';
        const text = buildTrainBanglaAnnouncement(train, kind);
        playGuardedAnnouncement(text);
        pushDashboardSnapshot(true);
      },
      announceSafety: () => {
        playGuardedAnnouncement(BANGLA_SAFETY_ANNOUNCEMENTS[0]);
      },
    };

    upgradeActionsRef.current = {
      purchaseUpgrade: () => {
        const nowMs = performance.now();
        const nextTier = getUpgradeTierSpec(
          (simStateRef.current.stationLevel || 1) + 1,
          simStateRef.current.chapterId === 2 ? 2 : 1,
        );
        const outcome = purchaseNextStationUpgrade(simStateRef.current, nowMs);
        simStateRef.current = outcome.simState;
        if (outcome.accepted) {
          trainStateRef.current = syncTrainSimulationUnlockedTracks(
            trainStateRef.current,
            outcome.newUnlockedTracks,
            simStateRef.current.gameMinutes,
          );
          opsStateRef.current = recordFinanceExpense(
            opsStateRef.current,
            'construction',
            nextTier.costCoins,
          );
          opsStateRef.current = recordTaskMetric(opsStateRef.current, 'station_upgrades', 1);
          sound.playUpgradeConstructionFanfare();
          playGuardedAnnouncement(outcome.announcement);
          persistCurrentShift();
        } else {
          sound.playSignalLever();
        }
        pushAllSnapshots();
      },
    };

    emergencyActionsRef.current = {
      dispatchOfficer: (missionId: string, officerId?: string) => {
        const res = dispatchOfficerToMission(
          world.getNpcState(),
          simStateRef.current,
          missionId,
          officerId,
          performance.now(),
        );
        simStateRef.current = res.simState;
        if (res.dispatched) {
          sound.playRadioChirp();
          sound.playPoliceWhistle();
        }
        pushAllSnapshots();
      },
      requestPatrolSweep: () => {
        const res = requestSecurityPatrolSweep(
          world.getNpcState(),
          simStateRef.current,
          performance.now(),
        );
        simStateRef.current = res.simState;
        sound.playRadioChirp();
        pushAllSnapshots();
      },
      broadcastEmergencyPa: (missionId: string) => {
        const paText = broadcastMissionBanglaPa(world.getNpcState(), missionId);
        if (paText) {
          sound.playEmergencySiren();
          playGuardedAnnouncement(paText);
          simStateRef.current = {
            ...simStateRef.current,
            lastEventMessage: `Bangla Emergency PA broadcast issued.`,
            lastEventTimestamp: performance.now(),
          };
          pushAllSnapshots();
        }
      },
    };

    opsActionsRef.current = {
      claimTask: (taskId: string) => {
        const res = claimTaskReward(simStateRef.current, opsStateRef.current, taskId, performance.now());
        simStateRef.current = res.simState;
        opsStateRef.current = res.opsState;
        if (res.accepted) {
          sound.playAchievementUnlock();
          persistCurrentShift();
        }
        pushAllSnapshots();
      },
      resolveOpsEvent: (eventId: string) => {
        const res = resolveOpsEmergency(
          simStateRef.current,
          opsStateRef.current,
          eventId,
          performance.now(),
          false,
        );
        simStateRef.current = res.simState;
        opsStateRef.current = res.opsState;
        if (res.accepted) {
          sound.playCoin();
          persistCurrentShift();
        } else {
          sound.playSignalLever();
        }
        pushAllSnapshots();
      },
      spawnOpsEvent: () => {
        const res = spawnOpsEmergency(simStateRef.current, opsStateRef.current);
        opsStateRef.current = res.opsState;
        if (res.event) {
          sound.playRadioChirp();
          simStateRef.current = {
            ...simStateRef.current,
            lastEventMessage: `Ops Alert: ${res.event.title} at ${res.event.locationLabel}.`,
            lastEventTimestamp: performance.now(),
          };
        }
        pushAllSnapshots();
      },
      dispatchUnexpectedTrain: () => {
        const res = injectUnexpectedTrain(simStateRef.current, trainStateRef.current, performance.now());
        simStateRef.current = res.simState;
        trainStateRef.current = res.trainState;
        playOutcomeEffects(res.sound, null);
        playGuardedAnnouncement(res.announcement);
        pushAllSnapshots();
      },
      triggerSimultaneousArrivals: () => {
        const res = triggerSimultaneousPeakArrivals(
          simStateRef.current,
          trainStateRef.current,
          performance.now(),
        );
        simStateRef.current = res.simState;
        trainStateRef.current = res.trainState;
        playOutcomeEffects(res.sound, null);
        playGuardedAnnouncement(res.announcement);
        pushAllSnapshots();
      },
      divertTrainToPlatform: (trainId: string, track: TrackId) => {
        const res = divertTrainToPlatform(
          simStateRef.current,
          trainStateRef.current,
          trainId,
          track,
          performance.now(),
          getActiveVipLockedPlatforms(),
        );
        simStateRef.current = res.simState;
        trainStateRef.current = res.trainState;
        playOutcomeEffects(res.sound, null);
        playGuardedAnnouncement(res.announcement);
        pushAllSnapshots();
      },
      hireStaff: (role: StaffRole) => {
        const res = hireStaffMember(simStateRef.current, opsStateRef.current, role, performance.now());
        simStateRef.current = res.simState;
        opsStateRef.current = res.opsState;
        if (res.accepted) {
          sound.playCoin();
          persistCurrentShift();
        } else {
          sound.playSignalLever();
        }
        pushAllSnapshots();
      },
      assignStaffDuty: (staffId: string, duty: StaffDuty) => {
        opsStateRef.current = assignStaffDuty(opsStateRef.current, staffId, duty);
        sound.playSignalLever();
        pushAllSnapshots();
      },
      changeStaffShift: (staffId: string, shift: StaffShift) => {
        opsStateRef.current = setStaffShift(opsStateRef.current, staffId, shift);
        sound.playSignalLever();
        pushAllSnapshots();
      },
      trainStaff: (staffId: string) => {
        const res = trainStaffMember(simStateRef.current, opsStateRef.current, staffId, performance.now());
        simStateRef.current = res.simState;
        opsStateRef.current = res.opsState;
        if (res.accepted) {
          sound.playAchievementUnlock();
          persistCurrentShift();
        } else {
          sound.playSignalLever();
        }
        pushAllSnapshots();
      },
      replaceAbsentStaff: (staffId: string) => {
        const res = replaceAbsentStaff(simStateRef.current, opsStateRef.current, staffId, performance.now());
        simStateRef.current = res.simState;
        opsStateRef.current = res.opsState;
        if (res.accepted) {
          sound.playRadioChirp();
        }
        pushAllSnapshots();
      },
      constructFacility: (facilityId: FacilityId) => {
        const res = constructFacility(simStateRef.current, opsStateRef.current, facilityId, performance.now());
        simStateRef.current = res.simState;
        opsStateRef.current = res.opsState;
        if (res.accepted) {
          sound.playUpgradeConstructionFanfare();
          persistCurrentShift();
        } else {
          sound.playSignalLever();
        }
        pushAllSnapshots();
      },
      upgradeFacility: (facilityId: FacilityId) => {
        const res = upgradeFacility(simStateRef.current, opsStateRef.current, facilityId, performance.now());
        simStateRef.current = res.simState;
        opsStateRef.current = res.opsState;
        if (res.accepted) {
          sound.playUpgradeConstructionFanfare();
          persistCurrentShift();
        } else {
          sound.playSignalLever();
        }
        pushAllSnapshots();
      },
      repairFacility: (facilityId: FacilityId) => {
        const res = repairFacility(simStateRef.current, opsStateRef.current, facilityId, performance.now());
        simStateRef.current = res.simState;
        opsStateRef.current = res.opsState;
        if (res.accepted) {
          sound.playCoin();
          persistCurrentShift();
        } else {
          sound.playSignalLever();
        }
        pushAllSnapshots();
      },
      triggerVipSecurity: () => {
        const res = triggerEmergencyVipSecurity(
          simStateRef.current,
          opsStateRef.current,
          performance.now(),
        );
        simStateRef.current = res.simState;
        opsStateRef.current = res.opsState;
        if (res.accepted && res.protocol) {
          applyVipPassengerDensityAdjustment(
            world.getNpcState(),
            res.protocol,
            simStateRef.current.unlockedTracks,
          );
          sound.playEmergencySiren();
          sound.playRadioChirp();
          playGuardedAnnouncement(res.announcement);
          persistCurrentShift();
        } else {
          sound.playSignalLever();
        }
        pushAllSnapshots();
      },
      toggleSecurePlatform: (platformId: TrackId) => {
        const res = toggleVipPlatformLock(
          simStateRef.current,
          opsStateRef.current,
          platformId,
          performance.now(),
        );
        simStateRef.current = res.simState;
        opsStateRef.current = res.opsState;
        if (res.accepted) {
          if (res.locked && opsStateRef.current.vipProtocol) {
            applyVipPassengerDensityAdjustment(
              world.getNpcState(),
              opsStateRef.current.vipProtocol,
              simStateRef.current.unlockedTracks,
            );
            sound.playPoliceWhistle();
          } else {
            sound.playSignalLever();
          }
          playGuardedAnnouncement(res.announcement);
          persistCurrentShift();
        } else {
          sound.playSignalLever();
        }
        pushAllSnapshots();
      },
      clearVipPlatform: (platformId: TrackId) => {
        const res = orderClearVipPlatform(
          simStateRef.current,
          opsStateRef.current,
          platformId,
          performance.now(),
        );
        simStateRef.current = res.simState;
        opsStateRef.current = res.opsState;
        if (res.accepted) {
          if (res.completed) {
            sound.playAchievementUnlock();
          } else {
            sound.playPoliceWhistle();
          }
          playGuardedAnnouncement(res.announcement);
          persistCurrentShift();
        } else {
          sound.playSignalLever();
        }
        pushAllSnapshots();
      },
      verifyVipCredential: (credentialId: string, decision: 'verify' | 'reject') => {
        const res = verifyVipCredential(
          simStateRef.current,
          opsStateRef.current,
          credentialId,
          decision,
          performance.now(),
        );
        simStateRef.current = res.simState;
        opsStateRef.current = res.opsState;
        if (res.completed) {
          sound.playAchievementUnlock();
          playGuardedAnnouncement(res.announcement);
          persistCurrentShift();
        } else if (res.accepted) {
          sound.playCoin();
          persistCurrentShift();
        } else {
          sound.playEmergencySiren();
        }
        pushAllSnapshots();
      },
      verifySecurityClearance: () => {
        const res = verifySecurityClearance(
          simStateRef.current,
          opsStateRef.current,
          performance.now(),
        );
        simStateRef.current = res.simState;
        opsStateRef.current = res.opsState;
        if (res.completed) {
          sound.playAchievementUnlock();
          playGuardedAnnouncement(res.announcement);
          persistCurrentShift();
        } else if (res.accepted) {
          sound.playRadioChirp();
          persistCurrentShift();
        } else {
          sound.playSignalLever();
        }
        pushAllSnapshots();
      },
    };

    const switchActiveChapter = (targetChapterId: ChapterId) => {
      if (targetChapterId === 2 && !multiStateRef.current.chapter2Unlocked) {
        return;
      }
      syncActiveRuntime();
      if (multiStateRef.current.activeChapterId === targetChapterId) {
        pushAllSnapshots();
        return;
      }
      multiStateRef.current.activeChapterId = targetChapterId;
      const targetRuntime =
        targetChapterId === 2 ? multiStateRef.current.chapter2 : multiStateRef.current.chapter1;
      const prof = multiStateRef.current.sharedProfile;
      const syncedTargetSim: StationSimState = {
        ...targetRuntime.simState,
        level: Math.max(targetRuntime.simState.level, prof.level),
        xp: Math.max(targetRuntime.simState.xp, prof.xp),
        xpToNext: prof.xpToNext,
        achievements: prof.achievements.map((a) => ({ ...a })),
        lastEventMessage: `Commanding ${CHAPTER_CONFIGS[targetChapterId].stationName} (${CHAPTER_CONFIGS[targetChapterId].stationNameBn}).`,
        lastEventTimestamp: performance.now(),
      };
      simStateRef.current = syncedTargetSim;
      trainStateRef.current = targetRuntime.trainState;
      opsStateRef.current = targetRuntime.opsState;
      rebuildWorldForChapter(targetChapterId);
      world.resetNpcs();
      player.x = -2;
      player.z = -7.2;
      player.y = groundHeightAt(player.x, player.z, 0.65, simStateRef.current.unlockedTracks);
      player.vy = 0;
      player.yaw = Math.PI * 0.48;
      player.grounded = true;
      player.speed = 0;
      keys.clear();
      onBubblesUpdateRef.current([]);
      sound.playStationBell();
      playGuardedAnnouncement(
        targetChapterId === 2
          ? 'স্বাগতম পদ্মা সেন্ট্রাল টার্মিনালে। ৭ এবং ৮ নম্বর উচ্চ-গতির ট্র্যাক এখন সক্রিয়!'
          : 'শাপলাপুর জংশন নিয়ন্ত্রণ কক্ষে স্বাগতম।',
      );
      persistCurrentShift();
      pushAllSnapshots();
    };

    chapterActionsRef.current = {
      selectChapter: switchActiveChapter,
      dismissCelebration: () => {
        multiStateRef.current.celebrationDismissed = true;
        persistCurrentShift();
        pushAllSnapshots();
      },
    };

    npcDialogueActionsRef.current = {
      selectChoice: (npcId: string, choice: NpcDialogueChoice) => {
        const res = resolveNpcDialogueChoice(
          world.getNpcState(),
          simStateRef.current,
          npcId,
          choice,
          performance.now(),
        );
        simStateRef.current = res.simState;
        if (choice.isCorrect) {
          opsStateRef.current = recordTaskMetric(opsStateRef.current, 'passenger_assists', 1);
        }
        if (res.soundHint === 'whistle' || res.soundHint === 'siren') {
          opsStateRef.current = recordTaskMetric(opsStateRef.current, 'security_prevented', 1);
        }
        if (res.soundHint === 'whistle') {
          sound.playPoliceWhistle();
        } else if (res.soundHint === 'radio') {
          sound.playRadioChirp();
        } else if (res.soundHint === 'siren') {
          sound.playEmergencySiren();
        } else if (res.soundHint === 'achievement') {
          sound.playAchievementUnlock();
        } else {
          sound.playDialogueOutcome(choice.isCorrect);
        }
        if (res.unlockedAchievement && res.soundHint !== 'achievement') {
          sound.playAchievementUnlock();
        }
        if (res.announcementBn) {
          playGuardedAnnouncement(res.announcementBn);
        } else {
          sound.speakBanglaLine(choice.replyBn, 0.98);
        }
        pushAllSnapshots();
        return {
          replyBn: choice.replyBn,
          replyEn: choice.replyEn,
          isCorrect: choice.isCorrect,
          satisfactionDelta: choice.satisfactionDelta,
          xpDelta: choice.xpDelta,
          moneyDelta: choice.moneyDelta,
        };
      },
    };

    const executeInteraction = () => {
      if (phaseRef.current !== 'playing') return;
      const nearby = getNearbyInteractionTarget();
      if (!nearby) return;
      flagSwingTimer = 0.45;
      const now = performance.now();

      if (nearby.kind === 'npc') {
        const dialogue = openNpcDialogueForAgent(
          world.getNpcState(),
          nearby.npcId,
          simStateRef.current,
          trainStateRef.current,
        );
        if (dialogue) {
          sound.playStationBell();
          sound.speakBanglaLine(dialogue.questionBn, 0.96);
          onOpenNpcDialogueRef.current(dialogue);
        }
        pushAllSnapshots();
        return;
      }

      const item = nearby.item;
      if (item.id === 'operations_desk') {
        sound.playStationBell();
        onOpenOperationsModalRef.current();
        pushAllSnapshots();
        return;
      }

      if (item.id === 'ops_repair_point' && item.missionId) {
        const res = resolveOpsEmergency(
          simStateRef.current,
          opsStateRef.current,
          item.missionId,
          now,
          false,
        );
        simStateRef.current = res.simState;
        opsStateRef.current = res.opsState;
        if (res.accepted) {
          sound.playCoin();
          persistCurrentShift();
        } else {
          sound.playSignalLever();
        }
        pushAllSnapshots();
        return;
      }

      if (item.id === 'train_operational_event' && item.trainId) {
        const res = resolveTrainOperationalEvent(
          simStateRef.current,
          trainStateRef.current,
          item.trainId,
          'primary',
          now,
        );
        simStateRef.current = res.simState;
        trainStateRef.current = res.trainState;
        if (res.accepted) {
          opsStateRef.current = recordTaskMetric(opsStateRef.current, 'passenger_assists', 1);
        }
        playOutcomeEffects(res.sound, null);
        playGuardedAnnouncement(res.announcement);
        pushAllSnapshots();
        return;
      }

      if (item.id === 'emergency_hazard' && item.missionId) {
        const hazardRes = interactWithEmergencyHazard(
          world.getNpcState(),
          simStateRef.current,
          item.missionId,
          now,
        );
        simStateRef.current = hazardRes.simState;
        if (hazardRes.resolved) {
          opsStateRef.current = recordTaskMetric(opsStateRef.current, 'emergencies_resolved', 1);
          opsStateRef.current = recordTaskMetric(opsStateRef.current, 'security_prevented', 1);
          if (hazardRes.sound === 'whistle') sound.playPoliceWhistle();
          else if (hazardRes.sound === 'radio') sound.playRadioChirp();
          else sound.playCoin();
          if (hazardRes.unlockedAchievement) {
            sound.playAchievementUnlock();
          }
        }
        pushAllSnapshots();
        return;
      }

      if (
        item.id === 'signal_track1' ||
        item.id === 'signal_track2' ||
        item.id === 'signal_track3' ||
        item.id === 'signal_track4' ||
        item.id === 'signal_track5' ||
        item.id === 'signal_track6' ||
        item.id === 'signal_track7' ||
        item.id === 'signal_track8'
      ) {
        const track = Number(item.id.replace('signal_track', '')) as TrackId;
        const curr = getTrackSignal(simStateRef.current, track);
        const nextAspect = nextSignalAspect(curr);
        const res = setTrackSignalAspect(simStateRef.current, trainStateRef.current, track, nextAspect, now);
        simStateRef.current = res.simState;
        trainStateRef.current = res.trainState;
        playOutcomeEffects(res.sound, null);
        playGuardedAnnouncement(res.announcement);
      } else {
        const result = performStationInteraction(simStateRef.current, item.id, now, item.title);
        simStateRef.current = result.nextState;
        playOutcomeEffects(result.sound, null);
        if (result.openDashboard) {
          onOpenTrainDashboardRef.current();
        }
        if (result.openUpgradeDashboard) {
          onOpenUpgradeDashboardRef.current();
        }
      }
      pushAllSnapshots();
    };

    triggerInteractRef.current = executeInteraction;

    const persistCurrentShift = (): boolean => {
      syncActiveRuntime();
      const ok = saveMultiStationShift({
        multiState: multiStateRef.current,
        cameraMode: cameraModeRef.current,
        weather: weatherRef.current,
        audioSettings: audioSettingsRef.current,
      });
      if (ok) {
        onSavedShiftChangeRef.current?.();
      }
      return ok;
    };

    const restoreSavedShift = (): boolean => {
      const saved = loadMultiStationShift();
      if (!saved) return false;
      multiStateRef.current = saved.multiState;
      const activeId = saved.multiState.activeChapterId;
      const activeRuntime =
        activeId === 2 ? saved.multiState.chapter2 : saved.multiState.chapter1;
      const maxT = activeId === 2 ? 8 : 6;
      const minT = activeId === 2 ? 7 : 2;
      const restoredTracks = Math.max(minT, Math.min(maxT, activeRuntime.simState.unlockedTracks ?? minT));
      const restoredSim: StationSimState = {
        ...activeRuntime.simState,
        chapterId: activeId,
        unlockedTracks: restoredTracks,
        lastEventMessage: `Saved shift loaded · ${CHAPTER_CONFIGS[activeId].stationName} Level ${activeRuntime.simState.stationLevel} (${restoredTracks} Tracks).`,
        lastEventTimestamp: performance.now(),
      };
      simStateRef.current = restoredSim;
      trainStateRef.current = syncTrainSimulationUnlockedTracks(
        activeRuntime.trainState,
        restoredTracks,
        restoredSim.gameMinutes,
      );
      opsStateRef.current = activeRuntime.opsState;
      rebuildWorldForChapter(activeId);
      world.resetNpcs();
      player.x = -2;
      player.z = -7.2;
      player.y = groundHeightAt(player.x, player.z, 0.65, restoredTracks);
      player.vy = 0;
      player.yaw = Math.PI * 0.48;
      player.grounded = true;
      player.speed = 0;
      player.sprinting = false;
      keys.clear();
      weatherRef.current = saved.weather;
      autoWeatherRef.current = createInitialAutoWeatherState(saved.weather);
      sound.setWeather(saved.weather);
      onRestoreEnvironmentRef.current?.(saved);
      onBubblesUpdateRef.current([]);
      pushAllSnapshots();
      return true;
    };

    persistenceActionsRef.current = {
      saveShift: persistCurrentShift,
      loadSavedShift: restoreSavedShift,
    };

    triggerResetRef.current = () => {
      multiStateRef.current = createInitialMultiStationState();
      simStateRef.current = multiStateRef.current.chapter1.simState;
      trainStateRef.current = multiStateRef.current.chapter1.trainState;
      opsStateRef.current = multiStateRef.current.chapter1.opsState;
      rebuildWorldForChapter(1);
      autoWeatherRef.current = createInitialAutoWeatherState('clear');
      weatherRef.current = 'clear';
      sound.setWeather('clear');
      onWeatherChangeRef.current('clear');
      world.resetNpcs();
      player.x = -2;
      player.z = -8.2;
      player.y = groundHeightAt(player.x, player.z, 0.65, simStateRef.current.unlockedTracks);
      player.vy = 0;
      player.yaw = Math.PI * 0.48;
      player.grounded = true;
      player.distanceWalked = 0;
      player.speed = 0;
      player.sprinting = false;
      camYaw = -Math.PI * 0.44;
      tpPitch = 0.24;
      fpPitch = -0.02;
      keys.clear();
      onBubblesUpdateRef.current([]);
      pushAllSnapshots();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (phaseRef.current !== 'playing' || modalOpenRef.current) return;
      const code = e.code;
      if (
        code === 'KeyW' ||
        code === 'KeyA' ||
        code === 'KeyS' ||
        code === 'KeyD' ||
        code === 'ArrowUp' ||
        code === 'ArrowDown' ||
        code === 'ArrowLeft' ||
        code === 'ArrowRight' ||
        code === 'Space'
      ) {
        e.preventDefault();
      }
      if (!e.repeat) {
        if (code === 'Space') jumpJustPressed = true;
        if (code === 'KeyE') interactJustPressed = true;
      }
      keys.add(code);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys.delete(e.code);
    };

    const clearInputs = () => {
      keys.clear();
      mouseDragging = false;
      activePointerId = null;
    };
    clearInputsRef.current = clearInputs;

    const canvasEl = renderer.domElement;

    const onPointerLockChangeInternal = () => {
      const locked = document.pointerLockElement === canvasEl;
      onPointerLockChangeRef.current(locked);
      if (locked) {
        intentionalUnlockRef.current = false;
      } else if (wasPointerLocked) {
        const wasIntentional = intentionalUnlockRef.current;
        intentionalUnlockRef.current = false;
        clearInputs();
        if (!wasIntentional && phaseRef.current === 'playing' && !modalOpenRef.current) {
          onEscUnlockRef.current();
        }
      }
      wasPointerLocked = locked;
    };

    const onPointerLockErrorInternal = () => {
      intentionalUnlockRef.current = false;
      onPointerLockChangeRef.current(false);
    };

    const onMouseMoveLocked = (e: MouseEvent) => {
      if (phaseRef.current !== 'playing' || modalOpenRef.current) return;
      if (document.pointerLockElement !== canvasEl) return;
      const dx = e.movementX || 0;
      const dy = e.movementY || 0;
      camYaw -= dx * 0.0028;
      if (cameraModeRef.current === 'first-person') {
        fpPitch = THREE.MathUtils.clamp(fpPitch - dy * 0.0024, -1.22, 1.22);
      } else {
        tpPitch = THREE.MathUtils.clamp(tpPitch + dy * 0.0026, 0.12, 1.08);
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (phaseRef.current !== 'playing' || modalOpenRef.current) return;
      if (e.button !== 0 && e.pointerType === 'mouse') return;

      if (
        e.pointerType === 'mouse' &&
        window.innerWidth >= 640 &&
        document.pointerLockElement !== canvasEl
      ) {
        intentionalUnlockRef.current = false;
        tryRequestPointerLock(canvasEl);
      }

      activePointerId = e.pointerId;
      mouseDragging = true;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
    };

    const onPointerMove = (e: PointerEvent) => {
      if (document.pointerLockElement === canvasEl) return;
      if (!mouseDragging || e.pointerId !== activePointerId) return;
      const dx = e.clientX - lastPointerX;
      const dy = e.clientY - lastPointerY;
      lastPointerX = e.clientX;
      lastPointerY = e.clientY;
      camYaw -= dx * 0.0052;
      if (cameraModeRef.current === 'first-person') {
        fpPitch = THREE.MathUtils.clamp(fpPitch - dy * 0.0042, -1.22, 1.22);
      } else {
        tpPitch = THREE.MathUtils.clamp(tpPitch + dy * 0.0045, 0.12, 1.08);
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (e.pointerId === activePointerId) {
        mouseDragging = false;
        activePointerId = null;
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (phaseRef.current !== 'playing' || modalOpenRef.current) return;
      if (cameraModeRef.current === 'third-person') {
        camDistance = THREE.MathUtils.clamp(camDistance + e.deltaY * 0.006, 4.5, 15.0);
      }
    };

    const onContextLost = (e: Event) => {
      e.preventDefault();
    };

    const unlockAudioFromUserGesture = () => {
      sound.unlockFromGesture();
    };

    window.addEventListener('pointerdown', unlockAudioFromUserGesture, true);
    window.addEventListener('keydown', unlockAudioFromUserGesture, true);
    window.addEventListener('touchstart', unlockAudioFromUserGesture, true);
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', clearInputs);
    document.addEventListener('visibilitychange', clearInputs);
    document.addEventListener('pointerlockchange', onPointerLockChangeInternal);
    document.addEventListener('pointerlockerror', onPointerLockErrorInternal);
    document.addEventListener('mousemove', onMouseMoveLocked);

    canvasEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    window.addEventListener('pointercancel', onPointerUp);
    canvasEl.addEventListener('wheel', onWheel, { passive: true });
    canvasEl.addEventListener('webglcontextlost', onContextLost);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = Math.max(1, Math.floor(entry.contentRect.width));
        const h = Math.max(1, Math.floor(entry.contentRect.height));
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
        renderer.render(world.scene, camera);
      }
    });
    resizeObserver.observe(container);

    pushAllSnapshots();

    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let elapsed = 0;
    let autoSaveTimer = 0;
    let bgAccumulator = 0;
    let lastPhase: GamePhase = phaseRef.current;
    let lastCamMode: CameraMode = cameraModeRef.current;

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync ? gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0) : null;
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (sync && state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 140);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    function stepSimulation(dt: number) {
      const currentPhase = phaseRef.current;
      const currentCamMode = cameraModeRef.current;
      let justEnteredPlaying = false;
      if (currentPhase !== lastPhase) {
        if (currentPhase === 'playing') {
          clearInputs();
          justEnteredPlaying = true;
        }
        lastPhase = currentPhase;
      }
      const justSwitchedCam = currentCamMode !== lastCamMode;
      lastCamMode = currentCamMode;

      if (currentPhase === 'title') {
        elapsed += dt;
        world.character.visualRoot.visible = true;
        fpArms.group.visible = false;
        const tourAngle = elapsed * 0.14;
        camera.position.set(
          Math.cos(tourAngle) * 28,
          10.5 + Math.sin(elapsed * 0.25) * 1.4,
          Math.sin(tourAngle) * 22 - 2,
        );
        camera.lookAt(2, 1.8, -4);
        world.update(
          simStateRef.current,
          trainStateRef.current,
          weatherRef.current,
          player.x,
          player.y,
          player.z,
          dt,
          elapsed,
          false,
        );
        return;
      }

      if (currentPhase === 'paused') {
        return;
      }

      // Active gameplay: advance clock & train railway simulation
      elapsed += dt;
      autoSaveTimer += dt;
      if (autoSaveTimer >= 12) {
        autoSaveTimer = 0;
        persistCurrentShift();
      }
      simStateRef.current.gameMinutes = advanceGameClock(simStateRef.current.gameMinutes, dt);

      const weatherStep = stepAutoWeather(autoWeatherRef.current, dt, simStateRef.current.dayNumber);
      autoWeatherRef.current = weatherStep.state;
      if (weatherStep.changed) {
        const nextWeather = weatherStep.state.mode;
        weatherRef.current = nextWeather;
        sound.setWeather(nextWeather);
        onWeatherChangeRef.current(nextWeather);
        if (weatherStep.message) {
          simStateRef.current = {
            ...simStateRef.current,
            lastEventMessage: weatherStep.message,
            lastEventTimestamp: performance.now(),
          };
        }
        pushHudSnapshot(true);
      }

      const trainStep = stepTrainSimulation(
        simStateRef.current,
        trainStateRef.current,
        dt,
        performance.now(),
        getActiveVipLockedPlatforms(),
      );
      simStateRef.current = trainStep.simState;
      trainStateRef.current = trainStep.trainState;

      const opsStep = stepStationOperations(
        simStateRef.current,
        opsStateRef.current,
        dt,
        performance.now(),
      );
      simStateRef.current = opsStep.simState;
      opsStateRef.current = opsStep.opsState;
      if (opsStep.spawnedEvent) {
        sound.playRadioChirp();
      }

      // Advance inactive station smoothly in background once unlocked
      bgAccumulator += dt;
      if (bgAccumulator >= 0.25) {
        const bgDt = bgAccumulator;
        bgAccumulator = 0;
        if (multiStateRef.current.activeChapterId === 2) {
          multiStateRef.current.chapter1 = stepBackgroundStation(
            multiStateRef.current.chapter1,
            bgDt,
            performance.now(),
          );
        } else if (multiStateRef.current.chapter2Unlocked) {
          multiStateRef.current.chapter2 = stepBackgroundStation(
            multiStateRef.current.chapter2,
            bgDt,
            performance.now(),
          );
        }
      }

      if (trainStep.events.playHorn) {
        sound.playTrainHorn();
      }
      if (trainStep.events.playDoorChime) {
        const anyClosing = trainStateRef.current.trains.some((t) => t.doorState === 'closing');
        sound.playDoorChime(!anyClosing);
      }
      if (trainStep.events.newAnnouncements.length > 0) {
        playGuardedAnnouncement(trainStep.events.newAnnouncements[0]);
      }

      // Occasional lightning flash during monsoon rain
      if (weatherRef.current === 'rain') {
        thunderFlashTimer += dt;
        if (thunderFlashTimer > 11.5) {
          thunderFlashTimer = 0;
          world.triggerLightningFlash();
          sound.playThunder();
        }
      } else {
        thunderFlashTimer = 0;
      }

      // When Train Control or Audio Mixer modal is open, keep simulation & trains running live, skip avatar input
      if (!modalOpenRef.current) {
        const tInput = touchInputRef.current;
        if (tInput.cameraDeltaX !== 0 || tInput.cameraDeltaY !== 0) {
          camYaw -= tInput.cameraDeltaX * 0.0056;
          if (currentCamMode === 'first-person') {
            fpPitch = THREE.MathUtils.clamp(fpPitch - tInput.cameraDeltaY * 0.0046, -1.22, 1.22);
          } else {
            tpPitch = THREE.MathUtils.clamp(tpPitch + tInput.cameraDeltaY * 0.0048, 0.12, 1.08);
          }
          tInput.cameraDeltaX = 0;
          tInput.cameraDeltaY = 0;
        }
        if (tInput.jumpRequested) {
          jumpJustPressed = true;
          tInput.jumpRequested = false;
        }
        if (tInput.interactRequested || interactJustPressed) {
          interactJustPressed = false;
          tInput.interactRequested = false;
          executeInteraction();
        }

        let inputForward =
          (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) -
          (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
        let inputRight =
          (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) -
          (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0);

        inputForward += tInput.moveY;
        inputRight += tInput.moveX;

        const sprinting = keys.has('ShiftLeft') || keys.has('ShiftRight') || tInput.sprintActive;
        player.sprinting = sprinting;

        _forward.set(-Math.sin(camYaw), 0, -Math.cos(camYaw));
        _right.set(Math.cos(camYaw), 0, -Math.sin(camYaw));
        _moveVec.set(0, 0, 0).addScaledVector(_forward, inputForward).addScaledVector(_right, inputRight);

        const moveMag = _moveVec.length();
        const maxWalkSpeed = sprinting ? 8.8 : 5.8;
        if (moveMag > 0.05) {
          _moveVec.divideScalar(Math.max(1, moveMag));
          const clampedMag = Math.min(1, moveMag);
          const speed = maxWalkSpeed * clampedMag;
          player.speed = speed;

          const nextX = player.x + _moveVec.x * speed * dt;
          const nextZ = player.z + _moveVec.z * speed * dt;

          const resolved = resolveCircleAabbCollisions(
            nextX,
            nextZ,
            player.y,
            PLAYER_RADIUS,
            world.colliders,
            simStateRef.current.chapterId === 2 ? CHAPTER2_MAX_Z : undefined,
          );
          const movedDist = Math.hypot(resolved.x - player.x, resolved.z - player.z);
          player.x = resolved.x;
          player.z = resolved.z;
          player.distanceWalked += movedDist;

          const targetYaw =
            currentCamMode === 'first-person' ? camYaw + Math.PI : Math.atan2(_moveVec.x, _moveVec.z);
          let diff = targetYaw - player.yaw;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          player.yaw += diff * (1 - Math.exp(-15 * dt));
        } else {
          player.speed = 0;
          if (currentCamMode === 'first-person') {
            player.yaw = camYaw + Math.PI;
          }
        }
      } else {
        player.speed = 0;
      }

      // Jump & multi-level ground clamping (supports Platforms + Footover Bridge stairs/deck + Island Expansions)
      const floorY = groundHeightAt(player.x, player.z, player.y, simStateRef.current.unlockedTracks);
      if (jumpJustPressed && player.grounded && !modalOpenRef.current) {
        player.vy = 6.5;
        player.grounded = false;
        squashScaleY = 1.15;
        sound.playJump();
      }
      jumpJustPressed = false;

      if (!player.grounded || player.y > floorY + 0.01) {
        player.vy -= 18.5 * dt;
        player.y += player.vy * dt;
        if (player.y <= floorY) {
          player.y = floorY;
          if (player.vy < -2.5) {
            squashScaleY = 0.85;
          }
          player.vy = 0;
          player.grounded = true;
        }
      } else {
        player.y = floorY;
        player.vy = 0;
        player.grounded = true;
      }

      // Proximity audio attenuation for diesel train engines
      const trainDist = world.closestTrainDistance(player.x, player.z);
      sound.setTrainProximity(1 - Math.min(1, trainDist / 42));

      // Character animation
      const rig = world.character;
      rig.group.position.set(player.x, player.y, player.z);
      rig.group.rotation.y = player.yaw;

      squashScaleY = THREE.MathUtils.lerp(squashScaleY, 1, 1 - Math.exp(-12 * dt));
      const xzScale = 1 / Math.sqrt(squashScaleY);
      rig.visualRoot.scale.set(xzScale, squashScaleY, xzScale);

      const speedRatio = Math.min(1, player.speed / 5.8);
      const strideFreq = player.sprinting ? 2.2 : 2.55;
      const phaseAngle = player.distanceWalked * strideFreq;
      const swingAmp = player.grounded ? speedRatio * (player.sprinting ? 0.72 : 0.54) : 0.28;
      const swing = Math.sin(phaseAngle) * swingAmp;

      rig.leftThigh.rotation.x = swing;
      rig.rightThigh.rotation.x = -swing;
      rig.leftShin.rotation.x = player.grounded
        ? Math.max(0, -Math.cos(phaseAngle) * 0.52 * speedRatio)
        : 0.35;
      rig.rightShin.rotation.x = player.grounded
        ? Math.max(0, Math.cos(phaseAngle) * 0.52 * speedRatio)
        : 0.25;

      if (flagSwingTimer > 0) flagSwingTimer = Math.max(0, flagSwingTimer - dt);
      const flagRaise = flagSwingTimer > 0 ? Math.sin((flagSwingTimer / 0.45) * Math.PI) * 1.15 : 0;

      rig.leftUpperArm.rotation.x = -swing * 0.85;
      rig.rightUpperArm.rotation.x = swing * 0.85 - flagRaise;
      rig.leftForearm.rotation.x = -0.22 - Math.max(0, swing) * 0.35;
      rig.rightForearm.rotation.x = -0.28 - Math.max(0, -swing) * 0.35 - flagRaise * 0.3;

      const idleBreath = Math.sin(elapsed * 2.1) * 0.015;
      rig.torso.rotation.x = (player.sprinting && player.speed > 2 ? 0.14 : 0.03 * speedRatio) + idleBreath;
      rig.torso.rotation.y = Math.sin(phaseAngle) * 0.06 * speedRatio;
      rig.head.rotation.y = -rig.torso.rotation.y * 0.6;

      const footCycle = Math.floor(phaseAngle / Math.PI);
      if (player.grounded && player.speed > 1.2 && footCycle !== prevFootCycle) {
        prevFootCycle = footCycle;
        sound.playFootstep(world.getGroundSurface(player.x, player.z, player.y), player.sprinting);
      }

      const heightAboveFloor = Math.max(0, player.y - floorY);
      rig.shadowDisc.position.y = 0.02 - heightAboveFloor;
      rig.shadowDisc.scale.setScalar(Math.max(0.55, 1 - heightAboveFloor * 0.25));

      const worldRes = world.update(
        simStateRef.current,
        trainStateRef.current,
        weatherRef.current,
        player.x,
        player.y,
        player.z,
        dt,
        elapsed,
        true,
        opsStateRef.current.activeOpsEvents,
        opsStateRef.current.powerOutageActive,
        opsStateRef.current.vipProtocol,
      );
      simStateRef.current = worldRes.simState;
      if (opsStateRef.current.vipProtocol?.active) {
        const vipSync = syncVipPlatformOccupancy(
          simStateRef.current,
          opsStateRef.current,
          worldRes.vipPlatformCounts,
          performance.now(),
        );
        simStateRef.current = vipSync.simState;
        opsStateRef.current = vipSync.opsState;
        if (vipSync.completed) {
          sound.playAchievementUnlock();
          playGuardedAnnouncement(vipSync.announcement);
          persistCurrentShift();
          pushHudSnapshot(true);
        } else if (vipSync.newlyClearedPlatforms.length > 0) {
          sound.playRadioChirp();
          pushHudSnapshot(true);
        }
      }
      if (!modalOpenRef.current) {
        player.x = worldRes.playerX;
        player.z = worldRes.playerZ;
        player.y = Math.max(
          player.y,
          groundHeightAt(player.x, player.z, player.y, simStateRef.current.unlockedTracks),
        );
        rig.group.position.set(player.x, player.y, player.z);
      }

      sound.setCrowdIntensity(world.getNpcState().npcs.length / 36);
      if (worldRes.npcEvents.playBumpSound) {
        sound.playNpcBump();
        if (worldRes.npcEvents.bumpLineBn) {
          sound.speakBanglaLine(worldRes.npcEvents.bumpLineBn, 1.04);
        }
      }
      if (worldRes.npcEvents.playVendorSound) {
        sound.playHawkerCall();
      }
      if (worldRes.npcEvents.playWhistle) {
        sound.playPoliceWhistle();
      }
      if (worldRes.npcEvents.playRadio) {
        sound.playRadioChirp();
      }
      if (worldRes.npcEvents.playSiren) {
        sound.playEmergencySiren();
      }
      if (worldRes.npcEvents.unlockedAchievement) {
        sound.playAchievementUnlock();
      }
      if (worldRes.npcEvents.announcementBn) {
        playGuardedAnnouncement(worldRes.npcEvents.announcementBn);
      }

      if (currentCamMode === 'first-person') {
        rig.visualRoot.visible = false;
        rig.shadowDisc.visible = false;
        fpArms.group.visible = true;

        const headBobY = player.grounded ? Math.abs(Math.sin(phaseAngle)) * 0.045 * speedRatio : 0;
        const headBobX = player.grounded ? Math.cos(phaseAngle) * 0.025 * speedRatio : 0;
        camera.position.set(player.x, player.y + 1.66 + headBobY, player.z);
        _lookPoint.set(
          camera.position.x - Math.sin(camYaw) * Math.cos(fpPitch),
          camera.position.y + Math.sin(fpPitch),
          camera.position.z - Math.cos(camYaw) * Math.cos(fpPitch),
        );
        camera.lookAt(_lookPoint);

        const breath = Math.sin(elapsed * 2.2) * 0.005;
        fpArms.group.position.set(headBobX * 0.6, -headBobY * 0.45 + breath, 0);
        fpArms.rightArm.rotation.x = 0.36 + flagRaise * 0.65 - Math.sin(phaseAngle) * 0.04 * speedRatio;
        fpArms.leftArm.rotation.x = 0.42 + Math.sin(phaseAngle) * 0.04 * speedRatio;
      } else {
        rig.visualRoot.visible = true;
        rig.shadowDisc.visible = true;
        fpArms.group.visible = false;

        _camTarget.set(player.x, player.y + 1.56, player.z);
        const horizDist = Math.cos(tpPitch) * camDistance;
        const vertDist = Math.sin(tpPitch) * camDistance;
        _camDesired.set(
          _camTarget.x + Math.sin(camYaw) * horizDist,
          Math.max(floorY + 1.1, _camTarget.y + vertDist),
          _camTarget.z + Math.cos(camYaw) * horizDist,
        );
        // Prevent third-person camera near-plane from clipping Platform 1 canopy eaves
        if (
          _camDesired.x >= -26 &&
          _camDesired.x <= 26 &&
          _camDesired.z >= -12.8 &&
          _camDesired.z <= -5.0
        ) {
          _camDesired.y = Math.min(_camDesired.y, 3.25);
        }

        const camSmooth = justEnteredPlaying || justSwitchedCam ? 1 : 1 - Math.exp(-12 * dt);
        camera.position.lerp(_camDesired, camSmooth);
        _lookPoint.set(_camTarget.x, _camTarget.y + 0.14, _camTarget.z);
        camera.lookAt(_lookPoint);
      }

      const nowBubble = performance.now();
      if (nowBubble - lastBubblePushTime >= 110) {
        lastBubblePushTime = nowBubble;
        const bubbles = modalOpenRef.current ? [] : world.getProjectedNpcBubbles(camera);
        const bSig = bubbles.map((b) => `${b.npcId}:${Math.round(b.screenX * 50)}:${Math.round(b.screenY * 50)}:${b.text}`).join('|');
        if (bSig !== lastBubbleSig) {
          lastBubbleSig = bSig;
          onBubblesUpdateRef.current(bubbles);
        }
      }

      pushHudSnapshot(false);
      pushDashboardSnapshot(false);
      pushUpgradeSnapshot(false);
      pushEmergencySnapshot(false);
      pushOperationsSnapshot(false);
    }

    function tick() {
      if (disposed) return;
      const now = performance.now();
      const rawDt = (now - lastTime) / 1000;
      lastTime = now;
      const dt = Math.min(Math.max(rawDt, 0.001), 0.05);

      stepSimulation(dt);
      renderer.render(world.scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    if (isSoftwareGl) {
      renderer.render(world.scene, camera);
      afterDraw(tick);
    } else {
      frameId = requestAnimationFrame(tick);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      resizeObserver.disconnect();
      window.removeEventListener('pointerdown', unlockAudioFromUserGesture, true);
      window.removeEventListener('keydown', unlockAudioFromUserGesture, true);
      window.removeEventListener('touchstart', unlockAudioFromUserGesture, true);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', clearInputs);
      document.removeEventListener('visibilitychange', clearInputs);
      document.removeEventListener('pointerlockchange', onPointerLockChangeInternal);
      document.removeEventListener('pointerlockerror', onPointerLockErrorInternal);
      document.removeEventListener('mousemove', onMouseMoveLocked);
      canvasEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      canvasEl.removeEventListener('wheel', onWheel);
      canvasEl.removeEventListener('webglcontextlost', onContextLost);
      if (document.pointerLockElement === canvasEl) {
        try {
          document.exitPointerLock();
        } catch {
          // Ignore
        }
      }
      canvasElRef.current = null;
      sound.dispose();
      envTex?.dispose();
      world.dispose();
      renderer.dispose();
    };
  }, []);

  return <div ref={mountRef} className="fixed inset-0 w-full h-full overflow-hidden" />;
}
