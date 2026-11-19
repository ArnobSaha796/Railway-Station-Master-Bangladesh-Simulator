import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Award,
  CheckCircle2,
  MapPin,
  Megaphone,
  Radio,
  Search,
  Shield,
  ShieldAlert,
  Siren,
  X,
} from 'lucide-react';
import type {
  EmergencyDashboardSnapshot,
  EmergencyMission,
  EmergencySeverity,
  MissionStatus,
} from '../game/types';

export interface EmergencyControlCallbacks {
  dispatchOfficer: (missionId: string, officerId?: string) => void;
  requestPatrolSweep: () => void;
  broadcastEmergencyPa: (missionId: string) => void;
}

interface EmergencyDashboardModalProps {
  snapshot: EmergencyDashboardSnapshot;
  actions: EmergencyControlCallbacks;
  onClose: () => void;
}

function severityBadge(severity: EmergencySeverity): string {
  switch (severity) {
    case 'critical':
      return 'bg-[#dc2626] text-white border-[#fca5a5]/40';
    case 'high':
      return 'bg-[#ea580c] text-white border-[#fdba74]/40';
    case 'medium':
      return 'bg-[#d97706] text-white border-[#fcd34d]/40';
    default:
      return 'bg-[#0284c7] text-white border-[#7dd3fc]/40';
  }
}

function statusBadge(status: MissionStatus): string {
  switch (status) {
    case 'in_pursuit':
      return 'bg-[#7f1d1d] text-[#fecaca] border-[#f87171]/40';
    case 'officer_dispatched':
      return 'bg-[#0c4a6e] text-[#bae6fd] border-[#38bdf8]/40';
    case 'investigating':
    case 'awaiting_reunion':
      return 'bg-[#713f12] text-[#fef08a] border-[#facc15]/40';
    case 'resolved':
      return 'bg-[#14532d] text-[#bbf7d0] border-[#4ade80]/40';
    case 'failed':
      return 'bg-[#450a0a] text-[#fca5a5] border-[#ef4444]/40';
    default:
      return 'bg-[#991b1b] text-[#fee2e2] border-[#fca5a5]/40';
  }
}

function formatStatusLabel(status: MissionStatus): string {
  switch (status) {
    case 'officer_dispatched':
      return 'Police En Route';
    case 'in_pursuit':
      return 'Pursuing Suspect';
    case 'awaiting_reunion':
      return 'Reuniting Child';
    case 'investigating':
      return 'Investigating';
    case 'resolved':
      return 'Resolved';
    case 'failed':
      return 'Timed Out';
    default:
      return 'Reported';
  }
}

