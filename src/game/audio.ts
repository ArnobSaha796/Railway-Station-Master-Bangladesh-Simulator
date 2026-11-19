import { BENGALI_ANNOUNCEMENTS, createDefaultAudioSettings } from './rules';
import type { AudioSettings, WeatherMode } from './types';

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private envGain: GainNode | null = null;
  private trainGain: GainNode | null = null;
  private announceGain: GainNode | null = null;

  // Continuous ambient nodes
  private noiseBuffer: AudioBuffer | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineHarmOsc: OscillatorNode | null = null;
  private engineProximityGain: GainNode | null = null;
  private crowdGain: GainNode | null = null;
  private rainGain: GainNode | null = null;

  private settings: AudioSettings = createDefaultAudioSettings();
  private weather: WeatherMode = 'clear';
  private active = false;
  private trainProximity = 0.5;
  private ambientTimer: number | null = null;
  private musicStep = 0;
  private announceIdx = 0;
  private speechVoices: SpeechSynthesisVoice[] = [];
  private speechWarmedUp = false;
  private speechTimer: number | null = null;
  private onAnnouncementCb: ((text: string) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.refreshSpeechVoices();
      try {
        window.speechSynthesis.addEventListener('voiceschanged', this.handleVoicesChanged);
      } catch {
        // Ignore browsers without addEventListener on speechSynthesis
      }
    }
  }

  private handleVoicesChanged = () => {
    this.refreshSpeechVoices();
  };

  private refreshSpeechVoices() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        this.speechVoices = voices;
      }
    } catch {
      // Ignore
    }
  }

  private findBengaliVoice(): SpeechSynthesisVoice | null {
    this.refreshSpeechVoices();
    const voices = this.speechVoices;
    return (
      voices.find((v) => v.lang.toLowerCase().startsWith('bn')) ||
      voices.find((v) => v.name.toLowerCase().includes('bengali') || v.name.toLowerCase().includes('bangla')) ||
      voices.find((v) => v.lang.toLowerCase().includes('bn-bd') || v.lang.toLowerCase().includes('bn_in')) ||
      null
    );
  }

  public unlockFromGesture() {
    const ctx = this.ensureGraph(true);
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
      // Play silent 1-sample pulse inside synchronous gesture to guarantee running state on PC browsers
      try {
        const silent = ctx.createBuffer(1, 1, ctx.sampleRate);
        const src = ctx.createBufferSource();
        src.buffer = silent;
        src.connect(ctx.destination);
        src.start(0);
      } catch {
        // Ignore
      }
      this.applyVolumes();
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.refreshSpeechVoices();
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        if (!this.speechWarmedUp) {
          this.speechWarmedUp = true;
          const prime = new SpeechSynthesisUtterance(' ');
          prime.volume = 0;
          prime.rate = 2;
          window.speechSynthesis.speak(prime);
        }
      } catch {
        // Ignore speech warmup errors
      }
    }
  }

  public setOnAnnouncement(cb: ((text: string) => void) | null) {
    this.onAnnouncementCb = cb;
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public updateSettings(next: AudioSettings) {
    this.settings = { ...next };
    this.applyVolumes();
  }

  public setMuted(muted: boolean) {
    this.settings = { ...this.settings, muted };
    this.applyVolumes();
  }

  public isMuted(): boolean {
    return this.settings.muted;
  }

  public setWeather(weather: WeatherMode) {
    this.weather = weather;
    if (this.ctx && this.rainGain) {
      const target = this.active && weather === 'rain' ? 0.34 : 0.0001;
      this.rainGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.45);
    }
    if (weather === 'rain' && this.active) {
      this.playThunder();
    }
  }

  public setTrainProximity(proximity: number) {
    this.trainProximity = Math.max(0.08, Math.min(1, proximity));
    if (this.ctx && this.engineProximityGain && this.active) {
      this.engineProximityGain.gain.setTargetAtTime(
        0.04 + this.trainProximity * 0.14,
        this.ctx.currentTime,
        0.2,
      );
    }
  }

  public setActive(active: boolean) {
    this.active = active;
    if (active) {
      this.ensureGraph();
      this.applyVolumes();
      if (this.ctx && this.rainGain) {
        this.rainGain.gain.setTargetAtTime(
          this.weather === 'rain' ? 0.34 : 0.0001,
          this.ctx.currentTime,
          0.4,
        );
      }
      this.startAmbientScheduler();
    } else {
      if (this.ctx && this.masterGain) {
        this.masterGain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.15);
      }
      this.stopAmbientScheduler();
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          window.speechSynthesis.cancel();
        } catch {
          // Ignore speech synthesis errors
        }
      }
    }
  }

  private ensureGraph(force = false): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const userActivation = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } })
        .userActivation;
      if (!force && userActivation && !userActivation.hasBeenActive) {
        return null;
      }
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      const ctx = new AudioCtx();
      this.ctx = ctx;

      this.masterGain = ctx.createGain();
      this.musicGain = ctx.createGain();
      this.envGain = ctx.createGain();
      this.trainGain = ctx.createGain();
      this.announceGain = ctx.createGain();

      this.musicGain.connect(this.masterGain);
      this.envGain.connect(this.masterGain);
      this.trainGain.connect(this.masterGain);
      this.announceGain.connect(this.masterGain);
      this.masterGain.connect(ctx.destination);

      // Build shared 2-second pink/brown noise buffer for crowd, rain, steam, thunder
      const length = ctx.sampleRate * 2;
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      for (let i = 0; i < length; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99765 * b0 + white * 0.099046;
        b1 = 0.963 * b1 + white * 0.2965164;
        b2 = 0.57 * b2 + white * 1.0526913;
        data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.08;
      }
      this.noiseBuffer = buffer;

      this.setupContinuousLoops(ctx, buffer);
      this.applyVolumes();
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private setupContinuousLoops(ctx: AudioContext, noiseBuffer: AudioBuffer) {
    // 1. Diesel locomotive idle rumble loop (train bus)
    if (this.trainGain) {
      this.engineProximityGain = ctx.createGain();
      this.engineProximityGain.gain.value = 0.08;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 145;

      this.engineSubOsc = ctx.createOscillator();
      this.engineSubOsc.type = 'sawtooth';
      this.engineSubOsc.frequency.value = 46;

      this.engineHarmOsc = ctx.createOscillator();
      this.engineHarmOsc.type = 'triangle';
      this.engineHarmOsc.frequency.value = 92;

      const lfo = ctx.createOscillator();
      lfo.frequency.value = 4.2;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 25;
      lfo.connect(lfoGain).connect(filter.frequency);

      this.engineSubOsc.connect(filter);
      this.engineHarmOsc.connect(filter);
      filter.connect(this.engineProximityGain).connect(this.trainGain);

      this.engineSubOsc.start();
      this.engineHarmOsc.start();
      lfo.start();
    }

    // 2. Platform crowd chatter & breeze ambience (environment bus)
    if (this.envGain) {
      const crowdSrc = ctx.createBufferSource();
      crowdSrc.buffer = noiseBuffer;
      crowdSrc.loop = true;

      const crowdFilter = ctx.createBiquadFilter();
      crowdFilter.type = 'bandpass';
      crowdFilter.frequency.value = 620;
      crowdFilter.Q.value = 0.7;

      this.crowdGain = ctx.createGain();
      this.crowdGain.gain.value = 0.12;
      crowdSrc.connect(crowdFilter).connect(this.crowdGain).connect(this.envGain);
      crowdSrc.start();

      // 3. Rain ambience loop (environment bus, faded up during monsoon weather)
      const rainSrc = ctx.createBufferSource();
      rainSrc.buffer = noiseBuffer;
      rainSrc.loop = true;

      const rainFilter = ctx.createBiquadFilter();
      rainFilter.type = 'highpass';
      rainFilter.frequency.value = 1100;

      this.rainGain = ctx.createGain();
      this.rainGain.gain.value = this.weather === 'rain' ? 0.34 : 0.0001;
      rainSrc.connect(rainFilter).connect(this.rainGain).connect(this.envGain);
      rainSrc.start();
    }
  }

  private applyVolumes() {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const masterVal = this.settings.muted || !this.active ? 0.0001 : Math.max(0.0001, this.settings.master);
    this.masterGain?.gain.setTargetAtTime(masterVal, now, 0.08);
    this.musicGain?.gain.setTargetAtTime(this.settings.music, now, 0.08);
    this.envGain?.gain.setTargetAtTime(this.settings.environment, now, 0.08);
    this.trainGain?.gain.setTargetAtTime(this.settings.train, now, 0.08);
    this.announceGain?.gain.setTargetAtTime(this.settings.announcements, now, 0.08);
  }

  private startAmbientScheduler() {
    if (this.ambientTimer !== null || typeof window === 'undefined') return;
    // Play a soothing Bengali melody note every ~2.4s and occasional crowd/hawker/rail texture
    let tickCount = 0;
    this.ambientTimer = window.setInterval(() => {
      if (!this.active || this.settings.muted) return;
      tickCount++;
      this.playMusicNote();

      if (tickCount % 3 === 0) {
        this.playCrowdChatterBurst();
      }
      if (tickCount % 4 === 0) {
        this.playTrackWheelClack();
      }
      if (tickCount % 7 === 0) {
        this.playHawkerCall();
      }
      if (this.weather === 'rain' && tickCount % 5 === 0) {
        this.playThunder();
      }
      if (tickCount % 14 === 0) {
        this.playNextBengaliAnnouncement();
      }
    }, 2400);
  }

  private stopAmbientScheduler() {
    if (this.ambientTimer !== null && typeof window !== 'undefined') {
      window.clearInterval(this.ambientTimer);
      this.ambientTimer = null;
    }
  }

  private playMusicNote() {
    const ctx = this.ensureGraph();
    if (!ctx || !this.musicGain) return;
    // Bhatiali / Bengal folk pentatonic scale (C4, D4, E4, G4, A4, C5)
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 440.0, 392.0];
    const freq = scale[this.musicStep % scale.length];
    this.musicStep++;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.065, now + 0.35);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + 2.1);

    osc.connect(gain).connect(this.musicGain);
    osc.start(now);
    osc.stop(now + 2.15);
  }

  private playCrowdChatterBurst() {
    const ctx = this.ensureGraph();
    if (!ctx || !this.envGain || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(420 + Math.random() * 480, now);
    filter.Q.value = 3.2;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.09, now + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.75);

    src.connect(filter).connect(gain).connect(this.envGain);
    src.start(now);
    src.stop(now + 0.8);
  }

  private playTrackWheelClack() {
    const ctx = this.ensureGraph();
    if (!ctx || !this.trainGain || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    // Authentic rhythmic "da-dum... da-dum" railway rail joint pulse
    [0, 0.14, 0.45, 0.59].forEach((offset) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(115, now + offset);
      osc.frequency.exponentialRampToValueAtTime(48, now + offset + 0.06);
      gain.gain.setValueAtTime(0.04 * this.trainProximity, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.08);
      osc.connect(gain).connect(this.trainGain!);
      osc.start(now + offset);
      osc.stop(now + offset + 0.09);
    });
  }

  public playHawkerCall() {
    const ctx = this.ensureGraph();
    if (!ctx || !this.envGain || this.settings.muted) return;
    const now = ctx.currentTime;
    // Crisp tea-kettle glass/spoon tap + cheerful hawker cadence
    [0, 0.14, 0.28].forEach((offset, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1480 + idx * 140, now + offset);
      gain.gain.setValueAtTime(0.045, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, now + offset + 0.12);
      osc.connect(gain).connect(this.envGain!);
      osc.start(now + offset);
      osc.stop(now + offset + 0.13);
    });
  }

  public playThunder() {
    const ctx = this.ensureGraph();
    if (!ctx || !this.envGain || !this.noiseBuffer) return;
    const now = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const low = ctx.createBiquadFilter();
    low.type = 'lowpass';
    low.frequency.setValueAtTime(220, now);
    low.frequency.exponentialRampToValueAtTime(55, now + 2.4);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.65, now + 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 2.6);

    src.connect(low).connect(gain).connect(this.envGain);
    src.start(now);
    src.stop(now + 2.65);
  }

  public playNextBengaliAnnouncement() {
    const text = BENGALI_ANNOUNCEMENTS[this.announceIdx % BENGALI_ANNOUNCEMENTS.length];
    this.announceIdx++;
    this.playBengaliAnnouncement(text);
  }

  public playBengaliAnnouncement(text: string) {
    if (this.active) {
      this.onAnnouncementCb?.(text);
    }
    const ctx = this.ensureGraph();
    if (!ctx || !this.announceGain || this.settings.muted) return;

    const now = ctx.currentTime;
    // Iconic 4-tone station PA chime
    const chimeNotes = [523.25, 659.25, 783.99, 1046.5];
    chimeNotes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + i * 0.14);
      gain.gain.setValueAtTime(0.14, now + i * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.14 + 0.48);
      osc.connect(gain).connect(this.announceGain!);
      osc.start(now + i * 0.14);
      osc.stop(now + i * 0.14 + 0.5);
    });

    const bnVoice = this.findBengaliVoice();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && bnVoice) {
      try {
        if (this.speechTimer !== null) {
          window.clearTimeout(this.speechTimer);
        }
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
          window.speechSynthesis.cancel();
        }
        const utter = new SpeechSynthesisUtterance(text);
        utter.voice = bnVoice;
        utter.lang = bnVoice.lang || 'bn-BD';
        utter.rate = 0.94;
        utter.volume = Math.max(0, Math.min(1, this.settings.master * this.settings.announcements));
        utter.onerror = () => {
          this.playSynthesizedVoiceCadence(text, true);
        };
        this.speechTimer = window.setTimeout(() => {
          this.speechTimer = null;
          if (this.active && !this.settings.muted) {
            if (window.speechSynthesis.paused) {
              window.speechSynthesis.resume();
            }
            window.speechSynthesis.speak(utter);
          }
        }, 520);
      } catch {
        this.playSynthesizedVoiceCadence(text, true);
      }
    } else {
      // Desktop OS without installed Bengali TTS voice pack: synthesize warm PA vocal cadence after chime
      this.playSynthesizedVoiceCadence(text, true);
    }
  }

  public playFootstep(surface: 'concrete' | 'wood' | 'grass' = 'concrete', sprinting = false) {
    const ctx = this.ensureGraph();
    if (!ctx || !this.envGain || this.settings.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = surface === 'wood' ? 'sine' : 'triangle';
    const baseFreq = surface === 'concrete' ? 115 : surface === 'wood' ? 88 : 74;
    osc.frequency.setValueAtTime(baseFreq + (Math.random() - 0.5) * 16, now);
    osc.frequency.exponentialRampToValueAtTime(38, now + 0.055);
    gain.gain.setValueAtTime(sprinting ? 0.09 : 0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
    osc.connect(gain).connect(this.envGain);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public playJump() {
    const ctx = this.ensureGraph();
    if (!ctx || !this.envGain || this.settings.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(390, now + 0.14);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(gain).connect(this.envGain);
    osc.start(now);
    osc.stop(now + 0.17);
  }

  public playCoin() {
    const ctx = this.ensureGraph();
    if (!ctx || !this.envGain || this.settings.muted) return;
    const now = ctx.currentTime;
    [880, 1318.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      gain.gain.setValueAtTime(0.11, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.22);
      osc.connect(gain).connect(this.envGain!);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.24);
    });
  }

  public playSignalLever() {
    const ctx = this.ensureGraph();
    if (!ctx || !this.trainGain || this.settings.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(165, now);
    osc.frequency.exponentialRampToValueAtTime(340, now + 0.1);
    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    osc.connect(gain).connect(this.trainGain);
    osc.start(now);
    osc.stop(now + 0.16);
  }

  public playStationBell() {
    const ctx = this.ensureGraph();
    if (!ctx || !this.announceGain || this.settings.muted) return;
    const now = ctx.currentTime;
    [1046.5, 1567.98].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.15);
      gain.gain.setValueAtTime(0.14, now + idx * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.15 + 0.45);
      osc.connect(gain).connect(this.announceGain!);
      osc.start(now + idx * 0.15);
      osc.stop(now + idx * 0.15 + 0.48);
    });
  }

  public playTrainHorn() {
    const ctx = this.ensureGraph();
    if (!ctx || !this.trainGain || this.settings.muted) return;
    const now = ctx.currentTime;
    // Authentic multi-tone Bangladesh diesel locomotive chord
    [220, 277.18, 329.63].forEach((freq) => {
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 1200;

      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.065, now + 0.06);
      gain.gain.setValueAtTime(0.065, now + 0.48);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
      osc.connect(filter).connect(gain).connect(this.trainGain!);
      osc.start(now);
      osc.stop(now + 0.75);
    });
  }

  public playDoorChime(opening = true) {
    const ctx = this.ensureGraph();
    if (!ctx || !this.trainGain || this.settings.muted) return;
    const now = ctx.currentTime;

    // Two-note passenger door chime (ascending on open, warning descending on close)
    const tones = opening ? [659.25, 880.0] : [880.0, 587.33];
    tones.forEach((freq, idx) => {
      const t = now + idx * 0.13;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.11, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
      osc.connect(gain).connect(this.trainGain!);
      osc.start(t);
      osc.stop(t + 0.28);
    });

    // Subtle pneumatic door slide hiss
    if (this.noiseBuffer) {
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(opening ? 1850 : 1400, now);
      filter.Q.value = 1.6;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.08, now + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      src.connect(filter).connect(gain).connect(this.trainGain);
      src.start(now);
      src.stop(now + 0.45);
    }
  }

  public playGateBell() {
    const ctx = this.ensureGraph();
    if (!ctx || !this.trainGain || this.settings.muted) return;
    const now = ctx.currentTime;
    for (let i = 0; i < 3; i++) {
      const t = now + i * 0.14;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1180, t);
      gain.gain.setValueAtTime(0.09, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.11);
      osc.connect(gain).connect(this.trainGain);
      osc.start(t);
      osc.stop(t + 0.12);
    }
  }

  public setCrowdIntensity(ratio: number) {
    const clamped = Math.max(0.15, Math.min(1, ratio));
    if (this.ctx && this.crowdGain && this.active) {
      this.crowdGain.gain.setTargetAtTime(0.06 + clamped * 0.15, this.ctx.currentTime, 0.35);
    }
  }

  public playNpcBump() {
    const ctx = this.ensureGraph();
    if (!ctx || !this.envGain || this.settings.muted) return;
    const now = ctx.currentTime;

    // Soft comic thud + startled pitch bend
    const thud = ctx.createOscillator();
    const thudGain = ctx.createGain();
    thud.type = 'triangle';
    thud.frequency.setValueAtTime(145, now);
    thud.frequency.exponentialRampToValueAtTime(52, now + 0.11);
    thudGain.gain.setValueAtTime(0.14, now);
    thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    thud.connect(thudGain).connect(this.envGain);
    thud.start(now);
    thud.stop(now + 0.14);

    const chirp = ctx.createOscillator();
    const chirpGain = ctx.createGain();
    chirp.type = 'sine';
    chirp.frequency.setValueAtTime(340, now + 0.04);
    chirp.frequency.exponentialRampToValueAtTime(510, now + 0.16);
    chirpGain.gain.setValueAtTime(0.055, now + 0.04);
    chirpGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    chirp.connect(chirpGain).connect(this.envGain);
    chirp.start(now + 0.04);
    chirp.stop(now + 0.19);
  }

  public playDialogueOutcome(positive: boolean) {
    const ctx = this.ensureGraph();
    if (!ctx || !this.envGain || this.settings.muted) return;
    const now = ctx.currentTime;
    const notes = positive ? [587.33, 783.99, 1046.5] : [311.13, 246.94];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = positive ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);
      gain.gain.setValueAtTime(positive ? 0.09 : 0.055, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.24);
      osc.connect(gain).connect(this.envGain!);
      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.26);
    });
  }

  public playPoliceWhistle() {
    const ctx = this.ensureGraph();
    if (!ctx || !this.envGain || this.settings.muted) return;
    const now = ctx.currentTime;
    // Crisp pea-whistle trill
    const osc = ctx.createOscillator();
    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(2850, now);
    lfo.frequency.setValueAtTime(28, now);
    lfoGain.gain.setValueAtTime(140, now);
    lfo.connect(lfoGain).connect(osc.frequency);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.11, now + 0.04);
    gain.gain.setValueAtTime(0.11, now + 0.34);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.46);

    osc.connect(gain).connect(this.envGain);
    osc.start(now);
    lfo.start(now);
    osc.stop(now + 0.48);
    lfo.stop(now + 0.48);
  }

  public playRadioChirp() {
    const ctx = this.ensureGraph();
    if (!ctx || !this.envGain || this.settings.muted) return;
    const now = ctx.currentTime;
    [1320, 1760].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, now + idx * 0.065);
      gain.gain.setValueAtTime(0.045, now + idx * 0.065);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.065 + 0.055);
      osc.connect(gain).connect(this.envGain!);
      osc.start(now + idx * 0.065);
      osc.stop(now + idx * 0.065 + 0.06);
    });
  }

  public playEmergencySiren() {
    const ctx = this.ensureGraph();
    if (!ctx || !this.announceGain || this.settings.muted) return;
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(660, now);
    osc.frequency.linearRampToValueAtTime(920, now + 0.25);
    osc.frequency.linearRampToValueAtTime(660, now + 0.5);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.1, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.58);
    osc.connect(gain).connect(this.announceGain);
    osc.start(now);
    osc.stop(now + 0.6);
  }

  public playAchievementUnlock() {
    const ctx = this.ensureGraph();
    if (!ctx || !this.announceGain || this.settings.muted) return;
    const now = ctx.currentTime;
    [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.085);
      gain.gain.setValueAtTime(0.1, now + idx * 0.085);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.085 + 0.3);
      osc.connect(gain).connect(this.announceGain!);
      osc.start(now + idx * 0.085);
      osc.stop(now + idx * 0.085 + 0.32);
    });
  }

  public playUpgradeConstructionFanfare() {
    const ctx = this.ensureGraph();
    if (!ctx || !this.announceGain || this.settings.muted) return;
    const now = ctx.currentTime;
    // Celebratory harmonic fanfare + hydraulic crane clank
    const notes = [392.0, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      const t = now + idx * 0.11;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.13, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
      osc.connect(gain).connect(this.announceGain!);
      osc.start(t);
      osc.stop(t + 0.58);
    });
  }

  private playSynthesizedVoiceCadence(text: string, isAnnouncement: boolean) {
    const ctx = this.ensureGraph();
    const dest = isAnnouncement ? this.announceGain : this.envGain;
    if (!ctx || !dest || !this.active || this.settings.muted) return;

    const now = ctx.currentTime + (isAnnouncement ? 0.54 : 0.02);
    const seed = text.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const basePitch = isAnnouncement ? 210 + (seed % 32) : 185 + (seed % 95);
    const syllables = isAnnouncement ? 5 : 3;

    for (let i = 0; i < syllables; i++) {
      const start = now + i * (isAnnouncement ? 0.15 : 0.1);
      const dur = isAnnouncement ? 0.13 : 0.085;
      const pitchShift = ((seed + i * 17) % 5) - 2;
      const freq = basePitch + pitchShift * (isAnnouncement ? 12 : 16);

      const osc = ctx.createOscillator();
      const formant = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, start);
      osc.frequency.exponentialRampToValueAtTime(freq * (i === syllables - 1 ? 0.92 : 1.06), start + dur);

      formant.type = 'bandpass';
      formant.frequency.setValueAtTime(720 + ((seed + i * 193) % 640), start);
      formant.Q.value = 3.2;

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.linearRampToValueAtTime(isAnnouncement ? 0.095 : 0.08, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(formant).connect(gain).connect(dest);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    }
  }

  public speakBanglaLine(text: string, rate = 1.0) {
    if (!this.active || this.settings.muted) return;
    this.ensureGraph();

    const bnVoice = this.findBengaliVoice();
    if (typeof window !== 'undefined' && 'speechSynthesis' in window && bnVoice) {
      try {
        if (window.speechSynthesis.paused) {
          window.speechSynthesis.resume();
        }
        if (window.speechSynthesis.speaking) {
          this.playSynthesizedVoiceCadence(text, false);
          return;
        }
        const utter = new SpeechSynthesisUtterance(text);
        utter.voice = bnVoice;
        utter.lang = bnVoice.lang || 'bn-BD';
        utter.rate = rate;
        utter.volume = Math.max(0, Math.min(1, this.settings.master * this.settings.announcements * 0.85));
        utter.onerror = () => {
          this.playSynthesizedVoiceCadence(text, false);
        };
        window.speechSynthesis.speak(utter);
        return;
      } catch {
        // Fallback below
      }
    }

    // Desktop PC without Bengali TTS pack (or headless browsers): synthesize clear NPC vocal cadence
    this.playSynthesizedVoiceCadence(text, false);
  }

  public dispose() {
    this.setActive(false);
    if (this.speechTimer !== null && typeof window !== 'undefined') {
      window.clearTimeout(this.speechTimer);
      this.speechTimer = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.removeEventListener('voiceschanged', this.handleVoicesChanged);
      } catch {
        // Ignore
      }
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
}
