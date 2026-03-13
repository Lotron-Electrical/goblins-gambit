/**
 * Effect resolver — thin dispatcher using the ability registry.
 * Routes card plays to the correct handler based on abilityId.
 */

import { onPlayRegistry } from './abilities/index.js';
import { getEffectiveStats as _getEffectiveStats } from './abilities/helpers.js';
import { getLuckyShield, cursed_set_bonus } from './abilities/armour.js';
import { MAX_SWAMP_SIZE, CARD_TYPE } from '../../../shared/src/constants.js';
import { getOtherPlayerIds } from './GameState.js';

// Re-export getEffectiveStats so existing imports keep working
export const getEffectiveStats = _getEffectiveStats;

/**
 * Resolve playing a card from hand.
 * Returns { success, events, needsTarget, targetRequest }
 */
export function resolvePlayCard(state, playerId, cardUid, targetInfo) {
  const player = state.players[playerId];
  const cardIdx = player.hand.findIndex(c => c.uid === cardUid);

  // For target resolution, card may already be on field (creatures)
  const isTargetResolution = !!targetInfo && cardIdx === -1;

  if (cardIdx === -1 && !isTargetResolution) {
    return { success: false, error: 'Card not in hand' };
  }

  const card = isTargetResolution
    ? findCardOnField(state, playerId, cardUid)
    : player.hand[cardIdx];

  if (!card) return { success: false, error: 'Card not found' };

  // Check AP cost (skip for target resolution — already paid)
  if (!isTargetResolution && card.cost > player.ap) {
    return { success: false, error: `Need ${card.cost} AP, have ${player.ap}` };
  }

  // Check Rusty armour blocks
  if (!isTargetResolution) {
    for (const [pid, p] of Object.entries(state.players)) {
      if (pid === playerId) continue;
      for (const slot of ['head', 'body', 'feet']) {
        const armour = p.gear[slot];
        if (!armour || armour.abilityId !== 'rusty_block') continue;
        if (armour.blockedType === card.type) {
          return { success: false, error: `Blocked by ${armour.name}! Can't play ${card.type} cards` };
        }
        const hasFullSet = p.gear.head?.set === 'rusty' && p.gear.body?.set === 'rusty' && p.gear.feet?.set === 'rusty';
        if (hasFullSet && card.type === 'Creature') {
          return { success: false, error: 'Blocked by full Rusty set! Can\'t play Creature cards' };
        }
      }
    }
  }

  switch (card.type) {
    case CARD_TYPE.TRICKS:
      return resolveTrick(state, playerId, card, cardIdx, targetInfo);

    case CARD_TYPE.CREATURE:
      return resolveCreature(state, playerId, card, cardIdx, targetInfo, isTargetResolution);

    case CARD_TYPE.MAGIC:
      return resolveMagic(state, playerId, card, cardIdx, targetInfo, isTargetResolution);

    case CARD_TYPE.ARMOUR:
      return resolveArmour(state, playerId, card, cardIdx);

    default:
      return { success: false, error: 'Unknown card type' };
  }
}

function resolveTrick(state, playerId, card, cardIdx, targetInfo) {
  const handler = onPlayRegistry[card.abilityId];
  if (handler) {
    return handler(state, playerId, card, cardIdx, targetInfo);
  }
  // Fallback: consume card
  const player = state.players[playerId];
  player.hand.splice(cardIdx, 1);
  state.graveyard.push(card);
  return { success: true, events: [{ type: 'card_played', cardUid: card.uid, card, playerId }] };
}

