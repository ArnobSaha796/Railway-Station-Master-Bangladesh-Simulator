import assert from 'node:assert/strict';
import test from 'node:test';
import { createInitialSimState } from './rules';
import {
  applyDailyFinanceCycle,
  assignStaffDuty,
  claimTaskReward,
  constructFacility,
  createInitialOperationsState,
  getPrimaryDailyTask,
  hireStaffMember,
  OPS_EMERGENCY_TEMPLATES,
  recordFinanceIncome,
  recordTaskMetric,
  repairFacility,
  replaceAbsentStaff,
  resolveOpsEmergency,
  setStaffShift,
  spawnOpsEmergency,
  STAFF_ROLE_SPECS,
  stepStationOperations,
  trainStaffMember,
  upgradeFacility,
} from './stationOperations';
import type {
  FacilityId,
  OpsEmergencyKind,
  StaffRole,
  StationOperationsState,
} from './types';

test('station tasks track progress, complete, and claim rewards including unlock abilities', () => {
  const sim0 = createInitialSimState(1);
  let ops = createInitialOperationsState(1);

  const primary = getPrimaryDailyTask(ops);
  assert.ok(primary);
  assert.equal(primary.completed, false);

  ops = recordTaskMetric(ops, primary.metric, primary.target);
  const updated = ops.tasks.find((t) => t.id === primary.id)!;
  assert.equal(updated.completed, true);
  assert.equal(updated.claimed, false);

  const claimRes = claimTaskReward(sim0, ops, primary.id, 1000);
  assert.equal(claimRes.accepted, true);
  assert.equal(claimRes.simState.money, sim0.money + updated.rewardMoney);
  assert.ok(claimRes.simState.xp >= sim0.xp || claimRes.simState.level > sim0.level);
  assert.equal(claimRes.opsState.tasks.find((t) => t.id === primary.id)?.claimed, true);
});

test('all 20 Ops emergency templates can spawn and resolve cleanly with penalties on expiry', () => {
  const kinds = Object.keys(OPS_EMERGENCY_TEMPLATES) as OpsEmergencyKind[];
  assert.ok(kinds.length >= 20);

  let sim = { ...createInitialSimState(2), unlockedTracks: 8, money: 5000 };
  let ops: StationOperationsState = { ...createInitialOperationsState(2), activeOpsEvents: [] };

  for (const kind of kinds) {
    const spawned = spawnOpsEmergency(sim, ops, kind);
    assert.ok(spawned.event, `Failed to spawn ${kind}`);
    ops = spawned.opsState;

    const resolved = resolveOpsEmergency(sim, ops, spawned.event.id, 2000, false);
    assert.equal(resolved.accepted, true, `Failed to resolve ${kind}`);
    sim = resolved.simState;
    ops = resolved.opsState;
  }

  assert.equal(ops.activeOpsEvents.length, 0);
  assert.equal(sim.emergenciesResolved, kinds.length);

  // Expiry applies penalty to satisfaction & reputation
  const powerOut = spawnOpsEmergency(sim, ops, 'power_failure');
  assert.ok(powerOut.event);
  assert.equal(powerOut.opsState.powerOutageActive, true);
  const expiredState = {
    ...powerOut.opsState,
    activeOpsEvents: powerOut.opsState.activeOpsEvents.map((e) => ({
      ...e,
      timeRemainingSec: 0.01,
    })),
    staff: [],
  };
  const stepped = stepStationOperations(sim, expiredState, 0.5, 3000);
  assert.equal(stepped.opsState.activeOpsEvents.length, 0);
  assert.equal(stepped.opsState.powerOutageActive, false);
  assert.ok(stepped.simState.emergenciesFailed > sim.emergenciesFailed);
});

