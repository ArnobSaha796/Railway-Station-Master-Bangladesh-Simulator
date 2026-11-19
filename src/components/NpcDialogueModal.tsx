import { MessageCircle, ShieldAlert, Sparkles, X } from 'lucide-react';
import type { ActiveNpcDialogue, NpcDialogueChoice } from '../game/types';

export interface DialogueOutcomeFeedback {
  replyBn: string;
  replyEn: string;
  isCorrect: boolean;
  satisfactionDelta: number;
  xpDelta: number;
  moneyDelta: number;
}

interface NpcDialogueModalProps {
  dialogue: ActiveNpcDialogue;
  outcome: DialogueOutcomeFeedback | null;
  onSelectChoice: (choice: NpcDialogueChoice) => void;
  onClose: () => void;
}

export function NpcDialogueModal({
  dialogue,
  outcome,
  onSelectChoice,
  onClose,
}: NpcDialogueModalProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4 bg-black/55"
      data-testid="npc-dialogue-modal"
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-[#e8b84b]/60 shadow-2xl overflow-hidden text-[#fbf4e2]"
        style={{ backgroundColor: 'rgba(15, 38, 27, 0.98)' }}
      >
        {/* Header */}
        <div className="px-4 py-3 sm:px-5 border-b border-[#e8b84b]/30 flex items-start justify-between gap-3 bg-[#123123]">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {dialogue.incidentKind ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#b91c1c] text-white text-[11px] font-bold">
                  <ShieldAlert className="w-3.5 h-3.5" />
                  Station Incident
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-[#1d5e3f] text-[#f5c756] text-[11px] font-bold">
                  <MessageCircle className="w-3.5 h-3.5" />
                  {dialogue.roleLabel}
                </span>
              )}
              <span className="text-[11px] px-2 py-0.5 rounded bg-[#0c2318] border border-[#e8b84b]/30 text-[#d8cbb0] capitalize">
                {dialogue.personality.replace('_', ' ')}
              </span>
            </div>
            <h2 className="mt-1 font-display font-bold text-base sm:text-lg text-[#fbf4e2]">
              {dialogue.npcNameBn} · <span className="text-[#f5c756]">{dialogue.npcName}</span>
            </h2>
            <p className="text-xs text-[#cbbd98]">{dialogue.memorySummary}</p>
          </div>
          <button
            type="button"
            tabIndex={-1}
            data-testid="close-npc-dialogue-btn"
            aria-label="Close dialogue"
            onClick={(e) => {
              e.currentTarget.blur();
              onClose();
            }}
            className="w-9 h-9 rounded-lg border border-[#e8b84b]/40 flex items-center justify-center text-[#fbf4e2] hover:bg-[#1d4833] cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Question Body */}
        <div className="p-4 sm:p-5 space-y-4">
          <div className="rounded-xl border border-[#e8b84b]/35 bg-[#0c2419] p-3.5">
            <p
              className="text-sm sm:text-base font-semibold text-[#fff3cd] leading-relaxed"
              data-testid="npc-question-bn"
            >
              “{dialogue.questionBn}”
            </p>
            <p className="mt-1.5 text-xs sm:text-sm text-[#d4c8aa] leading-relaxed">
              {dialogue.questionEn}
            </p>
          </div>

          {outcome ? (
            <div className="space-y-3" data-testid="npc-dialogue-outcome">
              <div
                className={`rounded-xl border p-3.5 ${
                  outcome.isCorrect
                    ? 'border-[#36c478]/60 bg-[#123c27]'
                    : 'border-[#ef4444]/60 bg-[#3a1616]'
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[#f5c756]">
                  <Sparkles className="w-3.5 h-3.5" />
                  {outcome.isCorrect ? 'Helpful Response' : 'Passenger Dissatisfied'}
                </div>
                <p className="mt-1 text-sm sm:text-base font-semibold text-white">
                  “{outcome.replyBn}”
                </p>
                <p className="mt-1 text-xs text-[#e5dcc4]">{outcome.replyEn}</p>
                <div className="mt-2.5 flex flex-wrap gap-2 text-[11px] font-mono-tabular">
                  <span className="px-2 py-0.5 rounded bg-black/30 text-[#f5c756]">
                    Satisfaction {outcome.satisfactionDelta >= 0 ? '+' : ''}
                    {outcome.satisfactionDelta}%
                  </span>
                  {outcome.xpDelta > 0 && (
                    <span className="px-2 py-0.5 rounded bg-black/30 text-[#72e3a2]">
                      +{outcome.xpDelta} XP
                    </span>
                  )}
                  {outcome.moneyDelta !== 0 && (
                    <span className="px-2 py-0.5 rounded bg-black/30 text-[#fde047]">
                      {outcome.moneyDelta >= 0 ? '+' : ''}
                      {outcome.moneyDelta} coins
                    </span>
                  )}
                </div>
              </div>

              <button
                type="button"
                data-testid="npc-dialogue-continue-btn"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onClose();
                }}
                className="w-full min-h-[44px] rounded-xl bg-[#e8b84b] hover:bg-[#f2c65e] text-[#14241b] font-bold text-sm cursor-pointer active:scale-[0.99] transition-transform"
              >
                Continue Station Duty [Enter / Esc]
              </button>
            </div>
          ) : (
            <div className="space-y-2" data-testid="npc-dialogue-choices">
              {dialogue.choices.map((choice, idx) => (
                <button
                  key={choice.id}
                  type="button"
                  data-testid={`npc-choice-btn-${idx}`}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onSelectChoice(choice);
                  }}
                  className="w-full min-h-[44px] text-left rounded-xl border border-[#e8b84b]/35 bg-[#123324] hover:bg-[#1a4933] hover:border-[#f5c756] px-3.5 py-2.5 transition-colors cursor-pointer flex items-start gap-2.5"
                >
                  <span className="mt-0.5 w-6 h-6 rounded-md bg-[#e8b84b] text-[#14241b] font-mono-tabular font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs sm:text-sm font-semibold text-[#fbf4e2]">
                      {choice.labelBn}
                    </span>
                    <span className="block text-[11px] sm:text-xs text-[#cbbe9a] mt-0.5">
                      {choice.label}
                    </span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
