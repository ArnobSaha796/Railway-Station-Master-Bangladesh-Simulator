import { applyXpAndRewards } from './rules';
import { TRACK_Z } from './trainManager';
import type {
  ChapterId,
  FacilityId,
  OpsEmergencyEvent,
  OpsEmergencyKind,
  StaffDuty,
  StaffRole,
  StaffShift,
  StationFacility,
  StationFinanceLedger,
  StationOperationsState,
  StationSimState,
  StationStaffMember,
  StationTask,
  StationTaskMetric,
  TrackId,
  VipCredentialRecord,
  VipFlowPattern,
  VipSecurityProtocol,
} from './types';

export interface OpsEmergencyTemplate {
  kind: OpsEmergencyKind;
  title: string;
  titleBn: string;
  objective: string;
  actionLabel: string;
  locationLabel: string;
  x: number;
  z: number;
  trackId?: TrackId;
  facilityId?: FacilityId;
  severity: 'low' | 'medium' | 'high' | 'critical';
  maxTimeSec: number;
  requiredRole: StaffRole;
  repairCostCoins: number;
  rewardMoney: number;
  rewardXp: number;
  rewardRep: number;
  penaltySat: number;
  penaltyRep: number;
  chapterExclusive?: ChapterId;
}

export const OPS_EMERGENCY_TEMPLATES: Record<OpsEmergencyKind, OpsEmergencyTemplate> = {
  track_obstruction: {
    kind: 'track_obstruction',
    title: 'Track Obstruction Detected',
    titleBn: 'রেললাইনে প্রতিবন্ধকতা',
    objective: 'Remove fallen construction cargo blocking Track 2 approach corridor.',
    actionLabel: 'Clear Track Obstruction',
    locationLabel: 'Track 2 West Throat',
    trackId: 2,
    x: -14.0,
    z: 3.0,
    severity: 'critical',
    maxTimeSec: 70,
    requiredRole: 'maintenance_crew',
    repairCostCoins: 30,
    rewardMoney: 110,
    rewardXp: 45,
    rewardRep: 4,
    penaltySat: 6,
    penaltyRep: 5,
  },
  track_maintenance: {
    kind: 'track_maintenance',
    title: 'Railway Track Inspection & Sleeper Repair',
    titleBn: 'রেললাইন পরিদর্শন ও মেরামত',
    objective: 'Inspect rail joints & tighten fishplates on Track 1 without halting parallel traffic.',
    actionLabel: 'Complete Track Inspection',
    locationLabel: 'Track 1 East Section',
    trackId: 1,
    x: 10.5,
    z: -3.0,
    severity: 'medium',
    maxTimeSec: 80,
    requiredRole: 'signal_engineer',
    repairCostCoins: 35,
    rewardMoney: 100,
    rewardXp: 40,
    rewardRep: 3,
    penaltySat: 4,
    penaltyRep: 3,
  },
  train_breakdown: {
    kind: 'train_breakdown',
    title: 'Locomotive Traction Fault',
    titleBn: 'ইঞ্জিন বিকল — জরুরি সহায়তা',
    objective: 'Dispatch engineer or repair traction inverter before platform blocklocks build up.',
    actionLabel: 'Repair Locomotive Fault',
    locationLabel: 'Platform 1 Approach',
    trackId: 1,
    x: -10.5,
    z: -4.9,
    severity: 'high',
    maxTimeSec: 75,
    requiredRole: 'signal_engineer',
    repairCostCoins: 55,
    rewardMoney: 145,
    rewardXp: 55,
    rewardRep: 4,
    penaltySat: 6,
    penaltyRep: 4,
  },
  signal_fault: {
    kind: 'signal_fault',
    title: 'Semaphore Signal Malfunction',
    titleBn: 'সিগন্যাল ত্রুটি মেরামত',
    objective: 'Reset interlocking relay on faulty track signal cabin to restore safe aspects.',
    actionLabel: 'Repair Signal Relay',
    locationLabel: 'East Signal Cabin',
    trackId: 2,
    x: 24.0,
    z: 4.9,
    severity: 'critical',
    maxTimeSec: 65,
    requiredRole: 'signal_engineer',
    repairCostCoins: 40,
    rewardMoney: 130,
    rewardXp: 55,
    rewardRep: 4,
    penaltySat: 7,
    penaltyRep: 5,
  },
  power_failure: {
    kind: 'power_failure',
    title: 'Station Power Grid Failure',
    titleBn: 'স্টেশন বিদ্যুৎ বিভ্রাট',
    objective: 'Switch to backup diesel generator & restore platform lighting and digital boards.',
    actionLabel: 'Restore Backup Power',
    locationLabel: 'Main Power Sub-Station',
    facilityId: 'platform_lighting',
    x: -20.0,
    z: -11.0,
    severity: 'critical',
    maxTimeSec: 60,
    requiredRole: 'maintenance_crew',
    repairCostCoins: 60,
    rewardMoney: 150,
    rewardXp: 60,
    rewardRep: 5,
    penaltySat: 8,
    penaltyRep: 5,
  },
  broken_escalator: {
    kind: 'broken_escalator',
    title: 'Broken Footbridge Escalator / Lift',
    titleBn: 'এস্কেলেটর ও লিফট বিকল',
    objective: 'Service drive belt at the West Footbridge & Guide elderly commuters safely.',
    actionLabel: 'Repair Escalator Drive',
    locationLabel: 'West Footbridge Concourse',
    facilityId: 'elevators_escalators',
    x: -24.5,
    z: -9.5,
    severity: 'medium',
    maxTimeSec: 85,
    requiredRole: 'maintenance_crew',
    repairCostCoins: 45,
    rewardMoney: 115,
    rewardXp: 42,
    rewardRep: 3,
    penaltySat: 5,
    penaltyRep: 2,
  },
  water_leakage: {
    kind: 'water_leakage',
    title: 'Water Pipeline Leakage on Platform',
    titleBn: 'প্ল্যাটফর্মে পানির পাইপ লিকেজ',
    objective: 'Shut isolation valve & clear slippery platform tiles near waiting bench.',
    actionLabel: 'Seal Pipe & Dry Platform',
    locationLabel: 'Platform 2 Drinking Zone',
    facilityId: 'restrooms',
    x: 2.5,
    z: 8.2,
    severity: 'medium',
    maxTimeSec: 75,
    requiredRole: 'maintenance_crew',
    repairCostCoins: 30,
    rewardMoney: 95,
    rewardXp: 35,
    rewardRep: 3,
    penaltySat: 5,
    penaltyRep: 2,
  },
  missing_staff: {
    kind: 'missing_staff',
    title: 'Absent Duty Clerk Shortage',
    titleBn: 'কর্মী অনুপস্থিতি — জরুরি দায়িত্ব বণ্টন',
    objective: 'Reassign standby employee or call replacement relief clerk at Ticket Desk.',
    actionLabel: 'Deploy Relief Staff',
    locationLabel: 'Ticket Counter Plaza',
    facilityId: 'ticket_counters',
    x: -15.5,
    z: -11.5,
    severity: 'medium',
    maxTimeSec: 80,
    requiredRole: 'platform_supervisor',
    repairCostCoins: 35,
    rewardMoney: 90,
    rewardXp: 40,
    rewardRep: 3,
    penaltySat: 5,
    penaltyRep: 3,
  },
  vip_security: {
    kind: 'vip_security',
    title: 'VIP Rail Delegation Security Escort',
    titleBn: 'ভিআইপি যাত্রীর নিরাপত্তা ব্যবস্থা',
    objective: 'Clear Platform 1 corridor and coordinate Railway Police VIP escort before arrival.',
    actionLabel: 'Authorize VIP Escort Corridor',
    locationLabel: 'Station Master Concourse',
    facilityId: 'security_control_room',
    x: 0.5,
    z: -9.5,
    severity: 'high',
    maxTimeSec: 70,
    requiredRole: 'security_coordinator',
    repairCostCoins: 25,
    rewardMoney: 165,
    rewardXp: 65,
    rewardRep: 5,
    penaltySat: 4,
    penaltyRep: 5,
  },
  emergency_evacuation: {
    kind: 'emergency_evacuation',
    title: 'Platform Smoke Alarm & Evacuation Drill',
    titleBn: 'জরুরি যাত্রী সরিয়ে নেওয়ার অভিযান',
    objective: 'Open emergency exit barriers & guide passengers toward North Forecourt safe assembly.',
    actionLabel: 'Execute Safe Evacuation',
    locationLabel: 'Platform 1 Waiting Hall',
    facilityId: 'footbridges',
    x: -21.0,
    z: -10.5,
    severity: 'critical',
    maxTimeSec: 60,
    requiredRole: 'security_coordinator',
    repairCostCoins: 20,
    rewardMoney: 150,
    rewardXp: 65,
    rewardRep: 6,
    penaltySat: 8,
    penaltyRep: 6,
  },
  delayed_train: {
    kind: 'delayed_train',
    title: 'Cascading Train Delay Coordination',
    titleBn: 'বিলম্বিত ট্রেন সময়সূচী সমন্বয়',
    objective: 'Update passenger info boards & reorganize platform berth sequence for delayed train.',
    actionLabel: 'Re-Sequence Delayed Slot',
    locationLabel: 'Digital Info Board',
    facilityId: 'digital_info_boards',
    x: -6.8,
    z: -9.0,
    severity: 'medium',
    maxTimeSec: 85,
    requiredRole: 'platform_supervisor',
    repairCostCoins: 0,
    rewardMoney: 95,
    rewardXp: 38,
    rewardRep: 3,
    penaltySat: 5,
    penaltyRep: 3,
  },
  unexpected_arrival: {
    kind: 'unexpected_arrival',
    title: 'Unscheduled Relief Express Approaching',
    titleBn: 'অনির্ধারিত বিশেষ ট্রেন আগমন',
    objective: 'Assign a clear platform & broadcast immediate arrival notice for unscheduled train.',
    actionLabel: 'Confirm Unscheduled Berth',
    locationLabel: 'Train Dispatch Office',
    x: 1.5,
    z: -9.5,
    severity: 'high',
    maxTimeSec: 75,
    requiredRole: 'platform_supervisor',
    repairCostCoins: 0,
    rewardMoney: 140,
    rewardXp: 55,
    rewardRep: 4,
    penaltySat: 6,
    penaltyRep: 4,
  },
  platform_reassignment: {
    kind: 'platform_reassignment',
    title: 'Emergency Platform Reassignment',
    titleBn: 'জরুরি প্ল্যাটফর্ম পরিবর্তন সমন্বয়',
    objective: 'Divert incoming express to alternate track & update signage on all platforms.',
    actionLabel: 'Apply Platform Diversion',
    locationLabel: 'Platform 2 Center Desk',
    facilityId: 'information_desks',
    x: 0.0,
    z: 7.5,
    severity: 'high',
    maxTimeSec: 75,
    requiredRole: 'platform_supervisor',
    repairCostCoins: 0,
    rewardMoney: 125,
    rewardXp: 50,
    rewardRep: 4,
    penaltySat: 6,
    penaltyRep: 4,
  },
  passenger_rush: {
    kind: 'passenger_rush',
    title: 'Commuter Rush Queue Surge',
    titleBn: 'পিক আওয়ার যাত্রী চাপ সামাল দেওয়া',
    objective: 'Open overflow ticket windows & deploy supervisors to keep yellow lines clear.',
    actionLabel: 'Activate Overflow Counters',
    locationLabel: 'North Ticket Counters',
    facilityId: 'ticket_counters',
    x: -14.5,
    z: -10.5,
    severity: 'medium',
    maxTimeSec: 80,
    requiredRole: 'ticket_clerk',
    repairCostCoins: 20,
    rewardMoney: 110,
    rewardXp: 40,
    rewardRep: 3,
    penaltySat: 6,
    penaltyRep: 3,
  },
  ticket_machine_failure: {
    kind: 'ticket_machine_failure',
    title: 'Auto Ticket Vending Machine Jam',
    titleBn: 'টিকিট ভেন্ডিং মেশিন ত্রুটি',
    objective: 'Clear paper jam & restart smart-card reader at Ticket Counter kiosk.',
    actionLabel: 'Reboot Ticket Terminal',
    locationLabel: 'Main Ticket Booth',
    facilityId: 'ticket_counters',
    x: -16.2,
    z: -11.2,
    severity: 'low',
    maxTimeSec: 85,
    requiredRole: 'ticket_clerk',
    repairCostCoins: 25,
    rewardMoney: 85,
    rewardXp: 35,
    rewardRep: 2,
    penaltySat: 5,
    penaltyRep: 2,
  },
  pa_system_failure: {
    kind: 'pa_system_failure',
    title: 'PA Announcement System Outage',
    titleBn: 'মাইক ও ঘোষণা ব্যবস্থা বিকল',
    objective: 'Reconnect amplifier bus in Station Office so Bengali train announcements resume.',
    actionLabel: 'Restore PA Amplifier',
    locationLabel: 'Station Master Office',
    facilityId: 'digital_info_boards',
    x: 0.5,
    z: -10.2,
    severity: 'high',
    maxTimeSec: 70,
    requiredRole: 'signal_engineer',
    repairCostCoins: 35,
    rewardMoney: 120,
    rewardXp: 45,
    rewardRep: 3,
    penaltySat: 6,
    penaltyRep: 3,
  },
  cleaning_shortage: {
    kind: 'cleaning_shortage',
    title: 'Sanitation & Platform Cleaning Backlog',
    titleBn: 'পরিচ্ছন্নতা ও বর্জ্য ব্যবস্থাপনা সংকট',
    objective: 'Assign maintenance crew to sanitize restrooms & Platform 1 food stalls.',
    actionLabel: 'Complete Station Sanitation',
    locationLabel: 'Tea Stall & Restrooms',
    facilityId: 'restrooms',
    x: 11.5,
    z: -8.5,
    severity: 'low',
    maxTimeSec: 90,
    requiredRole: 'maintenance_crew',
    repairCostCoins: 20,
    rewardMoney: 80,
    rewardXp: 32,
    rewardRep: 3,
    penaltySat: 5,
    penaltyRep: 2,
  },
  ch2_simultaneous_arrivals: {
    kind: 'ch2_simultaneous_arrivals',
    title: 'Dual Express Simultaneous Arrival',
    titleBn: 'যুগপৎ দুটি এক্সপ্রেস আগমন নিয়ন্ত্রণ',
    objective: 'Route two incoming Padma Terminal trains onto separate high-speed tracks safely.',
    actionLabel: 'Lock Parallel Signal Routes',
    locationLabel: 'Padma North Control Cabin',
    trackId: 7,
    x: 4.0,
    z: -8.0,
    severity: 'critical',
    maxTimeSec: 65,
    requiredRole: 'signal_engineer',
    repairCostCoins: 25,
    rewardMoney: 210,
    rewardXp: 80,
    rewardRep: 5,
    penaltySat: 7,
    penaltyRep: 5,
    chapterExclusive: 2,
  },
  ch2_emergency_diversion: {
    kind: 'ch2_emergency_diversion',
    title: 'Padma Terminal High-Speed Diversion',
    titleBn: 'পদ্মা টার্মিনাল জরুরি রুট পরিবর্তন',
    objective: 'Divert incoming international express around maintenance block onto Track 7.',
    actionLabel: 'Execute Track 7 Diversion',
    locationLabel: 'South Concourse Crossing',
    trackId: 7,
    x: 18.0,
    z: 45.0,
    severity: 'critical',
    maxTimeSec: 70,
    requiredRole: 'platform_supervisor',
    repairCostCoins: 30,
    rewardMoney: 220,
    rewardXp: 85,
    rewardRep: 5,
    penaltySat: 7,
    penaltyRep: 5,
    chapterExclusive: 2,
  },
  ch2_megahub_surge: {
    kind: 'ch2_megahub_surge',
    title: 'Padma Megahub Commuter & Cargo Surge',
    titleBn: 'পদ্মা মেগাহাব যাত্রী ও কার্গো চাপ',
    objective: 'Coordinate medical standby, ticket desks & freight siding across Platforms 4–5.',
    actionLabel: 'Stabilize Megahub Surge',
    locationLabel: 'Padma Platform 5 Hub',
    facilityId: 'waiting_rooms',
    x: 0.0,
    z: 59.0,
    severity: 'high',
    maxTimeSec: 80,
    requiredRole: 'medical_officer',
    repairCostCoins: 45,
    rewardMoney: 240,
    rewardXp: 90,
    rewardRep: 6,
    penaltySat: 7,
    penaltyRep: 5,
    chapterExclusive: 2,
  },
};

