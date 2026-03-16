/**
 * Bot chat system — event-triggered goblin trash talk + replies to player messages.
 */

import { ACTION } from "../../../shared/src/constants.js";

// Goblin-flavored lines by event type
const LINES = {
  play_creature: [
    "Get a load of THIS!",
    "Fresh meat for the swamp!",
    "Try and stop this one!",
    "Heheheh... here we go!",
    "This one's a BEAST!",
    "Say hello to me friend!",
    "Into the muck with ya!",
  ],
  play_spell: [
    "BOOM! Magic time!",
    "Didn't see that comin, did ya?",
    "Surprise, surprise!",
    "A lil' goblin magic!",
    "Ooh that's gonna sting!",
    "Taste me spell!",
  ],
  attack: [
    "SMASH!",
    "Take THAT!",
    "Get wrecked!",
    "Right in the face!",
    "Oi! That's gotta hurt!",
    "WAAAAGH!",
    "Goblin punch!",
    "Eat mud!",
  ],
  kill: [
    "Hahaha! DESTROYED!",
    "Down ya go!",
    "Another one bites the muck!",
    "CRUSHED!",
    "Rest in swamp!",
    "That's what you get!",
    "One less problem!",
  ],
  direct_attack: [
    "Straight to the face!",
    "No creatures? No problem!",
    "Wide open! CHARGE!",
    "Comin' right for ya!",
  ],
  draw: [
    "Ooh what's this?",
    "More cards for me!",
    "Let's see what we got...",
    "Gimme gimme!",
  ],
  end_turn: [
    "Your move, slowpoke",
    "Alright, go on then",
    "Beat that!",
    "Top that if you can",
    "Done. Make it quick.",
  ],
  lose_creature: [
    "OI! That was me best one!",
    "You'll pay for that!",
    "Grrrr...",
    "That's not fair!",
    "You'll regret that!",
  ],
  winning: [
    "Victory is MINE!",
    "Too easy!",
    "Hahaha! Goblin supremacy!",
    "Better luck next time!",
  ],
  low_sp: [
    "This isn't over yet!",
    "I'm just warming up!",
    "You think you've won?",
  ],
};

// Reply templates when a player sends a chat message
const REPLIES = [
  "Heh!",
  "Yeah yeah...",
  "Shut it!",
  "Less talkin, more playin!",
  "Whatever you say, smoothskin",
  "Blah blah blah",
  "Is that supposed to scare me?",
  "You talk too much!",
  "Oi!",
  "...",
  "Ha! Good one",
  "Keep dreamin'",
  "That's what they all say",
  "Watch it!",
  "Pfft",
];

// Emote replies (bot replies with an emote sometimes)
const EMOTE_REPLIES = ["heh", "rage", "skull", "smug", "goblin"];

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Track last message time per bot to avoid spam
const lastMessageTime = new Map();
const MIN_INTERVAL = 4000; // 4 seconds between bot messages

function canSend(botId) {
  const last = lastMessageTime.get(botId) || 0;
  return Date.now() - last >= MIN_INTERVAL;
}

function markSent(botId) {
  lastMessageTime.set(botId, Date.now());
}

/**
 * Generate a chat message for a bot action.
 * Returns { text } or { emoteKey } or null.
 */
export function generateBotChat(botId, action, result) {
  if (!canSend(botId)) return null;

  // Only chat ~40% of the time to not be annoying
  if (Math.random() > 0.4) return null;

  let lines = null;

  if (action.type === ACTION.PLAY_CARD) {
    // Check if creature or spell
    if (result?.cardType === "Creature") {
      lines = LINES.play_creature;
    } else {
      lines = LINES.play_spell;
    }
  } else if (action.type === ACTION.ATTACK) {
    if (result?.killed) {
      lines = LINES.kill;
    } else if (result?.directAttack) {
      lines = LINES.direct_attack;
    } else {
      lines = LINES.attack;
    }
  } else if (action.type === ACTION.END_TURN) {
    lines = LINES.end_turn;
  } else if (action.type === ACTION.DRAW_CARD) {
    // Only chat on draw ~20%
    if (Math.random() > 0.2) return null;
    lines = LINES.draw;
  }

  if (!lines) return null;

  markSent(botId);
  return { text: pick(lines) };
}

/**
 * Generate a reaction to game events (creature dying, SP milestones).
 */
export function generateBotReaction(botId, event) {
  if (!canSend(botId)) return null;
  if (Math.random() > 0.5) return null;

  let lines = null;

  if (event === "creature_died") {
    lines = LINES.lose_creature;
  } else if (event === "winning") {
    lines = LINES.winning;
  } else if (event === "low_sp") {
    lines = LINES.low_sp;
  }

  if (!lines) return null;

  markSent(botId);
  return { text: pick(lines) };
}

/**
 * Generate a reply to a player's chat message.
 * Returns { text } or { emoteKey } or null.
 */
export function generateBotReply(botId) {
  if (!canSend(botId)) return null;

  // Reply ~35% of the time
  if (Math.random() > 0.35) return null;

  markSent(botId);

  // 25% chance of replying with an emote instead of text
  if (Math.random() < 0.25) {
    return { emoteKey: pick(EMOTE_REPLIES) };
  }

  return { text: pick(REPLIES) };
}

/**
 * Clear tracking for a bot (on remove/disconnect).
 */
export function clearBotChat(botId) {
  lastMessageTime.delete(botId);
}
