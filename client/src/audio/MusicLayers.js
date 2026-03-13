/**
 * Dynamic music layer system for Goblin's Gambit.
 * 6+ layers that fade in/out based on a 0.0-1.0 intensity value.
 * Three distinct themes: swamp (folk/tavern + banjo), blood (dark/aggressive), frost (ethereal/crystalline).
 */

// ── Theme configurations ──

const THEMES = {
  swamp: {
    bpm: 140,
    chords: {
      low:    [[220,261.63,329.63],[261.63,329.63,392],[196,246.94,293.66],[220,261.63,329.63]],
      mid:    [[220,261.63,329.63],[293.66,349.23,440],[329.63,415.30,493.88],[220,261.63,329.63]],
      high:   [[220,261.63,329.63],[174.61,220,261.63],[293.66,349.23,440],[329.63,415.30,493.88]],
      finale: [[220,261.63,329.63],[246.94,293.66,349.23],[329.63,415.30,493.88],[220,261.63,329.63]],
    },
    bassRoots: {
      low: [110,130.81,98,110], mid: [110,146.83,164.81,110],
      high: [110,87.31,146.83,164.81], finale: [110,123.47,164.81,110],
    },
    melodyPools: {
      low: [440,523.25,587.33,659.25,783.99],
      mid: [440,523.25,587.33,659.25,783.99,880],
      high: [349.23,440,523.25,587.33,659.25,783.99,880],
      finale: [329.63,415.30,440,523.25,587.33,659.25,783.99],
    },
    bassType: 'triangle',
    melodyType: 'square',
    padType: 'sawtooth',
    padFilter: 600,
    melodyFilter: 1200,
    tritones: [[110,155.56],[123.47,174.61]],
  },

  blood: {
    bpm: 160,
    chords: {
      low:    [[293.66,349.23,440],[261.63,311.13,392],[293.66,349.23,440],[261.63,329.63,392]],
      mid:    [[293.66,349.23,440],[220,261.63,329.63],[246.94,311.13,369.99],[293.66,349.23,440]],
      high:   [[293.66,349.23,440],[174.61,220,261.63],[246.94,311.13,369.99],[329.63,415.30,493.88]],
      finale: [[293.66,349.23,440],[233.08,293.66,349.23],[329.63,415.30,493.88],[293.66,349.23,440]],
    },
    bassRoots: {
      low: [73.42,65.41,73.42,65.41], mid: [73.42,55,82.41,73.42],
      high: [73.42,43.65,82.41,73.42], finale: [73.42,61.74,82.41,73.42],
    },
    melodyPools: {
      low: [293.66,349.23,440,523.25,587.33],
      mid: [293.66,349.23,415.30,440,523.25,587.33],
      high: [261.63,293.66,349.23,415.30,440,523.25,587.33],
      finale: [233.08,293.66,349.23,415.30,440,523.25,587.33,659.25],
    },
    bassType: 'sawtooth',
    melodyType: 'sawtooth',
    padType: 'sawtooth',
    padFilter: 400,
    melodyFilter: 900,
    tritones: [[73.42,103.83],[82.41,116.54]],
  },

  frost: {
    bpm: 100,
    chords: {
      low:    [[329.63,493.88,659.25],[293.66,440,587.33],[329.63,493.88,659.25],[246.94,369.99,493.88]],
      mid:    [[329.63,493.88,659.25],[261.63,392,523.25],[293.66,440,587.33],[329.63,493.88,659.25]],
      high:   [[329.63,493.88,659.25],[220,329.63,440],[261.63,392,523.25],[329.63,493.88,659.25]],
      finale: [[329.63,493.88,659.25],[246.94,311.13,493.88],[293.66,440,587.33],[329.63,493.88,659.25]],
    },
    bassRoots: {
      low: [82.41,73.42,82.41,61.74], mid: [82.41,65.41,73.42,82.41],
      high: [82.41,55,65.41,82.41], finale: [82.41,61.74,73.42,82.41],
    },
    melodyPools: {
      low: [659.25,783.99,987.77,1174.66,1318.51],
      mid: [587.33,659.25,783.99,987.77,1174.66,1318.51],
      high: [523.25,659.25,783.99,987.77,1174.66,1318.51,1567.98],
      finale: [493.88,659.25,783.99,987.77,1174.66,1318.51,1567.98],
    },
    bassType: 'sine',
    melodyType: 'sine',
    padType: 'triangle',
    padFilter: 800,
    melodyFilter: 2000,
    tritones: [[82.41,116.54],[73.42,103.83]],
  },
};

function getThemeConfig(theme) {
  return THEMES[theme] || THEMES.swamp;
}

