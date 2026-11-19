import { STATION_NAME_BN, STATION_NAME_EN } from '../game/rules';
import type { SavedShiftSummary } from '../game/storage';

interface TitleOverlayProps {
  savedShift?: SavedShiftSummary | null;
  onStart: () => void;
  onContinueSaved?: () => void;
}

export function TitleOverlay({ savedShift, onStart, onContinueSaved }: TitleOverlayProps) {
  return (
    <div
      className="fixed inset-0 z-30 flex flex-col justify-between p-5 sm:p-10 pointer-events-none"
      style={{
        background:
          'linear-gradient(95deg, rgba(14, 34, 24, 0.86) 0%, rgba(14, 34, 24, 0.48) 44%, rgba(14, 34, 24, 0.04) 100%)',
      }}
    >
      {/* Top Station Plaque */}
      <div className="flex items-center justify-between">
        <div className="text-xs sm:text-sm font-medium tracking-wide text-[#f3dfb0]">
          {STATION_NAME_EN} · {STATION_NAME_BN}
        </div>
      </div>

      {/* Main Title Lockup in Calm Left Negative Space */}
      <div className="max-w-lg pointer-events-auto my-auto">
        <div className="mb-4 inline-flex items-center gap-3">
          <svg
            viewBox="0 0 64 64"
            className="w-14 h-14 shrink-0"
            aria-hidden="true"
          >
            <circle cx="32" cy="32" r="29" fill="#173d2c" stroke="#e8b84b" strokeWidth="2.5" />
            <circle cx="32" cy="32" r="19" fill="none" stroke="#e8b84b" strokeWidth="1.5" strokeDasharray="4 3" />
            <circle cx="32" cy="34" r="10" fill="none" stroke="#f7ebd0" strokeWidth="2" />
            <line x1="22" y1="34" x2="42" y2="34" stroke="#f7ebd0" strokeWidth="1.8" />
            <line x1="32" y1="24" x2="32" y2="44" stroke="#f7ebd0" strokeWidth="1.8" />
            <path d="M32 10 L36 20 L43 15 L39 24 L25 24 L21 15 L28 20 Z" fill="#d9422b" stroke="#f7ebd0" strokeWidth="1.2" />
            <circle cx="32" cy="34" r="3" fill="#e8b84b" />
          </svg>

          <div className="text-xs uppercase tracking-[0.18em] font-semibold text-[#e8b84b]">
            Bangladesh Railway Sim
          </div>
        </div>

        <h1 className="font-display text-3xl sm:text-5xl font-extrabold leading-[1.08] text-[#fbf6ea] tracking-tight text-balance">
          Railway Station Master: Bangladesh Simulator
        </h1>

        <p className="mt-3 text-sm sm:text-base text-[#e4decb] max-w-md leading-relaxed">
          Command {STATION_NAME_EN} from a 2-track junction into a 6-track metropolitan rail hub. Dispatch express trains, direct Railway Police patrols, expand glass terminals, and hear live Bengali announcements.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {savedShift && onContinueSaved ? (
            <>
              <button
                type="button"
                data-testid="continue-saved-shift-btn"
                onClick={onContinueSaved}
                className="px-6 py-3 rounded-lg bg-[#e8b84b] hover:bg-[#f2c65e] active:scale-[0.98] text-[#15281e] font-display font-bold text-sm sm:text-base shadow-lg transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fff2c6] flex flex-col items-start"
              >
                <span>Continue Saved Shift</span>
                <span className="text-[11px] font-sans font-semibold text-[#233d2e]">
                  Lvl {savedShift.stationLevel} · {savedShift.unlockedTracks} Tracks · Day {savedShift.dayNumber} · ৳{savedShift.money}
                </span>
              </button>
              <button
                type="button"
                data-start="true"
                onClick={onStart}
                className="px-5 py-3.5 rounded-lg bg-[#173d2c] hover:bg-[#1f503a] active:scale-[0.98] text-[#fbf4e2] font-display font-bold text-sm sm:text-base border border-[#e8b84b]/50 shadow-lg transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fff2c6]"
              >
                New Station Shift
              </button>
            </>
          ) : (
            <button
              type="button"
              data-start="true"
              onClick={onStart}
              className="px-7 py-3.5 rounded-lg bg-[#e8b84b] hover:bg-[#f2c65e] active:scale-[0.98] text-[#15281e] font-display font-bold text-base sm:text-lg shadow-lg transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#fff2c6]"
            >
              Enter Station
            </button>
          )}
        </div>
      </div>

      {/* Flat Single-Line Control Hint */}
      <div className="text-xs sm:text-sm text-[#e8dfcb]/90 font-medium truncate">
        <span className="hidden sm:inline">
          WASD Move · Shift Sprint · Mouse Look (ESC Pause) · V Camera View · Space Jump · E Interact
        </span>
        <span className="sm:hidden">
          Joystick Move · Swipe Right Look · Action &amp; Jump Buttons
        </span>
      </div>
    </div>
  );
}
