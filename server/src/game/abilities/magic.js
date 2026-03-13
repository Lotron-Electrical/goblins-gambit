/**
 * Magic spell ability handlers.
 * Magic cards are consumed on use (go to graveyard).
 */

import { drawCardRaw, getOtherPlayerIds } from '../GameState.js';
import { killCreature } from '../CombatResolver.js';
import { getEffectiveStats, getOpponentCreatures, getOwnCreatures, getOpponentPlayers, getNextFreeSlot } from './helpers.js';
import { MAX_HAND_SIZE, MAX_SWAMP_SIZE } from '../../../../shared/src/constants.js';

// --- Smesh: 500 damage to a creature ---
export function smesh_damage(state, playerId, card, cardIdx, targetInfo) {
  const player = state.players[playerId];
  const events = [];

  if (!targetInfo) {
    const validTargets = getOpponentCreatures(state, playerId);
    if (validTargets.length === 0) return { success: false, error: 'No valid targets' };
    return {
      success: true, events, needsTarget: true,
      targetRequest: {
        playerId, action: 'smesh_damage', cardUid: card.uid, validTargets,
        prompt: 'Choose a creature to deal 500 damage',
      },
    };
  }

  player.ap -= (card._effectiveCost ?? card.cost);
  player.hand.splice(cardIdx, 1);
  events.push({ type: 'card_played', cardUid: card.uid, card, playerId });

  const { targetOwnerId, targetUid } = targetInfo;
  const targetCard = state.players[targetOwnerId]?.swamp.find(c => c.uid === targetUid);
  if (targetCard) {
    targetCard._defenceDamage = (targetCard._defenceDamage || 0) + 500;
    events.push({ type: 'damage', cardUid: targetUid, amount: 500 });
    const stats = getEffectiveStats(state, targetOwnerId, targetCard);
    if (stats.defence <= 0) {
      player.sp += stats.sp;
      events.push({ type: 'destroy', cardUid: targetUid, owner: targetOwnerId });
      events.push({ type: 'sp_change', playerId, amount: stats.sp });
      killCreature(state, targetOwnerId, targetUid);
    }
  }
  state.graveyard.push(card);
  return { success: true, events };
}

// --- Savage: destroy a creature ---
export function savage_destroy(state, playerId, card, cardIdx, targetInfo) {
  const player = state.players[playerId];
  const events = [];

  if (!targetInfo) {
    const validTargets = getOpponentCreatures(state, playerId);
    if (validTargets.length === 0) return { success: false, error: 'No valid targets' };
    return {
      success: true, events, needsTarget: true,
      targetRequest: {
        playerId, action: 'savage_destroy', cardUid: card.uid, validTargets,
        prompt: 'Choose a creature to destroy',
      },
    };
  }

  player.ap -= (card._effectiveCost ?? card.cost);
  player.hand.splice(cardIdx, 1);
  events.push({ type: 'card_played', cardUid: card.uid, card, playerId });

  const { targetOwnerId, targetUid } = targetInfo;
  const targetCard = state.players[targetOwnerId]?.swamp.find(c => c.uid === targetUid);
  if (targetCard) {
    const stats = getEffectiveStats(state, targetOwnerId, targetCard);
    player.sp += stats.sp;
    events.push({ type: 'destroy', cardUid: targetUid, owner: targetOwnerId });
    events.push({ type: 'sp_change', playerId, amount: stats.sp });
    killCreature(state, targetOwnerId, targetUid);
  }
  state.graveyard.push(card);
  return { success: true, events };
}

