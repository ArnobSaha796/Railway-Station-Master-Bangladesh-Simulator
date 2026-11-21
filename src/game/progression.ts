import { applyXpAndRewards } from './rules';
import type {
  StationSimState,
  StationUpgradeRequirement,
  StationUpgradeSnapshot,
  StationUpgradeTierSpec,
  TrackId,
} from './types';

export const STATION_UPGRADE_TIERS: readonly StationUpgradeTierSpec[] = [
  {
    level: 1,
    tracksUnlocked: 2,
    title: 'Regional Junction',
    titleBn: 'আঞ্চলিক জংশন স্টেশন',
    subtitle: '2 Operational Tracks · Dual-Platform Baseline Hub',
    costCoins: 0,
    rewardXp: 0,
    rewardRep: 0,
    revenueMultiplier: 1.0,
    minDispatches: 0,
    minSatisfaction: 0,
    minReputation: 0,
    minSecurityResolved: 0,
    minPlayerLevel: 1,
    unlockFeatures: [
      'Tracks 1 & 2 with 3-aspect Semaphore Signals',
      'Platform 1 & 2 canopies, waiting room & ticket booths',
      'West Footover Bridge & East Level Crossing Gate',
    ],
    constructionSummaryBn:
      'শাপলাপুর জংশন ২টি সক্রিয় রেললাইন ও প্রাথমিক প্ল্যাটফর্মসহ যাত্রা শুরু করেছে।',
  },
  {
    level: 2,
    tracksUnlocked: 3,
    title: 'City Commuter Hub',
    titleBn: 'শহর কমিউটার হাব',
    subtitle: 'Unlocks Track 3 · Platform 2 South Island Face & Urban Canopy',
    costCoins: 450,
    rewardXp: 110,
    rewardRep: 4,
    revenueMultiplier: 1.15,
    minDispatches: 1,
    minSatisfaction: 76,
    minReputation: 75,
    minSecurityResolved: 0,
    minPlayerLevel: 1,
    unlockFeatures: [
      'Constructs Track 3 (Ballast, Steel Rails, Concrete Sleepers & Signal 3)',
      'Upgrades Platform 2 into a Dual-Face Island Platform with South Tactile Curb',
      'Adds illuminated Platform 3 Hangings, Benches & +15% Dispatch Revenue',
    ],
    constructionSummaryBn:
      'অভিনন্দন! ৩ নম্বর নতুন রেললাইন, সিগন্যাল ও প্ল্যাটফর্ম সম্প্রসারণ সফলভাবে সম্পন্ন হয়েছে।',
  },
  {
    level: 3,
    tracksUnlocked: 4,
    title: 'Intercity Express Terminal',
    titleBn: 'আন্তঃনগর এক্সপ্রেস টার্মিনাল',
    subtitle: 'Unlocks Track 4 · New Island Platform 3 & Extended Footover Bridge',
    costCoins: 850,
    rewardXp: 150,
    rewardRep: 5,
    revenueMultiplier: 1.3,
    minDispatches: 3,
    minSatisfaction: 78,
    minReputation: 79,
    minSecurityResolved: 1,
    minPlayerLevel: 2,
    unlockFeatures: [
      'Constructs Track 4 & Semaphore Signal 4 with Automatic Block Detection',
      'Builds new Island Platform 3 with Roof Canopy, Lighting & Passenger Benches',
      'Extends West Footover Bridge & adds Stairs directly onto Island Platform 3',
    ],
    constructionSummaryBn:
      'শাপলাপুর জংশন এখন ৪ লাইনের আন্তঃনগর টার্মিনাল! নতুন ৩ নম্বর আইল্যান্ড প্ল্যাটফর্ম ও ফুটওভার ব্রিজ চালু হয়েছে।',
  },
  {
    level: 4,
    tracksUnlocked: 5,
    title: 'Metropolitan Rail Complex',
    titleBn: 'মেট্রোপলিটন রেল কমপ্লেক্স',
    subtitle: 'Unlocks Track 5 · Dual-Track Express Corridor & Heavy Cargo Slots',
    costCoins: 1300,
    rewardXp: 190,
    rewardRep: 5,
    revenueMultiplier: 1.48,
    minDispatches: 6,
    minSatisfaction: 80,
    minReputation: 83,
    minSecurityResolved: 2,
    minPlayerLevel: 3,
    unlockFeatures: [
      'Constructs Track 5 along Platform 3 South Face with Signal 5',
      'Extends East Plank Crossing & Level Crossing Safety Apron across 5 tracks',
      'Unlocks Peak Metropolitan Express & Container Freight Surge (+48% Revenue)',
    ],
    constructionSummaryBn:
      'মেট্রোপলিটন রেল কমপ্লেক্স উন্নীত! ৫ নম্বর রেললাইন ও এক্সপ্রেস করিডোর যাত্রীদের জন্য উন্মুক্ত।',
  },
  {
    level: 5,
    tracksUnlocked: 6,
    title: 'International Grand Central',
    titleBn: 'আন্তর্জাতিক গ্র্যান্ড সেন্ট্রাল',
    subtitle: 'Unlocks Track 6 · Modern South Glass Concourse & 6-Track Megahub',
    costCoins: 1850,
    rewardXp: 260,
    rewardRep: 6,
    revenueMultiplier: 1.65,
    minDispatches: 10,
    minSatisfaction: 83,
    minReputation: 86,
    minSecurityResolved: 3,
    minPlayerLevel: 4,
    unlockFeatures: [
      'Constructs Track 6 & Semaphore Signal 6 for International & Flagship Express',
      'Builds Modern Glass South Terminal Concourse (Platform 4) & Skywalk Stairs',
      'Full 6-Track Concurrent Scheduling with +65% Station Revenue Bonus',
    ],
    constructionSummaryBn:
      'ঐতিহাসিক মাইলফলক! ৬ নম্বর রেললাইন ও আধুনিক দক্ষিণ কাঁচের টার্মিনাল ভবনসহ আন্তর্জাতিক গ্র্যান্ড সেন্ট্রাল চালু হয়েছে!',
  },
];

