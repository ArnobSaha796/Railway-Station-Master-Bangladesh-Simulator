import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildStationCardSummaries,
  createInitialMultiStationState,
  evaluateChapterUnlockStatus,
  stepBackgroundStation,
  syncSharedProfileWithStations,
} from './chapters';
import { evaluateStationUpgrade, purchaseNextStationUpgrade } from './progression';
import { createDefaultAudioSettings } from './rules';
import {
  migrateV1ToMultiStation,
  parseMultiShiftData,
  serializeMultiShiftData,
  type SavedMultiStationShift,
  type SavedStationShift,
} from './storage';
import { divertTrainToPlatform, injectUnexpectedTrain, triggerSimultaneousPeakArrivals } from './trainManager';

test('Chapter 2 unlock gate stays locked until all 5 Chapter 1 milestones are satisfied', () => {
  const multi = createInitialMultiStationState();
  const lockedEval = evaluateChapterUnlockStatus(
    multi.chapter1.simState,
    multi.chapter1.opsState,
    false,
  );
  assert.equal(lockedEval.chapter2Unlocked, false);
  assert.equal(lockedEval.requirements.length, 5);
  assert.equal(lockedEval.requirements.every((r) => !r.met), true);

  // Partial progress (5 tracks, insufficient dispatches) still locked
  const partialEval = evaluateChapterUnlockStatus(
    {
      ...multi.chapter1.simState,
      unlockedTracks: 5,
      stationLevel: 4,
      reputation: 90,
      dispatchesCompleted: 8,
      emergenciesResolved: 2,
    },
    multi.chapter1.opsState,
    false,
  );
  assert.equal(partialEval.chapter2Unlocked, false);

  // All 5 criteria met unlocks Chapter 2
  const unlockedEval = evaluateChapterUnlockStatus(
    {
      ...multi.chapter1.simState,
      unlockedTracks: 6,
      stationLevel: 5,
      reputation: 88,
      dispatchesCompleted: 10,
      emergenciesResolved: 2,
    },
    multi.chapter1.opsState,
    false,
  );
  assert.equal(unlockedEval.chapter1Completed, true);
  assert.equal(unlockedEval.chapter2Unlocked, true);
});

test('Chapter 2 progression upgrades Track 7 -> Track 8 without overwriting Chapter 1', () => {
  const multi = createInitialMultiStationState();
  multi.chapter1.simState.unlockedTracks = 6;
  multi.chapter1.simState.money = 9999;

  const ch2SimReady = {
    ...multi.chapter2.simState,
    money: 5000,
    dispatchesCompleted: 6,
    satisfaction: 85,
    reputation: 85,
    emergenciesResolved: 2,
    level: 5,
  };
  const eval2 = evaluateStationUpgrade(ch2SimReady);
  assert.equal(eval2.nextTier.tracksUnlocked, 8);
  assert.equal(eval2.canUpgradeNow, true);

  const upgraded = purchaseNextStationUpgrade(ch2SimReady, 1000);
  assert.equal(upgraded.accepted, true);
  assert.equal(upgraded.newUnlockedTracks, 8);
  assert.equal(multi.chapter1.simState.unlockedTracks, 6);
});

test('stepBackgroundStation runs inactive station autonomously and updates summaries & shared profile', () => {
  const multi = createInitialMultiStationState();
  multi.chapter2Unlocked = true;
  const beforeMinutes = multi.chapter1.simState.gameMinutes;

  const stepped = stepBackgroundStation(multi.chapter1, 0.5, 2000);
  assert.ok(stepped.simState.gameMinutes > beforeMinutes);

  multi.chapter1 = stepped;
  multi.sharedProfile = syncSharedProfileWithStations(
    multi.sharedProfile,
    multi.chapter1,
    multi.chapter2,
    multi.chapter2.simState,
  );
  const cards = buildStationCardSummaries(multi);
  assert.equal(cards.length, 2);
  assert.equal(cards[0].tracksCount, 2);
  assert.equal(cards[1].tracksCount, 7);
  assert.equal(cards[1].maxTracks, 8);
  assert.equal(cards[1].unlocked, true);
});

test('advanced train operations inject unexpected train, simultaneous arrivals, and divert platforms cleanly', () => {
  const multi = createInitialMultiStationState();
  const sim = { ...multi.chapter2.simState, unlockedTracks: 8 };
  const ts = multi.chapter2.trainState;

  const injected = injectUnexpectedTrain(sim, ts, 1000);
  assert.equal(injected.accepted, true);
  assert.equal(injected.trainState.trains.length, ts.trains.length + 1);
  const special = injected.trainState.trains[0];

  const diverted = divertTrainToPlatform(injected.simState, injected.trainState, special.id, 7, 1500);
  assert.equal(diverted.accepted, true);
  assert.equal(diverted.trainState.trains.find((t) => t.id === special.id)?.assignedPlatform, 7);

  const rush = triggerSimultaneousPeakArrivals(diverted.simState, diverted.trainState, 2000);
  assert.equal(rush.accepted, true);
  assert.ok(rush.trainState.trains.filter((t) => t.status === 'Approaching').length >= 1);
});

test('Save/Load v2 serialization roundtrips both chapters cleanly and migrates v1 saves', () => {
  const multi = createInitialMultiStationState();
  multi.activeChapterId = 2;
  multi.chapter1Completed = true;
  multi.chapter2Unlocked = true;
  multi.chapter1.simState.unlockedTracks = 6;
  multi.chapter2.simState.unlockedTracks = 8;

  const payload: SavedMultiStationShift = {
    version: 2,
    savedAt: 1_700_000_500_000,
    multiState: multi,
    cameraMode: 'third-person',
    weather: 'rain',
    audioSettings: createDefaultAudioSettings(),
  };

  const json = serializeMultiShiftData(payload);
  const restored = parseMultiShiftData(json);
  assert.ok(restored);
  assert.equal(restored.multiState.activeChapterId, 2);
  assert.equal(restored.multiState.chapter2Unlocked, true);
  assert.equal(restored.multiState.chapter1.simState.unlockedTracks, 6);
  assert.equal(restored.multiState.chapter2.simState.unlockedTracks, 8);

  const v1Save: SavedStationShift = {
    version: 1,
    savedAt: 1_700_000_000_000,
    simState: { ...multi.chapter1.simState, unlockedTracks: 5, stationLevel: 4 },
    trainState: multi.chapter1.trainState,
    cameraMode: 'first-person',
    weather: 'clear',
    audioSettings: createDefaultAudioSettings(),
  };
  const migrated = migrateV1ToMultiStation(v1Save);
  assert.equal(migrated.version, 2);
  assert.equal(migrated.multiState.activeChapterId, 1);
  assert.equal(migrated.multiState.chapter1.simState.unlockedTracks, 5);
  assert.equal(migrated.multiState.chapter2.simState.unlockedTracks, 7);
});
