/**
 * Sound manager using raw Web Audio API.
 * All sounds generated programmatically — no audio files needed.
 */

import { playDynamicLoop } from './MusicLayers.js';

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
    playSwampAmbient(this.ctx, this.muted ? 0 : 0.06);
    // Ambient loop is ~10s
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
      const nodes = playDynamicLoop(this.ctx, this.intensity, this.musicVolume);
      this.musicNodes = nodes;
    } catch (e) {
      // Prevent loop chain from breaking on audio errors
      console.warn('[SoundManager] music loop error:', e);
    }
    // 8 bars at 140bpm = 8 * 4 * (60/140) = ~13714ms
    this._musicTimer = setTimeout(() => {
      this._scheduleLoop();
    }, 13714);
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
    playNoise(ctx, 0.3, 0.4);
    playTone(ctx, 200, 0.4, 'sawtooth', 0.25, 40);
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
};

export const soundManager = new SoundManager();