export const CHAPTER2_UPGRADE_TIERS: readonly StationUpgradeTierSpec[] = [
  {
    level: 1,
    tracksUnlocked: 7,
    title: 'Padma National Rail Terminal',
    titleBn: 'পদ্মা ন্যাশনাল রেল টার্মিনাল',
    subtitle: '7 Active Tracks · Dual Control Towers & Flagship Concourse',
    costCoins: 0,
    rewardXp: 0,
    rewardRep: 0,
    revenueMultiplier: 1.75,
    minDispatches: 0,
    minSatisfaction: 0,
    minReputation: 0,
    minSecurityResolved: 0,
    minPlayerLevel: 1,
    unlockFeatures: [
      '7 Active Tracks & 5 Platforms with Modern Glass Arched Train Shed',
      'Expanded South Terminal Platform 5 & Dual Interlocking Towers',
      'Chapter 2 High-Volume Simultaneous Express & Cargo Operations',
    ],
    constructionSummaryBn:
      'পদ্মা সেন্ট্রাল টার্মিনাল ৭টি সক্রিয় রেললাইন ও আধুনিক আর্চ ছাউনি নিয়ে যাত্রা শুরু করেছে!',
  },
  {
    level: 2,
    tracksUnlocked: 8,
    title: 'Padma 8-Track Megahub Terminal',
    titleBn: 'পদ্মা ৮-ট্র্যাক মেগাহাব টার্মিনাল',
    subtitle: 'Unlocks Track 8 · Dedicated High-Speed Express & Port Freight Line',
    costCoins: 2400,
    rewardXp: 360,
    rewardRep: 6,
    revenueMultiplier: 2.05,
    minDispatches: 4,
    minSatisfaction: 82,
    minReputation: 84,
    minSecurityResolved: 2,
    minPlayerLevel: 4,
    unlockFeatures: [
      'Constructs Track 8 & Semaphore Signal 8 along South Terminal Platform 5',
      'Activates Full 8-Track Simultaneous Diversion & Flagship Express Slots',
      'Boosts Padma Terminal revenue multiplier to 2.05x across all operations',
    ],
    constructionSummaryBn:
      'অভিনন্দন! পদ্মা সেন্ট্রাল টার্মিনালে ৮ নম্বর নতুন রেললাইন ও সিগন্যাল সফলভাবে চালু হয়েছে!',
  },
];

