/**
 * Story Mode run state — canonical shape for persistence and runtime.
 */

import { randomUUID } from "crypto";

const PLAYER_CARD_IMAGES = [
  "player_card_1.jpg",
  "player_card_2.jpg",
  "player_card_3.jpg",
  "player_card_4.jpg",
];

/**
 * Create a fresh story run state.
 * @param {string} username
 * @param {object} customCard - { name, attack, defence, sp }
 * @param {boolean} nightmare - nightmare mode flag
 */
export function createStoryRun(username, customCard, nightmare = false) {
  const randomImage =
    PLAYER_CARD_IMAGES[Math.floor(Math.random() * PLAYER_CARD_IMAGES.length)];
  return {
    runId: randomUUID(),
    username,
    customCard: {
      id: "custom_creature",
      name: customCard.name || "Custom Goblin",
      type: "Creature",
      cost: 1,
      attack: nightmare ? 50 : 100,
      defence: nightmare ? 50 : 100,
      sp: nightmare ? 50 : 100,
      copies: 1,
      image: randomImage,
      abilityId: null,
      effect: "Your custom creature",
      isCustomCard: true,
      _drawChanceBoost: 0,
    },
    currentLevelIndex: 0,
    lives: nightmare ? 2 : 3,
    nightmare,
    currentMap: null,
    currentNodeId: null,
    items: [], // { id, name, description, used }
    completedNodes: [], // node IDs that have been completed
    stats: {
      battlesWon: 0,
      battlesLost: 0,
      enhancementsPicked: 0,
      totalSPEarned: 0,
      creaturesKilled: 0,
      levelsCompleted: 0,
    },
    startedAt: Date.now(),
  };
}
