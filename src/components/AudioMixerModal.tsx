import { CloudRain, Megaphone, Sun, Volume2, VolumeX, X } from 'lucide-react';
import { clampVolume } from '../game/rules';
import type { AudioSettings, WeatherMode } from '../game/types';

interface AudioMixerModalProps {
  settings: AudioSettings;
  weather: WeatherMode;
  onChangeSettings: (next: AudioSettings) => void;
  onChangeWeather: (next: WeatherMode) => void;
  onTriggerAnnouncement: () => void;
  onClose: () => void;
}

const CHANNELS: { key: keyof Omit<AudioSettings, 'muted'>; label: string }[] = [
  { key: 'master', label: 'Master Volume' },
  { key: 'music', label: 'Music' },
  { key: 'environment', label: 'Environment & Crowd' },
  { key: 'train', label: 'Train Sounds' },
  { key: 'announcements', label: 'Announcements (PA)' },
];

export function AudioMixerModal({
  settings,
  weather,
  onChangeSettings,
  onChangeWeather,
  onTriggerAnnouncement,
  onClose,
}: AudioMixerModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(10, 22, 16, 0.72)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="audio-mixer-title"
    >
      <div
        className="w-full max-w-md rounded-xl border border-[#e8b84b]/50 p-5 sm:p-6 shadow-2xl text-[#fbf4e2]"
        style={{ backgroundColor: '#143022' }}
      >
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-[#e8b84b] font-semibold">
              Station Acoustics &amp; Weather
            </div>
            <h2 id="audio-mixer-title" className="font-display text-xl font-bold">
              Sound &amp; Atmosphere Mixer
            </h2>
          </div>
          <button
            type="button"
            aria-label="Close audio mixer"
            onClick={onClose}
            className="w-10 h-10 rounded-lg border border-[#e8b84b]/35 bg-[#0d2117] hover:bg-[#1e4a35] flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {CHANNELS.map(({ key, label }) => {
            const pct = Math.round(settings[key] * 100);
            return (
              <label key={key} className="block">
                <div className="flex items-center justify-between text-xs font-medium text-[#e5dbc2] mb-1">
                  <span>{label}</span>
                  <span className="font-mono-tabular text-[#f5c756]">{pct}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={pct}
                  data-testid={`volume-slider-${key}`}
                  onChange={(e) => {
                    const val = clampVolume(Number(e.target.value) / 100);
                    onChangeSettings({ ...settings, [key]: val });
                  }}
                  className="w-full accent-[#e8b84b] h-2 rounded-lg bg-[#0d2117] cursor-pointer"
                />
              </label>
            );
          })}
        </div>

        {/* Quick Actions: Mute, Bengali PA Announcement, Monsoon Weather */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-2">
          <button
            type="button"
            data-testid="mixer-mute-btn"
            onClick={() => onChangeSettings({ ...settings, muted: !settings.muted })}
            className="py-2.5 px-3 rounded-lg border border-[#e8b84b]/35 bg-[#0d2117] hover:bg-[#1a3d2b] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            {settings.muted ? <VolumeX className="w-4 h-4 text-[#f07065]" /> : <Volume2 className="w-4 h-4 text-[#36c478]" />}
            <span>{settings.muted ? 'Audio Muted' : 'Audio Active'}</span>
          </button>

          <button
            type="button"
            data-testid="mixer-weather-btn"
            onClick={() => onChangeWeather(weather === 'clear' ? 'rain' : 'clear')}
            className="py-2.5 px-3 rounded-lg border border-[#e8b84b]/35 bg-[#0d2117] hover:bg-[#1a3d2b] text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            {weather === 'rain' ? (
              <>
                <CloudRain className="w-4 h-4 text-[#7ec8f2]" />
                <span>Monsoon Rain</span>
              </>
            ) : (
              <>
                <Sun className="w-4 h-4 text-[#f5c756]" />
                <span>Clear Day</span>
              </>
            )}
          </button>
        </div>

        <button
          type="button"
          data-testid="trigger-announcement-btn"
          onClick={onTriggerAnnouncement}
          className="mt-2.5 w-full py-2.5 px-3 rounded-lg bg-[#1d4d37] hover:bg-[#256145] border border-[#e8b84b]/40 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
        >
          <Megaphone className="w-4 h-4 text-[#f5c756]" />
          <span>Play Bengali PA Announcement</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full py-2.5 rounded-lg bg-[#e8b84b] hover:bg-[#f2c65e] text-[#14241b] font-display font-bold text-sm cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
}
