export type GamePhase = 'title' | 'playing' | 'paused';

export type CameraMode = 'third-person' | 'first-person';

export type WeatherMode = 'clear' | 'rain';

export type SignalAspect = 'red' | 'yellow' | 'green';

export type TouchControlsMode = 'auto' | 'on' | 'off';

export type TrackId = 1 | 2 | 3 | 4 | 5 | 6;

export type SwitchPosition = 'straight' | 'crossover';

export type TrainCategory =
  | 'local'
  | 'intercity'
  | 'mail'
  | 'commuter'
  | 'freight'
  | 'container'
  | 'international';

export type TrainStatus =
  | 'Scheduled'
  | 'Approaching'
  | 'Arriving'
  | 'At Platform'
  | 'Boarding'
  | 'Departing'
  | 'Delayed'
  | 'Departed';

export interface AudioSettings {
  master: number; // 0..1
  music: number; // 0..1
  environment: number; // 0..1
  train: number; // 0..1
  announcements: number; // 0..1
  muted: boolean;
}

export interface ColliderBox {
  id: string;
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY?: number;
  maxY?: number;
  label?: string;
}

export type InteractableKind =
  | 'dispatch_desk'
  | 'upgrade_desk'
  | 'signal_track1'
  | 'signal_track2'
  | 'signal_track3'
  | 'signal_track4'
  | 'signal_track5'
  | 'signal_track6'
  | 'crossing_gate'
  | 'tea_stall'
  | 'jhalmuri_stall'
  | 'platform_train_1'
  | 'platform_train_2'
  | 'platform_train_3'
  | 'platform_train_4'
  | 'platform_train_5'
  | 'platform_train_6'
  | 'emergency_hazard'
  | 'train_operational_event';

export interface InteractablePoint {
  id: InteractableKind;
  title: string;
  actionLabel: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  missionId?: string;
  trainId?: string;
}

export type TrainDoorState = 'closed' | 'opening' | 'open' | 'closing';

export type DepartureSequenceStage =
  | 'idle'
  | 'boarding_announcement'
  | 'safety_checks'
  | 'platform_clearance'
  | 'closing_doors'
  | 'signal_verification'
  | 'departing';

export interface CoachOccupancyState {
  coachIndex: number;
  coachNumber: string;
  coachNumberBn: string;
  capacity: number;
  passengers: number;
  doorXOffset: number; // local X offset relative to train origin
  doorObstructed: boolean;
}

export type TrainOperationalEventKind =
  | 'wrong_train_passenger'
  | 'overcrowded_coach'
  | 'missing_seat'
  | 'luggage_blocking_door'
  | 'passenger_assistance'
  | 'delayed_departure'
  | 'platform_congestion'
  | 'door_obstruction'
  | 'last_minute_boarding';

export interface TrainOperationalEvent {
  id: string;
  trainId: string;
  trainNumber: string;
  kind: TrainOperationalEventKind;
  title: string;
  titleBn: string;
  description: string;
  descriptionBn: string;
  coachNumber: string;
  coachIndex: number;
  resolved: boolean;
  blocksDeparture: boolean;
  primaryActionLabel: string;
  primaryActionLabelBn: string;
  secondaryActionLabel?: string;
}

export interface ManagedTrain {
  id: string;
  trainNumber: string;
  name: string;
  nameBn: string;
  category: TrainCategory;
  origin: string;
  destination: string;
  destinationBn: string;
  scheduledArrivalMin: number;
  scheduledDepartureMin: number;
  delayMinutes: number;
  assignedPlatform: TrackId | null;
  status: TrainStatus;
  direction: 1 | -1; // 1 = Eastbound (West->East), -1 = Westbound (East->West)
  x: number;
  z: number;
  speed: number; // m/s
  maxSpeed: number; // m/s
  coachCount: number;
  capacityLabel: string;
  passengerCapacity: number;
  currentPassengers: number;
  coaches: CoachOccupancyState[];
  doorState: TrainDoorState;
  doorOpenProgress: number; // 0 (closed) .. 1 (open)
  doorsObstructed: boolean;
  platformClear: boolean;
  safetyChecksPassed: boolean;
  departureStage: DepartureSequenceStage;
  disembarkRemaining: number;
  operationalEvent: TrainOperationalEvent | null;
  emergencyStopped: boolean;
  holdingReason: string | null;
  inspected: boolean;
  boardingProgress: number; // 0..1
  departureAuthorized: boolean;
  arrivalAnnounced: boolean;
  delayAnnounced: boolean;
  hornTriggeredArrival: boolean;
}

