import { useEffect, useRef } from 'react';
import { useStore } from '../store.js';
import { soundManager } from '../audio/SoundManager.js';

/**
 * Watches game state and computes music intensity (0.0-1.0).
 * Calls soundManager.setIntensity() when it changes by >0.05.
 *
 * Intensity model:
 * - Total creatures on field: 35% weight
 * - Closest player to winning (SP ratio): 40% weight
 * - Turn number: 25% weight
 */

const MAX_CREATURES = 12; // ~6 per player max
const MAX_TURNS = 30;     // intensity caps here

export function computeIntensity(gameState) {
  if (!gameState) return 0;

  const players = Object.values(gameState.players);

  // Creature count across all fields
  let totalCreatures = 0;
  for (const p of players) {
    totalCreatures += (p.swamp || []).length;
  }
  const creatureFactor = Math.min(1, totalCreatures / MAX_CREATURES);

  // Closest player to winning
  const winSP = gameState.winSP || 10000;
  let maxRatio = 0;
  for (const p of players) {
    const ratio = (p.sp || 0) / winSP;
    if (ratio > maxRatio) maxRatio = ratio;
  }
  const spFactor = Math.min(1, maxRatio);

  // Turn progression
  const turnFactor = Math.min(1, (gameState.turnNumber || 1) / MAX_TURNS);

  return creatureFactor * 0.35 + spFactor * 0.4 + turnFactor * 0.25;
}

export default function useMusicDirector() {
  const gameState = useStore(s => s.gameState);
  const lastIntensity = useRef(0);

  useEffect(() => {
    const intensity = computeIntensity(gameState);
    if (Math.abs(intensity - lastIntensity.current) > 0.05) {
      lastIntensity.current = intensity;
      soundManager.setIntensity(intensity);
    }
  }, [gameState]);
}
