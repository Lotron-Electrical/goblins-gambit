/**
 * Ability Registry — maps abilityId to handler functions.
 *
 * Handler signature for on-play abilities:
 *   handler(state, playerId, card, cardIdx, targetInfo) => { success, events, needsTarget?, targetRequest?, error? }
 *
 * Handler signature for activated abilities:
 *   handler(state, playerId, card, targetInfo) => { success, events, needsTarget?, targetRequest?, error? }
 */

// On-play: Tricks
import { trick_sp, horse_dice } from './tricks.js';

// On-play: Creatures
import {
  streamer_draw, ghost_invisible, thot_instakill, stoner_shield,
  thief_steal, king_thief_steal, troll_swap, saving_grace_multi,
  dead_meme_revive, zucc_steal, crack_head_multi, harambe_plant,
  rhy_bear_split, catfish_mimic,
} from './creatures.js';

// On-play: Magic
import {
  smesh_damage, savage_destroy, ooft_buff, thicc_buff,
  judgment_steal, yeet_discard, ama_reveal, finesse_steal,
  woke_peek, snacc_control, lerker_draw, stfu_silence, lagg_delay,
} from './magic.js';

// Activated abilities (used from field)
import {
  activate_stoner_shield, activate_thief_steal, activate_king_thief_steal,
  activate_troll_swap, activate_saving_grace, activate_rhy_bear_split,
  activate_crack_head_multi,
} from './activated.js';

/**
 * On-play ability registry.
 * Key: abilityId from cardData.json
 * Value: handler function
 */
export const onPlayRegistry = {
  // Tricks
  trick_sp,
  horse_dice,

  // Creatures (on-play effects)
  streamer_draw,
  ghost_invisible,
  thot_instakill,
  stoner_shield,
  thief_steal,
  king_thief_steal,
  troll_swap,
  saving_grace_multi,
  dead_meme_revive,
  zucc_steal,
  crack_head_multi,
  harambe_plant,
  rhy_bear_split,
  catfish_mimic,

  // Magic
  smesh_damage,
  savage_destroy,
  ooft_buff,
  thicc_buff,
  judgment_steal,
  yeet_discard,
  ama_reveal,
  finesse_steal,
  woke_peek,
  snacc_control,
  lerker_draw,
  stfu_silence,
  lagg_delay,
};

/**
 * Activated ability registry (used from field via USE_ABILITY action).
 * Key: abilityId from cardData.json
 * Value: handler function
 */
export const activatedRegistry = {
  stoner_shield: activate_stoner_shield,
  thief_steal: activate_thief_steal,
  king_thief_steal: activate_king_thief_steal,
  troll_swap: activate_troll_swap,
  saving_grace_multi: activate_saving_grace,
  rhy_bear_split: activate_rhy_bear_split,
  crack_head_multi: activate_crack_head_multi,
};

/**
 * Check if an abilityId has an activated (from-field) ability.
 */
export function hasActivatedAbility(abilityId) {
  return abilityId in activatedRegistry;
}
