/**
 * Creature on-play ability handlers.
 * Each handler is called AFTER the creature is placed on the field.
 */

import { drawCardRaw, getOtherPlayerIds } from '../GameState.js';
import { killCreature } from '../CombatResolver.js';
import { getEffectiveStats, getOpponentCreatures, getOwnCreatures, getAllCreatures, getOpponentPlayers } from './helpers.js';
import { MAX_SWAMP_SIZE } from '../../../../shared/src/constants.js';

// --- Streamer: draw 1 card on play ---
export function streamer_draw(state, playerId, card, cardIdx, targetInfo) {
  const events = [];
  const drawn = drawCardRaw(state, playerId);
  if (drawn) {
    events.push({ type: 'draw_card', playerId, count: 1 });
  }
  return { success: true, events };
}

// --- Ghost: invisible until it attacks ---
export function ghost_invisible(state, playerId, card, cardIdx, targetInfo) {
  card._invisible = true;
  return { success: true, events: [] };
}

// --- Thot: instakill an opponent creature on play ---
export function thot_instakill(state, playerId, card, cardIdx, targetInfo) {
  const player = state.players[playerId];
  const events = [];

  if (!targetInfo) {
    const validTargets = getOpponentCreatures(state, playerId);
    if (validTargets.length > 0) {
      return {
        success: true, events, needsTarget: true,
        targetRequest: {
          playerId, action: 'thot_instakill', cardUid: card.uid, validTargets,
          prompt: 'Choose a creature to instantly destroy',
        },
      };
    }
    return { success: true, events };
  }

  const { targetOwnerId, targetUid } = targetInfo;
  const targetOwner = state.players[targetOwnerId];
  const target = targetOwner?.swamp.find(c => c.uid === targetUid);
  if (target) {
    const tStats = getEffectiveStats(state, targetOwnerId, target);
    player.sp += tStats.sp;
    events.push({ type: 'destroy', cardUid: targetUid, owner: targetOwnerId, reason: 'Thot instakill' });
    events.push({ type: 'sp_change', playerId, amount: tStats.sp });
    killCreature(state, targetOwnerId, targetUid);
  }
  return { success: true, events };
}

// --- Stoner: activated ability (1 AP -> temp shield for all own creatures) ---
// On-play: no immediate effect. Activated ability handled via USE_ABILITY action.
export function stoner_shield(state, playerId, card, cardIdx, targetInfo) {
  return { success: true, events: [] };
}

// --- Thief: activated ability (1 AP -> steal 200 SP) ---
// On-play: no immediate effect.
export function thief_steal(state, playerId, card, cardIdx, targetInfo) {
  return { success: true, events: [] };
}

// --- King of Thieves: activated ability (2 AP -> steal 500 SP) ---
export function king_thief_steal(state, playerId, card, cardIdx, targetInfo) {
  return { success: true, events: [] };
}

// --- Troll: activated ability (1 AP -> cycle target's stats ATK->DEF->SP->ATK) ---
export function troll_swap(state, playerId, card, cardIdx, targetInfo) {
  return { success: true, events: [] };
}

// --- Saving Grace: activated ability (mode: 3 creatures for 100 ATK each, or 1 for 300) ---
export function saving_grace_multi(state, playerId, card, cardIdx, targetInfo) {
  return { success: true, events: [] };
}

// --- Dead Meme: on-death effect (handled in CombatResolver), no on-play ---
export function dead_meme_revive(state, playerId, card, cardIdx, targetInfo) {
  return { success: true, events: [] };
}

