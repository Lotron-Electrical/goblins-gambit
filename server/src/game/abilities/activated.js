/**
 * Activated ability handlers.
 * These are abilities that creatures can USE on-field (costing AP).
 * Triggered via the USE_ABILITY game action.
 */

import { getEffectiveStats, getOpponentCreatures, getOwnCreatures, getAllCreatures, getOpponentPlayers } from './helpers.js';
import { killCreature } from '../CombatResolver.js';

/**
 * Stoner Shield: spend 1 AP -> temp shield in front of all own creatures.
 * Shield absorbs the next attack on each creature.
 */
export function activate_stoner_shield(state, playerId, card, targetInfo) {
  const player = state.players[playerId];
  const events = [];

  if (player.ap < 1) return { success: false, error: 'Need 1 AP' };

  player.ap -= 1;
  for (const c of player.swamp) {
    c._stonerShield = true;
  }
  events.push({ type: 'ability_used', cardUid: card.uid, ability: 'stoner_shield', text: 'Shield activated!' });
  return { success: true, events };
}

/**
 * Thief Steal: spend 1 AP -> steal 200 SP from target player.
 */
export function activate_thief_steal(state, playerId, card, targetInfo) {
  const player = state.players[playerId];
  const events = [];

  if (player.ap < 1) return { success: false, error: 'Need 1 AP' };

  if (!targetInfo) {
    const validTargets = getOpponentPlayers(state, playerId);
    return {
      success: true, events, needsTarget: true,
      targetRequest: {
        playerId, action: 'thief_steal', cardUid: card.uid, validTargets,
        prompt: 'Choose a player to steal 200 SP from',
        targetType: 'player',
        abilityActivation: true,
      },
    };
  }

  player.ap -= 1;
  const { targetOwnerId } = targetInfo;
  const target = state.players[targetOwnerId];
  const stealAmount = Math.min(200, target.sp);
  target.sp -= stealAmount;
  player.sp += stealAmount;
  events.push({ type: 'sp_change', playerId, amount: stealAmount, reason: 'Thief steal' });
  events.push({ type: 'sp_change', playerId: targetOwnerId, amount: -stealAmount, reason: 'Thief steal' });
  events.push({ type: 'ability_used', cardUid: card.uid, ability: 'thief_steal' });
  return { success: true, events };
}

/**
 * King of Thieves: spend 2 AP -> steal 500 SP from target player.
 */
export function activate_king_thief_steal(state, playerId, card, targetInfo) {
  const player = state.players[playerId];
  const events = [];

  if (player.ap < 2) return { success: false, error: 'Need 2 AP' };

  if (!targetInfo) {
    const validTargets = getOpponentPlayers(state, playerId);
    return {
      success: true, events, needsTarget: true,
      targetRequest: {
        playerId, action: 'king_thief_steal', cardUid: card.uid, validTargets,
        prompt: 'Choose a player to steal 500 SP from',
        targetType: 'player',
        abilityActivation: true,
      },
    };
  }

  player.ap -= 2;
  const { targetOwnerId } = targetInfo;
  const target = state.players[targetOwnerId];
  const stealAmount = Math.min(500, target.sp);
  target.sp -= stealAmount;
  player.sp += stealAmount;
  events.push({ type: 'sp_change', playerId, amount: stealAmount, reason: 'King of Thieves steal' });
  events.push({ type: 'sp_change', playerId: targetOwnerId, amount: -stealAmount, reason: 'King of Thieves steal' });
  events.push({ type: 'ability_used', cardUid: card.uid, ability: 'king_thief_steal' });
  return { success: true, events };
}

/**
 * Troll Swap: spend 1 AP -> cycle target creature's stats ATK->DEF->SP->ATK.
 */
export function activate_troll_swap(state, playerId, card, targetInfo) {
  const player = state.players[playerId];
  const events = [];

  if (player.ap < 1) return { success: false, error: 'Need 1 AP' };

  if (!targetInfo) {
    const validTargets = getAllCreatures(state);
    return {
      success: true, events, needsTarget: true,
      targetRequest: {
        playerId, action: 'troll_swap', cardUid: card.uid, validTargets,
        prompt: 'Choose any creature to cycle stats (ATK->DEF->SP->ATK)',
      },
    };
  }

  player.ap -= 1;
  const { targetOwnerId, targetUid } = targetInfo;
  const targetCard = state.players[targetOwnerId]?.swamp.find(c => c.uid === targetUid);
  if (targetCard) {
    const oldAtk = targetCard.attack || 0;
    const oldDef = targetCard.defence || 0;
    const oldSp = targetCard.sp || 0;
    // Cycle: ATK->DEF, DEF->SP, SP->ATK
    targetCard.attack = oldSp;
    targetCard.defence = oldAtk;
    targetCard.sp = oldDef;
    // Reset damage/buffs since base stats changed
    delete targetCard._defenceDamage;
    delete targetCard._attackBuff;
    delete targetCard._defenceBuff;
    events.push({ type: 'ability_used', cardUid: card.uid, ability: 'troll_swap' });
    events.push({ type: 'buff', cardUid: targetUid, text: `Stats cycled! ATK:${targetCard.attack} DEF:${targetCard.defence} SP:${targetCard.sp}` });
  }
  return { success: true, events };
}

/**
 * Saving Grace: choose mode - 3 creatures for +100 ATK each, or 1 for +300.
 */