function getBand(intensity) {
  if (intensity < 0.3) return 'low';
  if (intensity < 0.6) return 'mid';
  if (intensity < 0.85) return 'high';
  return 'finale';
}

/**
 * Play a single dynamic loop cycle.
 * Returns array of AudioNodes for cleanup.
 */
export function playDynamicLoop(ctx, intensity, volume, theme = 'swamp') {
  const cfg = getThemeConfig(theme);
  const nodes = [];
  const t = ctx.currentTime;
  const beat = 60 / cfg.bpm;
  const bar = beat * 4;
  const bars = 8;
  const band = getBand(intensity);

  // Layer 1: Bass drone (always on)
  playBassLayer(ctx, t, beat, bar, bars, intensity, volume, cfg, band, nodes);

  // Layer 2: Melody (always on)
  playMelodyLayer(ctx, t, beat, bar, bars, intensity, volume, cfg, band, nodes);

  // Layer 3: Percussion (intensity >= 0.15)
  if (intensity >= 0.15) {
    playPercussionLayer(ctx, t, beat, bar, bars, intensity, volume, cfg, nodes);
  }

  // Layer 4: Tension pads (intensity >= 0.4)
  if (intensity >= 0.4) {
    playTensionPads(ctx, t, beat, bar, bars, intensity, volume, cfg, band, nodes);
  }

  // Layer 5: War drums (intensity >= 0.6)
  if (intensity >= 0.6) {
    playWarDrums(ctx, t, beat, bar, bars, intensity, volume, cfg, nodes);
  }

  // Layer 6: Dissonance (intensity >= 0.8)
  if (intensity >= 0.8) {
    playDissonance(ctx, t, beat, bar, bars, intensity, volume, cfg, nodes);
  }

  // Swamp bonus: Banjo layer (intensity < 0.7 — fades out during combat)
  if (theme === 'swamp' && intensity < 0.7) {
    playBanjoLayer(ctx, t, beat, bar, bars, intensity, volume, cfg, band, nodes);
  }

  // Frost bonus: Shimmer arpeggios (always on, ethereal sparkle)
  if (theme === 'frost') {
    playFrostShimmer(ctx, t, beat, bar, bars, intensity, volume, cfg, band, nodes);
  }

  // Blood bonus: Heartbeat pulse at low intensity
  if (theme === 'blood' && intensity < 0.5) {
    playHeartbeat(ctx, t, beat, bar, bars, intensity, volume, nodes);
  }

  return nodes;
}

/**
 * Get the loop duration in ms for a given theme.
 */
export function getLoopDurationMs(theme = 'swamp') {
  const cfg = getThemeConfig(theme);
  const beat = 60 / cfg.bpm;
  return Math.round(8 * 4 * beat * 1000);
}

// ── Layer implementations ──

function playBassLayer(ctx, t, beat, bar, bars, intensity, volume, cfg, band, nodes) {
  const roots = cfg.bassRoots[band];
  const bassVol = volume * (0.4 + intensity * 0.3);

  for (let i = 0; i < bars; i++) {
    const freq = roots[i % roots.length];
    const start = t + i * bar;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = cfg.bassType;
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(bassVol, start);
    gain.gain.setValueAtTime(bassVol, start + bar * 0.85);
    gain.gain.linearRampToValueAtTime(0, start + bar);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + bar);
    nodes.push(osc);

    // Fifth above for richness
    if (intensity > 0.2) {
      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.type = cfg.bassType;
      osc2.frequency.setValueAtTime(freq * 1.5, start);
      g2.gain.setValueAtTime(bassVol * 0.25, start);
      g2.gain.setValueAtTime(bassVol * 0.25, start + bar * 0.85);
      g2.gain.linearRampToValueAtTime(0, start + bar);
      osc2.connect(g2);
      g2.connect(ctx.destination);
      osc2.start(start);
      osc2.stop(start + bar);
      nodes.push(osc2);
    }
  }
}

function playMelodyLayer(ctx, t, beat, bar, bars, intensity, volume, cfg, band, nodes) {
  const pool = cfg.melodyPools[band];
  const melodyVol = volume * (0.3 + intensity * 0.15);
  const notesPerBar = intensity < 0.3 ? 3 : intensity < 0.6 ? 5 : 7;

  let noteTime = 0;
  const seed = Math.floor(intensity * 4);

  for (let b = 0; b < bars; b++) {
    for (let n = 0; n < notesPerBar; n++) {
      const idx = (b * notesPerBar + n + seed) % pool.length;
      const freq = pool[idx];
      const dur = (bar / notesPerBar);
      const start = t + noteTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = cfg.melodyType;
      osc.frequency.setValueAtTime(freq, start);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(cfg.melodyFilter + intensity * 1200, start);

      // Plucky envelope
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(melodyVol, start + 0.01);
      gain.gain.setValueAtTime(melodyVol * 0.6, start + 0.03);
      gain.gain.linearRampToValueAtTime(0, start + dur * 0.85);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
      nodes.push(osc);

      noteTime += dur;
    }
  }
}

