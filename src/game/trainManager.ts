import { getRevenueMultiplierForLevel } from './progression';
import { applyXpAndRewards, formatGameTime, getTrackSignal, withTrackSignal } from './rules';
import type {
  CoachOccupancyState,
  ManagedTrain,
  RailwaySafetyAlert,
  SignalAspect,
  StationSimState,
  SwitchPosition,
  TrackBlockOccupancy,
  TrackId,
  TrainCategory,
  TrainOperationalEvent,
  TrainOperationalEventKind,
  TrainSimulationState,
} from './types';

export const ALL_TRACK_IDS: readonly TrackId[] = [1, 2, 3, 4, 5, 6];

export const TRACK_Z: Record<TrackId, number> = {
  1: -3.0,
  2: 3.0,
  3: 13.3,
  4: 19.3,
  5: 29.8,
  6: 35.8,
};

export const TRACK_PLATFORM_SIDE: Record<TrackId, -1 | 1> = {
  1: -1,
  2: 1,
  3: -1,
  4: 1,
  5: -1,
  6: 1,
};

export function inferTrackFromZ(z: number): TrackId {
  let closest: TrackId = 1;
  let bestDist = Infinity;
  for (const id of ALL_TRACK_IDS) {
    const d = Math.abs(TRACK_Z[id] - z);
    if (d < bestDist) {
      bestDist = d;
      closest = id;
    }
  }
  return closest;
}

export const SAFETY_MIN_GAP_M = 36;
export const APPROACH_SPAWN_DIST = 104;
export const OUTER_HOLD_X = 46;
export const PLATFORM_STOP_X = 0;
export const EXIT_DESPAWN_DIST = 114;

export interface TrainCategorySpec {
  category: TrainCategory;
  label: string;
  labelBn: string;
  maxSpeed: number;
  coachCount: number;
  passengerCapacity: number;
  capacityLabel: string;
  accentHex: string;
  isCargo: boolean;
}

export const TRAIN_CATEGORY_SPECS: Record<TrainCategory, TrainCategorySpec> = {
  intercity: {
    category: 'intercity',
    label: 'Intercity Express',
    labelBn: 'আন্তঃনগর এক্সপ্রেস',
    maxSpeed: 16.0,
    coachCount: 3,
    passengerCapacity: 720,
    capacityLabel: '720 Passengers (AC/Snigdha)',
    accentHex: '#188855',
    isCargo: false,
  },
  international: {
    category: 'international',
    label: 'International Express',
    labelBn: 'আন্তর্জাতিক এক্সপ্রেস',
    maxSpeed: 15.2,
    coachCount: 3,
    passengerCapacity: 456,
    capacityLabel: '456 Passengers (Cross-Border)',
    accentHex: '#2563eb',
    isCargo: false,
  },
  mail: {
    category: 'mail',
    label: 'Mail Express',
    labelBn: 'মেইল এক্সপ্রেস',
    maxSpeed: 13.0,
    coachCount: 2,
    passengerCapacity: 640,
    capacityLabel: '640 Passengers + Parcel',
    accentHex: '#c8322c',
    isCargo: false,
  },
  commuter: {
    category: 'commuter',
    label: 'Commuter Train',
    labelBn: 'কমিউটার ট্রেন',
    maxSpeed: 12.5,
    coachCount: 2,
    passengerCapacity: 820,
    capacityLabel: '820 Commuters',
    accentHex: '#0e7490',
    isCargo: false,
  },
  local: {
    category: 'local',
    label: 'Local Passenger',
    labelBn: 'লোকাল প্যাসেঞ্জার',
    maxSpeed: 10.2,
    coachCount: 2,
    passengerCapacity: 950,
    capacityLabel: '950 Passengers',
    accentHex: '#9a3412',
    isCargo: false,
  },
  freight: {
    category: 'freight',
    label: 'Freight Train',
    labelBn: 'মালবাহী ট্রেন',
    maxSpeed: 8.4,
    coachCount: 3,
    passengerCapacity: 0,
    capacityLabel: '1,850 Tonnes Bulk Freight',
    accentHex: '#b45309',
    isCargo: true,
  },
  container: {
    category: 'container',
    label: 'Container Cargo',
    labelBn: 'কন্টেইনার কার্গো',
    maxSpeed: 9.0,
    coachCount: 3,
    passengerCapacity: 0,
    capacityLabel: '120 TEU Export Containers',
    accentHex: '#475569',
    isCargo: true,
  },
};

export const BANGLA_SAFETY_ANNOUNCEMENTS: readonly string[] = [
  'যাত্রীদের নিরাপত্তার স্বার্থে হলুদ লাইন অতিক্রম করবেন না।',
  'সম্মানিত যাত্রীবৃন্দ, রেললাইন পারাপারের সময় অনুগ্রহ করে ফুটওভার পথ ও নিরাপদ ক্রসিং ব্যবহার করুন।',
  'শাপলাপুর জংশনে আপনার ভ্রমণ শুভ ও নিরাপদ হোক।',
];

const COACH_LABELS: readonly [string, string][] = [
  ['KA-01', 'ক-১'],
  ['KHA-02', 'খ-২'],
  ['GA-03', 'গ-৩'],
  ['GHA-04', 'ঘ-৪'],
];

export function computeCoachDoorXOffset(
  coachCount: number,
  coachIndex: number,
  direction: 1 | -1,
): number {
  const locoOffset = ((coachCount * 11.1) / 2) * direction;
  const unitCenterX = locoOffset - (coachIndex + 1) * 11.1 * direction;
  return Number((unitCenterX + 4.48 * direction).toFixed(2));
}

export function buildCoachesForTrain(
  category: TrainCategory,
  coachCount: number,
  direction: 1 | -1,
  initialOccupancyRatio = 0.56,
): { coaches: CoachOccupancyState[]; currentPassengers: number; passengerCapacity: number } {
  const spec = TRAIN_CATEGORY_SPECS[category];
  if (spec.isCargo || spec.passengerCapacity <= 0) {
    return { coaches: [], currentPassengers: 0, passengerCapacity: 0 };
  }

  const perCoachCap = Math.floor(spec.passengerCapacity / coachCount);
  let remainderCap = spec.passengerCapacity - perCoachCap * coachCount;
  const coaches: CoachOccupancyState[] = [];
  let totalPassengers = 0;

  for (let i = 0; i < coachCount; i++) {
    const cap = perCoachCap + (remainderCap > 0 ? 1 : 0);
    if (remainderCap > 0) remainderCap--;
    const pair = COACH_LABELS[i % COACH_LABELS.length];
    const variance = i === 0 ? 0.05 : i === 1 ? -0.04 : 0.02;
    const occ = Math.max(0, Math.min(cap, Math.round(cap * (initialOccupancyRatio + variance))));
    totalPassengers += occ;
    coaches.push({
      coachIndex: i,
      coachNumber: pair[0],
      coachNumberBn: pair[1],
      capacity: cap,
      passengers: occ,
      doorXOffset: computeCoachDoorXOffset(coachCount, i, direction),
      doorObstructed: false,
    });
  }

  return {
    coaches,
    currentPassengers: totalPassengers,
    passengerCapacity: spec.passengerCapacity,
  };
}

export interface TrainDoorWorldCoord {
  coachIndex: number;
  coachNumber: string;
  coachNumberBn: string;
  doorX: number;
  doorZ: number;
  queueBaseZ: number;
  platformSideSign: -1 | 1;
  capacity: number;
  passengers: number;
  doorObstructed: boolean;
}

export function getTrainDoorWorldCoords(train: ManagedTrain): TrainDoorWorldCoord[] {
  const trackId: TrackId = train.assignedPlatform ?? inferTrackFromZ(train.z);
  const platformSideSign: -1 | 1 = TRACK_PLATFORM_SIDE[trackId];
  const doorZ = train.z + platformSideSign * 1.35;
  const queueBaseZ = train.z + platformSideSign * 2.25;

  return train.coaches.map((c) => ({
    coachIndex: c.coachIndex,
    coachNumber: c.coachNumber,
    coachNumberBn: c.coachNumberBn,
    doorX: train.x + c.doorXOffset,
    doorZ,
    queueBaseZ,
    platformSideSign,
    capacity: c.capacity,
    passengers: c.passengers,
    doorObstructed: c.doorObstructed,
  }));
}

function toBengaliDigits(input: string | number): string {
  const map = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(input).replace(/\d/g, (d) => map[Number(d)] ?? d);
}