const CH1_OPS_ROTATION: readonly OpsEmergencyKind[] = [
  'signal_fault',
  'track_obstruction',
  'passenger_rush',
  'power_failure',
  'ticket_machine_failure',
  'pa_system_failure',
  'train_breakdown',
  'track_maintenance',
  'water_leakage',
  'missing_staff',
  'vip_security',
  'delayed_train',
  'unexpected_arrival',
  'platform_reassignment',
  'broken_escalator',
  'cleaning_shortage',
  'emergency_evacuation',
];

const CH2_OPS_ROTATION: readonly OpsEmergencyKind[] = [
  'ch2_simultaneous_arrivals',
  'ch2_emergency_diversion',
  'ch2_megahub_surge',
  ...CH1_OPS_ROTATION,
];

export const STAFF_ROLE_SPECS: Record<
  StaffRole,
  {
    label: string;
    defaultDuty: StaffDuty;
    hireCost: number;
    salaryPerDay: number;
    sampleNames: readonly { en: string; bn: string }[];
  }
> = {
  signal_engineer: {
    label: 'Signal & Track Engineer',
    defaultDuty: 'signals_tracks',
    hireCost: 240,
    salaryPerDay: 55,
    sampleNames: [
      { en: 'Eng. Mahbub Alam', bn: 'ইঞ্জি. মাহবুব আলম' },
      { en: 'Eng. Tanvir Rahman', bn: 'ইঞ্জি. তানভীর রহমান' },
    ],
  },
  ticket_clerk: {
    label: 'Ticket & Revenue Clerk',
    defaultDuty: 'passenger_service',
    hireCost: 160,
    salaryPerDay: 35,
    sampleNames: [
      { en: 'Farhana Akter', bn: 'ফারহানা আক্তার' },
      { en: 'Sohel Rana', bn: 'সোহেল রানা' },
    ],
  },
  platform_supervisor: {
    label: 'Platform Operations Supervisor',
    defaultDuty: 'platforms_boarding',
    hireCost: 220,
    salaryPerDay: 50,
    sampleNames: [
      { en: 'Zahirul Haque', bn: 'জহিরুল হক' },
      { en: 'Nadia Islam', bn: 'নাদিয়া ইসলাম' },
    ],
  },
  medical_officer: {
    label: 'Station Medical Officer',
    defaultDuty: 'passenger_service',
    hireCost: 260,
    salaryPerDay: 60,
    sampleNames: [
      { en: 'Dr. Tasnim Jahan', bn: 'ডা. তাসনিম জাহান' },
      { en: 'Dr. Ashraful Karim', bn: 'ডা. আশরাফুল করিম' },
    ],
  },
  maintenance_crew: {
    label: 'Facility & Power Crew',
    defaultDuty: 'facilities_power',
    hireCost: 180,
    salaryPerDay: 40,
    sampleNames: [
      { en: 'Moklesur Mia', bn: 'মোকলেছুর মিয়া' },
      { en: 'Habibur Rahman', bn: 'হাবিবুর রহমান' },
    ],
  },
  security_coordinator: {
    label: 'Security & VIP Coordinator',
    defaultDuty: 'security_support',
    hireCost: 250,
    salaryPerDay: 55,
    sampleNames: [
      { en: 'Insp. Shafiqul Islam', bn: 'ইন্সপেক্টর শফিকুল' },
      { en: 'Insp. Rasheda Begum', bn: 'ইন্সপেক্টর রাশেদা' },
    ],
  },
};

export function createInitialStaff(chapterId: ChapterId = 1): StationStaffMember[] {
  const staff: StationStaffMember[] = [
    {
      id: `st_${chapterId}_1`,
      name: 'Eng. Mahbub Alam',
      nameBn: 'ইঞ্জি. মাহবুব আলম',
      role: 'signal_engineer',
      roleLabel: STAFF_ROLE_SPECS.signal_engineer.label,
      shift: 'morning',
      duty: 'signals_tracks',
      performance: 78,
      fatigue: 12,
      salaryPerDay: 55,
      absent: false,
      assignedTaskLabel: 'Monitoring Interlocking Signals',
      level: 1,
    },
    {
      id: `st_${chapterId}_2`,
      name: 'Farhana Akter',
      nameBn: 'ফারহানা আক্তার',
      role: 'ticket_clerk',
      roleLabel: STAFF_ROLE_SPECS.ticket_clerk.label,
      shift: 'morning',
      duty: 'passenger_service',
      performance: 75,
      fatigue: 10,
      salaryPerDay: 35,
      absent: false,
      assignedTaskLabel: 'North Ticket Counter Service',
      level: 1,
    },
    {
      id: `st_${chapterId}_3`,
      name: 'Zahirul Haque',
      nameBn: 'জহিরুল হক',
      role: 'platform_supervisor',
      roleLabel: STAFF_ROLE_SPECS.platform_supervisor.label,
      shift: 'morning',
      duty: 'platforms_boarding',
      performance: 80,
      fatigue: 14,
      salaryPerDay: 50,
      absent: false,
      assignedTaskLabel: 'Platform Yellow-Line Dispatch',
      level: 1,
    },
    {
      id: `st_${chapterId}_4`,
      name: 'Moklesur Mia',
      nameBn: 'মোকলেছুর মিয়া',
      role: 'maintenance_crew',
      roleLabel: STAFF_ROLE_SPECS.maintenance_crew.label,
      shift: 'evening',
      duty: 'facilities_power',
      performance: 74,
      fatigue: 16,
      salaryPerDay: 40,
      absent: false,
      assignedTaskLabel: 'Generator & Platform Upkeep',
      level: 1,
    },
  ];

  if (chapterId === 2) {
    staff.push(
      {
        id: 'st_2_5',
        name: 'Dr. Tasnim Jahan',
        nameBn: 'ডা. তাসনিম জাহান',
        role: 'medical_officer',
        roleLabel: STAFF_ROLE_SPECS.medical_officer.label,
        shift: 'morning',
        duty: 'passenger_service',
        performance: 84,
        fatigue: 10,
        salaryPerDay: 60,
        absent: false,
        assignedTaskLabel: 'Padma Terminal Medical Bay',
        level: 2,
      },
      {
        id: 'st_2_6',
        name: 'Insp. Shafiqul Islam',
        nameBn: 'ইন্সপেক্টর শফিকুল',
        role: 'security_coordinator',
        roleLabel: STAFF_ROLE_SPECS.security_coordinator.label,
        shift: 'night',
        duty: 'security_support',
        performance: 82,
        fatigue: 12,
        salaryPerDay: 55,
        absent: false,
        assignedTaskLabel: 'Terminal Security Control',
        level: 2,
      },
    );
  }
  return staff;
}