export function getUpgradeTierSpec(level: number, chapterId: 1 | 2 = 1): StationUpgradeTierSpec {
  const safeLevel = Math.max(1, Math.floor(level));
  if (chapterId === 2) {
    if (safeLevel <= CHAPTER2_UPGRADE_TIERS.length) {
      return CHAPTER2_UPGRADE_TIERS[safeLevel - 1];
    }
    const extraSteps = safeLevel - CHAPTER2_UPGRADE_TIERS.length;
    return {
      level: safeLevel,
      tracksUnlocked: 8,
      title: `Padma Apex Digital Rail Hub Tier ${safeLevel}`,
      titleBn: `পদ্মা এপেক্স ডিজিটাল হাব স্তর ${safeLevel}`,
      subtitle: `Level ${safeLevel} Chapter 2 Prestige · +${Math.round((1.05 + extraSteps * 0.25) * 100)}% Revenue`,
      costCoins: 2400 + extraSteps * 850,
      rewardXp: 360 + extraSteps * 90,
      rewardRep: 4,
      revenueMultiplier: Number((2.05 + extraSteps * 0.25).toFixed(2)),
      minDispatches: 4 + extraSteps * 5,
      minSatisfaction: Math.min(95, 82 + extraSteps * 2),
      minReputation: Math.min(96, 84 + extraSteps * 2),
      minSecurityResolved: 2 + extraSteps * 2,
      minPlayerLevel: 4 + extraSteps,
      unlockFeatures: [
        'Full 8-track high-throughput automatic signaling across Padma Terminal',
        `Increases Padma revenue multiplier to ${(2.05 + extraSteps * 0.25).toFixed(2)}x`,
        'Unlocks VIP flagship express priority bonuses',
      ],
      constructionSummaryBn: `পদ্মা সেন্ট্রাল টার্মিনাল আধুনিকীকরণ স্তর ${safeLevel} সম্পন্ন হয়েছে!`,
    };
  }
  if (safeLevel <= STATION_UPGRADE_TIERS.length) {
    return STATION_UPGRADE_TIERS[safeLevel - 1];
  }
  const extraSteps = safeLevel - STATION_UPGRADE_TIERS.length;
  return {
    level: safeLevel,
    tracksUnlocked: 6,
    title:
      extraSteps === 1
        ? 'High-Speed Electrified Corridor'
        : extraSteps === 2
          ? 'Smart AI Metro-Rail Superhub'
          : `National Flagship Hub Tier ${safeLevel}`,
    titleBn:
      extraSteps === 1
        ? 'উচ্চগতির বৈদ্যুতিক রেল করিডোর'
        : extraSteps === 2
          ? 'স্মার্ট মেট্রো-রেল সুপারহাব'
          : `জাতীয় ফ্ল্যাগশিপ হাব স্তর ${safeLevel}`,
    subtitle: `Level ${safeLevel} Future Infrastructure · +${Math.round((0.65 + extraSteps * 0.2) * 100)}% Ticket & Cargo Yield`,
    costCoins: 1850 + extraSteps * 650,
    rewardXp: 260 + extraSteps * 70,
    rewardRep: 4,
    revenueMultiplier: Number((1.65 + extraSteps * 0.2).toFixed(2)),
    minDispatches: 10 + extraSteps * 4,
    minSatisfaction: Math.min(94, 83 + extraSteps * 2),
    minReputation: Math.min(96, 86 + extraSteps * 2),
    minSecurityResolved: 3 + extraSteps * 2,
    minPlayerLevel: 4 + extraSteps,
    unlockFeatures: [
      `Upgrades signaling throughput & automatic platform telemetry across all 6 tracks`,
      `Increases dispatch & ticket inspection revenue multiplier to ${(1.65 + extraSteps * 0.2).toFixed(2)}x`,
      `Unlocks prestige station lighting & VIP express city commuter demand`,
    ],
    constructionSummaryBn: `শাপলাপুর জংশন আধুনিকীকরণ স্তর ${safeLevel} সফলভাবে সম্পন্ন হয়েছে!`,
  };
}