// --- Ooft: +200 ATK to own creature ---
export function ooft_buff(state, playerId, card, cardIdx, targetInfo) {
  const player = state.players[playerId];
  const events = [];

  if (!targetInfo) {
    const validTargets = getOwnCreatures(state, playerId);
    if (validTargets.length === 0) return { success: false, error: 'No creatures to buff' };
    return {
      success: true, events, needsTarget: true,
      targetRequest: {
        playerId, action: 'ooft_buff', cardUid: card.uid, validTargets,
        prompt: 'Choose a creature to give +200 ATK',
      },
    };
  }

  player.ap -= (card._effectiveCost ?? card.cost);
  player.hand.splice(cardIdx, 1);
  events.push({ type: 'card_played', cardUid: card.uid, card, playerId });

  const { targetUid } = targetInfo;
  const targetCard = player.swamp.find(c => c.uid === targetUid);
  if (targetCard) {
    targetCard._attackBuff = (targetCard._attackBuff || 0) + 200;
    events.push({ type: 'buff', cardUid: targetUid, text: '+200 ATK' });
  }
  state.graveyard.push(card);
  return { success: true, events };
}

// --- Thicc: +500 DEF to own creature ---
export function thicc_buff(state, playerId, card, cardIdx, targetInfo) {
  const player = state.players[playerId];
  const events = [];

  if (!targetInfo) {
    const validTargets = getOwnCreatures(state, playerId);
    if (validTargets.length === 0) return { success: false, error: 'No creatures to buff' };
    return {
      success: true, events, needsTarget: true,
      targetRequest: {
        playerId, action: 'thicc_buff', cardUid: card.uid, validTargets,
        prompt: 'Choose a creature to give +500 DEF',
      },
    };
  }

  player.ap -= (card._effectiveCost ?? card.cost);
  player.hand.splice(cardIdx, 1);
  events.push({ type: 'card_played', cardUid: card.uid, card, playerId });

  const { targetUid } = targetInfo;
  const targetCard = player.swamp.find(c => c.uid === targetUid);
  if (targetCard) {
    targetCard._defenceBuff = (targetCard._defenceBuff || 0) + 500;
    events.push({ type: 'buff', cardUid: targetUid, text: '+500 DEF' });
  }
  state.graveyard.push(card);
  return { success: true, events };
}

// --- Judgment: SP must be EXACTLY 1000. Steal all opponent creatures (max 3). ---
export function judgment_steal(state, playerId, card, cardIdx, targetInfo) {
  const player = state.players[playerId];
  const events = [];

  if (player.sp !== 1000) {
    return { success: false, error: 'Judgment requires EXACTLY 1000 SP' };
  }

  if (!targetInfo) {
    const validTargets = getOpponentPlayers(state, playerId);
    if (validTargets.length === 0) return { success: false, error: 'No opponents to target' };
    if (validTargets.length === 1) {
      // Auto-target single opponent
      targetInfo = { targetOwnerId: validTargets[0].ownerId };
    } else {
      return {
        success: true, events, needsTarget: true,
        targetRequest: {
          playerId, action: 'judgment_steal', cardUid: card.uid, validTargets,
          prompt: 'Choose a player to steal creatures from (SP must be exactly 1000)',
          targetType: 'player',
        },
      };
    }
  }

  player.ap -= (card._effectiveCost ?? card.cost);
  player.hand.splice(cardIdx, 1);
  events.push({ type: 'card_played', cardUid: card.uid, card, playerId });

  const { targetOwnerId } = targetInfo;
  const targetPlayer = state.players[targetOwnerId];
  if (targetPlayer) {
    const stolen = targetPlayer.swamp.splice(0, Math.min(3, targetPlayer.swamp.length));
    for (const creature of stolen) {
      // Clean up temp state
      delete creature._hasAttacked;
      creature._controller = playerId;
      creature._originalOwner = targetOwnerId;
      if (player.swamp.length < MAX_SWAMP_SIZE) {
        creature._slot = getNextFreeSlot(player);
        player.swamp.push(creature);
        events.push({ type: 'card_moved', cardUid: creature.uid, from: targetOwnerId, to: playerId, reason: 'Judgment!' });
      } else {
        state.graveyard.push(creature);
        events.push({ type: 'destroy', cardUid: creature.uid, owner: targetOwnerId, reason: 'No room - discarded' });
      }
    }
  }
  state.graveyard.push(card);
  return { success: true, events };
}

