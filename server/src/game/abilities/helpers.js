/**
 * Shared helper functions for ability handlers.
 */

import { getOtherPlayerIds } from "../GameState.js";
import { THEME_EFFECTS } from "../../../../shared/src/constants.js";

/**
 * Get effective stats for a creature, accounting for buffs/debuffs.
 * Re-exported from EffectResolver to avoid circular deps.
 */
export function getEffectiveStats(state, ownerId, card) {
  let attack = card.attack || 0;
  let defence = card.defence || 0;
  let sp = card.sp || 0;

  // Check silenced - if silenced, return base stats only (with damage)
  if (card._silenced) {
    defence -= card._defenceDamage || 0;
    return {
      attack: Math.max(0, attack),
      defence: Math.max(0, defence),
      sp: Math.max(0, sp),
    };
  }

  // Permanent damage taken
  defence -= card._defenceDamage || 0;

  // Temp buffs
  attack += card._attackBuff || 0;
  defence += card._defenceBuff || 0;

  // Swapeewee: ATK and DEF swap each turn
  if (card.abilityId === "swapeewee_swap" && card._swapped) {
    [attack, defence] = [card.defence || 0, card.attack || 0];
    attack += card._attackBuff || 0;
    defence -= card._defenceDamage || 0;
    defence += card._defenceBuff || 0;
  }

  // King Goblin: +100 ATK per Lesser Goblin on same field
  if (card.abilityId === "king_goblin_buff") {
    const player = state.players[ownerId];
    if (player) {
      const lesserCount = player.swamp.filter(
        (c) => c.id === "lesser_goblin",
      ).length;
      attack += lesserCount * 100;
    }
  }

  // Lesser Goblin: King Goblin gives them +100 ATK
  if (card.id === "lesser_goblin") {
    const player = state.players[ownerId];
    if (player) {
      const hasKing = player.swamp.some((c) => c.id === "king_goblin");
      if (hasKing) attack += 100;
    }
  }

  // Grencle: all opponents' creatures lose 100 ATK
  for (const [pid, p] of Object.entries(state.players)) {
    if (pid === ownerId) continue;
    if (p.swamp.some((c) => c.abilityId === "grencle_debuff" && !c._silenced)) {
      attack = Math.max(0, attack - 100);
    }
  }

  // Motherdazer: adjacent allies (by slot position) get +200 DEF
  const player = state.players[ownerId];
  if (!player)
    return {
      attack: Math.max(0, attack),
      defence: Math.max(0, defence),
      sp: Math.max(0, sp),
    };
  const cardSlot =
    card._slot ?? player.swamp.findIndex((c) => c.uid === card.uid);
  for (const adj of player.swamp) {
    if (adj.uid === card.uid) continue;
    if (adj.abilityId !== "motherdazer_buff" || adj._silenced) continue;
    const adjSlot =
      adj._slot ?? player.swamp.findIndex((c) => c.uid === adj.uid);
    if (Math.abs(cardSlot - adjSlot) === 1) {
      defence += 200;
    }
  }

  // Gamblid: dynamic stats based on hand sizes
  if (card.abilityId === "gamblid_dynamic") {
    const otherIds = getOtherPlayerIds(state, ownerId);
    const avgOppHand =
      otherIds.reduce(
        (sum, id) => sum + (state.players[id]?.hand.length || 0),
        0,
      ) / Math.max(1, otherIds.length);
    attack = Math.round(avgOppHand) * 100;
    defence = player.hand.length * 100;
    sp = attack + defence;
  }

  // Digital Artist: +100 temp shield per round
  defence += card._tempShield || 0;

  // Theme stat multipliers
  const themeEffects = THEME_EFFECTS[state.theme];
  if (themeEffects) {
    if (themeEffects.atkMultiplier && themeEffects.atkMultiplier !== 1) {
      attack = Math.floor(attack * themeEffects.atkMultiplier);
    }
    if (themeEffects.defMultiplier && themeEffects.defMultiplier !== 1) {
      defence = Math.floor(defence * themeEffects.defMultiplier);
    }
  }

  return {
    attack: Math.max(0, attack),
    defence: Math.max(0, defence),
    sp: Math.max(0, sp),
  };
}

/**
 * Check if a player qualifies for Berserk (last place, leader past halfway, gap >= 2000).
 */
export function isLastPlace(state, playerId) {
  const players = Object.values(state.players);
  if (players.length < 2) return false;

  const spValues = players.map((p) => p.sp);
  const maxSP = Math.max(...spValues);
  const minSP = Math.min(...spValues);
  const mySP = state.players[playerId]?.sp ?? 0;
  const halfWin = (state.winSP || 10000) / 2;

  // Only activate when leader is past halfway and gap is >= 2000
  if (maxSP < halfWin || maxSP - minSP < 2000) return false;

  // Must be at minimum SP, and not everyone tied
  const allTied = spValues.every((sp) => sp === minSP);
  if (allTied) return false;

  return mySP === minSP;
}

/**
 * Get all opponent creatures (visible only).
 */
export function getOpponentCreatures(state, playerId) {
  const targets = [];
  for (const [pid, p] of Object.entries(state.players)) {
    if (pid === playerId) continue;
    for (const c of p.swamp) {
      if (c._invisible) continue;
      targets.push({ ownerId: pid, uid: c.uid, name: c.name, id: c.id });
    }
  }
  return targets;
}

/**
 * Get own creatures.
 */
export function getOwnCreatures(state, playerId) {
  return state.players[playerId].swamp.map((c) => ({
    ownerId: playerId,
    uid: c.uid,
    name: c.name,
    id: c.id,
  }));
}

/**
 * Get ALL creatures on the field (any player).
 */
export function getAllCreatures(state) {
  const targets = [];
  for (const [pid, p] of Object.entries(state.players)) {
    for (const c of p.swamp) {
      if (c._invisible) continue;
      targets.push({ ownerId: pid, uid: c.uid, name: c.name, id: c.id });
    }
  }
  return targets;
}

/**
 * Get the next free visual slot (0-4) for a player's swamp.
 */
export function getNextFreeSlot(player) {
  const usedSlots = new Set(
    player.swamp.map((c) => c._slot).filter((s) => s != null),
  );
  for (let i = 0; i < 5; i++) {
    if (!usedSlots.has(i)) return i;
  }
  return player.swamp.length;
}

/**
 * Get opponent players as targets.
 */
export function getOpponentPlayers(state, playerId) {
  const targets = [];
  for (const [pid, p] of Object.entries(state.players)) {
    if (pid === playerId) continue;
    targets.push({ ownerId: pid, uid: pid, name: p.name, id: pid });
  }
  return targets;
}
