import test from 'node:test';
import assert from 'node:assert/strict';
import {
  broadcastMissionBanglaPa,
  buildEmergencyDashboardSnapshot,
  createInitialNpcSimulation,
  dispatchOfficerToMission,
  findNearestTalkableNpc,
  interactWithEmergencyHazard,
  openNpcDialogueForAgent,
  requestSecurityPatrolSweep,
  resolveNpcDialogueChoice,
  spawnEmergencyMission,
  stepNpcSimulation,
} from './npcManager';
import { createInitialSimState } from './rules';
import { EMERGENCY_MISSION_TEMPLATES, MISSION_ROTATION_ORDER } from './securityMissions';
import { createInitialTrainSimulation } from './trainManager';
import type { EmergencyMissionKind } from './types';

test('initial station spawns 3 active security patrol officers (2 GRP + 1 BD Police)', () => {
  const npcState = createInitialNpcSimulation();
  const grp = npcState.npcs.filter((n) => n.role === 'railway_police');
  const bd = npcState.npcs.filter((n) => n.role === 'bd_police');
  assert.equal(grp.length, 2, 'Expected 2 Railway Police (GRP) officers');
  assert.equal(bd.length, 1, 'Expected 1 Bangladesh Police officer');
  for (const officer of [...grp, ...bd]) {
    assert.equal(officer.policePhase, 'patrol');
    assert.equal(officer.assignedMissionId, null);
  }
});

test('all 13 emergency and crime mission templates spawn validly with dialogues', () => {
  const expectedKinds: EmergencyMissionKind[] = [
    'lost_child',
    'luggage_theft',
    'medical_emergency',
    'passenger_fighting',
    'fire_hazard',
    'suspicious_package',
    'overcrowded_platform',
    'pickpocket_caught',
    'restricted_track_trespass',
    'elderly_emergency',
    'mobile_theft',
    'ticket_fraud',
    'attempted_robbery',
  ];
  assert.equal(Object.keys(EMERGENCY_MISSION_TEMPLATES).length, 13);
  assert.equal(MISSION_ROTATION_ORDER.length, 13);

  const trainState = createInitialTrainSimulation(1);
  for (const kind of expectedKinds) {
    const npcState = createInitialNpcSimulation();
    const simState = createInitialSimState();
    const res = spawnEmergencyMission(npcState, simState, kind, 1000);
    assert.ok(res.mission, `Expected mission for ${kind}`);
    const mission = res.mission;
    assert.equal(mission.kind, kind);
    assert.ok(mission.title.length > 0 && mission.titleBn.length > 0);
    assert.ok(res.announcement && res.announcement.length > 0);
    assert.ok(res.simState.lastEventMessage.includes(mission.title));

    if (mission.victimNpcId) {
      const dlg = openNpcDialogueForAgent(npcState, mission.victimNpcId, simState, trainState);
      assert.ok(dlg && dlg.choices.length >= 2, `Expected victim dialogue for ${kind}`);
    }
    if (mission.suspectNpcId) {
      const dlg = openNpcDialogueForAgent(npcState, mission.suspectNpcId, simState, trainState);
      assert.ok(dlg && dlg.choices.length >= 2, `Expected suspect dialogue for ${kind}`);
    }
  }
});

test('Lost Child mission spawns child safely off tracks, supports witness clue, locate & reunite flow', () => {
  const npcState = createInitialNpcSimulation();
  let simState = createInitialSimState();
  const trainState = createInitialTrainSimulation(1);

  const spawned = spawnEmergencyMission(npcState, simState, 'lost_child', 2000);
  assert.ok(spawned.mission);
  simState = spawned.simState;
  const mission = spawned.mission;

  assert.ok(mission.childNpcId, 'Lost Child mission must assign a lost child NPC');
  const child = npcState.npcs.find((n) => n.id === mission.childNpcId)!;
  assert.ok(child);
  assert.equal(child.missionRole, 'lost_child');
  assert.ok(
    Math.abs(child.z) >= 4.7,
    `Lost child must never spawn on railway tracks (z=${child.z})`,
  );

  const nearChild = findNearestTalkableNpc(npcState, child.x, child.y, child.z, 2.5);
  assert.equal(nearChild?.id, child.id);

  if (mission.witnessNpcIds.length > 0) {
    const witnessDlg = openNpcDialogueForAgent(
      npcState,
      mission.witnessNpcIds[0],
      simState,
      trainState,
    )!;
    const clueChoice = witnessDlg.choices.find((c) => c.missionAction === 'gather_clue')!;
    assert.ok(clueChoice);
    const clueRes = resolveNpcDialogueChoice(
      npcState,
      simState,
      mission.witnessNpcIds[0],
      clueChoice,
      3000,
    );
    simState = clueRes.simState;
    assert.ok(mission.cluesCollected.length >= 1);
  }

  const childDlg = openNpcDialogueForAgent(npcState, child.id, simState, trainState)!;
  const locateChoice = childDlg.choices.find((c) => c.missionAction === 'locate_child')!;
  assert.ok(locateChoice);
  const locateRes = resolveNpcDialogueChoice(npcState, simState, child.id, locateChoice, 4000);
  simState = locateRes.simState;
  assert.equal(mission.status, 'awaiting_reunion');

  assert.ok(mission.victimNpcId);
  const guardianDlg = openNpcDialogueForAgent(npcState, mission.victimNpcId!, simState, trainState)!;
  const reuniteChoice = guardianDlg.choices.find((c) => c.missionAction === 'reunite_child')!;
  assert.ok(reuniteChoice);
  const finalRes = resolveNpcDialogueChoice(
    npcState,
    simState,
    mission.victimNpcId!,
    reuniteChoice,
    5000,
  );
  simState = finalRes.simState;

  assert.equal(npcState.missions.length, 0);
  assert.equal(simState.emergenciesResolved, 1);
  assert.ok(simState.money > 1000);
  const rescuerAch = simState.achievements.find((a) => a.id === 'child_rescuer');
  assert.equal(rescuerAch?.unlocked, true);
});

