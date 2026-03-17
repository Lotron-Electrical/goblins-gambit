import {
  createGameState,
  getCurrentPlayer,
  getCurrentPlayerId,
  drawCardRaw,
  getClientState,
} from "./GameState.js";
import { resolvePlayCard, getEffectiveStats } from "./EffectResolver.js";
import { getNextFreeSlot } from "./abilities/helpers.js";
import { resolveAttack, killCreature } from "./CombatResolver.js";
import { isLastPlace } from "./abilities/helpers.js";
import { activatedRegistry, hasActivatedAbility } from "./abilities/index.js";
import { cursed_set_bonus } from "./abilities/armour.js";
import {
  BASE_AP,
  MAX_HAND_SIZE,
  BUY_AP_COST,
  GAME_PHASE,
  TURN_PHASE,
  ACTION,
  THEME_EFFECTS,
  EVENT_DRAGON_BASE_DEF,
  EVENT_DRAGON_DAMAGE,
  VOLCANO_TRIGGER_RATIO,
  JARGON_CHANCE,
  JARGON_CARD_COST_MULTIPLIER,
} from "../../../shared/src/constants.js";

// Encumbrance: hoarding cards (8-9) penalises AP to 1, but maxing hand (10)
// flips to 7 AP as a "hoarding becomes advantage" comeback mechanic.
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
    this.state.theme = theme || "swamp";
    this.actionLog = [];
  }

  /** Safety timeout for pending target selection (20s, like Dead Meme choice) */
  _startPendingTargetTimeout() {
    clearTimeout(this._pendingTargetTimeout);
    this._pendingTargetTimeout = setTimeout(() => {
      if (this.state.pendingTarget) {
        this.state.pendingTarget = null;
        this.state.turnPhase = TURN_PHASE.MAIN;
        this.state.animations.push({
          type: "buff",
          text: "Target selection timed out",
        });
        if (this._onPendingTargetTimeout) this._onPendingTargetTimeout();
      }
    }, 20000);
  }

  _clearPendingTargetTimeout() {
    clearTimeout(this._pendingTargetTimeout);
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
      return { success: false, error: "Game is not in progress" };
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
    if (
      state.pendingChoice &&
      state.pendingChoice.playerId !== playerId &&
      action.type !== ACTION.CHOOSE_CARD
    ) {
      return { success: false, error: "Waiting for another player to choose" };
    }

    // Reaction cards can be played on any player's turn
    const REACTION_ABILITIES = ["stfu_silence", "lagg_delay"];
    if (
      action.type === ACTION.PLAY_CARD &&
      playerId !== this.getCurrentPlayerId()
    ) {
      const reactPlayer = state.players[playerId];
      const reactCard = reactPlayer?.hand.find((c) => c.uid === action.cardUid);
      if (reactCard && REACTION_ABILITIES.includes(reactCard.abilityId)) {
        return this.handlePlayCard(reactPlayer, playerId, action);
      }
      return { success: false, error: "Not your turn" };
    }

    // All other actions must be from current player
    if (playerId !== this.getCurrentPlayerId()) {
      return { success: false, error: "Not your turn" };
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

      case ACTION.DISCARD_CARD:
        return this.handleDiscardCard(player, playerId, action);

      case ACTION.RECYCLE_CREATURE:
        return this.handleRecycleCreature(player, playerId, action);

      case ACTION.DEPOSIT_VOLCANO:
        return this.handleDepositVolcano(player, playerId, action);

      case ACTION.ATTACK_EVENT:
        return this.handleAttackEvent(player, playerId, action);

      case ACTION.BUY_FROM_JARGON:
        return this.handleBuyFromJargon(player, playerId, action);

      default:
        return { success: false, error: "Unknown action" };
    }
  }

  handleDrawCard(player, playerId) {
    if (player.ap < 1) {
      return { success: false, error: "Need 1 AP to draw" };
    }

    if (player.hand.length >= MAX_HAND_SIZE) {
      return { success: false, error: "Hand is full" };
    }

    player.ap -= 1;
    const card = drawCardRaw(this.state, playerId);
    if (!card) return { success: false, error: "No cards to draw" };

    const events = [{ type: "draw_card", playerId, count: 1, card }];

    // Nerd/Nerdet draw buffs
    for (const c of player.swamp) {
      if (c._silenced) continue;
      if (c.abilityId === "nerd_draw_buff") {
        c._attackBuff = (c._attackBuff || 0) + 100;
        events.push({ type: "buff", cardUid: c.uid, text: "Nerd +100 ATK" });
      }
      if (c.abilityId === "nerdet_draw_buff") {
        c._defenceBuff = (c._defenceBuff || 0) + 100;
        events.push({ type: "buff", cardUid: c.uid, text: "Nerdet +100 DEF" });
      }
    }

    if (this.state.stats[playerId]) {
      this.state.stats[playerId].cardsDrawn++;
    }

    this.logAction(playerId, "draw", { cardId: card.id });
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
      this._startPendingTargetTimeout();
      this.state.animations.push(...(result.events || []));
      return { success: true, events: result.events, needsTarget: true };
    }

    if (this.state.stats[playerId]) {
      this.state.stats[playerId].cardsPlayed++;
      // Check if a creature was played by scanning events
      const playedEvt = result.events?.find(
        (e) => e.type === "card_played" && e.card?.type === "Creature",
      );
      if (playedEvt) {
        this.state.stats[playerId].creaturesPlayed++;
        this.state.stats[playerId].creatureStats[playedEvt.card.uid] = {
          name: playedEvt.card.name,
          kills: 0,
          damageDealt: 0,
        };
      }
    }
    this.trackEvents(result.events);

    this.logAction(playerId, "play", { cardUid });
    this.state.animations.push(...(result.events || []));
    return this.checkWin({ success: true, events: result.events });
  }

  handleAttack(player, playerId, action) {
    const { attackerUid, defenderOwnerId, defenderUid } = action;

    if (player.ap < 1) {
      return { success: false, error: "Need 1 AP to attack" };
    }

    const attackerCard = player.swamp.find((c) => c.uid === attackerUid);
    if (!attackerCard)
      return { success: false, error: "Attacker not on field" };

    if (attackerCard._hasAttacked) {
      return {
        success: false,
        error: "This creature already attacked this turn",
      };
    }

    // Block 0-ATK creatures from attacking (wastes AP for nothing)
    const preCheckStats = getEffectiveStats(this.state, playerId, attackerCard);
    if (preCheckStats.attack <= 0) {
      return { success: false, error: "This creature has no attack power" };
    }

    const defenderPlayer = this.state.players[defenderOwnerId];
    if (!defenderPlayer)
      return { success: false, error: "Invalid target player" };

    // --- Direct player attack (defenderUid matches the player ID) ---
    if (defenderUid === defenderOwnerId) {
      // Can only attack a player directly if they have no creatures
      const visibleCreatures = defenderPlayer.swamp.filter(
        (c) => !c._invisible,
      );
      if (visibleCreatures.length > 0) {
        return {
          success: false,
          error: "Cannot attack player directly while they have creatures",
        };
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
      if (
        themeEffects?.berserkMultiplier > 1 &&
        isLastPlace(this.state, playerId)
      ) {
        damage = Math.floor(damage * themeEffects.berserkMultiplier);
      }

      events.push({
        type: "attack",
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
        events.push({
          type: "buff",
          cardUid: defenderOwnerId,
          text: `Shield absorbed ${shieldDmg} damage! (${defenderPlayer.playerShield} remaining)`,
        });
      }

      // Remaining damage hits SP
      if (damage > 0) {
        defenderPlayer.sp = Math.max(0, defenderPlayer.sp - damage);
        events.push({
          type: "sp_change",
          playerId: defenderOwnerId,
          amount: -damage,
          reason: "Direct attack",
        });

        // Attacker gains half the damage dealt as SP
        const spGain = Math.floor(damage / 2);
        if (spGain > 0) {
          player.sp += spGain;
          events.push({
            type: "sp_change",
            playerId,
            amount: spGain,
            reason: "Direct attack bonus",
          });
        }
      }

      // Track direct attack stats (actual SP damage dealt, after shield absorption)
      if (this.state.stats[playerId]) {
        const actualDmg = damage; // damage remaining after shield
        this.state.stats[playerId].damageDealt += actualDmg;
        if (this.state.stats[playerId].creatureStats[attackerUid]) {
          this.state.stats[playerId].creatureStats[attackerUid].damageDealt +=
            actualDmg;
        }
      }
      // Track SP gains from events
      for (const evt of events) {
        if (
          evt.type === "sp_change" &&
          evt.amount > 0 &&
          this.state.stats[evt.playerId]
        ) {
          this.state.stats[evt.playerId].spEarned += evt.amount;
        }
      }

      this.logAction(playerId, "attack", {
        attackerUid,
        defenderOwnerId,
        directAttack: true,
      });
      this.state.animations.push(...events);
      return this.checkWin({ success: true, events });
    }

    // --- Normal creature attack ---
    const defenderCard = defenderPlayer.swamp.find(
      (c) => c.uid === defenderUid,
    );
    if (!defenderCard)
      return { success: false, error: "Defender not on field" };

    // Ghost: invisible creatures can't be targeted
    if (defenderCard._invisible) {
      return { success: false, error: "Cannot attack an invisible creature" };
    }

    const hasTaunt = defenderPlayer.swamp.find(
      (c) => c.abilityId === "gamer_boy_taunt" && !c._silenced,
    );
    if (hasTaunt && defenderUid !== hasTaunt.uid) {
      return { success: false, error: "Must attack Gamer Boy first (taunt)" };
    }

    // Ghost reveal on attack
    if (attackerCard._invisible) {
      attackerCard._invisible = false;
    }

    player.ap -= 1;
    attackerCard._hasAttacked = true;

    const result = resolveAttack(
      this.state,
      playerId,
      attackerUid,
      defenderOwnerId,
      defenderUid,
    );

    if (result.error) return { success: false, error: result.error };

    // Check for Dead Meme on-death trigger
    if (result.deadMemeTriggered) {
      this.state.pendingChoice = result.deadMemeChoice;
      this.state.turnPhase = TURN_PHASE.CHOOSE_CARD;

      // Safety timeout: auto-pick first card after 20s to prevent permanent softlock
      this._pendingChoiceTimeout = setTimeout(() => {
        if (
          this.state.phase !== GAME_PHASE.PLAYING ||
          this.state.pendingChoice === null
        ) {
          return;
        }
        if (this.state.pendingChoice?.type === "dead_meme") {
          const cards = this.state.pendingChoice.cards;
          if (cards.length > 0) {
            this.handleCardChoice(this.state.pendingChoice.playerId, {
              cardUid: cards[0].uid,
            });
          } else {
            this.state.pendingChoice = null;
            this.state.turnPhase = TURN_PHASE.MAIN;
          }
          this.state.animations.push({
            type: "buff",
            text: "Dead Meme choice timed out — auto-picked",
          });
          if (this._onPendingChoiceTimeout) this._onPendingChoiceTimeout();
        }
      }, 20000);
    }

    // Track creature attack stats
    if (this.state.stats[playerId] && result.events) {
      for (const evt of result.events) {
        if (evt.type === "damage") {
          const dmg = evt.amount || 0;
          this.state.stats[playerId].damageDealt += dmg;
          if (this.state.stats[playerId].creatureStats[attackerUid]) {
            this.state.stats[playerId].creatureStats[attackerUid].damageDealt +=
              dmg;
          }
        }
        if (evt.type === "destroy" && evt.owner !== playerId) {
          this.state.stats[playerId].creaturesKilled++;
          if (this.state.stats[playerId].creatureStats[attackerUid]) {
            this.state.stats[playerId].creatureStats[attackerUid].kills++;
          }
        }
        if (
          evt.type === "sp_change" &&
          evt.amount > 0 &&
          this.state.stats[evt.playerId]
        ) {
          this.state.stats[evt.playerId].spEarned += evt.amount;
        }
      }
    }

    this.logAction(playerId, "attack", {
      attackerUid,
      defenderUid,
      defenderOwnerId,
    });
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
    const snaccReturns = player.swamp.filter((c) => c._snaccReturn);
    for (const creature of snaccReturns) {
      const idx = player.swamp.findIndex((c) => c.uid === creature.uid);
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
          events.push({
            type: "card_moved",
            cardUid: creature.uid,
            from: playerId,
            to: origOwnerId,
            reason: "Snacc returned",
          });
        } else {
          // Creature was already spliced from player.swamp, so send directly to graveyard
          delete creature._snaccReturn;
          delete creature._controller;
          delete creature._originalOwner;
          delete creature._hasAttacked;
          delete creature._defenceDamage;
          delete creature._attackBuff;
          delete creature._defenceBuff;
          delete creature._tempShield;
          delete creature._invisible;
          delete creature._stonerShield;
          delete creature._silenced;
          delete creature._hasMimicked;
          delete creature._swapped;
          this.state.graveyard.push(creature);
          events.push({
            type: "destroy",
            cardUid: creature.uid,
            owner: origOwnerId,
            reason: "No room to return",
          });
        }
      }
    }

    // Run end-of-turn effects (Harambe, Crystal income, Swapeewee, Digital Artist, armour durability)
    this.tickEndOfTurnEffects(player, playerId, events);

    // Clear AMA reveals at end of turn
    if (this.state._revealedHands?.[playerId]) {
      delete this.state._revealedHands[playerId];
    }

    // Advance to next player
    this.state.currentTurnIndex =
      (this.state.currentTurnIndex + 1) % this.state.turnOrder.length;
    this.state.turnNumber++;

    // Story mode hook: call _onTurnEnd if set (e.g. Berserk Charm countdown)
    if (this.state._onTurnEnd) {
      this.state._onTurnEnd();
    }

    // Berserk Charm countdown
    if (this.state._berserkCharmActive) {
      this.state._berserkCharmTurnsLeft--;
      if (this.state._berserkCharmTurnsLeft <= 0) {
        this.state._berserkCharmActive = false;
        // Remove the attack buff that was added by berserk charm
        const storyPlayer = this.state.players["story_player"];
        if (storyPlayer) {
          for (const creature of storyPlayer.swamp) {
            creature._attackBuff = Math.max(
              0,
              (creature._attackBuff || 0) - (creature.attack || 0),
            );
          }
        }
      }
    }

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
    nextPlayer.ap = Math.max(
      0,
      getEncumbranceAP(nextPlayer.hand.length, this.state.baseAP) - apPenalty,
    );
    nextPlayer.apPenalty = 0;

    // Theme AP penalty (e.g. Frost: -1 AP per turn, minimum 1)
    const themeAP = THEME_EFFECTS[this.state.theme];
    if (themeAP?.apPenalty) {
      nextPlayer.ap = Math.max(1, nextPlayer.ap - themeAP.apPenalty);
    }

    // Hessian set bonus: extra AP
    const hessianCount = ["head", "body", "feet"].filter(
      (s) => nextPlayer.gear[s]?.set === "hessian",
    ).length;
    if (hessianCount >= 2)
      nextPlayer.ap = Math.max(nextPlayer.ap, hessianCount);

    // Clear silence on next player's creatures (they lasted 1 turn)
    for (const c of nextPlayer.swamp) {
      delete c._silenced;
    }

    events.push({
      type: "turn_start",
      playerId: nextPlayerId,
      turnNumber: this.state.turnNumber,
    });

    // Detect turn cycle completion (wrapped back to first player)
    if (this.state.currentTurnIndex === 0 && this.state.eventsEnabled) {
      this.state.turnCycleCount++;
      this.tickEventCycle(events);
    }

    // Skip turns for Lagg-affected or disconnected players (loop handles cascades)
    let safetyLimit = this.state.turnOrder.length;
    while (safetyLimit-- > 0) {
      const cur = getCurrentPlayer(this.state);
      const curId = this.getCurrentPlayerId();
      const skipLagg = cur._drawSkip && cur._drawSkip > 0;
      // Don't skip disconnected players in bot games — game should pause instead
      const allOpponentsBots = this.state.turnOrder
        .filter(id => id !== curId)
        .every(id => this.state.players[id]?.isBot);
      const skipDisconnected = cur.connected === false && !allOpponentsBots;
      if (!skipLagg && !skipDisconnected) break;

      if (skipLagg) cur._drawSkip--;
      cur.ap = 0;
      // Clean up per-turn state for skipped player (same as handleEndTurn)
      for (const c of cur.swamp) {
        delete c._hasAttacked;
        delete c._silenced;
        delete c._stonerShield;
      }
      const reason = skipLagg ? "Lagg!" : "Disconnected";
      events.push({ type: "turn_skipped", playerId: curId, reason });

      // Run end-of-turn effects for skipped player (same as handleEndTurn)
      this.tickEndOfTurnEffects(cur, curId, events);

      this.state.currentTurnIndex =
        (this.state.currentTurnIndex + 1) % this.state.turnOrder.length;
      this.state.turnNumber++;
      const np = getCurrentPlayer(this.state);
      const npId = this.getCurrentPlayerId();
      const apPen = np.apPenalty || 0;
      np.ap = Math.max(
        0,
        getEncumbranceAP(np.hand.length, this.state.baseAP) - apPen,
      );
      np.apPenalty = 0;
      // Theme AP penalty
      if (themeAP?.apPenalty) {
        np.ap = Math.max(1, np.ap - themeAP.apPenalty);
      }
      // Hessian set bonus: extra AP
      const hessianSkipCount = ["head", "body", "feet"].filter(
        (s) => np.gear[s]?.set === "hessian",
      ).length;
      if (hessianSkipCount >= 2) np.ap = Math.max(np.ap, hessianSkipCount);
      for (const c of np.swamp) {
        delete c._silenced;
      }
      events.push({
        type: "turn_start",
        playerId: npId,
        turnNumber: this.state.turnNumber,
      });
    }

    this.logAction(playerId, "end_turn", {});
    this.state.animations.push(...events);
    return this.checkWin({ success: true, events });
  }

  handleBuyAP(player, playerId) {
    let cost = BUY_AP_COST;
    for (const slot of ["head", "body", "feet"]) {
      const armour = player.gear[slot];
      if (armour?.abilityId === "hessian_discount") {
        cost -= armour.discountAmount;
      }
    }
    cost = Math.max(0, cost);

    if (player.sp < cost) {
      return {
        success: false,
        error: `Need ${cost} SP to buy AP (have ${player.sp})`,
      };
    }

    player.sp -= cost;
    player.ap += 1;

    const events = [
      { type: "sp_change", playerId, amount: -cost, reason: "Buy AP" },
      { type: "buff", text: `+1 AP (cost ${cost} SP)` },
    ];

    this.logAction(playerId, "buy_ap", { cost });
    this.state.animations.push(...events);
    return { success: true, events };
  }

  handleUseAbility(player, playerId, action) {
    const { cardUid, targetInfo } = action;
    const card = player.swamp.find((c) => c.uid === cardUid);
    if (!card) return { success: false, error: "Creature not on field" };
    if (card._silenced) {
      // STFU penalty: still costs 1 AP when trying to use a silenced ability
      if (player.ap >= 1) player.ap -= 1;
      return { success: false, error: "Creature is silenced! (1 AP wasted)" };
    }

    const handler = activatedRegistry[card.abilityId];
    if (!handler)
      return {
        success: false,
        error: "This creature has no activated ability",
      };

    const result = handler(this.state, playerId, card, targetInfo);

    if (result.needsTarget) {
      this.state.pendingTarget = result.targetRequest;
      this.state.pendingTarget.abilityActivation = true;
      this.state.turnPhase = TURN_PHASE.TARGETING;
      this._startPendingTargetTimeout();
      this.state.animations.push(...(result.events || []));
      return { success: true, events: result.events, needsTarget: true };
    }

    if (!result.success) return result;

    if (this.state.stats[playerId]) {
      this.state.stats[playerId].abilitiesUsed++;
    }
    this.trackEvents(result.events);

    this.logAction(playerId, "ability", { cardUid, ability: card.abilityId });
    this.state.animations.push(...(result.events || []));
    return this.checkWin({ success: true, events: result.events });
  }

  handleTargetSelection(playerId, action) {
    this._clearPendingTargetTimeout();
    const pending = this.state.pendingTarget;
    if (!pending || pending.playerId !== playerId) {
      return { success: false, error: "No pending target selection for you" };
    }

    const targetInfo = {
      targetOwnerId: action.targetOwnerId,
      targetUid: action.targetUid,
      targets: action.targets, // for multi-target abilities
    };

    // Validate selected targets against the valid targets list
    if (pending.validTargets && pending.validTargets.length > 0) {
      const valid = pending.validTargets;
      if (targetInfo.targets) {
        // Multi-target: each must be in validTargets
        for (const t of targetInfo.targets) {
          if (
            !valid.some(
              (v) => v.uid === t.targetUid && v.ownerId === t.targetOwnerId,
            )
          ) {
            return { success: false, error: "Invalid target selected" };
          }
        }
      } else if (targetInfo.targetUid) {
        // Single creature target
        if (
          !valid.some(
            (v) =>
              v.uid === targetInfo.targetUid &&
              v.ownerId === targetInfo.targetOwnerId,
          )
        ) {
          return { success: false, error: "Invalid target selected" };
        }
      } else if (targetInfo.targetOwnerId && pending.targetType === "player") {
        // Player target
        if (
          !valid.some((v) => (v.ownerId || v.id) === targetInfo.targetOwnerId)
        ) {
          return { success: false, error: "Invalid target player selected" };
        }
      }
    }

    // Activated ability target resolution
    if (pending.abilityActivation) {
      const player = this.state.players[playerId];
      const card = player.swamp.find((c) => c.uid === pending.cardUid);
      if (!card) {
        this.state.pendingTarget = null;
        this.state.turnPhase = TURN_PHASE.MAIN;
        return { success: false, error: "Card no longer on field" };
      }

      const handler = activatedRegistry[card.abilityId];
      if (!handler) {
        this.state.pendingTarget = null;
        this.state.turnPhase = TURN_PHASE.MAIN;
        return { success: false, error: "No ability handler" };
      }

      const result = handler(this.state, playerId, card, targetInfo);
      this.state.pendingTarget = null;
      this.state.turnPhase = TURN_PHASE.MAIN;
      this.trackEvents(result.events);
      if (result.events) this.state.animations.push(...result.events);
      return this.checkWin({ success: true, events: result.events });
    }

    // Cursed set SP swap target
    if (pending.action === "cursed_swap") {
      const events = [];
      cursed_set_bonus(this.state, playerId, targetInfo.targetOwnerId, events);
      this.state.pendingTarget = null;
      this.state.turnPhase = TURN_PHASE.MAIN;
      this.trackEvents(events);
      this.state.animations.push(...events);
      return this.checkWin({ success: true, events });
    }

    // Regular card play target resolution
    const result = resolvePlayCard(
      this.state,
      playerId,
      pending.cardUid,
      targetInfo,
    );
    this.state.pendingTarget = null;
    this.state.turnPhase = TURN_PHASE.MAIN;
    this.trackEvents(result.events);

    if (result.events) {
      this.state.animations.push(...result.events);
    }

    return this.checkWin({ success: true, events: result.events });
  }

  handleCardChoice(playerId, action) {
    const pending = this.state.pendingChoice;
    if (!pending || pending.playerId !== playerId) {
      return { success: false, error: "No pending choice for you" };
    }

    const events = [];

    // Dead Meme: pick a card from graveyard to return to hand
    if (pending.type === "dead_meme") {
      const chosenUid = action.cardUid;
      const idx = this.state.graveyard.findIndex((c) => c.uid === chosenUid);
      if (idx !== -1) {
        const [card] = this.state.graveyard.splice(idx, 1);
        const player = this.state.players[playerId];
        if (player.hand.length < MAX_HAND_SIZE) {
          player.hand.push(card);
          events.push({
            type: "card_recovered",
            cardUid: card.uid,
            card,
            playerId,
            reason: "Dead Meme revive",
          });
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
        // Clear Dead Meme timeout to prevent post-game state corruption
        if (this._pendingChoiceTimeout) {
          clearTimeout(this._pendingChoiceTimeout);
          this._pendingChoiceTimeout = null;
        }
        this.state.animations.push({
          type: "game_over",
          winner: pid,
          winnerName: p.name,
        });
        return { ...result, gameOver: true, winner: pid };
      }
    }
    return result;
  }

  /** Scan events array and update per-player stats */
  trackEvents(events) {
    if (!events || !this.state.stats) return;
    for (const evt of events) {
      switch (evt.type) {
        case "damage": {
          const ownerStats = this.state.stats[evt.attackerOwner];
          if (ownerStats) {
            ownerStats.damageDealt += evt.amount || 0;
            if (evt.attackerUid && ownerStats.creatureStats[evt.attackerUid]) {
              ownerStats.creatureStats[evt.attackerUid].damageDealt +=
                evt.amount || 0;
            }
          }
          break;
        }
        case "sp_change": {
          // Direct SP damage also counts as damageDealt for the attacker
          if (evt.amount < 0 && evt.attackerOwner) {
            const ownerStats = this.state.stats[evt.attackerOwner];
            if (ownerStats) {
              ownerStats.damageDealt += Math.abs(evt.amount);
            }
          }
          // SP gains
          if (
            evt.amount > 0 &&
            evt.playerId &&
            this.state.stats[evt.playerId]
          ) {
            this.state.stats[evt.playerId].spEarned += evt.amount;
          }
          break;
        }
        case "destroy": {
          // Creature killed — attribute to attacker if known
          if (evt.attackerOwner && this.state.stats[evt.attackerOwner]) {
            this.state.stats[evt.attackerOwner].creaturesKilled++;
            if (
              evt.attackerUid &&
              this.state.stats[evt.attackerOwner].creatureStats[evt.attackerUid]
            ) {
              this.state.stats[evt.attackerOwner].creatureStats[evt.attackerUid]
                .kills++;
            }
          }
          break;
        }
      }
    }
  }

  handleDiscardCard(player, playerId, action) {
    const { cardUid } = action;
    if (player.ap < 1) {
      return { success: false, error: "Need 1 AP to discard" };
    }

    const cardIdx = player.hand.findIndex((c) => c.uid === cardUid);
    if (cardIdx === -1) {
      return { success: false, error: "Card not in hand" };
    }

    player.ap -= 1;
    const [card] = player.hand.splice(cardIdx, 1);
    this.state.graveyard.push(card);

    const events = [
      { type: "card_discarded", playerId, cardUid: card.uid, card },
    ];

    this.logAction(playerId, "discard", { cardUid: card.uid });
    this.state.animations.push(...events);
    return { success: true, events };
  }

  handleRecycleCreature(player, playerId, action) {
    const { cardUid } = action;
    const creatureIdx = player.swamp.findIndex((c) => c.uid === cardUid);
    if (creatureIdx === -1) {
      return { success: false, error: "Creature not on your field" };
    }

    const creature = player.swamp[creatureIdx];
    const stats = getEffectiveStats(this.state, playerId, creature);
    const spCost = Math.ceil(stats.sp / 2);

    if (player.sp < spCost) {
      return {
        success: false,
        error: `Need ${spCost} SP to recycle (half of ${stats.sp} SP value)`,
      };
    }

    // Deduct SP cost
    player.sp -= spCost;

    // Grant temp player shield equal to remaining defence
    const remainingDef = Math.max(0, stats.defence);
    if (remainingDef > 0) {
      player.playerShield += remainingDef;
    }

    // Kill creature and send to graveyard
    killCreature(this.state, playerId, creature.uid);

    const events = [
      { type: "sp_change", playerId, amount: -spCost, reason: "Recycle cost" },
      {
        type: "creature_recycled",
        playerId,
        cardUid: creature.uid,
        card: creature,
        shieldGained: remainingDef,
      },
      {
        type: "destroy",
        cardUid: creature.uid,
        owner: playerId,
        reason: "Recycled",
      },
    ];

    if (remainingDef > 0) {
      events.push({
        type: "buff",
        text: `+${remainingDef} player shield from recycling`,
      });
    }

    this.logAction(playerId, "recycle", {
      cardUid: creature.uid,
      spCost,
      shieldGained: remainingDef,
    });
    this.state.animations.push(...events);
    return this.checkWin({ success: true, events });
  }

  /** Run end-of-turn effects for a player (Harambe, armour durability, Swapeewee, Digital Artist, Crystal income) */
  tickEndOfTurnEffects(player, playerId, events) {
    // Harambe round countdown — only tick for the current player's swamp
    {
      const pid = playerId;
      const p = player;
      const harambes = p.swamp.filter(
        (c) =>
          c.abilityId === "harambe_plant" && c._roundsRemaining !== undefined,
      );
      for (const h of harambes) {
        if (h._roundsRemaining <= 0) {
          const stats = getEffectiveStats(this.state, pid, h);
          const harambeOwner = this.state.players[h._harambeOwner];
          if (harambeOwner) {
            harambeOwner.sp += stats.sp;
            events.push({
              type: "sp_change",
              playerId: h._harambeOwner,
              amount: stats.sp,
              reason: "Harambe expired",
            });
          }
          events.push({
            type: "destroy",
            cardUid: h.uid,
            owner: pid,
            reason: "Harambe expired",
          });
          killCreature(this.state, pid, h.uid);
        } else {
          h._roundsRemaining--;
        }
      }
    }

    // Crystal armour income (only if player has at least 1 creature)
    if (player.swamp.length > 0) {
      for (const slot of ["head", "body", "feet"]) {
        const armour = player.gear[slot];
        if (armour?.abilityId === "crystal_income") {
          player.sp += armour.incomeAmount;
          events.push({
            type: "sp_change",
            playerId,
            amount: armour.incomeAmount,
            reason: armour.name,
          });
        }
      }
    }

    // Swapeewee toggle
    for (const c of player.swamp) {
      if (c.abilityId === "swapeewee_swap" && !c._silenced) {
        c._swapped = !c._swapped;
        events.push({ type: "buff", cardUid: c.uid, text: "Stats swapped!" });
      }
    }

    // Digital Artist +100 temp shield (creature DEF) + 100 player shield
    for (const c of player.swamp) {
      if (c.abilityId === "digital_artist_shield" && !c._silenced) {
        c._tempShield = (c._tempShield || 0) + 100;
        player.playerShield += 100;
        events.push({ type: "buff", cardUid: c.uid, text: "+100 shield" });
      }
    }

    // Armour durability countdown
    for (const slot of ["head", "body", "feet"]) {
      const armour = player.gear[slot];
      if (!armour || armour._turnsRemaining === undefined) continue;
      if (armour._justEquipped) {
        delete armour._justEquipped;
        continue;
      }
      armour._turnsRemaining--;
      if (armour._turnsRemaining <= 0) {
        if (armour.abilityId === "lucky_shield") {
          player.playerShield = Math.max(
            0,
            player.playerShield - (armour.shieldAmount || 0),
          );
          const luckyBefore = ["head", "body", "feet"].filter(
            (s) => player.gear[s]?.abilityId === "lucky_shield",
          ).length;
          if (luckyBefore === 3) {
            player.playerShield = Math.max(0, player.playerShield - 500);
          }
        }
        events.push({
          type: "destroy",
          cardUid: armour.uid,
          owner: playerId,
          reason: `${armour.name} expired`,
        });
        this.state.graveyard.push(armour);
        player.gear[slot] = null;
      }
    }
  }

  // ========== EVENT SYSTEM ==========

  /** Called once per turn cycle (when currentTurnIndex wraps to 0) */
  tickEventCycle(events) {
    const state = this.state;
    const playerCount = state.turnOrder.length;
    const halfWinSP = state.winSP * VOLCANO_TRIGGER_RATIO;

    // Check if any player has reached the threshold
    const thresholdReached = Object.values(state.players).some(
      (p) => p.sp >= halfWinSP,
    );

    if (!thresholdReached) return;

    // Activate Volcano if not already active (and Dragon isn't active)
    if (!state.volcano.active && !state.dragon.active) {
      state.volcano.active = true;
      events.push({
        type: "volcano_active",
        text: "THE VOLCANO AWAKENS!",
      });
    }

    // Tick deposit maturity (only if Dragon is NOT active)
    if (state.volcano.active && !state.dragon.active) {
      for (const [pid, deposits] of Object.entries(state.volcano.deposits)) {
        const player = state.players[pid];
        if (!player) continue;
        const matured = [];
        for (let i = deposits.length - 1; i >= 0; i--) {
          deposits[i].maturesIn--;
          if (deposits[i].maturesIn <= 0) {
            const dep = deposits[i];
            const payout = Math.floor(
              dep.amount * (1 + dep.interestRate / 100),
            );
            player.sp += payout;
            state.volcano.totalBanked -= dep.amount;
            events.push({
              type: "volcano_withdraw",
              playerId: pid,
              amount: payout,
              interest: payout - dep.amount,
            });
            events.push({
              type: "sp_change",
              playerId: pid,
              amount: payout,
              reason: "Volcano matured",
            });
            matured.push(i);
          }
        }
        for (const idx of matured) {
          deposits.splice(idx, 1);
        }
      }
    }

    // Dragon damage tick
    if (state.dragon.active) {
      for (const pid of state.turnOrder) {
        const p = state.players[pid];
        let dmg = EVENT_DRAGON_DAMAGE;
        // Shield absorbs first
        if (p.playerShield > 0) {
          const absorbed = Math.min(p.playerShield, dmg);
          p.playerShield -= absorbed;
          dmg -= absorbed;
        }
        if (dmg > 0) {
          p.sp = Math.max(0, p.sp - dmg);
          events.push({
            type: "sp_change",
            playerId: pid,
            amount: -dmg,
            reason: "Dragon attack",
          });
        }
      }
      events.push({
        type: "dragon_attack",
        text: "The Dragon attacks all players!",
      });
    }

    // Dragon spawn check (only if Volcano has banked SP and Dragon is NOT already active)
    if (
      state.volcano.active &&
      !state.dragon.active &&
      state.volcano.totalBanked > 0
    ) {
      const spawnChance = Math.min(0.5, state.volcano.totalBanked / 20000);
      if (Math.random() < spawnChance) {
        this.spawnDragon(events);
      }
    }

    // Jargon spawn check (if not already active and Dragon isn't active)
    if (!state.jargon.active && !state.dragon.active) {
      if (Math.random() < JARGON_CHANCE) {
        this.spawnJargon(events);
      }
    }

    // Jargon departure countdown
    if (state.jargon.active) {
      state.jargon.cyclesRemaining--;
      if (state.jargon.cyclesRemaining <= 0) {
        state.jargon.active = false;
        events.push({
          type: "jargon_departure",
          text: "Jargon the Vendor departs...",
        });
      }
    }
  }

  spawnDragon(events) {
    const state = this.state;
    const playerCount = state.turnOrder.length;
    state.dragon.active = true;
    state.dragon.maxHP = EVENT_DRAGON_BASE_DEF * playerCount;
    state.dragon.currentHP = state.dragon.maxHP;
    state.dragon.damageByPlayer = {};
    for (const pid of state.turnOrder) {
      state.dragon.damageByPlayer[pid] = 0;
    }
    events.push({
      type: "dragon_spawn",
      text: "A DRAGON APPROACHES!",
      maxHP: state.dragon.maxHP,
    });
  }

  spawnJargon(events) {
    const state = this.state;
    state.jargon.active = true;
    state.jargon.cyclesRemaining = 1;
    events.push({
      type: "jargon_arrival",
      text: "JARGON THE VENDOR ARRIVES!",
    });
  }

  handleDepositVolcano(player, playerId, action) {
    const state = this.state;
    const amount = Math.floor(Number(action.amount) || 0);

    if (!state.eventsEnabled || !state.volcano.active) {
      return { success: false, error: "Volcano is not active" };
    }
    if (state.dragon.active) {
      return { success: false, error: "Cannot deposit while Dragon is active" };
    }
    if (amount <= 0) {
      return { success: false, error: "Must deposit a positive amount" };
    }
    if (player.sp < amount) {
      return { success: false, error: `Not enough SP (have ${player.sp})` };
    }
    if (player.ap < 1) {
      return { success: false, error: "Need 1 AP to deposit" };
    }

    player.ap -= 1;
    player.sp -= amount;

    // Roll D6 for lock duration and interest rate
    const d6 = Math.floor(Math.random() * 6) + 1;
    const interestRate = d6 * 10; // 10-60%

    if (!state.volcano.deposits[playerId]) {
      state.volcano.deposits[playerId] = [];
    }
    state.volcano.deposits[playerId].push({
      amount,
      interestRate,
      maturesIn: d6,
      depositedAt: state.turnCycleCount,
    });
    state.volcano.totalBanked += amount;

    const events = [
      {
        type: "sp_change",
        playerId,
        amount: -amount,
        reason: "Volcano deposit",
      },
      {
        type: "volcano_deposit",
        playerId,
        amount,
        interestRate,
        maturesIn: d6,
        text: `Deposited ${amount} SP! Locked for ${d6} cycles at ${interestRate}% interest`,
      },
      {
        type: "dice_roll",
        dice: [d6],
        result: `${interestRate}% interest, ${d6} cycle lock`,
      },
    ];

    this.logAction(playerId, "deposit_volcano", {
      amount,
      interestRate,
      maturesIn: d6,
    });
    state.animations.push(...events);
    return this.checkWin({ success: true, events });
  }

  handleAttackEvent(player, playerId, action) {
    const state = this.state;

    if (!state.eventsEnabled || !state.dragon.active) {
      return { success: false, error: "No Dragon to attack" };
    }
    if (player.ap < 1) {
      return { success: false, error: "Need 1 AP to attack Dragon" };
    }

    const { attackerUid } = action;
    const attackerCard = player.swamp.find((c) => c.uid === attackerUid);
    if (!attackerCard)
      return { success: false, error: "Creature not on field" };
    if (attackerCard._hasAttacked) {
      return {
        success: false,
        error: "This creature already attacked this turn",
      };
    }

    // Block 0-ATK creatures from attacking the Dragon (wastes AP for nothing)
    const preCheckStats = getEffectiveStats(state, playerId, attackerCard);
    if (preCheckStats.attack <= 0) {
      return { success: false, error: "This creature has no attack power" };
    }

    player.ap -= 1;
    attackerCard._hasAttacked = true;

    // Ghost reveal
    if (attackerCard._invisible) {
      attackerCard._invisible = false;
    }

    const aStats = getEffectiveStats(state, playerId, attackerCard);
    let damage = aStats.attack;

    // Berserk multiplier
    const themeEffects = THEME_EFFECTS[state.theme];
    if (themeEffects?.berserkMultiplier > 1 && isLastPlace(state, playerId)) {
      damage = Math.floor(damage * themeEffects.berserkMultiplier);
    }

    state.dragon.currentHP -= damage;
    state.dragon.damageByPlayer[playerId] =
      (state.dragon.damageByPlayer[playerId] || 0) + damage;

    const events = [
      {
        type: "attack",
        attacker: attackerUid,
        defender: "dragon",
        attackerOwner: playerId,
        defenderOwner: "dragon",
      },
      {
        type: "damage",
        targetUid: "dragon",
        amount: damage,
        attackerOwner: playerId,
        attackerUid,
      },
    ];

    // Track stats
    if (state.stats[playerId]) {
      state.stats[playerId].damageDealt += damage;
      if (state.stats[playerId].creatureStats[attackerUid]) {
        state.stats[playerId].creatureStats[attackerUid].damageDealt += damage;
      }
    }

    // Dragon killed?
    if (state.dragon.currentHP <= 0) {
      // Find player with most damage dealt
      let maxDamage = 0;
      let killerId = null;
      for (const [pid, dmg] of Object.entries(state.dragon.damageByPlayer)) {
        if (dmg > maxDamage) {
          maxDamage = dmg;
          killerId = pid;
        }
      }

      // Award all volcano deposits + interest to killer
      const totalPayout = state.volcano.totalBanked;
      if (killerId && totalPayout > 0) {
        const killer = state.players[killerId];
        if (killer) {
          // Calculate total with interest
          let fullPayout = 0;
          for (const [, deposits] of Object.entries(state.volcano.deposits)) {
            for (const dep of deposits) {
              fullPayout += Math.floor(
                dep.amount * (1 + dep.interestRate / 100),
              );
            }
          }
          killer.sp += fullPayout;
          events.push({
            type: "sp_change",
            playerId: killerId,
            amount: fullPayout,
            reason: "Dragon slain! Volcano treasure claimed!",
          });
          if (state.stats[killerId]) {
            state.stats[killerId].spEarned += fullPayout;
          }
        }
      }

      events.push({
        type: "dragon_killed",
        killerId,
        killerName: killerId ? state.players[killerId]?.name : "Unknown",
        totalPayout: state.volcano.totalBanked,
        text: `${killerId ? state.players[killerId]?.name : "Unknown"} SLAYS THE DRAGON!`,
      });

      // Reset volcano entirely
      state.dragon.active = false;
      state.dragon.currentHP = 0;
      state.dragon.damageByPlayer = {};
      state.volcano.active = false;
      state.volcano.deposits = {};
      state.volcano.totalBanked = 0;
    }

    this.logAction(playerId, "attack_event", { attackerUid, damage });
    state.animations.push(...events);
    return this.checkWin({ success: true, events });
  }

  handleBuyFromJargon(player, playerId, action) {
    const state = this.state;

    if (!state.eventsEnabled || !state.jargon.active) {
      return { success: false, error: "Jargon is not available" };
    }
    if (player.ap < 1) {
      return { success: false, error: "Not enough AP to buy from Jargon" };
    }
    if (state.graveyard.length === 0) {
      return { success: false, error: "Graveyard is empty" };
    }
    if (player.hand.length >= MAX_HAND_SIZE) {
      return { success: false, error: "Hand is full" };
    }

    // Pick random card from graveyard
    const randomIdx = Math.floor(Math.random() * state.graveyard.length);
    const card = state.graveyard[randomIdx];
    const cost = Math.max(100, (card.cost || 1) * JARGON_CARD_COST_MULTIPLIER);

    if (player.sp < cost) {
      return {
        success: false,
        error: `Need ${cost} SP to buy from Jargon (have ${player.sp})`,
      };
    }

    player.ap -= 1;
    player.sp -= cost;
    state.graveyard.splice(randomIdx, 1);
    player.hand.push(card);

    const events = [
      {
        type: "sp_change",
        playerId,
        amount: -cost,
        reason: "Bought from Jargon",
      },
      {
        type: "card_recovered",
        cardUid: card.uid,
        card,
        playerId,
        reason: `Jargon sold ${card.name}`,
      },
    ];

    this.logAction(playerId, "buy_jargon", { cardUid: card.uid, cost });
    state.animations.push(...events);
    return { success: true, events };
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