export interface TrackBlockOccupancy {
  westApproachTrainId: string | null;
  platformTrainId: string | null;
  eastApproachTrainId: string | null;
  occupied: boolean;
}

export interface RailwaySafetyAlert {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
}

export interface TrainSimulationState {
  dayNumber: number;
  unlockedTracks: number;
  switchPosition: SwitchPosition;
  trains: ManagedTrain[];
  track1Occupancy: TrackBlockOccupancy;
  track2Occupancy: TrackBlockOccupancy;
  trackOccupancies: Record<TrackId, TrackBlockOccupancy>;
  alerts: RailwaySafetyAlert[];
  lastAnnouncementText: string | null;
  nextOperationalEventIndex?: number;
}

export interface TrainDashboardSnapshot {
  dayNumber: number;
  unlockedTracks: number;
  stationLevel: number;
  timeFormatted: string;
  gameMinutes: number;
  track1Signal: SignalAspect;
  track2Signal: SignalAspect;
  trackSignals: Record<TrackId, SignalAspect>;
  crossingGateClosed: boolean;
  switchPosition: SwitchPosition;
  track1Occupancy: TrackBlockOccupancy;
  track2Occupancy: TrackBlockOccupancy;
  trackOccupancies: Record<TrackId, TrackBlockOccupancy>;
  trains: ManagedTrain[];
  alerts: RailwaySafetyAlert[];
}

export type NpcRole =
  | 'passenger'
  | 'porter'
  | 'tea_seller'
  | 'food_vendor'
  | 'fruit_seller'
  | 'newspaper_seller'
  | 'beggar'
  | 'railway_employee'
  | 'ticket_collector'
  | 'railway_police'
  | 'bd_police'
  | 'child'
  | 'elderly'
  | 'student'
  | 'tourist'
  | 'family'
  | 'suspicious'
  | 'pickpocket';

export type NpcPersonality =
  | 'impatient'
  | 'friendly'
  | 'angry'
  | 'confused'
  | 'elderly'
  | 'curious_child'
  | 'tourist'
  | 'regular_commuter';

export type NpcActivity =
  | 'walking'
  | 'waiting_platform'
  | 'sitting_bench'
  | 'buying_food'
  | 'selling'
  | 'carrying_luggage'
  | 'inspecting'
  | 'boarding'
  | 'exiting'
  | 'talking'
  | 'stumbling'
  | 'patrolling'
  | 'following_guardian'
  | 'responding_emergency'
  | 'investigating'
  | 'pursuing_suspect'
  | 'escorting'
  | 'sneaking'
  | 'fleeing'
  | 'panicking'
  | 'detained'
  | 'queuing_train'
  | 'boarding_train'
  | 'disembarking'
  | 'assisting_luggage';

export type StationEventKind =
  | 'lost_luggage'
  | 'missing_child'
  | 'missed_train'
  | 'elderly_help'
  | 'passenger_argument'
  | 'medical_emergency'
  | 'overcrowded_platform'
  | 'confused_tourist'
  | 'delay_complaint'
  | 'lost_and_found';

export type EmergencyMissionKind =
  | 'lost_child'
  | 'luggage_theft'
  | 'medical_emergency'
  | 'passenger_fighting'
  | 'fire_hazard'
  | 'suspicious_package'
  | 'overcrowded_platform'
  | 'pickpocket_caught'
  | 'restricted_track_trespass'
  | 'elderly_emergency'
  | 'mobile_theft'
  | 'ticket_fraud'
  | 'attempted_robbery';

export type EmergencySeverity = 'low' | 'medium' | 'high' | 'critical';

export type MissionStatus =
  | 'reported'
  | 'investigating'
  | 'officer_dispatched'
  | 'in_pursuit'
  | 'awaiting_reunion'
  | 'resolved'
  | 'failed';

