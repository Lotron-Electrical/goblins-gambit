/**
 * AI Bot Player for Goblin's Gambit.
 * Evaluates game state and returns actions. Runs server-side.
 */

import { ACTION, CARD_TYPE, MAX_HAND_SIZE } from '../../../shared/src/constants.js';
import { hasActivatedAbility } from '../game/abilities/index.js';

let nextBotId = 1;

const BOT_NAMES = [
  'Grukk the Cunning',
  'Snaggletooth',
  'Bogrot',
  'Skullcruncher',
  'Wartface',
  'Gobbo McStab',
  'Grimjaw',
  'Rotgut',
  'Spleenripper',
  'Fungus Pete',
];

export function createBotId() {
  return `bot_${nextBotId++}`;
}

export function getBotName() {
  return BOT_NAMES[Math.floor(Math.random() * BOT_NAMES.length)];
}

/**
 * Given a game state from the bot's perspective, decide the next action.
 * Returns an action object or null if the bot should end its turn.
 */
export function decideBotAction(state) {
  const me = state.players[state.myId];
  const isMyTurn = state.currentPlayerId === state.myId;

  // Handle pending target selection
  if (state.pendingTarget && state.pendingTarget.playerId === state.myId) {
    return handleTargetSelection(state);
  }

  // Handle pending card choice (Dead Meme, Woke)
  if (state.pendingChoice && state.pendingChoice.playerId === state.myId) {
    return handleCardChoice(state);
  }

  if (!isMyTurn) return null;
  if (me.ap <= 0) return { type: ACTION.END_TURN };

  // --- Decision priority ---

  // 1. Play high-value cards from hand
  const cardToPlay = pickCardToPlay(state, me);
  if (cardToPlay) return cardToPlay;

  // 2. Attack with creatures on field
  const attackAction = pickAttack(state, me);
  if (attackAction) return attackAction;

  // 3. Use activated abilities
  const abilityAction = pickAbility(state, me);
  if (abilityAction) return abilityAction;

  // 4. Draw cards if hand is small and we have AP
  if (me.hand.length < 5 && me.ap >= 1) {
    return { type: ACTION.DRAW_CARD };
  }

  // 5. Buy AP if we have lots of SP and useful cards/attacks remaining
  if (me.sp >= 2000 && me.hand.length > 3 && me.ap <= 1) {
    return { type: ACTION.BUY_AP };
  }

  // 6. Draw if we still have AP
  if (me.hand.length < MAX_HAND_SIZE && me.ap >= 1) {
    return { type: ACTION.DRAW_CARD };
  }

  return { type: ACTION.END_TURN };
}

// --- Card Play Logic ---

function pickCardToPlay(state, me) {
  if (me.ap < 1) return null;

  const playable = me.hand
    .filter(c => !c.hidden && c.cost <= me.ap)
    .map(c => ({ card: c, score: scoreCard(state, me, c) }))
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score);

  if (playable.length === 0) return null;

  const best = playable[0];
  const action = { type: ACTION.PLAY_CARD, cardUid: best.card.uid };

  // Some cards need immediate target info
  const targetInfo = getPlayTargetInfo(state, me, best.card);
  if (targetInfo) action.targetInfo = targetInfo;

  return action;
}

