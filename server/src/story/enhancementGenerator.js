/**
 * Enhancement generator for story mode.
 * Generates 3 random options per enhancement node, scaled by level.
 */

// Stat boost options
const STAT_BOOSTS = [
  { type: "stat_boost", stat: "attack", amount: 50, description: "+50 ATK" },
  { type: "stat_boost", stat: "attack", amount: 100, description: "+100 ATK" },
  { type: "stat_boost", stat: "defence", amount: 50, description: "+50 DEF" },
  { type: "stat_boost", stat: "defence", amount: 100, description: "+100 DEF" },
  { type: "stat_boost", stat: "attack", amount: 200, description: "+200 ATK" },
  { type: "stat_boost", stat: "defence", amount: 200, description: "+200 DEF" },
];

// Stat trade options (gain one stat, lose another)
const STAT_TRADES = [
  { type: "stat_trade", boostStat: "attack", boostAmount: 300, costStat: "defence", costAmount: 100, description: "+300 ATK but -100 DEF" },
  { type: "stat_trade", boostStat: "defence", boostAmount: 300, costStat: "attack", costAmount: 100, description: "+300 DEF but -100 ATK" },
  { type: "stat_trade", boostStat: "attack", boostAmount: 200, costStat: "defence", costAmount: 50, description: "+200 ATK but -50 DEF" },
  { type: "stat_trade", boostStat: "defence", boostAmount: 200, costStat: "attack", costAmount: 50, description: "+200 DEF but -50 ATK" },
];

// Ability options
const ABILITY_OPTIONS = [
  {
    type: "ability",
    abilityId: "sweep_attack",
    description: "Sweep Attack — split ATK across all enemies",
  },
  {
    type: "ability",
    abilityId: "dodge_evade",
    description: "Dodge — attacks bypass creature, hit SP instead",
  },
  {
    type: "ability",
    abilityId: "streamer_draw",
    description: "Streamer — draw 1 card when played",
  },
  {
    type: "ability",
    abilityId: "stoner_shield",
    description: "Shield — spend 1 AP for temp shield",
  },
  {
    type: "ability",
    abilityId: "wood_elf_burn",
    description: "Burn — +100 SP bonus on kill",
  },
  {
    type: "ability",
    abilityId: "viper_sting",
    description: "Viper Sting — -1 AP to attacker",
  },
  {
    type: "ability",
    abilityId: "ghost_invisible",
    description: "Ghost — invisible until you attack",
  },
];

// Life recovery
const LIFE_OPTION = { type: "life", description: "+1 Life" };

// Draw boost
const DRAW_BOOST = {
  type: "draw_boost",
  description: "Draw Boost — custom card appears more often",
};

// Items
const ITEM_BERSERK = {
  type: "item",
  itemId: "berserk_charm",
  itemName: "Berserk Charm",
  itemDescription: "Doubles ATK for all your creatures for 10 turns",
  description: "Item: Berserk Charm",
};

const ITEM_SATCHEL = {
  type: "item",
  itemId: "sock_satchel",
  itemName: "Sock Satchel Portal",
  itemDescription: "Add a trophy card to your hand during battle",
  description: "Item: Sock Satchel Portal",
};

/**
 * Generate 3 enhancement options for the given level.
 * @param {string} levelKey - 'tavern' | 'hills' | 'swamp' | 'tundra' | 'cliffs' | 'volcano'
 * @param {object} run - current story run state
 * @returns {Array} 3 enhancement options
 */
export function generateEnhancements(levelKey, run) {
  const pool = [];
  const maxLives = run.nightmare ? 2 : 3;

  // All levels get stat boosts and stat trades
  pool.push(...STAT_BOOSTS);
  pool.push(...STAT_TRADES);

  // Hills+ get abilities
  if (["hills", "swamp", "tundra", "cliffs", "volcano"].includes(levelKey)) {
    // Don't offer ability if custom card already has one
    if (!run.customCard.abilityId) {
      pool.push(...ABILITY_OPTIONS);
    }
  }

  // Swamp+ get life recovery (if below max)
  if (
    ["swamp", "tundra", "cliffs"].includes(levelKey) &&
    run.lives < maxLives
  ) {
    pool.push(LIFE_OPTION);
  }

  // Swamp+ get draw boost
  if (["swamp", "tundra", "cliffs", "volcano"].includes(levelKey)) {
    pool.push(DRAW_BOOST);
  }

  // Tundra+ get Berserk Charm (if don't already have one)
  if (["tundra", "cliffs", "volcano"].includes(levelKey)) {
    if (!run.items.some((i) => i.id === "berserk_charm" && !i.used)) {
      pool.push(ITEM_BERSERK);
    }
  }

  // Cliffs+ get Sock Satchel (if player has trophies — we can't check here, so always offer)
  if (["cliffs", "volcano"].includes(levelKey)) {
    if (!run.items.some((i) => i.id === "sock_satchel" && !i.used)) {
      pool.push(ITEM_SATCHEL);
    }
  }

  // Volcano: items only
  if (levelKey === "volcano") {
    const volcanoPool = [ITEM_BERSERK, DRAW_BOOST];
    if (!run.items.some((i) => i.id === "sock_satchel" && !i.used)) {
      volcanoPool.push(ITEM_SATCHEL);
    }
    // Add big stat boosts and trades
    volcanoPool.push(
      {
        type: "stat_boost",
        stat: "attack",
        amount: 300,
        description: "+300 ATK",
      },
      {
        type: "stat_boost",
        stat: "defence",
        amount: 300,
        description: "+300 DEF",
      },
      ...STAT_TRADES,
    );
    return pickRandom(volcanoPool, 3);
  }

  return pickRandom(pool, 3);
}

/** Pick n random unique items from array */
function pickRandom(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  const seen = new Set();
  const result = [];
  for (const item of shuffled) {
    // Deduplicate by description
    if (seen.has(item.description)) continue;
    seen.add(item.description);
    result.push(item);
    if (result.length >= n) break;
  }
  // Pad with stat boosts if pool was too small (avoid duplicates)
  const padPool = STAT_BOOSTS.filter((b) => !seen.has(b.description));
  let padIdx = 0;
  while (result.length < n) {
    if (padIdx < padPool.length) {
      result.push(padPool[padIdx++]);
    } else {
      // Absolute fallback: use any stat boost (duplicates unavoidable)
      result.push(STAT_BOOSTS[Math.floor(Math.random() * STAT_BOOSTS.length)]);
      break;
    }
  }
  return result;
}