export function buildTrainBanglaAnnouncement(
  train: ManagedTrain,
  kind:
    | 'arrival'
    | 'delay'
    | 'boarding'
    | 'doors_opening'
    | 'doors_closing'
    | 'departure'
    | 'safety',
): string {
  if (kind === 'safety') {
    return BANGLA_SAFETY_ANNOUNCEMENTS[0];
  }
  if (kind === 'delay') {
    const minsBn = toBengaliDigits(Math.max(5, train.delayMinutes || 15));
    if (train.destination === 'Dhaka') {
      return `ঢাকাগামী ট্রেনটি নির্ধারিত সময়ের চেয়ে ${minsBn} মিনিট বিলম্বে স্টেশনে পৌঁছাবে।`;
    }
    return `সম্মানিত যাত্রীবৃন্দ, ${train.destinationBn}গামী ${train.nameBn} নির্ধারিত সময়ের চেয়ে ${minsBn} মিনিট বিলম্বে স্টেশনে পৌঁছাবে।`;
  }
  const platBn = train.assignedPlatform ? toBengaliDigits(train.assignedPlatform) : '১';
  if (kind === 'doors_opening') {
    return `সম্মানিত যাত্রীবৃন্দ, ${platBn} নম্বর প্ল্যাটফর্মে ${train.nameBn} থেমেছে, ট্রেনের দরজাগুলো খোলা হয়েছে। সাবধানে ওঠানামা করুন।`;
  }
  if (kind === 'doors_closing') {
    return `দৃষ্টি আকর্ষণ, ${platBn} নম্বর প্ল্যাটফর্মে ${train.destinationBn}গামী ${train.nameBn}-এর দরজা বন্ধ হচ্ছে। হলুদ লাইনের পেছনে দাঁড়ান।`;
  }
  if (kind === 'departure') {
    return `সম্মানিত যাত্রীবৃন্দ, ${platBn} নম্বর প্ল্যাটফর্ম থেকে ${train.destinationBn}গামী ${train.nameBn} এখন ছেড়ে যাচ্ছে। শুভ যাত্রা!`;
  }
  if (kind === 'boarding') {
    return `সম্মানিত যাত্রীবৃন্দ, ${platBn} নম্বর প্ল্যাটফর্মে অবস্থানরত ${train.destinationBn}গামী ${train.nameBn} কিছুক্ষণের মধ্যেই ছেড়ে যাবে।`;
  }
  if (train.category === 'intercity') {
    return `সম্মানিত যাত্রীবৃন্দ, ${platBn} নম্বর প্ল্যাটফর্মে আন্তঃনগর ট্রেন প্রবেশ করছে।`;
  }
  const spec = TRAIN_CATEGORY_SPECS[train.category];
  return `সম্মানিত যাত্রীবৃন্দ, ${platBn} নম্বর প্ল্যাটফর্মে ${train.destinationBn}গামী ${train.nameBn} (${spec.labelBn}) প্রবেশ করছে।`;
}

export interface TrainOperationalEventSpec {
  kind: TrainOperationalEventKind;
  title: string;
  titleBn: string;
  description: string;
  descriptionBn: string;
  blocksDeparture: boolean;
  primaryActionLabel: string;
  primaryActionLabelBn: string;
  secondaryActionLabel?: string;
}

export const TRAIN_OPERATIONAL_EVENT_SPECS: Record<
  TrainOperationalEventKind,
  TrainOperationalEventSpec
> = {
  wrong_train_passenger: {
    kind: 'wrong_train_passenger',
    title: 'Passenger Boarding Wrong Train',
    titleBn: 'ভুল ট্রেনে উঠতে যাওয়া যাত্রী',
    description: 'A confused traveler with a Chattogram ticket is boarding the wrong coach.',
    descriptionBn: 'একজন যাত্রী ভুল কোচে উঠে পড়েছেন, সঠিক প্ল্যাটফর্ম দেখিয়ে দিন।',
    blocksDeparture: false,
    primaryActionLabel: 'Guide to Correct Platform/Train',
    primaryActionLabelBn: 'সঠিক ট্রেন দেখিয়ে দিন',
  },
  overcrowded_coach: {
    kind: 'overcrowded_coach',
    title: 'Overcrowded Coach Vestibule',
    titleBn: 'কোচের দরজায় অতিরিক্ত ভিড়',
    description: 'Passengers are crowding Coach 1 entrance while rear coaches have empty seats.',
    descriptionBn: 'প্রথম কোচে অতিরিক্ত ভিড় জমেছে, পেছনের খালি কোচে পাঠান।',
    blocksDeparture: false,
    primaryActionLabel: 'Redistribute to Rear Coaches',
    primaryActionLabelBn: 'পেছনের কোচে যাত্রী সরান',
  },
  missing_seat: {
    kind: 'missing_seat',
    title: 'Missing Seat Dispute',
    titleBn: 'আসন নিয়ে বিভ্রান্তি',
    description: 'A passenger cannot locate their reserved seat number inside the coach.',
    descriptionBn: 'একজন যাত্রী তার নির্ধারিত আসন খুঁজে পাচ্ছেন না।',
    blocksDeparture: false,
    primaryActionLabel: 'Verify Ticket & Assign Seat',
    primaryActionLabelBn: 'টিকিট যাচাই ও আসন নিশ্চিত করুন',
  },
  luggage_blocking_door: {
    kind: 'luggage_blocking_door',
    title: 'Luggage Blocking Train Door',
    titleBn: 'দরজায় মালামাল আটকে আছে',
    description: 'Unattended cargo sacks are jammed in the vestibule preventing safe door closure.',
    descriptionBn: 'বড় লাগেজ দরজার মুখে থাকায় দরজা বন্ধ করা যাচ্ছে না।',
    blocksDeparture: true,
    primaryActionLabel: 'Clear Luggage with Porters',
    primaryActionLabelBn: 'কুলির সাহায্যে দরজা পরিষ্কার করুন',
  },
  passenger_assistance: {
    kind: 'passenger_assistance',
    title: 'Elderly Boarding Assistance',
    titleBn: 'বয়স্ক যাত্রীর ওঠার সহায়তা',
    description: 'An elderly passenger with heavy bags needs help stepping up into the coach.',
    descriptionBn: 'একজন বয়স্ক যাত্রীর ট্রেনে উঠতে সহায়তার প্রয়োজন।',
    blocksDeparture: false,
    primaryActionLabel: 'Assist Elderly Boarding',
    primaryActionLabelBn: 'যাত্রীকে নিরাপদে তুলে দিন',
  },
  delayed_departure: {
    kind: 'delayed_departure',
    title: 'Departure Delay Coordination',
    titleBn: 'বিলম্বিত যাত্রা সমন্বয়',
    description: 'Signal clearance check requires updated Bangla departure notice for passengers.',
    descriptionBn: 'বিলম্বের বিষয়ে যাত্রীদের বাংলা ঘোষণা দেওয়া প্রয়োজন।',
    blocksDeparture: false,
    primaryActionLabel: 'Broadcast Delay PA Update',
    primaryActionLabelBn: 'বাংলায় সময়সূচী ঘোষণা দিন',
  },
  platform_congestion: {
    kind: 'platform_congestion',
    title: 'Yellow-Line Platform Congestion',
    titleBn: 'হলুদ লাইনের কাছে ভিড়',
    description: 'Commuters are pressing past the yellow safety line near open train doors.',
    descriptionBn: 'যাত্রীরা হলুদ নিরাপত্তা লাইন অতিক্রম করে ভিড় করছেন।',
    blocksDeparture: true,
    primaryActionLabel: 'Clear Yellow-Line Zone',
    primaryActionLabelBn: 'হলুদ লাইন পরিষ্কার করুন',
  },
  door_obstruction: {
    kind: 'door_obstruction',
    title: 'Door Sensor Obstruction',
    titleBn: 'দরজার সেন্সর বাধাগ্রস্ত',
    description: 'Sliding door track is jammed; safety interlock prevents departure until cleared.',
    descriptionBn: 'দরজার লক আটকে যাওয়ায় ট্রেন ছাড়া যাচ্ছে না।',
    blocksDeparture: true,
    primaryActionLabel: 'Reset & Clear Door Track',
    primaryActionLabelBn: 'দরজার লক ঠিক করুন',
  },
  last_minute_boarding: {
    kind: 'last_minute_boarding',
    title: 'Last-Minute Sprinter Boarding',
    titleBn: 'শেষ মুহূর্তে দৌড়ে আসা যাত্রী',
    description: 'A late passenger is sprinting down the platform with a valid ticket.',
    descriptionBn: 'টিকিটসহ একজন যাত্রী শেষ মুহূর্তে ট্রেনের দিকে দৌড়ে আসছেন।',
    blocksDeparture: false,
    primaryActionLabel: 'Allow Safe Boarding',
    primaryActionLabelBn: 'নিরাপদে উঠতে দিন',
    secondaryActionLabel: 'Hold Behind Yellow Line',
  },
};

export const OPERATIONAL_EVENT_ROTATION: readonly TrainOperationalEventKind[] = [
  'luggage_blocking_door',
  'wrong_train_passenger',
  'passenger_assistance',
  'overcrowded_coach',
  'door_obstruction',
  'missing_seat',
  'platform_congestion',
  'last_minute_boarding',
  'delayed_departure',
];

export function createOperationalEventForTrain(
  train: ManagedTrain,
  kind: TrainOperationalEventKind,
  seqId: number,
): TrainOperationalEvent {
  const spec = TRAIN_OPERATIONAL_EVENT_SPECS[kind];
  const coachIdx = Math.min(Math.max(0, train.coaches.length - 1), seqId % Math.max(1, train.coaches.length));
  const coachNumber = train.coaches[coachIdx]?.coachNumber ?? 'KA-01';
  return {
    id: `op_${train.id}_${seqId}`,
    trainId: train.id,
    trainNumber: train.trainNumber,
    kind,
    title: spec.title,
    titleBn: spec.titleBn,
    description: spec.description,
    descriptionBn: spec.descriptionBn,
    coachNumber,
    coachIndex: coachIdx,
    resolved: false,
    blocksDeparture: spec.blocksDeparture,
    primaryActionLabel: spec.primaryActionLabel,
    primaryActionLabelBn: spec.primaryActionLabelBn,
    secondaryActionLabel: spec.secondaryActionLabel,
  };
}

interface DailySlotTemplate {
  trainNumber: string;
  name: string;
  nameBn: string;
  category: TrainCategory;
  origin: string;
  destination: string;
  destinationBn: string;
  arrivalMin: number;
  dwellMin: number;
  delayMinutes: number;
  direction: 1 | -1;
}