function scoreCard(state, me, card) {
  const opponents = getOpponents(state);

  switch (card.type) {
    case CARD_TYPE.CREATURE: {
      if (me.swamp.length >= 5) return 0; // swamp full
      const atk = card.attack || 0;
      const def = card.defence || 0;
      const sp = card.sp || 0;
      // Value creatures by their combat potential + SP value
      let score = (atk * 0.3 + def * 0.1 + sp * 0.2) / 100;
      // Bonus for creatures with abilities
      if (card.abilityId) score += 2;
      // High priority for taunt (Gamer Boy) if we have multiple creatures
      if (card.abilityId === 'gamer_boy_taunt' && me.swamp.length >= 1) score += 3;
      return Math.max(1, score);
    }

    case CARD_TYPE.MAGIC: {
      // Score magic based on current board state
      if (card.abilityId === 'smesh_damage') {
        return hasOpponentCreatures(opponents) ? 5 : 0;
      }
      if (card.abilityId === 'savage_destroy') {
        // Save for high-value targets
        const bestTarget = getBestOpponentCreature(opponents);
        return bestTarget ? 6 + (bestTarget.attack || 0) / 200 : 0;
      }
      if (card.abilityId === 'ooft_buff' || card.abilityId === 'thicc_buff') {
        return me.swamp.length > 0 ? 4 : 0;
      }
      if (card.abilityId === 'judgment_steal') {
        return me.sp === 1000 ? 10 : 0; // Only playable at exactly 1000 SP
      }
      if (card.abilityId === 'yeet_discard') {
        return hasOpponentWithCards(opponents) ? 4 : 0;
      }
      if (card.abilityId === 'finesse_steal') {
        return hasOpponentWithCards(opponents) ? 5 : 0;
      }
      if (card.abilityId === 'snacc_control') {
        return hasOpponentCreatures(opponents) ? 7 : 0;
      }
      if (card.abilityId === 'lerker_draw') {
        return me.hand.length < 6 ? 5 : 1;
      }
      if (card.abilityId === 'woke_peek') return 2;
      if (card.abilityId === 'ama_reveal') return 2;
      if (card.abilityId === 'stfu_silence') {
        // Silence creatures with abilities
        const abilityCreature = getOpponentCreatureWithAbility(opponents);
        return abilityCreature ? 6 : 0;
      }
      if (card.abilityId === 'lagg_delay') return 3;
      return 3; // Default magic score
    }

    case CARD_TYPE.ARMOUR: {
      // Check if slot is free
      if (card.slot && me.gear[card.slot]) return 1; // Lower priority if replacing
      // Set completion bonus
      const setCount = countArmourSet(me, card.set);
      if (setCount === 2) return 8; // Complete the set!
      return 3;
    }

    case CARD_TYPE.TRICKS: {
      if (card.abilityId === 'trick_sp') return 4;
      if (card.abilityId === 'horse_dice') return 3;
      return 3;
    }

    default:
      return 2;
  }
}

function getPlayTargetInfo(state, me, card) {
  const opponents = getOpponents(state);

  // Cards that need a creature target
  if (['smesh_damage', 'savage_destroy', 'ooft_buff', 'thicc_buff', 'stfu_silence'].includes(card.abilityId)) {
    if (['ooft_buff', 'thicc_buff'].includes(card.abilityId)) {
      // Target own creature
      const best = me.swamp.sort((a, b) => (b.attack || 0) - (a.attack || 0))[0];
      if (best) return { targetOwnerId: me.id, targetUid: best.uid };
    } else {
      // Target opponent creature
      const target = getBestOpponentCreature(opponents);
      if (target) return { targetOwnerId: target._ownerId, targetUid: target.uid };
    }
  }

  // Cards that need a player target
  if (['yeet_discard', 'finesse_steal', 'ama_reveal', 'lagg_delay', 'thief_steal', 'king_thief_steal'].includes(card.abilityId)) {
    const opp = pickBestOpponent(opponents);
    if (opp) return { targetOwnerId: opp.id };
  }

  // Snacc — target best opponent creature
  if (card.abilityId === 'snacc_control') {
    const target = getBestOpponentCreature(opponents);
    if (target) return { targetOwnerId: target._ownerId, targetUid: target.uid };
  }

  // Judgment — target opponent with most creatures
  if (card.abilityId === 'judgment_steal') {
    const opp = opponents.sort((a, b) => b.swamp.length - a.swamp.length)[0];
    if (opp) return { targetOwnerId: opp.id };
  }

  // Thot (instant kill) — target strongest opponent creature
  if (card.abilityId === 'thot_instakill') {
    const target = getBestOpponentCreature(opponents);
    if (target) return { targetOwnerId: target._ownerId, targetUid: target.uid };
  }

  // Zucc — steal best armour
  if (card.abilityId === 'zucc_steal') {
    for (const opp of opponents) {
      for (const slot of ['head', 'body', 'feet']) {
        if (opp.gear[slot]) return { targetOwnerId: opp.id, targetUid: opp.gear[slot].uid };
      }
    }
  }

  // Harambe — plant on opponent with fewest creatures
  if (card.abilityId === 'harambe_plant') {
    const opp = opponents
      .filter(o => o.swamp.length < 5)
      .sort((a, b) => a.swamp.length - b.swamp.length)[0];
    if (opp) return { targetOwnerId: opp.id };
  }

  return null; // No target needed or server will prompt
}