export interface EmergencyMission {
  id: string;
  kind: EmergencyMissionKind;
  isCrime: boolean;
  title: string;
  titleBn: string;
  objective: string;
  objectiveBn: string;
  locationLabel: string;
  targetNodeId: string;
  x: number;
  y: number;
  z: number;
  severity: EmergencySeverity;
  status: MissionStatus;
  timeRemainingSec: number;
  maxTimeSec: number;
  victimNpcId: string | null;
  suspectNpcId: string | null;
  childNpcId: string | null;
  witnessNpcIds: string[];
  assignedOfficerIds: string[];
  cluesCollected: string[];
  suspectIdentified: boolean;
  areaSecured: boolean;
  hasHazardProp: boolean;
  propKind: 'fire' | 'package' | 'luggage' | null;
  propActive: boolean;
  rewardMoney: number;
  rewardXp: number;
  rewardRep: number;
  penaltyRep: number;
}

export interface SecurityAchievement {
  id: string;
  title: string;
  titleBn: string;
  description: string;
  unlocked: boolean;
  unlockedDay: number | null;
}

export interface SecurityOfficerStatus {
  npcId: string;
  name: string;
  nameBn: string;
  role: 'railway_police' | 'bd_police';
  roleLabel: string;
  statusLabel: string;
  assignedMissionId: string | null;
  locationLabel: string;
  x: number;
  z: number;
}

export interface EmergencyDashboardSnapshot {
  securityRating: number;
  crimesPrevented: number;
  emergenciesResolved: number;
  emergenciesFailed: number;
  activeMissions: EmergencyMission[];
  recentResolvedMissions: EmergencyMission[];
  officers: SecurityOfficerStatus[];
  achievements: SecurityAchievement[];
}

export interface NpcMemory {
  assignedPlatform: TrackId | null;
  targetTrainNumber: string | null;
  targetDestinationBn: string | null;
  guardianNpcId: string | null;
  carryingForNpcId: string | null;
  servingCustomerId: string | null;
  workZone: string | null;
  greetedPlayer: boolean;
  bumpedCount: number;
  suspicionScore: number;
  stolenItemLabel: string | null;
  boardingStage?: 'idle' | 'heading_queue' | 'queuing' | 'stepping_in' | 'disembarking';
  boardingTrainId?: string | null;
  targetCoachIndex?: number | null;
  disembarkedFromTrainId?: string | null;
  queueSlotIndex?: number;
}

export interface NpcDialogueChoice {
  id: string;
  label: string;
  labelBn: string;
  isCorrect: boolean;
  replyBn: string;
  replyEn: string;
  satisfactionDelta: number;
  repDelta: number;
  xpDelta: number;
  moneyDelta: number;
  complaintDelta: number;
  missionAction?:
    | 'gather_clue'
    | 'dispatch_police'
    | 'confront_suspect'
    | 'reunite_child'
    | 'locate_child'
    | 'secure_area'
    | 'stabilize_emergency'
    | 'broadcast_pa';
  missionId?: string;
}

export interface ActiveNpcDialogue {
  npcId: string;
  npcName: string;
  npcNameBn: string;
  role: NpcRole;
  roleLabel: string;
  personality: NpcPersonality;
  memorySummary: string;
  incidentKind: StationEventKind | null;
  missionId?: string | null;
  missionKind?: EmergencyMissionKind | null;
  questionBn: string;
  questionEn: string;
  choices: NpcDialogueChoice[];
}

export interface NpcFloatingBubble {
  id: string;
  npcId: string;
  screenX: number; // 0..1 viewport fraction
  screenY: number; // 0..1 viewport fraction
  text: string;
  subText?: string;
  tone: 'collision' | 'vendor' | 'question' | 'incident' | 'chatter' | 'police' | 'crime';
}

export interface ActiveStationIncident {
  id: string;
  kind: StationEventKind;
  title: string;
  titleBn: string;
  locationLabel: string;
  npcId: string;
  x: number;
  z: number;
  expiresAtSec: number;
}

export interface StationUpgradeRequirement {
  id: string;
  label: string;
  labelBn: string;
  current: number;
  target: number;
  unit?: string;
  met: boolean;
}

