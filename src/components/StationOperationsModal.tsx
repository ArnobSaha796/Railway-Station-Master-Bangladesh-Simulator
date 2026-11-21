import { useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Building,
  CheckCircle2,
  ClipboardCheck,
  Coins,
  Plus,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  TrainFront,
  Users,
  Wallet,
  Wrench,
  X,
} from 'lucide-react';
import {
  VipSecurityControlPanel,
  type VipSecurityControlActions,
} from './VipSecurityControlPanel';
import { STAFF_ROLE_SPECS } from '../game/stationOperations';
import type {
  FacilityId,
  ManagedTrain,
  StaffDuty,
  StaffRole,
  StaffShift,
  StationOperationsSnapshot,
  TrackId,
} from '../game/types';

export interface StationOperationsCallbacks extends VipSecurityControlActions {
  claimTask: (taskId: string) => void;
  resolveOpsEvent: (eventId: string) => void;
  spawnOpsEvent: () => void;
  dispatchUnexpectedTrain: () => void;
  triggerSimultaneousArrivals: () => void;
  divertTrainToPlatform: (trainId: string, track: TrackId) => void;
  hireStaff: (role: StaffRole) => void;
  assignStaffDuty: (staffId: string, duty: StaffDuty) => void;
  changeStaffShift: (staffId: string, shift: StaffShift) => void;
  trainStaff: (staffId: string) => void;
  replaceAbsentStaff: (staffId: string) => void;
  constructFacility: (facilityId: FacilityId) => void;
  upgradeFacility: (facilityId: FacilityId) => void;
  repairFacility: (facilityId: FacilityId) => void;
}

interface StationOperationsModalProps {
  snapshot: StationOperationsSnapshot;
  trains: ManagedTrain[];
  unlockedTracks: number;
  actions: StationOperationsCallbacks;
  onClose: () => void;
}

type OpsTab = 'tasks' | 'emergencies' | 'staff' | 'facilities' | 'finance';

const DUTY_OPTIONS: { id: StaffDuty; label: string }[] = [
  { id: 'signals_tracks', label: 'Signals & Tracks' },
  { id: 'platforms_boarding', label: 'Platforms & Boarding' },
  { id: 'facilities_power', label: 'Facilities & Power' },
  { id: 'passenger_service', label: 'Passenger Service' },
  { id: 'security_support', label: 'Security & VIP' },
  { id: 'standby', label: 'Standby Relief' },
];

