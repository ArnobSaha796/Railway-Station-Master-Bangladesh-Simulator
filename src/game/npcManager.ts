import {
  buildIncidentDialogue,
  buildPassengerQuestionDialogue,
  pickCollisionDialogue,
  ROLE_LABELS,
  STATION_INCIDENT_SPECS,
  VENDOR_CRIES_BN,
} from './npcDialogues';
import { buildAppearanceForRole, type NpcAnimationPose, type NpcVisualAppearance } from './npcModels';
import {
  findNavPath,
  findNearestNavNode,
  getNavNode,
  isNavNodeUnlocked,
  isPedestrianCrossingBlockedByTrain,
  NAV_NODES,
  type NavNode,
} from './npcNav';
import {
  groundHeightAt,
  NPC_ADULT_RADIUS,
  NPC_CHILD_RADIUS,
  PLAYER_RADIUS,
  resolveCircleAabbCollisions,
  resolveNpcPairCollisions,
  resolvePlayerNpcCollisions,
  type CapsuleEntity,
} from './physics';
import { applyXpAndRewards } from './rules';
import {
  buildEmergencyBanglaPa,
  buildLostChildDialogue,
  buildMissionVictimDialogue,
  buildMissionWitnessDialogue,
  buildPoliceOfficerDialogue,
  buildSuspectConfrontDialogue,
  EMERGENCY_MISSION_TEMPLATES,
  evaluateSecurityAchievements,
  MISSION_ROTATION_ORDER,
} from './securityMissions';
import {
  canPassengerBoardTrain,
  disembarkPassengerFromTrain,
  getTrainDoorWorldCoords,
  tryBoardPassengerOnTrain,
} from './trainManager';
import type {
  ActiveNpcDialogue,
  ActiveStationIncident,
  ColliderBox,
  EmergencyDashboardSnapshot,
  EmergencyMission,
  EmergencyMissionKind,
  NpcActivity,
  NpcDialogueChoice,
  NpcMemory,
  NpcPersonality,
  NpcRole,
  SecurityAchievement,
  SecurityOfficerStatus,
  StationEventKind,
  StationSimState,
  TrackId,
  TrainSimulationState,
} from './types';

export interface NpcAgent {
  id: string;
  name: string;
  nameBn: string;
  role: NpcRole;
  personality: NpcPersonality;
  appearance: NpcVisualAppearance;
  x: number;
  y: number;
  z: number;
  yaw: number;
  radius: number;
  baseSpeed: number;
  currentSpeed: number;
  distanceWalked: number;
  immovable: boolean;
  stationaryNodeId: string | null;

  activity: NpcActivity;
  pose: NpcAnimationPose;
  memory: NpcMemory;

  route: string[];
  routeIdx: number;
  targetNodeId: string | null;

  waitTimer: number;
  stumbleTimer: number;
  stumbleVelX: number;
  stumbleVelZ: number;
  collisionCooldown: number;
  talkCooldown: number;
  vendorCryTimer: number;

  wantsToTalk: boolean;
  incidentKind: StationEventKind | null;

  // Step 5 Security & Emergency State
  assignedMissionId: string | null;
  missionRole: 'victim' | 'witness' | 'suspect' | 'lost_child' | null;
  policePhase: 'patrol' | 'responding' | 'investigating' | 'pursuing' | 'escorting';
  policeActionTimer: number;
  suspectPhase: 'idle' | 'sneaking' | 'fleeing' | 'detained';
  suspectCooldown: number;

  speechText: string | null;
  speechSubText: string | null;
  speechTone: 'collision' | 'vendor' | 'question' | 'incident' | 'chatter' | 'police' | 'crime';
  speechTimer: number;

  lastProgressX: number;
  lastProgressZ: number;
  stuckTimer: number;
}

export interface NpcSimulationState {
  npcs: NpcAgent[];
  nextNpcSeq: number;
  activeIncident: ActiveStationIncident | null;
  incidentCooldown: number;
  nextIncidentIndex: number;
  nextQuestionVariant: number;
  recentCollisionIndices: number[];
  globalBubbleCooldown: number;
  questionOfferCooldown: number;
  simElapsedSec: number;
  targetCrowdSize: number;

  // Step 5 Mission & Security Registry
  missions: EmergencyMission[];
  resolvedMissions: EmergencyMission[];
  nextMissionSeq: number;
  nextMissionKindIndex: number;
  missionSpawnCooldown: number;

  // Step 6 Train Boarding & Disembarking Cadence
  disembarkCooldown?: number;
}

const BANGLA_NAMES: readonly { en: string; bn: string }[] = [
  { en: 'Rahim Uddin', bn: 'রহিম উদ্দিন' },
  { en: 'Karim Mia', bn: 'করিম মিয়া' },
  { en: 'Fatema Begum', bn: 'ফাতেমা বেগম' },
  { en: 'Rafiqul Islam', bn: 'রফিকুল ইসলাম' },
  { en: 'Nusrat Jahan', bn: 'নুসরাত জাহান' },
  { en: 'Tariq Mahmud', bn: 'তারিক মাহমুদ' },
  { en: 'Salma Khatun', bn: 'সালমা খাতুন' },
  { en: 'Jamal Hossain', bn: 'জামাল হোসেন' },
  { en: 'Mitu Akter', bn: 'মিতু আক্তার' },
  { en: 'Sajib Ahmed', bn: 'সজীব আহমেদ' },
  { en: 'Kamrul Hasan', bn: 'কামরুল হাসান' },
  { en: 'Ayesha Siddika', bn: 'আয়েশা সিদ্দিকা' },
  { en: 'Babul Mia', bn: 'বাবুল মিয়া' },
  { en: 'Nasrin Sultana', bn: 'নাসরিন সুলতানা' },
  { en: 'Farhan Chowdhury', bn: 'ফারহান চৌধুরী' },
  { en: 'Ratan Barua', bn: 'রতন বড়ুয়া' },
  { en: 'Monirul Haque', bn: 'মনিরুল হক' },
  { en: 'Shapla Rani', bn: 'শাপলা রানী' },
];

const PERSONALITIES: readonly NpcPersonality[] = [
  'friendly',
  'regular_commuter',
  'impatient',
  'confused',
  'angry',
  'elderly',
  'curious_child',
  'tourist',
];

function personalityForRole(role: NpcRole, seed: number): NpcPersonality {
  switch (role) {
    case 'elderly':
      return 'elderly';
    case 'child':
      return 'curious_child';
    case 'tourist':
      return 'tourist';
    case 'suspicious':
    case 'pickpocket':
      return 'impatient';
    case 'passenger':
    case 'student':
    case 'family':
      return PERSONALITIES[seed % 5];
    default:
      return seed % 2 === 0 ? 'friendly' : 'regular_commuter';
  }
}

function baseSpeedForRole(role: NpcRole): number {
  switch (role) {
    case 'elderly':
    case 'beggar':
      return 1.05;
    case 'child':
      return 1.85;
    case 'pickpocket':
    case 'porter':
      return 2.05;
    case 'tea_seller':
    case 'food_vendor':
    case 'fruit_seller':
    case 'newspaper_seller':
      return 1.35;
    case 'railway_police':
    case 'bd_police':
    case 'ticket_collector':
    case 'railway_employee':
      return 1.72;
    default:
      return 1.55;
  }
}

function createNpcAgent(
  id: string,
  seq: number,
  role: NpcRole,
  spawnNode: NavNode,
  opts?: {
    immovable?: boolean;
    stationaryNodeId?: string;
    guardianNpcId?: string | null;
    workZone?: string | null;
    assignedPlatform?: TrackId | null;
    targetTrainNumber?: string | null;
    targetDestinationBn?: string | null;
  },
): NpcAgent {
  const namePair = BANGLA_NAMES[seq % BANGLA_NAMES.length];
  const appearance = buildAppearanceForRole(role, seq + 3);
  const personality = personalityForRole(role, seq);
  const radius = role === 'child' ? NPC_CHILD_RADIUS : NPC_ADULT_RADIUS;

  return {
    id,
    name: namePair.en,
    nameBn: namePair.bn,
    role,
    personality,
    appearance,
    x: spawnNode.x,
    y: spawnNode.y,
    z: spawnNode.z,
    yaw: ((seq * 1.1) % (Math.PI * 2)) - Math.PI,
    radius,
    baseSpeed: baseSpeedForRole(role) + ((seq % 3) - 1) * 0.1,
    currentSpeed: 0,
    distanceWalked: seq * 0.7,
    immovable: Boolean(opts?.immovable),
    stationaryNodeId: opts?.stationaryNodeId ?? null,

    activity: opts?.immovable ? 'selling' : role === 'child' ? 'following_guardian' : 'walking',
    pose: opts?.immovable ? 'selling' : 'standing',
    memory: {
      assignedPlatform: opts?.assignedPlatform ?? (spawnNode.platform ?? null),
      targetTrainNumber: opts?.targetTrainNumber ?? null,
      targetDestinationBn: opts?.targetDestinationBn ?? null,
      guardianNpcId: opts?.guardianNpcId ?? null,
      carryingForNpcId: null,
      servingCustomerId: null,
      workZone: opts?.workZone ?? null,
      greetedPlayer: false,
      bumpedCount: 0,
      suspicionScore: role === 'pickpocket' || role === 'suspicious' ? 75 : 0,
      stolenItemLabel: null,
    },

    route: [],
    routeIdx: 0,
    targetNodeId: null,

    waitTimer: 0.4 + (seq % 5) * 0.45,
    stumbleTimer: 0,
    stumbleVelX: 0,
    stumbleVelZ: 0,
    collisionCooldown: 0,
    talkCooldown: 0,
    vendorCryTimer: 4 + (seq % 6) * 2.5,

    wantsToTalk: false,
    incidentKind: null,

    assignedMissionId: null,
    missionRole: null,
    policePhase: 'patrol',
    policeActionTimer: 0,
    suspectPhase: 'idle',
    suspectCooldown: 8 + (seq % 5) * 4,

    speechText: null,
    speechSubText: null,
    speechTone: 'chatter',
    speechTimer: 0,

    lastProgressX: spawnNode.x,
    lastProgressZ: spawnNode.z,
    stuckTimer: 0,
  };
}

function platformNavNodeIdsForTrack(trackId: TrackId | null, unlockedTracks = 2): string[] {
  if (trackId === 1) return ['p1_mw', 'p1_center', 'p1_me'];
  if (trackId === 2 || trackId === 3) return ['p2_mw', 'p2_center', 'p2_me'];
  if ((trackId === 4 || trackId === 5) && unlockedTracks >= 4) return ['p3_w', 'p3_center', 'p3_me'];
  if (trackId === 6 && unlockedTracks >= 6) return ['p4_w', 'p4_center', 'p4_cross'];
  return ['p2_mw', 'p2_center', 'p2_me'];
}

function getTargetNodeForNpc(
  npc: NpcAgent,
  trainState: TrainSimulationState,
  seqSeed: number,
  unlockedTracks = 2,
): NavNode {
  const pick = (ids: string[]): NavNode => {
    const valid = ids
      .map((id) => getNavNode(id))
      .filter((n): n is NavNode => Boolean(n && isNavNodeUnlocked(n, unlockedTracks)));
    if (valid.length === 0) return NAV_NODES[0];
    return valid[seqSeed % valid.length];
  };

  if (npc.role === 'porter') {
    const boardingTrain = trainState.trains.find(
      (t) => t.status === 'Boarding' || t.status === 'At Platform',
    );
    if (boardingTrain && boardingTrain.assignedPlatform && seqSeed % 2 === 0) {
      return pick(platformNavNodeIdsForTrack(boardingTrain.assignedPlatform, unlockedTracks));
    }
    return pick([
      'p1_center',
      'p1_e',
      'p2_center',
      'p2_me',
      'p3_center',
      'p4_center',
      'forecourt_c',
      'waiting_room',
      'ticket_counter',
    ]);
  }

  if (npc.role === 'tea_seller' || npc.role === 'food_vendor') {
    return pick(['p1_mw', 'p1_center', 'p1_me', 'p1_e', 'p2_mw', 'p2_center', 'p2_me', 'p3_center']);
  }

  if (npc.role === 'fruit_seller') {
    return pick(['fruit_stall', 'p1_cross', 'p1_e', 'forecourt_ramp_e', 'p2_cross', 'p3_cross']);
  }

  if (npc.role === 'newspaper_seller') {
    return pick(['book_stall', 'forecourt_c', 'tea_stall', 'p1_center', 'waiting_room', 'p2_center', 'p4_center']);
  }

  if (npc.role === 'railway_employee' || npc.role === 'ticket_collector') {
    return pick([
      'office_desk',
      'ticket_counter',
      'info_board_1',
      'p1_far_e',
      'p2_center',
      'p3_me',
      'p4_w',
      'info_board_2',
      'crossing_gate_west',
    ]);
  }

  if (npc.role === 'railway_police' || npc.role === 'bd_police') {
    return pick([
      'p1_center',
      'p1_w',
      'p1_e',
      'waiting_room',
      'ticket_counter',
      'forecourt_c',
      'p2_center',
      'p2_cross',
      'p3_center',
      'p4_center',
    ]);
  }

  if (npc.role === 'elderly') {
    return pick(['p1_bench_w', 'p1_bench_c', 'waiting_room', 'p2_bench_w', 'p2_bench_c', 'p3_bench_c']);
  }

  if (npc.role === 'beggar') {
    return pick(['forecourt_c', 'forecourt_w', 'tea_stall', 'p1_bench_e', 'village_lane_c', 'south_city_plaza']);
  }

  if (npc.role === 'suspicious' || npc.role === 'pickpocket') {
    return pick(['ticket_counter', 'waiting_room', 'tea_stall', 'p1_bench_e', 'p2_w', 'forecourt_e', 'p3_w']);
  }

  if (npc.role === 'tourist') {
    return pick(['info_board_1', 'office_desk', 'tea_stall', 'fb_n_top', 'p2_center', 'info_board_2', 'p4_center']);
  }

  // Passengers, Students, Families: follow realistic station routine!
  const activeTrain = trainState.trains.find(
    (t) =>
      (t.status === 'Boarding' || t.status === 'At Platform' || t.status === 'Approaching') &&
      t.assignedPlatform !== null,
  );
  if (activeTrain && activeTrain.assignedPlatform && seqSeed % 3 !== 0) {
    npc.memory.assignedPlatform = activeTrain.assignedPlatform;
    npc.memory.targetTrainNumber = activeTrain.trainNumber;
    npc.memory.targetDestinationBn = activeTrain.destinationBn;
    return pick(
      activeTrain.assignedPlatform === 1
        ? ['p1_mw', 'p1_center', 'p1_me', 'p1_bench_w', 'p1_bench_c', 'info_board_1']
        : platformNavNodeIdsForTrack(activeTrain.assignedPlatform, unlockedTracks),
    );
  }

  return pick([
    'ticket_counter',
    'waiting_room',
    'tea_stall',
    'jhalmuri_stall',
    'fruit_stall',
    'book_stall',
    'info_board_1',
    'info_board_2',
    'p1_bench_c',
    'p2_bench_c',
    'p3_center',
    'p4_center',
    'forecourt_c',
    'village_lane_c',
    'south_city_plaza',
  ]);
}

