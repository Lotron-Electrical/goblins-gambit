/**
 * Sound manager using raw Web Audio API.
 * All sounds generated programmatically — no audio files needed.
 */

import { playDynamicLoop, getLoopDurationMs } from './MusicLayers.js';
import { playMenuLoop, MENU_LOOP_MS } from './MenuMusic.js';

class SoundManager {
  constructor() {
    this.muted = false;
    this.ctx = null;
    this.initialized = false;
    this.musicPlaying = false;
    this.musicNodes = null;
    this.musicVolume = 0.12;
    this.intensity = 0;
    this.targetIntensity = 0;
    this.ambientPlaying = false;
    this.ambientTimer = null;
    this.menuMusicPlaying = false;
    this.menuMusicNodes = null;
    this._menuMusicTimer = null;
    this.theme = 'swamp';
  }

  /** Must be called from a user gesture (click/tap) to unlock AudioContext */
  init() {
    if (this.initialized) return;
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.initialized = true;
      console.log('[SoundManager] initialized, state:', this.ctx.state);
    } catch (e) {
      console.warn('[SoundManager] failed to init:', e);
    }
  }

  play(soundName) {
    if (this.muted) return;
    // Auto-init if not yet initialized (fallback)
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    // Resume if suspended (can happen after tab switch)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    try {
      const fn = SOUNDS[soundName];
      if (fn) fn(this.ctx);
    } catch (e) {
      // Silently ignore audio errors
    }
  }

  startMusic() {
    if (this.musicPlaying) return;
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.musicPlaying = true;
    this._scheduleLoop();
  }

  stopMusic() {
    this.musicPlaying = false;
    if (this.musicNodes) {
      this.musicNodes.forEach(n => { try { n.stop(); } catch(e) {} });
      this.musicNodes = null;
    }
    if (this._musicTimer) {
      clearTimeout(this._musicTimer);
      this._musicTimer = null;
    }
  }

  setIntensity(value) {
    this.targetIntensity = Math.max(0, Math.min(1, value));
  }

  setTheme(theme) {
    const newTheme = theme || 'swamp';
    if (newTheme === this.theme) return;
    this.theme = newTheme;
    // Crossfade: stop current loops and restart with new theme
    if (this.musicPlaying) {
      this._crossfadeMusic();
    }
    // Restart ambient with new theme
    if (this.ambientPlaying) {
      if (this.ambientTimer) {
        clearTimeout(this.ambientTimer);
        this.ambientTimer = null;
      }
      setTimeout(() => {
        if (this.ambientPlaying) this._scheduleAmbient();
      }, 500);
    }
  }

  _crossfadeMusic() {
    // Fade out current nodes over 500ms, then start new loop
    const oldNodes = this.musicNodes;
    if (this._musicTimer) {
      clearTimeout(this._musicTimer);
      this._musicTimer = null;
    }
    // Create a gain node to fade out all current audio
    // Since we can't easily reroute existing nodes, just stop them after a short delay
    this.musicNodes = null;
    setTimeout(() => {
      if (oldNodes) {
        oldNodes.forEach(n => { try { n.stop(); } catch(e) {} });
      }
    }, 500);
    // Start new loop after fade-out
    setTimeout(() => {
      if (this.musicPlaying) this._scheduleLoop();
    }, 500);
  }

  startMenuMusic() {
    if (this.menuMusicPlaying) return;
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.menuMusicPlaying = true;
    this._scheduleMenuLoop();
  }

  stopMenuMusic() {
    this.menuMusicPlaying = false;
    if (this.menuMusicNodes) {
      this.menuMusicNodes.forEach(n => { try { n.stop(); } catch(e) {} });
      this.menuMusicNodes = null;
    }
    if (this._menuMusicTimer) {
      clearTimeout(this._menuMusicTimer);
      this._menuMusicTimer = null;
    }
  }

  _scheduleMenuLoop() {
    if (!this.menuMusicPlaying || !this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    try {
      const nodes = playMenuLoop(this.ctx, this.muted ? 0 : this.musicVolume);
      this.menuMusicNodes = nodes;
    } catch (e) {
      console.warn('[SoundManager] menu music error:', e);
    }
    this._menuMusicTimer = setTimeout(() => this._scheduleMenuLoop(), MENU_LOOP_MS);
  }

  startAmbient() {
    if (this.ambientPlaying) return;
    if (!this.ctx) this.init();
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.ambientPlaying = true;
    this._scheduleAmbient();
  }

  stopAmbient() {
    this.ambientPlaying = false;
    if (this.ambientTimer) {
      clearTimeout(this.ambientTimer);
      this.ambientTimer = null;
    }
  }

  _scheduleAmbient() {
    if (!this.ambientPlaying || !this.ctx) return;
    const vol = this.muted ? 0 : 0.06;
    const ambientFn = AMBIENT_BY_THEME[this.theme] || playSwampAmbient;
    ambientFn(this.ctx, vol);
    this.ambientTimer = setTimeout(() => this._scheduleAmbient(), 10000);
  }

  _scheduleLoop() {
    if (!this.musicPlaying || !this.ctx) return;
    // Resume suspended context (e.g. after tab switch)
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    // Smooth interpolation toward target
    this.intensity += (this.targetIntensity - this.intensity) * 0.4;
    // Guard against NaN intensity
    if (!isFinite(this.intensity)) this.intensity = 0;
    try {
      const nodes = playDynamicLoop(this.ctx, this.intensity, this.musicVolume, this.theme);
      this.musicNodes = nodes;
    } catch (e) {
      // Prevent loop chain from breaking on audio errors
      console.warn('[SoundManager] music loop error:', e);
    }
    const loopMs = getLoopDurationMs(this.theme);
    this._musicTimer = setTimeout(() => {
      this._scheduleLoop();
    }, loopMs);
  }

  setMuted(val) {
    this.muted = val;
  }
}