export function createInitialFacilities(chapterId: ChapterId = 1): StationFacility[] {
  const isCh2 = chapterId === 2;
  return [
    {
      id: 'ticket_counters',
      name: 'Ticket Counters',
      nameBn: 'টিকিট কাউন্টার',
      constructed: true,
      level: isCh2 ? 2 : 1,
      condition: 94,
      constructCost: 0,
      upgradeCost: 260,
      maintenanceCostPerDay: 25,
      dailyIncome: isCh2 ? 160 : 90,
      satisfactionBonus: 3,
    },
    {
      id: 'information_desks',
      name: 'Information Desks',
      nameBn: 'তথ্য কেন্দ্র',
      constructed: true,
      level: isCh2 ? 2 : 1,
      condition: 92,
      constructCost: 0,
      upgradeCost: 200,
      maintenanceCostPerDay: 18,
      dailyIncome: 20,
      satisfactionBonus: 3,
    },
    {
      id: 'waiting_rooms',
      name: 'Waiting Rooms',
      nameBn: 'যাত্রী বিশ্রামাগার',
      constructed: true,
      level: isCh2 ? 2 : 1,
      condition: 90,
      constructCost: 0,
      upgradeCost: 280,
      maintenanceCostPerDay: 24,
      dailyIncome: 40,
      satisfactionBonus: 4,
    },
    {
      id: 'food_courts',
      name: 'Food Courts & Tea Stalls',
      nameBn: 'ফুড কোর্ট ও চায়ের দোকান',
      constructed: true,
      level: isCh2 ? 2 : 1,
      condition: 91,
      constructCost: 0,
      upgradeCost: 300,
      maintenanceCostPerDay: 28,
      dailyIncome: isCh2 ? 190 : 110,
      satisfactionBonus: 3,
    },
    {
      id: 'medical_room',
      name: 'Medical Room',
      nameBn: 'চিকিৎসা কক্ষ',
      constructed: isCh2,
      level: 1,
      condition: 96,
      constructCost: 320,
      upgradeCost: 280,
      maintenanceCostPerDay: 25,
      dailyIncome: 15,
      satisfactionBonus: 4,
    },
    {
      id: 'police_office',
      name: 'Railway Police Office',
      nameBn: 'রেলওয়ে পুলিশ ফাঁড়ি',
      constructed: true,
      level: isCh2 ? 2 : 1,
      condition: 95,
      constructCost: 0,
      upgradeCost: 320,
      maintenanceCostPerDay: 26,
      dailyIncome: 0,
      satisfactionBonus: 3,
    },
    {
      id: 'security_control_room',
      name: 'Security Control Room',
      nameBn: 'সিসিটিভি ও নিরাপত্তা নিয়ন্ত্রণ কক্ষ',
      constructed: isCh2,
      level: 1,
      condition: 95,
      constructCost: 420,
      upgradeCost: 380,
      maintenanceCostPerDay: 32,
      dailyIncome: 0,
      satisfactionBonus: 4,
    },
    {
      id: 'luggage_storage',
      name: 'Luggage Storage Lockers',
      nameBn: 'মালামাল সংরক্ষণ লকার',
      constructed: isCh2,
      level: 1,
      condition: 93,
      constructCost: 240,
      upgradeCost: 220,
      maintenanceCostPerDay: 15,
      dailyIncome: 65,
      satisfactionBonus: 2,
    },
    {
      id: 'restrooms',
      name: 'Passenger Restrooms',
      nameBn: 'যাত্রী শৌচাগার',
      constructed: true,
      level: 1,
      condition: 88,
      constructCost: 0,
      upgradeCost: 190,
      maintenanceCostPerDay: 22,
      dailyIncome: 25,
      satisfactionBonus: 3,
    },
    {
      id: 'staff_room',
      name: 'Railway Staff Lounge',
      nameBn: 'কর্মচারী বিশ্রাম কক্ষ',
      constructed: isCh2,
      level: 1,
      condition: 94,
      constructCost: 260,
      upgradeCost: 240,
      maintenanceCostPerDay: 16,
      dailyIncome: 0,
      satisfactionBonus: 2,
    },
    {
      id: 'seating_areas',
      name: 'Passenger Seating Areas',
      nameBn: 'প্ল্যাটফর্ম বসার আসন',
      constructed: true,
      level: 1,
      condition: 92,
      constructCost: 0,
      upgradeCost: 180,
      maintenanceCostPerDay: 12,
      dailyIncome: 0,
      satisfactionBonus: 3,
    },
    {
      id: 'platform_lighting',
      name: 'Platform LED Lighting Grid',
      nameBn: 'প্ল্যাটফর্ম এলইডি আলোকসজ্জা',
      constructed: true,
      level: isCh2 ? 2 : 1,
      condition: 94,
      constructCost: 0,
      upgradeCost: 240,
      maintenanceCostPerDay: 26,
      dailyIncome: 0,
      satisfactionBonus: 3,
    },
    {
      id: 'digital_info_boards',
      name: 'Digital Train Info Boards',
      nameBn: 'ডিজিটাল ট্রেন তথ্য বোর্ড',
      constructed: isCh2,
      level: 1,
      condition: 95,
      constructCost: 340,
      upgradeCost: 310,
      maintenanceCostPerDay: 24,
      dailyIncome: 45,
      satisfactionBonus: 4,
    },
    {
      id: 'footbridges',
      name: 'Footover Bridges',
      nameBn: 'ফুটওভার ব্রিজ',
      constructed: true,
      level: isCh2 ? 2 : 1,
      condition: 93,
      constructCost: 0,
      upgradeCost: 380,
      maintenanceCostPerDay: 25,
      dailyIncome: 0,
      satisfactionBonus: 4,
    },
    {
      id: 'elevators_escalators',
      name: 'Elevators & Escalators',
      nameBn: 'লিফট ও এস্কেলেটর',
      constructed: isCh2,
      level: 1,
      condition: 91,
      constructCost: 520,
      upgradeCost: 460,
      maintenanceCostPerDay: 42,
      dailyIncome: 30,
      satisfactionBonus: 5,
    },
  ];
}

export function createInitialFinanceLedger(dayNumber = 1): StationFinanceLedger {
  return {
    dayNumber,
    ticketIncomeToday: 0,
    rentalIncomeToday: 0,
    cargoIncomeToday: 0,
    staffSalariesToday: 0,
    electricityBillToday: 0,
    maintenanceCostToday: 0,
    constructionSpendToday: 0,
    emergencyRepairSpendToday: 0,
    netToday: 0,
    totalLifetimeIncome: 0,
    totalLifetimeExpenses: 0,
  };
}

export function createInitialTasks(chapterId: ChapterId = 1, dayNumber = 1): StationTask[] {
  const mult = chapterId === 2 ? 1.6 : 1;
  const tasks: StationTask[] = [
    {
      id: `daily_dispatch_d${dayNumber}`,
      category: 'daily',
      metric: 'on_time_dispatches',
      title: chapterId === 2 ? 'Dispatch 4 trains on time' : 'Dispatch 3 trains on time',
      titleBn: 'সময়মতো ট্রেন ডিসপ্যাচ সম্পন্ন করুন',
      description: 'Authorize departures with Signal Green/Yellow and Crossing Gate closed.',
      current: 0,
      target: chapterId === 2 ? 4 : 3,
      completed: false,
      claimed: false,
      rewardMoney: Math.round(180 * mult),
      rewardXp: Math.round(75 * mult),
      rewardRep: 4,
    },
    {
      id: `daily_signal_d${dayNumber}`,
      category: 'daily',
      metric: 'signal_repairs',
      title: 'Repair 2 signal or track faults',
      titleBn: '২টি সিগন্যাল বা ট্র্যাক ত্রুটি মেরামত করুন',
      description: 'Resolve signal faults, track inspections, or obstructions in Operations Hub.',
      current: 0,
      target: 2,
      completed: false,
      claimed: false,
      rewardMoney: Math.round(150 * mult),
      rewardXp: Math.round(65 * mult),
      rewardRep: 3,
    },
    {
      id: `weekly_emergencies_w1`,
      category: 'weekly',
      metric: 'emergencies_resolved',
      title: 'Weekly Safety Benchmark: Resolve 5 Emergencies',
      titleBn: 'সাপ্তাহিক নিরাপত্তা লক্ষ্য: ৫টি জরুরি অবস্থা সমাধান',
      description: 'Handle station security & operations alerts before timers expire.',
      current: 0,
      target: 5,
      completed: false,
      claimed: false,
      rewardMoney: Math.round(420 * mult),
      rewardXp: Math.round(160 * mult),
      rewardRep: 6,
      unlockAbility: 'Rapid Dispatch Coordination',
    },
    {
      id: `special_assist`,
      category: 'special',
      metric: 'passenger_assists',
      title: 'Passenger Care: Assist 3 Travelers / Train Events',
      titleBn: 'যাত্রী সেবা: ৩ জন যাত্রী বা ট্রেন ইভেন্ট সমাধান',
      description: 'Speak to confused passengers or resolve coach vestibule events.',
      current: 0,
      target: 3,
      completed: false,
      claimed: false,
      rewardMoney: Math.round(160 * mult),
      rewardXp: Math.round(70 * mult),
      rewardRep: 3,
    },
    {
      id: `mgmt_facility_staff`,
      category: 'management',
      metric: 'facilities_maintained',
      title: 'Facility Operations: Build or Repair 2 Station Facilities',
      titleBn: 'অবকাঠামো ব্যবস্থাপনা: ২টি সুবিধা নির্মাণ বা মেরামত',
      description: 'Construct, upgrade, or repair any of the 15 station facilities.',
      current: 0,
      target: 2,
      completed: false,
      claimed: false,
      rewardMoney: Math.round(210 * mult),
      rewardXp: Math.round(80 * mult),
      rewardRep: 4,
      unlockAbility: 'Automated Preventive Maintenance',
    },
    {
      id: `dev_station_upgrade`,
      category: 'development',
      metric: 'station_upgrades',
      title: chapterId === 2 ? 'Construct Track 8 at Padma Terminal' : 'Expand Station Track Infrastructure',
      titleBn: chapterId === 2 ? 'পদ্মা টার্মিনালে ৮ নম্বর লাইন নির্মাণ' : 'স্টেশন ট্র্যাক সম্প্রসারণ করুন',
      description:
        chapterId === 2
          ? 'Upgrade Padma Central Terminal to 8 full high-speed tracks.'
          : 'Complete a station expansion tier in the Upgrade Center [U].',
      current: 0,
      target: 1,
      completed: false,
      claimed: false,
      rewardMoney: Math.round(350 * mult),
      rewardXp: Math.round(140 * mult),
      rewardRep: 5,
      chapterExclusive: chapterId,
    },
  ];
  return tasks;
}

