/**
 * Mystical swamp menu music — ethereal pads, glistening arpeggios, low drone.
 * Slow tempo (~70bpm), pentatonic minor, mysterious and atmospheric.
 */

// E minor pentatonic across octaves
const SCALE = [164.81, 196, 220, 261.63, 293.66]; // E3 G3 A3 C4 D4
const HIGH_SCALE = [659.25, 783.99, 880, 1046.5, 1174.66]; // E5 G5 A5 C6 D6
const BASS = [82.41, 98, 110]; // E2 G2 A2

/**
 * Play one cycle of menu music (~16s at 70bpm, 4 bars).
 * Returns array of AudioNodes for cleanup.
 */
export function playMenuLoop(ctx, volume) {
  const nodes = [];
  const t = ctx.currentTime;
  const bpm = 70;
  const beat = 60 / bpm;
  const bar = beat * 4;
  const bars = 4;
  const totalDur = bars * bar;

  // Layer 1: Deep bass drone (E2, sustained)
  playDrone(ctx, t, totalDur, volume, nodes);

  // Layer 2: Ethereal pad chords (slow evolving)
  playPads(ctx, t, bar, bars, volume, nodes);

  // Layer 3: Glistening arpeggios (wind chime-like)
  playGlisten(ctx, t, beat, bar, bars, volume, nodes);

  // Layer 4: Occasional sparkle hits
  playSparkles(ctx, t, totalDur, volume, nodes);

  return nodes;
}

/** Duration of one menu music loop in ms */
export const MENU_LOOP_MS = Math.round(4 * 4 * (60 / 70) * 1000); // ~13714ms

function playDrone(ctx, t, dur, volume, nodes) {
  const droneVol = volume * 0.35;

  // Root drone
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  const filter = ctx.createBiquadFilter();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(82.41, t); // E2
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(200, t);
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(droneVol, t + 1.5);
  gain.gain.setValueAtTime(droneVol, t + dur - 1.5);
  gain.gain.linearRampToValueAtTime(0, t + dur);
  osc.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur);
  nodes.push(osc);

  // Fifth above for richness
  const osc2 = ctx.createOscillator();
  const g2 = ctx.createGain();
  osc2.type = "sine";
  osc2.frequency.setValueAtTime(82.41 * 1.5, t); // B2
  g2.gain.setValueAtTime(0, t);
  g2.gain.linearRampToValueAtTime(droneVol * 0.3, t + 2);
  g2.gain.setValueAtTime(droneVol * 0.3, t + dur - 2);
  g2.gain.linearRampToValueAtTime(0, t + dur);
  osc2.connect(filter);
  filter.connect(g2);
  g2.connect(ctx.destination);
  osc2.start(t);
  osc2.stop(t + dur);
  nodes.push(osc2);
}

function playPads(ctx, t, bar, bars, volume, nodes) {
  const padVol = volume * 0.12;

  // Two-bar pad chords: Em then Am
  const chords = [
    [164.81, 196, 246.94], // Em: E3 G3 B3
    [220, 261.63, 329.63], // Am: A3 C4 E4
  ];

  for (let i = 0; i < bars; i += 2) {
    const chord = chords[(i / 2) % chords.length];
    const start = t + i * bar;
    const dur = bar * 2;

    for (const freq of chord) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq, start);
      // Slow detune wobble for ethereal feel
      osc.detune.setValueAtTime(-5, start);
      osc.detune.linearRampToValueAtTime(5, start + dur / 2);
      osc.detune.linearRampToValueAtTime(-5, start + dur);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(400, start);
      filter.frequency.linearRampToValueAtTime(700, start + dur / 2);
      filter.frequency.linearRampToValueAtTime(400, start + dur);

      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(padVol, start + 1.0);
      gain.gain.setValueAtTime(padVol, start + dur - 1.0);
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

function playGlisten(ctx, t, beat, bar, bars, volume, nodes) {
  const glistenVol = volume * 0.08;
  const totalBeats = bars * 4;

  // Sparse arpeggio — not every beat, random from high scale
  for (let i = 0; i < totalBeats; i++) {
    // ~40% chance per beat, more sparse
    if (Math.random() > 0.4) continue;

    const beatTime = t + i * beat;
    const freq = HIGH_SCALE[Math.floor(Math.random() * HIGH_SCALE.length)];
    const dur = 0.8 + Math.random() * 1.2;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, beatTime);

    // Bell-like envelope with long tail
    const vol = glistenVol * (0.5 + Math.random() * 0.5);
    gain.gain.setValueAtTime(0, beatTime);
    gain.gain.linearRampToValueAtTime(vol, beatTime + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, beatTime + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(beatTime);
    osc.stop(beatTime + dur);
    nodes.push(osc);
  }
}

function playSparkles(ctx, t, totalDur, volume, nodes) {
  const sparkVol = volume * 0.06;

  // 2-4 sparkle clusters across the loop
  const count = 2 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const start = t + 1 + Math.random() * (totalDur - 2);

    // Rapid descending notes (like wind chime)
    const noteCount = 3 + Math.floor(Math.random() * 3);
    for (let n = 0; n < noteCount; n++) {
      const nStart = start + n * 0.08;
      const freq =
        HIGH_SCALE[Math.floor(Math.random() * HIGH_SCALE.length)] *
        (1 + Math.random() * 0.5);

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, nStart);

      gain.gain.setValueAtTime(0, nStart);
      gain.gain.linearRampToValueAtTime(sparkVol, nStart + 0.005);
      gain.gain.exponentialRampToValueAtTime(0.001, nStart + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(nStart);
      osc.stop(nStart + 0.5);
      nodes.push(osc);
    }
  }
}
