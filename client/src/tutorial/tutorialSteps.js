// Tutorial step definitions — pure data
// Each step has a fabricated gameState snapshot and expected player action

import cardData from '../../../shared/src/cardData.json';

// Helper to build a card object from cardData with tutorial uid
function tutCard(cardId, uidSuffix) {
  const base = cardData.find(c => c.id === cardId);
  if (!base) throw new Error(`Tutorial card not found: ${cardId}`);
  return {
    ...base,
    uid: `tut-${uidSuffix || cardId}`,
    currentAttack: base.attack,
    currentDefence: base.defence,
    shield: 0,
    turnsOnField: 0,
    hasAttacked: false,
    invisible: false,
    silenced: false,
    taunting: false,
    originalOwner: null,
  };
}

// Base game state template
function baseState(overrides = {}) {
  return {
    myId: 'tutorial-player',
    players: {
      'tutorial-player': {
        id: 'tutorial-player',
        name: 'You',
        sp: 0,
        ap: 2,
        hand: [],
        swamp: [],
        gear: { head: null, body: null, feet: null },
        eliminated: false,
        connected: true,
        playerShield: 0,
        apPenalty: 0,
        handCount: 0,
      },
      'tutorial-opponent': {
        id: 'tutorial-opponent',
        name: 'Gnarl the Goblin',
        sp: 0,
        ap: 0,
        hand: [],
        swamp: [],
        gear: { head: null, body: null, feet: null },
        eliminated: false,
        connected: true,
        playerShield: 0,
        apPenalty: 0,
        handCount: 5,
      },
    },
    currentPlayerId: 'tutorial-player',
    turnNumber: 1,
    deckCount: 40,
    graveyardCount: 0,
    phase: 'playing',
    turnPhase: 'main',
    theme: 'swamp',
    winSP: 10000,
    pendingTarget: null,
    pendingChoice: null,
    winner: null,
    animations: [],
    graveyard: [],
    volcano: null,
    dragon: null,
    jargon: null,
    ...overrides,
  };
}

// Pre-build tutorial cards
const happyHippy = () => tutCard('happy_hippy', 'happy-hippy');
const kickflip = () => tutCard('kickflip', 'kickflip');
const programmer = () => tutCard('programmer', 'programmer');
const ooft = () => tutCard('ooft', 'ooft');
const stoner = () => tutCard('stoner', 'stoner');

