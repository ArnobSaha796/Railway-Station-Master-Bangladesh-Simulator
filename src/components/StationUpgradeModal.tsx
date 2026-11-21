import {
  ArrowUpRight,
  Building2,
  CheckCircle2,
  Coins,
  Lock,
  Sparkles,
  TrainTrack,
  X,
} from 'lucide-react';
import { CHAPTER2_UPGRADE_TIERS, STATION_UPGRADE_TIERS } from '../game/progression';
import type { StationUpgradeSnapshot } from '../game/types';

export interface StationUpgradeCallbacks {
  purchaseUpgrade: () => void;
}

interface StationUpgradeModalProps {
  snapshot: StationUpgradeSnapshot;
  actions: StationUpgradeCallbacks;
  onClose: () => void;
}

export function StationUpgradeModal({
  snapshot,
  actions,
  onClose,
}: StationUpgradeModalProps) {
  const { currentTier, nextTier, requirements, allRequirementsMet, canAfford, canUpgradeNow } =
    snapshot;

  const isCh2 = snapshot.unlockedTracks >= 7 || snapshot.nextTier?.tracksUnlocked === 8;
  const maxTracks = isCh2 ? 8 : 6;
  const roadmapTiers = isCh2 ? CHAPTER2_UPGRADE_TIERS : STATION_UPGRADE_TIERS;
  const isTrackExpansion = Boolean(nextTier && nextTier.tracksUnlocked > snapshot.unlockedTracks);

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4"
      style={{ backgroundColor: 'rgba(8, 18, 13, 0.84)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="station-upgrade-title"
      data-testid="station-upgrade-modal"
    >
      <div
        className="w-full max-w-4xl max-h-[94vh] rounded-xl border border-[#e8b84b]/55 shadow-2xl text-[#fbf4e2] flex flex-col overflow-hidden"
        style={{ backgroundColor: '#122a1e' }}
      >
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 border-b border-[#e8b84b]/30 flex items-center justify-between gap-3 bg-[#0e2218]">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-[#f5c756] shrink-0" />
              <h2
                id="station-upgrade-title"
                className="font-display font-bold text-base sm:text-xl truncate"
              >
                Station Expansion &amp; Track Upgrades · স্টেশন উন্নয়ন
              </h2>
            </div>
            <div className="mt-0.5 text-xs text-[#d4c6a3] font-mono-tabular flex flex-wrap items-center gap-x-2">
              <span className="text-[#86efac] font-semibold" data-testid="upgrade-current-level">
                Station Level {snapshot.stationLevel}: {currentTier.title}
              </span>
              <span>·</span>
              <span data-testid="upgrade-unlocked-tracks">
                {snapshot.unlockedTracks} Active Tracks
              </span>
              <span>·</span>
              <span className="text-[#f5c756]">
                Revenue Yield x{snapshot.revenueMultiplier.toFixed(2)}
              </span>
            </div>
          </div>
          <button
            type="button"
            data-testid="close-upgrade-dashboard-btn"
            aria-label="Close Station Upgrades"
            onClick={onClose}
            className="min-w-[40px] h-10 px-3 rounded-lg bg-[#1c3e2d] hover:bg-[#25523c] border border-[#e8b84b]/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Close [U]</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
          {/* Summary Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 font-mono-tabular">
            <div className="rounded-lg bg-[#0d2016] border border-[#e8b84b]/25 p-3">
              <div className="text-[11px] text-[#cbbd98]">Active Tracks</div>
              <div className="text-lg font-bold text-[#86efac]">
                {snapshot.unlockedTracks} / {maxTracks}
              </div>
            </div>
            <div className="rounded-lg bg-[#0d2016] border border-[#e8b84b]/25 p-3">
              <div className="text-[11px] text-[#cbbd98]">Station Treasury</div>
              <div className="text-lg font-bold text-[#f5c756]">
                {snapshot.money.toLocaleString()} coins
              </div>
            </div>
            <div className="rounded-lg bg-[#0d2016] border border-[#e8b84b]/25 p-3">
              <div className="text-[11px] text-[#cbbd98]">Dispatches Logged</div>
              <div className="text-lg font-bold text-[#fbf4e2]">{snapshot.dispatchesCompleted}</div>
            </div>
            <div className="rounded-lg bg-[#0d2016] border border-[#e8b84b]/25 p-3">
              <div className="text-[11px] text-[#cbbd98]">Security Resolved</div>
              <div className="text-lg font-bold text-[#7dd3fc]">
                {snapshot.securityActionsCompleted}
              </div>
            </div>
          </div>

          {/* Next Upgrade Blueprint Card */}
          {nextTier && (
          <div
            className="rounded-xl border border-[#e8b84b]/45 bg-[#0c1e15] p-4 space-y-4"
            data-testid="next-upgrade-card"
          >
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#144b2f] border border-[#34d399]/50 text-[11px] font-bold text-[#86efac] uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    Next Blueprint · Level {nextTier.level} (
                    {isTrackExpansion ? `Unlocks Track ${nextTier.tracksUnlocked}` : 'Hub Modernization'}
                    )
                  </span>
                </div>
                <h3 className="font-display font-bold text-lg text-[#fbf4e2]">
                  {nextTier.title} · <span className="text-[#f5c756]">{nextTier.titleBn}</span>
                </h3>
                <p className="text-xs text-[#d4c6a3]">{nextTier.subtitle}</p>
              </div>

              <div className="shrink-0 rounded-lg bg-[#122b1e] border border-[#e8b84b]/35 px-3.5 py-2 text-right font-mono-tabular">
                <div className="text-[10px] uppercase tracking-wider text-[#cbbd98]">
                  Construction Cost
                </div>
                <div
                  className={`text-base font-bold flex items-center sm:justify-end gap-1 ${
                    canAfford ? 'text-[#f5c756]' : 'text-[#fca5a5]'
                  }`}
                >
                  <Coins className="w-4 h-4" />
                  <span>{nextTier.costCoins.toLocaleString()} coins</span>
                </div>
                <div className="text-[10px] text-[#86efac]">
                  Reward: +{nextTier.rewardXp} XP · +{nextTier.rewardRep}% Rep · x
                  {nextTier.revenueMultiplier.toFixed(2)} Yield
                </div>
              </div>
            </div>

            {/* 3D Infrastructure Features */}
            <div className="rounded-lg bg-[#11281c] border border-[#e8b84b]/20 p-3 space-y-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#f5c756]">
                Visible 3D Station Expansion Blueprint
              </div>
              <ul className="space-y-1 text-xs text-[#e8dfc6]">
                {nextTier.unlockFeatures.map((feat, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <TrainTrack className="w-3.5 h-3.5 text-[#34d399] shrink-0 mt-0.5" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Track Upgrade Missions Checklist */}
            <div className="space-y-2">
              <div className="text-xs font-bold uppercase tracking-wider text-[#d4c6a3]">
                Track Upgrade Missions &amp; Milestones
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {requirements.map((req) => {
                  const pct = Math.min(100, Math.round((req.current / Math.max(1, req.target)) * 100));
                  return (
                    <div
                      key={req.id}
                      data-testid={`upgrade-req-${req.id}`}
                      className={`rounded-lg border p-2.5 space-y-1.5 ${
                        req.met
                          ? 'bg-[#103221] border-[#22c55e]/50'
                          : 'bg-[#12251b] border-[#e8b84b]/25'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-semibold text-[#fbf4e2] flex items-center gap-1.5">
                          {req.met ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#4ade80] shrink-0" />
                          ) : (
                            <Lock className="w-3.5 h-3.5 text-[#f59e0b] shrink-0" />
                          )}
                          <span>{req.label}</span>
                        </span>
                        <span
                          className={`font-mono-tabular font-bold ${
                            req.met ? 'text-[#86efac]' : 'text-[#fde68a]'
                          }`}
                        >
                          {req.current}
                          {req.unit ?? ''} / {req.target}
                          {req.unit ?? ''}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#09150f] overflow-hidden">
                        <div
                          className={`h-full transition-all duration-200 ${
                            req.met ? 'bg-[#22c55e]' : 'bg-[#e8b84b]'
                          }`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}

                {/* Budget Requirement Row */}
                <div
                  data-testid="upgrade-req-funds"
                  className={`rounded-lg border p-2.5 space-y-1.5 ${
                    canAfford
                      ? 'bg-[#103221] border-[#22c55e]/50'
                      : 'bg-[#2b1717] border-[#ef4444]/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="font-semibold text-[#fbf4e2] flex items-center gap-1.5">
                      {canAfford ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#4ade80] shrink-0" />
                      ) : (
                        <Coins className="w-3.5 h-3.5 text-[#fca5a5] shrink-0" />
                      )}
                      <span>Station Construction Budget</span>
                    </span>
                    <span
                      className={`font-mono-tabular font-bold ${
                        canAfford ? 'text-[#86efac]' : 'text-[#fca5a5]'
                      }`}
                    >
                      {snapshot.money} / {nextTier.costCoins}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#09150f] overflow-hidden">
                    <div
                      className={`h-full transition-all duration-200 ${
                        canAfford ? 'bg-[#22c55e]' : 'bg-[#ef4444]'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.round((snapshot.money / Math.max(1, nextTier.costCoins)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Action Button */}
            <div className="pt-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="text-xs text-[#d4c6a3]">
                {canUpgradeNow
                  ? 'All track upgrade missions & funding complete! Ready to construct.'
                  : !allRequirementsMet
                    ? 'Complete all track upgrade missions above to unlock construction.'
                    : `Earn ${nextTier.costCoins - snapshot.money} more coins from dispatches, tickets & missions.`}
              </div>
              <button
                type="button"
                data-testid="confirm-station-upgrade-btn"
                onClick={actions.purchaseUpgrade}
                className={`min-h-[42px] px-4 py-2 rounded-lg font-display font-bold text-sm flex items-center justify-center gap-2 cursor-pointer transition-colors shrink-0 ${
                  canUpgradeNow
                    ? 'bg-[#22c55e] hover:bg-[#16a34a] text-[#052e16] shadow-lg'
                    : 'bg-[#1c3629] hover:bg-[#234434] text-[#cbbd98] border border-[#e8b84b]/25'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>
                  {isTrackExpansion
                    ? `Construct Track ${nextTier.tracksUnlocked} (${nextTier.costCoins} coins)`
                    : `Upgrade to Level ${nextTier.level} (${nextTier.costCoins} coins)`}
                </span>
              </button>
            </div>
          </div>
          )}

          {/* Progression Roadmap */}
          <div className="space-y-2">
            <div className="text-xs font-bold uppercase tracking-wider text-[#d4c6a3]">
              {isCh2
                ? 'Chapter 2 Expansion Roadmap (Padma Central · 7 → 8 Tracks)'
                : 'Station Expansion Roadmap (Levels 1 → 5+)'}
            </div>
            <div
              className={`grid grid-cols-1 gap-2 ${isCh2 ? 'sm:grid-cols-2' : 'sm:grid-cols-5'}`}
            >
              {roadmapTiers.map((tier) => {
                const completed = snapshot.completedTiers.includes(tier.level);
                const isNext = tier.level === snapshot.stationLevel + 1;
                return (
                  <div
                    key={tier.level}
                    className={`rounded-lg border p-2.5 space-y-1 text-xs ${
                      completed
                        ? 'bg-[#113624] border-[#34d399]/60'
                        : isNext
                          ? 'bg-[#282412] border-[#f5c756]/70'
                          : 'bg-[#0b1a13] border-[#e8b84b]/20 opacity-80'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono-tabular font-bold">
                      <span className="text-[#f5c756]">Lvl {tier.level}</span>
                      <span className="text-[#86efac]">{tier.tracksUnlocked} Tracks</span>
                    </div>
                    <div className="font-bold text-[#fbf4e2] leading-tight">{tier.title}</div>
                    <div className="text-[10px] text-[#cbbd98]">
                      {completed ? 'Constructed' : isNext ? 'In Progress' : `${tier.costCoins} coins`}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
