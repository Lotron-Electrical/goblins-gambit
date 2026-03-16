/**
 * Animation queue hook.
 * Processes animation events sequentially, blocking input during playback.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { soundManager } from "../audio/SoundManager.js";

const ANIMATION_DURATIONS = {
  card_played: 400,
  draw_card: 350,
  attack: 500,
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
  // Event system
  volcano_active: 1500,
  dragon_spawn: 2000,
  dragon_attack: 1000,
  dragon_killed: 2000,
  jargon_arrival: 1500,
  jargon_departure: 800,
  volcano_deposit: 800,
  volcano_withdraw: 800,
};

const SOUND_MAP = {
  card_played: (evt) => {
    if (evt.zone === "swamp") return "creature_play";
    if (evt.card?.type === "Magic") return "magic_cast";
    if (evt.card?.type === "Tricks") return "trick_play";
    return "creature_play";
  },
  draw_card: "draw",
  attack: (evt) =>
    evt.directAttack ? "direct_attack" : evt.killshot ? "killshot" : "attack",
  damage: "damage",
  destroy: (evt) =>
    evt.reason?.includes("expired") ? "armour_break" : "death",
  sp_change: (evt) => (evt.amount > 0 ? "sp_gain" : null),
  equip_armour: "armour_equip",
  set_complete: "set_complete",
  dice_roll: "dice_roll",
  turn_start: "turn_start",
  game_over: "victory",
  ability_used: "ability_used",
  volcano_active: "volcano_rumble",
  dragon_spawn: "dragon_roar",
  dragon_attack: "dragon_roar",
  dragon_killed: "victory",
  jargon_arrival: "jargon_chime",
  volcano_deposit: "sp_gain",
  volcano_withdraw: "sp_gain",
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
      const soundName =
        typeof soundEntry === "function" ? soundEntry(evt) : soundEntry;
      if (soundName) soundManager.play(soundName);
    }

    // Show announcement for turn skips (Lagg)
    if (evt.type === "turn_skipped") {
      setAnnouncement({
        name: "Lagg",
        type: "Magic",
        flavor: "TURN SKIPPED!",
      });
      setTimeout(() => setAnnouncement(null), 1500);
    }

    // Show announcement for buff events with notable text (e.g. Catfish mimic)
    if (evt.type === "buff" && evt.text) {
      setAnnouncement({
        name: "Ability",
        type: "Creature",
        flavor: evt.text,
      });
      setTimeout(() => setAnnouncement(null), 1800);
    }

    // Show announcement for event system
    if (
      [
        "volcano_active",
        "dragon_spawn",
        "dragon_killed",
        "jargon_arrival",
        "jargon_departure",
        "dragon_attack",
      ].includes(evt.type)
    ) {
      setAnnouncement({
        name:
          evt.type === "dragon_spawn" ||
          evt.type === "dragon_attack" ||
          evt.type === "dragon_killed"
            ? "Dragon"
            : evt.type === "jargon_arrival" || evt.type === "jargon_departure"
              ? "Jargon"
              : "Volcano",
        type: "Event",
        flavor: evt.text,
      });
      setTimeout(() => setAnnouncement(null), 2500);
    }

    // Show announcement for first-player bonus
    if (evt.type === "first_player_bonus") {
      setAnnouncement({
        name: "First Player",
        type: "Magic",
        flavor: evt.text,
      });
      setTimeout(() => setAnnouncement(null), 2000);
    }

    // Show announcement for card stolen (Finesse)
    if (evt.type === "card_stolen" && evt.card) {
      setAnnouncement({
        name: "Finesse",
        type: "Magic",
        flavor: `STOLE ${evt.card.name.toUpperCase()}!`,
      });
      setTimeout(() => setAnnouncement(null), 1500);
    }

    // Show announcement for card plays
    if (evt.type === "card_played" && evt.card) {
      setAnnouncement({
        name: evt.card.name,
        type: evt.card.type,
        flavor: getFlavorText(evt.card),
      });
      setTimeout(() => setAnnouncement(null), 1500);
    }

    let duration = ANIMATION_DURATIONS[evt.type] || 200;
    // Give killshots and direct attacks more time for their animations
    if (evt.type === "attack" && evt.killshot) duration = 650;
    if (evt.type === "attack" && evt.directAttack) duration = 950;
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
    Harambe: "REST IN PEACE, KING",
    Karen: "SHE'D LIKE TO SPEAK TO THE MANAGER",
    STFU: "SILENCE!",
    "Tik Tok Thot": "INSTANT DEATH",
    Yeet: "YEET!",
    Savage: "ABSOLUTELY SAVAGE",
    Smesh: "SMESHED IT",
    Snacc: "LOOKING LIKE A SNACC",
    Judgment: "JUDGMENT DAY",
    Finesse: "FINESSED",
    Lerker: "LURKING IN THE SHADOWS...",
    "Gamer Boy": "COME AT ME BRO",
    Ghost: "...",
    Catfish: "NOT WHO THEY SEEM",
    "Dead Meme": "BACK FROM THE DEAD",
    Zucc: "YOUR DATA IS MINE NOW",
    "Crack Head": "DOUBLE TROUBLE",
    "Rhy Bear": "FEEL THE RHYME",
    Troll: "U MAD BRO?",
    Stoner: "CHIIIIILL",
    Woke: "STAY WOKE",
    Lagg: "BUFFERING...",
    AMA: "ASK ME ANYTHING",
    "Christ Air": "LEGENDARY TRICK!",
    Hardflip: "CLEAN!",
  };
  return flavors[card.name] || null;
}
