/**
 * Story Mode card pools — filters cardData.json into limited/expanded/all pools.
 * Both player and bot use the same pool for a given level.
 */

import { getAllCards, shuffleDeck } from "../game/CardRegistry.js";

// Limited pool: basic creatures and tricks only — no complex abilities
const LIMITED_CARD_IDS = new Set([
  "happy_hippy",
  "lesser_goblin",
  "stoner",
  "streamer",
  "nerd",
  "nerdet",
  "gamer_boy",
  "wood_elf",
  "viper",
  "gabber",
  "book_witch",
  "smesh",
  "ooft",
  "thicc",
  "lerker",
  "trick_sp",
  "horse_dice",
  // Basic armour
  "rusty_helmet",
  "rusty_chestplate",
  "rusty_boots",
  "hessian_hood",
  "hessian_tunic",
  "hessian_sandals",
]);

// Expanded pool: adds more creatures and magic, still no endgame cards
const EXPANDED_EXTRA_IDS = new Set([
  "king_goblin",
  "ghost",
  "thief",
  "karen",
  "catfish",
  "motherdazer",
  "digital_artist",
  "swapeewee",
  "savage",
  "yeet",
  "finesse",
  "ama",
  "stfu",
  "lucky_helmet",
  "lucky_chestplate",
  "lucky_boots",
]);

/**
 * Build a shuffled story deck for the given pool name.
 * @param {'limited' | 'expanded' | 'all'} poolName
 * @returns {Array} shuffled deck with uid assigned
 */
export function buildStoryDeck(poolName) {
  const allCards = getAllCards();
  let filtered;

  if (poolName === "limited") {
    filtered = allCards.filter((c) => LIMITED_CARD_IDS.has(c.id));
  } else if (poolName === "expanded") {
    const allowed = new Set([...LIMITED_CARD_IDS, ...EXPANDED_EXTRA_IDS]);
    filtered = allCards.filter((c) => allowed.has(c.id));
  } else {
    // "all" — use everything except Events
    filtered = allCards.filter((c) => c.type !== "Event");
  }

  // Build deck with copy counts
  const deck = [];
  for (const card of filtered) {
    for (let i = 0; i < card.copies; i++) {
      deck.push({
        ...card,
        uid: `story_${card.id}_${i}`,
      });
    }
  }

  return shuffleDeck(deck);
}