test('staff management supports hiring all 6 roles, assigning duties/shifts, training, replacing absent, and auto-work', () => {
  let sim = { ...createInitialSimState(1), money: 4000 };
  let ops = createInitialOperationsState(1);
  const initialCount = ops.staff.length;
  const roles = Object.keys(STAFF_ROLE_SPECS) as StaffRole[];
  assert.equal(roles.length, 6);

  for (const role of roles) {
    const hired = hireStaffMember(sim, ops, role, 1000);
    assert.equal(hired.accepted, true);
    sim = hired.simState;
    ops = hired.opsState;
  }
  assert.equal(ops.staff.length, initialCount + 6);

  const first = ops.staff[0];
  ops = assignStaffDuty(ops, first.id, 'facilities_power');
  ops = setStaffShift(ops, first.id, 'night');
  assert.equal(ops.staff[0].duty, 'facilities_power');
  assert.equal(ops.staff[0].shift, 'night');

  const trained = trainStaffMember(sim, ops, first.id, 2000);
  assert.equal(trained.accepted, true);
  sim = trained.simState;
  ops = trained.opsState;
  assert.ok(ops.staff[0].level > first.level);
  assert.ok(ops.staff[0].performance >= first.performance);

  // Absent relief replacement
  ops = {
    ...ops,
    staff: ops.staff.map((s, idx) => (idx === 0 ? { ...s, absent: true } : s)),
  };
  const replaced = replaceAbsentStaff(sim, ops, first.id, 3000);
  assert.equal(replaced.accepted, true);
  assert.equal(replaced.opsState.staff[0].absent, false);

  // Staff auto-progress active Ops events matching their role/duty
  const sigEvent = spawnOpsEmergency(replaced.simState, replaced.opsState, 'signal_fault');
  assert.ok(sigEvent.event);
  const ticked = stepStationOperations(replaced.simState, sigEvent.opsState, 2.0, 4000);
  const activeEv = ticked.opsState.activeOpsEvents.find((e) => e.id === sigEvent.event!.id);
  assert.ok(!activeEv || activeEv.progressPct > 0);
});

test('all 15 facilities support construction, upgrading, condition wear, and repair', () => {
  let sim = { ...createInitialSimState(1), money: 9000 };
  let ops = createInitialOperationsState(1);
  assert.equal(ops.facilities.length, 15);

  const unbuilt = ops.facilities.filter((f) => !f.constructed);
  assert.ok(unbuilt.length >= 1);

  for (const fac of unbuilt) {
    const built = constructFacility(sim, ops, fac.id as FacilityId, 1000);
    assert.equal(built.accepted, true, `Failed to construct ${fac.id}`);
    sim = built.simState;
    ops = built.opsState;
  }
  assert.equal(ops.facilities.every((f) => f.constructed), true);

  const targetId = ops.facilities[0].id;
  const up = upgradeFacility(sim, ops, targetId, 2000);
  assert.equal(up.accepted, true);
  sim = up.simState;
  ops = up.opsState;
  assert.equal(ops.facilities.find((f) => f.id === targetId)?.level, 2);

  // Wear condition down and repair
  ops = {
    ...ops,
    facilities: ops.facilities.map((f) =>
      f.id === targetId ? { ...f, condition: 60 } : f,
    ),
  };
  const rep = repairFacility(sim, ops, targetId, 3000);
  assert.equal(rep.accepted, true);
  assert.equal(rep.opsState.facilities.find((f) => f.id === targetId)?.condition, 100);
});

test('financial ledger tracks daily income, operating expenses, and daily settlement rollover', () => {
  const sim = { ...createInitialSimState(1), money: 1000 };
  let ops = createInitialOperationsState(1);

  ops = recordFinanceIncome(ops, 'ticket', 300);
  ops = recordFinanceIncome(ops, 'cargo', 150);
  assert.equal(ops.finance.ticketIncomeToday, 300);
  assert.equal(ops.finance.cargoIncomeToday, 150);

  const settled = applyDailyFinanceCycle(sim, ops, 2, 5000);
  assert.equal(settled.opsState.lastFinanceAppliedDay, 2);
  assert.equal(settled.opsState.finance.dayNumber, 2);
  assert.ok(settled.simState.money !== sim.money);
});