/**
 * Computes dynamic target crowd size based on live trains, rush hours, and station level.
 */
export function computeTargetCrowdSize(
  simState: StationSimState,
  trainState: TrainSimulationState,
): number {
  const hour = (simState.gameMinutes % 1440) / 60;
  const isRushHour = (hour >= 7 && hour <= 10) || (hour >= 16.5 && hour <= 20);
  const isWeekend = simState.dayNumber % 7 === 5 || simState.dayNumber % 7 === 6;
  const unlockedTracks = Math.max(2, Math.min(6, simState.unlockedTracks || 2));

  let activeTrainsWeight = 0;
  for (const t of trainState.trains) {
    if (t.status === 'Approaching' || t.status === 'Arriving') {
      activeTrainsWeight += t.category === 'intercity' || t.category === 'international' ? 5 : 3;
    } else if (t.status === 'At Platform' || t.status === 'Boarding') {
      activeTrainsWeight += t.category === 'intercity' || t.category === 'international' ? 6 : 4;
    }
  }

  const expansionBonus = Math.min(6, (unlockedTracks - 2) * 2);
  const base =
    19 +
    (isRushHour ? 3 : 0) +
    (isWeekend ? 2 : 0) +
    expansionBonus +
    Math.min(6, activeTrainsWeight);
  return Math.max(20, Math.min(36, base));
}

export function createInitialNpcSimulation(trainState?: TrainSimulationState): NpcSimulationState {
  const npcs: NpcAgent[] = [];
  let seq = 1;

  const add = (
    role: NpcRole,
    nodeId: string,
    opts?: Parameters<typeof createNpcAgent>[4],
  ): NpcAgent => {
    const node = getNavNode(nodeId) ?? NAV_NODES[0];
    const npc = createNpcAgent(`npc_${seq}`, seq, role, node, opts);
    const sameSpotCount = npcs.filter(
      (existing) => Math.hypot(existing.x - npc.x, existing.z - npc.z) < 0.85,
    ).length;
    if (sameSpotCount > 0) {
      const angle = sameSpotCount * 2.1;
      npc.x += Math.cos(angle) * 0.9;
      npc.z += Math.sin(angle) * 0.55;
      npc.y = groundHeightAt(npc.x, npc.z, npc.y);
    }
    seq++;
    npcs.push(npc);
    return npc;
  };

  // Stationary authentic stallkeepers behind counters
  const teaKeeperNode: NavNode = {
    id: 'tea_keeper_pos',
    x: 12.5,
    y: 0.65,
    z: -10.8,
    zone: 'stall',
    neighbors: [],
  };
  const teaKeeper = createNpcAgent(`npc_${seq}`, seq++, 'tea_seller', teaKeeperNode, {
    immovable: true,
    stationaryNodeId: 'tea_keeper_pos',
    workZone: "Mama's Cha Stall",
  });
  teaKeeper.yaw = 0;
  npcs.push(teaKeeper);

  const jhalmuriKeeperNode: NavNode = {
    id: 'jhalmuri_keeper_pos',
    x: -6.0,
    y: 0.65,
    z: 9.8,
    zone: 'stall',
    neighbors: [],
  };
  const jhalmuriKeeper = createNpcAgent(`npc_${seq}`, seq++, 'food_vendor', jhalmuriKeeperNode, {
    immovable: true,
    stationaryNodeId: 'jhalmuri_keeper_pos',
    workZone: 'Jhalmuri Kiosk',
  });
  jhalmuriKeeper.yaw = Math.PI;
  npcs.push(jhalmuriKeeper);

  // Mobile hawkers across platforms
  add('tea_seller', 'p1_mw', { workZone: 'Platform 1 Hawker' });
  add('food_vendor', 'p2_me', { workZone: 'Platform 2 Hawker' });
  add('fruit_seller', 'fruit_stall', { workZone: 'Platform 1 East' });
  add('newspaper_seller', 'forecourt_c', { workZone: 'Forecourt & Platform 1' });

  // Porters (Kuli)
  add('porter', 'p1_e', { workZone: 'Platform 1' });
  add('porter', 'p2_mw', { workZone: 'Platform 2' });

  // Staff & Law Enforcement (3 active officers covering Platform 1, Platform 2 & Forecourt)
  add('railway_employee', 'office_desk', { workZone: 'Station Master Office' });
  add('railway_employee', 'crossing_gate_west', { workZone: 'East Level Crossing' });
  add('ticket_collector', 'p1_center', { workZone: 'Platform 1 Gate' });
  add('railway_police', 'p1_w', { workZone: 'Platform 1 Security' });
  add('railway_police', 'p2_center', { workZone: 'Platform 2 Security' });
  add('bd_police', 'forecourt_ramp_e', { workZone: 'Station Forecourt & Gate' });

  // Diverse Passengers, Elderly, Students, Tourists, Families + Children, Beggar, Suspicious, Pickpocket
  const fam1 = add('family', 'waiting_room');
  add('child', 'waiting_room', { guardianNpcId: fam1.id });

  const fam2 = add('family', 'p2_bench_c');
  add('child', 'p2_bench_c', { guardianNpcId: fam2.id });

  add('elderly', 'p1_bench_w');
  add('elderly', 'p2_bench_w');
  add('student', 'ticket_counter');
  add('student', 'p1_me');
  add('tourist', 'info_board_1');
  add('tourist', 'forecourt_w');
  add('beggar', 'forecourt_e');
  add('suspicious', 'p1_far_e');
  add('pickpocket', 'ticket_counter');

  // General passengers spread across Platform 1, Platform 2, Forecourt, Village
  const passengerSpawns = ['p1_mw', 'p1_center', 'p1_cross', 'p2_center', 'p2_cross', 'village_lane_c'];
  for (const nodeId of passengerSpawns) {
    add('passenger', nodeId, {
      assignedPlatform: nodeId.startsWith('p2') ? 2 : 1,
      targetTrainNumber: trainState?.trains[0]?.trainNumber ?? '702',
      targetDestinationBn: trainState?.trains[0]?.destinationBn ?? 'চট্টগ্রাম',
    });
  }

  return {
    npcs,
    nextNpcSeq: seq,
    activeIncident: null,
    incidentCooldown: 28,
    nextIncidentIndex: 0,
    nextQuestionVariant: 0,
    recentCollisionIndices: [],
    globalBubbleCooldown: 0,
    questionOfferCooldown: 8,
    simElapsedSec: 0,
    targetCrowdSize: npcs.length,
    missions: [],
    resolvedMissions: [],
    nextMissionSeq: 1,
    nextMissionKindIndex: 0,
    missionSpawnCooldown: 6,
    disembarkCooldown: 0.6,
  };
}

function locationLabelFromCoords(x: number, y: number, z: number): string {
  if (y > 0.3) {
    if (z < -10.5 && x < -10) return 'Waiting Room / Ticket Counter';
    if (z < 0) return 'Platform 1';
    if (z <= 12.2) return 'Platform 2';
    if (z <= 28.8) return 'Island Platform 3';
    return 'South Glass Terminal (Platform 4)';
  }
  if (x > 30) return 'East Level Crossing';
  return z < 0 ? 'North City Forecourt' : 'South Metro Plaza';
}

function syncExpansionStaff(npcState: NpcSimulationState, unlockedTracks: number): void {
  if (unlockedTracks >= 4 && !npcState.npcs.some((n) => n.id === 'staff_p3_police')) {
    const p3PoliceNode = getNavNode('p3_center') ?? getNavNode('p2_center') ?? NAV_NODES[0];
    const p3EmpNode = getNavNode('p3_w') ?? p3PoliceNode;
    const p3TteNode = getNavNode('p3_e') ?? p3PoliceNode;

    const grpOfficer = createNpcAgent('staff_p3_police', npcState.nextNpcSeq++, 'railway_police', p3PoliceNode, {
      workZone: 'Platform 3 Security',
    });
    grpOfficer.speechText = '৩ নম্বর প্ল্যাটফর্মে টহল শুরু!';
    grpOfficer.speechSubText = 'Platform 3 Security Unit Active';
    grpOfficer.speechTone = 'police';
    grpOfficer.speechTimer = 4.0;

    const p3Staff = createNpcAgent('staff_p3_employee', npcState.nextNpcSeq++, 'railway_employee', p3EmpNode, {
      workZone: 'Platform 3 Operations',
    });
    const p3Tte = createNpcAgent('staff_p3_tte', npcState.nextNpcSeq++, 'ticket_collector', p3TteNode, {
      workZone: 'Platform 3 Ticket Check',
    });

    npcState.npcs.push(grpOfficer, p3Staff, p3Tte);
  }

  if (unlockedTracks >= 6 && !npcState.npcs.some((n) => n.id === 'staff_p4_bdpolice')) {
    const p4Node = getNavNode('p4_center') ?? getNavNode('p3_center') ?? NAV_NODES[0];
    const p4PorterNode = getNavNode('p4_e') ?? p4Node;

    const bdOfficer = createNpcAgent('staff_p4_bdpolice', npcState.nextNpcSeq++, 'bd_police', p4Node, {
      workZone: 'South Glass Terminal Security',
    });
    bdOfficer.speechText = 'টার্মিনাল ৪-এ নিরাপত্তা ইউনিট মোতায়েন!';
    bdOfficer.speechSubText = 'Terminal 4 Police Unit Deployed';
    bdOfficer.speechTone = 'police';
    bdOfficer.speechTimer = 4.2;

    const p4Porter = createNpcAgent('staff_p4_porter', npcState.nextNpcSeq++, 'porter', p4PorterNode, {
      workZone: 'South Terminal Luggage Desk',
    });

    npcState.npcs.push(bdOfficer, p4Porter);
  }
}

function clearMissionAssignmentsOnNpcs(npcState: NpcSimulationState, missionId: string) {
  for (const npc of npcState.npcs) {
    if (npc.assignedMissionId === missionId) {
      npc.assignedMissionId = null;
      npc.missionRole = null;
      npc.wantsToTalk = false;
      if (npc.role === 'railway_police' || npc.role === 'bd_police') {
        npc.policePhase = 'patrol';
        npc.policeActionTimer = 0;
        npc.activity = 'patrolling';
        npc.route = [];
      } else if (npc.role === 'pickpocket' || npc.role === 'suspicious') {
        npc.suspectPhase = 'idle';
        npc.memory.stolenItemLabel = null;
        npc.activity = 'walking';
        npc.route = [];
      } else {
        npc.activity = npc.role === 'child' ? 'following_guardian' : 'walking';
      }
    }
  }
}

function finalizeMissionOutcome(
  npcState: NpcSimulationState,
  simState: StationSimState,
  mission: EmergencyMission,
  succeeded: boolean,
  reasonMessage: string,
  nowMs: number,
  collectedClue = false,
): {
  simState: StationSimState;
  unlockedAchievement: SecurityAchievement | null;
} {
  const idx = npcState.missions.findIndex((m) => m.id === mission.id);
  if (idx !== -1) {
    npcState.missions.splice(idx, 1);
  }
  mission.status = succeeded ? 'resolved' : 'failed';
  mission.propActive = false;
  npcState.resolvedMissions.unshift(mission);
  if (npcState.resolvedMissions.length > 10) {
    npcState.resolvedMissions.pop();
  }
  clearMissionAssignmentsOnNpcs(npcState, mission.id);

  let nextSim = simState;
  let unlockedAchievement: SecurityAchievement | null = null;

  if (succeeded) {
    const baseUpdated: StationSimState = {
      ...nextSim,
      satisfaction: Math.min(100, nextSim.satisfaction + 6),
      securityRating: Math.min(100, nextSim.securityRating + (mission.isCrime ? 4 : 3)),
      crimesPrevented: nextSim.crimesPrevented + (mission.isCrime ? 1 : 0),
      emergenciesResolved: nextSim.emergenciesResolved + 1,
      successfulInteractions: nextSim.successfulInteractions + 1,
    };
    nextSim = applyXpAndRewards(
      baseUpdated,
      {
        moneyDelta: mission.rewardMoney,
        xpDelta: mission.rewardXp,
        repDelta: mission.rewardRep,
        message: reasonMessage,
      },
      nowMs,
    );
    const achRes = evaluateSecurityAchievements(nextSim, mission.kind, mission.isCrime, collectedClue);
    nextSim = achRes.simState;
    unlockedAchievement = achRes.unlockedAchievement;
  } else {
    nextSim = {
      ...nextSim,
      emergenciesFailed: nextSim.emergenciesFailed + 1,
      unresolvedIncidents: nextSim.unresolvedIncidents + 1,
      satisfaction: Math.max(0, nextSim.satisfaction - 6),
      reputation: Math.max(0, nextSim.reputation - mission.penaltyRep),
      securityRating: Math.max(0, nextSim.securityRating - (mission.isCrime ? 6 : 5)),
      lastEventMessage: reasonMessage,
      lastEventTimestamp: nowMs,
    };
  }

  return { simState: nextSim, unlockedAchievement };
}