// --- Yeet: destroy random card from opponent's hand ---
export function yeet_discard(state, playerId, card, cardIdx, targetInfo) {
  const player = state.players[playerId];
  const events = [];

  if (!targetInfo) {
    const validTargets = getOpponentPlayers(state, playerId);
    if (validTargets.length === 0) return { success: false, error: 'No opponents' };
    if (validTargets.length === 1) {
      targetInfo = { targetOwnerId: validTargets[0].ownerId };
    } else {
      return {
        success: true, events, needsTarget: true,
        targetRequest: {
          playerId, action: 'yeet_discard', cardUid: card.uid, validTargets,
          prompt: 'Choose a player to discard a random card from',
          targetType: 'player',
        },
      };
    }
  }

  player.ap -= (card._effectiveCost ?? card.cost);
  player.hand.splice(cardIdx, 1);
  events.push({ type: 'card_played', cardUid: card.uid, card, playerId });

  const { targetOwnerId } = targetInfo;
  const targetPlayer = state.players[targetOwnerId];
  if (targetPlayer && targetPlayer.hand.length > 0) {
    const randIdx = Math.floor(Math.random() * targetPlayer.hand.length);
    const [discarded] = targetPlayer.hand.splice(randIdx, 1);
    state.graveyard.push(discarded);
    events.push({ type: 'card_discarded', cardUid: discarded.uid, card: discarded, targetPlayerId: targetOwnerId, reason: 'Yeet!' });
  }
  state.graveyard.push(card);
  return { success: true, events };
}

// --- AMA: reveal opponent's hand to you for remainder of turn ---
export function ama_reveal(state, playerId, card, cardIdx, targetInfo) {
  const player = state.players[playerId];
  const events = [];

  if (!targetInfo) {
    const validTargets = getOpponentPlayers(state, playerId);
    if (validTargets.length === 0) return { success: false, error: 'No opponents' };
    if (validTargets.length === 1) {
      targetInfo = { targetOwnerId: validTargets[0].ownerId };
    } else {
      return {
        success: true, events, needsTarget: true,
        targetRequest: {
          playerId, action: 'ama_reveal', cardUid: card.uid, validTargets,
          prompt: 'Choose a player to reveal their hand',
          targetType: 'player',
        },
      };
    }
  }

  player.ap -= (card._effectiveCost ?? card.cost);
  player.hand.splice(cardIdx, 1);
  events.push({ type: 'card_played', cardUid: card.uid, card, playerId });

  const { targetOwnerId } = targetInfo;
  const targetPlayer = state.players[targetOwnerId];
  if (targetPlayer) {
    // Mark revealed hand - getClientState will check this
    if (!state._revealedHands) state._revealedHands = {};
    if (!state._revealedHands[playerId]) state._revealedHands[playerId] = [];
    state._revealedHands[playerId].push(targetOwnerId);
    events.push({ type: 'hand_revealed', viewerId: playerId, targetPlayerId: targetOwnerId, hand: targetPlayer.hand });

    // Show revealed hand in choice modal so it's unmissable
    state.pendingChoice = {
      type: 'ama_reveal',
      playerId,
      cards: [...targetPlayer.hand],
      prompt: `${targetPlayer.name}'s hand:`,
    };
  }
  state.graveyard.push(card);
  return { success: true, events };
}

