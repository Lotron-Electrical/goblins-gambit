/**
 * Client-side ability info for UI display.
 */

const ACTIVATED_ABILITIES = new Set([
  'stoner_shield',
  'thief_steal',
  'king_thief_steal',
  'troll_swap',
  'saving_grace_multi',
  'rhy_bear_split',
  'crack_head_multi',
]);

export function hasActivatedAbility(abilityId) {
  return ACTIVATED_ABILITIES.has(abilityId);
}