// --- Zucc: on play, steal 1 piece of opponent's armour ---
export function zucc_steal(state, playerId, card, cardIdx, targetInfo) {
  const player = state.players[playerId];
  const events = [];

  if (!targetInfo) {
    // Build valid targets: opponent armour pieces
    const validTargets = [];
    for (const [pid, p] of Object.entries(state.players)) {
      if (pid === playerId) continue;
      for (const slot of ['head', 'body', 'feet']) {
        if (p.gear[slot]) {
          validTargets.push({
            ownerId: pid,
            uid: p.gear[slot].uid,
            name: p.gear[slot].name,
            slot,
          });
        }
      }
    }
    if (validTargets.length > 0) {
      return {
        success: true, events, needsTarget: true,
        targetRequest: {
          playerId, action: 'zucc_steal', cardUid: card.uid, validTargets,
          prompt: 'Choose an opponent\'s armour piece to steal',
        },
      };
    }
    return { success: true, events };
  }

  // Steal the armour piece
  const { targetOwnerId, targetUid } = targetInfo;
  const targetPlayer = state.players[targetOwnerId];
  if (!targetPlayer) {
    return { success: false, events, error: 'Target player not found' };
  }
  for (const slot of ['head', 'body', 'feet']) {
    if (targetPlayer.gear[slot]?.uid === targetUid) {
      const stolen = targetPlayer.gear[slot];
      targetPlayer.gear[slot] = null;
      // Equip to own slot (replace if occupied)
      if (player.gear[stolen.slot]) {
        state.graveyard.push(player.gear[stolen.slot]);
        events.push({ type: 'destroy', cardUid: player.gear[stolen.slot].uid, owner: playerId, reason: 'Replaced by stolen armour' });
      }
      player.gear[stolen.slot] = stolen;
      events.push({ type: 'equip_armour', cardUid: stolen.uid, card: stolen, playerId, slot: stolen.slot, reason: 'Zucc stole it!' });
      break;
    }
  }
  return { success: true, events };
}

// --- Crack Head: attacks 2 creatures at 200 damage each (activated) ---
// On-play: no immediate effect. Multi-attack handled in combat.
export function crack_head_multi(state, playerId, card, cardIdx, targetInfo) {
  return { success: true, events: [] };
}

// --- Harambe: placed in opponent's swamp. Dies after 1 round. Caster gets SP. ---
export function harambe_plant(state, playerId, card, cardIdx, targetInfo) {
  const player = state.players[playerId];
  const events = [];

  if (!targetInfo) {
    const validTargets = getOpponentPlayers(state, playerId);
    if (validTargets.length > 0) {
      return {
        success: true, events, needsTarget: true,
        targetRequest: {
          playerId, action: 'harambe_plant', cardUid: card.uid, validTargets,
          prompt: 'Choose opponent\'s swamp to place Harambe in',
          targetType: 'player',
        },
      };
    }
    return { success: true, events };
  }

  // Remove from current owner's swamp (it was placed there by resolveCreature)
  const myIdx = player.swamp.findIndex(c => c.uid === card.uid);
  if (myIdx !== -1) player.swamp.splice(myIdx, 1);

  // Place in opponent's swamp
  const { targetOwnerId } = targetInfo;
  const opponent = state.players[targetOwnerId];
  if (!opponent) return { success: false, events, error: 'Target player not found' };
  if (opponent.swamp.length < MAX_SWAMP_SIZE) {
    card._originalOwner = playerId;
    card._controller = targetOwnerId;
    card._roundsRemaining = 1;
    card._harambeOwner = playerId; // who gets SP when it dies
    opponent.swamp.push(card);
    events.push({ type: 'card_moved', cardUid: card.uid, from: playerId, to: targetOwnerId, reason: 'Harambe planted!' });
  }
  return { success: true, events };
}

// --- Rhy Bear: activated ability, split 800 ATK on 1 or 400 on 2 ---
export function rhy_bear_split(state, playerId, card, cardIdx, targetInfo) {
  return { success: true, events: [] };
}

// --- Catfish: stats copy first creature to attack it (passive, handled in CombatResolver) ---
export function catfish_mimic(state, playerId, card, cardIdx, targetInfo) {
  return { success: true, events: [] };
}
