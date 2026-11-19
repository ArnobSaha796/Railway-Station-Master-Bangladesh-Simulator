import {
  Building2,
  Clock3,
  CloudRain,
  Eye,
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
  onToggleWeather: () => void;
  onCycleTimeOfDay: () => void;
  onOpenAudioMixer: () => void;
  onOpenTrainDashboard: () => void;
  onOpenUpgradeDashboard: () => void;
  onOpenEmergencyDashboard: () => void;
  onPause: () => void;
  onInteractClick: () => void;
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
  onToggleWeather,
  onCycleTimeOfDay,
  onOpenAudioMixer,
  onOpenTrainDashboard,
  onOpenUpgradeDashboard,
  onOpenEmergencyDashboard,
  onPause,
  onInteractClick,
}: GameHUDProps) {
  const xpPct = Math.min(100, Math.round((hud.xp / Math.max(1, hud.xpToNext)) * 100));
  const activeTrackIds = Array.from({ length: hud.unlockedTracks }, (_, i) => (i + 1) as TrackId);

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-2.5 sm:p-4">
      {/* Top Perimeter Bar + Optional Bengali PA Banner */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
          {/* Left Station & Train Status Card (full-width on mobile, bounded on desktop) */}
          <div className="flex flex-col w-full sm:w-auto sm:max-w-[440px] lg:max-w-[500px] min-w-0">
            <div
              className="pointer-events-auto rounded-lg border border-[#e8b84b]/40 px-2.5 py-2 sm:px-3.5 sm:py-2.5 shadow-md"
              style={{ backgroundColor: 'rgba(18, 43, 31, 0.92)' }}
            >
              {/* Title + Mobile-only utility buttons */}
              <div className="flex items-center justify-between gap-2">
                <div className="font-display font-bold text-xs sm:text-sm text-[#fbf4e2] leading-tight truncate">
                  Railway Station Master<span className="hidden sm:inline">: Bangladesh Simulator</span>
                </div>

                {/* Mobile-only right utility buttons */}
                <div className="pointer-events-auto flex sm:hidden items-center gap-1 shrink-0">
                  <button
                    type="button"
                    tabIndex={-1}
                    data-testid="mobile-upgrade-dashboard-btn"
                    aria-label="Open Station Expansion & Upgrades"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onOpenUpgradeDashboard();
                    }}
                    className={`relative w-9 h-9 rounded-lg border flex items-center justify-center text-[#fbf4e2] active:scale-95 transition-transform cursor-pointer ${
                      hud.nextUpgradeReady ? 'border-[#34d399]' : 'border-[#34d399]/50'
                    }`}
                    style={{ backgroundColor: hud.nextUpgradeReady ? 'rgba(16, 85, 52, 0.95)' : 'rgba(14, 48, 34, 0.95)' }}
                  >
                    <Building2 className="w-4 h-4 text-[#86efac]" />
                    {hud.nextUpgradeReady && (
                      <span className="absolute -top-1 -right-1 px-1 rounded-full bg-[#22c55e] text-[#052e16] text-[9px] font-bold">
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
                    className="relative w-9 h-9 rounded-lg border border-[#38bdf8]/60 flex items-center justify-center text-[#fbf4e2] active:scale-95 transition-transform cursor-pointer"
                    style={{ backgroundColor: 'rgba(13, 45, 72, 0.95)' }}
                  >
                    <ShieldAlert className="w-4 h-4 text-[#7dd3fc]" />
                    {hud.activeMissionsCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#dc2626] text-white text-[10px] font-bold flex items-center justify-center">
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
                    className="relative w-9 h-9 rounded-lg border border-[#e8b84b]/60 flex items-center justify-center text-[#fbf4e2] active:scale-95 transition-transform cursor-pointer"
                    style={{ backgroundColor: 'rgba(26, 66, 46, 0.95)' }}
                  >
                    <TrainFront className="w-4 h-4 text-[#f5c756]" />
                    {hud.urgentTrainsCount > 0 && (
                      <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 rounded-full bg-[#dc2626] text-white text-[10px] font-bold flex items-center justify-center">
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
                    className="w-9 h-9 rounded-lg border border-[#e8b84b]/40 flex items-center justify-center text-[#fbf4e2] active:scale-95 transition-transform cursor-pointer"
                    style={{ backgroundColor: 'rgba(18, 43, 31, 0.92)' }}
                  >
                    <Eye className="w-4 h-4 text-[#f5c756]" />
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
                    className="w-9 h-9 rounded-lg border border-[#e8b84b]/40 flex items-center justify-center text-[#fbf4e2] active:scale-95 transition-transform cursor-pointer"
                    style={{ backgroundColor: 'rgba(18, 43, 31, 0.92)' }}
                  >
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label="Pause game"
                    onClick={(e) => {
                      e.currentTarget.blur();
                      onPause();
                    }}
                    className="w-9 h-9 rounded-lg border border-[#e8b84b]/40 flex items-center justify-center text-[#fbf4e2] active:scale-95 transition-transform cursor-pointer"
                    style={{ backgroundColor: 'rgba(18, 43, 31, 0.92)' }}
                  >
                    <Pause className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] sm:text-xs text-[#dfd5bc] font-mono-tabular">
                <span className="font-semibold text-[#e8b84b] hidden sm:inline">{hud.stationName}</span>
                <span aria-hidden="true" className="hidden sm:inline">·</span>
                <span data-testid="hud-station-tier" className="text-[#86efac] font-semibold">
                  Stn Lvl {hud.stationLevel} ({hud.unlockedTracks} Tracks)
                </span>
                <span aria-hidden="true">·</span>
                <span data-testid="hud-day">Day {hud.dayNumber}</span>
                <span aria-hidden="true">·</span>
                <span data-testid="hud-time">
                  {hud.timeFormatted} <span className="hidden sm:inline">({hud.dayPeriodLabel})</span>
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
                  <span className="text-[#cbd5e1]">
                    → {hud.activeTrainSummary.destination}
                  </span>
                  <span className="px-1 py-0.2 rounded bg-[#183d2b] border border-[#e8b84b]/30 text-[#fde68a] font-bold">
                    {hud.activeTrainSummary.assignedPlatform
                      ? `P${hud.activeTrainSummary.assignedPlatform}`
                      : 'No Plat'}
                  </span>
                  <span className="text-[#93c5fd]">{hud.activeTrainSummary.status}</span>
                  <span className="text-[#cbd5e1] hidden sm:inline">
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
            </div>
          </div>

          {/* Stats Strip + Desktop Controls */}
          <div className="flex items-start gap-2 shrink-0">
            <div
              className="pointer-events-auto w-full sm:w-auto rounded-lg border border-[#e8b84b]/40 px-3 py-1.5 sm:px-4 sm:py-2.5 shadow-md"
              style={{ backgroundColor: 'rgba(18, 43, 31, 0.92)' }}
            >
              <div className="flex items-center justify-between sm:justify-start gap-3 sm:gap-4 text-xs sm:text-sm font-mono-tabular text-[#fbf4e2]">
                <div className="flex items-baseline sm:flex-col gap-1 sm:gap-0">
                  <span className="text-[10px] uppercase tracking-wider text-[#d4c6a3]">Level</span>
                  <span className="font-bold text-xs sm:text-base text-[#fbf4e2]" data-testid="hud-level">
                    Level {hud.level}
                  </span>
                </div>
                <div className="flex items-baseline sm:flex-col gap-1 sm:gap-0">
                  <span className="text-[10px] uppercase tracking-wider text-[#d4c6a3]">Money</span>
                  <span className="font-bold text-xs sm:text-base text-[#f5c756]" data-testid="hud-money">
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
            <div className="pointer-events-auto hidden sm:flex items-center gap-1.5">
              <button
                type="button"
                tabIndex={-1}
                data-testid="open-upgrade-dashboard-btn"
                aria-label="Open Station Expansion & Upgrades"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onOpenUpgradeDashboard();
                }}
                className={`relative h-10 px-3 rounded-lg border flex items-center gap-1.5 text-xs font-bold active:scale-95 transition-transform cursor-pointer whitespace-nowrap ${
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
                className="relative h-10 px-3 rounded-lg border border-[#38bdf8]/70 flex items-center gap-1.5 text-xs font-bold text-[#e0f2fe] bg-[#0c4a6e] hover:bg-[#075985] active:scale-95 transition-transform cursor-pointer whitespace-nowrap"
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
                className="relative h-10 px-3 rounded-lg border border-[#e8b84b]/70 flex items-center gap-1.5 text-xs font-bold text-[#14241b] bg-[#e8b84b] hover:bg-[#f2c65e] active:scale-95 transition-transform cursor-pointer whitespace-nowrap"
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
                data-testid="cycle-time-btn"
                aria-label="Cycle time of day (Dawn, Noon, Golden Dusk, Night)"
                onClick={(e) => {
                  e.currentTarget.blur();
                  onCycleTimeOfDay();
                }}
                className="w-10 h-10 rounded-lg border border-[#e8b84b]/40 flex items-center justify-center text-[#fbf4e2] hover:bg-[#1e4a35] active:scale-95 transition-transform cursor-pointer"
                style={{ backgroundColor: 'rgba(18, 43, 31, 0.92)' }}
              >
                <Clock3 className="w-4 h-4 text-[#f5c756]" />
              </button>

              <button
                type="button"
                tabIndex={-1}
                data-testid="weather-toggle-btn"
                aria-label={weather === 'rain' ? 'Switch to clear weather' : 'Switch to monsoon rain'}
                onClick={(e) => {
                  e.currentTarget.blur();
                  onToggleWeather();
                }}
                className="w-10 h-10 rounded-lg border border-[#e8b84b]/40 flex items-center justify-center text-[#fbf4e2] hover:bg-[#1e4a35] active:scale-95 transition-transform cursor-pointer"
                style={{ backgroundColor: 'rgba(18, 43, 31, 0.92)' }}
              >
                {weather === 'rain' ? (
                  <CloudRain className="w-4 h-4 text-[#7ec8f2]" />
                ) : (
                  <Sun className="w-4 h-4 text-[#f5c756]" />
                )}
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

        {/* Active Security / Emergency Mission Banner */}
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
              className="pointer-events-auto rounded-lg border border-[#f87171]/75 px-3 py-1.5 shadow-lg flex flex-wrap items-center justify-center gap-2 text-[11px] sm:text-xs text-[#fff1f2] hover:bg-[#7f1d1d] cursor-pointer"
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

        {/* Bengali PA Announcement Subtitle Toast anchored cleanly beneath top bar */}
        {announcementBanner && (
          <div className="mx-auto max-w-xl px-3">
            <div
              data-testid="bengali-announcement-banner"
              className="rounded-lg border border-[#f5c756]/60 px-3.5 py-2 shadow-lg flex items-center gap-2.5 text-xs sm:text-sm text-[#fbf4e2]"
              style={{ backgroundColor: 'rgba(16, 40, 29, 0.94)' }}
            >
              <Megaphone className="w-4 h-4 text-[#f5c756] shrink-0" />
              <span className="leading-snug">{announcementBanner}</span>
            </div>
          </div>
        )}
      </div>

      {/* Subtle First-Person Reticle */}
      {cameraMode === 'first-person' && (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-2 h-2 rounded-full border border-[#fff8dc] bg-[#e8b84b]/70" />
        </div>
      )}

      {/* Bottom Center: Contextual Interaction Prompt & Station Event Feed */}
      <div
        className={`flex flex-col items-center gap-1.5 ${
          isTouchMode ? 'mb-44 sm:mb-2' : 'mb-1'
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
            className="pointer-events-auto rounded-lg border border-[#f5c756] px-3.5 py-1.5 sm:px-4 sm:py-2 shadow-lg flex items-center gap-2.5 sm:gap-3 text-left hover:bg-[#23543d] active:scale-95 transition-transform cursor-pointer"
            style={{ backgroundColor: 'rgba(18, 46, 33, 0.95)' }}
          >
            <span className="px-2 py-0.5 rounded bg-[#e8b84b] text-[#14241b] font-mono-tabular font-bold text-xs">
              E
            </span>
            <div>
              <div className="text-xs font-bold text-[#fbf4e2]">{hud.nearbyPrompt.title}</div>
              <div className="text-[11px] text-[#e8b84b]">{hud.nearbyPrompt.actionLabel}</div>
            </div>
          </button>
        )}

        <div
          className={`rounded-md border border-[#e8b84b]/25 px-3 py-1 text-[11px] sm:text-xs text-[#f2ead4] text-center ${
            isTouchMode ? 'max-w-[92vw] sm:max-w-[440px] md:max-w-2xl' : 'max-w-[92vw] sm:max-w-5xl'
          }`}
          style={{ backgroundColor: 'rgba(16, 38, 28, 0.88)' }}
          data-testid="hud-event-log"
        >
          <span>{hud.lastEventMessage}</span>
          {!isTouchMode && (
            <span className="hidden md:inline text-[#cbbd98]">
              {' '}
              · WASD Move · T Trains · U Upgrade · G Security · L Time · V Cam · E Interact ·{' '}
              {pointerLocked ? 'ESC Unlock' : 'Click Lock Look'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
