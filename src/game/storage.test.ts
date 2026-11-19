import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialNpcSimulation, stepNpcSimulation } from './npcManager';
import { findNavPath } from './npcNav';
import { createDefaultAudioSettings, createInitialSimState } from './rules';
import {
  parseShiftData,
  serializeShiftData,
  type SavedStationShift,
} from './storage';
import { createInitialTrainSimulation } from './trainManager';

test('serializeShiftData & parseShiftData roundtrip station level, tracks, and preferences', () => {
  const sim = {
    ...createInitialSimState(),
    dayNumber: 3,
    stationLevel: 4,
    unlockedTracks: 5,
    money: 4820,
    dispatchesCompleted: 9,
  };
  const trainState = createInitialTrainSimulation(3, 5);
  const payload: SavedStationShift = {
    version: 1,
    savedAt: 1_700_000_000_000,
    simState: sim,
    trainState,
    cameraMode: 'first-person',
    weather: 'rain',
    audioSettings: {
      ...createDefaultAudioSettings(),
      muted: true,
    },
  };

  const json = serializeShiftData(payload);
  const restored = parseShiftData(json);
  assert.ok(restored);
  assert.equal(restored.version, 1);
  assert.equal(restored.simState.stationLevel, 4);
  assert.equal(restored.simState.unlockedTracks, 5);
  assert.equal(restored.simState.money, 4820);
  assert.equal(restored.simState.dispatchesCompleted, 9);
  assert.equal(restored.cameraMode, 'first-person');
  assert.equal(restored.weather, 'rain');
  assert.equal(restored.audioSettings.muted, true);
  assert.equal(restored.trainState.trains.length, trainState.trains.length);
});

test('parseShiftData rejects null, corrupted JSON, and mismatched versions', () => {
  assert.equal(parseShiftData(null), null);
  assert.equal(parseShiftData(''), null);
  assert.equal(parseShiftData('{not-valid-json'), null);
  assert.equal(parseShiftData(JSON.stringify({ version: 2, savedAt: 1 })), null);
  assert.equal(
    parseShiftData(
      JSON.stringify({
        version: 1,
        savedAt: 1,
        simState: { stationLevel: 1 },
        trainState: { trains: 'bad' },
      }),
    ),
    null,
  );
});

test('stepNpcSimulation spawns expansion staff as Platform 3 (4 tracks) and Platform 4 (6 tracks) unlock', () => {
  const npcState = createInitialNpcSimulation();
  const baseSim = createInitialSimState();
  const baseTrains = createInitialTrainSimulation(1, 2);

  const playerPos = { x: 0, y: 0.65, z: -7.2 };

  // At 2 tracks, no Platform 3/4 expansion staff exist yet
  stepNpcSimulation(npcState, baseSim, baseTrains, playerPos, [], 0.05);
  assert.equal(npcState.npcs.some((n) => n.id.startsWith('staff_p3_')), false);
  assert.equal(npcState.npcs.some((n) => n.id.startsWith('staff_p4_')), false);

  // At 4 tracks, Platform 3 Railway Police, Station Staff & TTE deploy without duplicating across ticks
  const sim4 = { ...baseSim, stationLevel: 3, unlockedTracks: 4 };
  const trains4 = createInitialTrainSimulation(1, 4);
  stepNpcSimulation(npcState, sim4, trains4, playerPos, [], 0.05);
  stepNpcSimulation(npcState, sim4, trains4, playerPos, [], 0.05);

  const p3Staff = npcState.npcs.filter((n) => n.id.startsWith('staff_p3_'));
  assert.equal(p3Staff.length, 3);
  assert.equal(npcState.npcs.some((n) => n.id === 'staff_p3_police'), true);
  assert.equal(npcState.npcs.some((n) => n.id === 'staff_p3_employee'), true);
  assert.equal(npcState.npcs.some((n) => n.id === 'staff_p3_tte'), true);
  assert.equal(npcState.npcs.some((n) => n.id.startsWith('staff_p4_')), false);

  // At 6 tracks, South Glass Terminal BD Police & Porter also deploy
  const sim6 = { ...baseSim, stationLevel: 5, unlockedTracks: 6 };
  const trains6 = createInitialTrainSimulation(1, 6);
  stepNpcSimulation(npcState, sim6, trains6, playerPos, [], 0.05);

  const p4Staff = npcState.npcs.filter((n) => n.id.startsWith('staff_p4_'));
  assert.equal(p4Staff.length, 2);
  assert.equal(npcState.npcs.some((n) => n.id === 'staff_p4_bdpolice'), true);
  assert.equal(npcState.npcs.some((n) => n.id === 'staff_p4_porter'), true);
});

test('findNavPath cache isolates unlockedTracks levels and returns independent mutable copies', () => {
  const lockedP3 = findNavPath('p1_center', 'p3_center', { unlockedTracks: 2 });
  assert.deepEqual(lockedP3, []);

  const pathA = findNavPath('p1_center', 'p3_center', { unlockedTracks: 4 });
  assert.ok(pathA.length >= 3);
  assert.equal(pathA[0], 'p1_center');
  assert.equal(pathA[pathA.length - 1], 'p3_center');

  // Mutate returned copy and confirm cached route remains intact
  const originalLen = pathA.length;
  pathA.push('corrupted_node');
  const pathB = findNavPath('p1_center', 'p3_center', { unlockedTracks: 4 });
  assert.equal(pathB.length, originalLen);
  assert.equal(pathB[pathB.length - 1], 'p3_center');
});
