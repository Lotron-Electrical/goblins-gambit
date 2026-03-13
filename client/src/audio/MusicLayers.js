/**
 * Dynamic music layer system for Goblin's Gambit.
 * 6 layers that fade in/out based on a 0.0-1.0 intensity value.
 * Chord progressions shift from folk/tavern to dramatic/diminished.
 */

// Chord progressions per intensity band
// Each chord is an array of frequencies (root + intervals)
const CHORDS = {
  low: [  // Am - C - G - Am (folk/tavern)
    [220, 261.63, 329.63],  // Am
    [261.63, 329.63, 392],  // C
    [196, 246.94, 293.66],  // G
    [220, 261.63, 329.63],  // Am
  ],
  mid: [  // Am - Dm - E - Am (tension building)
    [220, 261.63, 329.63],  // Am
    [293.66, 349.23, 440],  // Dm
    [329.63, 415.30, 493.88], // E
    [220, 261.63, 329.63],  // Am
  ],
  high: [ // Am - F - Dm - E (dramatic)
    [220, 261.63, 329.63],  // Am
    [174.61, 220, 261.63],  // F
    [293.66, 349.23, 440],  // Dm
    [329.63, 415.30, 493.88], // E
  ],
  finale: [ // Am - Bdim - E - Am (diminished urgency)
    [220, 261.63, 329.63],  // Am
    [246.94, 293.66, 349.23], // Bdim
    [329.63, 415.30, 493.88], // E
    [220, 261.63, 329.63],  // Am
  ],
};

function getChords(intensity) {
  if (intensity < 0.3) return CHORDS.low;
  if (intensity < 0.6) return CHORDS.mid;
  if (intensity < 0.85) return CHORDS.high;
  return CHORDS.finale;
}

// Bass roots per chord progression
const BASS_ROOTS = {
  low: [110, 130.81, 98, 110],
  mid: [110, 146.83, 164.81, 110],
  high: [110, 87.31, 146.83, 164.81],
  finale: [110, 123.47, 164.81, 110],
};

function getBassRoots(intensity) {
  if (intensity < 0.3) return BASS_ROOTS.low;
  if (intensity < 0.6) return BASS_ROOTS.mid;
  if (intensity < 0.85) return BASS_ROOTS.high;
  return BASS_ROOTS.finale;
}

// Melody note pools per intensity (pentatonic scales, shifted darker at high intensity)
const MELODY_POOLS = {
  low: [440, 523.25, 587.33, 659.25, 783.99],      // A minor pentatonic
  mid: [440, 523.25, 587.33, 659.25, 783.99, 880],
  high: [349.23, 440, 523.25, 587.33, 659.25, 783.99, 880],
  finale: [329.63, 415.30, 440, 523.25, 587.33, 659.25, 783.99],
};

function getMelodyPool(intensity) {
  if (intensity < 0.3) return MELODY_POOLS.low;
  if (intensity < 0.6) return MELODY_POOLS.mid;
  if (intensity < 0.85) return MELODY_POOLS.high;
  return MELODY_POOLS.finale;
}

/**
 * Play a single dynamic loop cycle (~13.7s at 140bpm, 8 bars).
 * Returns array of AudioNodes for cleanup.
 */
export function playDynamicLoop(ctx, intensity, volume) {
  const nodes = [];
  const t = ctx.currentTime;
  const bpm = 140;
  const beat = 60 / bpm;
  const bar = beat * 4;
  const bars = 8;

  // Layer 1: Bass drone (always on)
  playBassLayer(ctx, t, beat, bar, bars, intensity, volume, nodes);

  // Layer 2: Melody (always on)
  playMelodyLayer(ctx, t, beat, bar, bars, intensity, volume, nodes);

  // Layer 3: Percussion (intensity >= 0.15)
  if (intensity >= 0.15) {
    playPercussionLayer(ctx, t, beat, bar, bars, intensity, volume, nodes);
  }

  // Layer 4: Tension pads (intensity >= 0.4)
  if (intensity >= 0.4) {
    playTensionPads(ctx, t, beat, bar, bars, intensity, volume, nodes);
  }

  // Layer 5: War drums (intensity >= 0.6)
  if (intensity >= 0.6) {
    playWarDrums(ctx, t, beat, bar, bars, intensity, volume, nodes);
  }

  // Layer 6: Dissonance (intensity >= 0.8)
  if (intensity >= 0.8) {
    playDissonance(ctx, t, beat, bar, bars, intensity, volume, nodes);
  }

  return nodes;
}

function playBassLayer(ctx, t, beat, bar, bars, intensity, volume, nodes) {
  const roots = getBassRoots(intensity);
  const bassVol = volume * (0.4 + intensity * 0.3);

  for (let i = 0; i < bars; i++) {
    const freq = roots[i % roots.length];
    const start = t + i * bar;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, start);
    gain.gain.setValueAtTime(bassVol, start);
    gain.gain.setValueAtTime(bassVol, start + bar * 0.85);
    gain.gain.linearRampToValueAtTime(0, start + bar);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(start);
    osc.stop(start + bar);
    nodes.push(osc);

    // Fifth above for richness (scales with intensity)
    if (intensity > 0.2) {
      const osc2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      osc2.type = 'triangle';
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

function playMelodyLayer(ctx, t, beat, bar, bars, intensity, volume, nodes) {
  const pool = getMelodyPool(intensity);
  const melodyVol = volume * (0.3 + intensity * 0.15);
  // Note density increases with intensity
  const notesPerBar = intensity < 0.3 ? 3 : intensity < 0.6 ? 5 : 7;

  let noteTime = 0;
  // Use a seeded-ish pattern based on intensity band for consistency
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

      osc.type = 'square';
      osc.frequency.setValueAtTime(freq, start);
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200 + intensity * 1200, start);

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

function playPercussionLayer(ctx, t, beat, bar, bars, intensity, volume, nodes) {
  const totalBeats = bars * 4;
  const percVol = volume * (0.2 + intensity * 0.3);

  for (let i = 0; i < totalBeats; i++) {
    const beatTime = t + i * beat;
    const isDownbeat = i % 4 === 0;
    const isBackbeat = i % 4 === 2;
    const isOffbeat = i % 2 === 1;

    // Kick on downbeats (intensity >= 0.3 adds kick)
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

    // Snare hits on backbeats (intensity >= 0.5)
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

    // Tambourine on most beats
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

function playTensionPads(ctx, t, beat, bar, bars, intensity, volume, nodes) {
  const chords = getChords(intensity);
  const padVol = volume * 0.15 * Math.min(1, (intensity - 0.4) / 0.3);

  for (let i = 0; i < bars; i += 2) {
    const chord = chords[(i / 2) % chords.length];
    const start = t + i * bar;
    const dur = bar * 2;

    for (const freq of chord) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq * 0.5, start); // octave below
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(600, start);

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

function playWarDrums(ctx, t, beat, bar, bars, intensity, volume, nodes) {
  const drumVol = volume * 0.4 * Math.min(1, (intensity - 0.6) / 0.25);

  for (let i = 0; i < bars * 4; i++) {
    // Beats 1 and 3 only
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

    // Add noise burst for impact
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

function playDissonance(ctx, t, beat, bar, bars, intensity, volume, nodes) {
  const disVol = volume * 0.12 * Math.min(1, (intensity - 0.8) / 0.2);

  // Tritone intervals in bass register, sustained
  const tritones = [
    [110, 155.56],  // A2 - D#3 (tritone)
    [123.47, 174.61], // B2 - F3
  ];

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
