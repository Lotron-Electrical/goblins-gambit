import { getEffectiveStats, isLastPlace } from "./abilities/helpers.js";
import { getLuckyShield } from "./abilities/armour.js";
import { THEME_EFFECTS } from "../../../shared/src/constants.js";

/**
 * Resolve an attack from one creature against another.
 * Returns { killed, attackerKilled, spGained, events, deadMemeTriggered?, deadMemeChoice? }
 */
export function resolveAttack(
  state,
  attackerId,
  attackerUid,
  defenderOwnerId,
  defenderUid,
) {
  const attacker = state.players[attackerId];
  const defender = state.players[defenderOwnerId];
  const attackerCard = attacker.swamp.find((c) => c.uid === attackerUid);
  const defenderCard = defender.swamp.find((c) => c.uid === defenderUid);

  if (!attackerCard || !defenderCard) {
    return { error: "Card not found on field" };
  }

  const aStats = getEffectiveStats(state, attackerId, attackerCard);
  const dStats = getEffectiveStats(state, defenderOwnerId, defenderCard);

  const events = [];
  let spGained = 0;
  let defenderKilled = false;
  let attackerKilled = false;
  let deadMemeTriggered = false;
  let deadMemeChoice = null;

  events.push({
    type: "attack",
    attacker: attackerUid,
    defender: defenderUid,
    attackerOwner: attackerId,
    defenderOwner: defenderOwnerId,
  });

  // --- Stoner Shield: absorbs the attack entirely ---
  if (defenderCard._stonerShield) {
    defenderCard._stonerShield = false;
    events.push({
      type: "buff",
      cardUid: defenderUid,
      text: "Stoner Shield absorbed the attack!",
    });
    return {
      defenderKilled: false,
      attackerKilled: false,
      spGained: 0,
      events,
    };
  }

  // --- Karen counter-kill: instakills any creature that attacks her, then Karen dies too ---
  if (defenderCard.abilityId === "karen_counter" && !defenderCard._silenced) {
    attackerKilled = true;
    events.push({
      type: "destroy",
      cardUid: attackerUid,
      owner: attackerId,
      reason: "Karen counter-kill",
    });
    const aSP = aStats.sp;
    defender.sp += aSP;
    spGained = aSP;
    events.push({
      type: "sp_change",
      playerId: defenderOwnerId,
      amount: aSP,
      reason: "Karen kill",
    });
    killCreature(state, attackerId, attackerUid);
    // Karen sacrifices herself after counter-killing
    killCreature(state, defenderOwnerId, defenderCard.uid);
    events.push({
      type: "destroy",
      cardUid: defenderUid,
      owner: defenderOwnerId,
      reason: "Karen sacrifice",
    });
    // Tag the attack event as a killshot
    const atkEvt = events.find((e) => e.type === "attack");
    if (atkEvt) atkEvt.killshot = true;
    return { defenderKilled: true, attackerKilled: true, spGained, events };
  }

  // --- Dodge: attack bypasses creature, damages owner SP instead ---
  if (defenderCard.abilityId === "dodge_evade" && !defenderCard._silenced) {
    const dodgeDamage = 200;
    defender.sp = Math.max(0, defender.sp - dodgeDamage);
    events.push({
      type: "buff",
      cardUid: defenderUid,
      text: "Dodge! Attack bypassed — 200 SP damage to owner",
    });
    events.push({
      type: "sp_change",
      playerId: defenderOwnerId,
      amount: -dodgeDamage,
      reason: "Dodge bypass",
    });
    return { defenderKilled: false, attackerKilled: false, spGained: 0, events };
  }

  // --- Catfish mimic: first attack copies attacker's stats ---
  if (
    defenderCard.abilityId === "catfish_mimic" &&
    !defenderCard._silenced &&
    !defenderCard._hasMimicked
  ) {
    defenderCard._hasMimicked = true;
    defenderCard.attack = attackerCard.attack || 0;
    defenderCard.defence = attackerCard.defence || 0;
    defenderCard.sp = attackerCard.sp || 0;
    events.push({
      type: "buff",
      cardUid: defenderUid,
      text: `Catfish mimicked ${attackerCard.name}! ATK:${defenderCard.attack} DEF:${defenderCard.defence}`,
    });
    // Recalculate dStats after mimic
    const newDStats = getEffectiveStats(state, defenderOwnerId, defenderCard);
    // Continue attack with new stats
    return resolveAttackDamage(
      state,
      attackerId,
      defenderOwnerId,
      attackerCard,
      defenderCard,
      aStats,
      newDStats,
      events,
    );
  }

  // --- Viper sting: attacker loses 1 AP next round ---
  if (defenderCard.abilityId === "viper_sting" && !defenderCard._silenced) {
    attacker.apPenalty = (attacker.apPenalty || 0) + 1;
    events.push({
      type: "buff",
      cardUid: defenderUid,
      text: "Viper Sting! -1 AP next turn",
    });
  }

  return resolveAttackDamage(
    state,
    attackerId,
    defenderOwnerId,
    attackerCard,
    defenderCard,
    aStats,
    dStats,
    events,
  );
}

