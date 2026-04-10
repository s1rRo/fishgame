// ============================================================
// AUDIO MANAGER — Web Audio API + процедурные звуки
// River Lord: Pixel Fishery
// Источник: тз/06
// 30+ звуковых событий через OscillatorNode
// ============================================================

type MusicTrack = 'main_theme' | 'village' | 'fishing' | 'biome_l1' | 'biome_l2' | 'biome_l3' | 'market' | 'shop';
type SFXName =
  | 'cast_line' | 'fish_catch' | 'fish_bite' | 'line_break' | 'fishing_crash'
  | 'resource_collect' | 'coin_earn' | 'upgrade' | 'button_click'
  | 'popup_open' | 'popup_close' | 'level_up' | 'star_earn'
  | 'building_upgrade' | 'npc_depart' | 'npc_return'
  | 'craft_start' | 'craft_success' | 'craft_fail'
  | 'auction_sell' | 'auction_buy'
  | 'lootbox_open' | 'lootbox_reveal'
  | 'achievement' | 'season_complete'
  | 'error' | 'notification' | 'checkpoint_complete';

const LS_VOLUME_KEY = 'rl_audio_settings';

export class AudioManager {
  private static instance: AudioManager;
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private currentTrack: MusicTrack | null = null;
  private musicOscillators: OscillatorNode[] = [];
  private musicVolume = 0.5;
  private sfxVolume = 0.7;
  private isMuted = false;

  private constructor() {
    this.loadSettings();
    // Не играть в фоновой вкладке
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.masterGain?.gain.setValueAtTime(0, this.ctx?.currentTime ?? 0);
      } else {
        this.masterGain?.gain.setValueAtTime(this.isMuted ? 0 : 1, this.ctx?.currentTime ?? 0);
      }
    });
  }

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  private ensureContext(): AudioContext {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 1;
      this.masterGain.connect(this.ctx.destination);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVolume;
      this.musicGain.connect(this.masterGain);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVolume;
      this.sfxGain.connect(this.masterGain);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // ── Музыка (процедурный эмбиент) ──

  public playMusic(track: MusicTrack): void {
    if (this.currentTrack === track) return;
    this.stopMusic();
    this.currentTrack = track;

    const ctx = this.ensureContext();
    if (!this.musicGain) return;

    // Простая процедурная музыка — тихие осцилляторы создают эмбиент
    const freqs = this.getMusicFreqs(track);
    for (const freq of freqs) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;

      const gain = ctx.createGain();
      gain.gain.value = 0.03;
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start();
      this.musicOscillators.push(osc);
    }
  }

  public stopMusic(): void {
    for (const osc of this.musicOscillators) {
      try { osc.stop(); } catch { /* already stopped */ }
    }
    this.musicOscillators = [];
    this.currentTrack = null;
  }

  private getMusicFreqs(track: MusicTrack): number[] {
    const chords: Record<MusicTrack, number[]> = {
      main_theme: [130.81, 164.81, 196.00, 261.63], // C major
      village:    [146.83, 174.61, 220.00, 293.66],  // D major
      fishing:    [164.81, 196.00, 246.94, 329.63],  // E minor
      biome_l1:   [174.61, 220.00, 261.63, 349.23],  // F major
      biome_l2:   [196.00, 246.94, 293.66, 392.00],  // G major
      biome_l3:   [130.81, 155.56, 196.00, 261.63],  // C minor
      market:     [220.00, 277.18, 329.63, 440.00],   // A major
      shop:       [246.94, 311.13, 369.99, 493.88],   // B major
    };
    return chords[track] ?? chords.main_theme;
  }

  // ── SFX (процедурные звуки) ──

  public playSFX(name: SFXName): void {
    if (this.isMuted || document.hidden) return;

    const ctx = this.ensureContext();
    if (!this.sfxGain) return;

    const synth = SFX_SYNTHS[name];
    if (synth) {
      synth(ctx, this.sfxGain);
    }
  }

  // ── Громкость ──

  public setMusicVolume(v: number): void {
    this.musicVolume = Math.max(0, Math.min(1, v));
    if (this.musicGain) this.musicGain.gain.value = this.musicVolume;
    this.saveSettings();
  }

  public setSFXVolume(v: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, v));
    if (this.sfxGain) this.sfxGain.gain.value = this.sfxVolume;
    this.saveSettings();
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (this.masterGain) this.masterGain.gain.value = muted ? 0 : 1;
    this.saveSettings();
  }

  public getMusicVolume(): number { return this.musicVolume; }
  public getSFXVolume(): number { return this.sfxVolume; }
  public getIsMuted(): boolean { return this.isMuted; }
  public getCurrentTrack(): MusicTrack | null { return this.currentTrack; }

  // ── Persistence ──

  private saveSettings(): void {
    try {
      localStorage.setItem(LS_VOLUME_KEY, JSON.stringify({
        music: this.musicVolume,
        sfx: this.sfxVolume,
        muted: this.isMuted,
      }));
    } catch { /* */ }
  }

  private loadSettings(): void {
    try {
      const raw = localStorage.getItem(LS_VOLUME_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        this.musicVolume = s.music ?? 0.5;
        this.sfxVolume = s.sfx ?? 0.7;
        this.isMuted = s.muted ?? false;
      }
    } catch { /* */ }
  }
}

// ── Процедурные SFX синтезаторы ──

type SFXSynth = (ctx: AudioContext, dest: AudioNode) => void;

function playTone(ctx: AudioContext, dest: AudioNode, freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.15): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + dur);
}