// --- Attack Logic ---

function pickAttack(state, me) {
  if (me.ap < 1) return null;
  const opponents = getOpponents(state);

  for (const creature of me.swamp) {
    if (creature._hasAttacked) continue;
    if (creature._harambeOwner) continue; // Don't attack with Harambe plants

    // Find best target
    for (const opp of opponents) {
      // Direct attack if opponent has no visible creatures
      const visibleCreatures = opp.swamp.filter(c => !c._invisible);
      if (visibleCreatures.length === 0) {
        const myAtk = (creature.attack || 0) + (creature._attackBuff || 0);
        if (myAtk > 0) {
          return {
            type: ACTION.ATTACK,
            attackerUid: creature.uid,
            defenderOwnerId: opp.id,
            defenderUid: opp.id, // target the player directly
          };
        }
        continue;
      }

      // Check for taunt
      const taunt = opp.swamp.find(c => c.abilityId === 'gamer_boy_taunt' && !c._silenced);
      const targets = taunt ? [taunt] : opp.swamp;

      // Pick weakest creature we can kill, or strongest we can damage
      const myAtk = (creature.attack || 0) + (creature._attackBuff || 0);
      const killable = targets
        .filter(t => {
          const hp = (t.defence || 0) - (t._defenceDamage || 0) + (t._defenceBuff || 0) + (t._tempShield || 0);
          return myAtk >= hp;
        })
        .sort((a, b) => (b.sp || 0) - (a.sp || 0)); // Kill highest SP creature

      if (killable.length > 0) {
        return {
          type: ACTION.ATTACK,
          attackerUid: creature.uid,
          defenderOwnerId: opp.id,
          defenderUid: killable[0].uid,
        };
      }

      // If we can't kill anything, attack the weakest to chip damage
      if (myAtk > 0) {
        const weakest = targets.sort((a, b) => {
          const hpA = (a.defence || 0) - (a._defenceDamage || 0);
          const hpB = (b.defence || 0) - (b._defenceDamage || 0);
          return hpA - hpB;
        })[0];
        if (weakest) {
          return {
            type: ACTION.ATTACK,
            attackerUid: creature.uid,
            defenderOwnerId: opp.id,
            defenderUid: weakest.uid,
          };
        }
      }
    }
  }

  return null;
}

// --- Activated Ability Logic ---

function pickAbility(state, me) {
  if (me.ap < 1) return null;

  for (const creature of me.swamp) {
    if (!creature.abilityId || creature._silenced) continue;
    if (!hasActivatedAbility(creature.abilityId)) continue;

    // Stoner shield — use if opponents have creatures that could attack
    if (creature.abilityId === 'stoner_shield') {
      const opponents = getOpponents(state);
      if (opponents.some(o => o.swamp.length > 0)) {
        return { type: ACTION.USE_ABILITY, cardUid: creature.uid };
      }
    }

    // Thief — always steal if opponent has SP
    if (creature.abilityId === 'thief_steal' || creature.abilityId === 'king_thief_steal') {
      const opponents = getOpponents(state);
      const rich = opponents.find(o => o.sp >= 200);
      if (rich) {
        return {
          type: ACTION.USE_ABILITY,
          cardUid: creature.uid,
          targetInfo: { targetOwnerId: rich.id },
        };
      }
    }
  }

  return null;
}