export interface StationUpgradeTierSpec {
  level: number;
  tracksUnlocked: number;
  title: string;
  titleBn: string;
  subtitle: string;
  costCoins: number;
  rewardXp: number;
  rewardRep: number;
  revenueMultiplier: number;
  minDispatches: number;
  minSatisfaction: number;
  minReputation: number;
  minSecurityResolved: number;
  minPlayerLevel: number;
  unlockFeatures: string[];
  constructionSummaryBn: string;
}

export interface StationUpgradeSnapshot {
  stationLevel: number;
  unlockedTracks: number;
  currentTier: StationUpgradeTierSpec;
  nextTier: StationUpgradeTierSpec | null;
  requirements: StationUpgradeRequirement[];
  allRequirementsMet: boolean;
  canAfford: boolean;
  canUpgradeNow: boolean;
  money: number;
  dispatchesCompleted: number;
  satisfaction: number;
  reputation: number;
  securityActionsCompleted: number;
  playerLevel: number;
  revenueMultiplier: number;
  completedTiers: number[];
}

export interface StationSimState {
  level: number;
  xp: number;
  xpToNext: number;
  money: number;
  reputation: number; // 0 to 100
  satisfaction: number; // 0 to 100
  securityRating: number; // 0 to 100
  complaints: number;
  successfulInteractions: number;
  unresolvedIncidents: number;
  crimesPrevented: number;
  emergenciesResolved: number;
  emergenciesFailed: number;
  achievements: SecurityAchievement[];
  gameMinutes: number; // minutes since midnight (e.g. 435 = 07:15 AM)
  dayNumber: number;
  stationLevel: number;
  unlockedTracks: number; // starts at 2, expands progressively 2 -> 3 -> 4 -> 5 -> 6
  completedUpgradeLevels: number[];
  track1Signal: SignalAspect;
  track2Signal: SignalAspect;
  trackSignals: Record<TrackId, SignalAspect>;
  crossingGateClosed: boolean;
  inspectedTrains: Record<string, boolean>;
  dispatchesCompleted: number;
  lastEventMessage: string;
  lastEventTimestamp: number;
}

export interface PlayerState {
  x: number;
  y: number;
  z: number;
  vy: number;
  yaw: number;
  grounded: boolean;
  distanceWalked: number;
  speed: number;
  sprinting: boolean;
}

export interface HudSnapshot {
  stationName: string;
  stationNameBn: string;
  dayNumber: number;
  stationLevel: number;
  unlockedTracks: number;
  nextUpgradeReady: boolean;
  nextUpgradeTrackCount: number | null;
  level: number;
  xp: number;
  xpToNext: number;
  money: number;
  reputation: number;
  satisfaction: number;
  securityRating: number;
  crimesPrevented: number;
  emergenciesResolved: number;
  complaints: number;
  successfulInteractions: number;
  unresolvedIncidents: number;
  activeCrowdCount: number;
  activeIncident: ActiveStationIncident | null;
  activeMissionsCount: number;
  primaryMission: EmergencyMission | null;
  availableOfficersCount: number;
  timeFormatted: string;
  dayPeriodLabel: string;
  track1Signal: SignalAspect;
  track2Signal: SignalAspect;
  trackSignals: Record<TrackId, SignalAspect>;
  track1Occupied: boolean;
  track2Occupied: boolean;
  trackOccupancies: Record<TrackId, boolean>;
  switchPosition: SwitchPosition;
  crossingGateClosed: boolean;
  activeAlertCount: number;
  urgentTrainsCount: number;
  nearbyPrompt: {
    id: InteractableKind | 'npc_talk';
    title: string;
    actionLabel: string;
    missionId?: string;
    trainId?: string;
  } | null;
  activeTrainSummary: {
    trainId: string;
    trainNumber: string;
    name: string;
    nameBn: string;
    destination: string;
    destinationBn: string;
    assignedPlatform: TrackId | null;
    status: TrainStatus;
    scheduledArrivalStr: string;
    scheduledDepartureStr: string;
    delayMinutes: number;
    currentPassengers: number;
    passengerCapacity: number;
    doorState: TrainDoorState;
    departureStage: DepartureSequenceStage;
    signalAspect: SignalAspect;
    hasOperationalEvent: boolean;
    operationalEventTitle: string | null;
  } | null;
  lastEventMessage: string;
  dispatchesCompleted: number;
}
