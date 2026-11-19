import assert from 'node:assert/strict';
import test from 'node:test';
import { findNavPath, getNodesByZone } from './npcNav';
import { FOOTBRIDGE_HEIGHT, groundHeightAt, PLATFORM_HEIGHT } from './physics';
import {
  buildStationUpgradeSnapshot,
  evaluateStationUpgrade,
  getRevenueMultiplierForLevel,
  getUpgradeTierSpec,
  purchaseNextStationUpgrade,
  STATION_UPGRADE_TIERS,
} from './progression';
import { createInitialSimState } from './rules';
import {
  assignTrainPlatform,
  createInitialTrainSimulation,
  setTrackSignalAspect,
  syncTrainSimulationUnlockedTracks,
} from './trainManager';

test('Station starts at Level 1 with 2 operational tracks and progressive 5-tier roadmap', () => {
  const sim = createInitialSimState();
  assert.equal(sim.stationLevel, 1);
  assert.equal(sim.unlockedTracks, 2);
  assert.equal(STATION_UPGRADE_TIERS.length, 5);
  assert.equal(STATION_UPGRADE_TIERS[0].tracksUnlocked, 2);
  assert.equal(STATION_UPGRADE_TIERS[4].tracksUnlocked, 6);

  const evalL1 = evaluateStationUpgrade(sim);
  assert.equal(evalL1.currentTier.level, 1);
  assert.equal(evalL1.nextTier.level, 2);
  assert.equal(evalL1.nextTier.tracksUnlocked, 3);
  assert.equal(evalL1.allRequirementsMet, false); // requires 1 dispatch
});

test('purchaseNextStationUpgrade blocks upgrade when milestones or funds are insufficient', () => {
  const sim = createInitialSimState();

  const missingDispatch = purchaseNextStationUpgrade(sim, 1000);
  assert.equal(missingDispatch.accepted, false);
  assert.equal(missingDispatch.newStationLevel, 1);
  assert.equal(missingDispatch.newUnlockedTracks, 2);

  const lowFunds = purchaseNextStationUpgrade(
    {
      ...sim,
      dispatchesCompleted: 2,
      satisfaction: 85,
      reputation: 82,
      money: 200,
    },
    1200,
  );
  assert.equal(lowFunds.accepted, false);
  assert.match(lowFunds.reason ?? '', /Insufficient station funds/i);
});

test('purchaseNextStationUpgrade progresses Level 1 -> 2 -> 3 -> 4 -> 5 -> 6 and unlocks Tracks 3..6', () => {
  let sim = {
    ...createInitialSimState(),
    money: 15000,
    level: 7,
    dispatchesCompleted: 20,
    satisfaction: 95,
    reputation: 95,
    crimesPrevented: 6,
    emergenciesResolved: 4,
  };

  for (let expectedLevel = 2; expectedLevel <= 6; expectedLevel++) {
    const res = purchaseNextStationUpgrade(sim, expectedLevel * 1000);
    assert.equal(res.accepted, true);
    assert.equal(res.newStationLevel, expectedLevel);
    const expectedTracks = Math.min(6, expectedLevel + 1);
    assert.equal(res.newUnlockedTracks, expectedTracks);
    assert.equal(res.tracksAdded, expectedLevel <= 5);
    assert.ok(res.announcement && res.announcement.length > 10);
    sim = res.simState;
    assert.equal(sim.stationLevel, expectedLevel);
    assert.equal(sim.unlockedTracks, expectedTracks);
    assert.equal(sim.trackSignals[expectedTracks as 1 | 2 | 3 | 4 | 5 | 6], 'red');
  }

  assert.equal(getRevenueMultiplierForLevel(1), 1.0);
  assert.equal(getRevenueMultiplierForLevel(5), 1.65);
  assert.ok(getUpgradeTierSpec(6).revenueMultiplier > 1.65);

  const snap = buildStationUpgradeSnapshot(sim);
  assert.equal(snap.stationLevel, 6);
  assert.equal(snap.unlockedTracks, 6);
  assert.ok(snap.nextTier);
  assert.equal(snap.nextTier.level, 7);
});

test('Train simulation respects unlockedTracks for platform assignment, signals, and expansion roster', () => {
  const sim = createInitialSimState();
  const trainState = createInitialTrainSimulation(1, 2);
  const targetTrain = trainState.trains.find((t) => t.status === 'Approaching') ?? trainState.trains[0];

  // Track 3 must be rejected while unlockedTracks === 2
  const blocked = assignTrainPlatform(sim, trainState, targetTrain.id, 3, 2000);
  assert.equal(blocked.accepted, false);

  const blockedSig = setTrackSignalAspect(sim, trainState, 4, 'green', 2100);
  assert.equal(blockedSig.accepted, false);

  // Unlock up to 4 tracks and verify assignment + signaling + extra trains work
  const upgradedSim = { ...sim, stationLevel: 3, unlockedTracks: 4 };
  const expandedTrains = syncTrainSimulationUnlockedTracks(trainState, 4, 440);
  assert.equal(expandedTrains.unlockedTracks, 4);
  assert.ok(expandedTrains.trains.length > trainState.trains.length);

  const allowedAssign = assignTrainPlatform(upgradedSim, expandedTrains, targetTrain.id, 4, 2200);
  assert.equal(allowedAssign.accepted, true);
  const updatedTrain = allowedAssign.trainState.trains.find((t) => t.id === targetTrain.id);
  assert.equal(updatedTrain?.assignedPlatform, 4);

  const allowedSig = setTrackSignalAspect(upgradedSim, allowedAssign.trainState, 4, 'yellow', 2300);
  assert.equal(allowedSig.accepted, true);
  assert.equal(allowedSig.simState.trackSignals[4], 'yellow');
});

test('Physics groundHeightAt and A* NPC nav graph unlock Island Platform 3 and South Glass Concourse progressively', () => {
  // Before Level 3 (2 tracks), z=24.5 (Platform 3) is street/corridor height 0
  assert.equal(groundHeightAt(0, 24.5, 0, 2), 0);
  assert.equal(getNodesByZone('platform3', 2).length, 0);
  assert.equal(getNodesByZone('platform4', 4).length, 0);

  // At 4 tracks, Platform 3 (z=24.5) rises to PLATFORM_HEIGHT and is A* reachable from Platform 1
  assert.equal(groundHeightAt(0, 24.5, 0, 4), PLATFORM_HEIGHT);
  assert.ok(getNodesByZone('platform3', 4).length > 0);
  const pathToP3 = findNavPath('p1_center', 'p3_center', { unlockedTracks: 4 });
  assert.ok(pathToP3.length > 2);
  assert.equal(pathToP3[pathToP3.length - 1], 'p3_center');

  // At 6 tracks, South Terminal Concourse (Platform 4, z=41) and extended Footover Bridge are walkable
  assert.equal(groundHeightAt(0, 41.0, 0, 6), PLATFORM_HEIGHT);
  assert.equal(groundHeightAt(-24.0, 35.0, FOOTBRIDGE_HEIGHT, 6), FOOTBRIDGE_HEIGHT);
  const pathToP4 = findNavPath('p1_center', 'p4_center', { unlockedTracks: 6 });
  assert.ok(pathToP4.length > 2);
  assert.equal(pathToP4[pathToP4.length - 1], 'p4_center');
});