// --- Sound definitions ---
// Each is a function that takes an AudioContext and plays immediately.

function playTone(ctx, freq, duration, type = 'sine', volume = 0.3, endFreq = null) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  if (endFreq) {
    osc.frequency.linearRampToValueAtTime(endFreq, ctx.currentTime + duration);
  }
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playNoise(ctx, duration, volume = 0.3) {
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.linearRampToValueAtTime(0, ctx.currentTime + duration);
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start(ctx.currentTime);
}

function playChord(ctx, freqs, duration, type = 'sine', volume = 0.15) {
  for (const f of freqs) {
    playTone(ctx, f, duration, type, volume);
  }
}

/**
 * Ambient swamp soundscape — bubbling, croaking, insects.
 * Plays a 10s loop of layered procedural nature sounds.
 */
function playSwampAmbient(ctx, volume) {
  const t = ctx.currentTime;

  // Layer 1: Bubbling — random short low-freq bursts
  for (let i = 0; i < 8; i++) {
    const start = t + Math.random() * 9;
    const freq = 60 + Math.random() * 80;
    const dur = 0.08 + Math.random() * 0.12;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    osc.frequency.linearRampToValueAtTime(freq * 1.8, start + dur);
    gain.gain.setValueAtTime(volume * 0.4, start);
    gain.gain.linearRampToValueAtTime(0, start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur);
  }

  // Layer 2: Frog croaks — pairs of low tones
  const croakCount = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < croakCount; i++) {
    const start = t + 1 + Math.random() * 7;
    for (let j = 0; j < 2; j++) {
      const cStart = start + j * 0.18;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(120 + Math.random() * 40, cStart);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(300, cStart);
      gain.gain.setValueAtTime(volume * 0.2, cStart);
      gain.gain.linearRampToValueAtTime(0, cStart + 0.12);
      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(cStart);
      osc.stop(cStart + 0.12);
    }
  }

  // Layer 3: Insects — high-freq filtered noise bursts
  for (let i = 0; i < 5; i++) {
    const start = t + Math.random() * 9;
    const dur = 0.5 + Math.random() * 1.5;
    const bufLen = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let j = 0; j < bufLen; j++) data[j] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hpf = ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.setValueAtTime(6000 + Math.random() * 3000, start);
    const gain = ctx.createGain();
    const insVol = volume * (0.03 + Math.random() * 0.04);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(insVol, start + 0.2);
    gain.gain.setValueAtTime(insVol, start + dur - 0.3);
    gain.gain.linearRampToValueAtTime(0, start + dur);
    src.connect(hpf);
    hpf.connect(gain);
    gain.connect(ctx.destination);
    src.start(start);
  }
}