export const TUTORIAL_STEPS = [
  // Step 1: Draw a Card
  {
    id: 'draw',
    title: 'Draw a Card',
    instruction: 'Welcome to Goblin\'s Gambit! Reach 10,000 SP to win. Start by drawing a card — tap Draw.',
    highlight: '[data-tutorial="draw-btn"]',
    tabHint: null,
    expectedAction: 'draw_card',
    setupState: () => {
      const state = baseState();
      state.players['tutorial-player'].ap = 2;
      state.players['tutorial-player'].hand = [happyHippy(), kickflip(), programmer()];
      state.players['tutorial-player'].handCount = 3;
      return state;
    },
    onComplete: (prevState) => {
      const state = JSON.parse(JSON.stringify(prevState));
      const card = ooft();
      state.players['tutorial-player'].hand.push(card);
      state.players['tutorial-player'].handCount = 4;
      state.players['tutorial-player'].ap = 1;
      state.deckCount = 39;
      return state;
    },
  },

  // Step 2: Play a Trick
  {
    id: 'play-trick',
    title: 'Play a Trick',
    instruction: 'Nice draw! Tricks are free and give instant SP. Tap Kickflip to select it, then tap again to play.',
    highlight: null, // Will highlight the card in hand
    highlightCardUid: 'tut-kickflip',
    tabHint: 'Tricks',
    expectedAction: 'play_card',
    expectedPayload: { cardUid: 'tut-kickflip' },
    setupState: null, // Uses onComplete from previous step
    onComplete: (prevState) => {
      const state = JSON.parse(JSON.stringify(prevState));
      state.players['tutorial-player'].hand = state.players['tutorial-player'].hand.filter(c => c.uid !== 'tut-kickflip');
      state.players['tutorial-player'].handCount = 3;
      state.players['tutorial-player'].sp = 500;
      return state;
    },
  },

  // Step 3: Play a Creature
  {
    id: 'play-creature',
    title: 'Summon a Creature',
    instruction: 'Now summon a creature to your Swamp. Tap Happy Hippy, then tap an empty swamp slot.',
    highlight: null,
    highlightCardUid: 'tut-happy-hippy',
    tabHint: 'Creature',
    expectedAction: 'play_card',
    expectedPayload: { cardUid: 'tut-happy-hippy' },
    setupState: null,
    onComplete: (prevState) => {
      const state = JSON.parse(JSON.stringify(prevState));
      const card = state.players['tutorial-player'].hand.find(c => c.uid === 'tut-happy-hippy');
      state.players['tutorial-player'].hand = state.players['tutorial-player'].hand.filter(c => c.uid !== 'tut-happy-hippy');
      state.players['tutorial-player'].handCount = 2;
      state.players['tutorial-player'].swamp = [{ ...card, turnsOnField: 0 }];
      state.players['tutorial-player'].ap = 0;
      return state;
    },
  },

  // Step 4: End Turn + Opponent Turn
  {
    id: 'end-turn',
    title: 'End Your Turn',
    instruction: 'Out of AP! Tap End Turn to pass.',
    highlight: '[data-tutorial="end-turn-btn"]',
    tabHint: null,
    expectedAction: 'end_turn',
    setupState: null,
    opponentDelay: true, // Triggers "Gnarl is thinking..." interstitial
    onComplete: (prevState) => {
      const state = JSON.parse(JSON.stringify(prevState));
      // Opponent places Stoner
      const opponentStoner = stoner();
      opponentStoner.currentAttack = 400;
      opponentStoner.currentDefence = 200;
      state.players['tutorial-opponent'].swamp = [opponentStoner];
      state.players['tutorial-opponent'].handCount = 4;
      // New turn for player
      state.currentPlayerId = 'tutorial-player';
      state.turnNumber = 2;
      state.players['tutorial-player'].ap = 2;
      // Happy Hippy has been on field 1 turn
      if (state.players['tutorial-player'].swamp[0]) {
        state.players['tutorial-player'].swamp[0].turnsOnField = 1;
        state.players['tutorial-player'].swamp[0].hasAttacked = false;
      }
      return state;
    },
  },

  // Step 5: Attack!
  {
    id: 'attack',
    title: 'Attack!',
    instruction: 'Gnarl played a creature! Tap your Happy Hippy on the field, then tap Gnarl\'s Stoner to attack. Your 400 ATK vs 200 DEF = a kill! You earn 420 SP.',
    highlight: null,
    tabHint: null,
    expectedAction: 'attack',
    expectedPayload: { attackerUid: 'tut-happy-hippy' },
    setupState: null,
    onComplete: (prevState) => {
      const state = JSON.parse(JSON.stringify(prevState));
      // Stoner destroyed
      state.players['tutorial-opponent'].swamp = [];
      // Player gains SP
      state.players['tutorial-player'].sp = 500 + 420;
      // Happy Hippy has attacked
      state.players['tutorial-player'].swamp[0].hasAttacked = true;
      state.graveyardCount = 1;
      return state;
    },
  },

  // Step 6: Play a Magic Card
  {
    id: 'play-magic',
    title: 'Use Magic',
    instruction: 'Magic cards have powerful effects! Tap Ooft to buff Happy Hippy\'s ATK by +200.',
    highlight: null,
    highlightCardUid: 'tut-ooft',
    tabHint: 'Magic',
    expectedAction: 'play_card',
    expectedPayload: { cardUid: 'tut-ooft' },
    setupState: null,
    onComplete: (prevState) => {
      const state = JSON.parse(JSON.stringify(prevState));
      // Remove Ooft from hand
      state.players['tutorial-player'].hand = state.players['tutorial-player'].hand.filter(c => c.uid !== 'tut-ooft');
      state.players['tutorial-player'].handCount = 1;
      // Buff Happy Hippy
      state.players['tutorial-player'].swamp[0].currentAttack = 600;
      state.players['tutorial-player'].ap = 1;
      state.graveyardCount = 2;
      return state;
    },
  },

  // Step 7: Tutorial Complete (no action needed)
  {
    id: 'complete',
    title: 'Tutorial Complete!',
    instruction: null, // Completion overlay handles this
    highlight: null,
    tabHint: null,
    expectedAction: null, // No action — completion screen shown
    setupState: null,
    onComplete: null,
  },
];