/**
 * Spawns one of the 13 emergency or crime missions in the living station.
 */
export function spawnEmergencyMission(
  npcState: NpcSimulationState,
  simState: StationSimState,
  requestedKind?: EmergencyMissionKind,
  nowMs = Date.now(),
): {
  mission: EmergencyMission | null;
  simState: StationSimState;
  announcement: string | null;
} {
  if (npcState.missions.length >= 3 && !requestedKind) {
    return { mission: null, simState, announcement: null };
  }

  const activeKinds = new Set(npcState.missions.map((m) => m.kind));
  let kind: EmergencyMissionKind | undefined = requestedKind;
  if (!kind) {
    for (let offset = 0; offset < MISSION_ROTATION_ORDER.length; offset++) {
      const candidate =
        MISSION_ROTATION_ORDER[(npcState.nextMissionKindIndex + offset) % MISSION_ROTATION_ORDER.length];
      if (!activeKinds.has(candidate)) {
        kind = candidate;
        npcState.nextMissionKindIndex = (npcState.nextMissionKindIndex + offset + 1) % MISSION_ROTATION_ORDER.length;
        break;
      }
    }
  }
  if (!kind) return { mission: null, simState, announcement: null };

  const spec = EMERGENCY_MISSION_TEMPLATES[kind];
  const node = getNavNode(spec.defaultNodeId) ?? NAV_NODES[0];
  const missionId = `em_${npcState.nextMissionSeq++}`;

  let victimNpc: NpcAgent | undefined;
  let childNpc: NpcAgent | undefined;
  let suspectNpc: NpcAgent | undefined;

  if (kind === 'lost_child') {
    victimNpc =
      npcState.npcs.find((n) => !n.immovable && !n.assignedMissionId && n.role === 'family') ??
      npcState.npcs.find((n) => !n.immovable && !n.assignedMissionId && n.role === 'passenger');
    childNpc = npcState.npcs.find(
      (n) =>
        n.role === 'child' &&
        !n.assignedMissionId &&
        (victimNpc ? n.memory.guardianNpcId === victimNpc.id : true),
    ) ?? npcState.npcs.find((n) => n.role === 'child' && !n.assignedMissionId);

    // Place worried guardian at Waiting Room & wander child safely off tracks to Fruit Stall / Book Stall
    if (victimNpc) {
      const wr = getNavNode('waiting_room') ?? node;
      victimNpc.x = wr.x;
      victimNpc.y = wr.y;
      victimNpc.z = wr.z;
      victimNpc.route = [];
      victimNpc.waitTimer = 18;
      victimNpc.activity = 'panicking';
      victimNpc.pose = 'panicking';
      victimNpc.assignedMissionId = missionId;
      victimNpc.missionRole = 'victim';
      victimNpc.wantsToTalk = true;
      victimNpc.speechText = 'আমার ছেলেকে খুঁজে পাচ্ছি না!';
      victimNpc.speechSubText = 'Lost Child Alert!';
      victimNpc.speechTone = 'incident';
      victimNpc.speechTimer = 6.5;
    }
    if (childNpc) {
      const safeSpot = getNavNode('fruit_stall') ?? getNavNode('p1_e')!;
      childNpc.x = safeSpot.x;
      childNpc.y = safeSpot.y;
      childNpc.z = safeSpot.z;
      childNpc.route = [];
      childNpc.waitTimer = 25;
      childNpc.assignedMissionId = missionId;
      childNpc.missionRole = 'lost_child';
      childNpc.wantsToTalk = true;
      childNpc.speechText = 'আম্মুকে খুঁজছি...';
      childNpc.speechSubText = 'Lost Child (Safe near Fruit Stall)';
      childNpc.speechTone = 'incident';
      childNpc.speechTimer = 5.5;
    }
  } else {
    const preferredVictimRole: NpcRole =
      kind === 'elderly_emergency'
        ? 'elderly'
        : kind === 'fire_hazard'
          ? 'tea_seller'
          : kind === 'overcrowded_platform' || kind === 'ticket_fraud'
            ? 'ticket_collector'
            : 'passenger';
    victimNpc =
      npcState.npcs.find(
        (n) => !n.immovable && !n.assignedMissionId && n.role === preferredVictimRole,
      ) ??
      npcState.npcs.find(
        (n) =>
          !n.immovable &&
          !n.assignedMissionId &&
          n.role !== 'child' &&
          n.role !== 'railway_police' &&
          n.role !== 'bd_police',
      );
    if (victimNpc) {
      victimNpc.x = node.x;
      victimNpc.y = node.y;
      victimNpc.z = node.z;
      victimNpc.route = [];
      victimNpc.waitTimer = 16;
      victimNpc.assignedMissionId = missionId;
      victimNpc.missionRole = 'victim';
      victimNpc.wantsToTalk = true;
      victimNpc.activity = 'panicking';
      victimNpc.pose = 'panicking';
      victimNpc.speechText = `${spec.titleBn}!`;
      victimNpc.speechSubText = spec.title;
      victimNpc.speechTone = spec.isCrime ? 'crime' : 'incident';
      victimNpc.speechTimer = 6.0;
    }
  }

  // Assign suspect for crimes & track trespassing
  if (spec.isCrime && kind !== 'suspicious_package' && kind !== 'passenger_fighting') {
    suspectNpc =
      npcState.npcs.find(
        (n) =>
          !n.immovable &&
          !n.assignedMissionId &&
          (n.role === 'pickpocket' || n.role === 'suspicious'),
      ) ??
      npcState.npcs.find(
        (n) =>
          !n.immovable &&
          !n.assignedMissionId &&
          n.id !== victimNpc?.id &&
          n.role !== 'child' &&
          n.role !== 'railway_police' &&
          n.role !== 'bd_police',
      );
    if (suspectNpc) {
      const suspectStart =
        kind === 'restricted_track_trespass'
          ? getNavNode('p1_cross')!
          : kind === 'mobile_theft'
            ? getNavNode('forecourt_e')!
            : getNavNode('ticket_counter')!;
      suspectNpc.x = suspectStart.x + (kind === 'restricted_track_trespass' ? 0.2 : 0.6);
      suspectNpc.z = suspectStart.z + (kind === 'restricted_track_trespass' ? 1.85 : 0);
      suspectNpc.y = groundHeightAt(suspectNpc.x, suspectNpc.z, suspectStart.y);
      suspectNpc.route = [];
      suspectNpc.waitTimer = 4;
      suspectNpc.assignedMissionId = missionId;
      suspectNpc.missionRole = 'suspect';
      suspectNpc.suspectPhase = 'sneaking';
      suspectNpc.activity = 'sneaking';
      suspectNpc.pose = 'sneaking';
      suspectNpc.wantsToTalk = true;
      suspectNpc.memory.stolenItemLabel =
        kind === 'luggage_theft'
          ? 'Blue Suitcase'
          : kind === 'mobile_theft'
            ? 'Smartphone'
            : kind === 'pickpocket_caught'
              ? 'Wallet'
              : 'Forged Tickets';
      suspectNpc.speechText = kind === 'restricted_track_trespass' ? 'শর্টকাটে পার হব...' : 'তাড়াতাড়ি সরে পড়ি...';
      suspectNpc.speechSubText = kind === 'restricted_track_trespass' ? 'Track Trespasser' : 'Suspicious';
      suspectNpc.speechTone = 'crime';
      suspectNpc.speechTimer = 4.5;
    }
  }

  // Pick 1-2 nearby witness NPCs so player can gather investigative clues
  const witnessIds: string[] = [];
  for (const cand of npcState.npcs) {
    if (witnessIds.length >= 2) break;
    if (
      cand.id === victimNpc?.id ||
      cand.id === suspectNpc?.id ||
      cand.id === childNpc?.id ||
      cand.assignedMissionId ||
      cand.role === 'child' ||
      cand.role === 'railway_police' ||
      cand.role === 'bd_police'
    ) {
      continue;
    }
    if (Math.hypot(cand.x - node.x, cand.z - node.z) < 22) {
      cand.assignedMissionId = missionId;
      cand.missionRole = 'witness';
      cand.wantsToTalk = true;
      witnessIds.push(cand.id);
    }
  }

  const propOffsetX = kind === 'fire_hazard' ? -1.4 : kind === 'suspicious_package' ? 0.6 : 0.8;
  const propOffsetZ = kind === 'fire_hazard' ? 0.6 : 0.3;

  const mission: EmergencyMission = {
    id: missionId,
    kind,
    isCrime: spec.isCrime,
    title: spec.title,
    titleBn: spec.titleBn,
    objective: spec.objective,
    objectiveBn: spec.objectiveBn,
    locationLabel: spec.locationLabel,
    targetNodeId: spec.defaultNodeId,
    x: (victimNpc?.x ?? node.x) + (spec.propKind ? propOffsetX : 0),
    y: victimNpc?.y ?? node.y,
    z: (victimNpc?.z ?? node.z) + (spec.propKind ? propOffsetZ : 0),
    severity: spec.severity,
    status: 'reported',
    timeRemainingSec: spec.maxTimeSec,
    maxTimeSec: spec.maxTimeSec,
    victimNpcId: victimNpc?.id ?? null,
    suspectNpcId: suspectNpc?.id ?? null,
    childNpcId: childNpc?.id ?? null,
    witnessNpcIds: witnessIds,
    assignedOfficerIds: [],
    cluesCollected: [],
    suspectIdentified: false,
    areaSecured: false,
    hasHazardProp: Boolean(spec.propKind),
    propKind: spec.propKind,
    propActive: Boolean(spec.propKind),
    rewardMoney: spec.rewardMoney,
    rewardXp: spec.rewardXp,
    rewardRep: spec.rewardRep,
    penaltyRep: spec.penaltyRep,
  };

  npcState.missions.push(mission);

  const nextSim: StationSimState = {
    ...simState,
    lastEventMessage: `EMERGENCY ALERT: ${mission.title} (${mission.titleBn}) at ${mission.locationLabel} — Press [G] Security Center or [E] on scene!`,
    lastEventTimestamp: nowMs,
  };

  return {
    mission,
    simState: nextSim,
    announcement: spec.paNoticeBn,
  };
}

/**
 * Dispatches a Railway Police or Bangladesh Police officer on foot via A* pathfinding.
 * Officers NEVER teleport!
 */
export function dispatchOfficerToMission(
  npcState: NpcSimulationState,
  simState: StationSimState,
  missionId: string,
  preferredOfficerId?: string,
  nowMs = Date.now(),
): {
  dispatched: boolean;
  officer: NpcAgent | null;
  simState: StationSimState;
} {
  const mission = npcState.missions.find((m) => m.id === missionId);
  if (!mission) return { dispatched: false, officer: null, simState };

  const allOfficers = npcState.npcs.filter(
    (n) => n.role === 'railway_police' || n.role === 'bd_police',
  );
  if (allOfficers.length === 0) {
    return { dispatched: false, officer: null, simState };
  }

  let officer: NpcAgent | undefined;
  if (preferredOfficerId) {
    officer = allOfficers.find((o) => o.id === preferredOfficerId);
  }
  if (!officer) {
    const freeOfficers = allOfficers.filter((o) => !o.assignedMissionId);
    const pool = freeOfficers.length > 0 ? freeOfficers : allOfficers;
    pool.sort(
      (a, b) =>
        Math.hypot(a.x - mission.x, a.z - mission.z) -
        Math.hypot(b.x - mission.x, b.z - mission.z),
    );
    officer = pool[0];
  }
  if (!officer) return { dispatched: false, officer: null, simState };

  // Reassign cleanly if previously on another mission
  if (officer.assignedMissionId && officer.assignedMissionId !== mission.id) {
    const prev = npcState.missions.find((m) => m.id === officer!.assignedMissionId);
    if (prev) {
      prev.assignedOfficerIds = prev.assignedOfficerIds.filter((id) => id !== officer!.id);
    }
  }

  officer.assignedMissionId = mission.id;
  officer.policePhase = 'responding';
  officer.policeActionTimer = 0;
  officer.waitTimer = 0;
  officer.activity = 'responding_emergency';

  const startNode = findNearestNavNode(officer.x, officer.y, officer.z, true);
  const path = findNavPath(startNode.id, mission.targetNodeId, { avoidTrackHazards: false });
  officer.route = path;
  officer.routeIdx = 0;
  officer.targetNodeId = mission.targetNodeId;
  officer.speechText = 'পুলিশ এগিয়ে যাচ্ছে!';
  officer.speechSubText = `Dispatching to ${mission.locationLabel}`;
  officer.speechTone = 'police';
  officer.speechTimer = 4.2;

  if (!mission.assignedOfficerIds.includes(officer.id)) {
    mission.assignedOfficerIds.push(officer.id);
  }
  if (mission.status === 'reported' || mission.status === 'investigating') {
    mission.status = 'officer_dispatched';
  }

  const nextSim: StationSimState = {
    ...simState,
    lastEventMessage: `${officer.name} (${ROLE_LABELS[officer.role].en}) dispatched on foot to ${mission.title} at ${mission.locationLabel}!`,
    lastEventTimestamp: nowMs,
  };

  return { dispatched: true, officer, simState: nextSim };
}