// --- Finesse: steal random card from opponent's hand ---
export function finesse_steal(state, playerId, card, cardIdx, targetInfo) {
  const player = state.players[playerId];
  const events = [];

  if (!targetInfo) {
    const validTargets = getOpponentPlayers(state, playerId);
    if (validTargets.length === 0) return { success: false, error: 'No opponents' };
    if (validTargets.length === 1) {
      targetInfo = { targetOwnerId: validTargets[0].ownerId };
    } else {
      return {
        success: true, events, needsTarget: true,
        targetRequest: {
          playerId, action: 'finesse_steal', cardUid: card.uid, validTargets,
          prompt: 'Choose a player to steal a random card from',
          targetType: 'player',
        },
      };
    }
  }

  player.ap -= (card._effectiveCost ?? card.cost);
  player.hand.splice(cardIdx, 1);
  events.push({ type: 'card_played', cardUid: card.uid, card, playerId });

  const { targetOwnerId } = targetInfo;
  const targetPlayer = state.players[targetOwnerId];
  if (targetPlayer && targetPlayer.hand.length > 0) {
    const randIdx = Math.floor(Math.random() * targetPlayer.hand.length);
    const [stolen] = targetPlayer.hand.splice(randIdx, 1);
    if (player.hand.length < MAX_HAND_SIZE) {
      player.hand.push(stolen);
      events.push({ type: 'card_stolen', cardUid: stolen.uid, card: stolen, from: targetOwnerId, to: playerId, reason: 'Finesse!' });
    } else {
      state.graveyard.push(stolen);
      events.push({ type: 'card_discarded', cardUid: stolen.uid, reason: 'Hand full - discarded' });
    }
  }
  state.graveyard.push(card);
  return { success: true, events };
}

// --- Woke: view top 5 deck cards (private to caster) ---
export function woke_peek(state, playerId, card, cardIdx, targetInfo) {
  const player = state.players[playerId];
  const events = [];

  player.ap -= (card._effectiveCost ?? card.cost);
  player.hand.splice(cardIdx, 1);
  events.push({ type: 'card_played', cardUid: card.uid, card, playerId });

  const topCards = state.deck.slice(-5).reverse(); // top of deck is end of array
  events.push({ type: 'deck_peek', playerId, cards: topCards });
  state.graveyard.push(card);

  // Show peeked cards in choice modal (read-only peek, no selection)
  state.pendingChoice = {
    type: 'woke_peek',
    playerId,
    cards: topCards,
    prompt: 'Top 5 cards on the deck:',
  };

  return { success: true, events };
}

// --- Snacc: gain control of opponent creature for 1 turn ---
export function snacc_control(state, playerId, card, cardIdx, targetInfo) {
  const player = state.players[playerId];
  const events = [];

  if (!targetInfo) {
    const validTargets = getOpponentCreatures(state, playerId);
    if (validTargets.length === 0) return { success: false, error: 'No creatures to steal' };
    return {
      success: true, events, needsTarget: true,
      targetRequest: {
        playerId, action: 'snacc_control', cardUid: card.uid, validTargets,
        prompt: 'Choose an opponent creature to control for 1 turn',
      },
    };
  }

  player.ap -= (card._effectiveCost ?? card.cost);
  player.hand.splice(cardIdx, 1);
  events.push({ type: 'card_played', cardUid: card.uid, card, playerId });

  const { targetOwnerId, targetUid } = targetInfo;
  const targetPlayer = state.players[targetOwnerId];
  if (!targetPlayer) { state.graveyard.push(card); return { success: true, events }; }
  const targetIdx = targetPlayer.swamp.findIndex(c => c.uid === targetUid);
  if (targetIdx !== -1 && player.swamp.length < MAX_SWAMP_SIZE) {
    const [creature] = targetPlayer.swamp.splice(targetIdx, 1);
    creature._originalOwner = targetOwnerId;
    creature._controller = playerId;
    creature._snaccReturn = true; // flag to return at end of controller's next turn
    creature._hasAttacked = true; // cannot attack the turn it's stolen
    creature._slot = getNextFreeSlot(player);
    player.swamp.push(creature);
    events.push({ type: 'card_moved', cardUid: creature.uid, from: targetOwnerId, to: playerId, reason: 'Snacc!' });
  }
  state.graveyard.push(card);
  return { success: true, events };
}

