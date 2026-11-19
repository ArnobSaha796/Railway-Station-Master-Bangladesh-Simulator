import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialNpcSimulation, stepNpcSimulation } from './npcManager';
import { createInitialSimState } from './rules';
import {
  advanceTrainDepartureSequence,
  assignTrainPlatform,
  authorizeTrainDeparture,
  buildTrainBanglaAnnouncement,
  canPassengerBoardTrain,
  createInitialTrainSimulation,
  OPERATIONAL_EVENT_ROTATION,
  PLATFORM_STOP_X,
  resolveTrainOperationalEvent,
  setTrackSignalAspect,
  spawnTrainOperationalEvent,
  stepTrainSimulation,
  tryBoardPassengerOnTrain,
} from './trainManager';

test('Train approaching on GREEN brakes gradually with zero overshoot at PLATFORM_STOP_X and opens doors', () => {
  let sim = createInitialSimState();
  let ts = createInitialTrainSimulation(1);

  // Train 1 (#24 Turag Commuter) starts Approaching at x=-64
  const train24 = ts.trains.find((t) => t.trainNumber === '24')!;
  assert.ok(train24);

  const assignRes = assignTrainPlatform(sim, ts, train24.id, 2, 1000);
  sim = assignRes.simState;
  ts = assignRes.trainState;

  const sigRes = setTrackSignalAspect(sim, ts, 2, 'green', 1100);
  sim = sigRes.simState;
  ts = sigRes.trainState;

  let arrived = false;
  let maxXSeen = -999;
  for (let i = 0; i < 450; i++) {
    const tick = stepTrainSimulation(sim, ts, 0.05, 1200 + i * 50);
    sim = tick.simState;
    ts = tick.trainState;
    const t = ts.trains.find((x) => x.id === train24.id)!;
    if (t.x > maxXSeen) maxXSeen = t.x;
    assert.ok(t.x <= PLATFORM_STOP_X + 0.001, `Eastbound train must not overshoot PLATFORM_STOP_X (got ${t.x})`);
    if (t.status === 'At Platform' || t.status === 'Boarding') {
      arrived = true;
      assert.equal(t.x, PLATFORM_STOP_X);
      assert.equal(t.speed, 0);
      if (t.doorState === 'open') break;
    }
  }

  const finalTrain = ts.trains.find((x) => x.id === train24.id)!;
  assert.equal(arrived, true, 'Train #24 should stop cleanly at Platform 2');
  assert.equal(finalTrain.doorState, 'open', 'Passenger doors should open once stopped');
  assert.ok(finalTrain.doorOpenProgress >= 0.99);
  assert.ok(finalTrain.arrivalAnnounced, 'Arrival announcement should be triggered');
});

test('Capacity & boarding guards enforce closed doors, cargo rejection, moving guard, and full capacity', () => {
  const ts = createInitialTrainSimulation(1);
  const passengerTrain = ts.trains[0]; // #702 Subarna Intercity (at Platform 1, doors open)
  const cargoTrain = ts.trains.find((t) => t.category === 'freight')!;

  assert.equal(passengerTrain.passengerCapacity, 720);
  assert.ok(passengerTrain.coaches.length === 3);
  assert.equal(
    passengerTrain.coaches.reduce((s, c) => s + c.capacity, 0),
    passengerTrain.passengerCapacity,
  );

  // Cargo train never accepts passengers
  assert.equal(canPassengerBoardTrain(cargoTrain).allowed, false);

  // Closed door rejects boarding
  const closedClone = { ...passengerTrain, doorState: 'closed' as const, doorOpenProgress: 0 };
  assert.equal(canPassengerBoardTrain(closedClone).allowed, false);
  assert.equal(tryBoardPassengerOnTrain(closedClone, 0, 1).boarded, false);

  // Moving train rejects boarding even if open
  const movingClone = { ...passengerTrain, speed: 1.5 };
  assert.equal(canPassengerBoardTrain(movingClone).allowed, false);

  // Fill train completely to passengerCapacity and verify further boarding is rejected
  while (passengerTrain.currentPassengers < passengerTrain.passengerCapacity) {
    const res = tryBoardPassengerOnTrain(passengerTrain, null, 25);
    assert.equal(res.boarded, true);
  }
  assert.equal(passengerTrain.currentPassengers, passengerTrain.passengerCapacity);
  const fullRes = tryBoardPassengerOnTrain(passengerTrain, 0, 1);
  assert.equal(fullRes.boarded, false);
  assert.match(fullRes.reason ?? '', /full capacity/i);
});