export function createInitialOperationsState(chapterId: ChapterId = 1): StationOperationsState {
  const initialEventTemplate =
    chapterId === 2
      ? OPS_EMERGENCY_TEMPLATES.ch2_simultaneous_arrivals
      : OPS_EMERGENCY_TEMPLATES.signal_fault;

  const starterEvent: OpsEmergencyEvent = {
    id: `ops_init_${chapterId}_1`,
    kind: initialEventTemplate.kind,
    title: initialEventTemplate.title,
    titleBn: initialEventTemplate.titleBn,
    objective: initialEventTemplate.objective,
    actionLabel: initialEventTemplate.actionLabel,
    locationLabel: initialEventTemplate.locationLabel,
    trackId: initialEventTemplate.trackId,
    facilityId: initialEventTemplate.facilityId,
    x: initialEventTemplate.x,
    z: initialEventTemplate.z,
    severity: initialEventTemplate.severity,
    timeRemainingSec: initialEventTemplate.maxTimeSec,
    maxTimeSec: initialEventTemplate.maxTimeSec,
    progressPct: 0,
    requiredRole: initialEventTemplate.requiredRole,
    repairCostCoins: initialEventTemplate.repairCostCoins,
    rewardMoney: initialEventTemplate.rewardMoney,
    rewardXp: initialEventTemplate.rewardXp,
    rewardRep: initialEventTemplate.rewardRep,
    penaltySat: initialEventTemplate.penaltySat,
    penaltyRep: initialEventTemplate.penaltyRep,
    resolved: false,
    failed: false,
    chapterExclusive: initialEventTemplate.chapterExclusive,
  };

  return {
    tasks: createInitialTasks(chapterId, 1),
    activeOpsEvents: [starterEvent],
    recentResolvedOps: [],
    staff: createInitialStaff(chapterId),
    facilities: createInitialFacilities(chapterId),
    finance: createInitialFinanceLedger(1),
    faultedSignalTracks: starterEvent.trackId && starterEvent.kind === 'signal_fault' ? [starterEvent.trackId] : [],
    obstructedTracks: [],
    powerOutageActive: false,
    paSystemFailed: false,
    nextOpsSpawnSec: 28,
    lastFinanceAppliedDay: 1,
    vipProtocol: null,
  };
}

export function getPrimaryDailyTask(ops: StationOperationsState): StationTask | null {
  return (
    ops.tasks.find((t) => t.category === 'daily' && !t.claimed) ??
    ops.tasks.find((t) => !t.claimed) ??
    ops.tasks[0] ??
    null
  );
}

export function recordTaskMetric(
  ops: StationOperationsState,
  metric: StationTaskMetric,
  delta = 1,
): StationOperationsState {
  if (delta <= 0) return ops;
  let changed = false;
  const tasks = ops.tasks.map((t) => {
    if (t.metric !== metric || t.completed) return t;
    changed = true;
    const nextCurrent = Math.min(t.target, t.current + delta);
    return {
      ...t,
      current: nextCurrent,
      completed: nextCurrent >= t.target,
    };
  });
  return changed ? { ...ops, tasks } : ops;
}

export function claimTaskReward(
  simState: StationSimState,
  ops: StationOperationsState,
  taskId: string,
  nowMs = Date.now(),
): {
  accepted: boolean;
  simState: StationSimState;
  opsState: StationOperationsState;
  unlockedAbility: string | null;
} {
  const target = ops.tasks.find((t) => t.id === taskId);
  if (!target || !target.completed || target.claimed) {
    return { accepted: false, simState, opsState: ops, unlockedAbility: null };
  }
  const nextTasks = ops.tasks.map((t) => (t.id === taskId ? { ...t, claimed: true } : t));
  const nextSim = applyXpAndRewards(
    simState,
    {
      moneyDelta: target.rewardMoney,
      xpDelta: target.rewardXp,
      repDelta: target.rewardRep,
      message: `Station Task Completed: "${target.title}" (+${target.rewardMoney}c, +${target.rewardXp} XP)!`,
    },
    nowMs,
  );
  const nextFinance: StationFinanceLedger = {
    ...ops.finance,
    rentalIncomeToday: ops.finance.rentalIncomeToday + target.rewardMoney,
    netToday: ops.finance.netToday + target.rewardMoney,
    totalLifetimeIncome: ops.finance.totalLifetimeIncome + target.rewardMoney,
  };
  return {
    accepted: true,
    simState: nextSim,
    opsState: { ...ops, tasks: nextTasks, finance: nextFinance },
    unlockedAbility: target.unlockAbility ?? null,
  };
}

export function refreshDailyTasksForNewDay(
  ops: StationOperationsState,
  chapterId: ChapterId,
  newDay: number,
): StationOperationsState {
  const nonDaily = ops.tasks.filter((t) => t.category !== 'daily');
  const freshDaily = createInitialTasks(chapterId, newDay).filter((t) => t.category === 'daily');
  return {
    ...ops,
    tasks: [...freshDaily, ...nonDaily],
  };
}

export function recordFinanceIncome(
  ops: StationOperationsState,
  category: 'ticket' | 'rental' | 'cargo',
  amount: number,
): StationOperationsState {
  if (amount <= 0) return ops;
  const f = ops.finance;
  return {
    ...ops,
    finance: {
      ...f,
      ticketIncomeToday: f.ticketIncomeToday + (category === 'ticket' ? amount : 0),
      rentalIncomeToday: f.rentalIncomeToday + (category === 'rental' ? amount : 0),
      cargoIncomeToday: f.cargoIncomeToday + (category === 'cargo' ? amount : 0),
      netToday: f.netToday + amount,
      totalLifetimeIncome: f.totalLifetimeIncome + amount,
    },
  };
}

export function recordFinanceExpense(
  ops: StationOperationsState,
  category: 'construction' | 'emergency',
  amount: number,
): StationOperationsState {
  if (amount <= 0) return ops;
  const f = ops.finance;
  return {
    ...ops,
    finance: {
      ...f,
      constructionSpendToday: f.constructionSpendToday + (category === 'construction' ? amount : 0),
      emergencyRepairSpendToday:
        f.emergencyRepairSpendToday + (category === 'emergency' ? amount : 0),
      netToday: f.netToday - amount,
      totalLifetimeExpenses: f.totalLifetimeExpenses + amount,
    },
  };
}

export function computeFinancePreview(ops: StationOperationsState, simState: StationSimState): {
  projectedPassiveIncome: number;
  dailySalaries: number;
  dailyElectricity: number;
  dailyMaintenance: number;
} {
  const dailySalaries = ops.staff
    .filter((s) => !s.absent)
    .reduce((sum, s) => sum + s.salaryPerDay, 0);
  const constructedFacilities = ops.facilities.filter((f) => f.constructed);
  const dailyMaintenance = constructedFacilities.reduce(
    (sum, f) => sum + f.maintenanceCostPerDay,
    0,
  );
  const projectedPassiveIncome = constructedFacilities.reduce(
    (sum, f) => sum + Math.round(f.dailyIncome * (0.85 + 0.15 * f.level)),
    0,
  );
  const dailyElectricity = 25 + (simState.unlockedTracks || 2) * 14 + constructedFacilities.length * 4;
  return { projectedPassiveIncome, dailySalaries, dailyMaintenance, dailyElectricity };
}

export function applyDailyFinanceCycle(
  simState: StationSimState,
  ops: StationOperationsState,
  newDayNumber: number,
  nowMs = Date.now(),
): { simState: StationSimState; opsState: StationOperationsState } {
  const preview = computeFinancePreview(ops, simState);
  const totalOut = preview.dailySalaries + preview.dailyMaintenance + preview.dailyElectricity;
  const netShift = preview.projectedPassiveIncome - totalOut;

  const updatedSim = applyXpAndRewards(
    simState,
    {
      moneyDelta: netShift,
      message: `Day ${newDayNumber} Daily Ledger Settled: Facilities +${preview.projectedPassiveIncome}c vs Upkeep -${totalOut}c (Net ${netShift >= 0 ? '+' : ''}${netShift}c).`,
    },
    nowMs,
  );

  const prevFinance = ops.finance;
  const freshFinance: StationFinanceLedger = {
    dayNumber: newDayNumber,
    ticketIncomeToday: 0,
    rentalIncomeToday: preview.projectedPassiveIncome,
    cargoIncomeToday: 0,
    staffSalariesToday: preview.dailySalaries,
    electricityBillToday: preview.dailyElectricity,
    maintenanceCostToday: preview.dailyMaintenance,
    constructionSpendToday: 0,
    emergencyRepairSpendToday: 0,
    netToday: netShift,
    totalLifetimeIncome: prevFinance.totalLifetimeIncome + preview.projectedPassiveIncome,
    totalLifetimeExpenses: prevFinance.totalLifetimeExpenses + totalOut,
  };

  let nextOps = refreshDailyTasksForNewDay(
    {
      ...ops,
      finance: freshFinance,
      lastFinanceAppliedDay: newDayNumber,
    },
    simState.chapterId === 2 ? 2 : 1,
    newDayNumber,
  );
  nextOps = {
    ...nextOps,
    staff: nextOps.staff.map((s) => ({
      ...s,
      fatigue: Math.max(0, s.fatigue - 25),
      absent: false,
    })),
  };

  return { simState: updatedSim, opsState: nextOps };
}

export function spawnOpsEmergency(
  simState: StationSimState,
  ops: StationOperationsState,
  requestedKind?: OpsEmergencyKind,
): { opsState: StationOperationsState; event: OpsEmergencyEvent | null } {
  if (ops.activeOpsEvents.length >= 4 && !requestedKind) {
    return { opsState: ops, event: null };
  }
  const chapterId: ChapterId = simState.chapterId === 2 ? 2 : 1;
  const rotation = chapterId === 2 ? CH2_OPS_ROTATION : CH1_OPS_ROTATION;
  const activeKinds = new Set(ops.activeOpsEvents.map((e) => e.kind));

  let kind: OpsEmergencyKind | undefined = requestedKind;
  if (!kind) {
    const startIdx = Math.floor(
      (simState.gameMinutes + ops.recentResolvedOps.length + ops.activeOpsEvents.length) %
        rotation.length,
    );
    for (let i = 0; i < rotation.length; i++) {
      const candidate = rotation[(startIdx + i) % rotation.length];
      if (!activeKinds.has(candidate)) {
        kind = candidate;
        break;
      }
    }
  }
  if (!kind) return { opsState: ops, event: null };

  const tpl = OPS_EMERGENCY_TEMPLATES[kind];
  const unlocked = Math.max(2, Math.min(chapterId === 2 ? 8 : 6, simState.unlockedTracks || 2));
  const safeTrack = tpl.trackId && tpl.trackId <= unlocked ? tpl.trackId : 1;
  const zCoord = tpl.trackId ? TRACK_Z[safeTrack] : tpl.z;
  const ev: OpsEmergencyEvent = {
    id: `ops_${chapterId}_${kind}_${Date.now()}_${ops.recentResolvedOps.length}`,
    kind,
    title: tpl.title,
    titleBn: tpl.titleBn,
    objective: tpl.objective,
    actionLabel: tpl.actionLabel,
    locationLabel: tpl.trackId ? `Track ${safeTrack} Corridor` : tpl.locationLabel,
    trackId: tpl.trackId ? safeTrack : undefined,
    facilityId: tpl.facilityId,
    x: tpl.x,
    z: zCoord,
    severity: tpl.severity,
    timeRemainingSec: tpl.maxTimeSec,
    maxTimeSec: tpl.maxTimeSec,
    progressPct: 0,
    requiredRole: tpl.requiredRole,
    repairCostCoins: tpl.repairCostCoins,
    rewardMoney: chapterId === 2 ? Math.round(tpl.rewardMoney * 1.25) : tpl.rewardMoney,
    rewardXp: tpl.rewardXp,
    rewardRep: tpl.rewardRep,
    penaltySat: tpl.penaltySat,
    penaltyRep: tpl.penaltyRep,
    resolved: false,
    failed: false,
    chapterExclusive: tpl.chapterExclusive,
  };

  const faultedSignalTracks =
    ev.kind === 'signal_fault' && ev.trackId && !ops.faultedSignalTracks.includes(ev.trackId)
      ? [...ops.faultedSignalTracks, ev.trackId]
      : ops.faultedSignalTracks;
  const obstructedTracks =
    ev.kind === 'track_obstruction' && ev.trackId && !ops.obstructedTracks.includes(ev.trackId)
      ? [...ops.obstructedTracks, ev.trackId]
      : ops.obstructedTracks;

  return {
    opsState: {
      ...ops,
      activeOpsEvents: [ev, ...ops.activeOpsEvents],
      faultedSignalTracks,
      obstructedTracks,
      powerOutageActive: ops.powerOutageActive || ev.kind === 'power_failure',
      paSystemFailed: ops.paSystemFailed || ev.kind === 'pa_system_failure',
    },
    event: ev,
  };
}