export function EmergencyDashboardModal({
  snapshot,
  actions,
  onClose,
}: EmergencyDashboardModalProps) {
  const [selectedMissionId, setSelectedMissionId] = useState<string | null>(
    snapshot.activeMissions[0]?.id ?? null,
  );

  useEffect(() => {
    if (snapshot.activeMissions.length === 0) {
      setSelectedMissionId(null);
      return;
    }
    if (!selectedMissionId || !snapshot.activeMissions.some((m) => m.id === selectedMissionId)) {
      setSelectedMissionId(snapshot.activeMissions[0].id);
    }
  }, [snapshot.activeMissions, selectedMissionId]);

  const selectedMission: EmergencyMission | null =
    snapshot.activeMissions.find((m) => m.id === selectedMissionId) ??
    snapshot.activeMissions[0] ??
    null;

  const unlockedCount = snapshot.achievements.filter((a) => a.unlocked).length;

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-2.5 sm:p-5"
      style={{ backgroundColor: 'rgba(8, 18, 13, 0.78)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="emergency-dashboard-title"
      data-testid="emergency-dashboard-modal"
    >
      <div
        className="w-full max-w-5xl max-h-[92vh] rounded-xl border border-[#e8b84b]/55 shadow-2xl text-[#fbf4e2] flex flex-col overflow-hidden"
        style={{ backgroundColor: '#122b1f' }}
      >
        {/* Header Bar */}
        <div
          className="flex flex-wrap items-center justify-between gap-2.5 px-4 py-3 sm:px-5 border-b border-[#e8b84b]/30"
          style={{ backgroundColor: '#0d2017' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#1d4431] border border-[#38bdf8]/40 flex items-center justify-center text-[#38bdf8]">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h2 id="emergency-dashboard-title" className="font-display text-base sm:text-lg font-bold">
                Railway Security &amp; Emergency Center
              </h2>
              <div className="text-[11px] sm:text-xs text-[#dfd5bc] font-mono-tabular">
                শাপলাপুর জংশন নিরাপত্তা ও জরুরি নিয়ন্ত্রণ কক্ষ · GRP &amp; Bangladesh Police Dispatch
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              data-testid="request-patrol-sweep-btn"
              onClick={() => actions.requestPatrolSweep()}
              className="px-3 py-2 rounded-lg bg-[#0e7490] hover:bg-[#0891b2] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>Request Patrol Sweep</span>
            </button>

            <button
              type="button"
              data-testid="close-emergency-dashboard-btn"
              aria-label="Close Security & Emergency Center"
              onClick={onClose}
              className="w-9 h-9 rounded-lg border border-[#e8b84b]/40 bg-[#1a3d2c] hover:bg-[#23523b] flex items-center justify-center text-[#fbf4e2] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Summary Metrics Strip */}
        <div
          className="grid grid-cols-2 sm:grid-cols-5 gap-2 px-4 py-2.5 sm:px-5 border-b border-[#e8b84b]/20 text-xs font-mono-tabular"
          style={{ backgroundColor: '#0f251b' }}
        >
          <div className="rounded-lg border border-[#38bdf8]/30 bg-[#0d2117] px-3 py-1.5">
            <div className="text-[10px] uppercase tracking-wider text-[#93c5fd]">Security Rating</div>
            <div className="text-sm sm:text-base font-bold text-[#38bdf8]" data-testid="security-rating-val">
              {snapshot.securityRating}%
            </div>
          </div>
          <div className="rounded-lg border border-[#4ade80]/30 bg-[#0d2117] px-3 py-1.5">
            <div className="text-[10px] uppercase tracking-wider text-[#86efac]">Crimes Prevented</div>
            <div className="text-sm sm:text-base font-bold text-[#4ade80]" data-testid="crimes-prevented-val">
              {snapshot.crimesPrevented}
            </div>
          </div>
          <div className="rounded-lg border border-[#e8b84b]/30 bg-[#0d2117] px-3 py-1.5">
            <div className="text-[10px] uppercase tracking-wider text-[#fde68a]">Resolved</div>
            <div className="text-sm sm:text-base font-bold text-[#f5c756]" data-testid="emergencies-resolved-val">
              {snapshot.emergenciesResolved}
            </div>
          </div>
          <div className="rounded-lg border border-[#f87171]/30 bg-[#0d2117] px-3 py-1.5">
            <div className="text-[10px] uppercase tracking-wider text-[#fca5a5]">Active Alerts</div>
            <div className="text-sm sm:text-base font-bold text-[#f87171]" data-testid="active-alerts-val">
              {snapshot.activeMissions.length}
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1 rounded-lg border border-[#e8b84b]/25 bg-[#0d2117] px-3 py-1.5">
            <div className="text-[10px] uppercase tracking-wider text-[#cbbd98]">Missed / Failed</div>
            <div className="text-sm sm:text-base font-bold text-[#e2e8f0]">
              {snapshot.emergenciesFailed}
            </div>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: Active Emergencies & Investigations */}
          <div className="lg:col-span-7 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-bold text-sm text-[#e8b84b] flex items-center gap-1.5">
                <Siren className="w-4 h-4 text-[#f87171]" />
                <span>Active Emergencies &amp; Crime Incidents ({snapshot.activeMissions.length})</span>
              </h3>
              <span className="text-[11px] text-[#cbbd98]">
                Click incident to inspect &amp; dispatch police
              </span>
            </div>

            {snapshot.activeMissions.length === 0 ? (
              <div
                className="rounded-xl border border-[#4ade80]/30 bg-[#0d2117] p-5 text-center"
                data-testid="no-active-missions"
              >
                <CheckCircle2 className="w-7 h-7 text-[#4ade80] mx-auto mb-2" />
                <div className="font-display font-bold text-sm text-[#fbf4e2]">
                  All Platforms Calm &amp; Secure
                </div>
                <p className="mt-1 text-xs text-[#cbbd98]">
                  শাপলাপুর জংশন নিরাপদ আছে। GRP এবং বাংলাদেশ পুলিশ নিয়মিত টহল দিচ্ছে। New random
                  crime or station emergencies will appear automatically as trains and crowds arrive.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {snapshot.activeMissions.map((mission) => {
                  const isSelected = selectedMission?.id === mission.id;
                  const timeLeft = Math.max(0, Math.ceil(mission.timeRemainingSec));
                  return (
                    <div
                      key={mission.id}
                      data-testid={`mission-card-${mission.kind}`}
                      onClick={() => setSelectedMissionId(mission.id)}
                      className={`rounded-xl border p-3.5 cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-[#f5c756] bg-[#173a29]'
                          : 'border-[#e8b84b]/25 bg-[#0e2419] hover:bg-[#143224]'
                      }`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${severityBadge(
                                mission.severity,
                              )}`}
                            >
                              {mission.severity}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${statusBadge(
                                mission.status,
                              )}`}
                            >
                              {formatStatusLabel(mission.status)}
                            </span>
                            {mission.isCrime && (
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#4c0519] text-[#fda4af] border border-[#fb7185]/35">
                                Crime Alert
                              </span>
                            )}
                          </div>
                          <div className="mt-1.5 font-display font-bold text-sm sm:text-base text-[#fbf4e2]">
                            {mission.title} · <span className="text-[#f5c756]">{mission.titleBn}</span>
                          </div>
                        </div>

                        <div className="text-right font-mono-tabular shrink-0">
                          <div
                            className={`text-sm font-bold ${
                              timeLeft <= 35 ? 'text-[#f87171]' : 'text-[#fde68a]'
                            }`}
                          >
                            {timeLeft}s left
                          </div>
                          <div className="text-[10px] text-[#cbbd98] flex items-center justify-end gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-[#e8b84b]" />
                            <span>{mission.locationLabel}</span>
                          </div>
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-[#dfd5bc] leading-relaxed">
                        {mission.objective}
                      </p>
                      <p className="mt-0.5 text-[11px] text-[#9ec4b0]">{mission.objectiveBn}</p>

                      {/* Clues Collected */}
                      {mission.cluesCollected.length > 0 && (
                        <div className="mt-2 rounded-lg bg-[#0b1c14] border border-[#facc15]/30 p-2">
                          <div className="text-[10px] font-bold uppercase text-[#facc15] flex items-center gap-1">
                            <Search className="w-3 h-3" />
                            <span>Evidence / Witness Clues ({mission.cluesCollected.length})</span>
                          </div>
                          <ul className="mt-1 space-y-0.5 text-[11px] text-[#fef9c3]">
                            {mission.cluesCollected.map((clue, idx) => (
                              <li key={idx}>• {clue}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Action Row */}
                      <div
                        className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#e8b84b]/15"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="text-[11px] text-[#cbbd98] font-mono-tabular">
                          Reward: <span className="text-[#f5c756]">+{mission.rewardMoney} coins</span> ·{' '}
                          <span className="text-[#86efac]">+{mission.rewardXp} XP</span> ·{' '}
                          <span>
                            Police Assigned: {mission.assignedOfficerIds.length}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            data-testid="dispatch-nearest-officer-btn"
                            onClick={() => actions.dispatchOfficer(mission.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Dispatch Nearest Police</span>
                          </button>

                          <button
                            type="button"
                            data-testid="broadcast-emergency-pa-btn"
                            onClick={() => actions.broadcastEmergencyPa(mission.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-[#9a3412] hover:bg-[#c2410c] text-white text-xs font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Megaphone className="w-3.5 h-3.5" />
                            <span>Bangla PA Alert</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Recent Security Log */}
            {snapshot.recentResolvedMissions.length > 0 && (
              <div className="mt-1 rounded-xl border border-[#e8b84b]/20 bg-[#0d2117] p-3">
                <div className="text-xs font-display font-bold text-[#d4c6a3] mb-2">
                  Recent Incident Log
                </div>
                <div className="space-y-1.5">
                  {snapshot.recentResolvedMissions.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-2 text-[11px] px-2.5 py-1.5 rounded-lg bg-[#122b1f] border border-[#e8b84b]/15"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        {item.status === 'resolved' ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#4ade80] shrink-0" />
                        ) : (
                          <AlertTriangle className="w-3.5 h-3.5 text-[#f87171] shrink-0" />
                        )}
                        <span className="truncate font-semibold text-[#fbf4e2]">{item.title}</span>
                        <span className="text-[#cbbd98] shrink-0">({item.locationLabel})</span>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          item.status === 'resolved'
                            ? 'bg-[#14532d] text-[#bbf7d0]'
                            : 'bg-[#450a0a] text-[#fca5a5]'
                        }`}
                      >
                        {item.status === 'resolved' ? 'Resolved' : 'Missed'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Police Roster & Achievements */}
          <div className="lg:col-span-5 flex flex-col gap-3">
            {/* Security Personnel Roster */}
            <div className="rounded-xl border border-[#38bdf8]/30 bg-[#0d2117] p-3.5">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="font-display font-bold text-sm text-[#38bdf8] flex items-center gap-1.5">
                  <Shield className="w-4 h-4" />
                  <span>Station Police Roster ({snapshot.officers.length})</span>
                </h3>
                <span className="text-[10px] uppercase tracking-wider text-[#93c5fd]">
                  Live A* Foot Patrol
                </span>
              </div>

              <div className="space-y-2">
                {snapshot.officers.map((off) => (
                  <div
                    key={off.npcId}
                    data-testid={`officer-card-${off.npcId}`}
                    className="rounded-lg border border-[#38bdf8]/25 bg-[#122b1f] p-2.5 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs text-[#fbf4e2] truncate">
                          {off.name} ({off.nameBn})
                        </span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                            off.role === 'bd_police'
                              ? 'bg-[#1e3a8a] text-[#bfdbfe]'
                              : 'bg-[#065f46] text-[#a7f3d0]'
                          }`}
                        >
                          {off.role === 'bd_police' ? 'BD Police' : 'GRP Rail'}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-[#93c5fd] font-mono-tabular">
                        {off.statusLabel} · {off.locationLabel}
                      </div>
                    </div>

                    {selectedMission && (
                      <button
                        type="button"
                        data-testid={`dispatch-officer-${off.npcId}`}
                        onClick={() => actions.dispatchOfficer(selectedMission.id, off.npcId)}
                        className="px-2 py-1.5 rounded-md bg-[#0369a1] hover:bg-[#0284c7] text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                      >
                        {off.assignedMissionId === selectedMission.id ? 'Re-Ping' : 'Assign'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Security Achievements */}
            <div className="rounded-xl border border-[#e8b84b]/30 bg-[#0d2117] p-3.5">
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="font-display font-bold text-sm text-[#f5c756] flex items-center gap-1.5">
                  <Award className="w-4 h-4" />
                  <span>
                    Station Master Medals ({unlockedCount}/{snapshot.achievements.length})
                  </span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2">
                {snapshot.achievements.map((ach) => (
                  <div
                    key={ach.id}
                    data-testid={`achievement-${ach.id}`}
                    className={`rounded-lg border p-2.5 transition-colors ${
                      ach.unlocked
                        ? 'border-[#f5c756]/70 bg-[#1a3f2d]'
                        : 'border-[#e8b84b]/15 bg-[#0b1c14] opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-[#fbf4e2]">{ach.title}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          ach.unlocked
                            ? 'bg-[#f5c756] text-[#14241b]'
                            : 'bg-[#1e3529] text-[#9ca3af]'
                        }`}
                      >
                        {ach.unlocked ? `Day ${ach.unlockedDay ?? 1}` : 'Locked'}
                      </span>
                    </div>
                    <div className="text-[10px] text-[#f5c756]/90 mt-0.5">{ach.titleBn}</div>
                    <div className="text-[11px] text-[#cbbd98] mt-1 leading-snug">
                      {ach.description}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