const DAILY_ROSTER: readonly DailySlotTemplate[] = [
  {
    trainNumber: '702',
    name: 'Subarna Intercity Express',
    nameBn: 'সুবর্ণ আন্তঃনগর এক্সপ্রেস',
    category: 'intercity',
    origin: 'Dhaka',
    destination: 'Chattogram',
    destinationBn: 'চট্টগ্রাম',
    arrivalMin: 7 * 60 + 10,
    dwellMin: 12,
    delayMinutes: 0,
    direction: 1,
  },
  {
    trainNumber: '24',
    name: 'Turag Commuter',
    nameBn: 'তুরাগ কমিউটার',
    category: 'commuter',
    origin: 'Joydebpur',
    destination: 'Dhaka',
    destinationBn: 'ঢাকা',
    arrivalMin: 7 * 60 + 18,
    dwellMin: 8,
    delayMinutes: 0,
    direction: 1,
  },
  {
    trainNumber: '18',
    name: 'Padma Mail Express',
    nameBn: 'পদ্মা মেইল এক্সপ্রেস',
    category: 'mail',
    origin: 'Rajshahi',
    destination: 'Dhaka',
    destinationBn: 'ঢাকা',
    arrivalMin: 7 * 60 + 21,
    dwellMin: 10,
    delayMinutes: 15,
    direction: -1,
  },
  {
    trainNumber: 'F-404',
    name: 'Jamuna Freight',
    nameBn: 'যমুনা মালবাহী',
    category: 'freight',
    origin: 'Sirajganj',
    destination: 'Narayanganj',
    destinationBn: 'নারায়ণগঞ্জ',
    arrivalMin: 8 * 60 + 25,
    dwellMin: 8,
    delayMinutes: 0,
    direction: 1,
  },
  {
    trainNumber: '3107',
    name: 'Maitree International Express',
    nameBn: 'মৈত্রী আন্তর্জাতিক এক্সপ্রেস',
    category: 'international',
    origin: 'Dhaka Cantt',
    destination: 'Kolkata',
    destinationBn: 'কলকাতা',
    arrivalMin: 9 * 60 + 45,
    dwellMin: 12,
    delayMinutes: 0,
    direction: -1,
  },
  {
    trainNumber: 'C-88',
    name: 'Chattogram Container Cargo',
    nameBn: 'চট্টগ্রাম কন্টেইনার কার্গো',
    category: 'container',
    origin: 'Kamalapur ICD',
    destination: 'Chattogram Port',
    destinationBn: 'চট্টগ্রাম বন্দর',
    arrivalMin: 11 * 60 + 30,
    dwellMin: 9,
    delayMinutes: 5,
    direction: 1,
  },
  {
    trainNumber: '51',
    name: 'Barendra Local',
    nameBn: 'বরেন্দ্র লোকাল',
    category: 'local',
    origin: 'Bogura',
    destination: 'Mymensingh',
    destinationBn: 'ময়মনসিংহ',
    arrivalMin: 13 * 60 + 35,
    dwellMin: 11,
    delayMinutes: 0,
    direction: -1,
  },
  {
    trainNumber: '742',
    name: 'Tista Intercity Express',
    nameBn: 'তিস্তা আন্তঃনগর এক্সপ্রেস',
    category: 'intercity',
    origin: 'Dewanganj',
    destination: 'Dhaka',
    destinationBn: 'ঢাকা',
    arrivalMin: 15 * 60 + 45,
    dwellMin: 12,
    delayMinutes: 15,
    direction: 1,
  },
  {
    trainNumber: '62',
    name: 'Karnaphuli Commuter',
    nameBn: 'কর্ণফুলী কমিউটার',
    category: 'commuter',
    origin: 'Bhairab',
    destination: 'Dhaka',
    destinationBn: 'ঢাকা',
    arrivalMin: 17 * 60 + 45,
    dwellMin: 9,
    delayMinutes: 0,
    direction: -1,
  },
  {
    trainNumber: '3112',
    name: 'Bandhan International Express',
    nameBn: 'বন্ধন আন্তর্জাতিক এক্সপ্রেস',
    category: 'international',
    origin: 'Khulna',
    destination: 'Kolkata',
    destinationBn: 'কলকাতা',
    arrivalMin: 19 * 60 + 45,
    dwellMin: 12,
    delayMinutes: 0,
    direction: -1,
  },
];

const EXPANSION_ROSTER: readonly DailySlotTemplate[] = [
  {
    trainNumber: '722',
    name: 'Mohanagar Godhuli Express',
    nameBn: 'মহানগর গোধূলী এক্সপ্রেস',
    category: 'intercity',
    origin: 'Chattogram',
    destination: 'Dhaka',
    destinationBn: 'ঢাকা',
    arrivalMin: 7 * 60 + 26,
    dwellMin: 11,
    delayMinutes: 0,
    direction: -1,
  },
  {
    trainNumber: '31',
    name: 'Uttara City Commuter',
    nameBn: 'উত্তরা সিটি কমিউটার',
    category: 'commuter',
    origin: 'Tongi',
    destination: 'Narayanganj',
    destinationBn: 'নারায়ণগঞ্জ',
    arrivalMin: 7 * 60 + 36,
    dwellMin: 8,
    delayMinutes: 0,
    direction: 1,
  },
  {
    trainNumber: '774',
    name: 'Kalni Express',
    nameBn: 'কালনী এক্সপ্রেস',
    category: 'intercity',
    origin: 'Sylhet',
    destination: 'Dhaka',
    destinationBn: 'ঢাকা',
    arrivalMin: 7 * 60 + 50,
    dwellMin: 10,
    delayMinutes: 5,
    direction: -1,
  },
  {
    trainNumber: 'C-104',
    name: 'Padma ICD Port Shuttle',
    nameBn: 'পদ্মা আইসিডি পোর্ট শাটল',
    category: 'container',
    origin: 'Chattogram Port',
    destination: 'Dhaka ICD',
    destinationBn: 'ঢাকা আইসিডি',
    arrivalMin: 8 * 60 + 8,
    dwellMin: 9,
    delayMinutes: 0,
    direction: -1,
  },
];

function buildTrainFromTemplate(
  tpl: DailySlotTemplate,
  idx: number,
  safeDay: number,
  shiftMinutes: number,
  anchorDayOne: boolean,
  startMinutes = 7 * 60 + 15,
): ManagedTrain {
  const spec = TRAIN_CATEGORY_SPECS[tpl.category];
  const baseArrival =
    anchorDayOne
      ? tpl.arrivalMin
      : (((startMinutes + idx * 72 + ((idx + safeDay) % 2) * 8 + shiftMinutes) % 1440) + 1440) % 1440;

  const variedDelay =
    anchorDayOne
      ? tpl.delayMinutes
      : idx === 2 || (idx + safeDay) % 4 === 0
        ? 10 + ((safeDay + idx) % 3) * 5
        : 0;

  const isInitialAtPlatform = anchorDayOne && idx === 0;
  const isInitialApproaching = anchorDayOne && idx === 1;
  const assignedPlatform: TrackId | null = isInitialAtPlatform ? 1 : null;
  const trackZ = assignedPlatform ? TRACK_Z[assignedPlatform] : TRACK_Z[2];

  const startX = isInitialAtPlatform
    ? PLATFORM_STOP_X
    : isInitialApproaching
      ? -64
      : tpl.direction === 1
        ? -APPROACH_SPAWN_DIST
        : APPROACH_SPAWN_DIST;

  const status = isInitialAtPlatform
    ? 'Boarding'
    : isInitialApproaching
      ? 'Approaching'
      : variedDelay > 0
        ? 'Delayed'
        : 'Scheduled';

  const coachInit = buildCoachesForTrain(
    tpl.category,
    spec.coachCount,
    tpl.direction,
    isInitialAtPlatform ? 0.54 : 0.48,
  );

  const baseTrain: ManagedTrain = {
    id: `d${safeDay}_t${idx}_${tpl.trainNumber}`,
    trainNumber: safeDay === 1 ? tpl.trainNumber : `${tpl.trainNumber}-${safeDay}`,
    name: tpl.name,
    nameBn: tpl.nameBn,
    category: tpl.category,
    origin: tpl.origin,
    destination: tpl.destination,
    destinationBn: tpl.destinationBn,
    scheduledArrivalMin: baseArrival,
    scheduledDepartureMin: baseArrival + tpl.dwellMin,
    delayMinutes: variedDelay,
    assignedPlatform,
    status,
    direction: tpl.direction,
    x: startX,
    z: trackZ,
    speed: isInitialApproaching ? 7.5 : 0,
    maxSpeed: spec.maxSpeed,
    coachCount: spec.coachCount,
    capacityLabel: spec.capacityLabel,
    passengerCapacity: coachInit.passengerCapacity,
    currentPassengers: coachInit.currentPassengers,
    coaches: coachInit.coaches,
    doorState: isInitialAtPlatform && !spec.isCargo ? 'open' : 'closed',
    doorOpenProgress: isInitialAtPlatform && !spec.isCargo ? 1 : 0,
    doorsObstructed: false,
    platformClear: true,
    safetyChecksPassed: false,
    departureStage: 'idle',
    disembarkRemaining: isInitialAtPlatform && !spec.isCargo ? 4 : 0,
    operationalEvent: null,
    emergencyStopped: false,
    holdingReason: null,
    inspected: false,
    boardingProgress: isInitialAtPlatform ? 0.45 : 0,
    departureAuthorized: false,
    arrivalAnnounced: isInitialAtPlatform,
    delayAnnounced: false,
    hornTriggeredArrival: isInitialAtPlatform,
  };

  if (isInitialAtPlatform && !spec.isCargo) {
    baseTrain.operationalEvent = createOperationalEventForTrain(
      baseTrain,
      'passenger_assistance',
      1,
    );
  }

  return baseTrain;
}

export function generateDailySchedule(
  dayNumber: number,
  unlockedTracks = 2,
  startMinutes = 7 * 60 + 15,
): ManagedTrain[] {
  const safeDay = Math.max(1, Math.floor(dayNumber));
  const rotation = (safeDay - 1) % DAILY_ROSTER.length;
  const shiftMinutes = ((safeDay - 1) % 3) * 6;

  // On Day 1 keep slot 0 & 1 & 2 cleanly anchored so player starts with an active station immediately;
  // On Day 2+ rotate slots and vary delays so every day offers a fresh timetable.
  const baseOrdered =
    safeDay === 1
      ? DAILY_ROSTER
      : [...DAILY_ROSTER.slice(rotation), ...DAILY_ROSTER.slice(0, rotation)];

  const extraCount = Math.max(0, Math.min(EXPANSION_ROSTER.length, unlockedTracks - 2));
  const combined = [...baseOrdered, ...EXPANSION_ROSTER.slice(0, extraCount)];

  return combined.map((tpl, idx) =>
    buildTrainFromTemplate(
      tpl,
      idx,
      safeDay,
      shiftMinutes,
      safeDay === 1 || idx === 0 || idx === 1,
      startMinutes,
    ),
  );
}