export function resolveOpsEmergency(
  simState: StationSimState,
  ops: StationOperationsState,
  eventId: string,
  nowMs = Date.now(),
  autoCompletedByStaff = false,
): {
  accepted: boolean;
  simState: StationSimState;
  opsState: StationOperationsState;
} {
  const ev = ops.activeOpsEvents.find((e) => e.id === eventId);
  if (!ev) return { accepted: false, simState, opsState: ops };

  if (
    ev.kind === 'vip_security' &&
    ops.vipProtocol?.active &&
    ops.vipProtocol.eventId === ev.id
  ) {
    const allCleared = ops.vipProtocol.lockedPlatforms.every((p) =>
      ops.vipProtocol!.clearedPlatforms.includes(p),
    );
    const allVerified = ops.vipProtocol.credentials.every((c) => c.status !== 'pending');
    if (!allCleared || !allVerified) {
      const denied = applyXpAndRewards(
        simState,
        {
          message:
            'Complete VIP Control Room checklist first: Clear locked platform(s) & verify all 3 delegate credentials.',
        },
        nowMs,
      );
      return { accepted: false, simState: denied, opsState: ops };
    }
  }

  if (!autoCompletedByStaff && ev.repairCostCoins > 0 && simState.money < ev.repairCostCoins) {
    const denied = applyXpAndRewards(
      simState,
      {
        message: `Need ${ev.repairCostCoins} coins to resolve "${ev.title}" (or let assigned staff finish auto-repair).`,
      },
      nowMs,
    );
    return { accepted: false, simState: denied, opsState: ops };
  }

  const remaining = ops.activeOpsEvents.filter((e) => e.id !== eventId);
  const resolvedCopy: OpsEmergencyEvent = { ...ev, progressPct: 100, resolved: true };

  const faultedSignalTracks = remaining
    .filter((e) => e.kind === 'signal_fault' && e.trackId)
    .map((e) => e.trackId!);
  const obstructedTracks = remaining
    .filter((e) => e.kind === 'track_obstruction' && e.trackId)
    .map((e) => e.trackId!);
  const powerOutageActive = remaining.some((e) => e.kind === 'power_failure');
  const paSystemFailed = remaining.some((e) => e.kind === 'pa_system_failure');

  const isSignalOrTrack =
    ev.kind === 'signal_fault' ||
    ev.kind === 'track_obstruction' ||
    ev.kind === 'track_maintenance';

  const updatedBase: StationSimState = {
    ...simState,
    satisfaction: Math.min(100, simState.satisfaction + 4),
    emergenciesResolved: simState.emergenciesResolved + 1,
    signalsRepaired: (simState.signalsRepaired ?? 0) + (isSignalOrTrack ? 1 : 0),
  };

  const netCoins = ev.rewardMoney - (autoCompletedByStaff ? 0 : ev.repairCostCoins);
  const finalSim = applyXpAndRewards(
    updatedBase,
    {
      moneyDelta: netCoins,
      xpDelta: ev.rewardXp,
      repDelta: ev.rewardRep,
      message: autoCompletedByStaff
        ? `Staff Auto-Resolved "${ev.title}"! (+${ev.rewardMoney}c, +${ev.rewardXp} XP)`
        : `Resolved "${ev.title}"! (Net ${netCoins >= 0 ? '+' : ''}${netCoins}c, +${ev.rewardXp} XP)`,
    },
    nowMs,
  );

  let nextOps: StationOperationsState = {
    ...ops,
    activeOpsEvents: remaining,
    recentResolvedOps: [resolvedCopy, ...ops.recentResolvedOps].slice(0, 12),
    faultedSignalTracks,
    obstructedTracks,
    powerOutageActive,
    paSystemFailed,
  };

  if (!autoCompletedByStaff && ev.repairCostCoins > 0) {
    nextOps = recordFinanceExpense(nextOps, 'emergency', ev.repairCostCoins);
  }
  nextOps = recordFinanceIncome(nextOps, 'rental', ev.rewardMoney);
  nextOps = recordTaskMetric(nextOps, 'emergencies_resolved', 1);
  if (isSignalOrTrack) {
    nextOps = recordTaskMetric(nextOps, 'signal_repairs', 1);
  }
  if (ev.kind === 'vip_security' || ev.kind === 'emergency_evacuation') {
    nextOps = recordTaskMetric(nextOps, 'security_prevented', 1);
  }

  return { accepted: true, simState: finalSim, opsState: nextOps };
}

export function hireStaffMember(
  simState: StationSimState,
  ops: StationOperationsState,
  role: StaffRole,
  nowMs = Date.now(),
): { accepted: boolean; simState: StationSimState; opsState: StationOperationsState } {
  const spec = STAFF_ROLE_SPECS[role];
  if (simState.money < spec.hireCost) {
    return {
      accepted: false,
      simState: applyXpAndRewards(
        simState,
        { message: `Cannot hire ${spec.label}: need ${spec.hireCost} coins.` },
        nowMs,
      ),
      opsState: ops,
    };
  }
  const idx = ops.staff.length;
  const pick = spec.sampleNames[idx % spec.sampleNames.length];
  const member: StationStaffMember = {
    id: `st_${simState.chapterId ?? 1}_${Date.now()}_${idx}`,
    name: pick.en,
    nameBn: pick.bn,
    role,
    roleLabel: spec.label,
    shift: idx % 3 === 0 ? 'morning' : idx % 3 === 1 ? 'evening' : 'night',
    duty: spec.defaultDuty,
    performance: 76,
    fatigue: 5,
    salaryPerDay: spec.salaryPerDay,
    absent: false,
    assignedTaskLabel: `Assigned to ${spec.defaultDuty.replace('_', ' ')}`,
    level: 1,
  };

  const nextSim = applyXpAndRewards(
    simState,
    {
      moneyDelta: -spec.hireCost,
      xpDelta: 25,
      message: `Hired ${member.name} (${member.roleLabel}) for -${spec.hireCost}c!`,
    },
    nowMs,
  );
  let nextOps = recordFinanceExpense(ops, 'construction', spec.hireCost);
  nextOps = { ...nextOps, staff: [...nextOps.staff, member] };
  return { accepted: true, simState: nextSim, opsState: nextOps };
}

export function assignStaffDuty(
  ops: StationOperationsState,
  staffId: string,
  duty: StaffDuty,
): StationOperationsState {
  const dutyLabels: Record<StaffDuty, string> = {
    signals_tracks: 'Signal Cabins & Track Switch Monitoring',
    platforms_boarding: 'Platform Crowd & Boarding Flow',
    facilities_power: 'Facility Repairs & Power Backup',
    passenger_service: 'Tickets, Info Desk & Medical Aid',
    security_support: 'Security Escort & Emergency Sweep',
    standby: 'Reserve Relief Standby',
  };
  return {
    ...ops,
    staff: ops.staff.map((s) =>
      s.id === staffId ? { ...s, duty, assignedTaskLabel: dutyLabels[duty] } : s,
    ),
  };
}

export function setStaffShift(
  ops: StationOperationsState,
  staffId: string,
  shift: StaffShift,
): StationOperationsState {
  return {
    ...ops,
    staff: ops.staff.map((s) => (s.id === staffId ? { ...s, shift } : s)),
  };
}

export function trainStaffMember(
  simState: StationSimState,
  ops: StationOperationsState,
  staffId: string,
  nowMs = Date.now(),
): { accepted: boolean; simState: StationSimState; opsState: StationOperationsState } {
  const cost = 110;
  const target = ops.staff.find((s) => s.id === staffId);
  if (!target) return { accepted: false, simState, opsState: ops };
  if (simState.money < cost) {
    return {
      accepted: false,
      simState: applyXpAndRewards(simState, { message: `Training costs ${cost} coins.` }, nowMs),
      opsState: ops,
    };
  }
  const nextStaff = ops.staff.map((s) =>
    s.id === staffId
      ? {
          ...s,
          level: Math.min(5, s.level + 1),
          performance: Math.min(100, s.performance + 10),
          fatigue: Math.max(0, s.fatigue - 10),
        }
      : s,
  );
  const nextSim = applyXpAndRewards(
    simState,
    {
      moneyDelta: -cost,
      xpDelta: 30,
      repDelta: 1,
      message: `Trained ${target.name} to Level ${Math.min(5, target.level + 1)} (+10% Performance)!`,
    },
    nowMs,
  );
  let nextOps = recordFinanceExpense(ops, 'emergency', cost);
  nextOps = recordTaskMetric({ ...nextOps, staff: nextStaff }, 'staff_trained', 1);
  return { accepted: true, simState: nextSim, opsState: nextOps };
}

export function replaceAbsentStaff(
  simState: StationSimState,
  ops: StationOperationsState,
  staffId: string,
  nowMs = Date.now(),
): { accepted: boolean; simState: StationSimState; opsState: StationOperationsState } {
  const reliefCost = 45;
  const target = ops.staff.find((s) => s.id === staffId);
  if (!target || !target.absent) return { accepted: false, simState, opsState: ops };
  if (simState.money < reliefCost) {
    return { accepted: false, simState, opsState: ops };
  }
  const nextStaff = ops.staff.map((s) =>
    s.id === staffId ? { ...s, absent: false, fatigue: 0 } : s,
  );
  const nextSim = applyXpAndRewards(
    simState,
    {
      moneyDelta: -reliefCost,
      xpDelta: 15,
      message: `Relief staff deployed to cover ${target.name}'s shift (-${reliefCost}c).`,
    },
    nowMs,
  );
  const nextOps = recordFinanceExpense({ ...ops, staff: nextStaff }, 'emergency', reliefCost);
  return { accepted: true, simState: nextSim, opsState: nextOps };
}

export function constructFacility(
  simState: StationSimState,
  ops: StationOperationsState,
  facilityId: FacilityId,
  nowMs = Date.now(),
): { accepted: boolean; simState: StationSimState; opsState: StationOperationsState } {
  const f = ops.facilities.find((item) => item.id === facilityId);
  if (!f || f.constructed) return { accepted: false, simState, opsState: ops };
  if (simState.money < f.constructCost) {
    return {
      accepted: false,
      simState: applyXpAndRewards(
        simState,
        { message: `Need ${f.constructCost} coins to construct ${f.name}.` },
        nowMs,
      ),
      opsState: ops,
    };
  }
  const nextFacilities = ops.facilities.map((item) =>
    item.id === facilityId ? { ...item, constructed: true, level: 1, condition: 100 } : item,
  );
  const baseSim: StationSimState = {
    ...simState,
    satisfaction: Math.min(100, simState.satisfaction + f.satisfactionBonus),
  };
  const nextSim = applyXpAndRewards(
    baseSim,
    {
      moneyDelta: -f.constructCost,
      xpDelta: 45,
      repDelta: 2,
      message: `Constructed ${f.name} (${f.nameBn})! +${f.satisfactionBonus}% Passenger Satisfaction.`,
    },
    nowMs,
  );
  let nextOps = recordFinanceExpense({ ...ops, facilities: nextFacilities }, 'construction', f.constructCost);
  nextOps = recordTaskMetric(nextOps, 'facilities_maintained', 1);
  return { accepted: true, simState: nextSim, opsState: nextOps };
}