function playPercussionLayer(ctx, t, beat, bar, bars, intensity, volume, cfg, nodes) {
  const totalBeats = bars * 4;
  const percVol = volume * (0.2 + intensity * 0.3);

  for (let i = 0; i < totalBeats; i++) {
    const beatTime = t + i * beat;
    const isDownbeat = i % 4 === 0;
    const isBackbeat = i % 4 === 2;
    const isOffbeat = i % 2 === 1;

    // Kick on downbeats
    if (isDownbeat && intensity >= 0.3) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(80, beatTime);
      osc.frequency.linearRampToValueAtTime(40, beatTime + 0.1);
      gain.gain.setValueAtTime(percVol * 0.8, beatTime);
      gain.gain.linearRampToValueAtTime(0, beatTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(beatTime);
      osc.stop(beatTime + 0.12);
      nodes.push(osc);
    }

    // Snare hits on backbeats
    if (isBackbeat && intensity >= 0.5) {
      const bufLen = Math.floor(ctx.sampleRate * 0.06);
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let j = 0; j < bufLen; j++) data[j] = (Math.random() * 2 - 1);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(percVol * 0.5, beatTime);
      gain.gain.linearRampToValueAtTime(0, beatTime + 0.06);
      const bpf = ctx.createBiquadFilter();
      bpf.type = 'bandpass';
      bpf.frequency.setValueAtTime(3000, beatTime);
      src.connect(bpf);
      bpf.connect(gain);
      gain.connect(ctx.destination);
      src.start(beatTime);
      nodes.push(src);
    }

    // Tambourine / hi-hat
    if (isDownbeat || isBackbeat || isOffbeat) {
      const bufLen = Math.floor(ctx.sampleRate * 0.035);
      const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let j = 0; j < bufLen; j++) data[j] = (Math.random() * 2 - 1);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const gain = ctx.createGain();
      const tambVol = isDownbeat ? percVol * 0.35 : percVol * 0.18;
      gain.gain.setValueAtTime(tambVol, beatTime);
      gain.gain.linearRampToValueAtTime(0, beatTime + 0.035);
      const hpf = ctx.createBiquadFilter();
      hpf.type = 'highpass';
      hpf.frequency.setValueAtTime(6000, beatTime);
      src.connect(hpf);
      hpf.connect(gain);
      gain.connect(ctx.destination);
      src.start(beatTime);
      nodes.push(src);
    }
  }
}

function playTensionPads(ctx, t, beat, bar, bars, intensity, volume, cfg, band, nodes) {
  const chords = cfg.chords[band];
  const padVol = volume * 0.15 * Math.min(1, (intensity - 0.4) / 0.3);

  for (let i = 0; i < bars; i += 2) {
    const chord = chords[(i / 2) % chords.length];
    const start = t + i * bar;
    const dur = bar * 2;

    for (const freq of chord) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = cfg.padType;
      osc.frequency.setValueAtTime(freq * 0.5, start);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(cfg.padFilter, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(padVol, start + 0.5);
      gain.gain.setValueAtTime(padVol, start + dur - 0.5);
      gain.gain.linearRampToValueAtTime(0, start + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
      nodes.push(osc);
    }
  }
}

function playWarDrums(ctx, t, beat, bar, bars, intensity, volume, cfg, nodes) {
  const drumVol = volume * 0.4 * Math.min(1, (intensity - 0.6) / 0.25);

  for (let i = 0; i < bars * 4; i++) {
    if (i % 4 !== 0 && i % 4 !== 2) continue;
    const beatTime = t + i * beat;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(55, beatTime);
    osc.frequency.linearRampToValueAtTime(30, beatTime + 0.25);
    gain.gain.setValueAtTime(drumVol, beatTime);
    gain.gain.linearRampToValueAtTime(0, beatTime + 0.3);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(beatTime);
    osc.stop(beatTime + 0.3);
    nodes.push(osc);

    // Noise burst for impact
    const bufLen = Math.floor(ctx.sampleRate * 0.08);
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let j = 0; j < bufLen; j++) data[j] = (Math.random() * 2 - 1);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(drumVol * 0.3, beatTime);
    g2.gain.linearRampToValueAtTime(0, beatTime + 0.08);
    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.setValueAtTime(200, beatTime);
    src.connect(lpf);
    lpf.connect(g2);
    g2.connect(ctx.destination);
    src.start(beatTime);
    nodes.push(src);
  }
}