function resolveCreature(state, playerId, card, cardIdx, targetInfo, isTargetResolution) {
  const player = state.players[playerId];
  const events = [];

  if (!isTargetResolution) {
    if (player.swamp.length >= MAX_SWAMP_SIZE) {
      return { success: false, error: 'Swamp is full (max 5 creatures)' };
    }
    player.ap -= card.cost;
    player.hand.splice(cardIdx, 1);

    // Support slot-based placement
    const slotIndex = targetInfo?.slotIndex;
    if (slotIndex != null && slotIndex >= 0 && slotIndex < MAX_SWAMP_SIZE) {
      // Insert at the requested position (clamped to current length)
      const insertAt = Math.min(slotIndex, player.swamp.length);
      player.swamp.splice(insertAt, 0, card);
    } else {
      player.swamp.push(card);
    }
    events.push({ type: 'card_played', cardUid: card.uid, card, playerId, zone: 'swamp' });
  }

  // Check Book Witch protection for targeted creature abilities
  if (targetInfo?.targetOwnerId && targetInfo.targetOwnerId !== playerId) {
    const targetPlayer = state.players[targetInfo.targetOwnerId];
    if (targetPlayer?.swamp.some(c => c.abilityId === 'book_witch_shield' && !c._silenced)) {
      events.push({ type: 'buff', text: 'Blocked by Book Witch!' });
      return { success: true, events };
    }
  }

  // Dispatch to ability handler
  const handler = onPlayRegistry[card.abilityId];
  if (handler) {
    const result = handler(state, playerId, card, cardIdx, targetInfo);
    return {
      ...result,
      events: [...events, ...(result.events || [])],
    };
  }

  return { success: true, events };
}

function resolveMagic(state, playerId, card, cardIdx, targetInfo, isTargetResolution) {
  const player = state.players[playerId];
  const events = [];

  // Check Book Witch protection
  if (targetInfo?.targetOwnerId) {
    const targetPlayer = state.players[targetInfo.targetOwnerId];
    if (targetPlayer?.swamp.some(c => c.abilityId === 'book_witch_shield' && !c._silenced)) {
      if (!isTargetResolution) {
        player.ap -= card.cost;
        player.hand.splice(cardIdx, 1);
      }
      state.graveyard.push(card);
      events.push({ type: 'card_played', cardUid: card.uid, card, playerId });
      events.push({ type: 'buff', text: 'Blocked by Book Witch!' });
      return { success: true, events };
    }
  }

  // Dispatch to ability handler
  const handler = onPlayRegistry[card.abilityId];
  if (handler) {
    return handler(state, playerId, card, cardIdx, targetInfo);
  }

  // Fallback for unimplemented magic
  if (!isTargetResolution) {
    if (card.cost === 0) {
      player.hand.splice(cardIdx, 1);
    } else {
      player.ap -= card.cost;
      player.hand.splice(cardIdx, 1);
    }
  }
  events.push({ type: 'card_played', cardUid: card.uid, card, playerId });
  state.graveyard.push(card);
  return { success: true, events };
}

function resolveArmour(state, playerId, card, cardIdx) {
  const player = state.players[playerId];
  const slot = card.slot;
  const events = [];

  if (!slot) return { success: false, error: 'Invalid armour card' };

  // If slot already occupied, old armour goes to graveyard
  if (player.gear[slot]) {
    state.graveyard.push(player.gear[slot]);
    events.push({ type: 'destroy', cardUid: player.gear[slot].uid, owner: playerId, reason: 'Replaced' });
  }

  player.ap -= card.cost;
  player.hand.splice(cardIdx, 1);
  // Track durability countdown
  card._turnsRemaining = card.durability;
  player.gear[slot] = card;
  events.push({ type: 'equip_armour', cardUid: card.uid, card, playerId, slot });

  // Check for set completion
  const set = card.set;
  if (set) {
    const pieces = ['head', 'body', 'feet'].filter(s => player.gear[s]?.set === set);
    if (pieces.length === 3) {
      events.push({ type: 'set_complete', set, playerId });

      // Cursed set bonus: choose opponent to swap SP
      if (set === 'cursed') {
        const otherIds = getOtherPlayerIds(state, playerId);
        if (otherIds.length === 1) {
          cursed_set_bonus(state, playerId, otherIds[0], events);
        } else if (otherIds.length > 1) {
          // Need to choose opponent
          const validTargets = otherIds.map(id => ({
            ownerId: id, uid: id, name: state.players[id].name,
          }));
          return {
            success: true, events, needsTarget: true,
            targetRequest: {
              playerId, action: 'cursed_swap', cardUid: card.uid, validTargets,
              prompt: 'Choose opponent to swap SP totals with (Cursed set bonus)',
              targetType: 'player',
            },
          };
        }
      }
    }
  }

  return { success: true, events };
}

/** Find a card on a player's field (swamp) by uid */
function findCardOnField(state, playerId, cardUid) {
  const player = state.players[playerId];
  return player.swamp.find(c => c.uid === cardUid) || null;
}