function createEmptyOccupancy(): TrackBlockOccupancy {
  return {
    westApproachTrainId: null,
    platformTrainId: null,
    eastApproachTrainId: null,
    occupied: false,
  };
}

export function computeTrackOccupancy(trains: readonly ManagedTrain[]): {
  track1: TrackBlockOccupancy;
  track2: TrackBlockOccupancy;
  byTrack: Record<TrackId, TrackBlockOccupancy>;
} {
  const byTrack: Record<TrackId, TrackBlockOccupancy> = {
    1: createEmptyOccupancy(),
    2: createEmptyOccupancy(),
    3: createEmptyOccupancy(),
    4: createEmptyOccupancy(),
    5: createEmptyOccupancy(),
    6: createEmptyOccupancy(),
  };

  for (const t of trains) {
    if (t.status === 'Scheduled' || t.status === 'Departed') continue;
    // Unassigned delayed trains haven't entered physical track blocks yet unless already approaching
    if (t.assignedPlatform === null && Math.abs(t.x) > 88) continue;

    const targetTrack: TrackId = t.assignedPlatform ?? inferTrackFromZ(t.z);
    const bucket = byTrack[targetTrack];

    if (Math.abs(t.x) <= 32) {
      bucket.platformTrainId = t.id;
    } else if (t.x < -32) {
      bucket.westApproachTrainId = t.id;
    } else {
      bucket.eastApproachTrainId = t.id;
    }
    bucket.occupied = Boolean(
      bucket.platformTrainId || bucket.westApproachTrainId || bucket.eastApproachTrainId,
    );
  }

  return { track1: byTrack[1], track2: byTrack[2], byTrack };
}

export function createInitialTrainSimulation(
  dayNumber = 1,
  unlockedTracks = 2,
): TrainSimulationState {
  const safeTracks = Math.max(2, Math.min(6, unlockedTracks));
  const trains = generateDailySchedule(dayNumber, safeTracks);
  const occ = computeTrackOccupancy(trains);
  return {
    dayNumber,
    unlockedTracks: safeTracks,
    switchPosition: 'straight',
    trains,
    track1Occupancy: occ.track1,
    track2Occupancy: occ.track2,
    trackOccupancies: occ.byTrack,
    alerts: buildSafetyAlerts(
      trains,
      occ.byTrack,
      'straight',
      { 1: 'red', 2: 'red', 3: 'red', 4: 'red', 5: 'red', 6: 'red' },
      safeTracks,
    ),
    lastAnnouncementText: null,
    nextOperationalEventIndex: 1,
  };
}

export function syncTrainSimulationUnlockedTracks(
  trainState: TrainSimulationState,
  unlockedTracks: number,
  currentGameMinutes = 435,
): TrainSimulationState {
  const safeTracks = Math.max(2, Math.min(6, unlockedTracks));
  const prevTracks = trainState.unlockedTracks ?? 2;
  if (safeTracks <= prevTracks) {
    return trainState;
  }

  const nextTrains = [...trainState.trains];
  const extraCount = Math.min(EXPANSION_ROSTER.length, safeTracks - 2);
  for (let i = 0; i < extraCount; i++) {
    const tpl = EXPANSION_ROSTER[i];
    const idPrefix = `d${trainState.dayNumber}_exp${i}_${tpl.trainNumber}`;
    if (!nextTrains.some((t) => t.id.includes(tpl.trainNumber))) {
      const added = buildTrainFromTemplate(tpl, nextTrains.length, trainState.dayNumber, 0, false);
      added.id = idPrefix;
      added.scheduledArrivalMin = Math.round(currentGameMinutes + 2 + i * 7);
      added.scheduledDepartureMin = added.scheduledArrivalMin + tpl.dwellMin;
      added.status = i === extraCount - 1 ? 'Approaching' : 'Scheduled';
      if (added.status === 'Approaching') {
        added.x = added.direction === 1 ? -76 : 76;
        added.speed = added.maxSpeed * 0.55;
      }
      nextTrains.push(added);
    }
  }

  const occ = computeTrackOccupancy(nextTrains);
  return {
    ...trainState,
    unlockedTracks: safeTracks,
    trains: nextTrains,
    track1Occupancy: occ.track1,
    track2Occupancy: occ.track2,
    trackOccupancies: occ.byTrack,
  };
}

function signalsRecordFromSim(simState: StationSimState): Record<TrackId, SignalAspect> {
  return {
    1: getTrackSignal(simState, 1),
    2: getTrackSignal(simState, 2),
    3: getTrackSignal(simState, 3),
    4: getTrackSignal(simState, 4),
    5: getTrackSignal(simState, 5),
    6: getTrackSignal(simState, 6),
  };
}

function buildSafetyAlerts(
  trains: readonly ManagedTrain[],
  byTrack: Record<TrackId, TrackBlockOccupancy>,
  switchPos: SwitchPosition,
  signals: Record<TrackId, SignalAspect>,
  unlockedTracks = 2,
): RailwaySafetyAlert[] {
  const alerts: RailwaySafetyAlert[] = [];

  for (const t of trains) {
    if (t.emergencyStopped) {
      alerts.push({
        id: `estop_${t.id}`,
        severity: 'critical',
        message: `EMERGENCY HOLD: ${t.name} (#${t.trainNumber}) halted by Station Master.`,
      });
    } else if (t.doorsObstructed || (t.operationalEvent && !t.operationalEvent.resolved && t.operationalEvent.blocksDeparture)) {
      alerts.push({
        id: `opblock_${t.id}`,
        severity: 'critical',
        message: `DOOR/SAFETY HOLD (${t.name} #${t.trainNumber}): ${t.operationalEvent?.title ?? 'Door Obstruction'} in ${t.operationalEvent?.coachNumber ?? 'Coach'}.`,
      });
    } else if (t.holdingReason) {
      alerts.push({
        id: `hold_${t.id}`,
        severity: 'warning',
        message: `${t.name} (#${t.trainNumber}): ${t.holdingReason}`,
      });
    } else if (
      (t.status === 'Approaching' || t.status === 'Delayed') &&
      t.assignedPlatform === null &&
      Math.abs(t.x) <= 95
    ) {
      alerts.push({
        id: `assign_${t.id}`,
        severity: 'warning',
        message: `Platform needed: Assign Track 1–${unlockedTracks} for ${t.name} (#${t.trainNumber}).`,
      });
    } else if ((t.status === 'At Platform' || t.status === 'Boarding') && t.boardingProgress >= 0.95) {
      alerts.push({
        id: `ready_${t.id}`,
        severity: 'info',
        message: `${t.name} (#${t.trainNumber}) on Platform ${t.assignedPlatform} ready for departure sequence.`,
      });
    }
  }

  if (switchPos === 'crossover' && (byTrack[1].platformTrainId || byTrack[2].platformTrainId)) {
    alerts.push({
      id: 'switch_crossover',
      severity: 'info',
      message: 'Track Crossover Switch active — routing trains between station throat tracks.',
    });
  }

  for (let i = 1; i <= unlockedTracks; i++) {
    const id = i as TrackId;
    const occ = byTrack[id];
    if (signals[id] === 'green' && occ.platformTrainId && occ.eastApproachTrainId) {
      alerts.push({
        id: `t${id}_conflict`,
        severity: 'critical',
        message: `Track ${id} conflict detected ahead — Auto Train Protection holding trailing unit.`,
      });
    }
  }

  return alerts;
}

export interface TrainActionOutcome {
  simState: StationSimState;
  trainState: TrainSimulationState;
  announcement: string | null;
  sound: 'signal' | 'bell' | 'horn' | 'coin' | 'gate' | null;
  accepted: boolean;
}

