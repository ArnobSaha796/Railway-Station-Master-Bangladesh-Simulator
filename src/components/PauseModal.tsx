import {
  Building2,
  ClipboardCheck,
  FolderOpen,
  MapPinned,
  Save,
  ShieldAlert,
  SlidersHorizontal,
  TrainFront,
} from 'lucide-react';
import type { CameraMode, TouchControlsMode, WeatherMode } from '../game/types';

interface PauseModalProps {
  stationName: string;
  level: number;
  money: number;
  reputation: number;
  cameraMode: CameraMode;
  weather: WeatherMode;
  dayPeriodLabel: string;
  touchMode: TouchControlsMode;
  hasSavedShift: boolean;
  saveFeedback: string | null;
  onChangeCameraMode: (mode: CameraMode) => void;
  onChangeTouchMode: (mode: TouchControlsMode) => void;
  onOpenAudioMixer: () => void;
  onOpenTrainDashboard: () => void;
  onOpenUpgradeDashboard: () => void;
  onOpenEmergencyDashboard: () => void;
  onOpenOperationsModal: () => void;
  onOpenStationSelector: () => void;
  onSaveShift: () => void;
  onLoadSavedShift: () => void;
  onResume: () => void;
  onRestart: () => void;
  onExitToTitle: () => void;
}