export function upgradeFacility(
  simState: StationSimState,
  ops: StationOperationsState,
  facilityId: FacilityId,
  nowMs = Date.now(),
): { accepted: boolean; simState: StationSimState; opsState: StationOperationsState } {
  const f = ops.facilities.find((item) => item.id === facilityId);
  if (!f || !f.constructed || f.level >= 3) return { accepted: false, simState, opsState: ops };
  const cost = f.upgradeCost * f.level;
  if (simState.money < cost) {
    return {
      accepted: false,
      simState: applyXpAndRewards(simState, { message: `Upgrade requires ${cost} coins.` }, nowMs),
      opsState: ops,
    };
  }
  const nextFacilities = ops.facilities.map((item) =>
    item.id === facilityId
      ? { ...item, level: item.level + 1, condition: 100, dailyIncome: Math.round(item.dailyIncome * 1.35) }
      : item,
  );
  const baseSim: StationSimState = {
    ...simState,
    satisfaction: Math.min(100, simState.satisfaction + 3),
  };
  const nextSim = applyXpAndRewards(
    baseSim,
    {
      moneyDelta: -cost,
      xpDelta: 40,
      repDelta: 2,
      message: `Upgraded ${f.name} to Tier ${f.level + 1}! (-${cost}c)`,
    },
    nowMs,
  );
  let nextOps = recordFinanceExpense({ ...ops, facilities: nextFacilities }, 'construction', cost);
  nextOps = recordTaskMetric(nextOps, 'facilities_maintained', 1);
  return { accepted: true, simState: nextSim, opsState: nextOps };
}

export function repairFacility(
  simState: StationSimState,
  ops: StationOperationsState,
  facilityId: FacilityId,
  nowMs = Date.now(),
): { accepted: boolean; simState: StationSimState; opsState: StationOperationsState } {
  const f = ops.facilities.find((item) => item.id === facilityId);
  if (!f || !f.constructed || f.condition >= 99) return { accepted: false, simState, opsState: ops };
  const repairCost = Math.max(20, Math.round((100 - f.condition) * 1.4));
  if (simState.money < repairCost) {
    return {
      accepted: false,
      simState: applyXpAndRewards(simState, { message: `Repair costs ${repairCost} coins.` }, nowMs),
      opsState: ops,
    };
  }
  const nextFacilities = ops.facilities.map((item) =>
    item.id === facilityId ? { ...item, condition: 100 } : item,
  );
  const nextSim = applyXpAndRewards(
    simState,
    {
      moneyDelta: -repairCost,
      xpDelta: 20,
      repDelta: 1,
      message: `Maintained ${f.name} back to 100% condition (-${repairCost}c).`,
    },
    nowMs,
  );
  let nextOps = recordFinanceExpense({ ...ops, facilities: nextFacilities }, 'emergency', repairCost);
  nextOps = recordTaskMetric(nextOps, 'facilities_maintained', 1);
  return { accepted: true, simState: nextSim, opsState: nextOps };
}

export function stepStationOperations(
  simState: StationSimState,
  ops: StationOperationsState,
  dtSeconds: number,
  nowMs = Date.now(),
): {
  simState: StationSimState;
  opsState: StationOperationsState;
  spawnedEvent: OpsEmergencyEvent | null;
} {
  const safeDt = Math.max(0, Math.min(dtSeconds, 2));
  let nextSim = simState;
  let nextOps: StationOperationsState = {
    ...ops,
    nextOpsSpawnSec: Math.max(0, ops.nextOpsSpawnSec - safeDt),
  };
  let spawnedEvent: OpsEmergencyEvent | null = null;

  // 1. Facilities wear slowly; active maintenance crew softens degradation
  const activeMaintPower = nextOps.staff
    .filter((s) => !s.absent && s.duty === 'facilities_power')
    .reduce((sum, s) => sum + s.performance / 100, 0);
  const wearRate = Math.max(0.015, 0.055 - activeMaintPower * 0.02);
  nextOps = {
    ...nextOps,
    facilities: nextOps.facilities.map((f) =>
      f.constructed
        ? { ...f, condition: Math.max(35, f.condition - wearRate * safeDt) }
        : f,
    ),
  };

  // 2. Staff auto-resolve progress on active Ops events matching their role/duty
  const activeEvents = [...nextOps.activeOpsEvents];
  const autoCompletedIds: string[] = [];
  const expiredIds: string[] = [];

  for (let i = 0; i < activeEvents.length; i++) {
    const ev = activeEvents[i];
    const isInteractiveVipProtocol =
      ev.kind === 'vip_security' && nextOps.vipProtocol?.active && nextOps.vipProtocol.eventId === ev.id;
    const matchingStaff = nextOps.staff.filter(
      (s) =>
        !s.absent &&
        (s.role === ev.requiredRole ||
          (ev.requiredRole === 'signal_engineer' && s.duty === 'signals_tracks') ||
          (ev.requiredRole === 'maintenance_crew' && s.duty === 'facilities_power') ||
          (ev.requiredRole === 'platform_supervisor' && s.duty === 'platforms_boarding') ||
          (ev.requiredRole === 'security_coordinator' && s.duty === 'security_support')),
    );
    const staffRate = isInteractiveVipProtocol
      ? 0
      : matchingStaff.reduce(
          (sum, s) => sum + (s.performance / 100) * (1 + (s.level - 1) * 0.2) * 3.8,
          0,
        );
    const nextProgress = Math.min(100, ev.progressPct + staffRate * safeDt);
    const nextRemaining = Math.max(0, ev.timeRemainingSec - safeDt);

    activeEvents[i] = {
      ...ev,
      progressPct: isInteractiveVipProtocol && nextOps.vipProtocol
        ? computeVipProtocolProgressPct(nextOps.vipProtocol)
        : nextProgress,
      timeRemainingSec: nextRemaining,
    };

    if (nextProgress >= 100 && !isInteractiveVipProtocol) {
      autoCompletedIds.push(ev.id);
    } else if (nextRemaining <= 0 && !isInteractiveVipProtocol) {
      expiredIds.push(ev.id);
    }
  }

  nextOps = { ...nextOps, activeOpsEvents: activeEvents };

  for (const id of autoCompletedIds) {
    const res = resolveOpsEmergency(nextSim, nextOps, id, nowMs, true);
    nextSim = res.simState;
    nextOps = res.opsState;
  }

  for (const id of expiredIds) {
    const expired = nextOps.activeOpsEvents.find((e) => e.id === id);
    if (!expired) continue;
    nextOps = {
      ...nextOps,
      activeOpsEvents: nextOps.activeOpsEvents.filter((e) => e.id !== id),
      recentResolvedOps: [{ ...expired, failed: true }, ...nextOps.recentResolvedOps].slice(0, 12),
    };
    nextSim = applyXpAndRewards(
      {
        ...nextSim,
        emergenciesFailed: nextSim.emergenciesFailed + 1,
        satisfaction: Math.max(0, nextSim.satisfaction - expired.penaltySat),
      },
      {
        repDelta: -expired.penaltyRep,
        message: `Ops Alert Expired: "${expired.title}" (-${expired.penaltySat}% Sat, -${expired.penaltyRep}% Rep).`,
      },
      nowMs,
    );
  }

  // Recompute status flags after expiry
  nextOps = {
    ...nextOps,
    faultedSignalTracks: nextOps.activeOpsEvents
      .filter((e) => e.kind === 'signal_fault' && e.trackId)
      .map((e) => e.trackId!),
    obstructedTracks: nextOps.activeOpsEvents
      .filter((e) => e.kind === 'track_obstruction' && e.trackId)
      .map((e) => e.trackId!),
    powerOutageActive: nextOps.activeOpsEvents.some((e) => e.kind === 'power_failure'),
    paSystemFailed: nextOps.activeOpsEvents.some((e) => e.kind === 'pa_system_failure'),
  };

  // 3. Periodic spawning of new Operations events
  if (nextOps.nextOpsSpawnSec <= 0) {
    const spawnRes = spawnOpsEmergency(nextSim, nextOps);
    nextOps = {
      ...spawnRes.opsState,
      nextOpsSpawnSec: simState.chapterId === 2 ? 32 : 42,
    };
    spawnedEvent = spawnRes.event;
  }

  // 4. Advance active Emergency VIP Security Protocol countdown / timeout
  if (nextOps.vipProtocol?.active) {
    const vipNextRemaining = Math.max(0, nextOps.vipProtocol.timeRemainingSec - safeDt);
    if (vipNextRemaining <= 0) {
      const expiredVip: VipSecurityProtocol = {
        ...nextOps.vipProtocol,
        active: false,
        failed: true,
        timeRemainingSec: 0,
      };
      const expiredLinkedEv = nextOps.activeOpsEvents.find((e) => e.id === expiredVip.eventId);
      nextOps = {
        ...nextOps,
        vipProtocol: expiredVip,
        activeOpsEvents: nextOps.activeOpsEvents.filter((e) => e.id !== expiredVip.eventId),
        recentResolvedOps: expiredLinkedEv
          ? [{ ...expiredLinkedEv, failed: true }, ...nextOps.recentResolvedOps].slice(0, 12)
          : nextOps.recentResolvedOps,
      };
      nextSim = applyXpAndRewards(
        {
          ...nextSim,
          emergenciesFailed: nextSim.emergenciesFailed + 1,
          securityRating: Math.max(0, nextSim.securityRating - 5),
          satisfaction: Math.max(0, nextSim.satisfaction - 4),
        },
        {
          repDelta: -5,
          message: `VIP Security Protocol "${expiredVip.codename}" timed out before platform clearance & credential check!`,
        },
        nowMs,
      );
    } else {
      nextOps = {
        ...nextOps,
        vipProtocol: {
          ...nextOps.vipProtocol,
          timeRemainingSec: vipNextRemaining,
        },
      };
    }
  }

  // 5. Daily finance ledger rollover when train dayNumber advances past lastFinanceAppliedDay
  if (nextSim.dayNumber > nextOps.lastFinanceAppliedDay) {
    const ledgerRes = applyDailyFinanceCycle(nextSim, nextOps, nextSim.dayNumber, nowMs);
    nextSim = ledgerRes.simState;
    nextOps = ledgerRes.opsState;
  }

  return { simState: nextSim, opsState: nextOps, spawnedEvent };
}

// --- Emergency VIP Security Event Trigger, Flow Patterns & Control Room Verification ---

interface VipFlowPatternSpec {
  flowPattern: VipFlowPattern;
  codename: string;
  codenameBn: string;
  flowPatternLabel: string;
  flowPatternDescription: string;
  banglaAnnouncement: string;
}

