/**
 * Animation queue hook.
 * Processes animation events sequentially, blocking input during playback.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { soundManager } from '../audio/SoundManager.js';

const ANIMATION_DURATIONS = {
  card_played: 400,
  draw_card: 350,
  attack: 350,
  damage: 850,
  destroy: 300,
  sp_change: 900,
  buff: 200,
  equip_armour: 300,
  set_complete: 600,
  dice_roll: 2200,
  turn_start: 500,
  turn_skipped: 800,
  game_over: 1500,
  card_moved: 400,
  card_discarded: 300,
  card_stolen: 400,
  hand_revealed: 300,
  deck_peek: 500,
  ability_used: 250,
  cards_discarded: 200,
  card_recovered: 400,
  deck_recycle: 400,
  first_player_bonus: 2000,
};

const SOUND_MAP = {
  card_played: (evt) => {
    if (evt.zone === 'swamp') return 'creature_play';
    if (evt.card?.type === 'Magic') return 'magic_cast';
    if (evt.card?.type === 'Tricks') return 'trick_play';
    return 'creature_play';
  },
  draw_card: 'draw',
  attack: 'attack',
  damage: 'damage',
  destroy: (evt) => evt.reason?.includes('expired') ? 'armour_break' : 'death',
  sp_change: (evt) => evt.amount > 0 ? 'sp_gain' : null,
  equip_armour: 'armour_equip',
  set_complete: 'set_complete',
  dice_roll: 'dice_roll',
  turn_start: 'turn_start',
  game_over: 'victory',
  ability_used: 'ability_used',
};

export function useAnimationQueue(animations) {
  const [currentAnimation, setCurrentAnimation] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [announcement, setAnnouncement] = useState(null);
  const queueRef = useRef([]);
  const processingRef = useRef(false);

  const processNext = useCallback(() => {
    if (queueRef.current.length === 0) {
      setIsAnimating(false);
      setCurrentAnimation(null);
      processingRef.current = false;
      return;
    }

    processingRef.current = true;
    setIsAnimating(true);
    const evt = queueRef.current.shift();
    setCurrentAnimation(evt);

    // Play sound
    const soundEntry = SOUND_MAP[evt.type];
    if (soundEntry) {
      const soundName = typeof soundEntry === 'function' ? soundEntry(evt) : soundEntry;
      if (soundName) soundManager.play(soundName);
    }

    // Show announcement for turn skips (Lagg)
    if (evt.type === 'turn_skipped') {
      setAnnouncement({
        name: 'Lagg',
        type: 'Magic',
        flavor: 'TURN SKIPPED!',
      });
      setTimeout(() => setAnnouncement(null), 1500);
    }

    // Show announcement for buff events with notable text (e.g. Catfish mimic)
    if (evt.type === 'buff' && evt.text) {
      setAnnouncement({
        name: 'Ability',
        type: 'Creature',
        flavor: evt.text,
      });
      setTimeout(() => setAnnouncement(null), 1800);
    }

    // Show announcement for first-player bonus
    if (evt.type === 'first_player_bonus') {
      setAnnouncement({
        name: 'First Player',
        type: 'Magic',
        flavor: evt.text,
      });
      setTimeout(() => setAnnouncement(null), 2000);
    }

    // Show announcement for card plays
    if (evt.type === 'card_played' && evt.card) {
      setAnnouncement({
        name: evt.card.name,
        type: evt.card.type,
        flavor: getFlavorText(evt.card),
      });
      setTimeout(() => setAnnouncement(null), 1500);
    }

    const duration = ANIMATION_DURATIONS[evt.type] || 200;
    setTimeout(processNext, duration);
  }, []);

  useEffect(() => {
    if (!animations || animations.length === 0) return;
    queueRef.current.push(...animations);
    if (!processingRef.current) {
      processNext();
    }
  }, [animations, processNext]);

  return { currentAnimation, isAnimating, announcement };
}

function getFlavorText(card) {
  const flavors = {
    'Harambe': 'REST IN PEACE, KING',
    'Karen': "SHE'D LIKE TO SPEAK TO THE MANAGER",
    'STFU': 'SILENCE!',
    'Tik Tok Thot': 'INSTANT DEATH',
    'Yeet': 'YEET!',
    'Savage': 'ABSOLUTELY SAVAGE',
    'Smesh': 'SMESHED IT',
    'Snacc': 'LOOKING LIKE A SNACC',
    'Judgment': 'JUDGMENT DAY',
    'Finesse': 'FINESSED',
    'Lerker': 'LURKING IN THE SHADOWS...',
    'Gamer Boy': 'COME AT ME BRO',
    'Ghost': '...',
    'Catfish': 'NOT WHO THEY SEEM',
    'Dead Meme': 'BACK FROM THE DEAD',
    'Zucc': 'YOUR DATA IS MINE NOW',
    'Crack Head': 'DOUBLE TROUBLE',
    'Rhy Bear': 'FEEL THE RHYME',
    'Troll': 'U MAD BRO?',
    'Stoner': 'CHIIIIILL',
    'Woke': 'STAY WOKE',
    'Lagg': 'BUFFERING...',
    'AMA': 'ASK ME ANYTHING',
    'Christ Air': 'LEGENDARY TRICK!',
    'Hardflip': 'CLEAN!',
  };
  return flavors[card.name] || null;
}
