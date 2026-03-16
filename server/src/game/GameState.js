import { buildDeck, shuffleDeck } from "./CardRegistry.js";
import {
  STARTING_HAND_SIZE,
  BASE_AP,
  GAME_PHASE,
  TURN_PHASE,
  WIN_SP,
  THEME_EFFECTS,
  EVENT_DRAGON_BASE_DEF,
} from "../../../shared/src/constants.js";
import { isLastPlace } from "./abilities/helpers.js";

let nextGameId = 1;

export function createPlayerState(playerId, playerName) {
  return {
    id: playerId,
    name: playerName,
    sp: 0,
    ap: 0,
    hand: [],
    swamp: [], // creatures/spells on field (max 5)
    gear: {
      // armour slots (max 3 = head+body+feet)
      head: null,
      body: null,
      feet: null,
    },
    apPenalty: 0, // AP reduction next turn (e.g. Viper)
    playerShield: 0, // shield vs direct SP attacks (Lucky armour, Digital Artist)
    connected: true,
  };
}

export function createGameState(playerIds, playerNames, settings = {}) {
  const gameId = `game_${nextGameId++}`;
  const deck = shuffleDeck(buildDeck());

  const startingSP = settings.startingSP || 0;
  const startingHandSize = settings.startingHandSize || STARTING_HAND_SIZE;
  const baseAP = settings.baseAP || BASE_AP;

  const players = {};
  for (let i = 0; i < playerIds.length; i++) {
    const p = createPlayerState(playerIds[i], playerNames[i]);
    p.sp = startingSP;
    players[playerIds[i]] = p;
  }

  const state = {
    id: gameId,
    phase: GAME_PHASE.PLAYING,
    turnPhase: TURN_PHASE.MAIN,
    deck,
    graveyard: [],
    players,
    turnOrder: [...playerIds],
    currentTurnIndex: 0,
    turnNumber: 1,
    winSP: WIN_SP,
    winner: null,
    actionLog: [],
    pendingTarget: null, // { playerId, action, validTargets, ... }
    pendingChoice: null, // { playerId, cards, ... }
    animations: [], // queued animation events for client
    baseAP, // custom base AP for this game

    // Event system
    eventsEnabled: !!settings.eventsEnabled,
    turnCycleCount: 0, // increments each time turn wraps to player 0
    volcano: {
      active: false,
      deposits: {}, // playerId -> [{ amount, interestRate, maturesIn, depositedAt }]
      totalBanked: 0,
    },
    dragon: {
      active: false,
      currentHP: 0,
      maxHP: 0,
      damageByPlayer: {}, // playerId -> totalDamage
    },
    jargon: {
      active: false,
      cyclesRemaining: 0,
    },
  };

  // Initialize per-player stats
  state.stats = {};
  for (const pid of playerIds) {
    state.stats[pid] = {
      cardsPlayed: 0,
      creaturesPlayed: 0,
      creaturesKilled: 0,
      damageDealt: 0,
      spEarned: 0,
      cardsDrawn: 0,
      abilitiesUsed: 0,
      creatureStats: {}, // uid -> { name, kills, damageDealt }
    };
  }

  // Deal starting hands
  for (const pid of playerIds) {
    for (let i = 0; i < startingHandSize; i++) {
      drawCardRaw(state, pid);
    }
  }

  // First-player compensation: +1 card, +1 AP
  const firstPlayer = state.turnOrder[0];
  drawCardRaw(state, firstPlayer);
  state.players[firstPlayer].ap = baseAP + 1;
  state.animations.push({
    type: "first_player_bonus",
    playerId: firstPlayer,
    text: "First Player Bonus: +1 card, +1 AP",
  });

  return state;
}

/** Draw a card without AP cost (used for initial deal and effects) */
export function drawCardRaw(state, playerId) {
  recycleDeckIfNeeded(state);
  if (state.deck.length === 0) return null;

  const card = state.deck.pop();
  state.players[playerId].hand.push(card);
  return card;
}

/** Recycle graveyard into deck when deck is empty */
export function recycleDeckIfNeeded(state) {
  if (state.deck.length === 0 && state.graveyard.length > 0) {
    state.deck = shuffleDeck(state.graveyard);
    state.graveyard = [];
    state.animations.push({ type: "deck_recycle" });
  }
}

