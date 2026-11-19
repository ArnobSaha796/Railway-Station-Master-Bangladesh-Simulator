import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildIncidentDialogue,
  buildPassengerQuestionDialogue,
  COLLISION_DIALOGUES_BN,
  pickCollisionDialogue,
  STATION_INCIDENT_SPECS,
} from './npcDialogues';
import {
  computeTargetCrowdSize,
  createInitialNpcSimulation,
  findNearestTalkableNpc,
  openNpcDialogueForAgent,
  resolveNpcDialogueChoice,
  stepNpcSimulation,
} from './npcManager';
import { buildAppearanceForRole } from './npcModels';
import { findNavPath } from './npcNav';
import {
  FOOTBRIDGE_HEIGHT,
  groundHeightAt,
  NPC_ADULT_RADIUS,
  PLAYER_RADIUS,
  resolveNpcPairCollisions,
  resolvePlayerNpcCollisions,
} from './physics';
import { createInitialSimState } from './rules';
import { createInitialTrainSimulation } from './trainManager';
import type { NpcRole } from './types';

test('all 18 NPC categories build distinct stylized appearances', () => {
  const roles: NpcRole[] = [
    'passenger',
    'porter',
    'tea_seller',
    'food_vendor',
    'fruit_seller',
    'newspaper_seller',
    'beggar',
    'railway_employee',
    'ticket_collector',
    'railway_police',
    'bd_police',
    'child',
    'elderly',
    'student',
    'tourist',
    'family',
    'suspicious',
    'pickpocket',
  ];
  assert.equal(roles.length, 18);
  for (let i = 0; i < roles.length; i++) {
    const app = buildAppearanceForRole(roles[i], i + 1);
    assert.equal(app.role, roles[i]);
    assert.ok(app.heightScale > 0.5 && app.heightScale < 1.2);
  }
});

test('50+ unique funny Bengali collision dialogues exist and avoid immediate repeats', () => {
  assert.ok(COLLISION_DIALOGUES_BN.length >= 50, `Expected >= 50 dialogues, got ${COLLISION_DIALOGUES_BN.length}`);
  const uniqueBn = new Set(COLLISION_DIALOGUES_BN.map((d) => d.bn));
  assert.equal(uniqueBn.size, COLLISION_DIALOGUES_BN.length);

  const recent: number[] = [];
  for (let i = 0; i < 15; i++) {
    const picked = pickCollisionDialogue(recent);
    assert.ok(!recent.includes(picked.index));
    assert.ok(picked.line.bn.length > 0 && picked.line.en.length > 0);
    recent.push(picked.index);
  }
});

test('A* pathfinding routes across footbridge when flat track crossing is blocked by a train', () => {
  const safePath = findNavPath('p1_center', 'p2_center', { avoidTrackHazards: true });
  assert.ok(safePath.length > 2);
  assert.ok(safePath.includes('fb_n_top'), 'Expected path to cross via Footover Bridge North');
  assert.ok(safePath.includes('fb_s_top'), 'Expected path to cross via Footover Bridge South');
  assert.ok(!safePath.includes('crossing_mid'), 'Safe path must avoid flat plank crossing');

  const quickPath = findNavPath('p1_cross', 'p2_cross', { avoidTrackHazards: false });
  assert.ok(quickPath.includes('crossing_mid'));
});

test('groundHeightAt supports multi-level Footover Bridge without trapping ground walkers', () => {
  // Ground level under bridge stays at ground/track height when currentY is low
  assert.equal(groundHeightAt(-24, 0, 0), 0);
  // On the elevated Footover Bridge deck when actor has climbed the stairs
  assert.equal(groundHeightAt(-24, 0, 4.5), FOOTBRIDGE_HEIGHT);
});

test('player-NPC capsule collisions block pass-through from all 4 cardinal directions', () => {
  const directions: [number, number, string][] = [
    [1, 0, 'right (+X)'],
    [-1, 0, 'left (-X)'],
    [0, 1, 'front (+Z)'],
    [0, -1, 'back (-Z)'],
  ];

  for (const [dx, dz, label] of directions) {
    const npc = { id: 'npc_1', x: 0, y: 0.65, z: -8, radius: NPC_ADULT_RADIUS, immovable: false };
    // Player steps deeply inside NPC capsule from each direction
    const res = resolvePlayerNpcCollisions(
      { x: dx * 0.15, y: 0.65, z: -8 + dz * 0.15, radius: PLAYER_RADIUS },
      [npc],
      [],
    );
    const finalDist = Math.hypot(res.playerX - npc.x, res.playerZ - npc.z);
    assert.ok(
      finalDist >= PLAYER_RADIUS + NPC_ADULT_RADIUS - 1e-4,
      `Failed separation from ${label}: dist=${finalDist}`,
    );
    assert.equal(res.hits.length, 1);
  }
});