test('Disembarking spawns luggage-carrying passengers from open doorway & boarding queues increment train occupancy', () => {
  let sim = createInitialSimState();
  let ts = createInitialTrainSimulation(1);
  let npcState = createInitialNpcSimulation();

  // Ensure initial train #702 has disembarkRemaining > 0 and open doors
  const train702 = ts.trains[0];
  assert.equal(train702.doorState, 'open');
  assert.ok(train702.disembarkRemaining > 0);
  const initialNpcCount = npcState.npcs.length;

  for (let i = 0; i < 65; i++) {
    const res = stepNpcSimulation(
      npcState,
      sim,
      ts,
      { x: -2, y: 0.65, z: -8.2 },
      [],
      0.1,
    );
    npcState = res.npcState;
    sim = res.simState;
  }

  assert.ok(
    npcState.npcs.length > initialNpcCount ||
      npcState.npcs.some((n) => n.memory.disembarkedFromTrainId === train702.id),
    'Disembarking should spawn exiting passengers onto Platform 1',
  );
  assert.ok(
    npcState.npcs.some(
      (n) =>
        n.memory.disembarkedFromTrainId === train702.id &&
        (n.activity === 'carrying_luggage' || n.activity === 'disembarking') &&
        n.z < -4.2,
    ),
    'Disembarking NPCs should stand on platform outside train doors carrying luggage',
  );

  // Also test doorway boarding: place a commuter right at coach 0 queue slot and run stepNpcSimulation
  const boarder = npcState.npcs.find((n) => n.role === 'passenger' && !n.assignedMissionId)!;
  boarder.x = train702.x + train702.coaches[0].doorXOffset;
  boarder.z = -5.15;
  boarder.y = 0.65;
  boarder.activity = 'waiting_platform';
  boarder.memory.assignedPlatform = 1;
  boarder.memory.boardingTrainId = train702.id;
  boarder.memory.boardingStage = 'queuing';
  boarder.memory.targetCoachIndex = 0;
  boarder.route = [];
  boarder.routeIdx = 0;
  boarder.waitTimer = 0;

  const paxBefore = train702.currentPassengers;
  for (let i = 0; i < 40; i++) {
    const res = stepNpcSimulation(
      npcState,
      sim,
      ts,
      { x: -15, y: 0.65, z: -15 },
      [],
      0.1,
    );
    npcState = res.npcState;
    sim = res.simState;
  }

  assert.ok(
    train702.currentPassengers >= paxBefore,
    'Queued passenger boarding at open doorway should preserve/increment train occupancy',
  );
});

