import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  GitBranch,
  Lock,
  Megaphone,
  OctagonAlert,
  Play,
  ShieldCheck,
  TrainFront,
  Unlock,
  X,
} from 'lucide-react';
import { formatGameTime } from '../game/rules';
import { TRAIN_CATEGORY_SPECS } from '../game/trainManager';
import {
  VipSecurityControlPanel,
  type VipSecurityControlActions,
} from './VipSecurityControlPanel';
import type {
  ManagedTrain,
  SignalAspect,
  TrackId,
  TrainDashboardSnapshot,
  VipSecurityProtocol,
} from '../game/types';

export interface TrainControlCallbacks {
  assignPlatform: (trainId: string, platform: TrackId) => void;
  setSignal: (track: TrackId, aspect: SignalAspect) => void;
  toggleSwitch: () => void;
  toggleCrossingGate: () => void;
  toggleEmergencyStop: (trainId: string) => void;
  authorizeDeparture: (trainId: string) => void;
  advanceDepartureSequence: (
    trainId: string,
    step: 'announce_boarding' | 'safety_checks' | 'close_doors',
  ) => void;
  resolveOperationalEvent: (trainId: string, choice?: 'primary' | 'secondary') => void;
  announceTrain: (trainId: string) => void;
  announceSafety: () => void;
}

interface TrainDashboardModalProps {
  snapshot: TrainDashboardSnapshot;
  actions: TrainControlCallbacks;
  vipProtocol?: VipSecurityProtocol | null;
  vipActions?: VipSecurityControlActions;
  onClose: () => void;
}

type TimetableFilter = 'all' | 'active' | 'delayed' | 'departed';

const STATUS_BADGE_STYLES: Record<ManagedTrain['status'], string> = {
  Scheduled: 'bg-[#1a3326] text-[#cbd5c0] border-[#4b6b58]',
  Approaching: 'bg-[#3d2e10] text-[#f7c85c] border-[#d99b26]',
  Arriving: 'bg-[#163d4a] text-[#7dd3fc] border-[#38bdf8]',
  'At Platform': 'bg-[#12452b] text-[#6ee7b7] border-[#34d399]',
  Boarding: 'bg-[#144b2f] text-[#86efac] border-[#4ade80]',
  Departing: 'bg-[#2a385c] text-[#a5b4fc] border-[#818cf8]',
  Delayed: 'bg-[#4c1d1b] text-[#fca5a5] border-[#f87171]',
  Departed: 'bg-[#1f2924] text-[#8ca092] border-[#374c3f]',
};

