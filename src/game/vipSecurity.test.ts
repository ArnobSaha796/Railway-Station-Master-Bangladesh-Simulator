import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialMultiStationState } from './chapters';
import {
  createInitialNpcSimulation,
  getPlatformTrackForPosition,
  stepNpcSimulation,
} from './npcManager';
import { getNavNode } from './npcNav';
import { createDefaultAudioSettings, createInitialSimState } from './rules';
import {
  createInitialOperationsState,
  orderClearVipPlatform,
  resolveOpsEmergency,
  stepStationOperations,
  syncVipPlatformOccupancy,
  triggerEmergencyVipSecurity,
  verifyVipCredential,
} from './stationOperations';
import { parseMultiShiftData, serializeMultiShiftData } from './storage';
import { createInitialTrainSimulation } from './trainManager';

test('triggerEmergencyVipSecurity rotates flow patterns, locks platforms, and issues 3 credentials', () => {
  const sim0 = createInitialSimState(1);
  const ops0 = createInitialOperationsState(1);

  const r1 = triggerEmergencyVipSecurity(sim0, ops0, 10_000);
  assert.equal(r1.accepted, true);
  assert.ok(r1.protocol);
  assert.equal(r1.protocol.active, true);
  assert.equal(r1.protocol.flowPattern, 'diplomatic_evac_corridor');
  assert.deepEqual(r1.protocol.lockedPlatforms, [1]);
  assert.equal(r1.protocol.credentials.length, 3);
  assert.equal(r1.protocol.credentials.filter((c) => c.authentic).length, 2);
  assert.equal(r1.protocol.credentials.filter((c) => !c.authentic).length, 1);

  // Triggering a second time while active is rejected cleanly
  const dup = triggerEmergencyVipSecurity(r1.simState, r1.opsState, 10_500);
  assert.equal(dup.accepted, false);

  // Next sequential trigger (after prior resolved) rotates to red_carpet_concourse_sweep
  const opsNext = {
    ...ops0,
    recentResolvedOps: [r1.opsState.activeOpsEvents[0]],
  };
  const r2 = triggerEmergencyVipSecurity(sim0, opsNext, 20_000);
  assert.equal(r2.accepted, true);
  assert.equal(r2.protocol?.flowPattern, 'red_carpet_concourse_sweep');
  assert.deepEqual(r2.protocol?.lockedPlatforms, [2]);

  // Split platform lockdown with 6 tracks locks platforms 1 and 4
  const sim6 = { ...sim0, unlockedTracks: 6 };
  const r3 = triggerEmergencyVipSecurity(sim6, ops0, 30_000, 'split_platform_lockdown');
  assert.equal(r3.accepted, true);
  assert.deepEqual(r3.protocol?.lockedPlatforms, [1, 4]);
});

test('Control Room platform clear and credential verification require both steps before rewarding', () => {
  const sim0 = createInitialSimState(1);
  const ops0 = createInitialOperationsState(1);
  const trig = triggerEmergencyVipSecurity(sim0, ops0, 5_000, 'diplomatic_evac_corridor');
  assert.equal(trig.accepted, true);
  const proto = trig.opsState.vipProtocol!;

  // Generic resolveOpsEmergency (manual or staff auto) cannot bypass interactive VIP Protocol
  const cheatResolve = resolveOpsEmergency(
    trig.simState,
    trig.opsState,
    proto.eventId,
    5_500,
    true,
  );
  assert.equal(cheatResolve.accepted, false);

  // Sync shows 3 civilians on Platform 1 initially
  let syncRes = syncVipPlatformOccupancy(trig.simState, trig.opsState, { 1: 3 }, 6_000);
  assert.equal(syncRes.completed, false);
  assert.equal(syncRes.opsState.vipProtocol?.passengersOnLockedPlatforms, 3);

  // Player clicks Clear Platform P1 in Control Room while civilians are still walking out
  const clrOrder = orderClearVipPlatform(syncRes.simState, syncRes.opsState, 1, 6_500);
  assert.equal(clrOrder.accepted, true);
  assert.equal(clrOrder.completed, false);
  assert.deepEqual(clrOrder.opsState.vipProtocol?.sweepOrderedPlatforms, [1]);
  assert.deepEqual(clrOrder.opsState.vipProtocol?.clearedPlatforms, []);

  // Verify credentials: wrong action on forged badge triggers security warning & does not mark verified
  const authenticCreds = proto.credentials.filter((c) => c.authentic);
  const forgedCred = proto.credentials.find((c) => !c.authentic)!;

  const wrongTry = verifyVipCredential(
    clrOrder.simState,
    clrOrder.opsState,
    forgedCred.id,
    'verify',
    7_000,
  );
  assert.equal(wrongTry.accepted, false);
  assert.equal(wrongTry.correctDecision, false);
  assert.ok(wrongTry.simState.securityRating < clrOrder.simState.securityRating);

  // Correctly reject forged badge -> increments crimesPrevented
  const rejOk = verifyVipCredential(
    wrongTry.simState,
    wrongTry.opsState,
    forgedCred.id,
    'reject',
    7_500,
  );
  assert.equal(rejOk.accepted, true);
  assert.equal(rejOk.correctDecision, true);
  assert.equal(rejOk.completed, false);
  assert.equal(rejOk.simState.crimesPrevented, wrongTry.simState.crimesPrevented + 1);

  // Verify the two authentic delegates -> still not completed until P1 count drops to 0!
  const v1 = verifyVipCredential(rejOk.simState, rejOk.opsState, authenticCreds[0].id, 'verify', 8_000);
  const v2 = verifyVipCredential(v1.simState, v1.opsState, authenticCreds[1].id, 'verify', 8_500);
  assert.equal(v2.accepted, true);
  assert.equal(v2.completed, false);
  assert.equal(v2.opsState.vipProtocol?.active, true);

  // Civilians finish evacuating Platform 1 -> count reaches 0 -> VIP Protocol auto-finalizes!
  syncRes = syncVipPlatformOccupancy(v2.simState, v2.opsState, { 1: 0 }, 9_000);
  assert.equal(syncRes.completed, true);
  assert.deepEqual(syncRes.newlyClearedPlatforms, [1]);
  assert.equal(syncRes.opsState.vipProtocol?.active, false);
  assert.equal(syncRes.opsState.vipProtocol?.completed, true);
  assert.equal(syncRes.simState.emergenciesResolved, sim0.emergenciesResolved + 1);
  assert.ok(syncRes.simState.money >= sim0.money + 240);
  assert.ok(syncRes.simState.reputation >= sim0.reputation + 6);
});