export function PauseModal({
  stationName,
  level,
  money,
  reputation,
  cameraMode,
  weather,
  dayPeriodLabel,
  touchMode,
  hasSavedShift,
  saveFeedback,
  onChangeCameraMode,
  onChangeTouchMode,
  onOpenAudioMixer,
  onOpenTrainDashboard,
  onOpenUpgradeDashboard,
  onOpenEmergencyDashboard,
  onOpenOperationsModal,
  onOpenStationSelector,
  onSaveShift,
  onLoadSavedShift,
  onResume,
  onRestart,
  onExitToTitle,
}: PauseModalProps) {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(10, 22, 16, 0.72)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pause-modal-title"
    >
      <div
        className="w-full max-w-md max-h-[92vh] overflow-y-auto rounded-xl border border-[#e8b84b]/50 p-5 sm:p-6 shadow-2xl text-[#fbf4e2]"
        style={{ backgroundColor: '#143022' }}
      >
        <div className="text-xs uppercase tracking-[0.16em] text-[#e8b84b] font-semibold">
          {stationName}
        </div>
        <h2 id="pause-modal-title" className="mt-1 font-display text-2xl font-bold">
          Shift Paused
        </h2>

        <div className="mt-4 grid grid-cols-3 gap-2.5 text-center font-mono-tabular">
          <div className="rounded-lg bg-[#0d2117] p-2.5 border border-[#e8b84b]/20">
            <div className="text-[11px] text-[#cbbd98]">Level</div>
            <div className="text-base font-bold">{level}</div>
          </div>
          <div className="rounded-lg bg-[#0d2117] p-2.5 border border-[#e8b84b]/20">
            <div className="text-[11px] text-[#cbbd98]">Money</div>
            <div className="text-base font-bold text-[#f5c756]">{money}</div>
          </div>
          <div className="rounded-lg bg-[#0d2117] p-2.5 border border-[#e8b84b]/20">
            <div className="text-[11px] text-[#cbbd98]">Reputation</div>
            <div className="text-base font-bold">{reputation}%</div>
          </div>
        </div>

        {/* Camera Mode Selector */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-medium text-[#d4c6a3] mb-1.5">Camera View [V]</div>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#0d2117]">
              {(
                [
                  { id: 'third-person', label: '3rd Person' },
                  { id: 'first-person', label: '1st Person' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeCameraMode(opt.id)}
                  className={`py-1.5 text-[11px] font-semibold rounded-md cursor-pointer transition-colors ${
                    cameraMode === opt.id
                      ? 'bg-[#e8b84b] text-[#14241b]'
                      : 'text-[#dfd5bc] hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-medium text-[#d4c6a3] mb-1.5">Atmosphere (Auto)</div>
            <div className="rounded-lg bg-[#0d2117] px-3 py-2 border border-[#e8b84b]/20 text-[11px] font-semibold text-[#dfd5bc] text-center">
              {dayPeriodLabel} · {weather === 'rain' ? 'Monsoon Rain' : 'Clear Sky'}
            </div>
          </div>
        </div>

        {/* Touch Controls Mode Selector */}
        <div className="mt-3.5">
          <div className="text-xs font-medium text-[#d4c6a3] mb-1.5">On-Screen Touch Controls</div>
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-[#0d2117]">
            {(['auto', 'on', 'off'] as const).map((mode) => (
              <button
                key={mode}
                type="button"
                onClick={() => onChangeTouchMode(mode)}
                className={`py-1.5 text-xs font-semibold rounded-md capitalize cursor-pointer transition-colors ${
                  touchMode === mode
                    ? 'bg-[#e8b84b] text-[#14241b]'
                    : 'text-[#dfd5bc] hover:text-white'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            data-testid="resume-game-btn"
            onClick={onResume}
            className="w-full py-3 rounded-lg bg-[#e8b84b] hover:bg-[#f2c65e] text-[#14241b] font-display font-bold text-sm cursor-pointer"
          >
            Resume Game
          </button>
          <button
            type="button"
            data-testid="pause-operations-modal-btn"
            onClick={onOpenOperationsModal}
            className="w-full py-2.5 rounded-lg bg-[#1d4431] hover:bg-[#25573f] text-[#fde68a] font-semibold text-sm border border-[#f59e0b]/45 flex items-center justify-center gap-2 cursor-pointer"
          >
            <ClipboardCheck className="w-4 h-4 text-[#f59e0b]" />
            <span>Station Operations &amp; Tasks [O]</span>
          </button>
          <button
            type="button"
            data-testid="pause-station-selector-btn"
            onClick={onOpenStationSelector}
            className="w-full py-2.5 rounded-lg bg-[#0c354c] hover:bg-[#104766] text-[#bae6fd] font-semibold text-sm border border-[#38bdf8]/45 flex items-center justify-center gap-2 cursor-pointer"
          >
            <MapPinned className="w-4 h-4 text-[#7dd3fc]" />
            <span>Chapters &amp; Station Network [C]</span>
          </button>
          <button
            type="button"
            data-testid="pause-train-dashboard-btn"
            onClick={onOpenTrainDashboard}
            className="w-full py-2.5 rounded-lg bg-[#1d4431] hover:bg-[#25573f] text-[#fbf4e2] font-semibold text-sm border border-[#e8b84b]/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            <TrainFront className="w-4 h-4 text-[#f5c756]" />
            <span>Train Control Room [T]</span>
          </button>
          <button
            type="button"
            data-testid="pause-upgrade-dashboard-btn"
            onClick={onOpenUpgradeDashboard}
            className="w-full py-2.5 rounded-lg bg-[#0d3b27] hover:bg-[#124d33] text-[#a7f3d0] font-semibold text-sm border border-[#34d399]/40 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-[#86efac]" />
            <span>Station Expansion &amp; Tracks [U]</span>
          </button>
          <button
            type="button"
            data-testid="pause-emergency-dashboard-btn"
            onClick={onOpenEmergencyDashboard}
            className="w-full py-2.5 rounded-lg bg-[#0d354a] hover:bg-[#114661] text-[#e0f2fe] font-semibold text-sm border border-[#38bdf8]/40 flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldAlert className="w-4 h-4 text-[#7dd3fc]" />
            <span>Security &amp; Emergency Center [G]</span>
          </button>
          <button
            type="button"
            data-testid="pause-audio-mixer-btn"
            onClick={onOpenAudioMixer}
            className="w-full py-2.5 rounded-lg bg-[#1d4431] hover:bg-[#25573f] text-[#fbf4e2] font-semibold text-sm border border-[#e8b84b]/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-[#f5c756]" />
            <span>Sound &amp; Volume Mixer</span>
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              data-testid="pause-save-shift-btn"
              onClick={onSaveShift}
              className="py-2.5 px-3 rounded-lg bg-[#1d4431] hover:bg-[#25573f] text-[#fbf4e2] font-semibold text-xs sm:text-sm border border-[#e8b84b]/35 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4 text-[#f5c756]" />
              <span>Save Shift Now</span>
            </button>
            <button
              type="button"
              data-testid="pause-load-shift-btn"
              onClick={onLoadSavedShift}
              disabled={!hasSavedShift}
              className={`py-2.5 px-3 rounded-lg font-semibold text-xs sm:text-sm border flex items-center justify-center gap-1.5 ${
                hasSavedShift
                  ? 'bg-[#1d4431] hover:bg-[#25573f] text-[#fbf4e2] border-[#e8b84b]/35 cursor-pointer'
                  : 'bg-[#10261b] text-[#7a8f82] border-[#e8b84b]/10 cursor-not-allowed'
              }`}
            >
              <FolderOpen className="w-4 h-4 text-[#f5c756]" />
              <span>Load Saved Shift</span>
            </button>
          </div>
          {saveFeedback && (
            <div className="text-center text-xs font-medium text-[#86efac]" role="status">
              {saveFeedback}
            </div>
          )}
          <button
            type="button"
            onClick={onRestart}
            className="w-full py-2.5 rounded-lg bg-[#193b2a] hover:bg-[#214c37] text-[#fbf4e2] font-semibold text-sm border border-[#e8b84b]/25 cursor-pointer"
          >
            Restart Shift
          </button>
          <button
            type="button"
            onClick={onExitToTitle}
            className="w-full py-2 rounded-lg bg-transparent hover:bg-[#1b3d2c] text-[#d4c6a3] font-medium text-sm cursor-pointer"
          >
            Return to Title
          </button>
        </div>
      </div>
    </div>
  );
}
