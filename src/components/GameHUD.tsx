import { useEffect, useState } from 'react';
import {
  Building2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  CloudRain,
  Eye,
  MapPinned,
  Megaphone,
  Pause,
  ShieldAlert,
  Siren,
  SlidersHorizontal,
  Sun,
  TrainFront,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type { CameraMode, HudSnapshot, SignalAspect, TrackId, WeatherMode } from '../game/types';

interface GameHUDProps {
  hud: HudSnapshot;
  muted: boolean;
  cameraMode: CameraMode;
  weather: WeatherMode;
  pointerLocked: boolean;
  announcementBanner: string | null;
  isTouchMode: boolean;
  onToggleMute: () => void;
  onToggleCameraMode: () => void;
  onOpenAudioMixer: () => void;
  onOpenTrainDashboard: () => void;
  onOpenUpgradeDashboard: () => void;
  onOpenEmergencyDashboard: () => void;
  onOpenOperationsModal: () => void;
  onOpenStationSelector: () => void;
  onPause: () => void;
  onInteractClick: () => void;
}

interface ViewportProfile {
  isCompact: boolean;
  isLandscapeCompact: boolean;
  isNarrowPortrait: boolean;
}

function getViewportProfile(): ViewportProfile {
  if (typeof window === 'undefined') {
    return { isCompact: false, isLandscapeCompact: false, isNarrowPortrait: false };
  }
  const w = window.innerWidth;
  const h = window.innerHeight;
  const isLandscapeCompact = h <= 540;
  const isNarrowPortrait = w < 640 && h > 540;
  const isCompact = w < 1024 || isLandscapeCompact;
  return { isCompact, isLandscapeCompact, isNarrowPortrait };
}

function signalBadgeClass(aspect: SignalAspect): string {
  if (aspect === 'green') return 'bg-[#16a34a] text-white';
  if (aspect === 'yellow') return 'bg-[#d97706] text-white';
  return 'bg-[#dc2626] text-white';
}

function signalShort(aspect: SignalAspect): string {
  if (aspect === 'green') return 'GRN';
  if (aspect === 'yellow') return 'YLW';
  return 'RED';
}

function signalDotClass(aspect: SignalAspect): string {
  if (aspect === 'green') return 'bg-[#22c55e]';
  if (aspect === 'yellow') return 'bg-[#f59e0b]';
  return 'bg-[#ef4444]';
}

export function GameHUD({
  hud,
  muted,
  cameraMode,
  weather,
  pointerLocked,
  announcementBanner,
  isTouchMode,
  onToggleMute,
  onToggleCameraMode,
  onOpenAudioMixer,
  onOpenTrainDashboard,
  onOpenUpgradeDashboard,
  onOpenEmergencyDashboard,
  onOpenOperationsModal,
  onOpenStationSelector,
  onPause,
  onInteractClick,
}: GameHUDProps) {
  const [viewport, setViewport] = useState<ViewportProfile>(() => getViewportProfile());
  const [mobileDetailsOpen, setMobileDetailsOpen] = useState(false);

  useEffect(() => {
    const update = () => setViewport(getViewportProfile());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  const xpPct = Math.min(100, Math.round((hud.xp / Math.max(1, hud.xpToNext)) * 100));
  const activeTrackIds = Array.from({ length: hud.unlockedTracks }, (_, i) => (i + 1) as TrackId);

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between hud-safe-inset">
      {/* Top Perimeter Bar + Compact Mission & Bengali PA Toasts */}
      <div className="flex flex-col gap-1.5 sm:gap-2">
        {viewport.isCompact ? (
          /* Compact Mobile / Landscape Phone HUD: slim unobstructed top strip + expandable details */
          <div className="flex flex-col gap-1.5">
            <div
              className="pointer-events-auto rounded-lg border border-[#e8b84b]/45 px-2 py-1.5 shadow-md"
              style={{ backgroundColor: 'rgba(18, 43, 31, 0.90)' }}
            >
              <div className="flex items-center justify-between gap-2">
                {/* Left Core Readout: Always visible horizontally in both portrait & landscape */}
                <div className="flex items-center gap-x-2 gap-y-0.5 min-w-0 flex-1 flex-wrap text-[11px] font-mono-tabular">
                  <span className="font-bold text-[#fbf4e2] whitespace-nowrap" data-testid="hud-level">
                    Lvl {hud.level}
                  </span>
                  <span className="font-bold text-[#f5c756] whitespace-nowrap" data-testid="hud-money">
                    {hud.money.toLocaleString()}c
                  </span>
                  <span
                    data-testid="hud-station-tier"
                    className="text-[#86efac] font-semibold whitespace-nowrap hidden sm:inline"
                  >
                    Stn L{hud.stationLevel} ({hud.unlockedTracks}T)
                  </span>
                  <span data-testid="hud-time" className="text-[#fbf4e2] whitespace-nowrap hidden sm:inline">
                    {hud.timeFormatted}
                  </span>
                  <span
                    data-testid="hud-weather-status"
                    className="inline-flex items-center gap-1 text-[#dfd5bc] whitespace-nowrap"
                    title="Automatic Day/Night & Weather Cycle"
                  >
                    {weather === 'rain' ? (
                      <CloudRain className="w-3.5 h-3.5 text-[#7ec8f2]" aria-hidden="true" />
                    ) : (
                      <Sun className="w-3.5 h-3.5 text-[#f5c756]" aria-hidden="true" />
                    )}
                    <span className="hidden md:inline">{weather === 'rain' ? 'Monsoon' : 'Clear'}</span>
                  </span>
                  {!viewport.isNarrowPortrait && (
                    <span className="inline-flex items-center gap-1 text-[10px] text-[#cbbd98] whitespace-nowrap">
                      {activeTrackIds.map((tId) => {
                        const sig = hud.trackSignals[tId] ?? 'red';
                        return (
                          <span
                            key={tId}
                            data-testid={`hud-t${tId}-signal`}
                            className="inline-flex items-center gap-0.5"
                          >
                            <span className={`w-2 h-2 rounded-full ${signalDotClass(sig)}`} />
                            <span>T{tId}</span>
                          </span>
                        );
                      })}
                    </span>
                  )}
                </div>

                {/* Right Compact Action Icons (never squishes left status) */}
                <div className="pointer-events-auto flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    tabIndex={-1}
                    data-testid="hud-details-toggle"
                    aria-label={mobileDetailsOpen ? 'Hide station details' : 'Show station details'}
                    aria-expanded={mobileDetailsOpen}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      setMobileDetailsOpen((v) => !v);
                    }}
                    className={`h-7 sm:h-8 px-1.5 sm:px-2 rounded-lg border flex items-center gap-0.5 text-[10px] font-semibold active:scale-95 transition-transform cursor-pointer ${
                      mobileDetailsOpen
                        ? 'border-[#e8b84b] bg-[#24533c] text-[#fff8dc]'
                        : 'border-[#e8b84b]/35 bg-[#11291d]/95 text-[#dfd5bc]'
                    }`}
                  >
                    <span>Info</span>
                    {mobileDetailsOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    data-testid="mobile-operations-modal-btn"
                    aria-label="Open Station Operations & Tasks"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onOpenOperationsModal();
                    }}
                    className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-[#f59e0b]/60 flex items-center justify-center text-[#fbf4e2] active:scale-95 transition-transform cursor-pointer"
                    style={{ backgroundColor: 'rgba(58, 38, 12, 0.95)' }}
                  >
                    <ClipboardCheck className="w-3.5 h-3.5 text-[#fde68a]" />
                    {(hud.activeOpsCount > 0 || (hud.activeDailyTask?.completed && !hud.activeDailyTask?.claimed)) && (
                      <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-1 rounded-full bg-[#f59e0b] text-[#14241b] text-[8px] font-extrabold flex items-center justify-center">
                        {hud.activeOpsCount > 0 ? hud.activeOpsCount : '!'}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    data-testid="mobile-station-selector-btn"
                    aria-label="Open Chapters & Station Selector"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onOpenStationSelector();
                    }}
                    className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center text-[#fbf4e2] active:scale-95 transition-transform cursor-pointer ${
                      hud.chapter1JustCompleted ? 'border-[#f5c756] animate-pulse' : 'border-[#38bdf8]/55'
                    }`}
                    style={{ backgroundColor: 'rgba(14, 48, 72, 0.95)' }}
                  >
                    <MapPinned className="w-3.5 h-3.5 text-[#7dd3fc]" />
                    {hud.chapter1JustCompleted && (
                      <span className="absolute -top-1 -right-1 px-1 rounded-full bg-[#f5c756] text-[#14241b] text-[8px] font-bold">
                        C2
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    data-testid="mobile-upgrade-dashboard-btn"
                    aria-label="Open Station Expansion & Upgrades"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onOpenUpgradeDashboard();
                    }}
                    className={`relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg border flex items-center justify-center text-[#fbf4e2] active:scale-95 transition-transform cursor-pointer ${
                      hud.nextUpgradeReady ? 'border-[#34d399]' : 'border-[#34d399]/50'
                    }`}
                    style={{ backgroundColor: hud.nextUpgradeReady ? 'rgba(16, 85, 52, 0.95)' : 'rgba(14, 48, 34, 0.95)' }}
                  >
                    <Building2 className="w-3.5 h-3.5 text-[#86efac]" />
                    {hud.nextUpgradeReady && (
                      <span className="absolute -top-1 -right-1 px-1 rounded-full bg-[#22c55e] text-[#052e16] text-[8px] font-bold">
                        UP
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    data-testid="mobile-emergency-dashboard-btn"
                    aria-label="Open Railway Security & Emergency Center"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onOpenEmergencyDashboard();
                    }}
                    className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-[#38bdf8]/60 flex items-center justify-center text-[#fbf4e2] active:scale-95 transition-transform cursor-pointer"
                    style={{ backgroundColor: 'rgba(13, 45, 72, 0.95)' }}
                  >
                    <ShieldAlert className="w-3.5 h-3.5 text-[#7dd3fc]" />
                    {hud.activeMissionsCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-1 rounded-full bg-[#dc2626] text-white text-[9px] font-bold flex items-center justify-center">
                        {hud.activeMissionsCount}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    data-testid="mobile-train-dashboard-btn"
                    aria-label="Open Train Control Dashboard"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onOpenTrainDashboard();
                    }}
                    className="relative w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-[#e8b84b]/60 flex items-center justify-center text-[#fbf4e2] active:scale-95 transition-transform cursor-pointer"
                    style={{ backgroundColor: 'rgba(26, 66, 46, 0.95)' }}
                  >
                    <TrainFront className="w-3.5 h-3.5 text-[#f5c756]" />
                    {hud.urgentTrainsCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[14px] h-3.5 px-1 rounded-full bg-[#dc2626] text-white text-[9px] font-bold flex items-center justify-center">
                        {hud.urgentTrainsCount}
                      </span>
                    )}
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    data-testid="mobile-camera-toggle"
                    aria-label="Switch camera view"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onToggleCameraMode();
                    }}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-[#e8b84b]/40 flex items-center justify-center text-[#fbf4e2] active:scale-95 transition-transform cursor-pointer"
                    style={{ backgroundColor: 'rgba(18, 43, 31, 0.92)' }}
                  >
                    <Eye className="w-3.5 h-3.5 text-[#f5c756]" />
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    data-testid="mobile-audio-mixer-btn"
                    aria-label="Open sound settings"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onOpenAudioMixer();
                    }}
                    className="w-8 h-8 rounded-lg border border-[#e8b84b]/40 hidden sm:flex items-center justify-center text-[#fbf4e2] active:scale-95 transition-transform cursor-pointer"
                    style={{ backgroundColor: 'rgba(18, 43, 31, 0.92)' }}
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label="Pause game"
                    data-testid="pause-button"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onPause();
                    }}
                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg border border-[#e8b84b]/40 flex items-center justify-center text-[#fbf4e2] active:scale-95 transition-transform cursor-pointer"
                    style={{ backgroundColor: 'rgba(18, 43, 31, 0.92)' }}
                  >
                    <Pause className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Ultra-compact 2nd line ONLY on narrow portrait phones for time, track dots & train badge */}
              {viewport.isNarrowPortrait && (
                <div className="mt-1 pt-1 border-t border-[#e8b84b]/20 flex items-center justify-between gap-2 text-[10px] font-mono-tabular text-[#dfd5bc]">
                  <div className="flex items-center gap-1.5 min-w-0 truncate">
                    <span data-testid="hud-station-tier" className="text-[#86efac] font-semibold">
                      L{hud.stationLevel} ({hud.unlockedTracks}T)
                    </span>
                    <span aria-hidden="true">·</span>
                    <span data-testid="hud-time">{hud.timeFormatted}</span>
                    <span aria-hidden="true">·</span>
                    <span className="inline-flex items-center gap-1">
                      {activeTrackIds.map((tId) => {
                        const sig = hud.trackSignals[tId] ?? 'red';
                        return (
                          <span
                            key={tId}
                            data-testid={`hud-t${tId}-signal`}
                            className="inline-flex items-center gap-0.5"
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${signalDotClass(sig)}`} />
                            <span>T{tId}</span>
                          </span>
                        );
                      })}
                    </span>
                  </div>
                  {hud.activeTrainSummary && (
                    <button
                      type="button"
                      tabIndex={-1}
                      data-testid="hud-train-info-card"
                      onClick={(e) => {
                        e.currentTarget.blur();
                        onOpenTrainDashboard();
                      }}
                      className="shrink-0 px-1.5 py-0.5 rounded bg-[#183d2b] border border-[#e8b84b]/35 text-[#fde68a] font-bold truncate max-w-[135px] cursor-pointer"
                    >
                      #{hud.activeTrainSummary.trainNumber}{' '}
                      {hud.activeTrainSummary.assignedPlatform
                        ? `P${hud.activeTrainSummary.assignedPlatform}`
                        : 'Wait'}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Expandable On-Demand Details Drawer on Mobile/Compact Viewports */}
            {mobileDetailsOpen && (
              <div
                data-testid="hud-mobile-details-drawer"
                className="pointer-events-auto rounded-lg border border-[#e8b84b]/45 px-3 py-2 shadow-xl max-w-md text-[11px] font-mono-tabular text-[#dfd5bc] flex flex-col gap-1.5"
                style={{ backgroundColor: 'rgba(15, 36, 26, 0.95)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-[#e8b84b]">{hud.stationName}</span>
                  <span data-testid="hud-day">
                    Day {hud.dayNumber} · {hud.dayPeriodLabel}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span data-testid="hud-reputation">Rep {hud.reputation}%</span>
                    <span data-testid="hud-satisfaction" className="text-[#8ee6b0]">
                      Sat {hud.satisfaction}%
                    </span>
                    <span data-testid="hud-security-rating" className="text-[#7dd3fc]">
                      Sec {hud.securityRating}%
                    </span>
                    <span data-testid="hud-crowd-count" className="text-[#cbd5e1]">
                      Crowd {hud.activeCrowdCount}
                    </span>
                  </div>
                  <span data-testid="hud-xp" className="text-[#d4c6a3]">
                    XP {hud.xp}/{hud.xpToNext}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-[#0d2117] overflow-hidden">
                  <div className="h-full bg-[#36c478]" style={{ width: `${xpPct}%` }} />
                </div>
                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  {activeTrackIds.map((tId) => {
                    const sig = hud.trackSignals[tId] ?? 'red';
                    const occ = hud.trackOccupancies[tId] ?? false;
                    return (
                      <span key={tId} className="inline-flex items-center gap-1">
                        <span className={`px-1.5 py-0.5 rounded font-bold ${signalBadgeClass(sig)}`}>
                          T{tId}:{signalShort(sig)}
                        </span>
                        <span className="text-[#cbbd98]">{occ ? 'Occ' : 'Free'}</span>
                      </span>
                    );
                  })}
                  {hud.activeIncident && (
                    <span
                      data-testid="hud-incident-alert"
                      className="px-1.5 py-0.5 rounded bg-[#b91c1c] text-white font-bold"
                    >
                      Alert: {hud.activeIncident.title} ({hud.activeIncident.locationLabel})
                    </span>
                  )}
                </div>
                {hud.activeTrainSummary && (
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onOpenTrainDashboard();
                    }}
                    className="pt-1 border-t border-[#e8b84b]/20 text-left flex flex-wrap items-center gap-1.5 text-[10px] text-[#e8dfc6] cursor-pointer"
                  >
                    <span className="font-bold text-[#f5c756]">
                      #{hud.activeTrainSummary.trainNumber} {hud.activeTrainSummary.name}
                    </span>
                    <span>→ {hud.activeTrainSummary.destination}</span>
                    <span className="text-[#93c5fd]">{hud.activeTrainSummary.status}</span>
                    {hud.activeTrainSummary.passengerCapacity > 0 && (
                      <span className="text-[#86efac]" data-testid="hud-train-capacity">
                        Pax {hud.activeTrainSummary.currentPassengers}/
                        {hud.activeTrainSummary.passengerCapacity}
                      </span>
                    )}
                    <span className="text-[#e8b84b] uppercase">
                      Doors:{hud.activeTrainSummary.doorState}
                    </span>
                  </button>
                )}
                {hud.activeDailyTask && (
                  <button
                    type="button"
                    tabIndex={-1}
                    data-testid="mobile-daily-task-chip"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onOpenOperationsModal();
                    }}
                    className="pt-1 border-t border-[#e8b84b]/20 text-left flex items-center justify-between gap-2 text-[10px] text-[#fde68a] cursor-pointer"
                  >
                    <span className="truncate font-semibold">
                      Daily Task: {hud.activeDailyTask.title}
                    </span>
                    <span className="font-bold text-[#86efac] shrink-0">
                      {hud.activeDailyTask.completed && !hud.activeDailyTask.claimed
                        ? 'Claim!'
                        : `${hud.activeDailyTask.current}/${hud.activeDailyTask.target}`}
                    </span>
                  </button>
                )}
                {hud.vipSecurityActive && (
                  <button
                    type="button"
                    tabIndex={-1}
                    data-testid="mobile-vip-security-chip"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onOpenTrainDashboard();
                    }}
                    className="pt-1 border-t border-[#f59e0b]/30 text-left flex items-center justify-between gap-2 text-[10px] text-[#fca5a5] font-bold cursor-pointer"
                  >
                    <span className="truncate">
                      VIP SECURITY: Clear P{hud.vipLockedPlatforms.join('/P')}
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-[#b91c1c] text-white shrink-0">
                      Verify [T]
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          /* Desktop HUD Layout (1024px+ width and >540px height) */
          <div className="flex flex-row items-start justify-between gap-4">
            {/* Left Station & Train Status Card */}
            <div className="flex flex-col w-auto max-w-[460px] xl:max-w-[520px] min-w-0">
              <div
                className="pointer-events-auto rounded-lg border border-[#e8b84b]/40 px-3.5 py-2.5 shadow-md"
                style={{ backgroundColor: 'rgba(18, 43, 31, 0.92)' }}
              >
                <div className="font-display font-bold text-sm text-[#fbf4e2] leading-tight truncate">
                  Railway Station Master: Bangladesh Simulator
                </div>

                <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-[#dfd5bc] font-mono-tabular">
                  <span className="font-semibold text-[#e8b84b]">{hud.stationName}</span>
                  <span aria-hidden="true">·</span>
                  <span data-testid="hud-station-tier" className="text-[#86efac] font-semibold">
                    Stn Lvl {hud.stationLevel} ({hud.unlockedTracks} Tracks)
                  </span>
                  <span aria-hidden="true">·</span>
                  <span data-testid="hud-day">Day {hud.dayNumber}</span>
                  <span aria-hidden="true">·</span>
                  <span data-testid="hud-time">
                    {hud.timeFormatted} <span>({hud.dayPeriodLabel})</span>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span
                    data-testid="hud-weather-status"
                    className="inline-flex items-center gap-1 text-[#dfd5bc]"
                    title="Automatic Day/Night & Weather Cycle"
                  >
                    {weather === 'rain' ? (
                      <CloudRain className="w-3 h-3 text-[#7ec8f2]" aria-hidden="true" />
                    ) : (
                      <Sun className="w-3 h-3 text-[#f5c756]" aria-hidden="true" />
                    )}
                    <span>{weather === 'rain' ? 'Monsoon' : 'Clear'}</span>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span data-testid="hud-reputation">Rep {hud.reputation}%</span>
                  <span aria-hidden="true">·</span>
                  <span data-testid="hud-satisfaction" className="text-[#8ee6b0]">
                    Sat {hud.satisfaction}%
                  </span>
                  <span aria-hidden="true">·</span>
                  <span data-testid="hud-security-rating" className="text-[#7dd3fc]">
                    Sec {hud.securityRating}%
                  </span>
                  <span aria-hidden="true">·</span>
                  <span data-testid="hud-crowd-count" className="text-[#cbd5e1]">
                    Crowd {hud.activeCrowdCount}
                  </span>
                </div>

                {/* Compact Track Signal & Occupancy Strip */}
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] font-mono-tabular">
                  {activeTrackIds.map((tId) => {
                    const sig = hud.trackSignals[tId] ?? 'red';
                    const occ = hud.trackOccupancies[tId] ?? false;
                    return (
                      <span key={tId} className="inline-flex items-center gap-1">
                        <span
                          className={`px-1.5 py-0.5 rounded font-bold ${signalBadgeClass(sig)}`}
                          data-testid={`hud-t${tId}-signal`}
                        >
                          T{tId}:{signalShort(sig)}
                        </span>
                        <span className="text-[#cbbd98]">{occ ? 'Occ' : 'Free'}</span>
                      </span>
                    );
                  })}
                  {hud.activeIncident && (
                    <>
                      <span className="text-[#5d7a69]">|</span>
                      <span
                        data-testid="hud-incident-alert"
                        className="px-1.5 py-0.5 rounded bg-[#b91c1c] text-white font-bold"
                      >
                        Alert: {hud.activeIncident.title} ({hud.activeIncident.locationLabel})
                      </span>
                    </>
                  )}
                </div>

                {hud.activeTrainSummary && (
                  <button
                    type="button"
                    tabIndex={-1}
                    data-testid="hud-train-info-card"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onOpenTrainDashboard();
                    }}
                    className="mt-1.5 pt-1.5 border-t border-[#e8b84b]/25 w-full text-left flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] font-mono-tabular text-[#e8dfc6] hover:text-white cursor-pointer"
                  >
                    <span className="font-bold text-[#f5c756]">
                      #{hud.activeTrainSummary.trainNumber} {hud.activeTrainSummary.name}
                    </span>
                    <span className="text-[#cbd5e1]">→ {hud.activeTrainSummary.destination}</span>
                    <span className="px-1 py-0.2 rounded bg-[#183d2b] border border-[#e8b84b]/30 text-[#fde68a] font-bold">
                      {hud.activeTrainSummary.assignedPlatform
                        ? `P${hud.activeTrainSummary.assignedPlatform}`
                        : 'No Plat'}
                    </span>
                    <span className="text-[#93c5fd]">{hud.activeTrainSummary.status}</span>
                    <span className="text-[#cbd5e1]">
                      Arr {hud.activeTrainSummary.scheduledArrivalStr} · Dep{' '}
                      {hud.activeTrainSummary.scheduledDepartureStr}
                    </span>
                    {hud.activeTrainSummary.delayMinutes > 0 && (
                      <span className="px-1 rounded bg-[#7f1d1d] text-[#fecaca] font-bold">
                        +{hud.activeTrainSummary.delayMinutes}m
                      </span>
                    )}
                    {hud.activeTrainSummary.passengerCapacity > 0 && (
                      <span className="text-[#86efac]" data-testid="hud-train-capacity">
                        Pax {hud.activeTrainSummary.currentPassengers}/
                        {hud.activeTrainSummary.passengerCapacity}
                      </span>
                    )}
                    <span className="text-[#e8b84b] uppercase">
                      Doors:{hud.activeTrainSummary.doorState}
                    </span>
                    {hud.activeTrainSummary.hasOperationalEvent && (
                      <span
                        data-testid="hud-train-op-alert"
                        className="px-1.5 py-0.2 rounded bg-[#b45309] text-[#fef3c7] font-bold"
                      >
                        {hud.activeTrainSummary.operationalEventTitle}
                      </span>
                    )}
                  </button>
                )}

                {hud.activeDailyTask && (
                  <button
                    type="button"
                    tabIndex={-1}
                    data-testid="hud-daily-task-chip"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onOpenOperationsModal();
                    }}
                    className="mt-1.5 pt-1.5 border-t border-[#e8b84b]/20 w-full text-left flex items-center justify-between gap-2 text-[10px] font-mono-tabular text-[#fde68a] hover:text-white cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 truncate">
                      <ClipboardCheck className="w-3 h-3 text-[#f59e0b] shrink-0" />
                      <span className="font-semibold text-[#cbbd98]">Daily Task:</span>
                      <span className="truncate text-[#fbf4e2]">{hud.activeDailyTask.title}</span>
                    </span>
                    <span
                      className={`px-1.5 py-0.2 rounded font-bold shrink-0 ${
                        hud.activeDailyTask.completed && !hud.activeDailyTask.claimed
                          ? 'bg-[#22c55e] text-[#052e16]'
                          : 'bg-[#193d2b] text-[#86efac]'
                      }`}
                    >
                      {hud.activeDailyTask.completed && !hud.activeDailyTask.claimed
                        ? 'Claim Reward!'
                        : `${hud.activeDailyTask.current}/${hud.activeDailyTask.target}`}
                    </span>
                  </button>
                )}

                {hud.vipSecurityActive && (
                  <button
                    type="button"
                    tabIndex={-1}
                    data-testid="hud-vip-security-chip"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onOpenTrainDashboard();
                    }}
                    className="mt-1.5 pt-1.5 border-t border-[#ef4444]/40 w-full text-left flex items-center justify-between gap-2 text-[10px] font-mono-tabular text-[#fecaca] hover:text-white cursor-pointer"
                  >
                    <span className="flex items-center gap-1.5 truncate font-bold">
                      <Siren className="w-3 h-3 text-[#f87171] shrink-0" />
                      <span className="truncate">
                        VIP Security: Clear P{hud.vipLockedPlatforms.join('/P')}
                      </span>
                    </span>
                    <span className="px-1.5 py-0.2 rounded bg-[#b91c1c] text-white font-bold shrink-0">
                      Control [T]
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Stats Strip + Desktop Controls */}
            <div className="flex items-start gap-2 shrink-0">
              <div
                className="pointer-events-auto w-auto rounded-lg border border-[#e8b84b]/40 px-4 py-2.5 shadow-md"
                style={{ backgroundColor: 'rgba(18, 43, 31, 0.92)' }}
              >
                <div className="flex items-center justify-start gap-4 text-sm font-mono-tabular text-[#fbf4e2]">
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-[#d4c6a3]">Level</span>
                    <span className="font-bold text-base text-[#fbf4e2]" data-testid="hud-level">
                      Level {hud.level}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] uppercase tracking-wider text-[#d4c6a3]">Money</span>
                    <span className="font-bold text-base text-[#f5c756]" data-testid="hud-money">
                      {hud.money.toLocaleString()} coins
                    </span>
                  </div>
                  <div className="flex flex-col min-w-[74px]">
                    <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-[#d4c6a3]">
                      <span>XP</span>
                      <span data-testid="hud-xp">
                        {hud.xp}/{hud.xpToNext}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-[#0d2117] overflow-hidden">
                      <div
                        className="h-full bg-[#36c478] transition-all duration-200"
                        style={{ width: `${xpPct}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Desktop Action Cluster */}
              <div className="pointer-events-auto flex items-center gap-1.5">
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="open-operations-modal-btn"
                  aria-label="Open Station Operations & Tasks"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onOpenOperationsModal();
                  }}
                  className="relative h-10 px-2.5 rounded-lg border border-[#f59e0b]/70 flex items-center gap-1.5 text-xs font-bold text-[#fef3c7] bg-[#4a2e0b] hover:bg-[#5c390d] active:scale-95 transition-transform cursor-pointer whitespace-nowrap"
                >
                  <ClipboardCheck className="w-3.5 h-3.5 text-[#f5c756]" />
                  <span>Ops [O]</span>
                  {hud.activeOpsCount > 0 && (
                    <span
                      data-testid="hud-active-ops-badge"
                      className="ml-0.5 px-1.5 py-0.2 rounded-full bg-[#f59e0b] text-[#14241b] text-[10px] font-bold"
                    >
                      {hud.activeOpsCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="open-station-selector-btn"
                  aria-label="Open Chapters & Station Selector"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onOpenStationSelector();
                  }}
                  className={`relative h-10 px-2.5 rounded-lg border flex items-center gap-1.5 text-xs font-bold active:scale-95 transition-transform cursor-pointer whitespace-nowrap ${
                    hud.chapter1JustCompleted
                      ? 'border-[#f5c756] bg-[#14532d] text-[#fef08a] animate-pulse'
                      : 'border-[#38bdf8]/65 bg-[#0e3954] hover:bg-[#134c70] text-[#e0f2fe]'
                  }`}
                >
                  <MapPinned className="w-3.5 h-3.5 text-[#7dd3fc]" />
                  <span>Ch {hud.chapterId} [C]</span>
                  {hud.chapter1JustCompleted && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-[#f5c756] text-[#14241b] text-[10px] font-bold">
                      Ch 2!
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="open-upgrade-dashboard-btn"
                  aria-label="Open Station Expansion & Upgrades"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onOpenUpgradeDashboard();
                  }}
                  className={`relative h-10 px-2.5 rounded-lg border flex items-center gap-1.5 text-xs font-bold active:scale-95 transition-transform cursor-pointer whitespace-nowrap ${
                    hud.nextUpgradeReady
                      ? 'border-[#4ade80] bg-[#166534] hover:bg-[#15803d] text-[#ecfdf5]'
                      : 'border-[#34d399]/60 bg-[#0d3b27] hover:bg-[#114a31] text-[#a7f3d0]'
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5 text-[#86efac]" />
                  <span>Upgrade [U]</span>
                  {hud.nextUpgradeReady && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-[#4ade80] text-[#052e16] text-[10px] font-bold">
                      Ready
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="open-emergency-dashboard-btn"
                  aria-label="Open Railway Security & Emergency Center"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onOpenEmergencyDashboard();
                  }}
                  className="relative h-10 px-2.5 rounded-lg border border-[#38bdf8]/70 flex items-center gap-1.5 text-xs font-bold text-[#e0f2fe] bg-[#0c4a6e] hover:bg-[#075985] active:scale-95 transition-transform cursor-pointer whitespace-nowrap"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-[#7dd3fc]" />
                  <span>Security [G]</span>
                  {hud.activeMissionsCount > 0 && (
                    <span
                      data-testid="hud-active-missions-badge"
                      className="ml-0.5 px-1.5 py-0.2 rounded-full bg-[#dc2626] text-white text-[10px] font-bold"
                    >
                      {hud.activeMissionsCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="open-train-dashboard-btn"
                  aria-label="Open Train Control Dashboard"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onOpenTrainDashboard();
                  }}
                  className="relative h-10 px-2.5 rounded-lg border border-[#e8b84b]/70 flex items-center gap-1.5 text-xs font-bold text-[#14241b] bg-[#e8b84b] hover:bg-[#f2c65e] active:scale-95 transition-transform cursor-pointer whitespace-nowrap"
                >
                  <TrainFront className="w-3.5 h-3.5" />
                  <span>Trains [T]</span>
                  {hud.urgentTrainsCount > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-[#b91c1c] text-white text-[10px] font-bold">
                      {hud.urgentTrainsCount}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="camera-mode-toggle"
                  aria-label="Toggle First-Person or Third-Person camera"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onToggleCameraMode();
                  }}
                  className="h-10 px-3 rounded-lg border border-[#e8b84b]/40 flex items-center gap-1.5 text-xs font-semibold text-[#fbf4e2] hover:bg-[#1e4a35] active:scale-95 transition-transform cursor-pointer whitespace-nowrap"
                  style={{ backgroundColor: 'rgba(18, 43, 31, 0.92)' }}
                >
                  <Eye className="w-3.5 h-3.5 text-[#f5c756]" />
                  <span>{cameraMode === 'first-person' ? '1st [V]' : '3rd [V]'}</span>
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="audio-mixer-btn"
                  aria-label="Open audio volume mixer"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onOpenAudioMixer();
                  }}
                  className="w-10 h-10 rounded-lg border border-[#e8b84b]/40 flex items-center justify-center text-[#fbf4e2] hover:bg-[#1e4a35] active:scale-95 transition-transform cursor-pointer"
                  style={{ backgroundColor: 'rgba(18, 43, 31, 0.92)' }}
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  aria-label={muted ? 'Unmute audio' : 'Mute audio'}
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onToggleMute();
                  }}
                  className="w-10 h-10 rounded-lg border border-[#e8b84b]/40 flex items-center justify-center text-[#fbf4e2] hover:bg-[#1e4a35] active:scale-95 transition-transform cursor-pointer"
                  style={{ backgroundColor: 'rgba(18, 43, 31, 0.92)' }}
                >
                  {muted ? <VolumeX className="w-4 h-4 text-[#f07065]" /> : <Volume2 className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  tabIndex={-1}
                  aria-label="Pause game"
                  data-testid="pause-button"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onPause();
                  }}
                  className="w-10 h-10 rounded-lg border border-[#e8b84b]/40 flex items-center justify-center text-[#fbf4e2] hover:bg-[#1e4a35] active:scale-95 transition-transform cursor-pointer"
                  style={{ backgroundColor: 'rgba(18, 43, 31, 0.92)' }}
                >
                  <Pause className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mission & Bengali PA Banners: ultra-slim single-line chips on compact screens so 3D view stays clear */}
        {viewport.isCompact ? (
          (hud.primaryMission || announcementBanner) && (
            <div className="flex flex-wrap items-center justify-center gap-1.5 px-1">
              {hud.primaryMission && (
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="hud-primary-mission-banner"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onOpenEmergencyDashboard();
                  }}
                  className="pointer-events-auto max-w-[92vw] sm:max-w-[44vw] rounded-md border border-[#f87171]/75 px-2.5 py-1 shadow-md flex items-center gap-1.5 text-[11px] text-[#fff1f2] hover:bg-[#7f1d1d] cursor-pointer"
                  style={{ backgroundColor: 'rgba(105, 16, 24, 0.90)' }}
                >
                  <Siren className="w-3 h-3 text-[#fca5a5] shrink-0" />
                  <span className="font-bold text-[#fde68a] truncate">
                    {hud.primaryMission.title} ({hud.primaryMission.locationLabel})
                  </span>
                  <span className="px-1 py-0.2 rounded bg-[#450a0a] font-mono-tabular font-bold text-[#fca5a5] shrink-0">
                    {Math.max(0, Math.ceil(hud.primaryMission.timeRemainingSec))}s
                  </span>
                </button>
              )}

              {hud.activeDailyTask && (
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="hud-daily-task-chip"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onOpenOperationsModal();
                  }}
                  className="pointer-events-auto max-w-[92vw] sm:max-w-[44vw] rounded-md border border-[#f59e0b]/65 px-2.5 py-1 shadow-md flex items-center gap-1.5 text-[11px] text-[#fef3c7] cursor-pointer"
                  style={{ backgroundColor: 'rgba(54, 35, 11, 0.88)' }}
                >
                  <ClipboardCheck className="w-3 h-3 text-[#f5c756] shrink-0" />
                  <span className="truncate font-semibold">{hud.activeDailyTask.title}</span>
                  <span className="px-1 py-0.2 rounded bg-[#14241b] font-mono-tabular font-bold text-[#86efac] shrink-0">
                    {hud.activeDailyTask.completed && !hud.activeDailyTask.claimed
                      ? 'Claim!'
                      : `${hud.activeDailyTask.current}/${hud.activeDailyTask.target}`}
                  </span>
                </button>
              )}

              {announcementBanner && (
                <div
                  data-testid="bengali-announcement-banner"
                  className="max-w-[92vw] sm:max-w-[48vw] rounded-md border border-[#f5c756]/55 px-2.5 py-1 shadow-md flex items-center gap-1.5 text-[11px] text-[#fbf4e2]"
                  style={{ backgroundColor: 'rgba(16, 40, 29, 0.90)' }}
                >
                  <Megaphone className="w-3 h-3 text-[#f5c756] shrink-0" />
                  <span className={viewport.isLandscapeCompact ? 'truncate' : 'line-clamp-1'}>
                    {announcementBanner}
                  </span>
                </div>
              )}
            </div>
          )
        ) : (
          <>
            {hud.primaryMission && (
              <div className="mx-auto max-w-2xl px-2">
                <button
                  type="button"
                  tabIndex={-1}
                  data-testid="hud-primary-mission-banner"
                  onClick={(e) => {
                    e.currentTarget.blur();
                    onOpenEmergencyDashboard();
                  }}
                  className="pointer-events-auto rounded-lg border border-[#f87171]/75 px-3 py-1.5 shadow-lg flex flex-wrap items-center justify-center gap-2 text-xs text-[#fff1f2] hover:bg-[#7f1d1d] cursor-pointer"
                  style={{ backgroundColor: 'rgba(105, 16, 24, 0.94)' }}
                >
                  <Siren className="w-3.5 h-3.5 text-[#fca5a5] shrink-0" />
                  <span className="font-bold text-[#fde68a]">
                    {hud.primaryMission.title} ({hud.primaryMission.locationLabel})
                  </span>
                  <span className="text-[#fecaca]">{hud.primaryMission.objective}</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#450a0a] font-mono-tabular font-bold text-[#fca5a5]">
                    {Math.max(0, Math.ceil(hud.primaryMission.timeRemainingSec))}s
                  </span>
                </button>
              </div>
            )}

            {announcementBanner && (
              <div className="mx-auto max-w-xl px-3">
                <div
                  data-testid="bengali-announcement-banner"
                  className="rounded-lg border border-[#f5c756]/60 px-3.5 py-2 shadow-lg flex items-center gap-2.5 text-sm text-[#fbf4e2]"
                  style={{ backgroundColor: 'rgba(16, 40, 29, 0.94)' }}
                >
                  <Megaphone className="w-4 h-4 text-[#f5c756] shrink-0" />
                  <span className="leading-snug">{announcementBanner}</span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Subtle First-Person Reticle */}
      {cameraMode === 'first-person' && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-2 h-2 rounded-full border border-[#fff8dc] bg-[#e8b84b]/70" />
        </div>
      )}

      {/* Bottom Prompt & Event Feed: bottom-left in landscape touch mode so center view stays open */}
      <div
        className={`flex flex-col gap-1 ${
          isTouchMode
            ? viewport.isLandscapeCompact
              ? 'items-start mb-1 max-w-[calc(100vw-256px)]'
              : 'items-center mb-36'
            : 'items-center mb-1'
        }`}
      >
        {hud.nearbyPrompt && (
          <button
            type="button"
            data-testid="nearby-interact-prompt"
            onClick={(e) => {
              e.currentTarget.blur();
              onInteractClick();
            }}
            className="pointer-events-auto rounded-lg border border-[#f5c756] px-3 py-1 sm:px-4 sm:py-2 shadow-lg flex items-center gap-2 sm:gap-3 text-left hover:bg-[#23543d] active:scale-95 transition-transform cursor-pointer max-w-full"
            style={{ backgroundColor: 'rgba(18, 46, 33, 0.93)' }}
          >
            <span className="px-1.5 py-0.5 rounded bg-[#e8b84b] text-[#14241b] font-mono-tabular font-bold text-[11px] sm:text-xs shrink-0">
              E
            </span>
            <div className="min-w-0">
              <div className="text-[11px] sm:text-xs font-bold text-[#fbf4e2] truncate">
                {hud.nearbyPrompt.title}
              </div>
              <div className="text-[10px] sm:text-[11px] text-[#e8b84b] truncate">
                {hud.nearbyPrompt.actionLabel}
              </div>
            </div>
          </button>
        )}

        {!(viewport.isLandscapeCompact && hud.nearbyPrompt) && (
          <div
            className={`rounded-md border border-[#e8b84b]/25 px-2.5 py-1 text-[10px] sm:text-xs text-[#f2ead4] ${
              viewport.isCompact
                ? viewport.isLandscapeCompact
                  ? 'max-w-[calc(100vw-256px)] truncate text-left'
                  : 'max-w-[92vw] truncate text-center'
                : 'max-w-5xl text-center'
            }`}
            style={{ backgroundColor: 'rgba(16, 38, 28, 0.86)' }}
            data-testid="hud-event-log"
          >
            <span>{hud.lastEventMessage}</span>
            {!isTouchMode && !viewport.isCompact && (
              <span className="hidden md:inline text-[#cbbd98]">
                {' '}
                · WASD Move · T Trains · U Upgrade · G Security · O Ops · C Chapters · V Cam · E Interact ·{' '}
                {pointerLocked ? 'ESC Unlock' : 'Click Lock Look'}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
