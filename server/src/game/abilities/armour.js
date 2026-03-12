/**
 * Armour ability handlers.
 * Each handler is called when an armour piece is equipped.
 * Set bonuses are checked after equipping.
 */

// --- Lucky Shield: each piece adds SP shield. Set bonus +500. ---
// The shield amounts are stored on the card data (shieldAmount).
// Actual damage reduction is computed in getEffectiveStats / combat.
export function lucky_shield(state, playerId, card, events) {
  // Passive — shield computed during damage resolution
  return { success: true, events };
}

// --- Crystal Income: SP per round ---
// Handled in GameEngine.handleEndTurn
export function crystal_income(state, playerId, card, events) {
  return { success: true, events };
}

// --- Hessian Discount: reduce AP purchase cost ---
// Handled in GameEngine.handleBuyAP
export function hessian_discount(state, playerId, card, events) {
  return { success: true, events };
}

// --- Rusty Block: block card types ---
// Handled in EffectResolver.resolvePlayCard (pre-check)
export function rusty_block(state, playerId, card, events) {
  return { success: true, events };
}

// --- Cursed Set Bonus: when 3rd piece equipped, swap SP totals with opponent ---
export function cursed_set_bonus(state, playerId, targetOwnerId, events) {
  const player = state.players[playerId];
  const target = state.players[targetOwnerId];
  if (player && target) {
    const temp = player.sp;
    player.sp = target.sp;
    target.sp = temp;
    events.push({ type: 'sp_change', playerId, amount: target.sp - temp, reason: 'Cursed set - SP swapped!' });
    events.push({ type: 'sp_change', playerId: targetOwnerId, amount: temp - target.sp, reason: 'Cursed set - SP swapped!' });
  }
  return { success: true, events };
}

/**
 * Get total Lucky shield for a player.
 */
export function getLuckyShield(player) {
  let shield = 0;
  let luckyCount = 0;
  for (const slot of ['head', 'body', 'feet']) {
    const armour = player.gear[slot];
    if (armour?.abilityId === 'lucky_shield') {
      shield += armour.shieldAmount || 0;
      luckyCount++;
    }
  }
  if (luckyCount === 3) shield += 500; // set bonus
  return shield;
}