/**
 * Blood moon ambient — howling wind, distant wolves, low drones.
 */
function playBloodAmbient(ctx, volume) {
  const t = ctx.currentTime;

  // Layer 1: Howling wind — filtered noise with slow volume swell
  for (let i = 0; i < 3; i++) {
    const start = t + Math.random() * 7;
    const dur = 2 + Math.random() * 3;
    const bufLen = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let j = 0; j < bufLen; j++) data[j] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bpf = ctx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.setValueAtTime(400 + Math.random() * 300, start);
    bpf.Q.setValueAtTime(2, start);
    const gain = ctx.createGain();
    const windVol = volume * (0.15 + Math.random() * 0.1);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(windVol, start + dur * 0.3);
    gain.gain.setValueAtTime(windVol, start + dur * 0.7);
    gain.gain.linearRampToValueAtTime(0, start + dur);
    src.connect(bpf);
    bpf.connect(gain);
    gain.connect(ctx.destination);
    src.start(start);
  }

  // Layer 2: Wolf howl — sliding sine tone
  if (Math.random() > 0.4) {
    const start = t + 2 + Math.random() * 5;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(280, start);
    osc.frequency.linearRampToValueAtTime(420, start + 0.8);
    osc.frequency.linearRampToValueAtTime(350, start + 1.5);
    osc.frequency.linearRampToValueAtTime(250, start + 2.5);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume * 0.12, start + 0.3);
    gain.gain.setValueAtTime(volume * 0.1, start + 1.5);
    gain.gain.linearRampToValueAtTime(0, start + 2.5);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + 2.5);
  }

  // Layer 3: Low ominous drone
  const droneStart = t;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(55, droneStart);
  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(120, droneStart);
  gain.gain.setValueAtTime(volume * 0.08, droneStart);
  gain.gain.setValueAtTime(volume * 0.08, droneStart + 9);
  gain.gain.linearRampToValueAtTime(0, droneStart + 10);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(droneStart);
  osc.stop(droneStart + 10);
}

/**
 * Frost ambient — icy wind, crystalline chimes, cracking sounds.
 */
function playFrostAmbient(ctx, volume) {
  const t = ctx.currentTime;

  // Layer 1: Arctic wind — very high filtered noise
  for (let i = 0; i < 2; i++) {
    const start = t + Math.random() * 5;
    const dur = 3 + Math.random() * 4;
    const bufLen = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let j = 0; j < bufLen; j++) data[j] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const hpf = ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.setValueAtTime(3000, start);
    const gain = ctx.createGain();
    const windVol = volume * (0.08 + Math.random() * 0.06);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(windVol, start + dur * 0.4);
    gain.gain.setValueAtTime(windVol * 0.8, start + dur * 0.7);
    gain.gain.linearRampToValueAtTime(0, start + dur);
    src.connect(hpf);
    hpf.connect(gain);
    gain.connect(ctx.destination);
    src.start(start);
  }

  // Layer 2: Ice crystal chimes — high sine plinks
  for (let i = 0; i < 6; i++) {
    const start = t + Math.random() * 9;
    const freq = 2000 + Math.random() * 3000;
    const dur = 0.3 + Math.random() * 0.5;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, start);
    const chimeVol = volume * (0.04 + Math.random() * 0.04);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(chimeVol, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + dur);
  }

  // Layer 3: Ice cracking — short noise bursts with resonant filter
  const crackCount = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < crackCount; i++) {
    const start = t + 1 + Math.random() * 8;
    const bufLen = Math.floor(ctx.sampleRate * 0.04);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let j = 0; j < bufLen; j++) data[j] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bpf = ctx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.setValueAtTime(4000 + Math.random() * 2000, start);
    bpf.Q.setValueAtTime(5, start);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume * 0.3, start);
    gain.gain.linearRampToValueAtTime(0, start + 0.04);
    src.connect(bpf);
    bpf.connect(gain);
    gain.connect(ctx.destination);
    src.start(start);
  }
}

const AMBIENT_BY_THEME = {
  swamp: playSwampAmbient,
  blood: playBloodAmbient,
  frost: playFrostAmbient,
};

