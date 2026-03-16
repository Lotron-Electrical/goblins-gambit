/**
 * Trick card ability handlers.
 * Tricks are free actions (cost 0) — SP gains and dice rolls.
 */

export function trick_sp(state, playerId, card, cardIdx, targetInfo) {
  const player = state.players[playerId];
  player.ap -= card._effectiveCost ?? card.cost;
  player.hand.splice(cardIdx, 1);
  player.sp += card.sp;
  const events = [
    { type: "card_played", cardUid: card.uid, card, playerId },
    { type: "sp_change", playerId, amount: card.sp, reason: card.name },
  ];
  state.graveyard.push(card);
  return { success: true, events };
}

export function horse_dice(state, playerId, card, cardIdx, targetInfo) {
  const player = state.players[playerId];
  player.ap -= card._effectiveCost ?? card.cost;
  player.hand.splice(cardIdx, 1);
  const d1 = Math.ceil(Math.random() * 6);
  const d2 = Math.ceil(Math.random() * 6);
  const spGain = (d1 + d2) * 100;
  player.sp += spGain;
  const events = [
    { type: "card_played", cardUid: card.uid, card, playerId },
    { type: "dice_roll", dice: [d1, d2], result: spGain, playerId },
    { type: "sp_change", playerId, amount: spGain, reason: "H.O.R.S.E" },
  ];
  state.graveyard.push(card);
  return { success: true, events };
}