test('Police dispatch walks smoothly via A* without teleporting and resolves Luggage Theft pursuit', () => {
  let npcState = createInitialNpcSimulation();
  let simState = createInitialSimState();
  const trainState = createInitialTrainSimulation(1);

  const spawned = spawnEmergencyMission(npcState, simState, 'luggage_theft', 2000);
  assert.ok(spawned.mission);
  simState = spawned.simState;
  const mission = spawned.mission;

  const bdOfficer = npcState.npcs.find((n) => n.role === 'bd_police')!;
  const startX = bdOfficer.x;
  const startZ = bdOfficer.z;

  const disp = dispatchOfficerToMission(npcState, simState, mission.id, bdOfficer.id, 3000);
  assert.equal(disp.dispatched, true);
  simState = disp.simState;

  assert.equal(bdOfficer.x, startX);
  assert.equal(bdOfficer.z, startZ);
  assert.equal(bdOfficer.policePhase, 'responding');
  assert.ok(bdOfficer.route.length > 0, 'Officer must receive an A* route');

  let resolvedByStep = false;
  for (let i = 0; i < 650; i++) {
    const step = stepNpcSimulation(
      npcState,
      simState,
      trainState,
      { x: -10, y: 0.65, z: -8 },
      [],
      0.05,
    );
    npcState = step.npcState;
    simState = step.simState;
    if (!npcState.missions.some((m) => m.id === mission.id) && simState.crimesPrevented >= 1) {
      resolvedByStep = true;
      break;
    }
  }

  assert.equal(resolvedByStep, true, 'Dispatched officer should walk, pursue, and resolve theft');
  assert.ok(simState.emergenciesResolved >= 1);
  assert.ok(simState.crimesPrevented >= 1);
  const theftAch = simState.achievements.find((a) => a.id === 'theft_stopper');
  assert.equal(theftAch?.unlocked, true);
});

test('3D emergency hazard prop interaction resolves fire_hazard and unlocks hazard_controller', () => {
  const npcState = createInitialNpcSimulation();
  let simState = createInitialSimState();

  const spawned = spawnEmergencyMission(npcState, simState, 'fire_hazard', 1000);
  assert.ok(spawned.mission);
  simState = spawned.simState;
  const mission = spawned.mission;
  assert.equal(mission.hasHazardProp, true);
  assert.equal(mission.propKind, 'fire');
  assert.equal(mission.propActive, true);

  const hazRes = interactWithEmergencyHazard(npcState, simState, mission.id, 2000);
  assert.equal(hazRes.resolved, true);
  simState = hazRes.simState;
  assert.equal(npcState.missions.length, 0);
  assert.equal(simState.emergenciesResolved, 1);
  assert.equal(simState.achievements.find((a) => a.id === 'hazard_controller')?.unlocked, true);
});

test('Unresolved mission timeout lowers securityRating & reputation cleanly', () => {
  const npcState = createInitialNpcSimulation();
  let simState = createInitialSimState();
  const trainState = createInitialTrainSimulation(1);

  const initialSec = simState.securityRating;
  const initialRep = simState.reputation;

  const spawned = spawnEmergencyMission(npcState, simState, 'pickpocket_caught', 1000);
  assert.ok(spawned.mission);
  simState = spawned.simState;
  spawned.mission.timeRemainingSec = 0.05;

  const step = stepNpcSimulation(
    npcState,
    simState,
    trainState,
    { x: 0, y: 0.65, z: -8 },
    [],
    0.1,
  );
  simState = step.simState;
  assert.equal(simState.emergenciesFailed, 1);
  assert.ok(simState.securityRating < initialSec);
  assert.ok(simState.reputation < initialRep);
});

test('Dashboard snapshot, Patrol Sweep & Bangla Emergency PA work together cleanly', () => {
  const npcState = createInitialNpcSimulation();
  let simState = createInitialSimState();
  const spawned = spawnEmergencyMission(npcState, simState, 'suspicious_package', 1000);
  assert.ok(spawned.mission);
  simState = spawned.simState;
  const mission = spawned.mission;

  const paText = broadcastMissionBanglaPa(npcState, mission.id);
  assert.ok(paText && paText.length > 10);
  assert.equal(mission.areaSecured, true);

  const sweep = requestSecurityPatrolSweep(npcState, simState, 2000);
  simState = sweep.simState;
  assert.equal(sweep.officersActivated, 3);

  const snap = buildEmergencyDashboardSnapshot(npcState, simState);
  assert.equal(snap.officers.length, 3);
  assert.equal(snap.activeMissions.length, 1);
  assert.equal(snap.achievements.length, 6);
});