test('stepNpcSimulation reroutes civilians off locked platforms and tracks vipPlatformCounts', () => {
  const sim = createInitialSimState(1);
  const trains = createInitialTrainSimulation(1);
  const ops = createInitialOperationsState(1);
  const trig = triggerEmergencyVipSecurity(sim, ops, 1_000, 'diplomatic_evac_corridor');
  const ordered = orderClearVipPlatform(trig.simState, trig.opsState, 1, 1_100).opsState.vipProtocol!;

  const npcState = createInitialNpcSimulation();
  // Place a regular mobile passenger squarely on Platform 1 (z = -7.2) in waiting/queuing state
  const targetNpc = npcState.npcs.find(
    (n) => n.role === 'passenger' && !n.immovable,
  )!;
  targetNpc.x = 0;
  targetNpc.y = 0.65;
  targetNpc.z = -7.2;
  targetNpc.waitTimer = 10;
  targetNpc.memory.boardingStage = 'queuing';
  targetNpc.route = [];
  targetNpc.routeIdx = 0;
  targetNpc.targetNodeId = 'p1_center';

  assert.equal(getPlatformTrackForPosition(targetNpc.z, targetNpc.y), 1);

  const stepRes = stepNpcSimulation(
    npcState,
    sim,
    trains,
    { x: -12, y: 0.65, z: -7.2 },
    [],
    0.1,
    ordered,
  );

  // Returned count must reflect civilians remaining on Platform 1
  assert.ok((stepRes.vipPlatformCounts[1] ?? 0) >= 1);

  // Re-routed NPC should have canceled wait/boarding and acquired an evacuation path off Platform 1
  const updatedNpc = stepRes.npcState.npcs.find((n) => n.id === targetNpc.id)!;
  assert.equal(updatedNpc.memory.boardingStage, 'idle');
  assert.equal(updatedNpc.waitTimer, 0);
  assert.ok(updatedNpc.route.length > 0);
  const finalDestNode = getNavNode(updatedNpc.route[updatedNpc.route.length - 1]);
  assert.ok(finalDestNode);
  assert.notEqual(getPlatformTrackForPosition(finalDestNode.z, finalDestNode.y), 1);
});

test('VIP Protocol timeout fails gracefully and save/load roundtrip preserves active protocol', () => {
  const multi = createInitialMultiStationState();
  const trig = triggerEmergencyVipSecurity(
    multi.chapter1.simState,
    multi.chapter1.opsState,
    2_000,
    'red_carpet_concourse_sweep',
  );

  // Save/load roundtrip check
  const mutatedMulti = {
    ...multi,
    chapter1: {
      ...multi.chapter1,
      simState: trig.simState,
      opsState: trig.opsState,
    },
  };
  const serialized = serializeMultiShiftData({
    version: 2,
    savedAt: Date.now(),
    multiState: mutatedMulti,
    cameraMode: 'third-person',
    weather: 'clear',
    audioSettings: createDefaultAudioSettings(),
  });
  const parsed = parseMultiShiftData(serialized);
  assert.ok(parsed);
  assert.equal(parsed.multiState.chapter1.opsState.vipProtocol?.codename, trig.protocol?.codename);
  assert.deepEqual(parsed.multiState.chapter1.opsState.vipProtocol?.lockedPlatforms, [2]);

  // Step past full 110s timer (safeDt clamps each tick to 2s) -> protocol fails cleanly once
  let curSim = trig.simState;
  let curOps: typeof trig.opsState = {
    ...trig.opsState,
    staff: [],
    activeOpsEvents: trig.opsState.activeOpsEvents.filter((e) => e.id === trig.protocol?.eventId),
    nextOpsSpawnSec: 999,
  };
  for (let tick = 0; tick < 60; tick++) {
    const res = stepStationOperations(curSim, { ...curOps, nextOpsSpawnSec: 999 }, 2, 3_000 + tick * 2_000);
    curSim = res.simState;
    curOps = res.opsState;
  }
  assert.equal(curOps.vipProtocol?.active, false);
  assert.equal(curOps.vipProtocol?.failed, true);
  assert.equal(curSim.emergenciesFailed, trig.simState.emergenciesFailed + 1);
  assert.ok(curSim.reputation < trig.simState.reputation);
  assert.ok(curSim.securityRating < trig.simState.securityRating);
});