export function getRevenueMultiplierForLevel(stationLevel: number, chapterId: 1 | 2 = 1): number {
  return getUpgradeTierSpec(stationLevel, chapterId).revenueMultiplier;
}

export function evaluateStationUpgrade(simState: StationSimState): {
  currentTier: StationUpgradeTierSpec;
  nextTier: StationUpgradeTierSpec;
  requirements: StationUpgradeRequirement[];
  allRequirementsMet: boolean;
  canAfford: boolean;
  canUpgradeNow: boolean;
  securityActionsCompleted: number;
} {
  const chapterId = simState.chapterId === 2 ? 2 : 1;
  const currentLevel = Math.max(1, simState.stationLevel || 1);
  const currentTier = getUpgradeTierSpec(currentLevel, chapterId);
  const nextTier = getUpgradeTierSpec(currentLevel + 1, chapterId);
  const securityActionsCompleted = simState.crimesPrevented + simState.emergenciesResolved;

  const requirements: StationUpgradeRequirement[] = [];
  if (nextTier.minDispatches > 0) {
    requirements.push({
      id: 'dispatches',
      label: 'Train Dispatches Completed',
      labelBn: 'ট্রেন ডিসপ্যাচ সম্পন্ন',
      current: simState.dispatchesCompleted,
      target: nextTier.minDispatches,
      met: simState.dispatchesCompleted >= nextTier.minDispatches,
    });
  }
  if (nextTier.minSatisfaction > 0) {
    requirements.push({
      id: 'satisfaction',
      label: 'Passenger Satisfaction',
      labelBn: 'যাত্রী সন্তুষ্টি',
      current: simState.satisfaction,
      target: nextTier.minSatisfaction,
      unit: '%',
      met: simState.satisfaction >= nextTier.minSatisfaction,
    });
  }
  if (nextTier.minReputation > 0) {
    requirements.push({
      id: 'reputation',
      label: 'Station Reputation',
      labelBn: 'স্টেশনের সুনাম',
      current: simState.reputation,
      target: nextTier.minReputation,
      unit: '%',
      met: simState.reputation >= nextTier.minReputation,
    });
  }
  if (nextTier.minSecurityResolved > 0) {
    requirements.push({
      id: 'security',
      label: 'Security & Emergency Missions',
      labelBn: 'নিরাপত্তা ও জরুরি মিশন',
      current: securityActionsCompleted,
      target: nextTier.minSecurityResolved,
      met: securityActionsCompleted >= nextTier.minSecurityResolved,
    });
  }
  if (nextTier.minPlayerLevel > 1) {
    requirements.push({
      id: 'player_level',
      label: 'Station Master Rank Level',
      labelBn: 'মাস্টার র‍্যাংক লেভেল',
      current: simState.level,
      target: nextTier.minPlayerLevel,
      met: simState.level >= nextTier.minPlayerLevel,
    });
  }

  const allRequirementsMet = requirements.every((r) => r.met);
  const canAfford = simState.money >= nextTier.costCoins;

  return {
    currentTier,
    nextTier,
    requirements,
    allRequirementsMet,
    canAfford,
    canUpgradeNow: allRequirementsMet && canAfford,
    securityActionsCompleted,
  };
}