export function requestSecurityPatrolSweep(
  npcState: NpcSimulationState,
  simState: StationSimState,
  nowMs = Date.now(),
): { simState: StationSimState; officersActivated: number } {
  let count = 0;
  const targets = ['p1_center', 'p2_center', 'forecourt_c', 'ticket_counter'];
  for (const n of npcState.npcs) {
    if ((n.role === 'railway_police' || n.role === 'bd_police') && !n.assignedMissionId) {
      const start = findNearestNavNode(n.x, n.y, n.z, true);
      const goal = targets[count % targets.length];
      n.route = findNavPath(start.id, goal, { avoidTrackHazards: true });
      n.routeIdx = 0;
      n.waitTimer = 0;
      n.activity = 'patrolling';
      n.speechText = 'নিরাপত্তা টহল জোরদার করা হয়েছে!';
      n.speechSubText = 'Patrol Sweep Active';
      n.speechTone = 'police';
      n.speechTimer = 3.6;
      count++;
    }
  }
  const nextSim = applyXpAndRewards(
    { ...simState, securityRating: Math.min(100, simState.securityRating + 1) },
    {
      xpDelta: 10,
      repDelta: 1,
      message: `Security patrol sweep ordered (${count} officers actively scanning platforms & concourse).`,
    },
    nowMs,
  );
  return { simState: nextSim, officersActivated: count };
}

export function interactWithEmergencyHazard(
  npcState: NpcSimulationState,
  simState: StationSimState,
  missionId: string,
  nowMs = Date.now(),
): {
  npcState: NpcSimulationState;
  simState: StationSimState;
  resolved: boolean;
  sound: 'whistle' | 'radio' | 'coin';
  unlockedAchievement: SecurityAchievement | null;
} {
  const mission = npcState.missions.find((m) => m.id === missionId);
  if (!mission) {
    return { npcState, simState, resolved: false, sound: 'coin', unlockedAchievement: null };
  }

  if (mission.kind === 'fire_hazard') {
    const res = finalizeMissionOutcome(
      npcState,
      simState,
      mission,
      true,
      `Extinguished Fire Hazard near Tea Stall! (+${mission.rewardMoney} coins, +${mission.rewardXp} XP)`,
      nowMs,
    );
    return {
      npcState,
      simState: res.simState,
      resolved: true,
      sound: 'whistle',
      unlockedAchievement: res.unlockedAchievement,
    };
  }

  if (mission.kind === 'suspicious_package') {
    const res = finalizeMissionOutcome(
      npcState,
      simState,
      mission,
      true,
      `Secured perimeter & cleared Suspicious Package with BD Police! (+${mission.rewardMoney} coins, +${mission.rewardXp} XP)`,
      nowMs,
    );
    return {
      npcState,
      simState: res.simState,
      resolved: true,
      sound: 'radio',
      unlockedAchievement: res.unlockedAchievement,
    };
  }

  if (mission.kind === 'luggage_theft') {
    const res = finalizeMissionOutcome(
      npcState,
      simState,
      mission,
      true,
      `Recovered stolen Blue Suitcase & prevented luggage theft! (+${mission.rewardMoney} coins, +${mission.rewardXp} XP)`,
      nowMs,
    );
    return {
      npcState,
      simState: res.simState,
      resolved: true,
      sound: 'whistle',
      unlockedAchievement: res.unlockedAchievement,
    };
  }

  return { npcState, simState, resolved: false, sound: 'coin', unlockedAchievement: null };
}

export function buildEmergencyDashboardSnapshot(
  npcState: NpcSimulationState,
  simState: StationSimState,
): EmergencyDashboardSnapshot {
  const officers: SecurityOfficerStatus[] = npcState.npcs
    .filter((n): n is NpcAgent & { role: 'railway_police' | 'bd_police' } =>
      n.role === 'railway_police' || n.role === 'bd_police',
    )
    .map((o) => ({
      npcId: o.id,
      name: o.name,
      nameBn: o.nameBn,
      role: o.role,
      roleLabel: o.role === 'railway_police' ? 'Railway Police (GRP)' : 'Bangladesh Police',
      statusLabel:
        o.policePhase === 'patrol'
          ? 'Patrolling'
          : o.policePhase === 'responding'
            ? 'En Route (On Foot)'
            : o.policePhase === 'investigating'
              ? 'Investigating Scene'
              : o.policePhase === 'pursuing'
                ? 'Pursuing Suspect'
                : 'Escorting / Securing',
      assignedMissionId: o.assignedMissionId,
      locationLabel: locationLabelFromCoords(o.x, o.y, o.z),
      x: o.x,
      z: o.z,
    }));

  return {
    securityRating: simState.securityRating,
    crimesPrevented: simState.crimesPrevented,
    emergenciesResolved: simState.emergenciesResolved,
    emergenciesFailed: simState.emergenciesFailed,
    activeMissions: npcState.missions.map((m) => ({ ...m })),
    recentResolvedMissions: npcState.resolvedMissions.slice(0, 6).map((m) => ({ ...m })),
    officers,
    achievements: simState.achievements.map((a) => ({ ...a })),
  };
}

export function broadcastMissionBanglaPa(
  npcState: NpcSimulationState,
  missionId: string,
): string | null {
  const mission = npcState.missions.find((m) => m.id === missionId);
  if (!mission) return null;
  mission.areaSecured = true;
  return buildEmergencyBanglaPa(mission);
}

export interface NpcStepEvents {
  playBumpSound: boolean;
  playVendorSound: boolean;
  playWhistle: boolean;
  playRadio: boolean;
  playSiren: boolean;
  bumpLineBn: string | null;
  bumpLineEn: string | null;
  newIncident: ActiveStationIncident | null;
  expiredIncident: ActiveStationIncident | null;
  newMission: EmergencyMission | null;
  resolvedMission: EmergencyMission | null;
  failedMission: EmergencyMission | null;
  unlockedAchievement: SecurityAchievement | null;
  announcementBn: string | null;
}

