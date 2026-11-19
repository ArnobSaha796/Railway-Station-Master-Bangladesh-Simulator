import test from 'node:test';
import assert from 'node:assert/strict';
import { createInitialSimState } from './rules';
import {
  assignTrainPlatform,
  authorizeTrainDeparture,
  buildTrainBanglaAnnouncement,
  createInitialTrainSimulation,
  generateDailySchedule,
  setTrackSignalAspect,
  stepTrainSimulation,
  toggleEmergencyStopTrain,
  toggleSwitchPosition,
} from './trainManager';

test('daily schedule includes all 7 Bangladesh train types and varies across days', () => {
  const day1 = generateDailySchedule(1);
  const day2 = generateDailySchedule(2);
  const categories = new Set(day1.map((t) => t.category));

  assert.equal(categories.has('local'), true);
  assert.equal(categories.has('intercity'), true);
  assert.equal(categories.has('mail'), true);
  assert.equal(categories.has('commuter'), true);
  assert.equal(categories.has('freight'), true);
  assert.equal(categories.has('container'), true);
  assert.equal(categories.has('international'), true);

  assert.notEqual(day1[0].id, day2[0].id);
  assert.notEqual(day1[0].name, day2[0].name);
});

test('platform assignment prevents double-booking occupied platform and accepts free platform', () => {
  const sim = createInitialSimState();
  const trainState = createInitialTrainSimulation(1);

  // Train 0 (Subarna Intercity) is already Boarding on Platform 1; Train 1 (Turag Commuter) is Approaching unassigned
  const approaching = trainState.trains[1];
  assert.equal(approaching.status, 'Approaching');
  assert.equal(approaching.assignedPlatform, null);

  // Attempting to assign Turag Commuter to occupied Platform 1 must be rejected with penalty
  const conflictRes = assignTrainPlatform(sim, trainState, approaching.id, 1, 1000);
  assert.equal(conflictRes.accepted, false);
  assert.ok(conflictRes.simState.reputation < sim.reputation);

  // Assigning Turag Commuter to free Platform 2 succeeds and generates Bangla announcement
  const validRes = assignTrainPlatform(sim, trainState, approaching.id, 2, 2000);
  assert.equal(validRes.accepted, true);
  const updatedApproaching = validRes.trainState.trains.find((t) => t.id === approaching.id)!;
  assert.equal(updatedApproaching.assignedPlatform, 2);
  assert.equal(updatedApproaching.z, 3.0);
  assert.ok(validRes.announcement && validRes.announcement.includes('২ নম্বর প্ল্যাটফর্মে'));
});

test('collision prevention holds approaching train outside RED signal until signal turns YELLOW or GREEN', () => {
  let sim = createInitialSimState();
  let trainState = createInitialTrainSimulation(1);
  const commuter = trainState.trains[1];

  // Assign commuter to Platform 2, keep Track 2 Signal RED
  const assigned = assignTrainPlatform(sim, trainState, commuter.id, 2, 1000);
  sim = assigned.simState;
  trainState = assigned.trainState;

  for (let i = 0; i < 120; i++) {
    const step = stepTrainSimulation(sim, trainState, 0.1, 1000 + i * 100);
    sim = step.simState;
    trainState = step.trainState;
  }

  const heldCommuter = trainState.trains.find((t) => t.id === commuter.id)!;
  assert.ok(heldCommuter.x < -34, `Expected train to hold outside throat, got x=${heldCommuter.x}`);
  assert.equal(heldCommuter.speed, 0);

  // Set Track 2 signal to YELLOW -> train enters cautiously and stops cleanly at Platform 2 (x = 0)
  const sigRes = setTrackSignalAspect(sim, trainState, 2, 'yellow', 20000);
  sim = sigRes.simState;
  trainState = sigRes.trainState;
  assert.equal(sim.track2Signal, 'yellow');

  for (let i = 0; i < 180; i++) {
    const step = stepTrainSimulation(sim, trainState, 0.1, 20000 + i * 100);
    sim = step.simState;
    trainState = step.trainState;
  }

  const arrivedCommuter = trainState.trains.find((t) => t.id === commuter.id)!;
  assert.ok(
    arrivedCommuter.status === 'At Platform' || arrivedCommuter.status === 'Boarding',
    `Expected train at platform, got ${arrivedCommuter.status} at x=${arrivedCommuter.x}`,
  );
  assert.equal(arrivedCommuter.x, 0);
});