function playDissonance(ctx, t, beat, bar, bars, intensity, volume, cfg, nodes) {
  const disVol = volume * 0.12 * Math.min(1, (intensity - 0.8) / 0.2);
  const tritones = cfg.tritones;

  for (let i = 0; i < bars; i += 2) {
    const pair = tritones[(i / 2) % tritones.length];
    const start = t + i * bar;
    const dur = bar * 2;

    for (const freq of pair) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, start);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, start);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(disVol, start + 1.0);
      gain.gain.setValueAtTime(disVol, start + dur - 0.5);
      gain.gain.linearRampToValueAtTime(0, start + dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
      nodes.push(osc);
    }
  }
}

// ── Theme-specific bonus layers ──

/**
 * Banjo layer for swamp theme — plucky arpeggiated notes with fast decay.
 * Uses square wave + aggressive lowpass for that twangy character.
 */
function playBanjoLayer(ctx, t, beat, bar, bars, intensity, volume, cfg, band, nodes) {
  const chords = cfg.chords[band];
  // Banjo is louder at low intensity, fades as battle heats up
  const banjoVol = volume * 0.25 * Math.max(0, 1 - intensity * 1.5);

  for (let i = 0; i < bars; i++) {
    const chord = chords[i % chords.length];
    const start = t + i * bar;

    // Arpeggiate: play each chord tone + octave up in quick succession
    const arpNotes = [...chord, chord[0] * 2, chord[1] * 2];
    const noteDur = beat * 0.4;

    for (let n = 0; n < arpNotes.length; n++) {
      // Alternate up/down pattern every other bar
      const idx = i % 2 === 0 ? n : arpNotes.length - 1 - n;
      const freq = arpNotes[idx];
      const noteStart = start + n * (beat * 0.5);
      if (noteStart >= start + bar) break;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      // Square wave + lowpass = twangy banjo-like timbre
      osc.type = 'square';
      osc.frequency.setValueAtTime(freq * 2, noteStart); // octave up for brightness
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2500, noteStart);
      filter.frequency.linearRampToValueAtTime(800, noteStart + noteDur);

      // Sharp attack, fast decay = pluck
      gain.gain.setValueAtTime(0, noteStart);
      gain.gain.linearRampToValueAtTime(banjoVol, noteStart + 0.005);
      gain.gain.setValueAtTime(banjoVol * 0.7, noteStart + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + noteDur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      osc.start(noteStart);
      osc.stop(noteStart + noteDur);
      nodes.push(osc);
    }
  }
}

/**
 * Frost shimmer — high-register crystalline arpeggios with long reverb-like tails.
 */
function playFrostShimmer(ctx, t, beat, bar, bars, intensity, volume, cfg, band, nodes) {
  const pool = cfg.melodyPools[band];
  const shimmerVol = volume * 0.12;

  for (let i = 0; i < bars; i++) {
    // 2-3 random shimmer notes per bar
    const count = 2 + Math.floor(intensity * 2);
    for (let n = 0; n < count; n++) {
      const idx = (i * 3 + n * 7) % pool.length;
      const freq = pool[idx];
      const offset = (n / count) * bar;
      const start = t + i * bar + offset;
      const dur = beat * 2;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      // Slight vibrato for icy shimmer
      osc.frequency.setValueAtTime(freq, start + dur * 0.3);
      osc.frequency.linearRampToValueAtTime(freq * 1.003, start + dur * 0.5);
      osc.frequency.linearRampToValueAtTime(freq, start + dur * 0.7);

      // Soft attack, long decay
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(shimmerVol, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur);
      nodes.push(osc);
    }
  }
}

/**
 * Blood moon heartbeat — low, pulsing thuds at low intensity, creating dread.
 */
function playHeartbeat(ctx, t, beat, bar, bars, intensity, volume, nodes) {
  const hbVol = volume * 0.3 * Math.max(0, 1 - intensity * 2);

  for (let i = 0; i < bars; i++) {
    const start = t + i * bar;

    // Double-thud heartbeat pattern (lub-dub)
    for (let pulse = 0; pulse < 2; pulse++) {
      const pStart = start + pulse * 0.2;
      const freq = pulse === 0 ? 45 : 35;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, pStart);
      osc.frequency.linearRampToValueAtTime(freq * 0.7, pStart + 0.15);

      gain.gain.setValueAtTime(hbVol * (pulse === 0 ? 1 : 0.7), pStart);
      gain.gain.linearRampToValueAtTime(0, pStart + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(pStart);
      osc.stop(pStart + 0.2);
      nodes.push(osc);
    }
  }
}