const SOUNDS = {
  draw: (ctx) => {
    playTone(ctx, 440, 0.12, 'triangle', 0.25, 880);
  },
  creature_play: (ctx) => {
    playNoise(ctx, 0.15, 0.3);
    playTone(ctx, 150, 0.2, 'sawtooth', 0.2, 80);
  },
  magic_cast: (ctx) => {
    playTone(ctx, 600, 0.3, 'sine', 0.2, 1200);
    playTone(ctx, 900, 0.3, 'sine', 0.1, 1800);
  },
  trick_play: (ctx) => {
    playTone(ctx, 523, 0.08, 'triangle', 0.25);
    setTimeout(() => playTone(ctx, 659, 0.08, 'triangle', 0.25), 80);
    setTimeout(() => playTone(ctx, 784, 0.12, 'triangle', 0.25), 160);
  },
  armour_equip: (ctx) => {
    playNoise(ctx, 0.08, 0.4);
    playTone(ctx, 200, 0.15, 'square', 0.15);
  },
  attack: (ctx) => {
    playNoise(ctx, 0.12, 0.5);
    playTone(ctx, 100, 0.15, 'sawtooth', 0.3, 50);
  },
  death: (ctx) => {
    // Creature death — descending low pitched rumble
    playNoise(ctx, 0.4, 0.35);
    playTone(ctx, 280, 0.5, 'sawtooth', 0.25, 25);
    setTimeout(() => playTone(ctx, 120, 0.3, 'sine', 0.15, 40), 120);
  },
  armour_break: (ctx) => {
    // Metallic crack — high clang + filtered noise burst
    playTone(ctx, 1600, 0.3, 'square', 0.1, 600);
    playTone(ctx, 900, 0.25, 'triangle', 0.08, 400);
    playNoise(ctx, 0.1, 0.45);
  },
  damage: (ctx) => {
    // Short impact thud — distinct from full death
    playNoise(ctx, 0.07, 0.35);
    playTone(ctx, 90, 0.1, 'sawtooth', 0.18, 55);
  },
  sp_gain: (ctx) => {
    playTone(ctx, 880, 0.1, 'sine', 0.2);
    setTimeout(() => playTone(ctx, 1100, 0.1, 'sine', 0.2), 100);
    setTimeout(() => playTone(ctx, 1320, 0.15, 'sine', 0.2), 200);
  },
  turn_start: (ctx) => {
    playTone(ctx, 220, 0.15, 'sawtooth', 0.2, 440);
    setTimeout(() => playTone(ctx, 330, 0.25, 'triangle', 0.2), 150);
  },
  dice_roll: (ctx) => {
    // Rapid clicks
    for (let i = 0; i < 15; i++) {
      setTimeout(() => playNoise(ctx, 0.03, 0.2), i * 80);
    }
  },
  set_complete: (ctx) => {
    playChord(ctx, [440, 554, 659], 0.5, 'triangle', 0.15);
    setTimeout(() => playChord(ctx, [523, 659, 784], 0.6, 'triangle', 0.2), 300);
  },
  victory: (ctx) => {
    const notes = [523, 659, 784, 1047];
    notes.forEach((f, i) => {
      setTimeout(() => playTone(ctx, f, 0.3, 'triangle', 0.25), i * 200);
    });
  },
  ability_used: (ctx) => {
    playTone(ctx, 550, 0.15, 'sine', 0.2, 1100);
  },
  // Event system sounds
  volcano_rumble: (ctx) => {
    playTone(ctx, 60, 0.8, 'sawtooth', 0.25, 40);
    playNoise(ctx, 0.5, 0.2);
    setTimeout(() => playTone(ctx, 80, 0.6, 'sine', 0.15, 50), 200);
  },
  dragon_roar: (ctx) => {
    playTone(ctx, 120, 0.6, 'sawtooth', 0.35, 200);
    setTimeout(() => playTone(ctx, 200, 0.5, 'sawtooth', 0.25, 80), 150);
    setTimeout(() => playNoise(ctx, 0.3, 0.3), 300);
  },
  jargon_chime: (ctx) => {
    playTone(ctx, 660, 0.15, 'triangle', 0.2);
    setTimeout(() => playTone(ctx, 880, 0.15, 'triangle', 0.2), 120);
    setTimeout(() => playTone(ctx, 1100, 0.2, 'triangle', 0.2), 240);
    setTimeout(() => playTone(ctx, 1320, 0.3, 'triangle', 0.15), 360);
  },
};

export const soundManager = new SoundManager();
