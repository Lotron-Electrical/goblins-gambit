/**
 * Sound manager using raw Web Audio API.
 * All sounds generated programmatically — no audio files needed.
 */

class SoundManager {
  constructor() {
    this.muted = false;
    this.ctx = null;
    this.initialized = false;
    this.musicPlaying = false;
    this.musicNodes = null;
    this.musicVolume = 0.12;
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
    this._scheduleTavernLoop();
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

  _scheduleTavernLoop() {
    if (!this.musicPlaying || !this.ctx) return;
    const nodes = playTavernLoop(this.ctx, this.muted ? 0 : this.musicVolume);
    this.musicNodes = nodes;
    // Each loop is ~8 bars at 140bpm = ~13.7s. Schedule next loop slightly before end.
    this._musicTimer = setTimeout(() => {
      this._scheduleTavernLoop();
    }, 13500);
  }

  toggleMute() {
    this.muted = !this.muted;
    // If music is playing, restart it to pick up new volume (or silence it)
    if (this.musicPlaying) {
      this.stopMusic();
      if (!this.muted) this.startMusic();
    }
    return this.muted;
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

// --- Goblin Tavern Music ---
// Procedural medieval tavern loop using pentatonic melody, droning bass, and a rhythmic tambourine.
// 8 bars at ~140 BPM (~13.7s per loop).

function playTavernLoop(ctx, volume) {
  const nodes = [];
  const t = ctx.currentTime;
  const bpm = 140;
  const beat = 60 / bpm; // ~0.428s per beat
  const bar = beat * 4;

  // --- Droning bass (low fifths, sustained) ---
  const bassNotes = [110, 110, 130.81, 146.83, 110, 110, 146.83, 130.81]; // A2, A2, C3, D3, A2, A2, D3, C3
  bassNotes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t + i * bar);
    // Add a subtle fifth above
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 1.5, t + i * bar);
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(volume * 0.3, t + i * bar);
    g2.gain.setValueAtTime(volume * 0.3, t + i * bar + bar * 0.9);
    g2.gain.linearRampToValueAtTime(0, t + i * bar + bar);
    gain.gain.setValueAtTime(volume * 0.5, t + i * bar);
    gain.gain.setValueAtTime(volume * 0.5, t + i * bar + bar * 0.9);
    gain.gain.linearRampToValueAtTime(0, t + i * bar + bar);
    osc.connect(gain); gain.connect(ctx.destination);
    osc2.connect(g2); g2.connect(ctx.destination);
    osc.start(t + i * bar); osc.stop(t + i * bar + bar);
    osc2.start(t + i * bar); osc2.stop(t + i * bar + bar);
    nodes.push(osc, osc2);
  });

  // --- Melody (pentatonic, played on a lute-like square wave) ---
  // A minor pentatonic: A C D E G (octaves 4-5)
  const melodyNotes = [
    // bar 0
    [440, 0.5], [523, 0.5], [587, 0.5], [659, 0.25], [587, 0.25],
    // bar 1
    [523, 0.75], [440, 0.25], [523, 0.5], [587, 0.5],
    // bar 2
    [659, 0.5], [784, 0.5], [659, 0.25], [587, 0.25], [523, 0.5],
    // bar 3
    [587, 0.75], [523, 0.25], [440, 1.0],
    // bar 4 (repeat with variation)
    [440, 0.25], [523, 0.25], [587, 0.5], [659, 0.5], [784, 0.5],
    // bar 5
    [880, 0.75], [784, 0.25], [659, 0.5], [587, 0.5],
    // bar 6
    [523, 0.5], [440, 0.25], [392, 0.25], [440, 0.5], [523, 0.5],
    // bar 7 (resolution)
    [587, 0.5], [523, 0.75], [440, 0.75],
  ];

  let noteTime = 0;
  melodyNotes.forEach(([freq, dur]) => {
    const noteDur = dur * beat;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(freq, t + noteTime);
    // Plucky envelope: quick attack, medium sustain, fade out
    gain.gain.setValueAtTime(0, t + noteTime);
    gain.gain.linearRampToValueAtTime(volume * 0.4, t + noteTime + 0.01);
    gain.gain.setValueAtTime(volume * 0.25, t + noteTime + 0.03);
    gain.gain.linearRampToValueAtTime(0, t + noteTime + noteDur * 0.9);
    // Low-pass via a second gain to soften square wave
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, t + noteTime);
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    osc.start(t + noteTime);
    osc.stop(t + noteTime + noteDur);
    nodes.push(osc);
    noteTime += noteDur;
  });

  // --- Tambourine / percussion (filtered noise on beats) ---
  const totalBeats = 8 * 4; // 32 beats
  for (let i = 0; i < totalBeats; i++) {
    const beatTime = t + i * beat;
    const isDownbeat = i % 4 === 0;
    const isOffbeat = i % 2 === 1;
    // Downbeats: louder kick-like thump
    if (isDownbeat) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, beatTime);
      osc.frequency.linearRampToValueAtTime(40, beatTime + 0.1);
      gain.gain.setValueAtTime(volume * 0.6, beatTime);
      gain.gain.linearRampToValueAtTime(0, beatTime + 0.12);
      osc.connect(gain); gain.connect(ctx.destination);
      osc.start(beatTime); osc.stop(beatTime + 0.12);
      nodes.push(osc);
    }
    // All beats + offbeats: tambourine shake
    if (isDownbeat || isOffbeat || i % 4 === 2) {
      const bufLen = Math.floor(ctx.sampleRate * 0.04);
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let j = 0; j < bufLen; j++) data[j] = (Math.random() * 2 - 1);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const gain = ctx.createGain();
      const tambVol = isDownbeat ? volume * 0.35 : volume * 0.2;
      gain.gain.setValueAtTime(tambVol, beatTime);
      gain.gain.linearRampToValueAtTime(0, beatTime + 0.04);
      const hpf = ctx.createBiquadFilter();
      hpf.type = 'highpass';
      hpf.frequency.setValueAtTime(6000, beatTime);
      src.connect(hpf); hpf.connect(gain); gain.connect(ctx.destination);
      src.start(beatTime);
      nodes.push(src);
    }
  }

  return nodes;
}

export const soundManager = new SoundManager();