export function assignTrainPlatform(
  simState: StationSimState,
  trainState: TrainSimulationState,
  trainId: string,
  platform: TrackId,
  nowMs: number,
): TrainActionOutcome {
  const unlockedTracks = Math.max(2, Math.min(6, simState.unlockedTracks || trainState.unlockedTracks || 2));
  if (platform > unlockedTracks) {
    const lockedSim = applyXpAndRewards(
      simState,
      {
        message: `Track ${platform} is not yet constructed! Open Station Upgrades [U] to expand tracks.`,
      },
      nowMs,
    );
    return { simState: lockedSim, trainState, announcement: null, sound: 'signal', accepted: false };
  }

  const train = trainState.trains.find((t) => t.id === trainId);
  if (!train) {
    return { simState, trainState, announcement: null, sound: null, accepted: false };
  }

  if (
    train.status === 'At Platform' ||
    train.status === 'Boarding' ||
    train.status === 'Departing' ||
    train.status === 'Departed'
  ) {
    const nextSim = applyXpAndRewards(
      simState,
      { message: `${train.name} is already ${train.status.toLowerCase()} and cannot be reassigned.` },
      nowMs,
    );
    return { simState: nextSim, trainState, announcement: null, sound: null, accepted: false };
  }

  // Check if another active train already holds or is assigned to this platform
  const conflict = trainState.trains.find(
    (other) =>
      other.id !== train.id &&
      other.assignedPlatform === platform &&
      other.status !== 'Departed' &&
      other.status !== 'Scheduled' &&
      (other.status === 'At Platform' ||
        other.status === 'Boarding' ||
        other.status === 'Arriving' ||
        (other.status === 'Approaching' && Math.abs(other.x) < 75)),
  );

  if (conflict) {
    const penalizedSim = applyXpAndRewards(
      simState,
      {
        repDelta: -3,
        moneyDelta: -25,
        message: `CONFLICT WARNING: Platform ${platform} is occupied by ${conflict.name}! Assignment blocked (-3% Rep).`,
      },
      nowMs,
    );
    const alert: RailwaySafetyAlert = {
      id: `conflict_${train.id}_${platform}`,
      severity: 'critical',
      message: `Unsafe assignment blocked: Platform ${platform} occupied by ${conflict.name}.`,
    };
    return {
      simState: penalizedSim,
      trainState: {
        ...trainState,
        alerts: [alert, ...trainState.alerts.filter((a) => a.id !== alert.id)],
      },
      announcement: null,
      sound: 'signal',
      accepted: false,
    };
  }

  const nextZ = TRACK_Z[platform];
  const updatedTrains = trainState.trains.map((t) =>
    t.id === trainId
      ? {
          ...t,
          assignedPlatform: platform,
          z: nextZ,
          holdingReason: null,
          arrivalAnnounced: true,
        }
      : t,
  );
  const updatedTrain = updatedTrains.find((t) => t.id === trainId)!;
  const occ = computeTrackOccupancy(updatedTrains);
  const announcement = buildTrainBanglaAnnouncement(updatedTrain, 'arrival');

  const rewardedSim = applyXpAndRewards(
    simState,
    {
      xpDelta: 20,
      repDelta: 1,
      message: `Assigned ${train.name} (#${train.trainNumber}) to Platform ${platform}. Clear Track ${platform} signal to YELLOW/GREEN.`,
    },
    nowMs,
  );

  return {
    simState: rewardedSim,
    trainState: {
      ...trainState,
      trains: updatedTrains,
      track1Occupancy: occ.track1,
      track2Occupancy: occ.track2,
      trackOccupancies: occ.byTrack,
      alerts: buildSafetyAlerts(
        updatedTrains,
        occ.byTrack,
        trainState.switchPosition,
        signalsRecordFromSim(rewardedSim),
        unlockedTracks,
      ),
      lastAnnouncementText: announcement,
    },
    announcement,
    sound: 'bell',
    accepted: true,
  };
}

export function setTrackSignalAspect(
  simState: StationSimState,
  trainState: TrainSimulationState,
  track: TrackId,
  aspect: SignalAspect,
  nowMs: number,
): TrainActionOutcome {
  const unlockedTracks = Math.max(2, Math.min(6, simState.unlockedTracks || trainState.unlockedTracks || 2));
  if (track > unlockedTracks) {
    return { simState, trainState, announcement: null, sound: 'signal', accepted: false };
  }

  const occ = trainState.trackOccupancies?.[track] ?? (track === 1 ? trainState.track1Occupancy : trainState.track2Occupancy);

  // Safety Interlock: block setting GREEN when both platform & approach/exit on same track are occupied
  if (aspect === 'green' && occ.platformTrainId && (occ.westApproachTrainId || occ.eastApproachTrainId)) {
    const warnedSim = applyXpAndRewards(
      simState,
      {
        repDelta: -2,
        message: `SAFETY INTERLOCK: Cannot set Track ${track} to GREEN while two trains occupy conflicting blocks!`,
      },
      nowMs,
    );
    return {
      simState: warnedSim,
      trainState,
      announcement: null,
      sound: 'signal',
      accepted: false,
    };
  }

  const updatedSim = withTrackSignal(simState, track, aspect);

  const aspectLabel =
    aspect === 'green'
      ? 'GREEN (Track Clear — Full Speed)'
      : aspect === 'yellow'
        ? 'YELLOW (Caution — Reduced Speed)'
        : 'RED (Stop / Hold)';

  const nextSim = applyXpAndRewards(
    updatedSim,
    {
      xpDelta: 10,
      message: `Track ${track} Signal set to ${aspectLabel}.`,
    },
    nowMs,
  );

  const byTrack = trainState.trackOccupancies ?? {
    1: trainState.track1Occupancy,
    2: trainState.track2Occupancy,
    3: createEmptyOccupancy(),
    4: createEmptyOccupancy(),
    5: createEmptyOccupancy(),
    6: createEmptyOccupancy(),
  };

  return {
    simState: nextSim,
    trainState: {
      ...trainState,
      alerts: buildSafetyAlerts(
        trainState.trains,
        byTrack,
        trainState.switchPosition,
        signalsRecordFromSim(nextSim),
        unlockedTracks,
      ),
    },
    announcement: null,
    sound: 'signal',
    accepted: true,
  };
}

export function toggleSwitchPosition(
  simState: StationSimState,
  trainState: TrainSimulationState,
  nowMs: number,
): TrainActionOutcome {
  // Prevent flipping switch directly underneath a moving train crossing the throat (|x| in 28..42)
  const trainOnSwitch = trainState.trains.find(
    (t) =>
      t.status !== 'Scheduled' &&
      t.status !== 'Departed' &&
      Math.abs(t.x) >= 27 &&
      Math.abs(t.x) <= 43 &&
      t.speed > 0.2,
  );

  if (trainOnSwitch) {
    const blockedSim = applyXpAndRewards(
      simState,
      {
        repDelta: -2,
        message: `SWITCH LOCKED: ${trainOnSwitch.name} is traversing the points! Wait until track throat clears.`,
      },
      nowMs,
    );
    return { simState: blockedSim, trainState, announcement: null, sound: 'signal', accepted: false };
  }

  const nextPos: SwitchPosition =
    trainState.switchPosition === 'straight' ? 'crossover' : 'straight';

  const nextSim = applyXpAndRewards(
    simState,
    {
      xpDelta: 10,
      message:
        nextPos === 'crossover'
          ? 'Track Switch set to CROSSOVER (Track 1 <-> Track 2 throat linked).'
          : 'Track Switch set to STRAIGHT (Independent parallel mainlines).',
    },
    nowMs,
  );

  return {
    simState: nextSim,
    trainState: {
      ...trainState,
      switchPosition: nextPos,
      alerts: buildSafetyAlerts(
        trainState.trains,
        trainState.trackOccupancies ?? {
          1: trainState.track1Occupancy,
          2: trainState.track2Occupancy,
          3: createEmptyOccupancy(),
          4: createEmptyOccupancy(),
          5: createEmptyOccupancy(),
          6: createEmptyOccupancy(),
        },
        nextPos,
        signalsRecordFromSim(nextSim),
        simState.unlockedTracks || 2,
      ),
    },
    announcement: null,
    sound: 'signal',
    accepted: true,
  };
}

export function toggleEmergencyStopTrain(
  simState: StationSimState,
  trainState: TrainSimulationState,
  trainId: string,
  nowMs: number,
): TrainActionOutcome {
  const target = trainState.trains.find((t) => t.id === trainId);
  if (!target || target.status === 'Scheduled' || target.status === 'Departed') {
    return { simState, trainState, announcement: null, sound: null, accepted: false };
  }

  const nextStopped = !target.emergencyStopped;
  const updatedTrains = trainState.trains.map((t) =>
    t.id === trainId
      ? {
          ...t,
          emergencyStopped: nextStopped,
          speed: nextStopped ? 0 : t.speed,
          holdingReason: nextStopped ? 'Emergency Stop engaged' : null,
        }
      : t,
  );

  const nextSim = applyXpAndRewards(
    simState,
    {
      xpDelta: nextStopped ? 15 : 5,
      repDelta: nextStopped ? 1 : 0,
      message: nextStopped
        ? `EMERGENCY STOP applied to ${target.name} (#${target.trainNumber})! Collision prevented.`
        : `Released Emergency Hold on ${target.name} (#${target.trainNumber}).`,
    },
    nowMs,
  );

  return {
    simState: nextSim,
    trainState: {
      ...trainState,
      trains: updatedTrains,
      alerts: buildSafetyAlerts(
        updatedTrains,
        trainState.trackOccupancies ?? {
          1: trainState.track1Occupancy,
          2: trainState.track2Occupancy,
          3: createEmptyOccupancy(),
          4: createEmptyOccupancy(),
          5: createEmptyOccupancy(),
          6: createEmptyOccupancy(),
        },
        trainState.switchPosition,
        signalsRecordFromSim(nextSim),
        simState.unlockedTracks || 2,
      ),
    },
    announcement: nextStopped ? BANGLA_SAFETY_ANNOUNCEMENTS[0] : null,
    sound: nextStopped ? 'horn' : 'signal',
    accepted: true,
  };
}

export function canPassengerBoardTrain(train: ManagedTrain): {
  allowed: boolean;
  reason?: string;
} {
  const spec = TRAIN_CATEGORY_SPECS[train.category];
  if (spec.isCargo || train.passengerCapacity <= 0) {
    return { allowed: false, reason: 'Cargo train does not carry passengers' };
  }
  if (train.status !== 'At Platform' && train.status !== 'Boarding') {
    return { allowed: false, reason: `Train is ${train.status}` };
  }
  if (train.speed > 0.05) {
    return { allowed: false, reason: 'Train is moving' };
  }
  if (train.doorState !== 'open' || train.doorOpenProgress < 0.7) {
    return { allowed: false, reason: 'Train doors are closed' };
  }
  if (train.currentPassengers >= train.passengerCapacity) {
    return { allowed: false, reason: 'Train at full capacity' };
  }
  return { allowed: true };
}