export const VIP_FLOW_PATTERN_SPECS: Record<VipFlowPattern, VipFlowPatternSpec> = {
  diplomatic_evac_corridor: {
    flowPattern: 'diplomatic_evac_corridor',
    codename: 'Operation Padma Shield',
    codenameBn: 'অপারেশন পদ্মা শিল্ড',
    flowPatternLabel: 'Diplomatic Footbridge Evacuation Sweep',
    flowPatternDescription:
      'Civilians on Platform 1 clear northward into the Forecourt & West Footbridge while GRP escorts cordon the trackside corridor.',
    banglaAnnouncement:
      'জরুরি ভিআইপি নিরাপত্তা প্রোটোকল: ১ নম্বর প্ল্যাটফর্মের সকল যাত্রীকে ওভারব্রিজ ও সামনের কনকোর্সে সরে যাওয়ার অনুরোধ করা হচ্ছে।',
  },
  red_carpet_concourse_sweep: {
    flowPattern: 'red_carpet_concourse_sweep',
    codename: 'Operation Bengal Express',
    codenameBn: 'অপারেশন বেঙ্গল এক্সপ্রেস',
    flowPatternLabel: 'Alternate Platform Crowd Funnel',
    flowPatternDescription:
      'Civilians evacuate the VIP island platform across the East Crossing & Footbridge toward opposite safe platforms and stalls.',
    banglaAnnouncement:
      'জরুরি ভিআইপি নিরাপত্তা সতর্কতা: নির্ধারিত প্ল্যাটফর্ম খালি করে পাশের প্ল্যাটফর্মে নিরাপদে অবস্থান নিন।',
  },
  split_platform_lockdown: {
    flowPattern: 'split_platform_lockdown',
    codename: 'Operation Capital Motorcade',
    codenameBn: 'অপারেশন ক্যাপিটাল মোটরকেড',
    flowPatternLabel: 'Dual-Platform Perimeter Dispersion',
    flowPatternDescription:
      'Both main platforms clear simultaneously as commuters disperse into North Forecourt plaza and outer waiting concourses.',
    banglaAnnouncement:
      'উচ্চপর্যায়ের ভিআইপি নিরাপত্তা লকডাউন: ১ ও ২ নম্বর প্ল্যাটফর্ম সম্পূর্ণ খালি করুন এবং স্টেশন কনকোর্সে অবস্থান করুন।',
  },
};

const VIP_FLOW_ORDER: readonly VipFlowPattern[] = [
  'diplomatic_evac_corridor',
  'red_carpet_concourse_sweep',
  'split_platform_lockdown',
];

function computeVipProtocolProgressPct(protocol: VipSecurityProtocol): number {
  const platformTotal = Math.max(1, protocol.lockedPlatforms.length);
  const platformDone = protocol.clearedPlatforms.length;
  const credTotal = Math.max(1, protocol.credentials.length);
  const credDone = protocol.credentials.filter((c) => c.status !== 'pending').length;
  const pct = ((platformDone / platformTotal) * 0.5 + (credDone / credTotal) * 0.5) * 100;
  return Math.max(0, Math.min(100, Math.round(pct)));
}

function buildVipCredentialsForPattern(
  pattern: VipFlowPattern,
  seed: number,
): { manifestPrefix: string; credentials: VipCredentialRecord[] } {
  const manifestPrefix = 'BD-VIP-26';
  if (pattern === 'red_carpet_concourse_sweep') {
    return {
      manifestPrefix,
      credentials: [
        {
          id: `vip_cred_1_${seed}`,
          delegateName: 'Secy. Mahmudul Hasan',
          delegateNameBn: 'সচিব মাহমুদুল হাসান',
          designation: 'Ministry of Railways Envoy',
          badgeCode: 'BD-VIP-26-412',
          expectedManifestCode: 'BD-VIP-26-412',
          assignedCoach: 'KA-01 (Saloon)',
          clearanceTier: 'Ministry Escort',
          authentic: true,
          status: 'pending',
        },
        {
          id: `vip_cred_2_${seed}`,
          delegateName: 'Brig. Gen. Tanvir Ahmed',
          delegateNameBn: 'ব্রিগেডিয়ার জেনারেল তানভীর আহমেদ',
          designation: 'Protocol Security Chief',
          badgeCode: 'BD-VIP-26-419',
          expectedManifestCode: 'BD-VIP-26-419',
          assignedCoach: 'KHA-02 (Escort)',
          clearanceTier: 'Diplomatic Alpha',
          authentic: true,
          status: 'pending',
        },
        {
          id: `vip_cred_3_${seed}`,
          delegateName: 'Rashed Karim (Unverified)',
          delegateNameBn: 'রাশেদ করিম (অযাচাইকৃত)',
          designation: 'Press Attaché',
          badgeCode: 'OLD-PASS-19-008',
          expectedManifestCode: 'BD-VIP-26-425',
          assignedCoach: 'GA-03 (Unlisted)',
          clearanceTier: 'Railway Board',
          authentic: false,
          anomalyHint: 'Expired prefix OLD-PASS-19; manifest requires BD-VIP-26-425.',
          status: 'pending',
        },
      ],
    };
  }
  if (pattern === 'split_platform_lockdown') {
    return {
      manifestPrefix,
      credentials: [
        {
          id: `vip_cred_1_${seed}`,
          delegateName: 'Amb. Farhana Rahman',
          delegateNameBn: 'রাষ্ট্রদূত ফারহানা রহমান',
          designation: 'Foreign Trade Delegation Lead',
          badgeCode: 'BD-VIP-26-701',
          expectedManifestCode: 'BD-VIP-26-701',
          assignedCoach: 'KA-01 (Saloon)',
          clearanceTier: 'Diplomatic Alpha',
          authentic: true,
          status: 'pending',
        },
        {
          id: `vip_cred_2_${seed}`,
          delegateName: 'Imran Chowdhury (Mismatch)',
          delegateNameBn: 'ইমরান চৌধুরী (সন্দেহজনক)',
          designation: 'Contract Liaison',
          badgeCode: 'BD-VIP-26-999',
          expectedManifestCode: 'BD-VIP-26-704',
          assignedCoach: 'KHA-02 (Escort)',
          clearanceTier: 'Ministry Escort',
          authentic: false,
          anomalyHint: 'Forged serial -999 mismatch; manifest lists BD-VIP-26-704.',
          status: 'pending',
        },
        {
          id: `vip_cred_3_${seed}`,
          delegateName: 'DG Shamsul Alam',
          delegateNameBn: 'মহাপরিচালক শামসুল আলম',
          designation: 'Bangladesh Railway Directorate',
          badgeCode: 'BD-VIP-26-708',
          expectedManifestCode: 'BD-VIP-26-708',
          assignedCoach: 'KA-01 (Saloon)',
          clearanceTier: 'Railway Board',
          authentic: true,
          status: 'pending',
        },
      ],
    };
  }
  return {
    manifestPrefix,
    credentials: [
      {
        id: `vip_cred_1_${seed}`,
        delegateName: 'Dr. Tasnim Hossain',
        delegateNameBn: 'ড. তাসনিম হোসেন',
        designation: 'Regional Rail Summit Chair',
        badgeCode: 'BD-VIP-26-104',
        expectedManifestCode: 'BD-VIP-26-104',
        assignedCoach: 'KA-01 (Saloon)',
        clearanceTier: 'Diplomatic Alpha',
        authentic: true,
        status: 'pending',
      },
      {
        id: `vip_cred_2_${seed}`,
        delegateName: 'Tariqul Islam (Invalid Seal)',
        delegateNameBn: 'তরিকুল ইসলাম (ভুয়া পাস)',
        designation: 'External Courier',
        badgeCode: 'TMP-2023-442',
        expectedManifestCode: 'BD-VIP-26-109',
        assignedCoach: 'KHA-02 (Mismatch)',
        clearanceTier: 'Ministry Escort',
        authentic: false,
        anomalyHint: 'Revoked prefix TMP-2023; official manifest code is BD-VIP-26-109.',
        status: 'pending',
      },
      {
        id: `vip_cred_3_${seed}`,
        delegateName: 'Supt. Kamrul Ahsan',
        delegateNameBn: 'সুপার কামরুল আহসান',
        designation: 'Special Railway Escort',
        badgeCode: 'BD-VIP-26-115',
        expectedManifestCode: 'BD-VIP-26-115',
        assignedCoach: 'KHA-02 (Escort)',
        clearanceTier: 'Railway Board',
        authentic: true,
        status: 'pending',
      },
    ],
  };
}

export function triggerEmergencyVipSecurity(
  simState: StationSimState,
  ops: StationOperationsState,
  nowMs = Date.now(),
  preferredPattern?: VipFlowPattern,
): {
  accepted: boolean;
  simState: StationSimState;
  opsState: StationOperationsState;
  protocol: VipSecurityProtocol | null;
  announcement: string | null;
} {
  if (ops.vipProtocol?.active) {
    const notice = applyXpAndRewards(
      simState,
      {
        message: `VIP Security Protocol "${ops.vipProtocol.codename}" is already active — clear platforms & verify credentials in Control Room.`,
      },
      nowMs,
    );
    return {
      accepted: false,
      simState: notice,
      opsState: ops,
      protocol: ops.vipProtocol,
      announcement: null,
    };
  }

  const chapterId: ChapterId = simState.chapterId === 2 ? 2 : 1;
  const seed = ops.recentResolvedOps.length + simState.emergenciesResolved + Math.floor(nowMs % 1000);
  const fallbackPattern =
    VIP_FLOW_ORDER[(ops.recentResolvedOps.length + simState.emergenciesResolved) % VIP_FLOW_ORDER.length];
  const pattern =
    preferredPattern && preferredPattern in VIP_FLOW_PATTERN_SPECS ? preferredPattern : fallbackPattern;
  const spec = VIP_FLOW_PATTERN_SPECS[pattern];
  const unlocked = Math.max(2, Math.min(chapterId === 2 ? 8 : 6, simState.unlockedTracks || 2));

  let lockedPlatforms: TrackId[] = [1];
  if (pattern === 'red_carpet_concourse_sweep') {
    lockedPlatforms = [unlocked >= 4 ? 4 : 2];
  } else if (pattern === 'split_platform_lockdown') {
    lockedPlatforms = unlocked >= 4 ? [1, 4] : [1, 2];
  }

  const { manifestPrefix, credentials } = buildVipCredentialsForPattern(pattern, seed);
  const eventId = `ops_${chapterId}_vip_security_${Math.floor(nowMs)}_${seed}`;
  const maxTimeSec = 110;

  const protocol: VipSecurityProtocol = {
    active: true,
    eventId,
    codename: spec.codename,
    codenameBn: spec.codenameBn,
    flowPattern: pattern,
    flowPatternLabel: spec.flowPatternLabel,
    flowPatternDescription: spec.flowPatternDescription,
    lockedPlatforms,
    sweepOrderedPlatforms: [],
    clearedPlatforms: [],
    platformPassengerCounts: {},
    credentials,
    expectedManifestPrefix: manifestPrefix,
    passengersOnLockedPlatforms: 0,
    initialPassengersOnLockedPlatforms: 0,
    corridorEvacuationPct: 0,
    timeRemainingSec: maxTimeSec,
    maxTimeSec,
    completed: false,
    failed: false,
    banglaAnnouncement: spec.banglaAnnouncement,
  };

  const tpl = OPS_EMERGENCY_TEMPLATES.vip_security;
  const linkedEvent: OpsEmergencyEvent = {
    id: eventId,
    kind: 'vip_security',
    title: `${tpl.title} · ${spec.codename}`,
    titleBn: tpl.titleBn,
    objective: `Clear Platform ${lockedPlatforms.join(' & ')} and verify 3 VIP delegation credentials in Control Room.`,
    actionLabel: 'Verify in Control Room',
    locationLabel: `Platform ${lockedPlatforms.join(' & ')} Security Cordon`,
    trackId: lockedPlatforms[0],
    facilityId: 'security_control_room',
    x: 0.5,
    z: lockedPlatforms[0] === 1 ? -7.5 : 7.0,
    severity: 'critical',
    timeRemainingSec: maxTimeSec,
    maxTimeSec,
    progressPct: 0,
    requiredRole: 'security_coordinator',
    repairCostCoins: 0,
    rewardMoney: chapterId === 2 ? 300 : 240,
    rewardXp: 90,
    rewardRep: 6,
    penaltySat: 4,
    penaltyRep: 5,
    resolved: false,
    failed: false,
  };

  const remainingEvents = ops.activeOpsEvents.filter((e) => e.kind !== 'vip_security');
  const nextSim = applyXpAndRewards(
    simState,
    {
      message: `EMERGENCY VIP SECURITY TRIGGERED (${spec.codename}): ${spec.flowPatternLabel} — clear P${lockedPlatforms.join('/P')} & verify credentials!`,
    },
    nowMs,
  );

  return {
    accepted: true,
    simState: nextSim,
    opsState: {
      ...ops,
      activeOpsEvents: [linkedEvent, ...remainingEvents],
      vipProtocol: protocol,
    },
    protocol,
    announcement: spec.banglaAnnouncement,
  };
}