test('NPC pairwise capsule collisions separate overlapping crowds cleanly', () => {
  const a = { id: 'a', x: 0, y: 0.65, z: -7, radius: NPC_ADULT_RADIUS, immovable: false };
  const b = { id: 'b', x: 0.1, y: 0.65, z: -7, radius: NPC_ADULT_RADIUS, immovable: false };
  resolveNpcPairCollisions([a, b], []);
  const dist = Math.hypot(a.x - b.x, a.z - b.z);
  assert.ok(dist >= NPC_ADULT_RADIUS * 2 - 1e-4);
});

test('stepNpcSimulation emits Bengali collision dialogue when player bumps into NPC', () => {
  const npcState = createInitialNpcSimulation();
  const simState = createInitialSimState();
  const trainState = createInitialTrainSimulation(1);

  const target = npcState.npcs.find((n) => !n.immovable && Math.abs(n.y - 0.65) < 0.2)!;
  const step = stepNpcSimulation(
    npcState,
    simState,
    trainState,
    { x: target.x + 0.1, y: target.y, z: target.z },
    [],
    0.016,
  );

  assert.equal(step.events.playBumpSound, true);
  assert.ok(step.events.bumpLineBn && step.events.bumpLineBn.length > 0);
  const sep = Math.hypot(step.playerX - target.x, step.playerZ - target.z);
  assert.ok(sep >= PLAYER_RADIUS + target.radius - 1e-3);
});

test('schedule-aware passenger dialogue and all 10 random station incidents resolve cleanly', () => {
  assert.equal(STATION_INCIDENT_SPECS.length, 10);
  let npcState = createInitialNpcSimulation();
  let simState = createInitialSimState();
  const trainState = createInitialTrainSimulation(1);

  const passenger = npcState.npcs.find((n) => n.role === 'passenger')!;
  const q = buildPassengerQuestionDialogue(passenger, simState, trainState, 0);
  assert.ok(q.questionBn.includes('ঢাকা'));
  const correctChoice = q.choices.find((c) => c.isCorrect)!;
  assert.ok(correctChoice);

  const resolved = resolveNpcDialogueChoice(npcState, simState, passenger.id, correctChoice, 1000);
  npcState = resolved.npcState;
  simState = resolved.simState;
  assert.ok(simState.satisfaction > 84);
  assert.equal(simState.successfulInteractions, 1);

  // Verify every one of the 10 station incidents produces valid choices
  for (const spec of STATION_INCIDENT_SPECS) {
    const incDlg = buildIncidentDialogue(passenger, spec.kind);
    assert.equal(incDlg.incidentKind, spec.kind);
    assert.ok(incDlg.choices.length >= 2);
  }

  // Nearest talkable NPC finder & openNpcDialogueForAgent work near player
  const nearest = findNearestTalkableNpc(npcState, passenger.x, passenger.y, passenger.z, 2.5);
  assert.ok(nearest);
  const opened = openNpcDialogueForAgent(npcState, nearest!.id, simState, trainState);
  assert.ok(opened && opened.choices.length >= 2);
});

test('dynamic crowd density scales up during active train boarding & rush hours', () => {
  const sim = createInitialSimState();
  const ts = createInitialTrainSimulation(1);

  // Morning rush (08:30 AM) + train at platform
  const rushSim = { ...sim, gameMinutes: 8 * 60 + 30 };
  ts.trains[0].status = 'Boarding';
  const rushCrowd = computeTargetCrowdSize(rushSim, ts);

  // Late quiet night (01:30 AM) with no boarding trains
  const nightSim = { ...sim, gameMinutes: 1 * 60 + 30 };
  ts.trains.forEach((t) => {
    t.status = 'Scheduled';
  });
  const nightCrowd = computeTargetCrowdSize(nightSim, ts);

  assert.ok(rushCrowd > nightCrowd, `Expected rushCrowd (${rushCrowd}) > nightCrowd (${nightCrowd})`);
});