export function TrainDashboardModal({
  snapshot,
  actions,
  vipProtocol = null,
  vipActions,
  onClose,
}: TrainDashboardModalProps) {
  const [filter, setFilter] = useState<TimetableFilter>('all');

  const filteredTrains = useMemo(() => {
    return snapshot.trains.filter((t) => {
      if (filter === 'active') {
        return (
          t.status === 'Approaching' ||
          t.status === 'Arriving' ||
          t.status === 'At Platform' ||
          t.status === 'Boarding' ||
          t.status === 'Departing'
        );
      }
      if (filter === 'delayed') {
        return t.delayMinutes > 0 || t.status === 'Delayed';
      }
      if (filter === 'departed') {
        return t.status === 'Departed';
      }
      return true;
    });
  }, [snapshot.trains, filter]);

  const activeTracks = useMemo(
    () => Array.from({ length: snapshot.unlockedTracks }, (_, i) => (i + 1) as TrackId),
    [snapshot.unlockedTracks],
  );

  const vipActive = Boolean(vipProtocol?.active);
  const vipLockedSet = useMemo(
    () =>
      new Set<TrackId>(
        vipProtocol?.active
          ? vipProtocol.lockedPlatforms
          : (snapshot.vipLockedPlatforms ?? []),
      ),
    [vipProtocol, snapshot.vipLockedPlatforms],
  );
  const vipDesignatedSet = useMemo(
    () => new Set<TrackId>(vipProtocol?.active ? vipProtocol.designatedPlatforms ?? [] : []),
    [vipProtocol],
  );

  const renderSignalButtons = (track: TrackId, current: SignalAspect) => {
    const aspects: { id: SignalAspect; label: string; activeCls: string }[] = [
      { id: 'red', label: 'RED', activeCls: 'bg-[#dc2626] text-white border-[#f87171]' },
      { id: 'yellow', label: 'YELLOW', activeCls: 'bg-[#d97706] text-white border-[#fbbf24]' },
      { id: 'green', label: 'GREEN', activeCls: 'bg-[#16a34a] text-white border-[#4ade80]' },
    ];
    return (
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        {aspects.map((a) => (
          <button
            key={a.id}
            type="button"
            data-testid={`track${track}-sig-${a.id}`}
            onClick={(e) => {
              e.stopPropagation();
              actions.setSignal(track, a.id);
            }}
            className={`px-2.5 py-1.5 min-h-[34px] rounded-md text-[11px] font-bold border cursor-pointer transition-colors ${
              current === a.id
                ? a.activeCls
                : 'bg-[#0c1d14] text-[#cbbd98] border-[#e8b84b]/25 hover:bg-[#173526]'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4"
      style={{ backgroundColor: 'rgba(8, 18, 13, 0.82)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="train-dashboard-title"
      data-testid="train-dashboard-modal"
    >
      <div
        className="w-full max-w-5xl max-h-[94vh] rounded-xl border border-[#e8b84b]/55 shadow-2xl text-[#fbf4e2] flex flex-col overflow-hidden"
        style={{ backgroundColor: '#122a1e' }}
      >
        {/* Top Bar */}
        <div className="px-4 py-3 sm:px-5 border-b border-[#e8b84b]/30 flex items-center justify-between gap-3 bg-[#0e2218]">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <TrainFront className="w-5 h-5 text-[#f5c756] shrink-0" />
              <h2
                id="train-dashboard-title"
                className="font-display font-bold text-base sm:text-xl truncate"
              >
                Train Control Room · শাপলাপুর জংশন
              </h2>
            </div>
            <div className="mt-0.5 text-xs text-[#d4c6a3] font-mono-tabular flex flex-wrap items-center gap-x-2">
              <span>Day {snapshot.dayNumber}</span>
              <span>·</span>
              <span>{snapshot.timeFormatted}</span>
              <span>·</span>
              <span>{snapshot.unlockedTracks} Mainline Tracks &amp; Crossover Points</span>
            </div>
          </div>
          <button
            type="button"
            data-testid="close-train-dashboard-btn"
            aria-label="Close Train Control Dashboard"
            onClick={onClose}
            className="min-w-[40px] h-10 px-3 rounded-lg bg-[#1c3e2d] hover:bg-[#25523c] border border-[#e8b84b]/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Close [T]</span>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
          {/* Dynamic Track & Signal Schematic Panel */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeTracks.map((trackNum) => {
              const occ = snapshot.trackOccupancies[trackNum] ?? {
                track: trackNum,
                occupied: false,
                westApproachTrainId: null,
                platformTrainId: null,
                eastApproachTrainId: null,
              };
              const sig = snapshot.trackSignals[trackNum] ?? 'red';
              const trackTrain = snapshot.trains.find(
                (t) =>
                  t.id === occ.platformTrainId ||
                  t.id === occ.westApproachTrainId ||
                  t.id === occ.eastApproachTrainId,
              );
              const isVipLocked = vipLockedSet.has(trackNum);
              const isVipDesignated = vipDesignatedSet.has(trackNum);
              const canToggleSecure = vipActive && Boolean(vipActions);
              return (
                <div
                  key={trackNum}
                  data-testid={`track-platform-card-${trackNum}`}
                  onClick={
                    canToggleSecure ? () => vipActions?.toggleSecurePlatform(trackNum) : undefined
                  }
                  className={`rounded-lg border p-3 space-y-2.5 transition-colors ${
                    canToggleSecure ? 'cursor-pointer' : ''
                  } ${
                    isVipLocked
                      ? 'border-[#ef4444]/85 bg-[#241212]'
                      : isVipDesignated
                        ? 'border-[#f59e0b]/85 bg-[#241d10]'
                        : 'border-[#e8b84b]/30 bg-[#0d2016]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#f5c756]">
                          Track {trackNum} · Platform {trackNum}
                        </span>
                        {isVipLocked && (
                          <span
                            data-testid={`track${trackNum}-vip-lock-badge`}
                            className="px-1.5 py-0.2 rounded bg-[#b91c1c] text-white text-[10px] font-bold flex items-center gap-1"
                          >
                            <Lock className="w-2.5 h-2.5" />
                            VIP SECURED
                          </span>
                        )}
                        {!isVipLocked && isVipDesignated && (
                          <span className="px-1.5 py-0.2 rounded bg-[#92400e] text-[#fef3c7] text-[10px] font-bold">
                            VIP TARGET
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-[#d4c6a3] mt-0.5">
                        {isVipLocked
                          ? 'Platform Locked — Regular train arrivals blocked'
                          : trackTrain
                            ? `${trackTrain.name} (#${trackTrain.trainNumber}) — ${trackTrain.status}`
                            : 'Clear — Ready for incoming assignment'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {canToggleSecure && (
                        <button
                          type="button"
                          data-testid={`vip-secure-platform-${trackNum}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            vipActions?.toggleSecurePlatform(trackNum);
                          }}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold border flex items-center gap-1 cursor-pointer ${
                            isVipLocked
                              ? 'bg-[#7f1d1d] hover:bg-[#991b1b] text-[#fee2e2] border-[#f87171]'
                              : 'bg-[#e8b84b] hover:bg-[#f2c65e] text-[#14241b] border-[#fde68a]'
                          }`}
                        >
                          {isVipLocked ? (
                            <>
                              <Lock className="w-3 h-3" />
                              <span>Secured</span>
                            </>
                          ) : (
                            <>
                              <Unlock className="w-3 h-3" />
                              <span>Secure</span>
                            </>
                          )}
                        </button>
                      )}
                      <span
                        data-testid={`track${trackNum}-occupancy-badge`}
                        className={`px-2 py-0.5 rounded text-[11px] font-bold border ${
                          occ.occupied
                            ? 'bg-[#4c1d1b] text-[#fca5a5] border-[#ef4444]'
                            : 'bg-[#12452b] text-[#86efac] border-[#22c55e]'
                        }`}
                      >
                        {occ.occupied ? 'OCCUPIED' : 'FREE'}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#e8b84b]/15">
                    <span className="text-[11px] text-[#cbbd98] font-medium">3-Aspect Signal:</span>
                    {renderSignalButtons(trackNum, sig)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Switch, Crossing & Safety PA Controls */}
          <div className="rounded-lg border border-[#e8b84b]/25 bg-[#0e2218] p-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                data-testid="toggle-switch-btn"
                onClick={actions.toggleSwitch}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                  snapshot.switchPosition === 'crossover'
                    ? 'bg-[#92400e] border-[#f59e0b] text-[#fef3c7]'
                    : 'bg-[#163827] border-[#e8b84b]/35 text-[#fbf4e2] hover:bg-[#1e4b34]'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5 text-[#f5c756]" />
                <span>
                  Switch: {snapshot.switchPosition === 'crossover' ? 'CROSSOVER' : 'STRAIGHT'}
                </span>
              </button>

              <button
                type="button"
                data-testid="toggle-crossing-btn"
                onClick={actions.toggleCrossingGate}
                className={`min-h-[38px] px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
                  snapshot.crossingGateClosed
                    ? 'bg-[#144b2f] border-[#4ade80] text-[#dcfce7]'
                    : 'bg-[#4c1d1b] border-[#f87171] text-[#fee2e2]'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>
                  East Crossing: {snapshot.crossingGateClosed ? 'GATE CLOSED (SAFE)' : 'GATE OPEN'}
                </span>
              </button>
            </div>

            <button
              type="button"
              data-testid="safety-announce-btn"
              onClick={actions.announceSafety}
              className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#e8b84b] hover:bg-[#f2c65e] text-[#14241b] text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Yellow-Line Safety PA (বাংলা)</span>
            </button>
          </div>

          {/* Emergency VIP Security Trigger & Control Room Verification Panel */}
          {vipActions && (
            <VipSecurityControlPanel protocol={vipProtocol} actions={vipActions} />
          )}

          {/* Safety Alerts Strip */}
          {snapshot.alerts.length > 0 ? (
            <div className="space-y-1.5" data-testid="safety-alerts-strip">
              {snapshot.alerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-lg border px-3 py-2 text-xs flex items-center gap-2 ${
                    alert.severity === 'critical'
                      ? 'bg-[#451717] border-[#ef4444] text-[#fecaca]'
                      : alert.severity === 'warning'
                        ? 'bg-[#3f2c0d] border-[#f59e0b] text-[#fde68a]'
                        : 'bg-[#123626] border-[#34d399] text-[#a7f3d0]'
                  }`}
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{alert.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-[#22c55e]/40 bg-[#103020] px-3 py-2 text-xs text-[#bbf7d0] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#4ade80] shrink-0" />
              <span>All track blocks clear. Automated Train Protection active.</span>
            </div>
          )}

          {/* Timetable Filter Tabs */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-display font-bold text-sm sm:text-base text-[#fbf4e2]">
              Daily Railway Timetable ({filteredTrains.length})
            </h3>
            <div className="flex items-center gap-1 p-1 rounded-lg bg-[#0c1d14] border border-[#e8b84b]/20">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'active', label: 'Active' },
                  { id: 'delayed', label: 'Delayed' },
                  { id: 'departed', label: 'Departed' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id)}
                  className={`px-2.5 py-1 rounded text-xs font-semibold cursor-pointer transition-colors ${
                    filter === tab.id
                      ? 'bg-[#e8b84b] text-[#14241b]'
                      : 'text-[#d4c6a3] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Train Cards List */}
          <div className="space-y-2.5">
            {filteredTrains.map((train) => {
              const spec = TRAIN_CATEGORY_SPECS[train.category];
              const effectiveArr = train.scheduledArrivalMin + train.delayMinutes;
              const effectiveDep = train.scheduledDepartureMin + train.delayMinutes;
              const canAssign =
                train.status === 'Scheduled' ||
                train.status === 'Delayed' ||
                train.status === 'Approaching';
              const canDepart = train.status === 'At Platform' || train.status === 'Boarding';
              const isMovingOrLive =
                train.status !== 'Scheduled' &&
                train.status !== 'Delayed' &&
                train.status !== 'Departed';

              const isPassengerTrain = !spec.isCargo && train.passengerCapacity > 0;
              const occPct = isPassengerTrain
                ? Math.min(100, Math.round((train.currentPassengers / Math.max(1, train.passengerCapacity)) * 100))
                : 0;
              const seatsFree = Math.max(0, train.passengerCapacity - train.currentPassengers);
              const doorBadgeLabel = train.doorsObstructed
                ? 'Door Jammed'
                : train.doorState === 'open'
                  ? 'Doors Open'
                  : train.doorState === 'opening'
                    ? 'Opening Doors'
                    : train.doorState === 'closing'
                      ? 'Closing Doors'
                      : 'Doors Closed';
              const doorBadgeClass = train.doorsObstructed
                ? 'bg-[#5c1c1c] text-[#fecaca] border-[#ef4444]'
                : train.doorState === 'open'
                  ? 'bg-[#12452b] text-[#86efac] border-[#22c55e]'
                  : train.doorState === 'opening' || train.doorState === 'closing'
                    ? 'bg-[#3d2e10] text-[#fde68a] border-[#f59e0b]'
                    : 'bg-[#1f2924] text-[#9cb4a4] border-[#374c3f]';

              return (
                <div
                  key={train.id}
                  data-testid={`train-row-${train.trainNumber}`}
                  className="rounded-lg border border-[#e8b84b]/25 bg-[#0d2016] p-3 space-y-2.5"
                >
                  <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide text-white"
                          style={{ backgroundColor: spec.accentHex }}
                        >
                          {spec.label}
                        </span>
                        <span className="font-display font-bold text-sm text-[#fbf4e2]">
                          #{train.trainNumber} {train.name}
                        </span>
                        <span className="text-xs text-[#d4c6a3]">({train.nameBn})</span>
                        <span
                          className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${
                            STATUS_BADGE_STYLES[train.status]
                          }`}
                        >
                          {train.status}
                        </span>
                        {isPassengerTrain && (
                          <span
                            data-testid={`door-state-${train.trainNumber}`}
                            className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${doorBadgeClass}`}
                          >
                            {doorBadgeLabel}
                          </span>
                        )}
                        {train.delayMinutes > 0 && (
                          <span className="px-2 py-0.5 rounded bg-[#5c1c1c] text-[#fecaca] text-[11px] font-bold">
                            +{train.delayMinutes}m Delay
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#d4c6a3] font-mono-tabular">
                        <span className="flex items-center gap-1 text-[#fbf4e2]">
                          {train.origin} <ArrowRight className="w-3 h-3 text-[#e8b84b]" />{' '}
                          {train.destination}
                        </span>
                        <span>
                          Arr: <strong className="text-[#fbf4e2]">{formatGameTime(effectiveArr)}</strong>
                        </span>
                        <span>
                          Dep: <strong className="text-[#fbf4e2]">{formatGameTime(effectiveDep)}</strong>
                        </span>
                        <span>
                          Platform:{' '}
                          <strong className="text-[#f5c756]">
                            {train.assignedPlatform ? `Platform ${train.assignedPlatform}` : 'Unassigned'}
                          </strong>
                        </span>
                        {!isPassengerTrain && <span className="text-[#9cb4a4]">{train.capacityLabel}</span>}
                      </div>

                      {isPassengerTrain && (
                        <div className="space-y-1 pt-0.5">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono-tabular">
                            <span className="text-[#e8dfc6]" data-testid={`capacity-text-${train.trainNumber}`}>
                              Passengers:{' '}
                              <strong className="text-[#f5c756]">
                                {train.currentPassengers} / {train.passengerCapacity}
                              </strong>{' '}
                              ({occPct}% · {seatsFree} seats free)
                            </span>
                            {train.coaches.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1">
                                {train.coaches.map((c) => (
                                  <span
                                    key={c.coachIndex}
                                    data-testid={`coach-occ-${train.trainNumber}-${c.coachNumber}`}
                                    className={`px-1.5 py-0.5 rounded border text-[10px] ${
                                      c.doorObstructed
                                        ? 'bg-[#5c1c1c] border-[#ef4444] text-[#fecaca]'
                                        : c.passengers >= c.capacity
                                          ? 'bg-[#3f2c0d] border-[#f59e0b] text-[#fde68a]'
                                          : 'bg-[#122e20] border-[#e8b84b]/25 text-[#d4c6a3]'
                                    }`}
                                  >
                                    {c.coachNumber} ({c.coachNumberBn}): {c.passengers}/{c.capacity}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="h-1.5 w-full max-w-md rounded-full bg-[#132c1f] overflow-hidden">
                            <div
                              className={`h-full transition-all duration-200 ${
                                occPct >= 95 ? 'bg-[#ef4444]' : occPct >= 75 ? 'bg-[#f59e0b]' : 'bg-[#36c478]'
                              }`}
                              style={{ width: `${occPct}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {(train.holdingReason || train.status === 'Boarding') && (
                        <div className="flex flex-wrap items-center gap-3 text-[11px]">
                          {train.holdingReason && (
                            <span className="text-[#fbbf24] font-semibold">
                              Hold: {train.holdingReason}
                            </span>
                          )}
                          {train.status === 'Boarding' && (
                            <span className="text-[#86efac]">
                              Boarding Progress: {Math.round(train.boardingProgress * 100)}%
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Interactive Train Controls */}
                    <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                      {canAssign &&
                        activeTracks.map((pNum) => {
                          const isVipLocked = vipLockedSet.has(pNum);
                          return (
                            <button
                              key={pNum}
                              type="button"
                              disabled={isVipLocked}
                              title={
                                isVipLocked
                                  ? `Platform ${pNum} is Secured (Locked) for active VIP Protocol`
                                  : `Assign Platform ${pNum}`
                              }
                              data-testid={`assign-p${pNum}-${train.trainNumber}`}
                              onClick={() => actions.assignPlatform(train.id, pNum)}
                              className={`min-h-[36px] px-2.5 py-1.5 rounded-md text-xs font-bold border ${
                                isVipLocked
                                  ? 'bg-[#3d1818] text-[#fca5a5] border-[#ef4444]/60 opacity-65 cursor-not-allowed'
                                  : train.assignedPlatform === pNum
                                    ? 'bg-[#e8b84b] text-[#14241b] border-[#f5c756] cursor-pointer'
                                    : 'bg-[#163827] text-[#fbf4e2] border-[#e8b84b]/35 hover:bg-[#1f4d36] cursor-pointer'
                              }`}
                            >
                              {isVipLocked
                                ? `P${pNum} Locked`
                                : snapshot.unlockedTracks > 2
                                  ? `P${pNum}`
                                  : `Platform ${pNum}`}
                            </button>
                          );
                        })}

                      {canDepart && (
                        <button
                          type="button"
                          data-testid={`depart-btn-${train.trainNumber}`}
                          onClick={() => actions.authorizeDeparture(train.id)}
                          className="min-h-[36px] px-3 py-1.5 rounded-md bg-[#16a34a] hover:bg-[#15803d] text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Dispatch</span>
                        </button>
                      )}

                      {isMovingOrLive && (
                        <button
                          type="button"
                          data-testid={`estop-btn-${train.trainNumber}`}
                          onClick={() => actions.toggleEmergencyStop(train.id)}
                          className={`min-h-[36px] px-2.5 py-1.5 rounded-md text-xs font-bold flex items-center gap-1 cursor-pointer border ${
                            train.emergencyStopped
                              ? 'bg-[#d97706] text-white border-[#fbbf24]'
                              : 'bg-[#7f1d1d] hover:bg-[#991b1b] text-[#fee2e2] border-[#ef4444]'
                          }`}
                        >
                          <OctagonAlert className="w-3.5 h-3.5" />
                          <span>{train.emergencyStopped ? 'Release' : 'E-Stop'}</span>
                        </button>
                      )}

                      {train.status !== 'Departed' && (
                        <button
                          type="button"
                          data-testid={`announce-btn-${train.trainNumber}`}
                          onClick={() => actions.announceTrain(train.id)}
                          className="min-h-[36px] px-2.5 py-1.5 rounded-md bg-[#183828] hover:bg-[#214b36] border border-[#e8b84b]/30 text-xs font-semibold text-[#f5c756] flex items-center gap-1 cursor-pointer"
                        >
                          <Megaphone className="w-3.5 h-3.5" />
                          <span>PA (বাংলা)</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Operational Event Resolution Strip */}
                  {train.operationalEvent && !train.operationalEvent.resolved && (
                    <div
                      data-testid={`op-event-banner-${train.trainNumber}`}
                      className="rounded-md border border-[#f59e0b]/60 bg-[#32210b] px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                    >
                      <div className="space-y-0.5 text-xs">
                        <div className="font-bold text-[#fde68a] flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-[#f59e0b] shrink-0" />
                          <span>
                            {train.operationalEvent.title} ({train.operationalEvent.coachNumber}) ·{' '}
                            {train.operationalEvent.titleBn}
                          </span>
                          {train.operationalEvent.blocksDeparture && (
                            <span className="px-1.5 py-0.2 rounded bg-[#991b1b] text-[#fecaca] text-[10px]">
                              Blocks Departure
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#f3dfb8]">
                          {train.operationalEvent.description}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          data-testid={`resolve-op-${train.trainNumber}`}
                          onClick={() => actions.resolveOperationalEvent(train.id, 'primary')}
                          className="min-h-[32px] px-2.5 py-1 rounded bg-[#e8b84b] hover:bg-[#f2c65e] text-[#14241b] text-[11px] font-bold cursor-pointer"
                        >
                          {train.operationalEvent.primaryActionLabel}
                        </button>
                        {train.operationalEvent.secondaryActionLabel && (
                          <button
                            type="button"
                            data-testid={`resolve-op-sec-${train.trainNumber}`}
                            onClick={() => actions.resolveOperationalEvent(train.id, 'secondary')}
                            className="min-h-[32px] px-2.5 py-1 rounded bg-[#163827] hover:bg-[#1f4d36] border border-[#e8b84b]/40 text-[#fbf4e2] text-[11px] font-semibold cursor-pointer"
                          >
                            {train.operationalEvent.secondaryActionLabel}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Multi-Stage Departure Preparation Checklist */}
                  {canDepart && isPassengerTrain && (
                    <div
                      data-testid={`departure-seq-${train.trainNumber}`}
                      className="rounded-md border border-[#e8b84b]/20 bg-[#0a1a12] px-3 py-2 flex flex-wrap items-center justify-between gap-2"
                    >
                      <div className="flex flex-wrap items-center gap-2 text-[11px] text-[#cbbd98]">
                        <span className="font-bold uppercase tracking-wider text-[#f5c756]">
                          Departure Seq:
                        </span>
                        <span
                          className={
                            train.departureStage !== 'idle' ? 'text-[#86efac] font-semibold' : ''
                          }
                        >
                          1. Boarding PA
                        </span>
                        <span>→</span>
                        <span
                          className={
                            train.safetyChecksPassed ? 'text-[#86efac] font-semibold' : ''
                          }
                        >
                          2. Safety &amp; Clearance
                        </span>
                        <span>→</span>
                        <span
                          className={
                            train.doorState === 'closing' || train.doorState === 'closed'
                              ? 'text-[#86efac] font-semibold'
                              : ''
                          }
                        >
                          3. Close Doors
                        </span>
                        <span>→</span>
                        <span>4. Signal &amp; Dispatch</span>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          data-testid={`seq-pa-${train.trainNumber}`}
                          onClick={() =>
                            actions.advanceDepartureSequence(train.id, 'announce_boarding')
                          }
                          className="min-h-[30px] px-2 py-1 rounded bg-[#163827] hover:bg-[#1f4d36] border border-[#e8b84b]/35 text-[11px] font-semibold text-[#fbf4e2] cursor-pointer"
                        >
                          Boarding PA
                        </button>
                        <button
                          type="button"
                          data-testid={`seq-safety-${train.trainNumber}`}
                          onClick={() =>
                            actions.advanceDepartureSequence(train.id, 'safety_checks')
                          }
                          className={`min-h-[30px] px-2 py-1 rounded border text-[11px] font-semibold cursor-pointer ${
                            train.safetyChecksPassed
                              ? 'bg-[#12452b] border-[#22c55e] text-[#86efac]'
                              : 'bg-[#163827] hover:bg-[#1f4d36] border-[#e8b84b]/35 text-[#fbf4e2]'
                          }`}
                        >
                          {train.safetyChecksPassed ? 'Safety OK' : 'Safety Check'}
                        </button>
                        <button
                          type="button"
                          data-testid={`seq-doors-${train.trainNumber}`}
                          onClick={() =>
                            actions.advanceDepartureSequence(train.id, 'close_doors')
                          }
                          className="min-h-[30px] px-2 py-1 rounded bg-[#163827] hover:bg-[#1f4d36] border border-[#e8b84b]/35 text-[11px] font-semibold text-[#fbf4e2] cursor-pointer"
                        >
                          Close Doors
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
