import {
  createGameState,
  getCurrentPlayer,
  getCurrentPlayerId,
  drawCardRaw,
  getClientState,
} from './GameState.js';
import { resolvePlayCard, getEffectiveStats } from './EffectResolver.js';
import { getNextFreeSlot } from './abilities/helpers.js';
import { resolveAttack, killCreature } from './CombatResolver.js';
import { isLastPlace } from './abilities/helpers.js';
import { activatedRegistry, hasActivatedAbility } from './abilities/index.js';
import { cursed_set_bonus } from './abilities/armour.js';
import {
  BASE_AP,
  MAX_HAND_SIZE,
  BUY_AP_COST,
  GAME_PHASE,
  TURN_PHASE,
  ACTION,
  THEME_EFFECTS,
} from '../../../shared/src/constants.js';

function getEncumbranceAP(handSize, baseAP = BASE_AP) {
  if (handSize === 0) return Math.max(baseAP, 4);
  if (handSize === 1) return Math.max(baseAP, 3);
  if (handSize >= 10) return 7;
  if (handSize >= 8) return 1;
  return baseAP;
}

export class GameEngine {
  constructor(playerIds, playerNames, winSP, theme, settings = {}) {
    this.state = createGameState(playerIds, playerNames, settings);
    if (winSP) this.state.winSP = winSP;
    this.state.theme = theme || 'swamp';
    this.actionLog = [];
  }

  getStateForPlayer(playerId) {
    return getClientState(this.state, playerId);
  }

  getCurrentPlayerId() {
    return getCurrentPlayerId(this.state);
  }

  /** Process a player action. Returns { success, events, error, gameOver } */
  handleAction(playerId, action) {
    const state = this.state;
    state.animations = [];

    if (state.phase !== GAME_PHASE.PLAYING) {
      return { success: false, error: 'Game is not in progress' };
    }

    // Handle target selection (can come from non-active player for reactions)
    if (action.type === ACTION.SELECT_TARGET && state.pendingTarget) {
      return this.handleTargetSelection(playerId, action);
    }

    // Handle card choice (Dead Meme graveyard pick, Woke deck peek)
    if (action.type === ACTION.CHOOSE_CARD && state.pendingChoice) {
      return this.handleCardChoice(playerId, action);
    }

    // Block actions while another player has a pending choice (e.g. Dead Meme)
    if (state.pendingChoice && state.pendingChoice.playerId !== playerId && action.type !== ACTION.CHOOSE_CARD) {
      return { success: false, error: 'Waiting for another player to choose' };
    }

    // Reaction cards can be played on any player's turn
    const REACTION_ABILITIES = ['stfu_silence', 'lagg_delay'];
    if (action.type === ACTION.PLAY_CARD && playerId !== this.getCurrentPlayerId()) {
      const reactPlayer = state.players[playerId];
      const reactCard = reactPlayer?.hand.find(c => c.uid === action.cardUid);
      if (reactCard && REACTION_ABILITIES.includes(reactCard.abilityId)) {
        return this.handlePlayCard(reactPlayer, playerId, action);
      }
      return { success: false, error: 'Not your turn' };
    }

    // All other actions must be from current player
    if (playerId !== this.getCurrentPlayerId()) {
      return { success: false, error: 'Not your turn' };
    }

    const player = getCurrentPlayer(state);

    switch (action.type) {
      case ACTION.DRAW_CARD:
        return this.handleDrawCard(player, playerId);

      case ACTION.PLAY_CARD:
        return this.handlePlayCard(player, playerId, action);

      case ACTION.ATTACK:
        return this.handleAttack(player, playerId, action);

      case ACTION.END_TURN:
        return this.handleEndTurn(player, playerId);

      case ACTION.BUY_AP:
        return this.handleBuyAP(player, playerId);

      case ACTION.USE_ABILITY:
        return this.handleUseAbility(player, playerId, action);

      default:
        return { success: false, error: 'Unknown action' };
    }
  }