export function stepNpcSimulation(
  npcState: NpcSimulationState,
  simState: StationSimState,
  trainState: TrainSimulationState,
  player: { x: number; y: number; z: number },
  colliders: readonly ColliderBox[],
  dt: number,
): {
  npcState: NpcSimulationState;
  simState: StationSimState;
  playerX: number;
  playerZ: number;
  events: NpcStepEvents;
} {
  let nextSimState = simState;
  npcState.simElapsedSec += dt;
  npcState.globalBubbleCooldown = Math.max(0, npcState.globalBubbleCooldown - dt);
  npcState.questionOfferCooldown = Math.max(0, npcState.questionOfferCooldown - dt);

  const events: NpcStepEvents = {
    playBumpSound: false,
    playVendorSound: false,
    playWhistle: false,
    playRadio: false,
    playSiren: false,
    bumpLineBn: null,
    bumpLineEn: null,
    newIncident: null,
    expiredIncident: null,
    newMission: null,
    resolvedMission: null,
    failedMission: null,
    unlockedAchievement: null,
    announcementBn: null,
  };

  // 1. Dynamic Crowd Spawning / Despawning + Train Disembarking with Luggage
  const targetCrowd = computeTargetCrowdSize(nextSimState, trainState);
  npcState.targetCrowdSize = targetCrowd;

  const unlockedTracks = Math.max(2, Math.min(6, nextSimState.unlockedTracks || trainState.unlockedTracks || 2));
  syncExpansionStaff(npcState, unlockedTracks);

  // Step 6 Disembark arriving passengers cleanly from open train doorways
  npcState.disembarkCooldown = (npcState.disembarkCooldown ?? 0.5) - dt;
  if (npcState.disembarkCooldown <= 0) {
    npcState.disembarkCooldown = 0.7;
    const disembarkTrain = trainState.trains.find(
      (t) =>
        (t.status === 'At Platform' || t.status === 'Boarding') &&
        t.doorState === 'open' &&
        t.doorOpenProgress >= 0.7 &&
        t.disembarkRemaining > 0 &&
        t.coaches.length > 0,
    );
    if (disembarkTrain && npcState.npcs.length < targetCrowd + 8) {
      const doors = getTrainDoorWorldCoords(disembarkTrain);
      const door = doors[disembarkTrain.disembarkRemaining % doors.length] ?? doors[0];
      disembarkPassengerFromTrain(disembarkTrain, door.coachIndex);
      disembarkTrain.disembarkRemaining = Math.max(0, disembarkTrain.disembarkRemaining - 1);

      const exitNodes =
        unlockedTracks >= 6
          ? ['waiting_room', 'station_entrance', 'forecourt_c', 'south_city_plaza']
          : door.platformSideSign < 0
            ? ['waiting_room', 'station_entrance', 'forecourt_c', 'fb_s_base']
            : unlockedTracks <= 2
              ? ['village_lane_c', 'fb_n_base', 'waiting_room', 'forecourt_c']
              : ['fb_n_base', 'waiting_room', 'forecourt_c'];
      const seq = npcState.nextNpcSeq++;
      const disembarkRoles: NpcRole[] = ['passenger', 'elderly', 'family', 'tourist', 'porter'];
      const role = disembarkRoles[seq % disembarkRoles.length];
      const spawnOffset = ((seq % 3) - 1) * 0.36;
      const exitNode = getNavNode(exitNodes[seq % exitNodes.length]) ?? NAV_NODES[0];
      const platTrack = disembarkTrain.assignedPlatform ?? 1;
      const spawnNodeLike: NavNode = {
        id: `door_exit_${seq}`,
        x: door.doorX + spawnOffset,
        y: 0.65,
        z: disembarkTrain.z + door.platformSideSign * 1.78,
        zone:
          platTrack === 1
            ? 'platform1'
            : platTrack <= 3
              ? 'platform2'
              : platTrack <= 5
                ? 'platform3'
                : 'platform4',
        platform: platTrack,
        neighbors: [],
      };
      const arrivedNpc = createNpcAgent(`npc_${seq}`, seq, role, spawnNodeLike, {
        assignedPlatform: platTrack,
        targetTrainNumber: disembarkTrain.trainNumber,
        targetDestinationBn: disembarkTrain.destinationBn,
      });
      arrivedNpc.yaw = door.platformSideSign < 0 ? Math.PI : 0;
      arrivedNpc.activity = 'carrying_luggage';
      arrivedNpc.pose = 'carrying_luggage';
      arrivedNpc.waitTimer = 0;
      arrivedNpc.memory.boardingStage = 'disembarking';
      arrivedNpc.memory.disembarkedFromTrainId = disembarkTrain.id;

      const nearest = findNearestNavNode(arrivedNpc.x, arrivedNpc.y, arrivedNpc.z, true, unlockedTracks);
      const path = findNavPath(nearest.id, exitNode.id, {
        avoidTrackHazards:
          isPedestrianCrossingBlockedByTrain(trainState.trains) ||
          role === 'elderly' ||
          role === 'family',
        unlockedTracks,
      });
      arrivedNpc.route = path;
      arrivedNpc.routeIdx = 0;
      arrivedNpc.targetNodeId = exitNode.id;

      if (npcState.globalBubbleCooldown <= 0) {
        arrivedNpc.speechText = 'পৌঁছে গেছি স্টেশনে!';
        arrivedNpc.speechSubText = `Disembarked from ${disembarkTrain.name}`;
        arrivedNpc.speechTone = 'chatter';
        arrivedNpc.speechTimer = 3.2;
        npcState.globalBubbleCooldown = 2.0;
      }
      npcState.npcs.push(arrivedNpc);
    }
  }

  if (npcState.npcs.length < targetCrowd && Math.floor(npcState.simElapsedSec * 2) % 6 === 0) {
    const boardingTrain = trainState.trains.find(
      (t) => t.status === 'At Platform' || t.status === 'Boarding',
    );
    const platNodes = boardingTrain?.assignedPlatform
      ? platformNavNodeIdsForTrack(boardingTrain.assignedPlatform, unlockedTracks)
      : ['station_entrance'];
    const spawnNodeId = platNodes[npcState.nextNpcSeq % platNodes.length] ?? 'station_entrance';
    const spawnNode = getNavNode(spawnNodeId) ?? NAV_NODES[0];
    const seq = npcState.nextNpcSeq++;
    const rolesPool: NpcRole[] = ['passenger', 'passenger', 'student', 'tourist', 'porter', 'elderly'];
    const role = rolesPool[seq % rolesPool.length];
    const newNpc = createNpcAgent(`npc_${seq}`, seq, role, spawnNode, {
      assignedPlatform: boardingTrain?.assignedPlatform ?? 1,
      targetTrainNumber: boardingTrain?.trainNumber ?? null,
      targetDestinationBn: boardingTrain?.destinationBn ?? null,
    });
    if (boardingTrain && boardingTrain.assignedPlatform) {
      newNpc.activity = 'waiting_platform';
    }
    npcState.npcs.push(newNpc);
  } else if (npcState.npcs.length > targetCrowd + 3) {
    const idx = npcState.npcs.findIndex(
      (n) =>
        n.role === 'passenger' &&
        !n.immovable &&
        !n.incidentKind &&
        !n.assignedMissionId &&
        n.memory.boardingStage !== 'queuing' &&
        n.memory.boardingStage !== 'stepping_in' &&
        Math.hypot(n.x - player.x, n.z - player.z) > 12,
    );
    if (idx !== -1) {
      npcState.npcs.splice(idx, 1);
    }
  }

  // 2. Step Active Security & Emergency Missions Countdown & Spawning
  for (let mIdx = npcState.missions.length - 1; mIdx >= 0; mIdx--) {
    const m = npcState.missions[mIdx];
    m.timeRemainingSec = Math.max(0, m.timeRemainingSec - dt);
    if (m.timeRemainingSec <= 0) {
      const failRes = finalizeMissionOutcome(
        npcState,
        nextSimState,
        m,
        false,
        `Mission Failed / Expired: ${m.title} (${m.titleBn}). Security Rating decreased!`,
        Date.now(),
      );
      nextSimState = failRes.simState;
      events.failedMission = m;
    }
  }

  npcState.missionSpawnCooldown -= dt;
  if (npcState.missionSpawnCooldown <= 0) {
    if (npcState.missions.length < 2) {
      const spawned = spawnEmergencyMission(npcState, nextSimState, undefined, Date.now());
      if (spawned.mission) {
        nextSimState = spawned.simState;
        events.newMission = spawned.mission;
        events.playSiren = true;
        events.announcementBn = spawned.announcement;
      }
    }
    npcState.missionSpawnCooldown = 34;
  }

  // 3. Legacy Random Station Quick Incident Timer & Expiry (for non-mission quick Q&A variety)
  if (npcState.activeIncident) {
    if (npcState.simElapsedSec >= npcState.activeIncident.expiresAtSec) {
      const expired = npcState.activeIncident;
      const host = npcState.npcs.find((n) => n.id === expired.npcId);
      if (host) {
        host.incidentKind = null;
        host.wantsToTalk = false;
      }
      npcState.activeIncident = null;
      npcState.incidentCooldown = 40;
      nextSimState = {
        ...nextSimState,
        unresolvedIncidents: nextSimState.unresolvedIncidents + 1,
        satisfaction: Math.max(0, nextSimState.satisfaction - 3),
        reputation: Math.max(0, nextSimState.reputation - 2),
        lastEventMessage: `Unresolved station incident: ${expired.title} (${expired.titleBn}).`,
        lastEventTimestamp: Date.now(),
      };
      events.expiredIncident = expired;
    }
  } else {
    npcState.incidentCooldown -= dt;
    if (npcState.incidentCooldown <= 0) {
      const spec = STATION_INCIDENT_SPECS[npcState.nextIncidentIndex % STATION_INCIDENT_SPECS.length];
      npcState.nextIncidentIndex++;
      const host =
        npcState.npcs.find(
          (n) => !n.immovable && !n.assignedMissionId && n.role === spec.preferredRole && !n.incidentKind,
        ) ??
        npcState.npcs.find(
          (n) => !n.immovable && !n.assignedMissionId && n.role !== 'child' && !n.incidentKind,
        );
      if (host) {
        host.incidentKind = spec.kind;
        host.wantsToTalk = true;
        host.speechText = `${spec.titleBn}!`;
        host.speechSubText = spec.title;
        host.speechTone = 'incident';
        host.speechTimer = 5.5;
        const inc: ActiveStationIncident = {
          id: `inc_${npcState.nextIncidentIndex}`,
          kind: spec.kind,
          title: spec.title,
          titleBn: spec.titleBn,
          locationLabel: host.y > 0.3 ? (host.z < 0 ? 'Platform 1' : 'Platform 2') : 'Station Forecourt',
          npcId: host.id,
          x: host.x,
          z: host.z,
          expiresAtSec: npcState.simElapsedSec + 95,
        };
        npcState.activeIncident = inc;
        events.newIncident = inc;
      }
      npcState.incidentCooldown = 44;
    }
  }

  // 4. Periodically mark a nearby passenger as wanting to ask a question
  if (npcState.questionOfferCooldown <= 0) {
    const existingAskers = npcState.npcs.filter(
      (n) => n.wantsToTalk && !n.incidentKind && !n.assignedMissionId,
    ).length;
    if (existingAskers < 2) {
      const candidate = npcState.npcs.find(
        (n) =>
          !n.immovable &&
          !n.incidentKind &&
          !n.assignedMissionId &&
          !n.wantsToTalk &&
          n.talkCooldown <= 0 &&
          (n.role === 'passenger' || n.role === 'elderly' || n.role === 'tourist' || n.role === 'student') &&
          Math.hypot(n.x - player.x, n.z - player.z) < 13 &&
          Math.abs(n.y - player.y) < 1.2,
      );
      if (candidate) {
        candidate.wantsToTalk = true;
        candidate.speechText = 'মাস্টার সাহেব, একটা কথা ছিল?';
        candidate.speechSubText = 'Excuse me, Station Master?';
        candidate.speechTone = 'question';
        candidate.speechTimer = 4.5;
        npcState.questionOfferCooldown = 14;
      }
    }
  }

  const crossingBlocked = isPedestrianCrossingBlockedByTrain(trainState.trains);
  const npcById = new Map<string, NpcAgent>();
  for (const n of npcState.npcs) npcById.set(n.id, n);

  const missionById = new Map<string, EmergencyMission>();
  for (const m of npcState.missions) missionById.set(m.id, m);

  // Track which trains can accept boarding right now and track queued/stepping counts per doorway
  const openBoardableTrains = trainState.trains.filter((t) => canPassengerBoardTrain(t).allowed);
  const boardingTrainById = new Map(trainState.trains.map((t) => [t.id, t]));
  const steppingDoorKeys = new Set<string>();
  const queuedCountByDoor = new Map<string, number>();
  for (const existing of npcState.npcs) {
    if (existing.memory.boardingTrainId && existing.memory.targetCoachIndex !== undefined && existing.memory.targetCoachIndex !== null) {
      const key = `${existing.memory.boardingTrainId}_${existing.memory.targetCoachIndex}`;
      if (existing.memory.boardingStage === 'stepping_in') {
        steppingDoorKeys.add(key);
      } else if (existing.memory.boardingStage === 'queuing') {
        queuedCountByDoor.set(key, (queuedCountByDoor.get(key) ?? 0) + 1);
      }
    }
  }
  const boardedNpcIndices: number[] = [];

  // 5. Advance every NPC's routine, police AI, suspect AI, passenger boarding, pathfinding & animation pose
  for (let i = 0; i < npcState.npcs.length; i++) {
    const npc = npcState.npcs[i];
    npc.collisionCooldown = Math.max(0, npc.collisionCooldown - dt);
    npc.talkCooldown = Math.max(0, npc.talkCooldown - dt);
    npc.suspectCooldown = Math.max(0, npc.suspectCooldown - dt);

    if (npc.speechTimer > 0) {
      npc.speechTimer = Math.max(0, npc.speechTimer - dt);
      if (npc.speechTimer === 0) {
        npc.speechText = null;
        npc.speechSubText = null;
      }
    }

    // Vendor hawker cries
    if (
      npc.role === 'tea_seller' ||
      npc.role === 'food_vendor' ||
      npc.role === 'fruit_seller' ||
      npc.role === 'newspaper_seller'
    ) {
      npc.vendorCryTimer -= dt;
      if (npc.vendorCryTimer <= 0) {
        npc.vendorCryTimer = 11 + ((i * 3) % 7);
        const cries = VENDOR_CRIES_BN[npc.role];
        const cry = cries[(Math.floor(npcState.simElapsedSec) + i) % cries.length];
        if (!npc.speechText && Math.hypot(npc.x - player.x, npc.z - player.z) < 22) {
          npc.speechText = cry.bn;
          npc.speechSubText = cry.en;
          npc.speechTone = 'vendor';
          npc.speechTimer = 3.2;
          events.playVendorSound = true;
        }
      }
    }

    // Stumbling reaction takes brief priority
    if (npc.stumbleTimer > 0) {
      npc.stumbleTimer = Math.max(0, npc.stumbleTimer - dt);
      npc.currentSpeed = 0;
      npc.pose = 'stumbling';
      if (!npc.immovable) {
        npc.x += npc.stumbleVelX * dt;
        npc.z += npc.stumbleVelZ * dt;
        npc.stumbleVelX *= Math.exp(-6 * dt);
        npc.stumbleVelZ *= Math.exp(-6 * dt);
        const res = resolveCircleAabbCollisions(npc.x, npc.z, npc.y, npc.radius, colliders);
        npc.x = res.x;
        npc.z = res.z;
        npc.y = groundHeightAt(npc.x, npc.z, npc.y, unlockedTracks);
      }
      continue;
    }

    if (npc.immovable) {
      npc.currentSpeed = 0;
      npc.pose = npc.role === 'tea_seller' || npc.role === 'food_vendor' ? 'selling' : 'standing';
      continue;
    }

    // STEP 5 POLICE RESPONSE AI (Strictly walks via A* & never teleports!)
    if ((npc.role === 'railway_police' || npc.role === 'bd_police') && npc.assignedMissionId) {
      const mission = missionById.get(npc.assignedMissionId);
      if (!mission) {
        npc.assignedMissionId = null;
        npc.policePhase = 'patrol';
        npc.activity = 'patrolling';
        npc.route = [];
      } else {
        if (npc.policePhase === 'investigating') {
          npc.currentSpeed = 0;
          npc.pose = 'investigating';
          npc.policeActionTimer -= dt;
          if (npc.policeActionTimer <= 0) {
            if (mission.kind === 'lost_child' && mission.childNpcId) {
              const child = npcById.get(mission.childNpcId);
              if (child) {
                npc.policePhase = 'escorting';
                npc.activity = 'escorting';
                const startN = findNearestNavNode(npc.x, npc.y, npc.z, true, unlockedTracks);
                const childN = findNearestNavNode(child.x, child.y, child.z, true, unlockedTracks);
                npc.route = findNavPath(startN.id, childN.id, { avoidTrackHazards: true, unlockedTracks });
                npc.routeIdx = 0;
                mission.status = 'investigating';
                npc.speechText = 'শিশুটিকে খুঁজতে যাচ্ছি!';
                npc.speechSubText = 'Searching for Lost Child';
                npc.speechTone = 'police';
                npc.speechTimer = 4.0;
                events.playRadio = true;
              }
            } else if (mission.suspectNpcId) {
              const suspect = npcById.get(mission.suspectNpcId);
              if (suspect && suspect.suspectPhase !== 'detained') {
                npc.policePhase = 'pursuing';
                npc.activity = 'pursuing_suspect';
                mission.status = 'in_pursuit';
                mission.suspectIdentified = true;
                suspect.suspectPhase = 'fleeing';
                suspect.waitTimer = 0;
                suspect.speechText = 'পুলিশ আসছে! পালাও!';
                suspect.speechSubText = 'Suspect Fleeing!';
                suspect.speechTone = 'crime';
                suspect.speechTimer = 3.5;
                npc.speechText = 'থামো! রেল পুলিশ!';
                npc.speechSubText = 'Stop! Railway Police!';
                npc.speechTone = 'police';
                npc.speechTimer = 4.2;
                events.playWhistle = true;
              } else {
                const fin = finalizeMissionOutcome(
                  npcState,
                  nextSimState,
                  mission,
                  true,
                  `${npc.name} secured the scene & resolved "${mission.title}" (+${mission.rewardMoney} coins)!`,
                  Date.now(),
                );
                nextSimState = fin.simState;
                events.resolvedMission = mission;
                if (fin.unlockedAchievement) events.unlockedAchievement = fin.unlockedAchievement;
                events.playRadio = true;
              }
            } else {
              mission.areaSecured = true;
              const fin = finalizeMissionOutcome(
                npcState,
                nextSimState,
                mission,
                true,
                `${npc.name} responded & stabilized "${mission.title}" (+${mission.rewardMoney} coins, +${mission.rewardXp} XP)!`,
                Date.now(),
              );
              nextSimState = fin.simState;
              events.resolvedMission = mission;
              if (fin.unlockedAchievement) events.unlockedAchievement = fin.unlockedAchievement;
              events.playRadio = true;
            }
          }
          continue;
        }

        if (npc.policePhase === 'pursuing' && mission.suspectNpcId) {
          const suspect = npcById.get(mission.suspectNpcId);
          if (!suspect || suspect.suspectPhase === 'detained') {
            const fin = finalizeMissionOutcome(
              npcState,
              nextSimState,
              mission,
              true,
              `${npc.name} detained the suspect & resolved "${mission.title}" (+${mission.rewardMoney} coins)!`,
              Date.now(),
            );
            nextSimState = fin.simState;
            events.resolvedMission = mission;
            if (fin.unlockedAchievement) events.unlockedAchievement = fin.unlockedAchievement;
            continue;
          }

          const distToSuspect = Math.hypot(suspect.x - npc.x, suspect.z - npc.z);
          if (distToSuspect <= 1.65 && Math.abs(suspect.y - npc.y) < 1.2) {
            suspect.suspectPhase = 'detained';
            suspect.activity = 'detained';
            suspect.currentSpeed = 0;
            suspect.speechText = 'ক্ষমা করুন স্যার, ধরা পড়ে গেছি!';
            suspect.speechSubText = 'Suspect Apprehended';
            suspect.speechTone = 'crime';
            suspect.speechTimer = 4.0;
            npc.speechText = 'অপরাধী আটক! এলাকা নিরাপদ।';
            npc.speechSubText = 'Suspect Detained!';
            npc.speechTone = 'police';
            npc.speechTimer = 4.5;
            events.playWhistle = true;

            const fin = finalizeMissionOutcome(
              npcState,
              nextSimState,
              mission,
              true,
              `${npc.name} intercepted & detained suspect for "${mission.title}"! (+${mission.rewardMoney} coins, +${mission.rewardXp} XP)`,
              Date.now(),
              mission.cluesCollected.length > 0,
            );
            nextSimState = fin.simState;
            events.resolvedMission = mission;
            if (fin.unlockedAchievement) events.unlockedAchievement = fin.unlockedAchievement;
            continue;
          }

          // Steer police along A* toward suspect (or direct chase if close)
          let goalX = suspect.x;
          let goalZ = suspect.z;
          if (distToSuspect > 4.2) {
            const tNode = findNearestNavNode(suspect.x, suspect.y, suspect.z, true, unlockedTracks);
            if (
              npc.route.length === 0 ||
              npc.routeIdx >= npc.route.length ||
              npc.targetNodeId !== tNode.id
            ) {
              const sNode = findNearestNavNode(npc.x, npc.y, npc.z, true, unlockedTracks);
              npc.route = findNavPath(sNode.id, tNode.id, { avoidTrackHazards: false, unlockedTracks });
              npc.routeIdx = npc.route.length > 1 ? 1 : 0;
              npc.targetNodeId = tNode.id;
            }
            while (npc.routeIdx < npc.route.length) {
              const cand = getNavNode(npc.route[npc.routeIdx]);
              if (cand && Math.hypot(cand.x - npc.x, cand.z - npc.z) < 0.75) {
                npc.routeIdx++;
              } else {
                if (cand) {
                  goalX = cand.x;
                  goalZ = cand.z;
                }
                break;
              }
            }
          }
          const dx = goalX - npc.x;
          const dz = goalZ - npc.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 0.05) {
            const spd = npc.baseSpeed * 1.55;
            npc.x += (dx / dist) * spd * dt;
            npc.z += (dz / dist) * spd * dt;
            npc.currentSpeed = spd;
            npc.distanceWalked += spd * dt;
            npc.yaw = Math.atan2(dx, dz);
            npc.pose = 'chasing';
            const res = resolveCircleAabbCollisions(npc.x, npc.z, npc.y, npc.radius, colliders);
            npc.x = res.x;
            npc.z = res.z;
            npc.y = groundHeightAt(npc.x, npc.z, npc.y, unlockedTracks);
          }
          continue;
        }

        if (npc.policePhase === 'escorting' && mission.kind === 'lost_child' && mission.childNpcId) {
          const child = npcById.get(mission.childNpcId);
          if (!child) {
            npc.policePhase = 'patrol';
            continue;
          }
          const distToChild = Math.hypot(child.x - npc.x, child.z - npc.z);
          if (distToChild <= 1.8 && Math.abs(child.y - npc.y) < 1.2) {
            mission.status = 'awaiting_reunion';
            const fin = finalizeMissionOutcome(
              npcState,
              nextSimState,
              mission,
              true,
              `${npc.name} found the lost child & safely reunited them with family! (+${mission.rewardMoney} coins)`,
              Date.now(),
            );
            nextSimState = fin.simState;
            events.resolvedMission = mission;
            if (fin.unlockedAchievement) events.unlockedAchievement = fin.unlockedAchievement;
            events.playRadio = true;
            continue;
          }
        }

        // 'responding' or 'escorting' walking via A* route
        const targetNode =
          (npc.policePhase === 'escorting' && mission.childNpcId && npcById.get(mission.childNpcId)
            ? findNearestNavNode(
                npcById.get(mission.childNpcId)!.x,
                npcById.get(mission.childNpcId)!.y,
                npcById.get(mission.childNpcId)!.z,
                true,
                unlockedTracks,
              )
            : getNavNode(mission.targetNodeId)) ??
          findNearestNavNode(mission.x, mission.y, mission.z, true, unlockedTracks);

        if (npc.route.length === 0 || npc.routeIdx >= npc.route.length) {
          const sNode = findNearestNavNode(npc.x, npc.y, npc.z, true, unlockedTracks);
          npc.route = findNavPath(sNode.id, targetNode.id, { avoidTrackHazards: false, unlockedTracks });
          npc.routeIdx = npc.route.length > 1 ? 1 : 0;
          npc.targetNodeId = targetNode.id;
        }

        const distDirect = Math.hypot(targetNode.x - npc.x, targetNode.z - npc.z);
        if (distDirect < 1.55 && Math.abs(targetNode.y - npc.y) < 1.0 && npc.policePhase === 'responding') {
          npc.policePhase = 'investigating';
          npc.policeActionTimer = 2.4;
          npc.activity = 'investigating';
          npc.pose = 'investigating';
          npc.currentSpeed = 0;
          npc.route = [];
          npc.targetNodeId = null;
          mission.status = 'investigating';
          npc.speechText = 'ঘটনাস্থল পরীক্ষা করছি...';
          npc.speechSubText = 'Inspecting Scene & Witnesses';
          npc.speechTone = 'police';
          npc.speechTimer = 3.2;
          events.playRadio = true;
          continue;
        }

        while (npc.routeIdx < npc.route.length) {
          const cand = getNavNode(npc.route[npc.routeIdx]);
          if (cand && Math.hypot(cand.x - npc.x, cand.z - npc.z) < 0.7) {
            npc.routeIdx++;
          } else {
            break;
          }
        }
        const wp =
          (npc.route[npc.routeIdx] ? getNavNode(npc.route[npc.routeIdx]) : undefined) ?? targetNode;
        const dx = wp.x - npc.x;
        const dz = wp.z - npc.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.05) {
          const spd = npc.baseSpeed * 1.42;
          npc.x += (dx / dist) * spd * dt;
          npc.z += (dz / dist) * spd * dt;
          npc.currentSpeed = spd;
          npc.distanceWalked += spd * dt;
          npc.yaw = Math.atan2(dx, dz);
          npc.pose = 'chasing';
          const res = resolveCircleAabbCollisions(npc.x, npc.z, npc.y, npc.radius, colliders);
          npc.x = res.x;
          npc.z = res.z;
          npc.y = groundHeightAt(npc.x, npc.z, npc.y, unlockedTracks);
        }
        continue;
      }
    }

    // Lost Child stays safely off tracks near Fruit Stall until rescued
    if (npc.role === 'child' && npc.missionRole === 'lost_child' && npc.assignedMissionId) {
      npc.currentSpeed = 0;
      npc.pose = 'looking_around';
      if (Math.abs(npc.z) < 4.8 && Math.abs(npc.x - 18.5) > 2.4) {
        npc.z = npc.z < 0 ? -5.0 : 5.0;
      }
      npc.y = groundHeightAt(npc.x, npc.z, npc.y, unlockedTracks);
      continue;
    }

    // Children stay close to guardian and NEVER enter railway tracks
    if (npc.role === 'child' && npc.memory.guardianNpcId) {
      const guardian = npcById.get(npc.memory.guardianNpcId);
      if (guardian && guardian.missionRole !== 'victim') {
        const goalX = guardian.x - Math.sin(guardian.yaw) * 0.85 + 0.45;
        const goalZ = guardian.z - Math.cos(guardian.yaw) * 0.85;
        const dx = goalX - npc.x;
        const dz = goalZ - npc.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.45) {
          const moveSpd = Math.min(npc.baseSpeed * 1.15, dist * 3.0);
          npc.x += (dx / dist) * moveSpd * dt;
          npc.z += (dz / dist) * moveSpd * dt;
          if (Math.abs(npc.z) < 4.7 && Math.abs(npc.x - 18.5) > 2.4) {
            npc.z = npc.z < 0 ? -4.9 : 4.9;
          }
          npc.currentSpeed = moveSpd;
          npc.distanceWalked += moveSpd * dt;
          npc.yaw = Math.atan2(dx, dz);
          npc.pose = moveSpd > 1.7 ? 'running' : 'walking';
        } else {
          npc.currentSpeed = 0;
          npc.pose = guardian.pose === 'sitting' ? 'standing' : 'looking_around';
        }
        const childRes = resolveCircleAabbCollisions(npc.x, npc.z, npc.y, npc.radius, colliders);
        npc.x = childRes.x;
        npc.z = childRes.z;
        npc.y = groundHeightAt(npc.x, npc.z, npc.y, unlockedTracks);
        continue;
      }
    }

    // Suspicious / Thief AI fleeing when pursued
    if (npc.suspectPhase === 'detained') {
      npc.currentSpeed = 0;
      npc.pose = 'standing';
      continue;
    }

    if (npc.suspectPhase === 'fleeing') {
      if (npc.route.length === 0 || npc.routeIdx >= npc.route.length) {
        const curr = findNearestNavNode(npc.x, npc.y, npc.z, true, unlockedTracks);
        const fleeTargets = ['forecourt_w', 'village_lane_w', 'p2_far_e', 'station_entrance'];
        const chosen = fleeTargets[(i + Math.floor(npcState.simElapsedSec)) % fleeTargets.length];
        npc.route = findNavPath(curr.id, chosen, { avoidTrackHazards: true, unlockedTracks });
        npc.routeIdx = 0;
      }
      const wp = npc.route[npc.routeIdx] ? getNavNode(npc.route[npc.routeIdx]) : undefined;
      if (wp) {
        const dx = wp.x - npc.x;
        const dz = wp.z - npc.z;
        const dist = Math.hypot(dx, dz);
        if (dist < 0.7) {
          npc.routeIdx++;
        } else {
          const spd = npc.baseSpeed * 1.18;
          npc.x += (dx / dist) * spd * dt;
          npc.z += (dz / dist) * spd * dt;
          npc.currentSpeed = spd;
          npc.distanceWalked += spd * dt;
          npc.yaw = Math.atan2(dx, dz);
          npc.pose = 'chasing';
          const res = resolveCircleAabbCollisions(npc.x, npc.z, npc.y, npc.radius, colliders);
          npc.x = res.x;
          npc.z = res.z;
          npc.y = groundHeightAt(npc.x, npc.z, npc.y, unlockedTracks);
        }
      }
      continue;
    }

    // Step 6: Passenger Doorway Queueing & Boarding AI
    const isBoardingRole =
      npc.role === 'passenger' ||
      npc.role === 'student' ||
      npc.role === 'tourist' ||
      npc.role === 'elderly' ||
      npc.role === 'family';

    if (
      isBoardingRole &&
      !npc.assignedMissionId &&
      !npc.incidentKind &&
      !npc.wantsToTalk &&
      npc.memory.boardingStage !== 'disembarking'
    ) {
      // Assign eligible open train if passenger isn't queued yet (keep ~half of eligible crowd free for stalls/benches)
      if (
        (!npc.memory.boardingStage || npc.memory.boardingStage === 'idle') &&
        openBoardableTrains.length > 0 &&
        i % 2 === 0
      ) {
        const chosenTrain =
          openBoardableTrains.find(
            (t) =>
              t.id !== npc.memory.disembarkedFromTrainId &&
              (t.assignedPlatform === npc.memory.assignedPlatform || !npc.memory.assignedPlatform),
          ) ??
          openBoardableTrains.find((t) => t.id !== npc.memory.disembarkedFromTrainId);

        if (chosenTrain && chosenTrain.coaches.length > 0) {
          const openCoaches = chosenTrain.coaches.filter(
            (c) => !c.doorObstructed && c.passengers < c.capacity,
          );
          if (openCoaches.length > 0) {
            const targetCoach = openCoaches[i % openCoaches.length];
            const key = `${chosenTrain.id}_${targetCoach.coachIndex}`;
            const slotIdx = queuedCountByDoor.get(key) ?? 0;
            queuedCountByDoor.set(key, slotIdx + 1);
            npc.memory.boardingTrainId = chosenTrain.id;
            npc.memory.targetCoachIndex = targetCoach.coachIndex;
            npc.memory.queueSlotIndex = slotIdx;
            npc.memory.boardingStage = 'heading_queue';
            npc.memory.assignedPlatform = chosenTrain.assignedPlatform;
            npc.memory.targetTrainNumber = chosenTrain.trainNumber;
            npc.memory.targetDestinationBn = chosenTrain.destinationBn;
            npc.waitTimer = 0;
            npc.route = [];
          }
        }
      }

      if (npc.memory.boardingTrainId && npc.memory.boardingStage && npc.memory.boardingStage !== 'idle') {
        const targetTrain = boardingTrainById.get(npc.memory.boardingTrainId);
        const boardCheck = targetTrain ? canPassengerBoardTrain(targetTrain) : { allowed: false };
        if (!targetTrain || !boardCheck.allowed) {
          // Doors closed, train moving, or train full: step back gracefully
          npc.memory.boardingStage = 'idle';
          npc.memory.boardingTrainId = null;
          npc.memory.targetCoachIndex = null;
          npc.activity = 'waiting_platform';
          npc.route = [];
          npc.waitTimer = 1.4;
          if (targetTrain && npcState.globalBubbleCooldown <= 0 && !npc.speechText) {
            const isFull = targetTrain.currentPassengers >= targetTrain.passengerCapacity;
            npc.speechText = isFull ? 'ট্রেন একদম ভরে গেছে!' : 'দরজা বন্ধ হয়ে গেছে!';
            npc.speechSubText = isFull ? 'Train Full!' : 'Doors Closed!';
            npc.speechTone = 'chatter';
            npc.speechTimer = 3.0;
            npcState.globalBubbleCooldown = 1.5;
          }
        } else {
          const doors = getTrainDoorWorldCoords(targetTrain);
          let door =
            doors.find((d) => d.coachIndex === (npc.memory.targetCoachIndex ?? 0)) ?? doors[0];
          if (door && (door.doorObstructed || door.passengers >= door.capacity)) {
            const alt = doors.find((d) => !d.doorObstructed && d.passengers < d.capacity);
            if (alt) {
              door = alt;
              npc.memory.targetCoachIndex = alt.coachIndex;
            }
          }

          if (door && !door.doorObstructed && door.passengers < door.capacity) {
            const platTrack = targetTrain.assignedPlatform ?? 1;
            const samePlatform =
              Math.abs(npc.y - 0.65) < 0.45 &&
              (platTrack === 1
                ? npc.z < -4.5 && npc.z > -12.8
                : platTrack === 2 || platTrack === 3
                  ? npc.z > 4.5 && npc.z < 11.8
                  : platTrack === 4 || platTrack === 5
                    ? npc.z > 20.8 && npc.z < 28.2
                    : npc.z > 37.3 && npc.z < 46.2);

            if (!samePlatform) {
              // Navigate smoothly to target platform via A* (uses Footover Bridge if tracks blocked)
              if (npc.route.length === 0 || npc.routeIdx >= npc.route.length) {
                const currNode = findNearestNavNode(npc.x, npc.y, npc.z, !crossingBlocked, unlockedTracks);
                const platNodes = platformNavNodeIdsForTrack(platTrack, unlockedTracks);
                const bestNode =
                  platNodes
                    .map((id) => getNavNode(id))
                    .filter((n): n is NavNode => Boolean(n && isNavNodeUnlocked(n, unlockedTracks)))
                    .sort((a, b) => Math.abs(a.x - door.doorX) - Math.abs(b.x - door.doorX))[0] ??
                  NAV_NODES[0];
                npc.route = findNavPath(currNode.id, bestNode.id, {
                  avoidTrackHazards: crossingBlocked || npc.role === 'elderly' || npc.role === 'family',
                  unlockedTracks,
                });
                npc.routeIdx = 0;
                npc.targetNodeId = bestNode.id;
              }
              const wp = npc.route[npc.routeIdx] ? getNavNode(npc.route[npc.routeIdx]) : undefined;
              if (wp) {
                const dx = wp.x - npc.x;
                const dz = wp.z - npc.z;
                const d = Math.hypot(dx, dz);
                if (d < 0.7) {
                  npc.routeIdx++;
                } else {
                  const spd = npc.baseSpeed * 1.15;
                  npc.x += (dx / d) * spd * dt;
                  npc.z += (dz / d) * spd * dt;
                  npc.currentSpeed = spd;
                  npc.distanceWalked += spd * dt;
                  npc.yaw = Math.atan2(dx, dz);
                  npc.activity = 'boarding_train';
                  npc.pose = 'boarding';
                  const res = resolveCircleAabbCollisions(npc.x, npc.z, npc.y, npc.radius, colliders);
                  npc.x = res.x;
                  npc.z = res.z;
                  npc.y = groundHeightAt(npc.x, npc.z, npc.y, unlockedTracks);
                }
                continue;
              }
            }

            // On the right platform: queue cleanly outside doorway or step inside if open!
            const slot = npc.memory.queueSlotIndex ?? 0;
            const queueX = door.doorX + ((slot % 3) - 1) * 0.42;
            const queueZ =
              door.queueBaseZ + door.platformSideSign * Math.min(3, Math.floor(slot / 2)) * 0.65;
            const doorThresholdZ = targetTrain.z + door.platformSideSign * 1.72;
            const doorKey = `${targetTrain.id}_${door.coachIndex}`;

            if (npc.memory.boardingStage === 'stepping_in') {
              if (targetTrain.doorState !== 'open' || targetTrain.speed > 0.25) {
                npc.memory.boardingStage = 'idle';
                npc.memory.boardingTrainId = null;
                npc.activity = 'waiting_platform';
                continue;
              }
              const dx = door.doorX - npc.x;
              const dz = doorThresholdZ - npc.z;
              const dist = Math.hypot(dx, dz);
              if (dist < 0.65) {
                const boardRes = tryBoardPassengerOnTrain(targetTrain, door.coachIndex, 4);
                if (boardRes.boarded) {
                  boardedNpcIndices.push(i);
                  continue;
                }
                npc.memory.boardingStage = 'idle';
                npc.memory.boardingTrainId = null;
                npc.activity = 'waiting_platform';
              } else {
                const spd = npc.baseSpeed * 1.2;
                npc.x += (dx / dist) * spd * dt;
                npc.z += (dz / dist) * spd * dt;
                npc.currentSpeed = spd;
                npc.distanceWalked += spd * dt;
                npc.yaw = Math.atan2(dx, dz);
                npc.activity = 'boarding_train';
                npc.pose = 'boarding';
                const res = resolveCircleAabbCollisions(npc.x, npc.z, npc.y, npc.radius, colliders);
                npc.x = res.x;
                npc.z = res.z;
                npc.y = groundHeightAt(npc.x, npc.z, npc.y, unlockedTracks);
              }
              continue;
            }

            const dxQ = queueX - npc.x;
            const dzQ = queueZ - npc.z;
            const distQ = Math.hypot(dxQ, dzQ);
            if (distQ > 0.58) {
              const spd = npc.baseSpeed * 1.15;
              npc.x += (dxQ / distQ) * spd * dt;
              npc.z += (dzQ / distQ) * spd * dt;
              npc.currentSpeed = spd;
              npc.distanceWalked += spd * dt;
              npc.yaw = Math.atan2(dxQ, dzQ);
              npc.activity = 'queuing_train';
              npc.pose = 'walking';
              const res = resolveCircleAabbCollisions(npc.x, npc.z, npc.y, npc.radius, colliders);
              npc.x = res.x;
              npc.z = res.z;
              npc.y = groundHeightAt(npc.x, npc.z, npc.y, unlockedTracks);
            } else {
              npc.memory.boardingStage = 'queuing';
              npc.activity = 'queuing_train';
              npc.pose = 'boarding';
              npc.currentSpeed = 0;
              npc.yaw = door.platformSideSign < 0 ? 0 : Math.PI;
              if (!steppingDoorKeys.has(doorKey) && targetTrain.doorState === 'open' && targetTrain.doorOpenProgress >= 0.78) {
                steppingDoorKeys.add(doorKey);
                npc.memory.boardingStage = 'stepping_in';
              }
            }
            continue;
          }
        }
      }
    }

    // Wait / sit / inspect / panic pause at destination
    if (npc.waitTimer > 0) {
      npc.waitTimer = Math.max(0, npc.waitTimer - dt);
      npc.currentSpeed = 0;

      const distToPlayer = Math.hypot(player.x - npc.x, player.z - npc.z);
      if (
        (npc.wantsToTalk || npc.incidentKind || npc.missionRole === 'victim') &&
        distToPlayer < 9.5 &&
        distToPlayer > 2.25 &&
        Math.abs(player.y - npc.y) < 1.1 &&
        npc.missionRole !== 'suspect'
      ) {
        const dx = player.x - npc.x;
        const dz = player.z - npc.z;
        npc.x += (dx / distToPlayer) * npc.baseSpeed * 0.85 * dt;
        npc.z += (dz / distToPlayer) * npc.baseSpeed * 0.85 * dt;
        npc.yaw = Math.atan2(dx, dz);
        npc.currentSpeed = npc.baseSpeed * 0.85;
        npc.distanceWalked += npc.currentSpeed * dt;
        npc.pose = 'walking';
        const res = resolveCircleAabbCollisions(npc.x, npc.z, npc.y, npc.radius, colliders);
        npc.x = res.x;
        npc.z = res.z;
        npc.y = groundHeightAt(npc.x, npc.z, npc.y, unlockedTracks);
        continue;
      }

      if (npc.missionRole === 'victim') {
        npc.pose = 'panicking';
      } else if (npc.missionRole === 'suspect' || npc.role === 'pickpocket' || npc.role === 'suspicious') {
        npc.pose = 'sneaking';
      } else if (npc.activity === 'sitting_bench') {
        npc.pose = 'sitting';
      } else if (npc.activity === 'buying_food') {
        npc.pose = 'buying';
      } else if (npc.activity === 'selling') {
        npc.pose = 'selling';
      } else if (npc.wantsToTalk || npc.activity === 'talking') {
        npc.pose = 'talking';
        if (distToPlayer < 6) {
          npc.yaw = Math.atan2(player.x - npc.x, player.z - npc.z);
        }
      } else if (npc.role === 'railway_police' || npc.role === 'bd_police') {
        npc.pose = 'investigating';
      } else {
        npc.pose = 'looking_around';
      }
      continue;
    }

    // Need a route or reached current route?
    if (npc.route.length === 0 || npc.routeIdx >= npc.route.length) {
      const currNode = findNearestNavNode(npc.x, npc.y, npc.z, !crossingBlocked && npc.role !== 'child', unlockedTracks);
      let destNode = getTargetNodeForNpc(
        npc,
        trainState,
        npcState.nextNpcSeq + i * 7 + Math.floor(npcState.simElapsedSec),
        unlockedTracks,
      );
      if (destNode.id === currNode.id || !isNavNodeUnlocked(destNode, unlockedTracks)) {
        const unlockedPool = NAV_NODES.filter((n) => isNavNodeUnlocked(n, unlockedTracks));
        destNode = unlockedPool[(i * 11 + Math.floor(npcState.simElapsedSec)) % unlockedPool.length] ?? NAV_NODES[0];
      }
      const path = findNavPath(currNode.id, destNode.id, {
        avoidTrackHazards: crossingBlocked || npc.role === 'child' || npc.role === 'elderly',
        unlockedTracks,
      });
      npc.route = path;
      npc.routeIdx = 0;
      npc.targetNodeId = destNode.id;
      npc.stuckTimer = 0;
      npc.lastProgressX = npc.x;
      npc.lastProgressZ = npc.z;
      npc.activity =
        npc.role === 'porter' && (i % 2 === 0 || trainState.trains.some((t) => t.status === 'Boarding'))
          ? 'carrying_luggage'
          : npc.role === 'railway_police' || npc.role === 'bd_police'
            ? 'patrolling'
            : npc.role === 'pickpocket' || npc.role === 'suspicious'
              ? 'sneaking'
              : 'walking';
    }

    const wpId = npc.route[npc.routeIdx];
    const wp = getNavNode(wpId);
    if (!wp) {
      npc.route = [];
      continue;
    }

    if (wp.isTrackHazard && crossingBlocked) {
      npc.route = [];
      continue;
    }

    const laneOffsetZ =
      wp.zone === 'platform1' ||
      wp.zone === 'platform2' ||
      wp.zone === 'platform3' ||
      wp.zone === 'platform4' ||
      wp.zone === 'forecourt'
        ? (((i % 5) - 2) * 0.65)
        : 0;
    const targetWpX = wp.x;
    const targetWpZ = wp.z + laneOffsetZ;
    const dx = targetWpX - npc.x;
    const dz = targetWpZ - npc.z;
    const dist = Math.hypot(dx, dz);

    if (dist < 0.65) {
      npc.routeIdx++;
      if (npc.routeIdx >= npc.route.length) {
        if (
          wp.benchPose &&
          npc.role !== 'railway_police' &&
          npc.role !== 'bd_police' &&
          (npc.role === 'elderly' || npc.role === 'passenger' || i % 2 === 0)
        ) {
          npc.activity = 'sitting_bench';
          npc.x = wp.x + wp.benchPose.seatOffsetX;
          npc.z = wp.z + wp.benchPose.seatOffsetZ;
          npc.yaw = wp.benchPose.rotY;
          npc.waitTimer = 6.5 + (i % 4) * 1.5;
        } else if (wp.zone === 'stall') {
          npc.activity = 'buying_food';
          npc.waitTimer = 3.5 + (i % 3);
        } else if (wp.zone === 'office' || wp.zone === 'info_board' || wp.zone === 'ticket_counter') {
          npc.activity = npc.role === 'railway_employee' ? 'inspecting' : 'waiting_platform';
          npc.waitTimer = 3.2 + (i % 4);
        } else {
          npc.activity = npc.role === 'railway_police' || npc.role === 'bd_police' ? 'patrolling' : 'waiting_platform';
          npc.waitTimer = 2.0 + (i % 4) * 0.8;
        }
        npc.route = [];
      }
      continue;
    }

    const spd = npc.baseSpeed * (npc.activity === 'boarding' ? 1.25 : 1.0);
    npc.x += (dx / dist) * spd * dt;
    npc.z += (dz / dist) * spd * dt;
    npc.currentSpeed = spd;
    npc.distanceWalked += spd * dt;

    const targetYaw = Math.atan2(dx, dz);
    let yawDiff = targetYaw - npc.yaw;
    while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
    npc.yaw += yawDiff * (1 - Math.exp(-10 * dt));

    if (npc.role === 'railway_police' || npc.role === 'bd_police') {
      npc.pose = 'patrolling';
    } else if (npc.role === 'pickpocket' || npc.role === 'suspicious') {
      npc.pose = 'sneaking';
    } else {
      npc.pose =
        npc.activity === 'carrying_luggage'
          ? 'carrying_luggage'
          : spd > 1.95
            ? 'running'
            : 'walking';
    }

    const worldRes = resolveCircleAabbCollisions(npc.x, npc.z, npc.y, npc.radius, colliders);
    npc.x = worldRes.x;
    npc.z = worldRes.z;
    npc.y = groundHeightAt(npc.x, npc.z, npc.y, unlockedTracks);

    npc.stuckTimer += dt;
    if (npc.stuckTimer > 2.2) {
      const progress = Math.hypot(npc.x - npc.lastProgressX, npc.z - npc.lastProgressZ);
      npc.stuckTimer = 0;
      npc.lastProgressX = npc.x;
      npc.lastProgressZ = npc.z;
      if (progress < 0.28) {
        npc.route = [];
        npc.waitTimer = 0.2;
      }
    }
    // Release disembarking flag once arrived at exit/waiting area
    if (npc.memory.boardingStage === 'disembarking' && npc.waitTimer > 0) {
      npc.memory.boardingStage = 'idle';
    }
  }

  // Remove passengers who cleanly stepped through an open coach door
  for (let b = boardedNpcIndices.length - 1; b >= 0; b--) {
    npcState.npcs.splice(boardedNpcIndices[b], 1);
  }
  if (boardedNpcIndices.length > 0) {
    npcById.clear();
    for (const n of npcState.npcs) npcById.set(n.id, n);
  }

  // 6. Realistic Capsule-vs-Capsule Physics: NPC <-> NPC & Player <-> NPC
  const capsules: CapsuleEntity[] = npcState.npcs.map((n) => ({
    id: n.id,
    x: n.x,
    y: n.y,
    z: n.z,
    radius: n.radius,
    immovable: n.immovable || n.activity === 'sitting_bench',
  }));

  resolveNpcPairCollisions(capsules, colliders);

  const playerCol = resolvePlayerNpcCollisions(
    { x: player.x, y: player.y, z: player.z, radius: PLAYER_RADIUS },
    capsules,
    colliders,
  );

  for (let i = 0; i < npcState.npcs.length; i++) {
    const npc = npcState.npcs[i];
    const cap = capsules[i];
    npc.x = cap.x;
    npc.z = cap.z;
    npc.y = groundHeightAt(npc.x, npc.z, npc.y, unlockedTracks);
  }

  for (const hit of playerCol.hits) {
    const npc = npcById.get(hit.npcId);
    if (!npc) continue;
    if (npc.collisionCooldown <= 0) {
      npc.memory.bumpedCount += 1;
      npc.collisionCooldown = 3.4;
      npc.stumbleTimer = 0.62;
      npc.stumbleVelX = hit.pushDirX * 2.2;
      npc.stumbleVelZ = hit.pushDirZ * 2.2;
      npc.yaw = Math.atan2(playerCol.playerX - npc.x, playerCol.playerZ - npc.z);

      if (npcState.globalBubbleCooldown <= 0) {
        const picked = pickCollisionDialogue(npcState.recentCollisionIndices);
        npcState.recentCollisionIndices.push(picked.index);
        if (npcState.recentCollisionIndices.length > 20) {
          npcState.recentCollisionIndices.shift();
        }
        npc.speechText = picked.line.bn;
        npc.speechSubText = picked.line.en;
        npc.speechTone = 'collision';
        npc.speechTimer = 3.8;
        npcState.globalBubbleCooldown = 1.4;
        events.playBumpSound = true;
        events.bumpLineBn = picked.line.bn;
        events.bumpLineEn = picked.line.en;
        nextSimState = {
          ...nextSimState,
          lastEventMessage: `${npc.name}: "${picked.line.bn}"`,
          lastEventTimestamp: Date.now(),
        };
      }
    }
  }

  if (npcState.activeIncident) {
    const host = npcById.get(npcState.activeIncident.npcId);
    if (host) {
      npcState.activeIncident.x = host.x;
      npcState.activeIncident.z = host.z;
    }
  }

  return {
    npcState,
    simState: nextSimState,
    playerX: playerCol.playerX,
    playerZ: playerCol.playerZ,
    events,
  };
}