export function getCurrentPlayer(state) {
  return state.players[state.turnOrder[state.currentTurnIndex]];
}

export function getCurrentPlayerId(state) {
  return state.turnOrder[state.currentTurnIndex];
}

export function getOtherPlayerIds(state, playerId) {
  return state.turnOrder.filter((id) => id !== playerId);
}

/** Get the client-visible state for a specific player (hides opponents' hands) */
export function getClientState(state, playerId) {
  // Check if AMA reveals any hands to this player
  const revealedFor = state._revealedHands?.[playerId] || [];

  const players = {};
  for (const [pid, p] of Object.entries(state.players)) {
    if (pid === playerId) {
      players[pid] = { ...p };
    } else if (revealedFor.includes(pid)) {
      // AMA: show this opponent's hand
      players[pid] = { ...p, handCount: p.hand.length, _revealed: true };
    } else {
      players[pid] = {
        ...p,
        hand: p.hand.map(() => ({ hidden: true })),
        handCount: p.hand.length,
      };
    }
  }

  return {
    id: state.id,
    phase: state.phase,
    turnPhase: state.turnPhase,
    deckCount: state.deck.length,
    graveyardCount: state.graveyard.length,
    // Graveyard is intentionally public — all players can see discarded/killed cards
    graveyard: state.graveyard.map((c) => ({
      uid: c.uid,
      id: c.id,
      name: c.name,
      type: c.type,
      image: c.image,
      attack: c.attack,
      defence: c.defence,
      sp: c.sp,
      cost: c.cost,
      effect: c.effect,
      abilityId: c.abilityId,
    })),
    players,
    turnOrder: state.turnOrder,
    currentTurnIndex: state.currentTurnIndex,
    currentPlayerId: getCurrentPlayerId(state),
    turnNumber: state.turnNumber,
    winSP: state.winSP,
    winner: state.winner,
    pendingTarget:
      state.pendingTarget?.playerId === playerId ? state.pendingTarget : null,
    pendingChoice:
      state.pendingChoice?.playerId === playerId ? state.pendingChoice : null,
    animations: state.animations.map((evt) => {
      // Strip hand data from hand_revealed for non-casters
      if (evt.type === "hand_revealed" && evt.viewerId !== playerId) {
        return { ...evt, hand: undefined };
      }
      return evt;
    }),
    myId: playerId,
    theme: state.theme || "swamp",
    berserkPlayerIds: getBerserkPlayerIds(state),
    ...(state.winner ? { stats: state.stats } : {}),

    // Event system (only if enabled)
    ...(state.eventsEnabled
      ? {
          eventsEnabled: true,
          volcano: {
            active: state.volcano.active,
            totalBanked: state.volcano.totalBanked,
            // Show own deposits with timers, opponents only see total
            myDeposits: state.volcano.deposits[playerId] || [],
            depositCounts: Object.fromEntries(
              Object.entries(state.volcano.deposits).map(([pid, deps]) => [
                pid,
                deps.length,
              ]),
            ),
          },
          dragon: state.dragon.active
            ? {
                active: true,
                currentHP: state.dragon.currentHP,
                maxHP: state.dragon.maxHP,
                damageByPlayer: state.dragon.damageByPlayer,
              }
            : { active: false },
          jargon: {
            active: state.jargon.active,
            cyclesRemaining: state.jargon.cyclesRemaining,
          },
        }
      : {}),
  };
}

/** Get IDs of players who are Berserk (last place in Blood Moon, only when leader is past halfway and gap >= 2000) */
function getBerserkPlayerIds(state) {
  const themeEffects = THEME_EFFECTS[state.theme];
  if (!themeEffects?.berserkMultiplier || themeEffects.berserkMultiplier <= 1)
    return [];

  const players = Object.entries(state.players);
  if (players.length < 2) return [];

  const spValues = players.map(([, p]) => p.sp);
  const maxSP = Math.max(...spValues);
  const minSP = Math.min(...spValues);
  const halfWin = state.winSP / 2;

  // Only activate when leader is past halfway and gap is >= 2000
  if (maxSP < halfWin || maxSP - minSP < 2000) return [];

  // All players tied at min SP go berserk (unless everyone is tied)
  const allTied = spValues.every((sp) => sp === minSP);
  if (allTied) return [];

  return players.filter(([, p]) => p.sp === minSP).map(([id]) => id);
}