// --- Target Selection (when server asks) ---

function handleTargetSelection(state) {
  const pending = state.pendingTarget;
  const validTargets = pending.validTargets || [];
  const me = state.players[state.myId];

  if (pending.targetType === 'player') {
    // Pick opponent with most SP (best to steal from / disrupt)
    const opponents = getOpponents(state);
    const best = opponents.sort((a, b) => b.sp - a.sp)[0];
    if (best) return { type: ACTION.SELECT_TARGET, targetOwnerId: best.id };
    // Fallback
    if (validTargets.length > 0) {
      return { type: ACTION.SELECT_TARGET, targetOwnerId: validTargets[0].ownerId || validTargets[0].id };
    }
  }

  if (pending.maxTargets && pending.maxTargets > 1) {
    // Multi-target: pick up to maxTargets
    const targets = validTargets.slice(0, pending.maxTargets).map(t => ({
      targetOwnerId: t.ownerId,
      targetUid: t.uid,
    }));
    return { type: ACTION.SELECT_TARGET, targets };
  }

  // Single creature target — pick highest value
  if (validTargets.length > 0) {
    // For damage/destroy: target strongest opponent creature
    // For buffs: target own strongest creature
    const isOffensive = !validTargets.some(t => t.ownerId === state.myId);

    let best;
    if (isOffensive) {
      best = validTargets.sort((a, b) => (b.attack || b.sp || 0) - (a.attack || a.sp || 0))[0];
    } else {
      best = validTargets.sort((a, b) => (b.attack || 0) - (a.attack || 0))[0];
    }

    return {
      type: ACTION.SELECT_TARGET,
      targetOwnerId: best.ownerId,
      targetUid: best.uid,
    };
  }

  // Absolute fallback — end turn to avoid getting stuck
  return { type: ACTION.END_TURN };
}

// --- Card Choice (Dead Meme graveyard pick, Woke peek) ---

function handleCardChoice(state) {
  const pending = state.pendingChoice;
  const cards = pending.cards || [];

  if (cards.length === 0) return { type: ACTION.END_TURN };

  // Pick the best card: creatures > magic > tricks > armour, sorted by value
  const scored = cards.map(c => ({
    card: c,
    score: (c.type === CARD_TYPE.CREATURE ? 5 : c.type === CARD_TYPE.MAGIC ? 4 : 3)
      + ((c.attack || 0) + (c.sp || 0)) / 500,
  })).sort((a, b) => b.score - a.score);

  return { type: ACTION.CHOOSE_CARD, cardUid: scored[0].card.uid };
}

// --- Helpers ---

function getOpponents(state) {
  return Object.entries(state.players)
    .filter(([id]) => id !== state.myId)
    .map(([id, p]) => ({ ...p, id }));
}

function hasOpponentCreatures(opponents) {
  return opponents.some(o => o.swamp.length > 0);
}

function hasOpponentWithCards(opponents) {
  return opponents.some(o => (o.handCount || o.hand?.length || 0) > 0);
}

function getBestOpponentCreature(opponents) {
  let best = null;
  let bestScore = -1;
  for (const opp of opponents) {
    for (const c of opp.swamp) {
      const score = (c.attack || 0) + (c.sp || 0);
      if (score > bestScore) {
        bestScore = score;
        best = { ...c, _ownerId: opp.id };
      }
    }
  }
  return best;
}

function getOpponentCreatureWithAbility(opponents) {
  for (const opp of opponents) {
    for (const c of opp.swamp) {
      if (c.abilityId && !c._silenced) return { ...c, _ownerId: opp.id };
    }
  }
  return null;
}

function pickBestOpponent(opponents) {
  return opponents.sort((a, b) => b.sp - a.sp)[0] || null;
}

function countArmourSet(me, setName) {
  let count = 0;
  for (const slot of ['head', 'body', 'feet']) {
    if (me.gear[slot]?.set === setName) count++;
  }
  return count;
}