test('departure requires non-RED signal, rewards safe crossing gate closure, and switch safety checks work', () => {
  let sim = createInitialSimState();
  let trainState = createInitialTrainSimulation(1);
  const p1Train = trainState.trains[0];

  // Blocked when Track 1 signal is RED
  const redDepart = authorizeTrainDeparture(sim, trainState, p1Train.id, 1000);
  assert.equal(redDepart.accepted, false);

  // Close crossing gate and set Track 1 signal to GREEN
  sim = { ...sim, crossingGateClosed: true };
  const sigRes = setTrackSignalAspect(sim, trainState, 1, 'green', 2000);
  sim = sigRes.simState;
  trainState = sigRes.trainState;

  const okDepart = authorizeTrainDeparture(sim, trainState, p1Train.id, 3000);
  assert.equal(okDepart.accepted, true);
  assert.ok(okDepart.simState.money > sim.money);
  assert.equal(okDepart.simState.dispatchesCompleted, 1);

  // Toggle railway switch cleanly when throat is clear
  const switchRes = toggleSwitchPosition(okDepart.simState, okDepart.trainState, 4000);
  assert.equal(switchRes.accepted, true);
  assert.equal(switchRes.trainState.switchPosition, 'crossover');

  // Emergency stop halts moving departing train immediately
  const eStop = toggleEmergencyStopTrain(
    switchRes.simState,
    switchRes.trainState,
    p1Train.id,
    5000,
  );
  assert.equal(eStop.accepted, true);
  const halted = eStop.trainState.trains.find((t) => t.id === p1Train.id)!;
  assert.equal(halted.emergencyStopped, true);
  assert.equal(halted.speed, 0);
});

test('Bangla announcement generator formats arrival, delay, and safety phrases accurately', () => {
  const trainState = createInitialTrainSimulation(1);
  const intercity = trainState.trains[0];
  const padmaMail = trainState.trains[2];

  const arrText = buildTrainBanglaAnnouncement({ ...intercity, assignedPlatform: 2 }, 'arrival');
  assert.ok(arrText.includes('২ নম্বর প্ল্যাটফর্মে আন্তঃনগর ট্রেন প্রবেশ করছে'));

  const delayText = buildTrainBanglaAnnouncement(padmaMail, 'delay');
  assert.ok(delayText.includes('১৫ মিনিট বিলম্বে'));

  const safetyText = buildTrainBanglaAnnouncement(intercity, 'safety');
  assert.ok(safetyText.includes('হলুদ লাইন অতিক্রম করবেন না'));
});

test('continuous day-to-night clock handles midnight rollover and preserves time into next day', () => {
  let sim = { ...createInitialSimState(), gameMinutes: 23 * 60 + 50 };
  let trainState = createInitialTrainSimulation(1);

  // Schedule a train to arrive just after midnight (00:05 AM) and mark all others Departed
  trainState = {
    ...trainState,
    trains: trainState.trains.map((t, idx) =>
      idx === 0
        ? { ...t, status: 'Scheduled', scheduledArrivalMin: 5, delayMinutes: 0, delayAnnounced: false }
        : { ...t, status: 'Departed' },
    ),
  };

  // Advance clock past midnight to 00:02 AM (within 4-min approach window of 00:05 AM)
  sim = { ...sim, gameMinutes: 2 };
  const stepMidnight = stepTrainSimulation(sim, trainState, 0.1, 10000);
  assert.equal(stepMidnight.trainState.trains[0].status, 'Approaching');

  // Once all trains depart at 22:30 (night), rolling over to Day 2 preserves 22:30 instead of snapping to Dawn
  const nightSim = { ...createInitialSimState(), gameMinutes: 22 * 60 + 30 };
  const allDone = {
    ...trainState,
    trains: trainState.trains.map((t) => ({ ...t, status: 'Departed' as const })),
  };
  const nextDayStep = stepTrainSimulation(nightSim, allDone, 0.1, 20000);
  assert.equal(nextDayStep.events.dayAdvancedTo, 2);
  assert.equal(nextDayStep.simState.gameMinutes, 22 * 60 + 30);
});