export function activate_saving_grace(state, playerId, card, targetInfo) {
  const player = state.players[playerId];
  const events = [];

  if (player.ap < 1) return { success: false, error: 'Need 1 AP' };

  if (!targetInfo) {
    const validTargets = getOwnCreatures(state, playerId);
    return {
      success: true, events, needsTarget: true,
      targetRequest: {
        playerId, action: 'saving_grace_multi', cardUid: card.uid, validTargets,
        prompt: 'Choose mode: select 1 creature for +300 ATK, or select up to 3 for +100 ATK each',
        mode: 'saving_grace',
        maxTargets: 3,
      },
    };
  }

  player.ap -= 1;
  const targets = targetInfo.targets || [targetInfo];
  if (targets.length === 1) {
    // Single target: +300 ATK
    const t = state.players[targets[0].targetOwnerId || playerId]?.swamp.find(c => c.uid === (targets[0].targetUid || targets[0].uid));
    if (t) {
      t._attackBuff = (t._attackBuff || 0) + 300;
      events.push({ type: 'buff', cardUid: t.uid, text: '+300 ATK (Saving Grace)' });
    }
  } else {
    // Multi target: +100 ATK each (up to 3)
    for (const tgt of targets.slice(0, 3)) {
      const t = state.players[tgt.targetOwnerId || playerId]?.swamp.find(c => c.uid === (tgt.targetUid || tgt.uid));
      if (t) {
        t._attackBuff = (t._attackBuff || 0) + 100;
        events.push({ type: 'buff', cardUid: t.uid, text: '+100 ATK (Saving Grace)' });
      }
    }
  }
  events.push({ type: 'ability_used', cardUid: card.uid, ability: 'saving_grace_multi' });
  return { success: true, events };
}

/**
 * Rhy Bear Split: choose mode - full 800 ATK on 1 target, or 400 on 2.
 * This is an activated attack ability.
 */
export function activate_rhy_bear_split(state, playerId, card, targetInfo) {
  const player = state.players[playerId];
  const events = [];

  if (player.ap < 1) return { success: false, error: 'Need 1 AP' };
  if (card._hasAttacked) return { success: false, error: 'Already attacked this turn' };

  if (!targetInfo) {
    const validTargets = getOpponentCreatures(state, playerId);
    if (validTargets.length === 0) return { success: false, error: 'No targets' };
    return {
      success: true, events, needsTarget: true,
      targetRequest: {
        playerId, action: 'rhy_bear_split', cardUid: card.uid, validTargets,
        prompt: 'Select 1 creature for 800 damage, or 2 for 400 each',
        mode: 'rhy_bear',
        maxTargets: 2,
      },
    };
  }

  player.ap -= 1;
  card._hasAttacked = true;

  const targets = targetInfo.targets || [targetInfo];
  const damagePerTarget = targets.length === 1 ? 800 : 400;

  for (const tgt of targets.slice(0, 2)) {
    const { targetOwnerId, targetUid } = tgt;
    const targetCard = state.players[targetOwnerId]?.swamp.find(c => c.uid === targetUid);
    if (targetCard) {
      targetCard._defenceDamage = (targetCard._defenceDamage || 0) + damagePerTarget;
      events.push({ type: 'damage', cardUid: targetUid, amount: damagePerTarget });
      const stats = getEffectiveStats(state, targetOwnerId, targetCard);
      if (stats.defence <= 0) {
        player.sp += stats.sp;
        events.push({ type: 'destroy', cardUid: targetUid, owner: targetOwnerId });
        events.push({ type: 'sp_change', playerId, amount: stats.sp });
        killCreature(state, targetOwnerId, targetUid);
      }
    }
  }
  events.push({ type: 'ability_used', cardUid: card.uid, ability: 'rhy_bear_split' });
  return { success: true, events };
}

/**
 * Crack Head Multi: attacks 2 creatures at 200 damage each.
 */
export function activate_crack_head_multi(state, playerId, card, targetInfo) {
  const player = state.players[playerId];
  const events = [];

  if (player.ap < 1) return { success: false, error: 'Need 1 AP' };
  if (card._hasAttacked) return { success: false, error: 'Already attacked this turn' };

  if (!targetInfo) {
    const validTargets = getOpponentCreatures(state, playerId);
    if (validTargets.length === 0) return { success: false, error: 'No targets' };
    return {
      success: true, events, needsTarget: true,
      targetRequest: {
        playerId, action: 'crack_head_multi', cardUid: card.uid, validTargets,
        prompt: 'Choose 2 creatures to deal 200 damage each',
        mode: 'multi_target',
        maxTargets: 2,
      },
    };
  }

  player.ap -= 1;
  card._hasAttacked = true;

  const targets = targetInfo.targets || [targetInfo];
  for (const tgt of targets.slice(0, 2)) {
    const { targetOwnerId, targetUid } = tgt;
    const targetCard = state.players[targetOwnerId]?.swamp.find(c => c.uid === targetUid);
    if (targetCard) {
      targetCard._defenceDamage = (targetCard._defenceDamage || 0) + 200;
      events.push({ type: 'damage', cardUid: targetUid, amount: 200 });
      const stats = getEffectiveStats(state, targetOwnerId, targetCard);
      if (stats.defence <= 0) {
        player.sp += stats.sp;
        events.push({ type: 'destroy', cardUid: targetUid, owner: targetOwnerId });
        events.push({ type: 'sp_change', playerId, amount: stats.sp });
        killCreature(state, targetOwnerId, targetUid);
      }
    }
  }
  events.push({ type: 'ability_used', cardUid: card.uid, ability: 'crack_head_multi' });
  return { success: true, events };
}