export function orderClearVipPlatform(
  simState: StationSimState,
  ops: StationOperationsState,
  platformId: TrackId,
  nowMs = Date.now(),
): {
  accepted: boolean;
  completed: boolean;
  simState: StationSimState;
  opsState: StationOperationsState;
  announcement: string | null;
} {
  const proto = ops.vipProtocol;
  if (!proto || !proto.active || !proto.lockedPlatforms.includes(platformId)) {
    return { accepted: false, completed: false, simState, opsState: ops, announcement: null };
  }

  const sweepOrderedPlatforms = proto.sweepOrderedPlatforms.includes(platformId)
    ? proto.sweepOrderedPlatforms
    : [...proto.sweepOrderedPlatforms, platformId];

  const hasLiveCount = Object.prototype.hasOwnProperty.call(
    proto.platformPassengerCounts,
    platformId,
  );
  const currentCount = proto.platformPassengerCounts[platformId] ?? 0;
  const verifiedEmptyNow = hasLiveCount && currentCount === 0;
  const clearedPlatforms =
    verifiedEmptyNow && !proto.clearedPlatforms.includes(platformId)
      ? [...proto.clearedPlatforms, platformId]
      : proto.clearedPlatforms;

  const updatedProto: VipSecurityProtocol = {
    ...proto,
    sweepOrderedPlatforms,
    clearedPlatforms,
    corridorEvacuationPct:
      clearedPlatforms.length === proto.lockedPlatforms.length
        ? 100
        : proto.corridorEvacuationPct,
  };

  const nextOps: StationOperationsState = {
    ...ops,
    vipProtocol: updatedProto,
  };
  const nextSim = applyXpAndRewards(
    simState,
    {
      xpDelta: verifiedEmptyNow ? 15 : 5,
      message: verifiedEmptyNow
        ? `Platform ${platformId} VIP perimeter verified CLEAR!`
        : hasLiveCount
          ? `Platform ${platformId} VIP Sweep Ordered — ${currentCount} passenger(s) routing off platform!`
          : `Platform ${platformId} VIP Sweep Ordered — evacuating platform crowd!`,
    },
    nowMs,
  );

  const finalized = tryFinalizeVipProtocol(nextSim, nextOps, nowMs);
  return {
    accepted: true,
    completed: finalized.completed,
    simState: finalized.simState,
    opsState: finalized.opsState,
    announcement:
      finalized.announcement ??
      `নিরাপত্তা ঘোষণা: ${platformId} নম্বর প্ল্যাটফর্ম ভিআইপি স্কোয়াডের জন্য দ্রুত খালি করুন।`,
  };
}

export function syncVipPlatformOccupancy(
  simState: StationSimState,
  ops: StationOperationsState,
  countsByPlatform: Partial<Record<TrackId, number>>,
  nowMs = Date.now(),
): {
  completed: boolean;
  newlyClearedPlatforms: TrackId[];
  simState: StationSimState;
  opsState: StationOperationsState;
  announcement: string | null;
} {
  const proto = ops.vipProtocol;
  if (!proto || !proto.active) {
    return {
      completed: false,
      newlyClearedPlatforms: [],
      simState,
      opsState: ops,
      announcement: null,
    };
  }

  let totalRemaining = 0;
  const newlyClearedPlatforms: TrackId[] = [];
  const nextCleared = [...proto.clearedPlatforms];

  for (const pId of proto.lockedPlatforms) {
    const cnt = Math.max(0, countsByPlatform[pId] ?? 0);
    totalRemaining += cnt;
    if (cnt === 0 && proto.sweepOrderedPlatforms.includes(pId) && !nextCleared.includes(pId)) {
      nextCleared.push(pId);
      newlyClearedPlatforms.push(pId);
    }
  }

  const initialPeak = Math.max(proto.initialPassengersOnLockedPlatforms, totalRemaining);
  const evacPct =
    nextCleared.length === proto.lockedPlatforms.length
      ? 100
      : initialPeak > 0
        ? Math.min(99, Math.round(((initialPeak - totalRemaining) / initialPeak) * 100))
        : proto.sweepOrderedPlatforms.length > 0
          ? 85
          : 0;

  const updatedProto: VipSecurityProtocol = {
    ...proto,
    platformPassengerCounts: { ...countsByPlatform },
    passengersOnLockedPlatforms: totalRemaining,
    initialPassengersOnLockedPlatforms: initialPeak,
    corridorEvacuationPct: evacPct,
    clearedPlatforms: nextCleared,
  };

  let nextSim = simState;
  if (newlyClearedPlatforms.length > 0) {
    nextSim = applyXpAndRewards(
      simState,
      {
        xpDelta: 15 * newlyClearedPlatforms.length,
        message: `VIP Perimeter Secured: Platform ${newlyClearedPlatforms.join(', ')} cleared of civilian crowds!`,
      },
      nowMs,
    );
  }

  const nextOps: StationOperationsState = {
    ...ops,
    vipProtocol: updatedProto,
  };

  const finalized = tryFinalizeVipProtocol(nextSim, nextOps, nowMs);
  return {
    completed: finalized.completed,
    newlyClearedPlatforms,
    simState: finalized.simState,
    opsState: finalized.opsState,
    announcement: finalized.announcement,
  };
}

export function verifyVipCredential(
  simState: StationSimState,
  ops: StationOperationsState,
  credentialId: string,
  decision: 'verify' | 'reject',
  nowMs = Date.now(),
): {
  accepted: boolean;
  correctDecision: boolean;
  completed: boolean;
  simState: StationSimState;
  opsState: StationOperationsState;
  announcement: string | null;
} {
  const proto = ops.vipProtocol;
  if (!proto || !proto.active) {
    return {
      accepted: false,
      correctDecision: false,
      completed: false,
      simState,
      opsState: ops,
      announcement: null,
    };
  }

  const cred = proto.credentials.find((c) => c.id === credentialId);
  if (!cred || cred.status !== 'pending') {
    return {
      accepted: false,
      correctDecision: false,
      completed: false,
      simState,
      opsState: ops,
      announcement: null,
    };
  }

  const correctDecision =
    (decision === 'verify' && cred.authentic) || (decision === 'reject' && !cred.authentic);

  if (!correctDecision) {
    const warnSim = applyXpAndRewards(
      {
        ...simState,
        securityRating: Math.max(0, simState.securityRating - 2),
      },
      {
        message: cred.authentic
          ? `Manifest Check Warning: ${cred.delegateName}'s badge (${cred.badgeCode}) matches official manifest ${cred.expectedManifestCode} — choose Verify!`
          : `Security Alert: ${cred.delegateName}'s badge (${cred.badgeCode}) has an anomaly (${cred.anomalyHint ?? 'Invalid code'}) — Flag & Reject it!`,
      },
      nowMs,
    );
    return {
      accepted: false,
      correctDecision: false,
      completed: false,
      simState: warnSim,
      opsState: ops,
      announcement: null,
    };
  }

  const nextStatus = decision === 'verify' ? 'verified' : 'rejected';
  const nextCreds = proto.credentials.map((c) =>
    c.id === credentialId ? { ...c, status: nextStatus as 'verified' | 'rejected' } : c,
  );
  const updatedProto: VipSecurityProtocol = {
    ...proto,
    credentials: nextCreds,
  };

  const nextSim = applyXpAndRewards(
    {
      ...simState,
      crimesPrevented: simState.crimesPrevented + (decision === 'reject' ? 1 : 0),
      securityRating: Math.min(100, simState.securityRating + (decision === 'reject' ? 2 : 1)),
    },
    {
      xpDelta: decision === 'reject' ? 25 : 15,
      message:
        decision === 'reject'
          ? `Intercepted forged/expired VIP pass for ${cred.delegateName} (${cred.badgeCode})! (+25 XP)`
          : `Verified authentic VIP credentials for ${cred.delegateName} (${cred.badgeCode}). (+15 XP)`,
    },
    nowMs,
  );

  const nextOps: StationOperationsState = {
    ...ops,
    vipProtocol: updatedProto,
  };
  const finalized = tryFinalizeVipProtocol(nextSim, nextOps, nowMs);
  return {
    accepted: true,
    correctDecision: true,
    completed: finalized.completed,
    simState: finalized.simState,
    opsState: finalized.opsState,
    announcement: finalized.announcement,
  };
}

export function tryFinalizeVipProtocol(
  simState: StationSimState,
  ops: StationOperationsState,
  nowMs = Date.now(),
): {
  completed: boolean;
  simState: StationSimState;
  opsState: StationOperationsState;
  announcement: string | null;
} {
  const proto = ops.vipProtocol;
  if (!proto || !proto.active) {
    return { completed: false, simState, opsState: ops, announcement: null };
  }

  const allPlatformsCleared = proto.lockedPlatforms.every((p) =>
    proto.clearedPlatforms.includes(p),
  );
  const allCredentialsChecked = proto.credentials.every((c) => c.status !== 'pending');
  if (!allPlatformsCleared || !allCredentialsChecked) {
    return { completed: false, simState, opsState: ops, announcement: null };
  }

  const chapterId: ChapterId = simState.chapterId === 2 ? 2 : 1;
  const rewardMoney = chapterId === 2 ? 300 : 240;
  const completedProto: VipSecurityProtocol = {
    ...proto,
    active: false,
    completed: true,
    corridorEvacuationPct: 100,
  };

  const linkedEv = ops.activeOpsEvents.find((e) => e.id === proto.eventId);
  const remainingEvents = ops.activeOpsEvents.filter((e) => e.id !== proto.eventId);
  const resolvedEntry = linkedEv
    ? [{ ...linkedEv, progressPct: 100, resolved: true }, ...ops.recentResolvedOps].slice(0, 12)
    : ops.recentResolvedOps;

  const finalSim = applyXpAndRewards(
    {
      ...simState,
      emergenciesResolved: simState.emergenciesResolved + 1,
      securityRating: Math.min(100, simState.securityRating + 4),
      satisfaction: Math.min(100, simState.satisfaction + 5),
    },
    {
      moneyDelta: rewardMoney,
      xpDelta: 90,
      repDelta: 6,
      message: `${proto.codename} Complete! VIP platforms cleared & all credentials verified (+${rewardMoney}c, +90 XP, +6% Rep)!`,
    },
    nowMs,
  );

  let nextOps: StationOperationsState = {
    ...ops,
    activeOpsEvents: remainingEvents,
    recentResolvedOps: resolvedEntry,
    vipProtocol: completedProto,
  };
  nextOps = recordFinanceIncome(nextOps, 'rental', rewardMoney);
  nextOps = recordTaskMetric(nextOps, 'emergencies_resolved', 1);
  nextOps = recordTaskMetric(nextOps, 'security_prevented', 1);

  return {
    completed: true,
    simState: finalSim,
    opsState: nextOps,
    announcement:
      'ভিআইপি নিরাপত্তা প্রোটোকল সফলভাবে সম্পন্ন হয়েছে! সকল প্ল্যাটফর্মে স্বাভাবিক যাত্রী চলাচল শুরু হয়েছে।',
  };
}