  handleDrawCard(player, playerId) {
    if (player.ap < 1) {
      return { success: false, error: 'Need 1 AP to draw' };
    }

    if (player.hand.length >= MAX_HAND_SIZE) {
      return { success: false, error: 'Hand is full' };
    }

    player.ap -= 1;
    const card = drawCardRaw(this.state, playerId);
    if (!card) return { success: false, error: 'No cards to draw' };

    const events = [{ type: 'draw_card', playerId, count: 1 }];

    // Nerd/Nerdet draw buffs
    for (const c of player.swamp) {
      if (c._silenced) continue;
      if (c.abilityId === 'nerd_draw_buff') {
        c._attackBuff = (c._attackBuff || 0) + 100;
        events.push({ type: 'buff', cardUid: c.uid, text: 'Nerd +100 ATK' });
      }
      if (c.abilityId === 'nerdet_draw_buff') {
        c._defenceBuff = (c._defenceBuff || 0) + 100;
        events.push({ type: 'buff', cardUid: c.uid, text: 'Nerdet +100 DEF' });
      }
    }

    this.logAction(playerId, 'draw', { cardId: card.id });
    this.state.animations.push(...events);
    return this.checkWin({ success: true, events });
  }

  handlePlayCard(player, playerId, action) {
    const { cardUid, targetInfo } = action;
    const result = resolvePlayCard(this.state, playerId, cardUid, targetInfo);

    if (!result.success && !result.needsTarget) {
      return result;
    }

    if (result.needsTarget) {
      this.state.pendingTarget = result.targetRequest;
      this.state.turnPhase = TURN_PHASE.TARGETING;
      this.state.animations.push(...(result.events || []));
      return { success: true, events: result.events, needsTarget: true };
    }

    this.logAction(playerId, 'play', { cardUid });
    this.state.animations.push(...(result.events || []));
    return this.checkWin({ success: true, events: result.events });
  }