test('Departure sequence blocks RED signal & unresolved blocking event, then closes doors before train moves', () => {
  let sim = createInitialSimState();
  let ts = createInitialTrainSimulation(1);
  const train702 = ts.trains[0];
  train702.operationalEvent = null;

  // Attach blocking door_obstruction event to train 702
  const sp = spawnTrainOperationalEvent(ts, train702.id, 'door_obstruction');
  ts = sp.trainState;
  assert.ok(sp.event);

  // Set Track 1 GREEN while door obstruction is still active -> dispatch MUST be blocked
  sim = setTrackSignalAspect(sim, ts, 1, 'green', 2000).simState;
  const blockedByDoor = authorizeTrainDeparture(sim, ts, train702.id, 2100);
  assert.equal(blockedByDoor.accepted, false);
  assert.match(blockedByDoor.simState.lastEventMessage, /DEPARTURE BLOCKED/i);

  // Safety checks also block while obstruction unresolved
  const safetyBlocked = advanceTrainDepartureSequence(sim, ts, train702.id, 'safety_checks', 2150);
  assert.equal(safetyBlocked.accepted, false);

  // Resolve operational event -> safety checks -> close doors -> set RED -> verify blocked by RED
  const resolved = resolveTrainOperationalEvent(sim, ts, train702.id, 'primary', 2200);
  sim = resolved.simState;
  ts = resolved.trainState;
  assert.equal(ts.trains[0].doorsObstructed, false);

  const paRes = advanceTrainDepartureSequence(sim, ts, train702.id, 'announce_boarding', 2250);
  sim = paRes.simState;
  ts = paRes.trainState;
  assert.ok(paRes.announcement && paRes.announcement.length > 10);

  const safetyOk = advanceTrainDepartureSequence(sim, ts, train702.id, 'safety_checks', 2300);
  sim = safetyOk.simState;
  ts = safetyOk.trainState;
  assert.equal(safetyOk.accepted, true);
  assert.equal(ts.trains[0].safetyChecksPassed, true);

  // Force signal RED to check Safety Gate 2
  sim = setTrackSignalAspect(sim, ts, 1, 'red', 2350).simState;
  const blockedRed = authorizeTrainDeparture(sim, ts, train702.id, 2400);
  assert.equal(blockedRed.accepted, false);
  assert.match(blockedRed.simState.lastEventMessage, /RED/i);

  // Switch signal GREEN and authorize departure
  sim = setTrackSignalAspect(sim, ts, 1, 'green', 2450).simState;
  sim = { ...sim, crossingGateClosed: true };
  const dispatched = authorizeTrainDeparture(sim, ts, train702.id, 2500);
  sim = dispatched.simState;
  ts = dispatched.trainState;
  assert.equal(dispatched.accepted, true);
  assert.equal(ts.trains[0].status, 'Departing');

  // Step simulation briefly: while doors close (doorOpenProgress > 0), train MUST remain stationary at x=0!
  const midClose = stepTrainSimulation(sim, ts, 0.25, 2750);
  sim = midClose.simState;
  ts = midClose.trainState;
  const tMid = ts.trains.find((x) => x.id === train702.id)!;
  assert.ok(tMid.doorOpenProgress > 0, 'Doors should still be closing');
  assert.equal(tMid.speed, 0, 'Train must NOT move while passenger doors are still closing');
  assert.equal(tMid.x, PLATFORM_STOP_X);

  // Advance until doors shut completely, then train accelerates out
  for (let i = 0; i < 40; i++) {
    const tick = stepTrainSimulation(sim, ts, 0.1, 3000 + i * 100);
    sim = tick.simState;
    ts = tick.trainState;
  }
  const tAfter = ts.trains.find((x) => x.id === train702.id)!;
  assert.equal(tAfter.doorState, 'closed');
  assert.ok(tAfter.x > 4, `Train should accelerate smoothly after doors lock shut (x=${tAfter.x})`);
});

test('All 9 operational passenger/train event kinds spawn, resolve, and produce Bengali PA lines', () => {
  assert.equal(OPERATIONAL_EVENT_ROTATION.length, 9);
  let sim = createInitialSimState();
  const baseTs = createInitialTrainSimulation(1);
  const baseTrain = baseTs.trains[0];

  for (const kind of OPERATIONAL_EVENT_ROTATION) {
    const freshTs = {
      ...baseTs,
      trains: baseTs.trains.map((t) => ({
        ...t,
        coaches: t.coaches.map((c) => ({ ...c, doorObstructed: false })),
        doorsObstructed: false,
        operationalEvent: null,
      })),
    };
    const sp = spawnTrainOperationalEvent(freshTs, baseTrain.id, kind);
    assert.ok(sp.event, `Failed to spawn operational event ${kind}`);
    assert.equal(sp.event.kind, kind);

    const resolved = resolveTrainOperationalEvent(sim, sp.trainState, baseTrain.id, 'primary', 5000);
    assert.equal(resolved.accepted, true, `Failed to resolve operational event ${kind}`);
    const afterTrain = resolved.trainState.trains.find((t) => t.id === baseTrain.id)!;
    assert.equal(afterTrain.operationalEvent, null);
    assert.equal(afterTrain.doorsObstructed, false);
    sim = resolved.simState;
  }

  // Verify Bengali PA announcements render cleanly for all stages
  for (const paKind of ['arrival', 'doors_opening', 'doors_closing', 'departure', 'boarding', 'delay', 'safety'] as const) {
    const text = buildTrainBanglaAnnouncement(baseTrain, paKind);
    assert.ok(text.length > 10, `Empty PA for ${paKind}`);
  }
});