export function findNearestTalkableNpc(
  npcState: NpcSimulationState,
  playerX: number,
  playerY: number,
  playerZ: number,
  maxDist = 2.8,
): NpcAgent | null {
  let best: NpcAgent | null = null;
  let bestDist = maxDist;
  for (let i = 0; i < npcState.npcs.length; i++) {
    const n = npcState.npcs[i];
    if (n.role === 'child' && n.missionRole !== 'lost_child') continue;
    if (Math.abs(n.y - playerY) > 1.3) continue;
    const d = Math.hypot(n.x - playerX, n.z - playerZ);
    const isMissionActor = Boolean(n.assignedMissionId && n.missionRole);
    const priorityScore = isMissionActor
      ? d - 1.1
      : n.incidentKind
        ? d - 0.8
        : n.wantsToTalk
          ? d - 0.45
          : d;
    if (d <= maxDist && priorityScore < bestDist) {
      bestDist = priorityScore;
      best = n;
    }
  }
  return best;
}

export function openNpcDialogueForAgent(
  npcState: NpcSimulationState,
  npcId: string,
  simState: StationSimState,
  trainState: TrainSimulationState,
): ActiveNpcDialogue | null {
  const npc = npcState.npcs.find((n) => n.id === npcId);
  if (!npc) return null;

  npc.memory.greetedPlayer = true;
  npc.waitTimer = Math.max(npc.waitTimer, 6.0);
  npc.activity = 'talking';

  // Step 5 Mission Dialogues take smart priority when interacting with mission actors or officers
  if (npc.assignedMissionId && npc.missionRole) {
    const mission = npcState.missions.find((m) => m.id === npc.assignedMissionId);
    if (mission) {
      if (npc.missionRole === 'lost_child') {
        return buildLostChildDialogue(npc, mission);
      }
      if (npc.missionRole === 'suspect') {
        return buildSuspectConfrontDialogue(npc, mission);
      }
      if (npc.missionRole === 'witness') {
        return buildMissionWitnessDialogue(npc, mission);
      }
      if (npc.missionRole === 'victim') {
        return buildMissionVictimDialogue(npc, mission);
      }
    }
  }

  if (npc.role === 'railway_police' || npc.role === 'bd_police') {
    return buildPoliceOfficerDialogue(npc, npcState.missions);
  }

  if (npc.incidentKind) {
    return buildIncidentDialogue(npc, npc.incidentKind);
  }

  if (
    npc.role === 'tea_seller' ||
    npc.role === 'food_vendor' ||
    npc.role === 'fruit_seller' ||
    npc.role === 'newspaper_seller'
  ) {
    const roleLabel = ROLE_LABELS[npc.role].en;
    const cries = VENDOR_CRIES_BN[npc.role];
    return {
      npcId: npc.id,
      npcName: npc.name,
      npcNameBn: npc.nameBn,
      role: npc.role,
      roleLabel,
      personality: npc.personality,
      memorySummary: npc.memory.workZone ?? 'Platform Hawker',
      incidentKind: null,
      questionBn: `${cries[0].bn} স্টেশন মাস্টার সাহেব, কিছু নেবেন নাকি?`,
      questionEn: `${cries[0].en} Station Master, inspecting stall hygiene or buying refreshments?`,
      choices: [
        {
          id: 'inspect_hygiene',
          label: 'Inspect food hygiene & collect vendor license fee (+35 coins)',
          labelBn: 'খাবারের মান যাচাই করুন এবং লাইসেন্স ফি সংগ্রহ করুন (+৩৫ কয়েন)',
          isCorrect: true,
          replyBn: 'সবকিছু একদম পরিষ্কার-পরিচ্ছন্ন আছে স্যার! এই নিন ফি।',
          replyEn: 'Everything is clean and fresh, Sir! Here is the stall fee.',
          satisfactionDelta: 4,
          repDelta: 2,
          xpDelta: 20,
          moneyDelta: 35,
          complaintDelta: 0,
        },
        {
          id: 'buy_tea_snack',
          label: 'Buy hot tea & singara for station staff (-15 coins, +6% satisfaction)',
          labelBn: 'স্টাফদের জন্য গরম চা ও সিঙ্গারা নিন (-১৫ কয়েন)',
          isCorrect: true,
          replyBn: 'গরম গরম চা-সিঙ্গারা দিচ্ছি স্যার, যাত্রীরাও খুশি হবে!',
          replyEn: 'Serving hot tea and singara right away, Sir!',
          satisfactionDelta: 6,
          repDelta: 2,
          xpDelta: 25,
          moneyDelta: -15,
          complaintDelta: 0,
        },
      ],
    };
  }

  const variant = npcState.nextQuestionVariant++;
  return buildPassengerQuestionDialogue(npc, simState, trainState, variant);
}

