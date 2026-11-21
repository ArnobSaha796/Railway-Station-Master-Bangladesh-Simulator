import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialMultiStationState } from './chapters';
import {
  applyVipPassengerDensityAdjustment,
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
  toggleVipPlatformLock,
  triggerEmergencyVipSecurity,
  verifySecurityClearance,
  verifyVipCredential,
} from './stationOperations';
import { parseMultiShiftData, serializeMultiShiftData } from './storage';
import {
  assignTrainPlatform,
  createInitialTrainSimulation,
  divertTrainToPlatform,
  stepTrainSimulation,
} from './trainManager';

test('triggerEmergencyVipSecurity rotates flow patterns, sets density targets, and issues 3 credentials', () => {
  const sim0 = createInitialSimState(1);
  const ops0 = createInitialOperationsState(1);

  const r1 = triggerEmergencyVipSecurity(sim0, ops0, 10_000);
  assert.equal(r1.accepted, true);
  assert.ok(r1.protocol);
  assert.equal(r1.protocol.active, true);
  assert.equal(r1.protocol.flowPattern, 'diplomatic_evac_corridor');
  assert.deepEqual(r1.protocol.designatedPlatforms, [1]);
  assert.deepEqual(r1.protocol.lockedPlatforms, []);
  assert.equal(r1.protocol.platformDensityTargets[1], 'cleared');
  assert.equal(r1.protocol.platformDensityTargets[2], 'elevated');
  assert.equal(r1.protocol.securityClearanceVerified, false);
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
  assert.deepEqual(r2.protocol?.designatedPlatforms, [2]);
  assert.equal(r2.protocol?.platformDensityTargets[2], 'cleared');
  assert.equal(r2.protocol?.platformDensityTargets[1], 'elevated');

  // Split platform lockdown with 6 tracks designates platforms 1 and 4
  const sim6 = { ...sim0, unlockedTracks: 6 };
  const r3 = triggerEmergencyVipSecurity(sim6, ops0, 30_000, 'split_platform_lockdown');
  assert.equal(r3.accepted, true);
  assert.deepEqual(r3.protocol?.designatedPlatforms, [1, 4]);
});

test('Securing a platform in TrainDashboard blocks regular train assignments, diversions, and incoming arrivals', () => {
  const sim0 = createInitialSimState(1);
  const trains0 = createInitialTrainSimulation(1);
  const ops0 = createInitialOperationsState(1);
  const trig = triggerEmergencyVipSecurity(sim0, ops0, 5_000, 'red_carpet_concourse_sweep');
  assert.equal(trig.accepted, true);

  // Player clicks 'Secure' on Platform 2
  const secRes = toggleVipPlatformLock(trig.simState, trig.opsState, 2, 5_200);
  assert.equal(secRes.accepted, true);
  assert.equal(secRes.locked, true);
  assert.deepEqual(secRes.opsState.vipProtocol?.lockedPlatforms, [2]);

  const lockedPlats = secRes.opsState.vipProtocol!.lockedPlatforms;
  const commuter = trains0.trains.find((t) => t.status === 'Approaching')!;

  // Attempting regular platform assignment to locked Platform 2 fails
  const blockedAssign = assignTrainPlatform(
    secRes.simState,
    trains0,
    commuter.id,
    2,
    5_300,
    lockedPlats,
  );
  assert.equal(blockedAssign.accepted, false);
  assert.ok(blockedAssign.trainState.alerts.some((a) => a.id === 'viplock_2'));

  // Attempting emergency diversion to locked Platform 2 also fails
  const blockedDivert = divertTrainToPlatform(
    secRes.simState,
    trains0,
    commuter.id,
    2,
    5_400,
    lockedPlats,
  );
  assert.equal(blockedDivert.accepted, false);

  // If a train was already assigned to Platform 2 before locking, stepTrainSimulation holds it outside the station
  const preAssigned = assignTrainPlatform(sim0, trains0, commuter.id, 2, 4_000);
  assert.equal(preAssigned.accepted, true);
  const heldTrain = {
    ...preAssigned.trainState,
    trains: preAssigned.trainState.trains.map((t) =>
      t.id === commuter.id ? { ...t, status: 'Arriving' as const, x: -50 * t.direction } : t,
    ),
  };
  const stepped = stepTrainSimulation(
    { ...secRes.simState, track2Signal: 'green', trackSignals: { ...secRes.simState.trackSignals, 2: 'green' } },
    heldTrain,
    0.2,
    5_500,
    lockedPlats,
  );
  const updatedCommuter = stepped.trainState.trains.find((t) => t.id === commuter.id)!;
  assert.equal(updatedCommuter.holdingReason, 'VIP Lock: Platform 2 Secured');
});

