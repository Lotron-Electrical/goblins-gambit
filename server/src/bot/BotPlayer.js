/**
 * AI Bot Player for Goblin's Gambit.
 * Evaluates game state and returns actions. Runs server-side.
 */

import { ACTION, CARD_TYPE, MAX_HAND_SIZE, THEME_EFFECTS } from '../../../shared/src/constants.js';
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
  'Nob the Dim',
  'Gutbucket',
  'Slimefingers',
  'Throatpunch',
  'Boggy Dave',
  'Toadlicker',
  'Gristle',
  'Mucksweat',
  'Scabpicker',
  'Wormguts',
  'Knuckledragger',
  'Snot Goblin',
  'Pus Bucket',
  'Grub Lord',
  'Bellyache',
  'Anklebiter',
  'Dregface',
  'Spit Roach',
  'Bog Snorkle',
  'Crudbrain',
];

export function createBotId() {
  return `bot_${nextBotId++}`;
}

const usedBotNames = new Set();

export function getBotName() {
  const available = BOT_NAMES.filter(n => !usedBotNames.has(n));
  const name = available.length > 0
    ? available[Math.floor(Math.random() * available.length)]
    : `Goblin #${nextBotId}`; // fallback if all names used
  usedBotNames.add(name);
  return name;
}

export function releaseBotName(name) {
  usedBotNames.delete(name);
}

/**
 * Given a game state from the bot's perspective, decide the next action.
 * Returns an action object or null if the bot should end its turn.
 */
export function decideBotAction(state, difficulty = 'medium') {
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

  // Easy: randomly skip good plays 40% of the time (plays dumber)
  const skip = difficulty === 'easy' ? () => Math.random() < 0.4 : () => false;

  // --- Decision priority ---

  // 0. Lethal detection — hard only
  if (difficulty === 'hard') {
    const lethalAction = checkLethal(state, me);
    if (lethalAction) return lethalAction;
  }

  // 1. Play high-value cards from hand
  if (!skip()) {
    const cardToPlay = pickCardToPlay(state, me);
    if (cardToPlay) return cardToPlay;
  }

  // 2. Attack with creatures on field (focus-fire coordination)
  const attackAction = pickAttack(state, me);
  if (attackAction) return attackAction;

  // 3. Use activated abilities — medium and hard only
  if (difficulty !== 'easy') {
    const abilityAction = pickAbility(state, me);
    if (abilityAction) return abilityAction;
  }

  // 4. Draw cards if hand is small and we have AP
  if (me.hand.length < 5 && me.ap >= 1) {
    return { type: ACTION.DRAW_CARD };
  }

  // 5. Buy AP if we have lots of SP and useful cards/attacks remaining — hard only
  if (difficulty === 'hard' && me.sp >= 2000 && me.ap <= 1) {
    // Buy AP more aggressively: if hand has playable cards or creatures can still attack
    const hasPlayable = me.hand.some(c => !c.hidden && c.cost <= 2);
    const hasUnattacked = me.swamp.some(c => !c._hasAttacked && !c._harambeOwner);
    if (hasPlayable || hasUnattacked) {
      return { type: ACTION.BUY_AP };
    }
  }

  // 6. Recycle a creature that's about to die (low HP, high defence value for shield)
  if (difficulty !== 'easy') {
    const recycleAction = pickRecycle(state, me);
    if (recycleAction) return recycleAction;
  }

  // 7. Event actions (Volcano deposit, Dragon attack, Jargon buy)
  const eventAction = pickEventAction(state, me, difficulty);
  if (eventAction) return eventAction;

  // 8. Draw if we still have AP
  if (me.hand.length < MAX_HAND_SIZE && me.ap >= 1) {
    return { type: ACTION.DRAW_CARD };
  }

  return { type: ACTION.END_TURN };
}

// --- Lethal Detection ---

