import {
  Award,
  CheckCircle2,
  Coins,
  Lock,
  MapPinned,
  ShieldAlert,
  Sparkles,
  TrainFront,
  TrainTrack,
  Trophy,
  X,
} from 'lucide-react';
import type {
  ChapterId,
  ChapterUnlockStatus,
  SharedPlayerProfile,
  StationCardSummary,
} from '../game/types';

interface StationSelectorModalProps {
  activeChapterId: ChapterId;
  chapterUnlockStatus: ChapterUnlockStatus;
  stationCards: StationCardSummary[];
  sharedProfile: SharedPlayerProfile;
  onSelectChapter: (chapterId: ChapterId) => void;
  onDismissCelebration: () => void;
  onClose: () => void;
}

export function StationSelectorModal({
  activeChapterId,
  chapterUnlockStatus,
  stationCards,
  sharedProfile,
  onSelectChapter,
  onDismissCelebration,
  onClose,
}: StationSelectorModalProps) {
  const showCelebration =
    chapterUnlockStatus.chapter2Unlocked && !chapterUnlockStatus.celebrationDismissed;
  const xpPct = Math.min(
    100,
    Math.round((sharedProfile.xp / Math.max(1, sharedProfile.xpToNext)) * 100),
  );

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-2 sm:p-4"
      style={{ backgroundColor: 'rgba(8, 18, 13, 0.86)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="station-selector-title"
      data-testid="station-selector-modal"
    >
      <div
        className="w-full max-w-5xl max-h-[94vh] rounded-xl border border-[#e8b84b]/55 shadow-2xl text-[#fbf4e2] flex flex-col overflow-hidden"
        style={{ backgroundColor: '#122a1e' }}
      >
        {/* Top Bar */}
        <div className="px-4 py-3 sm:px-5 border-b border-[#e8b84b]/30 flex items-center justify-between gap-3 bg-[#0e2218]">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <MapPinned className="w-5 h-5 text-[#f5c756] shrink-0" />
              <h2
                id="station-selector-title"
                className="font-display font-bold text-base sm:text-xl truncate"
              >
                Bangladesh Railway Network · Chapters &amp; Station Selector
              </h2>
            </div>
            <div className="mt-0.5 text-xs text-[#d4c6a3] font-mono-tabular">
              Currently Commanding: Chapter {activeChapterId} · Manage multiple stations simultaneously with shared Master career XP.
            </div>
          </div>
          <button
            type="button"
            data-testid="close-station-selector-btn"
            aria-label="Close Station Selector"
            onClick={onClose}
            className="min-w-[40px] h-10 px-3 rounded-lg bg-[#1c3e2d] hover:bg-[#25523c] border border-[#e8b84b]/40 text-xs font-semibold flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Close [C]</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
          {/* Chapter 1 Completion & Chapter 2 Unlock Celebration Banner */}
          {showCelebration && (
            <div
              data-testid="chapter-unlock-celebration"
              className="rounded-xl border-2 border-[#f5c756] p-4 shadow-xl space-y-3"
              style={{
                background:
                  'linear-gradient(120deg, rgba(16, 72, 48, 0.96) 0%, rgba(14, 54, 82, 0.96) 100%)',
              }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#f5c756] text-[#14241b] text-[11px] font-extrabold uppercase tracking-wider">
                    <Trophy className="w-3.5 h-3.5" />
                    <span>CHAPTER 1 COMPLETED! · CHAPTER 2 UNLOCKED!</span>
                  </div>
                  <h3 className="font-display font-bold text-lg sm:text-xl text-[#fff9ea]">
                    Padma Central Terminal (পদ্মা সেন্ট্রাল টার্মিনাল) Is Ready for Command!
                  </h3>
                  <p className="text-xs text-[#e0f2fe]">
                    Shaplapur Junction stays preserved and continues running automatically in the background while you command Chapter 2’s 7–8 track high-speed megahub.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    data-testid="enter-chapter-2-btn"
                    onClick={() => {
                      onDismissCelebration();
                      onSelectChapter(2);
                    }}
                    className="px-4 py-2.5 rounded-lg bg-[#e8b84b] hover:bg-[#f2c65e] text-[#14241b] font-display font-bold text-sm flex items-center gap-1.5 cursor-pointer shadow-lg"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Enter Chapter 2</span>
                  </button>
                  <button
                    type="button"
                    onClick={onDismissCelebration}
                    className="px-3 py-2 rounded-lg bg-[#163827] hover:bg-[#1f4d36] border border-[#e8b84b]/35 text-xs text-[#fbf4e2] cursor-pointer"
                  >
                    Stay in Ch 1
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Shared Station Master Career Profile */}
          <div className="rounded-xl border border-[#e8b84b]/35 bg-[#0d2016] p-3.5 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-[#f5c756]" />
                <span className="font-display font-bold text-sm text-[#fbf4e2]">
                  Shared Station Master Profile · Rank Level {sharedProfile.level}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono-tabular text-[#d4c6a3]">
                <span>XP {sharedProfile.xp}/{sharedProfile.xpToNext}</span>
                <span>·</span>
                <span className="text-[#86efac]">
                  Total Dispatches: {sharedProfile.totalDispatchesAllStations}
                </span>
                <span>·</span>
                <span className="text-[#7dd3fc]">
                  Incidents Solved: {sharedProfile.totalEmergenciesResolved}
                </span>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-[#08130d] overflow-hidden">
              <div className="h-full bg-[#36c478]" style={{ width: `${xpPct}%` }} />
            </div>
            {sharedProfile.unlockedAbilities.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10px] uppercase tracking-wider text-[#cbbd98] font-bold">
                  Unlocked Abilities:
                </span>
                {sharedProfile.unlockedAbilities.map((ab) => (
                  <span
                    key={ab}
                    className="px-2 py-0.5 rounded bg-[#144b2f] border border-[#34d399]/40 text-[10px] font-semibold text-[#86efac]"
                  >
                    {ab}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Two-Stations Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {stationCards.map((card) => {
              const isCh2 = card.chapterId === 2;
              return (
                <div
                  key={card.chapterId}
                  data-testid={`station-card-${card.chapterId}`}
                  className={`rounded-xl border p-4 flex flex-col justify-between gap-4 ${
                    card.isCurrent
                      ? 'bg-[#113524] border-[#f5c756] shadow-lg'
                      : card.unlocked
                        ? 'bg-[#0d2016] border-[#38bdf8]/50'
                        : 'bg-[#0a1711] border-[#e8b84b]/20 opacity-85'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wider text-[#f5c756]">
                          {card.title}
                        </div>
                        <h3 className="font-display font-bold text-lg text-[#fbf4e2]">
                          {card.stationName}
                        </h3>
                        <div className="text-xs text-[#93c5fd]">{card.stationNameBn}</div>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                          !card.unlocked
                            ? 'bg-[#3f2c0d] text-[#fde68a]'
                            : card.isCurrent
                              ? 'bg-[#22c55e] text-[#052e16]'
                              : 'bg-[#0c4a6e] text-[#bae6fd]'
                        }`}
                      >
                        {card.statusLabel}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-mono-tabular">
                      <div className="rounded-lg bg-[#08150f] border border-[#e8b84b]/20 p-2">
                        <div className="text-[10px] text-[#cbbd98] flex items-center gap-1">
                          <TrainTrack className="w-3 h-3 text-[#86efac]" />
                          <span>Tracks &amp; Tier</span>
                        </div>
                        <div className="font-bold text-[#fbf4e2]">
                          {card.tracksCount}/{card.maxTracks} Tracks · Lvl {card.stationLevel}
                        </div>
                      </div>
                      <div className="rounded-lg bg-[#08150f] border border-[#e8b84b]/20 p-2">
                        <div className="text-[10px] text-[#cbbd98] flex items-center gap-1">
                          <Coins className="w-3 h-3 text-[#f5c756]" />
                          <span>Station Funds</span>
                        </div>
                        <div className="font-bold text-[#f5c756]">
                          {card.money.toLocaleString()} coins
                        </div>
                      </div>
                      <div className="rounded-lg bg-[#08150f] border border-[#e8b84b]/20 p-2">
                        <div className="text-[10px] text-[#cbbd98] flex items-center gap-1">
                          <TrainFront className="w-3 h-3 text-[#7dd3fc]" />
                          <span>Traffic &amp; Ops</span>
                        </div>
                        <div className="font-bold text-[#e0f2fe]">
                          {card.activeTrainsCount} Active · {card.activeEmergenciesCount} Ops
                        </div>
                      </div>
                      <div className="rounded-lg bg-[#08150f] border border-[#e8b84b]/20 p-2">
                        <div className="text-[10px] text-[#cbbd98] flex items-center gap-1">
                          <ShieldAlert className="w-3 h-3 text-[#86efac]" />
                          <span>Rep &amp; Daily Net</span>
                        </div>
                        <div className="font-bold text-[#86efac]">
                          {card.reputation}% · +{card.dailyIncome}/-{card.dailyExpenses}c
                        </div>
                      </div>
                    </div>
                  </div>

                  {card.unlocked ? (
                    <button
                      type="button"
                      data-testid={`manage-station-${card.chapterId}-btn`}
                      onClick={() => onSelectChapter(card.chapterId)}
                      className={`w-full py-2.5 rounded-lg font-display font-bold text-sm cursor-pointer transition-colors ${
                        card.isCurrent
                          ? 'bg-[#e8b84b] hover:bg-[#f2c65e] text-[#14241b]'
                          : isCh2
                            ? 'bg-[#0284c7] hover:bg-[#0369a1] text-white'
                            : 'bg-[#1c4b34] hover:bg-[#246144] text-[#fbf4e2] border border-[#34d399]/50'
                      }`}
                    >
                      {card.isCurrent ? 'MANAGE STATION (CURRENT VIEW)' : 'MANAGE STATION'}
                    </button>
                  ) : (
                    <div className="w-full py-2.5 px-3 rounded-lg bg-[#08140e] border border-[#e8b84b]/20 text-xs text-[#cbbd98] flex items-center justify-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-[#f59e0b]" />
                      <span>Complete Chapter 1 Milestones Below to Unlock</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Chapter 2 Unlock Requirements Checklist */}
          {!chapterUnlockStatus.chapter2Unlocked && (
            <div className="rounded-xl border border-[#e8b84b]/35 bg-[#0d2016] p-4 space-y-2.5">
              <div className="font-display font-bold text-sm text-[#f5c756]">
                Chapter 2 Unlock Requirements (Padma Central Terminal · 7–8 Tracks)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {chapterUnlockStatus.requirements.map((req) => (
                  <div
                    key={req.id}
                    data-testid={`ch2-req-${req.id}`}
                    className={`rounded-lg border p-2.5 text-xs flex items-center justify-between gap-2 ${
                      req.met
                        ? 'bg-[#103221] border-[#22c55e]/50 text-[#dcfce7]'
                        : 'bg-[#12251b] border-[#e8b84b]/25 text-[#dfd5bc]'
                    }`}
                  >
                    <span className="flex items-center gap-1.5 font-medium">
                      {req.met ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#4ade80] shrink-0" />
                      ) : (
                        <Lock className="w-3.5 h-3.5 text-[#f59e0b] shrink-0" />
                      )}
                      <span>{req.label}</span>
                    </span>
                    <span className="font-mono-tabular font-bold shrink-0">
                      {req.current}
                      {req.unit ?? ''}/{req.target}
                      {req.unit ?? ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