export function tryBoardPassengerOnTrain(
  train: ManagedTrain,
  preferredCoachIndex?: number | null,
  passengerCount = 1,
): { boarded: boolean; added: number; coachIndex: number; reason?: string } {
  const check = canPassengerBoardTrain(train);
  if (!check.allowed) {
    return { boarded: false, added: 0, coachIndex: 0, reason: check.reason };
  }

  if (train.coaches.length === 0) {
    return { boarded: false, added: 0, coachIndex: 0, reason: 'No passenger coaches' };
  }

  let targetCoach =
    preferredCoachIndex !== undefined &&
    preferredCoachIndex !== null &&
    train.coaches[preferredCoachIndex]
      ? train.coaches[preferredCoachIndex]
      : null;

  if (!targetCoach || targetCoach.passengers >= targetCoach.capacity || targetCoach.doorObstructed) {
    const candidates = train.coaches
      .filter((c) => c.passengers < c.capacity && !c.doorObstructed)
      .sort((a, b) => a.passengers / Math.max(1, a.capacity) - b.passengers / Math.max(1, b.capacity));
    targetCoach = candidates[0] ?? null;
  }

  if (!targetCoach) {
    return { boarded: false, added: 0, coachIndex: 0, reason: 'All coaches full or obstructed' };
  }

  const spaceInCoach = targetCoach.capacity - targetCoach.passengers;
  const spaceInTrain = train.passengerCapacity - train.currentPassengers;
  const added = Math.max(0, Math.min(passengerCount, spaceInCoach, spaceInTrain));
  if (added <= 0) {
    return { boarded: false, added: 0, coachIndex: targetCoach.coachIndex, reason: 'Train at full capacity' };
  }

  targetCoach.passengers += added;
  train.currentPassengers += added;
  train.boardingProgress = Math.min(
    1,
    Math.max(train.boardingProgress, train.currentPassengers / Math.max(1, train.passengerCapacity)),
  );
  return { boarded: true, added, coachIndex: targetCoach.coachIndex };
}

export function disembarkPassengerFromTrain(
  train: ManagedTrain,
  coachIndex?: number,
): boolean {
  if (train.currentPassengers <= 0 || train.coaches.length === 0) return false;
  if (train.doorState !== 'open' || train.doorOpenProgress < 0.7 || train.speed > 0.05) {
    return false;
  }
  const target =
    coachIndex !== undefined && train.coaches[coachIndex] && train.coaches[coachIndex].passengers > 0
      ? train.coaches[coachIndex]
      : train.coaches.find((c) => c.passengers > 0);
  if (!target) return false;
  target.passengers = Math.max(0, target.passengers - 1);
  train.currentPassengers = Math.max(0, train.currentPassengers - 1);
  return true;
}

export function spawnTrainOperationalEvent(
  trainState: TrainSimulationState,
  trainId?: string,
  requestedKind?: TrainOperationalEventKind,
): { trainState: TrainSimulationState; event: TrainOperationalEvent | null } {
  const trainIdx = trainId
    ? trainState.trains.findIndex((t) => t.id === trainId)
    : trainState.trains.findIndex(
        (t) =>
          (t.status === 'At Platform' || t.status === 'Boarding') &&
          !TRAIN_CATEGORY_SPECS[t.category].isCargo &&
          !t.operationalEvent,
      );
  if (trainIdx === -1) return { trainState, event: null };
  const target = trainState.trains[trainIdx];
  if (TRAIN_CATEGORY_SPECS[target.category].isCargo || target.operationalEvent) {
    return { trainState, event: null };
  }

  const seq = (trainState.nextOperationalEventIndex ?? 1) + 1;
  const kind =
    requestedKind ??
    OPERATIONAL_EVENT_ROTATION[seq % OPERATIONAL_EVENT_ROTATION.length];
  const event = createOperationalEventForTrain(target, kind, seq);

  const trains = trainState.trains.map((t, idx) => {
    if (idx !== trainIdx) return t;
    const coaches = t.coaches.map((c, cIdx) => ({
      ...c,
      doorObstructed:
        cIdx === event.coachIndex &&
        (kind === 'luggage_blocking_door' || kind === 'door_obstruction' || kind === 'platform_congestion')
          ? true
          : c.doorObstructed,
    }));
    const doorsObstructed = coaches.some((c) => c.doorObstructed);
    return {
      ...t,
      coaches,
      doorsObstructed,
      platformClear: kind === 'platform_congestion' ? false : t.platformClear,
      operationalEvent: event,
    };
  });

  return {
    trainState: {
      ...trainState,
      trains,
      nextOperationalEventIndex: seq,
    },
    event,
  };
}

export function resolveTrainOperationalEvent(
  simState: StationSimState,
  trainState: TrainSimulationState,
  trainId: string,
  choice: 'primary' | 'secondary' = 'primary',
  nowMs = Date.now(),
): TrainActionOutcome {
  const train = trainState.trains.find((t) => t.id === trainId);
  if (!train || !train.operationalEvent || train.operationalEvent.resolved) {
    return { simState, trainState, announcement: null, sound: null, accepted: false };
  }

  const ev = train.operationalEvent;
  let extraPassengers = 0;
  let announcement: string | null = null;
  let message = `Resolved ${ev.title} (${ev.coachNumber}) on ${train.name}.`;

  if (ev.kind === 'last_minute_boarding' && choice === 'primary') {
    extraPassengers = 1;
    message = `Safely assisted last-minute passenger aboard ${train.name} (${ev.coachNumber}).`;
  } else if (ev.kind === 'overcrowded_coach') {
    message = `Redistributed standing passengers from ${ev.coachNumber} into rear coaches on ${train.name}.`;
    announcement = buildTrainBanglaAnnouncement(train, 'safety');
  } else if (ev.kind === 'delayed_departure') {
    announcement = buildTrainBanglaAnnouncement(train, 'delay');
    message = `Broadcast Bengali departure schedule update for ${train.name}.`;
  } else if (ev.kind === 'luggage_blocking_door' || ev.kind === 'door_obstruction') {
    message = `Cleared obstruction at ${ev.coachNumber} door on ${train.name} — door sensors nominal!`;
  } else if (ev.kind === 'platform_congestion') {
    announcement = BANGLA_SAFETY_ANNOUNCEMENTS[0];
    message = `Cleared yellow-line congestion in front of ${ev.coachNumber} on Platform ${train.assignedPlatform ?? 1}.`;
  }

  const updatedTrains = trainState.trains.map((t) => {
    if (t.id !== trainId) return t;
    const coaches = t.coaches.map((c, idx) => {
      let pax = c.passengers;
      if (ev.kind === 'overcrowded_coach' && t.coaches.length > 1) {
        if (idx === ev.coachIndex) pax = Math.max(0, pax - 18);
        else if (idx === t.coaches.length - 1) pax = Math.min(c.capacity, pax + 18);
      } else if (idx === ev.coachIndex && extraPassengers > 0) {
        pax = Math.min(c.capacity, pax + extraPassengers);
      }
      return {
        ...c,
        passengers: pax,
        doorObstructed: false,
      };
    });
    const totalPax = coaches.reduce((sum, c) => sum + c.passengers, 0);
    return {
      ...t,
      coaches,
      currentPassengers: totalPax,
      doorsObstructed: false,
      platformClear: true,
      operationalEvent: null,
    };
  });

  const updatedSim: StationSimState = {
    ...simState,
    satisfaction: Math.min(100, simState.satisfaction + 4),
    successfulInteractions: simState.successfulInteractions + 1,
  };

  const rewardedSim = applyXpAndRewards(
    updatedSim,
    {
      moneyDelta: 55,
      xpDelta: 35,
      repDelta: 2,
      message: `${message} (+55 coins, +35 XP)`,
    },
    nowMs,
  );

  const occ = computeTrackOccupancy(updatedTrains);
  return {
    simState: rewardedSim,
    trainState: {
      ...trainState,
      trains: updatedTrains,
      track1Occupancy: occ.track1,
      track2Occupancy: occ.track2,
      trackOccupancies: occ.byTrack,
      alerts: buildSafetyAlerts(
        updatedTrains,
        occ.byTrack,
        trainState.switchPosition,
        signalsRecordFromSim(rewardedSim),
        rewardedSim.unlockedTracks || 2,
      ),
      lastAnnouncementText: announcement ?? trainState.lastAnnouncementText,
    },
    announcement,
    sound: ev.kind === 'door_obstruction' || ev.kind === 'luggage_blocking_door' ? 'bell' : 'coin',
    accepted: true,
  };
}

export function advanceTrainDepartureSequence(
  simState: StationSimState,
  trainState: TrainSimulationState,
  trainId: string,
  step: 'announce_boarding' | 'safety_checks' | 'close_doors',
  nowMs = Date.now(),
): TrainActionOutcome {
  const train = trainState.trains.find((t) => t.id === trainId);
  if (!train || (train.status !== 'At Platform' && train.status !== 'Boarding')) {
    return { simState, trainState, announcement: null, sound: null, accepted: false };
  }

  if (step === 'announce_boarding') {
    const pa = buildTrainBanglaAnnouncement(train, 'boarding');
    const trains = trainState.trains.map((t) =>
      t.id === trainId ? { ...t, departureStage: 'boarding_announcement' as const } : t,
    );
    const nextSim = applyXpAndRewards(
      simState,
      { xpDelta: 10, message: `Issued boarding announcement for ${train.name} (#${train.trainNumber}).` },
      nowMs,
    );
    return {
      simState: nextSim,
      trainState: { ...trainState, trains, lastAnnouncementText: pa },
      announcement: pa,
      sound: 'bell',
      accepted: true,
    };
  }

  if (step === 'safety_checks') {
    if (
      train.doorsObstructed ||
      (train.operationalEvent && !train.operationalEvent.resolved && train.operationalEvent.blocksDeparture)
    ) {
      const blockedSim = applyXpAndRewards(
        simState,
        {
          repDelta: -1,
          message: `Safety Check Failed (${train.name}): Resolve ${train.operationalEvent?.title ?? 'Door Obstruction'} first!`,
        },
        nowMs,
      );
      return { simState: blockedSim, trainState, announcement: null, sound: 'signal', accepted: false };
    }
    const trains = trainState.trains.map((t) =>
      t.id === trainId
        ? {
            ...t,
            safetyChecksPassed: true,
            platformClear: true,
            departureStage: 'platform_clearance' as const,
          }
        : t,
    );
    const nextSim = applyXpAndRewards(
      simState,
      {
        xpDelta: 15,
        repDelta: 1,
        message: `Platform clearance & final safety checks PASSED for ${train.name} (#${train.trainNumber}).`,
      },
      nowMs,
    );
    return {
      simState: nextSim,
      trainState: { ...trainState, trains },
      announcement: null,
      sound: 'bell',
      accepted: true,
    };
  }

  // step === 'close_doors'
  if (
    train.doorsObstructed ||
    (train.operationalEvent && !train.operationalEvent.resolved && train.operationalEvent.blocksDeparture)
  ) {
    const blockedSim = applyXpAndRewards(
      simState,
      {
        message: `DOOR JAMMED on ${train.name}: Clear doorway obstruction before closing doors!`,
      },
      nowMs,
    );
    return { simState: blockedSim, trainState, announcement: null, sound: 'signal', accepted: false };
  }

  const pa = buildTrainBanglaAnnouncement(train, 'doors_closing');
  const trains = trainState.trains.map((t) =>
    t.id === trainId
      ? {
          ...t,
          doorState: t.doorOpenProgress > 0 ? ('closing' as const) : ('closed' as const),
          departureStage: 'closing_doors' as const,
          platformClear: true,
          safetyChecksPassed: true,
        }
      : t,
  );
  const nextSim = applyXpAndRewards(
    simState,
    {
      xpDelta: 15,
      message: `Closing passenger doors on ${train.name} (#${train.trainNumber}). Clear the yellow line!`,
    },
    nowMs,
  );
  return {
    simState: nextSim,
    trainState: { ...trainState, trains, lastAnnouncementText: pa },
    announcement: pa,
    sound: 'bell',
    accepted: true,
  };
}

