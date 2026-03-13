import { buildDeck, shuffleDeck } from './CardRegistry.js';
import {
  STARTING_HAND_SIZE,
  BASE_AP,
  GAME_PHASE,
  TURN_PHASE,
  WIN_SP,
} from '../../../shared/src/constants.js';

let nextGameId = 1;

export function createPlayerState(playerId, playerName) {
  return {
    id: playerId,
    name: playerName,
    sp: 0,
    ap: 0,
    hand: [],
    swamp: [],        // creatures/spells on field (max 5)
    gear: {           // armour slots (max 3 = head+body+feet)
      head: null,
      body: null,
      feet: null,
    },
    apPenalty: 0,     // AP reduction next turn (e.g. Viper)
    connected: true,
  };
}

export function createGameState(playerIds, playerNames) {
  const gameId = `game_${nextGameId++}`;
  const deck = shuffleDeck(buildDeck());

  const players = {};
  for (let i = 0; i < playerIds.length; i++) {
    players[playerIds[i]] = createPlayerState(playerIds[i], playerNames[i]);
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
    pendingTarget: null,    // { playerId, action, validTargets, ... }
    pendingChoice: null,    // { playerId, cards, ... }
    animations: [],         // queued animation events for client
  };

  // Deal starting hands
  for (const pid of playerIds) {
    for (let i = 0; i < STARTING_HAND_SIZE; i++) {
      drawCardRaw(state, pid);
    }
  }

  // Give first player their AP
  const firstPlayer = state.turnOrder[0];
  state.players[firstPlayer].ap = BASE_AP;

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
    state.animations.push({ type: 'deck_recycle' });
  }
}

export function getCurrentPlayer(state) {
  return state.players[state.turnOrder[state.currentTurnIndex]];
}

export function getCurrentPlayerId(state) {
  return state.turnOrder[state.currentTurnIndex];
}

export function getOtherPlayerIds(state, playerId) {
  return state.turnOrder.filter(id => id !== playerId);
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
    graveyard: state.graveyard.map(c => ({
      uid: c.uid, id: c.id, name: c.name, type: c.type,
      image: c.image, attack: c.attack, defence: c.defence,
      sp: c.sp, cost: c.cost, effect: c.effect, abilityId: c.abilityId,
    })),
    players,
    turnOrder: state.turnOrder,
    currentTurnIndex: state.currentTurnIndex,
    currentPlayerId: getCurrentPlayerId(state),
    turnNumber: state.turnNumber,
    winSP: state.winSP,
    winner: state.winner,
    pendingTarget: state.pendingTarget?.playerId === playerId ? state.pendingTarget : null,
    pendingChoice: state.pendingChoice?.playerId === playerId ? state.pendingChoice : null,
    animations: state.animations,
    myId: playerId,
  };
}