  handleAttack(player, playerId, action) {
    const { attackerUid, defenderOwnerId, defenderUid } = action;

    if (player.ap < 1) {
      return { success: false, error: 'Need 1 AP to attack' };
    }

    const attackerCard = player.swamp.find(c => c.uid === attackerUid);
    if (!attackerCard) return { success: false, error: 'Attacker not on field' };

    if (attackerCard._hasAttacked) {
      return { success: false, error: 'This creature already attacked this turn' };
    }

    const defenderPlayer = this.state.players[defenderOwnerId];
    if (!defenderPlayer) return { success: false, error: 'Invalid target player' };

    // --- Direct player attack (defenderUid matches the player ID) ---
    if (defenderUid === defenderOwnerId) {
      // Can only attack a player directly if they have no creatures
      const visibleCreatures = defenderPlayer.swamp.filter(c => !c._invisible);
      if (visibleCreatures.length > 0) {
        return { success: false, error: 'Cannot attack player directly while they have creatures' };
      }

      // Ghost reveal on attack
      if (attackerCard._invisible) {
        attackerCard._invisible = false;
      }

      player.ap -= 1;
      attackerCard._hasAttacked = true;

      const aStats = getEffectiveStats(this.state, playerId, attackerCard);
      const events = [];
      let damage = aStats.attack;

      // Berserk: last-place player deals double damage (Blood Moon)
      const themeEffects = THEME_EFFECTS[this.state.theme];
      if (themeEffects?.berserkMultiplier > 1 && isLastPlace(this.state, playerId)) {
        damage = Math.floor(damage * themeEffects.berserkMultiplier);
      }

      events.push({
        type: 'attack',
        attacker: attackerUid,
        defender: defenderOwnerId,
        attackerOwner: playerId,
        defenderOwner: defenderOwnerId,
        directAttack: true,
      });

      // Shield absorbs damage first
      if (defenderPlayer.playerShield > 0) {
        const shieldDmg = Math.min(defenderPlayer.playerShield, damage);
        defenderPlayer.playerShield -= shieldDmg;
        damage -= shieldDmg;
        events.push({ type: 'buff', cardUid: defenderOwnerId, text: `Shield absorbed ${shieldDmg} damage! (${defenderPlayer.playerShield} remaining)` });
      }

      // Remaining damage hits SP
      if (damage > 0) {
        defenderPlayer.sp = Math.max(0, defenderPlayer.sp - damage);
        events.push({ type: 'sp_change', playerId: defenderOwnerId, amount: -damage, reason: 'Direct attack' });

        // Attacker gains half the damage dealt as SP
        const spGain = Math.floor(damage / 2);
        if (spGain > 0) {
          player.sp += spGain;
          events.push({ type: 'sp_change', playerId, amount: spGain, reason: 'Direct attack bonus' });
        }
      }

      this.logAction(playerId, 'attack', { attackerUid, defenderOwnerId, directAttack: true });
      this.state.animations.push(...events);
      return this.checkWin({ success: true, events });
    }

    // --- Normal creature attack ---
    const defenderCard = defenderPlayer.swamp.find(c => c.uid === defenderUid);
    if (!defenderCard) return { success: false, error: 'Defender not on field' };

    // Ghost: invisible creatures can't be targeted
    if (defenderCard._invisible) {
      return { success: false, error: 'Cannot attack an invisible creature' };
    }

    const hasTaunt = defenderPlayer.swamp.find(c => c.abilityId === 'gamer_boy_taunt' && !c._silenced);
    if (hasTaunt && defenderUid !== hasTaunt.uid) {
      return { success: false, error: 'Must attack Gamer Boy first (taunt)' };
    }

    // Ghost reveal on attack
    if (attackerCard._invisible) {
      attackerCard._invisible = false;
    }

    player.ap -= 1;
    attackerCard._hasAttacked = true;

    const result = resolveAttack(this.state, playerId, attackerUid, defenderOwnerId, defenderUid);

    if (result.error) return { success: false, error: result.error };

    // Check for Dead Meme on-death trigger
    if (result.deadMemeTriggered) {
      this.state.pendingChoice = result.deadMemeChoice;
      this.state.turnPhase = TURN_PHASE.CHOOSE_CARD;

      // Safety timeout: auto-pick first card after 20s to prevent permanent softlock
      this._pendingChoiceTimeout = setTimeout(() => {
        if (this.state.pendingChoice?.type === 'dead_meme') {
          const cards = this.state.pendingChoice.cards;
          if (cards.length > 0) {
            this.handleCardChoice(this.state.pendingChoice.playerId, { cardUid: cards[0].uid });
          } else {
            this.state.pendingChoice = null;
            this.state.turnPhase = TURN_PHASE.MAIN;
          }
          this.state.animations.push({ type: 'buff', text: 'Dead Meme choice timed out — auto-picked' });
          if (this._onPendingChoiceTimeout) this._onPendingChoiceTimeout();
        }
      }, 20000);
    }

    this.logAction(playerId, 'attack', { attackerUid, defenderUid, defenderOwnerId });
    this.state.animations.push(...(result.events || []));
    return this.checkWin({ success: true, events: result.events });
  }