// --- Lerker: roll 2D6, draw that many cards (cap at hand limit) ---
export function lerker_draw(state, playerId, card, cardIdx, targetInfo) {
  const player = state.players[playerId];
  const events = [];

  // Lerker is free (cost 0)
  player.hand.splice(cardIdx, 1);
  events.push({ type: 'card_played', cardUid: card.uid, card, playerId });

  const d1 = Math.ceil(Math.random() * 6);
  const d2 = Math.ceil(Math.random() * 6);
  const drawCount = d1 + d2;
  events.push({ type: 'dice_roll', dice: [d1, d2], result: drawCount, playerId, reason: 'Lerker draw' });

  let drawn = 0;
  let discarded = 0;
  for (let i = 0; i < drawCount; i++) {
    if (player.hand.length < MAX_HAND_SIZE) {
      const c = drawCardRaw(state, playerId);
      if (c) drawn++;
      else break;
    } else {
      // Excess goes to graveyard
      if (state.deck.length > 0) {
        const c = state.deck.pop();
        state.graveyard.push(c);
        discarded++;
      } else break;
    }
  }
  events.push({ type: 'draw_card', playerId, count: drawn });
  if (discarded > 0) {
    events.push({ type: 'cards_discarded', count: discarded, reason: 'Hand full (Lerker overflow)' });
  }
  state.graveyard.push(card);
  return { success: true, events };
}

// --- STFU: silence target creature's ability for 1 turn ---
export function stfu_silence(state, playerId, card, cardIdx, targetInfo) {
  const player = state.players[playerId];
  const events = [];

  if (!targetInfo) {
    // Can target any creature (own or opponent's)
    const validTargets = [];
    for (const [pid, p] of Object.entries(state.players)) {
      for (const c of p.swamp) {
        if (c.abilityId) {
          validTargets.push({ ownerId: pid, uid: c.uid, name: c.name, id: c.id });
        }
      }
    }
    if (validTargets.length === 0) return { success: false, error: 'No creatures with abilities to silence' };
    return {
      success: true, events, needsTarget: true,
      targetRequest: {
        playerId, action: 'stfu_silence', cardUid: card.uid, validTargets,
        prompt: 'Choose a creature to silence for 1 turn',
      },
    };
  }

  // Free action (cost 0)
  player.hand.splice(cardIdx, 1);
  events.push({ type: 'card_played', cardUid: card.uid, card, playerId });

  const { targetOwnerId, targetUid } = targetInfo;
  const targetCard = state.players[targetOwnerId]?.swamp.find(c => c.uid === targetUid);
  if (targetCard) {
    targetCard._silenced = true;
    events.push({ type: 'buff', cardUid: targetUid, text: 'SILENCED!' });
  }
  state.graveyard.push(card);
  return { success: true, events };
}

// --- Lagg: skip target opponent's next draw phase ---
export function lagg_delay(state, playerId, card, cardIdx, targetInfo) {
  const player = state.players[playerId];
  const events = [];

  if (!targetInfo) {
    const validTargets = getOpponentPlayers(state, playerId);
    if (validTargets.length === 0) return { success: false, error: 'No opponents' };
    if (validTargets.length === 1) {
      targetInfo = { targetOwnerId: validTargets[0].ownerId };
    } else {
      return {
        success: true, events, needsTarget: true,
        targetRequest: {
          playerId, action: 'lagg_delay', cardUid: card.uid, validTargets,
          prompt: 'Choose an opponent to skip their next draw',
          targetType: 'player',
        },
      };
    }
  }

  // Free action (cost 0)
  player.hand.splice(cardIdx, 1);
  events.push({ type: 'card_played', cardUid: card.uid, card, playerId });

  const { targetOwnerId } = targetInfo;
  const targetPlayer = state.players[targetOwnerId];
  if (targetPlayer) {
    targetPlayer._drawSkip = (targetPlayer._drawSkip || 0) + 1;
    events.push({ type: 'buff', text: `${targetPlayer.name} will skip next draw!` });
  }
  state.graveyard.push(card);
  return { success: true, events };
}