test('VIP Security requires Secure + Clear + 3 Credentials + Verify Security Clearance before releasing locks', () => {
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

  // Trying Verify Security Clearance before securing/clearing/verifying credentials is blocked cleanly
  const earlyClearance = verifySecurityClearance(trig.simState, trig.opsState, 5_700);
  assert.equal(earlyClearance.accepted, false);
  assert.equal(earlyClearance.completed, false);

  // Secure Platform 1
  const securedRes = toggleVipPlatformLock(trig.simState, trig.opsState, 1, 5_800);
  assert.equal(securedRes.accepted, true);

  // Sync shows 3 civilians on Platform 1 initially
  let syncRes = syncVipPlatformOccupancy(securedRes.simState, securedRes.opsState, { 1: 3 }, 6_000);
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

  // Verify the two authentic delegates -> still not completed!
  const v1 = verifyVipCredential(rejOk.simState, rejOk.opsState, authenticCreds[0].id, 'verify', 8_000);
  const v2 = verifyVipCredential(v1.simState, v1.opsState, authenticCreds[1].id, 'verify', 8_500);
  assert.equal(v2.accepted, true);
  assert.equal(v2.completed, false);
  assert.equal(v2.opsState.vipProtocol?.active, true);

  // Civilians finish evacuating Platform 1 -> count reaches 0 -> still waits for Verify Security Clearance!
  syncRes = syncVipPlatformOccupancy(v2.simState, v2.opsState, { 1: 0 }, 9_000);
  assert.equal(syncRes.completed, false);
  assert.deepEqual(syncRes.newlyClearedPlatforms, [1]);
  assert.equal(syncRes.opsState.vipProtocol?.active, true);

  // Control Room Verify Security Clearance step finalizes mission & releases locks
  const finalRes = verifySecurityClearance(syncRes.simState, syncRes.opsState, 9_500);
  assert.equal(finalRes.accepted, true);
  assert.equal(finalRes.completed, true);
  assert.equal(finalRes.opsState.vipProtocol?.active, false);
  assert.equal(finalRes.opsState.vipProtocol?.completed, true);
  assert.equal(finalRes.opsState.vipProtocol?.securityClearanceVerified, true);
  assert.deepEqual(finalRes.opsState.vipProtocol?.lockedPlatforms, []);
  assert.equal(finalRes.simState.emergenciesResolved, sim0.emergenciesResolved + 1);
  assert.ok(finalRes.simState.money >= sim0.money + 240);
  assert.ok(finalRes.simState.reputation >= sim0.reputation + 6);
});

test('applyVipPassengerDensityAdjustment and stepNpcSimulation adjust platform passenger density and track counts', () => {
  const sim = createInitialSimState(1);
  const trains = createInitialTrainSimulation(1);
  const ops = createInitialOperationsState(1);
  const trig = triggerEmergencyVipSecurity(sim, ops, 1_000, 'diplomatic_evac_corridor');
  const proto = trig.protocol!;

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

  const densityRes = applyVipPassengerDensityAdjustment(npcState, proto, sim.unlockedTracks);
  assert.ok(densityRes.evacuatedCount >= 1);
  assert.equal(targetNpc.memory.boardingStage, 'idle');
  assert.equal(targetNpc.waitTimer, 0);
  assert.ok(targetNpc.route.length > 0);
  const finalDestNode = getNavNode(targetNpc.route[targetNpc.route.length - 1]);
  assert.ok(finalDestNode);
  assert.notEqual(getPlatformTrackForPosition(finalDestNode.z, finalDestNode.y), 1);

  const ordered = orderClearVipPlatform(trig.simState, trig.opsState, 1, 1_100).opsState.vipProtocol!;
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
});

test('VIP Protocol timeout fails gracefully and save/load roundtrip preserves active protocol', () => {
  const multi = createInitialMultiStationState();
  const trig = triggerEmergencyVipSecurity(
    multi.chapter1.simState,
    multi.chapter1.opsState,
    2_000,
    'red_carpet_concourse_sweep',
  );
  const secured = toggleVipPlatformLock(trig.simState, trig.opsState, 2, 2_200);

  // Save/load roundtrip check
  const mutatedMulti = {
    ...multi,
    chapter1: {
      ...multi.chapter1,
      simState: secured.simState,
      opsState: secured.opsState,
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
  assert.deepEqual(parsed.multiState.chapter1.opsState.vipProtocol?.designatedPlatforms, [2]);
  assert.deepEqual(parsed.multiState.chapter1.opsState.vipProtocol?.lockedPlatforms, [2]);
  assert.equal(parsed.multiState.chapter1.opsState.vipProtocol?.securityClearanceVerified, false);

  // Step past full 110s timer (safeDt clamps each tick to 2s) -> protocol fails cleanly once
  let curSim = secured.simState;
  let curOps: typeof secured.opsState = {
    ...secured.opsState,
    staff: [],
    activeOpsEvents: secured.opsState.activeOpsEvents.filter((e) => e.id === trig.protocol?.eventId),
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