export function buildStationUpgradeSnapshot(simState: StationSimState): StationUpgradeSnapshot {
  const evalRes = evaluateStationUpgrade(simState);
  const maxTracks = simState.chapterId === 2 ? 8 : 6;
  const minTracks = simState.chapterId === 2 ? 7 : 2;
  return {
    stationLevel: Math.max(1, simState.stationLevel || 1),
    unlockedTracks: Math.max(minTracks, Math.min(maxTracks, simState.unlockedTracks || minTracks)),
    currentTier: evalRes.currentTier,
    nextTier: evalRes.nextTier,
    requirements: evalRes.requirements,
    allRequirementsMet: evalRes.allRequirementsMet,
    canAfford: evalRes.canAfford,
    canUpgradeNow: evalRes.canUpgradeNow,
    money: simState.money,
    dispatchesCompleted: simState.dispatchesCompleted,
    satisfaction: simState.satisfaction,
    reputation: simState.reputation,
    securityActionsCompleted: evalRes.securityActionsCompleted,
    playerLevel: simState.level,
    revenueMultiplier: evalRes.currentTier.revenueMultiplier,
    completedTiers: simState.completedUpgradeLevels ?? [1],
  };
}

export interface StationUpgradeOutcome {
  accepted: boolean;
  simState: StationSimState;
  newStationLevel: number;
  newUnlockedTracks: number;
  tracksAdded: boolean;
  announcement: string | null;
  reason?: string;
}

export function purchaseNextStationUpgrade(
  simState: StationSimState,
  nowMs: number,
): StationUpgradeOutcome {
  const evaluation = evaluateStationUpgrade(simState);
  const { nextTier, allRequirementsMet, canAfford } = evaluation;

  if (!allRequirementsMet) {
    const missing = evaluation.requirements.find((r) => !r.met);
    const reason = missing
      ? `Upgrade locked: Complete "${missing.label}" (${missing.current}/${missing.target}${missing.unit ?? ''}).`
      : 'Upgrade requirements not yet met.';
    return {
      accepted: false,
      simState: applyXpAndRewards(simState, { message: reason }, nowMs),
      newStationLevel: simState.stationLevel,
      newUnlockedTracks: simState.unlockedTracks,
      tracksAdded: false,
      announcement: null,
      reason,
    };
  }

  if (!canAfford) {
    const reason = `Insufficient station funds: Need ${nextTier.costCoins} coins (have ${simState.money}).`;
    return {
      accepted: false,
      simState: applyXpAndRewards(simState, { message: reason }, nowMs),
      newStationLevel: simState.stationLevel,
      newUnlockedTracks: simState.unlockedTracks,
      tracksAdded: false,
      announcement: null,
      reason,
    };
  }

  const maxTracks = simState.chapterId === 2 ? 8 : 6;
  const minTracks = simState.chapterId === 2 ? 7 : 2;
  const prevTracks = Math.max(minTracks, Math.min(maxTracks, simState.unlockedTracks || minTracks));
  const newUnlockedTracks = Math.max(prevTracks, Math.min(maxTracks, nextTier.tracksUnlocked));
  const tracksAdded = newUnlockedTracks > prevTracks;

  const updatedSignals = { ...simState.trackSignals };
  if (tracksAdded) {
    for (let t = prevTracks + 1; t <= newUnlockedTracks; t++) {
      updatedSignals[t as TrackId] = 'red';
    }
  }

  const completed = Array.from(
    new Set([...(simState.completedUpgradeLevels ?? [1]), nextTier.level]),
  );

  const upgradedBase: StationSimState = {
    ...simState,
    stationLevel: nextTier.level,
    unlockedTracks: newUnlockedTracks,
    completedUpgradeLevels: completed,
    trackSignals: updatedSignals,
    satisfaction: Math.min(100, simState.satisfaction + 4),
  };

  const finalSim = applyXpAndRewards(
    upgradedBase,
    {
      moneyDelta: -nextTier.costCoins,
      xpDelta: nextTier.rewardXp,
      repDelta: nextTier.rewardRep,
      message: tracksAdded
        ? `STATION UPGRADED to Level ${nextTier.level} (${nextTier.title})! Track ${newUnlockedTracks} & Platform expansion constructed!`
        : `STATION UPGRADED to Level ${nextTier.level} (${nextTier.title})! Revenue yield x${nextTier.revenueMultiplier}.`,
    },
    nowMs,
  );

  return {
    accepted: true,
    simState: finalSim,
    newStationLevel: nextTier.level,
    newUnlockedTracks,
    tracksAdded,
    announcement: nextTier.constructionSummaryBn,
  };
}