function checkLethal(state, me) {
  if (me.ap < 1) return null;
  const opponents = getOpponents(state);

  for (const opp of opponents) {
    // Can only go face if opponent has no visible creatures
    const visibleCreatures = opp.swamp.filter(c => !c._invisible);
    if (visibleCreatures.length > 0) continue;

    // Calculate total available damage from creatures that haven't attacked
    let totalDamage = 0;
    const attackers = [];
    for (const creature of me.swamp) {
      if (creature._hasAttacked || creature._harambeOwner) continue;
      const atk = (creature.attack || 0) + (creature._attackBuff || 0);
      if (atk > 0) {
        totalDamage += atk;
        attackers.push(creature);
      }
    }

    // Check if total damage is enough to kill the opponent
    // (opponent loses when SP <= 0, direct attacks must burn through shield first)
    const effectiveSP = opp.sp + (opp.playerShield || 0);
    if (totalDamage >= effectiveSP && attackers.length > 0 && opp.sp > 0) {
      // Go all-in: return the first attack, subsequent calls will pick the rest
      return {
        type: ACTION.ATTACK,
        attackerUid: attackers[0].uid,
        defenderOwnerId: opp.id,
        defenderUid: opp.id,
      };
    }
  }

  return null;
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

/** Check if an opponent has Book Witch spell protection active */
function hasBookWitchProtection(opponent) {
  return opponent.swamp.some(c => c.abilityId === 'book_witch_shield' && !c._silenced);
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
      // King Goblin synergy: boost if Lesser Goblins are on field
      if (card.abilityId === 'king_goblin_buff') {
        const lesserCount = me.swamp.filter(c => c.id === 'lesser_goblin').length;
        score += lesserCount * 2;
      }
      // Lesser Goblin: boost if King Goblin is on field
      if (card.id === 'lesser_goblin' && me.swamp.some(c => c.id === 'king_goblin')) {
        score += 2;
      }
      // Grencle debuff: higher value with more enemy creatures
      if (card.abilityId === 'grencle_debuff') {
        const totalEnemyCreatures = opponents.reduce((sum, o) => sum + o.swamp.length, 0);
        score += totalEnemyCreatures * 1.5;
      }
      // Motherdazer: boost if we have adjacent slot neighbors
      if (card.abilityId === 'motherdazer_buff' && me.swamp.length >= 1) score += 2;
      // Book Witch: high value as spell protection
      if (card.abilityId === 'book_witch_shield') score += 3;
      // Karen: counter-kill trades, valuable against strong creatures
      if (card.abilityId === 'karen_counter') {
        const hasStrongEnemy = opponents.some(o => o.swamp.some(c => (c.attack || 0) >= 400));
        if (hasStrongEnemy) score += 3;
      }
      return Math.max(1, score);
    }

    case CARD_TYPE.MAGIC: {
      // Filter opponents without Book Witch protection for targeted spells
      const unprotectedOpponents = opponents.filter(o => !hasBookWitchProtection(o));

      // Score magic based on current board state
      if (card.abilityId === 'smesh_damage') {
        return hasOpponentCreatures(unprotectedOpponents) ? 5 : 0;
      }
      if (card.abilityId === 'savage_destroy') {
        const bestTarget = getBestOpponentCreature(unprotectedOpponents);
        return bestTarget ? 6 + (bestTarget.attack || 0) / 200 : 0;
      }
      if (card.abilityId === 'ooft_buff' || card.abilityId === 'thicc_buff') {
        return me.swamp.length > 0 ? 4 : 0; // Buffs target own creatures, not blocked
      }
      if (card.abilityId === 'judgment_steal') {
        return me.sp === 1000 && hasOpponentCreatures(unprotectedOpponents) ? 10 : 0;
      }
      if (card.abilityId === 'yeet_discard') {
        return hasOpponentWithCards(unprotectedOpponents) ? 4 : 0;
      }
      if (card.abilityId === 'finesse_steal') {
        return hasOpponentWithCards(unprotectedOpponents) ? 5 : 0;
      }
      if (card.abilityId === 'snacc_control') {
        return hasOpponentCreatures(unprotectedOpponents) ? 7 : 0;
      }
      if (card.abilityId === 'lerker_draw') {
        return me.hand.length < 6 ? 5 : 1;
      }
      if (card.abilityId === 'woke_peek') return 2;
      if (card.abilityId === 'ama_reveal') return 2;
      if (card.abilityId === 'stfu_silence') {
        const abilityCreature = getOpponentCreatureWithAbility(unprotectedOpponents);
        return abilityCreature ? 6 : 0;
      }
      if (card.abilityId === 'lagg_delay') {
        return unprotectedOpponents.length > 0 ? 3 : 0;
      }
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
  // For targeted magic, skip Book Witch-protected opponents
  const unprotected = card.type === CARD_TYPE.MAGIC
    ? opponents.filter(o => !hasBookWitchProtection(o))
    : opponents;

  // Cards that need a creature target
  if (['smesh_damage', 'savage_destroy', 'ooft_buff', 'thicc_buff', 'stfu_silence'].includes(card.abilityId)) {
    if (['ooft_buff', 'thicc_buff'].includes(card.abilityId)) {
      // Target own creature (not blocked by Book Witch)
      const best = [...me.swamp].sort((a, b) => (b.attack || 0) - (a.attack || 0))[0];
      if (best) return { targetOwnerId: me.id, targetUid: best.uid };
    } else {
      // Target opponent creature
      const target = getBestOpponentCreature(unprotected);
      if (target) return { targetOwnerId: target._ownerId, targetUid: target.uid };
    }
  }

  // Cards that need a player target
  if (['yeet_discard', 'finesse_steal', 'ama_reveal', 'lagg_delay', 'thief_steal', 'king_thief_steal'].includes(card.abilityId)) {
    const opp = pickBestOpponent(unprotected);
    if (opp) return { targetOwnerId: opp.id };
  }

  // Snacc — target best opponent creature
  if (card.abilityId === 'snacc_control') {
    const target = getBestOpponentCreature(unprotected);
    if (target) return { targetOwnerId: target._ownerId, targetUid: target.uid };
  }

  // Judgment — target opponent with most creatures
  if (card.abilityId === 'judgment_steal') {
    const opp = [...unprotected].sort((a, b) => b.swamp.length - a.swamp.length)[0];
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

  // Gather all available attackers, sorted by ATK descending (strongest first)
  const attackers = me.swamp
    .filter(c => !c._hasAttacked && !c._harambeOwner)
    .map(c => ({ card: c, atk: (c.attack || 0) + (c._attackBuff || 0) }))
    .filter(a => a.atk > 0)
    .sort((a, b) => b.atk - a.atk);

  if (attackers.length === 0) return null;

  // Build a damage-planning map to coordinate focus fire
  // Track planned damage per target uid across all attackers
  const plannedDamage = {}; // uid -> accumulated planned damage

  for (const { card: creature, atk } of attackers) {
    let bestAction = null;
    let bestScore = -Infinity;

    for (const opp of opponents) {
      // Direct attack if opponent has no visible creatures
      const visibleCreatures = opp.swamp.filter(c => !c._invisible);
      if (visibleCreatures.length === 0) {
        // Direct face attack — high priority
        const action = {
          type: ACTION.ATTACK,
          attackerUid: creature.uid,
          defenderOwnerId: opp.id,
          defenderUid: opp.id,
        };
        // Score: prefer face if opponent SP is low
        const score = 10000 + atk;
        if (score > bestScore) { bestScore = score; bestAction = action; }
        continue;
      }

      // Check for taunt
      const taunt = opp.swamp.find(c => c.abilityId === 'gamer_boy_taunt' && !c._silenced);
      const targets = taunt ? [taunt] : opp.swamp;

      for (const t of targets) {
        const hp = effectiveHP(t, state.theme);
        const remainingHP = hp - (plannedDamage[t.uid] || 0);

        // Score targets: prefer those closest to death (accounting for planned damage)
        let score = 0;
        if (atk >= remainingHP && remainingHP > 0) {
          // We can finish this target off — high value, prefer high-SP kills
          score = 5000 + (t.sp || 0);
        } else if (remainingHP <= 0) {
          // Already planned to die — don't waste damage, low score
          score = -1000;
        } else {
          // Can't kill yet — prefer targets closest to death (lowest remainingHP)
          score = 1000 - remainingHP + (t.sp || 0) * 0.1;
        }

        if (score > bestScore) {
          bestScore = score;
          bestAction = {
            type: ACTION.ATTACK,
            attackerUid: creature.uid,
            defenderOwnerId: opp.id,
            defenderUid: t.uid,
            _targetUid: t.uid, // internal tracking
          };
        }
      }
    }

    if (bestAction) {
      // Record planned damage for focus-fire coordination
      if (bestAction._targetUid) {
        plannedDamage[bestAction._targetUid] = (plannedDamage[bestAction._targetUid] || 0) + atk;
      }
      // Return the first attacker's action (bot processes one action at a time)
      // Clean up internal tracking field
      delete bestAction._targetUid;
      return bestAction;
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

    const opponents = getOpponents(state);

    // Stoner shield — use if opponents have creatures that could attack
    if (creature.abilityId === 'stoner_shield') {
      if (opponents.some(o => o.swamp.length > 0)) {
        return { type: ACTION.USE_ABILITY, cardUid: creature.uid };
      }
    }

    // Thief — always steal if opponent has SP
    if (creature.abilityId === 'thief_steal' || creature.abilityId === 'king_thief_steal') {
      const rich = opponents.find(o => o.sp >= 200);
      if (rich) {
        return {
          type: ACTION.USE_ABILITY,
          cardUid: creature.uid,
          targetInfo: { targetOwnerId: rich.id },
        };
      }
    }

    // Troll Swap — cycle stats on opponent creature where swapping weakens it
    // (target their highest-ATK creature so ATK gets moved to DEF)
    if (creature.abilityId === 'troll_swap') {
      let bestTarget = null;
      let bestAtk = 0;
      for (const opp of opponents) {
        for (const t of opp.swamp) {
          const atk = (t.attack || 0) + (t._attackBuff || 0);
          if (atk > bestAtk) {
            bestAtk = atk;
            bestTarget = { ownerId: opp.id, uid: t.uid, atk, sp: t.sp || 0 };
          }
        }
      }
      // Only swap if it meaningfully weakens (ATK > SP, so cycling ATK->DEF->SP->ATK reduces ATK)
      if (bestTarget && bestTarget.atk > bestTarget.sp) {
        return {
          type: ACTION.USE_ABILITY,
          cardUid: creature.uid,
          targetInfo: { targetOwnerId: bestTarget.ownerId, targetUid: bestTarget.uid },
        };
      }
    }

    // Saving Grace — +300 ATK to 1 creature or +100 ATK to up to 3
    if (creature.abilityId === 'saving_grace_multi') {
      const ownCreatures = me.swamp.filter(c => c.uid !== creature.uid || me.swamp.length === 1);
      if (ownCreatures.length >= 3) {
        // Multi-mode: buff 3 creatures with +100 each
        const targets = [...ownCreatures]
          .sort((a, b) => ((b.attack || 0) + (b._attackBuff || 0)) - ((a.attack || 0) + (a._attackBuff || 0)))
          .slice(0, 3)
          .map(c => ({ targetOwnerId: me.id, targetUid: c.uid }));
        return {
          type: ACTION.USE_ABILITY,
          cardUid: creature.uid,
          targetInfo: { targets },
        };
      } else if (ownCreatures.length > 0) {
        // Single-mode: +300 to strongest creature
        const strongest = [...ownCreatures].sort((a, b) =>
          ((b.attack || 0) + (b._attackBuff || 0)) - ((a.attack || 0) + (a._attackBuff || 0))
        )[0];
        return {
          type: ACTION.USE_ABILITY,
          cardUid: creature.uid,
          targetInfo: { targets: [{ targetOwnerId: me.id, targetUid: strongest.uid }] },
        };
      }
    }

    // Rhy Bear Split — 800 to 1 or 400 to 2
    if (creature.abilityId === 'rhy_bear_split' && !creature._hasAttacked) {
      const allTargets = [];
      for (const opp of opponents) {
        for (const t of opp.swamp) {
          allTargets.push({ ...t, _ownerId: opp.id, _hp: effectiveHP(t, state.theme) });
        }
      }
      if (allTargets.length === 0) continue;

      // Check if 2 targets each have <= 400 effective HP (killable with split)
      const splittable = allTargets.filter(t => t._hp <= 400);
      if (splittable.length >= 2 && allTargets.length >= 2) {
        // Split attack — kill 2 creatures
        const picks = splittable
          .sort((a, b) => (b.sp || 0) - (a.sp || 0))
          .slice(0, 2);
        return {
          type: ACTION.USE_ABILITY,
          cardUid: creature.uid,
          targetInfo: {
            targets: picks.map(p => ({ targetOwnerId: p._ownerId, targetUid: p.uid })),
          },
        };
      } else {
        // Focus 800 on highest-value target
        const best = allTargets.sort((a, b) => {
          // Prefer killable (hp <= 800), then highest SP
          const aKill = a._hp <= 800 ? 1 : 0;
          const bKill = b._hp <= 800 ? 1 : 0;
          if (bKill !== aKill) return bKill - aKill;
          return (b.sp || 0) - (a.sp || 0);
        })[0];
        return {
          type: ACTION.USE_ABILITY,
          cardUid: creature.uid,
          targetInfo: {
            targets: [{ targetOwnerId: best._ownerId, targetUid: best.uid }],
          },
        };
      }
    }

    // Crack Head Multi — 200 damage to 2 creatures
    if (creature.abilityId === 'crack_head_multi' && !creature._hasAttacked) {
      const allTargets = [];
      for (const opp of opponents) {
        for (const t of opp.swamp) {
          allTargets.push({ ...t, _ownerId: opp.id, _hp: effectiveHP(t, state.theme) });
        }
      }
      if (allTargets.length === 0) continue;

      // Prefer targets with <= 200 HP (killable)
      const sorted = allTargets.sort((a, b) => {
        const aKill = a._hp <= 200 ? 1 : 0;
        const bKill = b._hp <= 200 ? 1 : 0;
        if (bKill !== aKill) return bKill - aKill;
        return (b.sp || 0) - (a.sp || 0);
      });

      const picks = sorted.slice(0, 2);
      return {
        type: ACTION.USE_ABILITY,
        cardUid: creature.uid,
        targetInfo: {
          targets: picks.map(p => ({ targetOwnerId: p._ownerId, targetUid: p.uid })),
        },
      };
    }
  }

  return null;
}

// --- Recycle Logic ---

function pickRecycle(state, me) {
  // Consider recycling creatures that are nearly dead but still have decent defence for shield
  for (const creature of me.swamp) {
    if (creature._harambeOwner) continue; // Don't recycle opponent's Harambe
    const hp = effectiveHP(creature, state.theme);
    const sp = creature.sp || 0;
    const spCost = Math.ceil(sp / 2);
    // Only recycle if: creature is close to death (HP <= 200), has meaningful defence left,
    // and we can afford the SP cost
    if (hp <= 200 && hp > 0 && me.sp >= spCost && spCost > 0) {
      return { type: ACTION.RECYCLE_CREATURE, cardUid: creature.uid };
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
    const best = [...opponents].sort((a, b) => b.sp - a.sp)[0];
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
      best = [...validTargets].sort((a, b) => (b.attack || b.sp || 0) - (a.attack || a.sp || 0))[0];
    } else {
      best = [...validTargets].sort((a, b) => (b.attack || 0) - (a.attack || 0))[0];
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

// --- Event Actions ---

function pickEventAction(state, me, difficulty) {
  if (!state.eventsEnabled) return null;

  // Dragon attack: prioritize if bot dealt most damage (wants the kill credit)
  if (state.dragon?.active && me.ap >= 1) {
    const myDamage = state.dragon.damageByPlayer?.[state.myId] || 0;
    const maxOtherDamage = Math.max(0, ...Object.entries(state.dragon.damageByPlayer || {})
      .filter(([id]) => id !== state.myId)
      .map(([, d]) => d));

    // Attack if: we're the top damage dealer, or dragon HP is low, or we have strong creatures
    const shouldAttack = myDamage >= maxOtherDamage || state.dragon.currentHP <= 1000;

    if (shouldAttack) {
      const attacker = me.swamp
        .filter(c => !c._hasAttacked && !c._harambeOwner)
        .sort((a, b) => ((b.attack || 0) + (b._attackBuff || 0)) - ((a.attack || 0) + (a._attackBuff || 0)))[0];
      if (attacker) {
        return { type: ACTION.ATTACK_EVENT, attackerUid: attacker.uid };
      }
    }
  }

  // Volcano deposit: deposit when we have > 3000 SP and it's safe
  if (state.volcano?.active && !state.dragon?.active && me.sp > 3000 && me.ap >= 1) {
    // Deposit 20-40% of SP
    const pct = 0.2 + Math.random() * 0.2;
    const amount = Math.floor(me.sp * pct);
    if (amount >= 500) {
      return { type: ACTION.DEPOSIT_VOLCANO, amount };
    }
  }

  // Jargon buy: buy if affordable and hand isn't full
  if (state.jargon?.active && me.sp > 1500 && me.hand.length < 7 && state.graveyardCount > 0) {
    // Estimate cost (graveyard avg cost ~1.5 * 100 = 150 SP)
    return { type: ACTION.BUY_FROM_JARGON };
  }

  return null;
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
      if (c._invisible) continue; // Can't target invisible creatures
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
      if (c.abilityId && !c._silenced && !c._invisible) return { ...c, _ownerId: opp.id };
    }
  }
  return null;
}

function pickBestOpponent(opponents) {
  return [...opponents].sort((a, b) => b.sp - a.sp)[0] || null;
}

function effectiveHP(t, theme) {
  let def = (t.defence || 0) - (t._defenceDamage || 0) + (t._defenceBuff || 0) + (t._tempShield || 0);
  const themeEffects = theme ? THEME_EFFECTS[theme] : null;
  if (themeEffects?.defMultiplier && themeEffects.defMultiplier !== 1) {
    def = Math.floor(def * themeEffects.defMultiplier);
  }
  return def;
}

function countArmourSet(me, setName) {
  let count = 0;
  for (const slot of ['head', 'body', 'feet']) {
    if (me.gear[slot]?.set === setName) count++;
  }
  return count;
}