function resolveAttackDamage(
  state,
  attackerId,
  defenderOwnerId,
  attackerCard,
  defenderCard,
  aStats,
  dStats,
  events,
) {
  const attacker = state.players[attackerId];
  const defender = state.players[defenderOwnerId];
  let spGained = 0;
  let defenderKilled = false;
  let deadMemeTriggered = false;
  let deadMemeChoice = null;

  const themeEffects = THEME_EFFECTS[state.theme];
  let damage = aStats.attack;
  // Berserk: last-place player deals double damage (Blood Moon)
  if (themeEffects?.berserkMultiplier > 1 && isLastPlace(state, attackerId)) {
    damage = Math.floor(damage * themeEffects.berserkMultiplier);
  }
  const currentDef = dStats.defence;

  events.push({
    type: "damage",
    cardUid: defenderCard.uid,
    amount: damage,
    remaining: Math.max(0, currentDef - damage),
  });

  // Gabber splash: capture adjacent creatures by _slot proximity, before any kill removes defender from swamp
  let gabberAdjacentCards = null;
  if (attackerCard.abilityId === "gabber_splash" && !attackerCard._silenced) {
    const defSlot = defenderCard._slot;
    gabberAdjacentCards = [];
    if (defSlot != null) {
      const leftNeighbor = defender.swamp.find((c) => c._slot === defSlot - 1);
      const rightNeighbor = defender.swamp.find((c) => c._slot === defSlot + 1);
      if (leftNeighbor) gabberAdjacentCards.push(leftNeighbor);
      if (rightNeighbor) gabberAdjacentCards.push(rightNeighbor);
    }
  }

  if (damage >= currentDef) {
    defenderKilled = true;
    const dSP = dStats.sp;

    // Lucky Shield: reduce SP loss for defender's owner
    const luckyShield = getLuckyShield(defender);
    // Lucky shield protects the player's SP, not creature death — actually it reduces damage to player SP
    // Per plan: "Damage to player's SP reduced by shield" — but creature death gives SP to attacker
    // We'll keep it simple: attacker still gets full SP, Lucky protects direct SP damage only

    attacker.sp += dSP;
    spGained = dSP;
    events.push({
      type: "destroy",
      cardUid: defenderCard.uid,
      owner: defenderOwnerId,
    });
    events.push({
      type: "sp_change",
      playerId: attackerId,
      amount: dSP,
      reason: "Kill",
    });

    killCreature(state, defenderOwnerId, defenderCard.uid);

    // Check for Dead Meme death trigger AFTER killing (so Dead Meme itself is in graveyard)
    if (
      defenderCard.abilityId === "dead_meme_revive" &&
      !defenderCard._silenced
    ) {
      const topGrave = state.graveyard.slice(-6);
      if (topGrave.length > 0) {
        deadMemeTriggered = true;
        deadMemeChoice = {
          playerId: defenderOwnerId,
          type: "dead_meme",
          cards: topGrave,
          prompt:
            "Dead Meme died! Choose a card from the graveyard to return to your hand",
        };
      } else {
        // Graveyard empty — notify player instead of silent failure
        events.push({
          type: "buff",
          cardUid: defenderCard.uid,
          text: "Dead Meme: No cards in graveyard to revive!",
        });
      }
    }

  } else {
    defenderCard._defenceDamage = (defenderCard._defenceDamage || 0) + damage;
  }

  // Wood Elf burn: additional 100 SP on every attack (not just kills)
  if (attackerCard.abilityId === "wood_elf_burn" && !attackerCard._silenced) {
    attacker.sp += 100;
    events.push({
      type: "sp_change",
      playerId: attackerId,
      amount: 100,
      reason: "Wood Elf burn",
    });
  }

  // Gabber splash: adjacent cards lose 100 DEF (fires regardless of whether defender died)
  if (attackerCard.abilityId === "gabber_splash" && !attackerCard._silenced) {
    const adjacent = defenderKilled
      ? gabberAdjacentCards || []
      : (() => {
          const idx = defender.swamp.findIndex(
            (c) => c.uid === defenderCard.uid,
          );
          const adj = [];
          if (idx > 0) adj.push(defender.swamp[idx - 1]);
          if (idx < defender.swamp.length - 1)
            adj.push(defender.swamp[idx + 1]);
          return adj;
        })();
    for (const adj of adjacent) {
      adj._defenceDamage = (adj._defenceDamage || 0) + 100;
      events.push({
        type: "damage",
        cardUid: adj.uid,
        amount: 100,
        reason: "Gabber splash",
      });
      const adjStats = getEffectiveStats(state, defenderOwnerId, adj);
      if (adjStats.defence <= 0) {
        attacker.sp += adjStats.sp;
        events.push({
          type: "destroy",
          cardUid: adj.uid,
          owner: defenderOwnerId,
        });
        events.push({
          type: "sp_change",
          playerId: attackerId,
          amount: adjStats.sp,
        });
        killCreature(state, defenderOwnerId, adj.uid);
        // Dead Meme trigger on splash kill
        if (
          adj.abilityId === "dead_meme_revive" &&
          !adj._silenced &&
          !deadMemeTriggered
        ) {
          const topGrave = state.graveyard.slice(-6);
          if (topGrave.length > 0) {
            deadMemeTriggered = true;
            deadMemeChoice = {
              playerId: defenderOwnerId,
              type: "dead_meme",
              cards: topGrave,
              prompt:
                "Dead Meme died! Choose a card from the graveyard to return to your hand",
            };
          }
        }
      }
    }
  }

  // Tag the attack event with kill info so the client can show a killshot animation
  if (defenderKilled) {
    const atkEvt = events.find((e) => e.type === "attack");
    if (atkEvt) atkEvt.killshot = true;
  }

  return {
    defenderKilled,
    attackerKilled: false,
    spGained,
    events,
    deadMemeTriggered,
    deadMemeChoice,
  };
}

/** Remove creature from swamp and add to graveyard */
export function killCreature(state, ownerId, cardUid) {
  const player = state.players[ownerId];
  const idx = player.swamp.findIndex((c) => c.uid === cardUid);
  if (idx === -1) return;
  const [card] = player.swamp.splice(idx, 1);
  // Clean up temp state
  delete card._defenceDamage;
  delete card._attackBuff;
  delete card._defenceBuff;
  delete card._tempShield;
  delete card._invisible;
  delete card._controller;
  delete card._originalOwner;
  delete card._snaccReturn;
  delete card._stonerShield;
  delete card._silenced;
  delete card._hasMimicked;
  delete card._swapped;
  delete card._roundsRemaining;
  delete card._harambeOwner;
  state.graveyard.push(card);
}