export function authorizeTrainDeparture(
  simState: StationSimState,
  trainState: TrainSimulationState,
  trainId: string,
  nowMs: number,
): TrainActionOutcome {
  const train = trainState.trains.find((t) => t.id === trainId);
  if (!train || !train.assignedPlatform) {
    return { simState, trainState, announcement: null, sound: null, accepted: false };
  }

  if (train.status !== 'At Platform' && train.status !== 'Boarding') {
    return { simState, trainState, announcement: null, sound: null, accepted: false };
  }

  // Safety Gate 1: Blocked by door obstruction or unresolved blocking operational event
  if (
    train.doorsObstructed ||
    (train.operationalEvent && !train.operationalEvent.resolved && train.operationalEvent.blocksDeparture)
  ) {
    const blockedSim = applyXpAndRewards(
      simState,
      {
        repDelta: -1,
        message: `DEPARTURE BLOCKED (${train.name}): Resolve ${train.operationalEvent?.title ?? 'Door Obstruction'} before dispatching!`,
      },
      nowMs,
    );
    return { simState: blockedSim, trainState, announcement: null, sound: 'signal', accepted: false };
  }

  // Safety Gate 2: Signal Verification (cannot depart on RED)
  const trackSignal = getTrackSignal(simState, train.assignedPlatform);
  if (trackSignal === 'red') {
    const blockedSim = applyXpAndRewards(
      simState,
      {
        repDelta: -1,
        message: `Cannot depart ${train.name}: Track ${train.assignedPlatform} signal is RED! Switch to YELLOW or GREEN first.`,
      },
      nowMs,
    );
    return { simState: blockedSim, trainState, announcement: null, sound: 'signal', accepted: false };
  }

  // Safety Gate 3: Exit track block occupancy check
  const exitConflict = trainState.trains.find(
    (other) =>
      other.id !== train.id &&
      other.assignedPlatform === train.assignedPlatform &&
      other.status !== 'Scheduled' &&
      other.status !== 'Departed' &&
      (train.direction === 1 ? other.x > train.x && other.x < 95 : other.x < train.x && other.x > -95),
  );

  if (exitConflict) {
    const blockedSim = applyXpAndRewards(
      simState,
      {
        repDelta: -2,
        message: `COLLISION RISK: Track ${train.assignedPlatform} exit block occupied by ${exitConflict.name}!`,
      },
      nowMs,
    );
    return { simState: blockedSim, trainState, announcement: null, sound: 'horn', accepted: false };
  }

  const gateSafe = train.direction === -1 || simState.crossingGateClosed;
  const spec = TRAIN_CATEGORY_SPECS[train.category];
  const revMult = getRevenueMultiplierForLevel(simState.stationLevel || 1);
  const baseCoins = Math.round((spec.isCargo ? 180 : train.category === 'international' ? 220 : 140) * revMult);
  const onTimeBonus = train.delayMinutes === 0 ? 35 : 0;
  const safetyPenaltyRep = gateSafe ? 4 : -4;
  const moneyGain = gateSafe ? baseCoins + onTimeBonus : Math.max(40, baseCoins - 60);

  const needsDoorClose = !spec.isCargo && train.doorOpenProgress > 0.01;
  const updatedTrains = trainState.trains.map((t) =>
    t.id === trainId
      ? {
          ...t,
          status: 'Departing' as const,
          departureAuthorized: true,
          safetyChecksPassed: true,
          platformClear: true,
          doorState: needsDoorClose ? ('closing' as const) : ('closed' as const),
          departureStage: needsDoorClose ? ('closing_doors' as const) : ('departing' as const),
          emergencyStopped: false,
          holdingReason: null,
        }
      : t,
  );

  const updatedSim: StationSimState = {
    ...simState,
    dispatchesCompleted: simState.dispatchesCompleted + 1,
  };

  const rewardedSim = applyXpAndRewards(
    updatedSim,
    {
      moneyDelta: moneyGain,
      xpDelta: gateSafe ? 65 : 25,
      repDelta: safetyPenaltyRep,
      message: gateSafe
        ? `Dispatched ${train.name} (#${train.trainNumber}) from Platform ${train.assignedPlatform}! +${moneyGain} coins & +4% Rep.`
        : `Dispatched ${train.name} with East Crossing Gate OPEN! Warning: -4% Rep safety penalty.`,
    },
    nowMs,
  );

  const occ = computeTrackOccupancy(updatedTrains);
  const announcement = buildTrainBanglaAnnouncement(train, 'departure');

  return {
    simState: rewardedSim,
    trainState: {
      ...trainState,
      trains: updatedTrains,
      track1Occupancy: occ.track1,
      track2Occupancy: occ.track2,
      trackOccupancies: occ.byTrack,
      alerts: buildSafetyAlerts(
        updatedTrains,
        occ.byTrack,
        trainState.switchPosition,
        signalsRecordFromSim(rewardedSim),
        rewardedSim.unlockedTracks || 2,
      ),
      lastAnnouncementText: announcement,
    },
    announcement,
    sound: 'horn',
    accepted: true,
  };
}

export interface SimulationTickEvents {
  newAnnouncements: string[];
  playHorn: boolean;
  playDoorChime: boolean;
  dayAdvancedTo: number | null;
}