  handleEndTurn(player, playerId) {
    const events = [];

    // Clean up turn-specific state
    for (const c of player.swamp) {
      delete c._hasAttacked;
      // Remove silence at end of turn
      delete c._silenced;
      // Remove stoner shield at end of turn
      delete c._stonerShield;
    }

    // Return Snacc-controlled creatures
    const snaccReturns = player.swamp.filter(c => c._snaccReturn);
    for (const creature of snaccReturns) {
      const idx = player.swamp.findIndex(c => c.uid === creature.uid);
      if (idx !== -1) {
        player.swamp.splice(idx, 1);
        const origOwnerId = creature._originalOwner;
        const origOwner = this.state.players[origOwnerId];
        if (origOwner && origOwner.swamp.length < 5) {
          delete creature._snaccReturn;
          delete creature._controller;
          delete creature._originalOwner;
          delete creature._hasAttacked;
          creature._slot = getNextFreeSlot(origOwner);
          origOwner.swamp.push(creature);
          events.push({ type: 'card_moved', cardUid: creature.uid, from: playerId, to: origOwnerId, reason: 'Snacc returned' });
        } else {
          killCreature(this.state, playerId, creature.uid);
          events.push({ type: 'destroy', cardUid: creature.uid, owner: playerId, reason: 'No room to return' });
        }
      }
    }

    // Harambe round countdown — check ALL players' swamps
    for (const [pid, p] of Object.entries(this.state.players)) {
      const harambes = p.swamp.filter(c => c.abilityId === 'harambe_plant' && c._roundsRemaining !== undefined);
      for (const h of harambes) {
        if (h._roundsRemaining <= 0) {
          // Harambe dies, owner gets SP
          const stats = getEffectiveStats(this.state, pid, h);
          const harambeOwner = this.state.players[h._harambeOwner];
          if (harambeOwner) {
            harambeOwner.sp += stats.sp;
            events.push({ type: 'sp_change', playerId: h._harambeOwner, amount: stats.sp, reason: 'Harambe expired' });
          }
          events.push({ type: 'destroy', cardUid: h.uid, owner: pid, reason: 'Harambe expired' });
          killCreature(this.state, pid, h.uid);
        } else {
          h._roundsRemaining--;
        }
      }
    }

    // Crystal armour income (only if player has at least 1 creature)
    if (player.swamp.length > 0) {
      for (const slot of ['head', 'body', 'feet']) {
        const armour = player.gear[slot];
        if (armour?.abilityId === 'crystal_income') {
          player.sp += armour.incomeAmount;
          events.push({ type: 'sp_change', playerId, amount: armour.incomeAmount, reason: armour.name });
        }
      }
    }

    // Swapeewee toggle
    for (const c of player.swamp) {
      if (c.abilityId === 'swapeewee_swap' && !c._silenced) {
        c._swapped = !c._swapped;
        events.push({ type: 'buff', cardUid: c.uid, text: 'Stats swapped!' });
      }
    }

    // Digital Artist +100 temp shield (creature DEF) + 100 player shield
    for (const c of player.swamp) {
      if (c.abilityId === 'digital_artist_shield' && !c._silenced) {
        c._tempShield = (c._tempShield || 0) + 100;
        player.playerShield += 100;
        events.push({ type: 'buff', cardUid: c.uid, text: '+100 shield' });
      }
    }

    // Clear AMA reveals at end of turn
    if (this.state._revealedHands?.[playerId]) {
      delete this.state._revealedHands[playerId];
    }

    // Armour durability countdown — only for the current player (expires per round, not per turn)
    for (const slot of ['head', 'body', 'feet']) {
      const armour = player.gear[slot];
      if (!armour || armour._turnsRemaining === undefined) continue;
      // Skip degradation on the turn armour was played
      if (armour._justEquipped) { delete armour._justEquipped; continue; }
      armour._turnsRemaining--;
      if (armour._turnsRemaining <= 0) {
        // Remove Lucky shield contribution when armour expires
        if (armour.abilityId === 'lucky_shield') {
          player.playerShield = Math.max(0, player.playerShield - (armour.shieldAmount || 0));
          // Check if Lucky set bonus was active (all 3 pieces) — remove 500 bonus
          const luckyBefore = ['head', 'body', 'feet'].filter(s => player.gear[s]?.abilityId === 'lucky_shield').length;
          if (luckyBefore === 3) {
            player.playerShield = Math.max(0, player.playerShield - 500);
          }
        }
        events.push({ type: 'destroy', cardUid: armour.uid, owner: playerId, reason: `${armour.name} expired` });
        this.state.graveyard.push(armour);
        player.gear[slot] = null;
      }
    }

    // Advance to next player
    this.state.currentTurnIndex = (this.state.currentTurnIndex + 1) % this.state.turnOrder.length;
    this.state.turnNumber++;
    this.state.turnPhase = TURN_PHASE.MAIN;
    this.state.pendingTarget = null;
    // Only clear pendingChoice if it belongs to the player ending their turn
    if (this.state.pendingChoice?.playerId === playerId) {
      this.state.pendingChoice = null;
    }

    // Set up next player's turn
    const nextPlayer = getCurrentPlayer(this.state);
    const nextPlayerId = this.getCurrentPlayerId();
    const apPenalty = nextPlayer.apPenalty || 0;
    nextPlayer.ap = Math.max(0, getEncumbranceAP(nextPlayer.hand.length, this.state.baseAP) - apPenalty);
    nextPlayer.apPenalty = 0;

    // Theme AP penalty (e.g. Frost: -1 AP per turn, minimum 1)
    const themeAP = THEME_EFFECTS[this.state.theme];
    if (themeAP?.apPenalty) {
      nextPlayer.ap = Math.max(1, nextPlayer.ap - themeAP.apPenalty);
    }

    // Hessian set bonus: extra AP
    const hessianCount = ['head', 'body', 'feet'].filter(s => nextPlayer.gear[s]?.set === 'hessian').length;
    if (hessianCount >= 2) nextPlayer.ap = Math.max(nextPlayer.ap, hessianCount);

    // Clear silence on next player's creatures (they lasted 1 turn)
    for (const c of nextPlayer.swamp) {
      delete c._silenced;
    }

    events.push({ type: 'turn_start', playerId: nextPlayerId, turnNumber: this.state.turnNumber });

    // Skip turns for Lagg-affected or disconnected players (loop handles cascades)
    let safetyLimit = this.state.turnOrder.length;
    while (safetyLimit-- > 0) {
      const cur = getCurrentPlayer(this.state);
      const curId = this.getCurrentPlayerId();
      const skipLagg = cur._drawSkip && cur._drawSkip > 0;
      const skipDisconnected = cur.connected === false;
      if (!skipLagg && !skipDisconnected) break;

      if (skipLagg) cur._drawSkip--;
      cur.ap = 0;
      const reason = skipLagg ? 'Lagg!' : 'Disconnected';
      events.push({ type: 'turn_skipped', playerId: curId, reason });

      this.state.currentTurnIndex = (this.state.currentTurnIndex + 1) % this.state.turnOrder.length;
      this.state.turnNumber++;
      const np = getCurrentPlayer(this.state);
      const npId = this.getCurrentPlayerId();
      const apPen = np.apPenalty || 0;
      np.ap = Math.max(0, getEncumbranceAP(np.hand.length, this.state.baseAP) - apPen);
      np.apPenalty = 0;
      // Theme AP penalty
      if (themeAP?.apPenalty) {
        np.ap = Math.max(1, np.ap - themeAP.apPenalty);
      }
      for (const c of np.swamp) { delete c._silenced; }
      events.push({ type: 'turn_start', playerId: npId, turnNumber: this.state.turnNumber });
    }

    this.logAction(playerId, 'end_turn', {});
    this.state.animations.push(...events);
    return this.checkWin({ success: true, events });
  }