export function StationOperationsModal({
  snapshot,
  trains,
  unlockedTracks,
  actions,
  onClose,
}: StationOperationsModalProps) {
  const [activeTab, setActiveTab] = useState<OpsTab>('tasks');

  const divertableTrains = trains.filter(
    (t) =>
      t.status === 'Approaching' ||
      t.status === 'Arriving' ||
      t.status === 'Delayed' ||
      t.status === 'Scheduled',
  );
  const trackList = Array.from({ length: unlockedTracks }, (_, i) => (i + 1) as TrackId);

  const f = snapshot.finance;
  const totalTodayIncome = f.ticketIncomeToday + f.rentalIncomeToday + f.cargoIncomeToday;
  const totalTodayExpense =
    f.staffSalariesToday +
    f.electricityBillToday +
    f.maintenanceCostToday +
    f.constructionSpendToday +
    f.emergencyRepairSpendToday;

  const constructedCount = snapshot.facilities.filter((fac) => fac.constructed).length;
  const claimableTasksCount = snapshot.tasks.filter((t) => t.completed && !t.claimed).length;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4"
      style={{ backgroundColor: 'rgba(8, 18, 13, 0.85)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ops-hub-title"
      data-testid="station-operations-modal"
    >
      <div
        className="w-full max-w-5xl max-h-[94vh] rounded-xl border border-[#e8b84b]/55 shadow-2xl text-[#fbf4e2] flex flex-col overflow-hidden"
        style={{ backgroundColor: '#122a1e' }}
      >
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 border-b border-[#e8b84b]/30 flex items-center justify-between gap-3 bg-[#0e2218]">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-[#f5c756] shrink-0" />
              <h2
                id="ops-hub-title"
                className="font-display font-bold text-base sm:text-xl truncate"
              >
                Station Operations Command · {snapshot.stationName}
              </h2>
            </div>
            <div className="mt-0.5 text-xs text-[#d4c6a3] font-mono-tabular flex flex-wrap items-center gap-x-2">
              <span className="text-[#f5c756] font-semibold">
                {snapshot.money.toLocaleString()} coins
              </span>
              <span>·</span>
              <span>Rep {snapshot.reputation}%</span>
              <span>·</span>
              <span className="text-[#86efac]">Sat {snapshot.satisfaction}%</span>
              <span>·</span>
              <span>{constructedCount}/15 Facilities Built</span>
              {snapshot.powerOutageActive && (
                <span className="px-1.5 py-0.2 rounded bg-[#991b1b] text-[#fecaca] font-bold">
                  POWER OUTAGE
                </span>
              )}
            </div>
          </div>
          <button
            type="button"
            data-testid="close-operations-modal-btn"
            aria-label="Close Operations Command"
            onClick={onClose}
            className="min-w-[40px] h-10 px-3 rounded-lg bg-[#1c3e2d] hover:bg-[#25523c] border border-[#e8b84b]/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Close [O]</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-3 sm:px-5 py-2 border-b border-[#e8b84b]/20 bg-[#0d2016] flex flex-wrap gap-1.5">
          {(
            [
              {
                id: 'tasks',
                label: 'Tasks & Missions',
                badge: claimableTasksCount,
                icon: ClipboardCheck,
              },
              {
                id: 'emergencies',
                label: 'Emergencies & Ops',
                badge: snapshot.activeOpsEvents.length,
                icon: ShieldAlert,
              },
              {
                id: 'staff',
                label: `Staff (${snapshot.staff.length})`,
                badge: snapshot.staff.filter((s) => s.absent).length,
                icon: Users,
              },
              {
                id: 'facilities',
                label: `Facilities (${constructedCount}/15)`,
                badge: snapshot.facilities.filter((fac) => fac.constructed && fac.condition < 65).length,
                icon: Building,
              },
              { id: 'finance', label: 'Finance Ledger', badge: 0, icon: Wallet },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                data-testid={`ops-tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors border ${
                  active
                    ? 'bg-[#e8b84b] text-[#14241b] border-[#f5c756]'
                    : 'bg-[#142f21] text-[#dfd5bc] border-[#e8b84b]/20 hover:bg-[#1a3d2b]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
                {tab.badge > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      active ? 'bg-[#14241b] text-[#f5c756]' : 'bg-[#dc2626] text-white'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
          {activeTab === 'tasks' && (
            <div className="space-y-3">
              <div className="text-xs text-[#d4c6a3]">
                Complete Daily Station Tasks, Weekly Safety Benchmarks, and Infrastructure Missions to earn coins, XP, Reputation, and permanent Operations Abilities.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {snapshot.tasks.map((task) => {
                  const pct = Math.min(100, Math.round((task.current / Math.max(1, task.target)) * 100));
                  return (
                    <div
                      key={task.id}
                      data-testid={`station-task-card-${task.id}`}
                      className={`rounded-xl border p-3.5 space-y-2.5 ${
                        task.claimed
                          ? 'bg-[#0e261a] border-[#22c55e]/35 opacity-80'
                          : task.completed
                            ? 'bg-[#123c26] border-[#4ade80]/70 shadow-md'
                            : 'bg-[#0d2016] border-[#e8b84b]/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="space-y-0.5">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="px-2 py-0.5 rounded bg-[#183d2b] border border-[#e8b84b]/30 text-[10px] font-bold uppercase text-[#f5c756]">
                              {task.category}
                            </span>
                            {task.unlockAbility && (
                              <span className="px-2 py-0.5 rounded bg-[#1e3a5f] text-[10px] font-semibold text-[#7dd3fc] flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                {task.unlockAbility}
                              </span>
                            )}
                          </div>
                          <div className="font-display font-bold text-sm text-[#fbf4e2]">
                            {task.title}
                          </div>
                          <div className="text-xs text-[#f5c756]/90">{task.titleBn}</div>
                        </div>
                        <span className="font-mono-tabular font-bold text-xs px-2 py-0.5 rounded bg-[#09160f] text-[#86efac] shrink-0">
                          {task.current} / {task.target}
                        </span>
                      </div>

                      <p className="text-xs text-[#d4c6a3]">{task.description}</p>

                      <div className="h-1.5 rounded-full bg-[#09160f] overflow-hidden">
                        <div
                          className={`h-full transition-all duration-200 ${
                            task.completed ? 'bg-[#4ade80]' : 'bg-[#e8b84b]'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1 text-xs">
                        <span className="font-mono-tabular text-[#cbbd98]">
                          +{task.rewardMoney}c · +{task.rewardXp} XP · +{task.rewardRep}% Rep
                        </span>
                        {task.claimed ? (
                          <span className="text-[#86efac] font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Claimed
                          </span>
                        ) : task.completed ? (
                          <button
                            type="button"
                            data-testid={`claim-task-${task.id}`}
                            onClick={() => actions.claimTask(task.id)}
                            className="px-3 py-1.5 rounded-lg bg-[#22c55e] hover:bg-[#16a34a] text-[#052e16] font-bold cursor-pointer"
                          >
                            Claim Reward
                          </button>
                        ) : (
                          <span className="text-[#9cb4a4] text-[11px]">In Progress</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'emergencies' && (
            <div className="space-y-4">
              {/* Advanced Railway Operations Command Strip */}
              <div className="rounded-xl border border-[#e8b84b]/40 bg-[#0d2016] p-3.5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-display font-bold text-sm text-[#f5c756]">
                      Advanced Railway Traffic &amp; Emergency Dispatch
                    </h3>
                    <p className="text-xs text-[#d4c6a3]">
                      Handle unexpected relief arrivals, simultaneous peak-hour approaches, and emergency track diversions.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      data-testid="ops-inject-train-btn"
                      onClick={actions.dispatchUnexpectedTrain}
                      className="px-3 py-1.5 rounded-lg bg-[#1d4ed8] hover:bg-[#1e40af] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <TrainFront className="w-3.5 h-3.5" />
                      <span>Unexpected Relief Express</span>
                    </button>
                    <button
                      type="button"
                      data-testid="ops-peak-arrivals-btn"
                      onClick={actions.triggerSimultaneousArrivals}
                      className="px-3 py-1.5 rounded-lg bg-[#b45309] hover:bg-[#92400e] text-[#fef3c7] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Peak Simultaneous Arrivals</span>
                    </button>
                    <button
                      type="button"
                      data-testid="ops-spawn-event-btn"
                      onClick={actions.spawnOpsEvent}
                      className="px-3 py-1.5 rounded-lg bg-[#163827] hover:bg-[#1f4d36] border border-[#e8b84b]/35 text-[#fbf4e2] text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Trigger Ops Drill</span>
                    </button>
                  </div>
                </div>

                {/* Emergency Platform Diversion Controls */}
                {divertableTrains.length > 0 && (
                  <div className="pt-2 border-t border-[#e8b84b]/20 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-[#cbbd98]">
                      Emergency Platform Diversion ({divertableTrains.length} Incoming / Scheduled)
                    </div>
                    <div className="space-y-1.5">
                      {divertableTrains.slice(0, 4).map((t) => (
                        <div
                          key={t.id}
                          className="rounded-lg bg-[#122b1e] px-2.5 py-2 flex flex-wrap items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <span className="font-bold text-[#fbf4e2]">
                              #{t.trainNumber} {t.name}
                            </span>{' '}
                            <span className="text-[#d4c6a3]">
                              ({t.status} · {t.assignedPlatform ? `Current P${t.assignedPlatform}` : 'Unassigned'})
                            </span>
                          </div>
                          <div className="flex flex-wrap items-center gap-1">
                            {trackList.map((trackId) => {
                              const isVipLocked =
                                Boolean(snapshot.vipProtocol?.active) &&
                                snapshot.vipProtocol!.lockedPlatforms.includes(trackId);
                              return (
                                <button
                                  key={trackId}
                                  type="button"
                                  disabled={isVipLocked}
                                  onClick={() => actions.divertTrainToPlatform(t.id, trackId)}
                                  className={`px-2 py-1 rounded text-[11px] font-bold border ${
                                    isVipLocked
                                      ? 'bg-[#3d1818] text-[#fca5a5] border-[#ef4444]/60 opacity-65 cursor-not-allowed'
                                      : t.assignedPlatform === trackId
                                        ? 'bg-[#e8b84b] text-[#14241b] border-[#f5c756] cursor-pointer'
                                        : 'bg-[#0c1d14] text-[#dfd5bc] border-[#e8b84b]/25 hover:bg-[#183b29] cursor-pointer'
                                  }`}
                                >
                                  {isVipLocked ? `P${trackId} Locked` : `Divert P${trackId}`}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Emergency VIP Security Protocol Control Panel */}
              <VipSecurityControlPanel protocol={snapshot.vipProtocol} actions={actions} />

              {/* Active Ops Emergencies */}
              <div className="space-y-2.5">
                <h3 className="font-display font-bold text-sm text-[#fbf4e2]">
                  Active Station Operations Emergencies ({snapshot.activeOpsEvents.length})
                </h3>
                {snapshot.activeOpsEvents.length === 0 ? (
                  <div className="rounded-xl border border-[#22c55e]/35 bg-[#0e261a] p-4 text-xs text-[#bbf7d0] flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#4ade80]" />
                    <span>No active infrastructure faults or operational emergencies right now.</span>
                  </div>
                ) : (
                  snapshot.activeOpsEvents.map((ev) => (
                    <div
                      key={ev.id}
                      data-testid={`ops-event-card-${ev.id}`}
                      className="rounded-xl border border-[#f59e0b]/55 bg-[#1b2214] p-3.5 space-y-2.5"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                ev.severity === 'critical'
                                  ? 'bg-[#991b1b] text-[#fecaca]'
                                  : ev.severity === 'high'
                                    ? 'bg-[#b45309] text-[#fef3c7]'
                                    : 'bg-[#1e3a5f] text-[#bae6fd]'
                              }`}
                            >
                              {ev.severity}
                            </span>
                            <span className="font-display font-bold text-sm text-[#fbf4e2]">
                              {ev.title}
                            </span>
                            <span className="text-xs text-[#f5c756]">{ev.titleBn}</span>
                          </div>
                          <p className="text-xs text-[#e2d8be]">{ev.objective}</p>
                          <div className="text-[11px] text-[#cbbd98] font-mono-tabular flex flex-wrap gap-2">
                            <span>Location: {ev.locationLabel}</span>
                            <span>·</span>
                            <span>Role: {STAFF_ROLE_SPECS[ev.requiredRole].label}</span>
                            <span>·</span>
                            <span className="text-[#fca5a5]">
                              Timer: {Math.max(0, Math.ceil(ev.timeRemainingSec))}s
                            </span>
                            <span>·</span>
                            <span className="text-[#86efac]">
                              Auto-Repair: {Math.round(ev.progressPct)}%
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          data-testid={`resolve-ops-${ev.id}`}
                          onClick={() => actions.resolveOpsEvent(ev.id)}
                          className="min-h-[38px] px-3.5 py-2 rounded-lg bg-[#e8b84b] hover:bg-[#f2c65e] text-[#14241b] text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          <Wrench className="w-3.5 h-3.5" />
                          <span>
                            {ev.actionLabel}
                            {ev.repairCostCoins > 0 ? ` (${ev.repairCostCoins}c)` : ' (Free)'}
                          </span>
                        </button>
                      </div>

                      <div className="h-1.5 rounded-full bg-[#0b150f] overflow-hidden">
                        <div
                          className="h-full bg-[#38bdf8] transition-all duration-200"
                          style={{ width: `${Math.min(100, Math.round(ev.progressPct))}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'staff' && (
            <div className="space-y-4">
              {/* Current Roster */}
              <div className="space-y-2.5">
                <h3 className="font-display font-bold text-sm text-[#fbf4e2]">
                  Active Railway Personnel ({snapshot.staff.length})
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {snapshot.staff.map((member) => (
                    <div
                      key={member.id}
                      data-testid={`staff-card-${member.id}`}
                      className={`rounded-xl border p-3.5 space-y-2.5 ${
                        member.absent
                          ? 'bg-[#2a1515] border-[#ef4444]/60'
                          : 'bg-[#0d2016] border-[#e8b84b]/30'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-display font-bold text-sm text-[#fbf4e2]">
                            {member.name}{' '}
                            <span className="text-xs font-normal text-[#f5c756]">({member.nameBn})</span>
                          </div>
                          <div className="text-xs text-[#d4c6a3]">
                            {member.roleLabel} · Lvl {member.level} · {member.salaryPerDay}c/day
                          </div>
                          <div className="text-[11px] text-[#86efac] mt-0.5">
                            {member.absent ? 'ABSENT — Needs Relief Replacement!' : member.assignedTaskLabel}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-[#143322] font-mono-tabular text-[11px] font-bold text-[#f5c756]">
                          Perf {member.performance}%
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase text-[#cbbd98]">Assigned Duty</span>
                          <select
                            value={member.duty}
                            onChange={(e) =>
                              actions.assignStaffDuty(member.id, e.target.value as StaffDuty)
                            }
                            className="rounded bg-[#09160f] border border-[#e8b84b]/30 px-2 py-1 text-xs text-[#fbf4e2]"
                          >
                            {DUTY_OPTIONS.map((opt) => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-1">
                          <span className="text-[10px] uppercase text-[#cbbd98]">Shift Rotation</span>
                          <select
                            value={member.shift}
                            onChange={(e) =>
                              actions.changeStaffShift(member.id, e.target.value as StaffShift)
                            }
                            className="rounded bg-[#09160f] border border-[#e8b84b]/30 px-2 py-1 text-xs text-[#fbf4e2]"
                          >
                            <option value="morning">Morning (06:00–14:00)</option>
                            <option value="evening">Evening (14:00–22:00)</option>
                            <option value="night">Night (22:00–06:00)</option>
                          </select>
                        </label>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
                        <span className="font-mono-tabular text-[#cbbd98]">
                          Fatigue: {Math.round(member.fatigue)}%
                        </span>
                        <div className="flex items-center gap-1.5">
                          {member.absent && (
                            <button
                              type="button"
                              onClick={() => actions.replaceAbsentStaff(member.id)}
                              className="px-2.5 py-1 rounded bg-[#dc2626] hover:bg-[#b91c1c] text-white font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <RefreshCw className="w-3 h-3" />
                              <span>Replace (45c)</span>
                            </button>
                          )}
                          <button
                            type="button"
                            data-testid={`train-staff-${member.id}`}
                            onClick={() => actions.trainStaff(member.id)}
                            className="px-2.5 py-1 rounded bg-[#18442e] hover:bg-[#20583c] border border-[#34d399]/40 text-[#86efac] font-semibold cursor-pointer"
                          >
                            Train Staff (110c)
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Hire Staff Catalog */}
              <div className="rounded-xl border border-[#e8b84b]/35 bg-[#0d2016] p-3.5 space-y-2.5">
                <h3 className="font-display font-bold text-sm text-[#f5c756]">
                  Hire Additional Railway Employees
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {(Object.keys(STAFF_ROLE_SPECS) as StaffRole[]).map((role) => {
                    const spec = STAFF_ROLE_SPECS[role];
                    return (
                      <button
                        key={role}
                        type="button"
                        data-testid={`hire-staff-${role}`}
                        onClick={() => actions.hireStaff(role)}
                        className="rounded-lg border border-[#e8b84b]/30 bg-[#132d20] hover:bg-[#1a3e2c] p-2.5 text-left space-y-1 cursor-pointer transition-colors"
                      >
                        <div className="font-bold text-xs text-[#fbf4e2]">{spec.label}</div>
                        <div className="text-[11px] text-[#cbbd98] font-mono-tabular">
                          Hire: <span className="text-[#f5c756] font-bold">{spec.hireCost}c</span> · Salary{' '}
                          {spec.salaryPerDay}c/day
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'facilities' && (
            <div className="space-y-3">
              <div className="text-xs text-[#d4c6a3]">
                Construct, upgrade (Tier 1–3), and maintain all 15 station facilities to raise daily rental income, commuter satisfaction, and equipment reliability.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {snapshot.facilities.map((fac) => {
                  const condColor =
                    fac.condition >= 75
                      ? 'bg-[#22c55e]'
                      : fac.condition >= 45
                        ? 'bg-[#f59e0b]'
                        : 'bg-[#ef4444]';
                  return (
                    <div
                      key={fac.id}
                      data-testid={`facility-card-${fac.id}`}
                      className={`rounded-xl border p-3.5 space-y-2.5 flex flex-col justify-between ${
                        fac.constructed
                          ? 'bg-[#0d2016] border-[#e8b84b]/35'
                          : 'bg-[#0a1710] border-[#e8b84b]/15 opacity-90'
                      }`}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-display font-bold text-sm text-[#fbf4e2]">
                              {fac.name}
                            </div>
                            <div className="text-[11px] text-[#f5c756]">{fac.nameBn}</div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                              fac.constructed
                                ? 'bg-[#12452b] text-[#86efac]'
                                : 'bg-[#3f2c0d] text-[#fde68a]'
                            }`}
                          >
                            {fac.constructed ? `Lvl ${fac.level}/3` : 'Unbuilt'}
                          </span>
                        </div>

                        {fac.constructed ? (
                          <>
                            <div className="flex items-center justify-between text-[11px] font-mono-tabular text-[#cbbd98]">
                              <span>Condition: {Math.round(fac.condition)}%</span>
                              <span>
                                +{fac.dailyIncome}c/d · -{fac.maintenanceCostPerDay}c/d
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-[#07110b] overflow-hidden">
                              <div
                                className={`h-full ${condColor}`}
                                style={{ width: `${Math.min(100, Math.round(fac.condition))}%` }}
                              />
                            </div>
                          </>
                        ) : (
                          <div className="text-[11px] text-[#cbbd98]">
                            Passive Income: +{fac.dailyIncome}c/day · Sat +{fac.satisfactionBonus}%
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {!fac.constructed ? (
                          <button
                            type="button"
                            data-testid={`facility-construct-${fac.id}`}
                            onClick={() => actions.constructFacility(fac.id)}
                            className="w-full py-1.5 rounded-lg bg-[#e8b84b] hover:bg-[#f2c65e] text-[#14241b] text-xs font-bold cursor-pointer"
                          >
                            Construct ({fac.constructCost}c)
                          </button>
                        ) : (
                          <>
                            {fac.condition < 96 && (
                              <button
                                type="button"
                                data-testid={`facility-repair-${fac.id}`}
                                onClick={() => actions.repairFacility(fac.id)}
                                className="flex-1 py-1.5 px-2 rounded-lg bg-[#163827] hover:bg-[#1f4d36] border border-[#38bdf8]/40 text-[#bae6fd] text-[11px] font-bold cursor-pointer"
                              >
                                Repair ({Math.max(15, Math.round((100 - fac.condition) * 0.9))}c)
                              </button>
                            )}
                            {fac.level < 3 && (
                              <button
                                type="button"
                                data-testid={`facility-upgrade-${fac.id}`}
                                onClick={() => actions.upgradeFacility(fac.id)}
                                className="flex-1 py-1.5 px-2 rounded-lg bg-[#184b31] hover:bg-[#206240] border border-[#34d399]/50 text-[#86efac] text-[11px] font-bold cursor-pointer"
                              >
                                Upgrade ({fac.upgradeCost * fac.level}c)
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'finance' && (
            <div className="space-y-4 font-mono-tabular">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="rounded-xl border border-[#22c55e]/45 bg-[#0d261a] p-4">
                  <div className="text-xs text-[#86efac] uppercase font-semibold">
                    Today Income (Day {f.dayNumber})
                  </div>
                  <div className="mt-1 text-2xl font-bold text-[#fbf4e2]">
                    +{totalTodayIncome.toLocaleString()}c
                  </div>
                  <div className="mt-2 text-xs text-[#d4c6a3] space-y-1">
                    <div className="flex justify-between">
                      <span>Ticket Sales:</span>
                      <span>+{f.ticketIncomeToday}c</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Stalls &amp; Facility Rent:</span>
                      <span>+{f.rentalIncomeToday}c</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Freight &amp; Cargo:</span>
                      <span>+{f.cargoIncomeToday}c</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[#ef4444]/45 bg-[#241313] p-4">
                  <div className="text-xs text-[#fca5a5] uppercase font-semibold">
                    Today Operating Expenses
                  </div>
                  <div className="mt-1 text-2xl font-bold text-[#fbf4e2]">
                    -{totalTodayExpense.toLocaleString()}c
                  </div>
                  <div className="mt-2 text-xs text-[#e2c6c6] space-y-1">
                    <div className="flex justify-between">
                      <span>Staff Salaries:</span>
                      <span>-{f.staffSalariesToday}c</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Electricity &amp; Grid:</span>
                      <span>-{f.electricityBillToday}c</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Maintenance &amp; Repairs:</span>
                      <span>-{f.maintenanceCostToday + f.emergencyRepairSpendToday}c</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Construction Spend:</span>
                      <span>-{f.constructionSpendToday}c</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-[#e8b84b]/45 bg-[#12261c] p-4 flex flex-col justify-between">
                  <div>
                    <div className="text-xs text-[#f5c756] uppercase font-semibold flex items-center gap-1.5">
                      <Coins className="w-4 h-4" />
                      <span>Net Station Ledger</span>
                    </div>
                    <div
                      className={`mt-1 text-2xl font-bold ${
                        f.netToday >= 0 ? 'text-[#86efac]' : 'text-[#fca5a5]'
                      }`}
                    >
                      {f.netToday >= 0 ? '+' : ''}
                      {f.netToday.toLocaleString()}c
                    </div>
                  </div>
                  <div className="mt-3 pt-2 border-t border-[#e8b84b]/20 text-xs text-[#d4c6a3] space-y-1">
                    <div className="flex justify-between">
                      <span>Lifetime Revenue:</span>
                      <span className="text-[#86efac]">+{f.totalLifetimeIncome.toLocaleString()}c</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Lifetime Outflow:</span>
                      <span className="text-[#fca5a5]">-{f.totalLifetimeExpenses.toLocaleString()}c</span>
                    </div>
                  </div>
                </div>
              </div>

              {snapshot.powerOutageActive && (
                <div className="rounded-lg border border-[#ef4444]/60 bg-[#3a1616] px-3 py-2 text-xs text-[#fecaca] flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    Station Power Failure is reducing commercial rental yield until resolved in Emergencies &amp; Ops.
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