function playChirp(ctx: AudioContext, dest: AudioNode, startFreq: number, endFreq: number, dur: number, type: OscillatorType = 'sine', vol = 0.12): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + dur);
  gain.gain.setValueAtTime(vol, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + dur);
}

const SFX_SYNTHS: Record<SFXName, SFXSynth> = {
  button_click: (ctx, dest) => playTone(ctx, dest, 800, 0.08, 'square', 0.08),
  popup_open: (ctx, dest) => playChirp(ctx, dest, 300, 600, 0.15, 'sine', 0.1),
  popup_close: (ctx, dest) => playChirp(ctx, dest, 600, 300, 0.12, 'sine', 0.08),

  cast_line: (ctx, dest) => playChirp(ctx, dest, 200, 800, 0.3, 'sawtooth', 0.08),
  fish_bite: (ctx, dest) => {
    playTone(ctx, dest, 500, 0.1, 'square', 0.1);
    playTone(ctx, dest, 700, 0.1, 'square', 0.08);
  },
  fish_catch: (ctx, dest) => {
    playChirp(ctx, dest, 400, 800, 0.2, 'sine', 0.12);
    setTimeout(() => playChirp(ctx, dest, 600, 1200, 0.3, 'sine', 0.1), 200);
  },
  line_break: (ctx, dest) => playChirp(ctx, dest, 600, 100, 0.4, 'sawtooth', 0.15),
  fishing_crash: (ctx, dest) => {
    playChirp(ctx, dest, 800, 80, 0.5, 'sawtooth', 0.12);
    playTone(ctx, dest, 120, 0.3, 'triangle', 0.1);
  },

  resource_collect: (ctx, dest) => {
    playTone(ctx, dest, 523, 0.08, 'sine', 0.1);
    setTimeout(() => playTone(ctx, dest, 659, 0.08, 'sine', 0.08), 80);
  },
  coin_earn: (ctx, dest) => {
    playTone(ctx, dest, 1047, 0.08, 'sine', 0.08);
    setTimeout(() => playTone(ctx, dest, 1319, 0.12, 'sine', 0.06), 80);
  },
  upgrade: (ctx, dest) => {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => playTone(ctx, dest, f, 0.15, 'sine', 0.1), i * 100)
    );
  },
  level_up: (ctx, dest) => {
    [392, 523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => playTone(ctx, dest, f, 0.2, 'sine', 0.12), i * 120)
    );
  },
  star_earn: (ctx, dest) => {
    playChirp(ctx, dest, 800, 1600, 0.3, 'sine', 0.1);
  },

  building_upgrade: (ctx, dest) => {
    playTone(ctx, dest, 200, 0.15, 'triangle', 0.1);
    setTimeout(() => playChirp(ctx, dest, 300, 600, 0.3, 'sine', 0.08), 150);
  },
  npc_depart: (ctx, dest) => playChirp(ctx, dest, 500, 300, 0.3, 'triangle', 0.08),
  npc_return: (ctx, dest) => playChirp(ctx, dest, 300, 700, 0.3, 'triangle', 0.1),

  craft_start: (ctx, dest) => {
    playTone(ctx, dest, 300, 0.1, 'square', 0.06);
    setTimeout(() => playTone(ctx, dest, 400, 0.15, 'square', 0.06), 100);
  },
  craft_success: (ctx, dest) => {
    [440, 554, 659].forEach((f, i) =>
      setTimeout(() => playTone(ctx, dest, f, 0.15, 'sine', 0.1), i * 100)
    );
  },
  craft_fail: (ctx, dest) => {
    playTone(ctx, dest, 200, 0.3, 'sawtooth', 0.08);
    setTimeout(() => playTone(ctx, dest, 150, 0.4, 'sawtooth', 0.06), 200);
  },

  auction_sell: (ctx, dest) => playChirp(ctx, dest, 600, 1000, 0.2, 'sine', 0.08),
  auction_buy: (ctx, dest) => playChirp(ctx, dest, 400, 800, 0.2, 'sine', 0.08),

  lootbox_open: (ctx, dest) => {
    playTone(ctx, dest, 150, 0.4, 'triangle', 0.1);
    playChirp(ctx, dest, 200, 800, 0.6, 'sine', 0.08);
  },
  lootbox_reveal: (ctx, dest) => {
    [523, 659, 784, 1047, 1319].forEach((f, i) =>
      setTimeout(() => playTone(ctx, dest, f, 0.2, 'sine', 0.12), i * 80)
    );
  },

  achievement: (ctx, dest) => {
    [523, 659, 784, 1047].forEach((f, i) =>
      setTimeout(() => playTone(ctx, dest, f, 0.25, 'sine', 0.12), i * 150)
    );
  },
  season_complete: (ctx, dest) => {
    [392, 494, 587, 784, 988].forEach((f, i) =>
      setTimeout(() => playTone(ctx, dest, f, 0.3, 'sine', 0.12), i * 150)
    );
  },

  error: (ctx, dest) => {
    playTone(ctx, dest, 200, 0.2, 'square', 0.08);
    setTimeout(() => playTone(ctx, dest, 150, 0.3, 'square', 0.06), 150);
  },
  notification: (ctx, dest) => {
    playTone(ctx, dest, 880, 0.1, 'sine', 0.06);
    setTimeout(() => playTone(ctx, dest, 1100, 0.15, 'sine', 0.05), 100);
  },
  checkpoint_complete: (ctx, dest) => {
    [440, 554, 659, 880].forEach((f, i) =>
      setTimeout(() => playTone(ctx, dest, f, 0.2, 'sine', 0.1), i * 100)
    );
  },
};