  handleBuyAP(player, playerId) {
    let cost = BUY_AP_COST;
    for (const slot of ['head', 'body', 'feet']) {
      const armour = player.gear[slot];
      if (armour?.abilityId === 'hessian_discount') {
        cost -= armour.discountAmount;
      }
    }
    cost = Math.max(0, cost);

    if (player.sp < cost) {
      return { success: false, error: `Need ${cost} SP to buy AP (have ${player.sp})` };
    }

    player.sp -= cost;
    player.ap += 1;

    const events = [
      { type: 'sp_change', playerId, amount: -cost, reason: 'Buy AP' },
      { type: 'buff', text: `+1 AP (cost ${cost} SP)` },
    ];

    this.logAction(playerId, 'buy_ap', { cost });
    this.state.animations.push(...events);
    return { success: true, events };
  }

  handleUseAbility(player, playerId, action) {
    const { cardUid, targetInfo } = action;
    const card = player.swamp.find(c => c.uid === cardUid);
    if (!card) return { success: false, error: 'Creature not on field' };
    if (card._silenced) {
      // STFU penalty: still costs 1 AP when trying to use a silenced ability
      if (player.ap >= 1) player.ap -= 1;
      return { success: false, error: 'Creature is silenced! (1 AP wasted)' };
    }

    const handler = activatedRegistry[card.abilityId];
    if (!handler) return { success: false, error: 'This creature has no activated ability' };

    const result = handler(this.state, playerId, card, targetInfo);

    if (result.needsTarget) {
      this.state.pendingTarget = result.targetRequest;
      this.state.pendingTarget.abilityActivation = true;
      this.state.turnPhase = TURN_PHASE.TARGETING;
      this.state.animations.push(...(result.events || []));
      return { success: true, events: result.events, needsTarget: true };
    }

    if (!result.success) return result;

    this.logAction(playerId, 'ability', { cardUid, ability: card.abilityId });
    this.state.animations.push(...(result.events || []));
    return this.checkWin({ success: true, events: result.events });
  }