export function resolveNpcDialogueChoice(
  npcState: NpcSimulationState,
  simState: StationSimState,
  npcId: string,
  choice: NpcDialogueChoice,
  nowMs: number,
): {
  npcState: NpcSimulationState;
  simState: StationSimState;
  leveledUp: boolean;
  soundHint?: 'whistle' | 'radio' | 'siren' | 'achievement';
  announcementBn?: string;
  unlockedAchievement?: SecurityAchievement | null;
} {
  const prevLevel = simState.level;
  const npc = npcState.npcs.find((n) => n.id === npcId);

  if (npc) {
    npc.wantsToTalk = false;
    npc.talkCooldown = 18;
    npc.waitTimer = 2.0;
    npc.speechText = choice.replyBn;
    npc.speechSubText = choice.replyEn;
    npc.speechTone = choice.isCorrect ? 'question' : 'collision';
    npc.speechTimer = 4.2;

    if (npc.incidentKind && npcState.activeIncident?.npcId === npc.id) {
      npc.incidentKind = null;
      npcState.activeIncident = null;
      npcState.incidentCooldown = 40;
    } else if (npc.incidentKind) {
      npc.incidentKind = null;
    }
  }

  let updatedBase: StationSimState = {
    ...simState,
    satisfaction: Math.max(0, Math.min(100, Math.round(simState.satisfaction + choice.satisfactionDelta))),
    complaints: simState.complaints + choice.complaintDelta,
    successfulInteractions: simState.successfulInteractions + (choice.isCorrect ? 1 : 0),
  };

  let soundHint: 'whistle' | 'radio' | 'siren' | 'achievement' | undefined;
  let announcementBn: string | undefined;
  let unlockedAchievement: SecurityAchievement | null = null;

  // Execute Step 5 Mission Actions cleanly
  if (choice.missionAction && choice.missionId) {
    const mission = npcState.missions.find((m) => m.id === choice.missionId);
    if (mission) {
      if (choice.missionAction === 'gather_clue') {
        const clueText = EMERGENCY_MISSION_TEMPLATES[mission.kind].witnessClueEn;
        if (!mission.cluesCollected.includes(clueText)) {
          mission.cluesCollected.push(clueText);
        }
        mission.status = 'investigating';
        mission.suspectIdentified = mission.isCrime;
        const achRes = evaluateSecurityAchievements(updatedBase, undefined, false, true);
        updatedBase = achRes.simState;
        unlockedAchievement = achRes.unlockedAchievement;
        soundHint = 'radio';
      } else if (choice.missionAction === 'dispatch_police') {
        const preferredOfficer =
          npc && (npc.role === 'railway_police' || npc.role === 'bd_police') ? npc.id : undefined;
        const disp = dispatchOfficerToMission(
          npcState,
          updatedBase,
          mission.id,
          preferredOfficer,
          nowMs,
        );
        updatedBase = disp.simState;
        announcementBn = buildEmergencyBanglaPa(mission);
        soundHint = 'whistle';
      } else if (choice.missionAction === 'locate_child') {
        mission.status = 'awaiting_reunion';
        if (npc) {
          const wr = getNavNode('waiting_room');
          if (wr) {
            const cStart = findNearestNavNode(npc.x, npc.y, npc.z, true, updatedBase.unlockedTracks);
            npc.route = findNavPath(cStart.id, wr.id, {
              avoidTrackHazards: true,
              unlockedTracks: updatedBase.unlockedTracks,
            });
            npc.routeIdx = 0;
            npc.waitTimer = 0;
          }
        }
        soundHint = 'radio';
      } else if (
        choice.missionAction === 'confront_suspect' ||
        choice.missionAction === 'reunite_child' ||
        choice.missionAction === 'stabilize_emergency'
      ) {
        if (npc && choice.missionAction === 'confront_suspect') {
          npc.suspectPhase = 'detained';
          npc.activity = 'detained';
        }
        const fin = finalizeMissionOutcome(
          npcState,
          updatedBase,
          mission,
          true,
          `${mission.title} resolved successfully! (+${mission.rewardMoney} coins, +${mission.rewardXp} XP)`,
          nowMs,
          mission.cluesCollected.length > 0,
        );
        soundHint = choice.missionAction === 'confront_suspect' ? 'whistle' : 'achievement';
        return {
          npcState,
          simState: fin.simState,
          leveledUp: fin.simState.level > prevLevel,
          soundHint,
          announcementBn,
          unlockedAchievement: fin.unlockedAchievement,
        };
      } else if (choice.missionAction === 'broadcast_pa') {
        announcementBn = buildEmergencyBanglaPa(mission);
        mission.areaSecured = true;
        soundHint = 'radio';
      }
    }
  } else if (choice.missionAction === 'secure_area') {
    const sweep = requestSecurityPatrolSweep(npcState, updatedBase, nowMs);
    updatedBase = sweep.simState;
    soundHint = 'radio';
  }

  const nextSimState = applyXpAndRewards(
    updatedBase,
    {
      xpDelta: choice.xpDelta,
      moneyDelta: choice.moneyDelta,
      repDelta: choice.repDelta,
      message: `${npc?.name ?? 'Passenger'}: "${choice.replyBn}"`,
    },
    nowMs,
  );

  return {
    npcState,
    simState: nextSimState,
    leveledUp: nextSimState.level > prevLevel,
    soundHint,
    announcementBn,
    unlockedAchievement,
  };
}