export function stepTrainSimulation(
  simState: StationSimState,
  trainState: TrainSimulationState,
  dt: number,
  nowMs: number,
): {
  simState: StationSimState;
  trainState: TrainSimulationState;
  events: SimulationTickEvents;
} {
  const newAnnouncements: string[] = [];
  let playHorn = false;
  let playDoorChime = false;
  let nextSimState = simState;
  let nextOpSeq = trainState.nextOperationalEventIndex ?? 1;

  const gameMinutes = simState.gameMinutes;
  const trains = trainState.trains.map((t) => ({
    ...t,
    coaches: t.coaches.map((c) => ({ ...c })),
    operationalEvent: t.operationalEvent ? { ...t.operationalEvent } : null,
  }));

  // 1. Activate scheduled/delayed trains as their arrival window nears (midnight-safe circular clock check)
  const isCircularTimeReached = (nowMin: number, targetMin: number): boolean => {
    const diff = (((nowMin - targetMin) % 1440) + 1440) % 1440;
    return diff < 720;
  };
  for (const t of trains) {
    const effectiveArrival = (t.scheduledArrivalMin + t.delayMinutes) % 1440;

    if (t.status === 'Scheduled' || t.status === 'Delayed') {
      if (t.delayMinutes > 0 && !t.delayAnnounced && isCircularTimeReached(gameMinutes, t.scheduledArrivalMin - 6)) {
        t.delayAnnounced = true;
        newAnnouncements.push(buildTrainBanglaAnnouncement(t, 'delay'));
      }

      if (isCircularTimeReached(gameMinutes, effectiveArrival - 4)) {
        t.status = 'Approaching';
        t.x = t.direction === 1 ? -APPROACH_SPAWN_DIST : APPROACH_SPAWN_DIST;
        t.speed = t.maxSpeed * 0.65;
        t.doorState = 'closed';
        t.doorOpenProgress = 0;
      }
    }
  }

  // 2. Move active trains with signal interlocks, zero-overshoot braking, door animation & collision prevention
  for (const t of trains) {
    const isCargo = TRAIN_CATEGORY_SPECS[t.category].isCargo;

    if (t.status === 'Scheduled' || t.status === 'Delayed' || t.status === 'Departed') {
      t.speed = 0;
      continue;
    }

    if (t.emergencyStopped) {
      t.speed = Math.max(0, t.speed - 14 * dt);
      t.holdingReason = 'Emergency Stop engaged';
      continue;
    }

    if (t.status === 'At Platform' || t.status === 'Boarding') {
      t.speed = 0;
      t.x = PLATFORM_STOP_X;

      if (!isCargo) {
        if (t.doorState === 'opening') {
          t.doorOpenProgress = Math.min(1, t.doorOpenProgress + dt * 0.85);
          if (t.doorOpenProgress >= 1) {
            t.doorState = 'open';
            playDoorChime = true;
            newAnnouncements.push(buildTrainBanglaAnnouncement(t, 'doors_opening'));
          }
        } else if (t.doorState === 'closing') {
          const floorProgress = t.doorsObstructed ? 0.25 : 0;
          t.doorOpenProgress = Math.max(floorProgress, t.doorOpenProgress - dt * 0.9);
          if (t.doorOpenProgress <= 0 && !t.doorsObstructed) {
            t.doorState = 'closed';
            t.departureStage = 'signal_verification';
            playDoorChime = true;
          }
        }
      }

      t.boardingProgress = Math.min(1, t.boardingProgress + dt * 0.032);
      if (t.boardingProgress > 0.14 && t.status === 'At Platform' && (isCargo || t.doorState === 'open')) {
        t.status = 'Boarding';
      }
      continue;
    }

    const trackId: TrackId = t.assignedPlatform ?? inferTrackFromZ(t.z);
    const signalAspect: SignalAspect = getTrackSignal(nextSimState, trackId);

    // Collision prevention: check if any other active train on the same track is ahead within SAFETY_MIN_GAP_M
    let blockedByTrainAhead = false;
    for (const other of trains) {
      if (other.id === t.id || other.status === 'Scheduled' || other.status === 'Departed') continue;
      const otherTrack: TrackId = other.assignedPlatform ?? inferTrackFromZ(other.z);
      if (otherTrack !== trackId) continue;

      const deltaForward = (other.x - t.x) * t.direction;
      if (deltaForward > 0 && deltaForward < SAFETY_MIN_GAP_M) {
        blockedByTrainAhead = true;
        break;
      }
    }

    if (t.status === 'Approaching' || t.status === 'Arriving') {
      // Doors remain strictly locked shut while train is approaching / moving
      t.doorState = 'closed';
      t.doorOpenProgress = 0;

      const distToStop = (PLATFORM_STOP_X - t.x) * t.direction;

      // Check platform/signal clearance before crossing outer home signal at |x| = OUTER_HOLD_X
      const hasPlatform = t.assignedPlatform !== null;
      const platformOccupiedByOther =
        hasPlatform &&
        trains.some(
          (other) =>
            other.id !== t.id &&
            other.assignedPlatform === t.assignedPlatform &&
            other.status !== 'Scheduled' &&
            other.status !== 'Departed' &&
            Math.abs(other.x) <= 34,
        );

      const signalRedOutsideThroat =
        distToStop > 34 && (signalAspect === 'red' || !hasPlatform || platformOccupiedByOther);

      if (blockedByTrainAhead) {
        t.speed = Math.max(0, t.speed - 16 * dt);
        t.holdingReason = 'ATP Hold: Train ahead on track';
      } else if (signalRedOutsideThroat && distToStop <= OUTER_HOLD_X + 10) {
        const distToOuter = Math.max(0, distToStop - OUTER_HOLD_X);
        if (distToOuter < 0.6) {
          t.speed = 0;
        } else {
          const holdSpeed = Math.min(t.maxSpeed * 0.5, Math.max(1.2, distToOuter * 0.8));
          t.speed = holdSpeed;
          const step = Math.min(distToOuter, t.speed * dt);
          t.x += t.direction * step;
          if (distToOuter - step < 0.6) {
            t.speed = 0;
          }
        }
        t.holdingReason = !hasPlatform
          ? 'Awaiting Platform Assignment'
          : platformOccupiedByOther
            ? `Holding: Platform ${t.assignedPlatform} occupied`
            : `Holding at Track ${trackId} RED Signal`;
      } else {
        t.holdingReason = null;
        if (distToStop <= 36) {
          t.status = 'Arriving';
          if (!t.hornTriggeredArrival) {
            t.hornTriggeredArrival = true;
            playHorn = true;
          }
          if (!t.arrivalAnnounced && t.assignedPlatform) {
            t.arrivalAnnounced = true;
            newAnnouncements.push(buildTrainBanglaAnnouncement(t, 'arrival'));
          }
        }

        const signalFactor = signalAspect === 'yellow' ? 0.58 : 1.0;
        const brakingCap =
          distToStop > 18
            ? Math.max(2.2, distToStop * 0.48)
            : Math.max(0.85, Math.sqrt(Math.max(0, distToStop) * 2.15));
        const targetSpeed = Math.min(t.maxSpeed * signalFactor, brakingCap);
        if (t.speed < targetSpeed) {
          t.speed = Math.min(targetSpeed, t.speed + 6.5 * dt);
        } else {
          t.speed = Math.max(targetSpeed, t.speed - 9.5 * dt);
        }

        const projectedX = t.x + t.direction * t.speed * dt;
        const projectedDist = (PLATFORM_STOP_X - projectedX) * t.direction;

        // Zero-overshoot clamping: always stop accurately at PLATFORM_STOP_X
        if (distToStop <= 0.45 || projectedDist <= 0) {
          t.x = PLATFORM_STOP_X;
          t.speed = 0;
          t.status = 'At Platform';
          t.holdingReason = null;
          t.doorState = isCargo ? 'closed' : 'opening';
          t.disembarkRemaining = isCargo
            ? 0
            : Math.min(7, Math.max(3, Math.floor(t.currentPassengers / 95)));
          playDoorChime = !isCargo;

          if (!isCargo && !t.operationalEvent) {
            nextOpSeq++;
            const opKind =
              OPERATIONAL_EVENT_ROTATION[nextOpSeq % OPERATIONAL_EVENT_ROTATION.length];
            const opEvent = createOperationalEventForTrain(t, opKind, nextOpSeq);
            t.operationalEvent = opEvent;
            if (
              (opKind === 'luggage_blocking_door' ||
                opKind === 'door_obstruction' ||
                opKind === 'platform_congestion') &&
              t.coaches[opEvent.coachIndex]
            ) {
              t.coaches[opEvent.coachIndex].doorObstructed = true;
              t.doorsObstructed = true;
            }
          }
        } else {
          t.x = projectedX;
        }
      }
      t.z = TRACK_Z[trackId];
    } else if (t.status === 'Departing') {
      // Hold train stationary until sliding doors completely lock shut
      if (!isCargo && t.doorOpenProgress > 0) {
        t.speed = 0;
        t.doorState = 'closing';
        t.departureStage = 'closing_doors';
        t.doorOpenProgress = Math.max(0, t.doorOpenProgress - dt * 1.1);
        if (t.doorOpenProgress <= 0) {
          t.doorState = 'closed';
          t.departureStage = 'departing';
          playDoorChime = true;
          playHorn = true;
        }
        continue;
      }

      t.doorState = 'closed';
      t.departureStage = 'departing';

      if (blockedByTrainAhead) {
        t.speed = Math.max(0, t.speed - 16 * dt);
        t.holdingReason = 'ATP Hold: Exit block occupied ahead';
      } else {
        t.holdingReason = null;
        const signalFactor = signalAspect === 'yellow' ? 0.65 : 1.0;
        const targetSpeed = t.maxSpeed * signalFactor;
        t.speed = Math.min(targetSpeed, t.speed + 4.8 * dt);
        t.x += t.direction * t.speed * dt;
        if (Math.abs(t.x) >= EXIT_DESPAWN_DIST) {
          t.status = 'Departed';
          t.speed = 0;
        }
      }
    }
  }

  // 3. Roll over to next day seamlessly once all trains have departed without resetting continuous day/night clock
  let dayAdvancedTo: number | null = null;
  const allFinished = trains.every((t) => t.status === 'Departed');
  const unlockedTracks = Math.max(2, Math.min(6, nextSimState.unlockedTracks || trainState.unlockedTracks || 2));
  if (allFinished) {
    const nextDay = trainState.dayNumber + 1;
    dayAdvancedTo = nextDay;
    const nextDayTrains = generateDailySchedule(nextDay, unlockedTracks, nextSimState.gameMinutes);
    const occ = computeTrackOccupancy(nextDayTrains);
    const resetSignals: Record<TrackId, SignalAspect> = {
      1: 'red',
      2: 'red',
      3: 'red',
      4: 'red',
      5: 'red',
      6: 'red',
    };
    nextSimState = {
      ...nextSimState,
      dayNumber: nextDay,
      track1Signal: 'red',
      track2Signal: 'red',
      trackSignals: resetSignals,
      lastEventMessage: `Day ${nextDay} schedule active (${formatGameTime(nextSimState.gameMinutes)}). Welcome to a new shift!`,
      lastEventTimestamp: nowMs,
    };
    return {
      simState: nextSimState,
      trainState: {
        dayNumber: nextDay,
        unlockedTracks,
        switchPosition: 'straight',
        trains: nextDayTrains,
        track1Occupancy: occ.track1,
        track2Occupancy: occ.track2,
        trackOccupancies: occ.byTrack,
        alerts: buildSafetyAlerts(nextDayTrains, occ.byTrack, 'straight', resetSignals, unlockedTracks),
        lastAnnouncementText: null,
        nextOperationalEventIndex: nextOpSeq,
      },
      events: {
        newAnnouncements,
        playHorn,
        playDoorChime,
        dayAdvancedTo,
      },
    };
  }

  const occ = computeTrackOccupancy(trains);
  const alerts = buildSafetyAlerts(
    trains,
    occ.byTrack,
    trainState.switchPosition,
    signalsRecordFromSim(nextSimState),
    unlockedTracks,
  );

  return {
    simState: nextSimState,
    trainState: {
      ...trainState,
      unlockedTracks,
      trains,
      track1Occupancy: occ.track1,
      track2Occupancy: occ.track2,
      trackOccupancies: occ.byTrack,
      alerts,
      nextOperationalEventIndex: nextOpSeq,
      lastAnnouncementText:
        newAnnouncements.length > 0
          ? newAnnouncements[newAnnouncements.length - 1]
          : trainState.lastAnnouncementText,
    },
    events: {
      newAnnouncements,
      playHorn,
      playDoorChime,
      dayAdvancedTo,
    },
  };
}