  handleTargetSelection(playerId, action) {
    const pending = this.state.pendingTarget;
    if (!pending || pending.playerId !== playerId) {
      return { success: false, error: 'No pending target selection for you' };
    }

    const targetInfo = {
      targetOwnerId: action.targetOwnerId,
      targetUid: action.targetUid,
      targets: action.targets, // for multi-target abilities
    };

    // Activated ability target resolution
    if (pending.abilityActivation) {
      const player = this.state.players[playerId];
      const card = player.swamp.find(c => c.uid === pending.cardUid);
      if (!card) {
        this.state.pendingTarget = null;
        this.state.turnPhase = TURN_PHASE.MAIN;
        return { success: false, error: 'Card no longer on field' };
      }

      const handler = activatedRegistry[card.abilityId];
      if (!handler) {
        this.state.pendingTarget = null;
        this.state.turnPhase = TURN_PHASE.MAIN;
        return { success: false, error: 'No ability handler' };
      }

      const result = handler(this.state, playerId, card, targetInfo);
      this.state.pendingTarget = null;
      this.state.turnPhase = TURN_PHASE.MAIN;
      if (result.events) this.state.animations.push(...result.events);
      return this.checkWin({ success: true, events: result.events });
    }

    // Cursed set SP swap target
    if (pending.action === 'cursed_swap') {
      const events = [];
      cursed_set_bonus(this.state, playerId, targetInfo.targetOwnerId, events);
      this.state.pendingTarget = null;
      this.state.turnPhase = TURN_PHASE.MAIN;
      this.state.animations.push(...events);
      return this.checkWin({ success: true, events });
    }

    // Regular card play target resolution
    const result = resolvePlayCard(this.state, playerId, pending.cardUid, targetInfo);
    this.state.pendingTarget = null;
    this.state.turnPhase = TURN_PHASE.MAIN;

    if (result.events) {
      this.state.animations.push(...result.events);
    }

    return this.checkWin({ success: true, events: result.events });
  }

  handleCardChoice(playerId, action) {
    const pending = this.state.pendingChoice;
    if (!pending || pending.playerId !== playerId) {
      return { success: false, error: 'No pending choice for you' };
    }

    const events = [];

    // Dead Meme: pick a card from graveyard to return to hand
    if (pending.type === 'dead_meme') {
      const chosenUid = action.cardUid;
      const idx = this.state.graveyard.findIndex(c => c.uid === chosenUid);
      if (idx !== -1) {
        const [card] = this.state.graveyard.splice(idx, 1);
        const player = this.state.players[playerId];
        if (player.hand.length < MAX_HAND_SIZE) {
          player.hand.push(card);
          events.push({ type: 'card_recovered', cardUid: card.uid, card, playerId, reason: 'Dead Meme revive' });
        } else {
          this.state.graveyard.push(card);
        }
      }
    }

    this.state.pendingChoice = null;
    this.state.turnPhase = TURN_PHASE.MAIN;
    if (this._pendingChoiceTimeout) {
      clearTimeout(this._pendingChoiceTimeout);
      this._pendingChoiceTimeout = null;
    }
    this.state.animations.push(...events);
    return { success: true, events };
  }

  checkWin(result) {
    for (const [pid, p] of Object.entries(this.state.players)) {
      if (p.sp >= this.state.winSP) {
        this.state.phase = GAME_PHASE.FINISHED;
        this.state.winner = pid;
        this.state.animations.push({
          type: 'game_over',
          winner: pid,
          winnerName: p.name,
        });
        return { ...result, gameOver: true, winner: pid };
      }
    }
    return result;
  }

  logAction(playerId, type, data) {
    this.actionLog.push({
      turn: this.state.turnNumber,
      playerId,
      type,
      data,
      timestamp: Date.now(),
    });
  }
}
