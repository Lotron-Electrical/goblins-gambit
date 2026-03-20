// Tutorial step definitions — pure data
// Each step has a fabricated gameState snapshot and expected player action

import cardData from "../../../shared/src/cardData.json";

// Helper to build a card object from cardData with tutorial uid
function tutCard(cardId, uidSuffix) {
  const base = cardData.find((c) => c.id === cardId);
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
    myId: "tutorial-player",
    players: {
      "tutorial-player": {
        id: "tutorial-player",
        name: "You",
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
      "tutorial-opponent": {
        id: "tutorial-opponent",
        name: "Gnarl the Goblin",
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
    currentPlayerId: "tutorial-player",
    turnNumber: 1,
    deckCount: 40,
    graveyardCount: 0,
    phase: "playing",
    turnPhase: "main",
    theme: "swamp",
    winSP: 2000,
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
const happyHippy = () => tutCard("happy_hippy", "happy-hippy");
const kickflip = () => tutCard("kickflip", "kickflip");
const programmer = () => tutCard("programmer", "programmer");
const ooft = () => tutCard("ooft", "ooft");
const stoner = () => tutCard("stoner", "stoner");
const luckyHeadband = () => tutCard("lucky_headband", "lucky-headband");
const luckyChestplate = () => tutCard("lucky_chestplate", "lucky-chestplate");
const luckySocks = () => tutCard("lucky_socks", "lucky-socks");

export const TUTORIAL_STEPS = [
  // Step 1: Draw a Card
  {
    id: "draw",
    title: "Draw a Card",
    gnarlMessage:
      "Welcome to the swamp, smoothskin! Goal's simple — get to 2,000 SP before I do. Now draw a card, go on! Tap that Draw button.",
    instruction:
      "Welcome to Goblin's Gambit! Reach 2,000 SP to win. Start by drawing a card — tap Draw.",
    highlight: '[data-tutorial="draw-btn"]',
    tabHint: null,
    expectedAction: "draw_card",
    setupState: () => {
      const state = baseState();
      state.players["tutorial-player"].ap = 2;
      state.players["tutorial-player"].hand = [
        happyHippy(),
        ooft(),
        programmer(),
      ];
      state.players["tutorial-player"].handCount = 3;
      return state;
    },
    onComplete: (prevState) => {
      const state = JSON.parse(JSON.stringify(prevState));
      const card = kickflip();
      state.players["tutorial-player"].hand.push(card);
      state.players["tutorial-player"].handCount = 4;
      state.players["tutorial-player"].ap = 1;
      state.deckCount = 39;
      return state;
    },
  },

  // Step 2: Play a Trick
  {
    id: "play-trick",
    title: "Play a Trick",
    gnarlMessage:
      "Ooh, a Trick card! Those are free to play and give you SP straight away. Go on then, tap it and hit Play!",
    instruction:
      "You drew a Trick card! Tricks are free and give instant SP. Tap play to use it.",
    highlight: null, // Will highlight the card in hand
    highlightCardUid: "tut-kickflip",
    tabHint: "Tricks",
    expectedAction: "play_card",
    expectedPayload: { cardUid: "tut-kickflip" },
    delayAfter: 2000, // Let SP animation + sound finish before next step
    setupState: null, // Uses onComplete from previous step
    onComplete: (prevState) => {
      const state = JSON.parse(JSON.stringify(prevState));
      state.players["tutorial-player"].hand = state.players[
        "tutorial-player"
      ].hand.filter((c) => c.uid !== "tut-kickflip");
      state.players["tutorial-player"].handCount = 3;
      state.players["tutorial-player"].sp = 500;
      return state;
    },
  },

  // Step 3: Play a Creature
  {
    id: "play-creature",
    title: "Summon a Creature",
    gnarlMessage:
      "Now summon a creature to your Swamp! Tap Happy Hippy, then plonk it in an empty swamp slot. Every goblin needs minions!",
    instruction:
      "Now summon a creature to your Swamp. Tap Happy Hippy, then tap an empty swamp slot.",
    highlight: null,
    highlightCardUid: "tut-happy-hippy",
    tabHint: "Creature",
    expectedAction: "play_card",
    expectedPayload: { cardUid: "tut-happy-hippy" },
    setupState: null,
    onComplete: (prevState) => {
      const state = JSON.parse(JSON.stringify(prevState));
      const card = state.players["tutorial-player"].hand.find(
        (c) => c.uid === "tut-happy-hippy",
      );
      state.players["tutorial-player"].hand = state.players[
        "tutorial-player"
      ].hand.filter((c) => c.uid !== "tut-happy-hippy");
      state.players["tutorial-player"].handCount = 2;
      state.players["tutorial-player"].swamp = [
        { ...card, turnsOnField: 0, _slot: 0 },
      ];
      state.players["tutorial-player"].ap = 0;
      return state;
    },
  },

  // Step 4: End Turn + Opponent Turn
  {
    id: "end-turn",
    title: "End Your Turn",
    gnarlMessage:
      "Ha! You're out of AP — everything costs action points, see? Tap End Turn and let a REAL player have a go!",
    instruction:
      "Out of AP! Actions cost AP. Tap End Turn to pass to your opponent.",
    highlight: '[data-tutorial="end-turn-btn"]',
    tabHint: null,
    expectedAction: "end_turn",
    setupState: null,
    opponentDelay: true, // Triggers "Gnarl is thinking..." interstitial
    onComplete: (prevState) => {
      const state = JSON.parse(JSON.stringify(prevState));
      // Opponent places Stoner
      const opponentStoner = stoner();
      opponentStoner.currentAttack = 400;
      opponentStoner.currentDefence = 200;
      opponentStoner._slot = 0;
      state.players["tutorial-opponent"].swamp = [opponentStoner];
      state.players["tutorial-opponent"].handCount = 4;
      // New turn for player
      state.currentPlayerId = "tutorial-player";
      state.turnNumber = 2;
      state.players["tutorial-player"].ap = 2;
      // Happy Hippy has been on field 1 turn
      if (state.players["tutorial-player"].swamp[0]) {
        state.players["tutorial-player"].swamp[0].turnsOnField = 1;
        state.players["tutorial-player"].swamp[0].hasAttacked = false;
      }
      return state;
    },
  },

  // Step 5: Attack!
  {
    id: "attack",
    title: "Attack!",
    gnarlMessage:
      "I played a creature! Think you can take it? Tap your Happy Hippy, then tap my Stoner to attack. Your 400 ATK vs 200 DEF — that's a kill worth 420 SP!",
    instruction:
      "Gnarl played a creature! Tap your Happy Hippy on the field, then tap Gnarl's Stoner to attack. Your 400 ATK vs 200 DEF = a kill! You earn 420 SP.",
    highlight: '[data-card-uid="tut-happy-hippy"]',
    tabHint: null,
    expectedAction: "attack",
    expectedPayload: { attackerUid: "tut-happy-hippy" },
    setupState: null,
    onComplete: (prevState) => {
      const state = JSON.parse(JSON.stringify(prevState));
      // Stoner destroyed
      state.players["tutorial-opponent"].swamp = [];
      // Player gains SP
      state.players["tutorial-player"].sp = 500 + 420;
      // Happy Hippy has attacked
      state.players["tutorial-player"].swamp[0].hasAttacked = true;
      state.graveyardCount = 1;
      // Attack animations
      state.animations = [
        {
          type: "attack",
          attacker: "tut-happy-hippy",
          defender: "tut-stoner",
          killshot: true,
        },
        { type: "damage", targetUid: "tut-stoner", amount: 400 },
        { type: "destroy", cardUid: "tut-stoner" },
        { type: "sp_change", playerId: "tutorial-player", amount: 420 },
      ];
      return state;
    },
  },

  // Step 6: Equip Lucky Headband (head)
  {
    id: "equip-armour-1",
    title: "Gear Up!",
    gnarlMessage:
      "Alright, not bad! Now try some armour — there's 3 slots: head, body, feet. Get a full set for a bonus! Tap that Lucky Headband.",
    instruction:
      "Nice kill! Armour has 3 slots — head, body, feet. Collect a full set for a bonus! Tap Lucky Headband.",
    highlight: null,
    highlightCardUid: "tut-lucky-headband",
    tabHint: "Armour",
    expectedAction: "play_card",
    expectedPayload: { cardUid: "tut-lucky-headband" },
    setupState: () => {
      // Rebuild state after attack — add Lucky armour to hand, give extra AP
      const state = baseState();
      const hh = happyHippy();
      hh.turnsOnField = 1;
      hh.hasAttacked = true;
      hh._slot = 0;
      state.players["tutorial-player"].swamp = [hh];
      state.players["tutorial-player"].sp = 920;
      state.players["tutorial-player"].ap = 5; // Extra AP for tutorial armour + magic
      state.players["tutorial-player"].hand = [
        ooft(),
        programmer(),
        luckyHeadband(),
        luckyChestplate(),
        luckySocks(),
      ];
      state.players["tutorial-player"].handCount = 5;
      state.turnNumber = 2;
      state.deckCount = 39;
      state.graveyardCount = 1;
      return state;
    },
    onComplete: (prevState) => {
      const state = JSON.parse(JSON.stringify(prevState));
      const card = state.players["tutorial-player"].hand.find(
        (c) => c.uid === "tut-lucky-headband",
      );
      state.players["tutorial-player"].hand = state.players[
        "tutorial-player"
      ].hand.filter((c) => c.uid !== "tut-lucky-headband");
      state.players["tutorial-player"].handCount = 4;
      state.players["tutorial-player"].gear.head = {
        ...card,
        _turnsRemaining: 3,
      };
      state.players["tutorial-player"].playerShield = 150;
      state.players["tutorial-player"].ap = 4;
      return state;
    },
  },

  // Step 7: Equip Lucky Chestplate (body)
  {
    id: "equip-armour-2",
    title: "Body Armour",
    gnarlMessage: "Keep going — slap that Lucky Chestplate on your body slot!",
    instruction: "Now equip Lucky Chestplate to your body slot.",
    highlight: null,
    highlightCardUid: "tut-lucky-chestplate",
    tabHint: "Armour",
    expectedAction: "play_card",
    expectedPayload: { cardUid: "tut-lucky-chestplate" },
    setupState: null,
    onComplete: (prevState) => {
      const state = JSON.parse(JSON.stringify(prevState));
      const card = state.players["tutorial-player"].hand.find(
        (c) => c.uid === "tut-lucky-chestplate",
      );
      state.players["tutorial-player"].hand = state.players[
        "tutorial-player"
      ].hand.filter((c) => c.uid !== "tut-lucky-chestplate");
      state.players["tutorial-player"].handCount = 3;
      state.players["tutorial-player"].gear.body = {
        ...card,
        _turnsRemaining: 3,
      };
      state.players["tutorial-player"].playerShield = 400; // 150 + 250
      state.players["tutorial-player"].ap = 3;
      return state;
    },
  },

  // Step 8: Equip Lucky Socks (feet) — set bonus!
  {
    id: "equip-armour-3",
    title: "Set Bonus!",
    gnarlMessage:
      "Last piece! Chuck on those Lucky Socks and you'll get a massive set bonus — +500 SP shield! Do it!",
    instruction:
      "Last piece! Equip Lucky Socks to complete the set and earn +500 SP shield!",
    highlight: null,
    highlightCardUid: "tut-lucky-socks",
    tabHint: "Armour",
    expectedAction: "play_card",
    expectedPayload: { cardUid: "tut-lucky-socks" },
    setupState: null,
    onComplete: (prevState) => {
      const state = JSON.parse(JSON.stringify(prevState));
      const card = state.players["tutorial-player"].hand.find(
        (c) => c.uid === "tut-lucky-socks",
      );
      state.players["tutorial-player"].hand = state.players[
        "tutorial-player"
      ].hand.filter((c) => c.uid !== "tut-lucky-socks");
      state.players["tutorial-player"].handCount = 2;
      state.players["tutorial-player"].gear.feet = {
        ...card,
        _turnsRemaining: 3,
      };
      // 150 + 250 + 100 (pieces) + 500 (set bonus) = 1000 total shield
      state.players["tutorial-player"].playerShield = 1000;
      state.players["tutorial-player"].ap = 2;
      state.animations = [
        {
          type: "sp_change",
          playerId: "tutorial-player",
          amount: 500,
          label: "Set Bonus!",
        },
      ];
      return state;
    },
  },

  // Step 9: Play Ooft magic card (triggers targeting)
  {
    id: "play-magic",
    title: "Use Magic",
    gnarlMessage:
      "You've got 1,000 SP shield protecting your score now! Time for some magic — tap Ooft to buff your creature!",
    instruction:
      "You have 1,000 SP shield protecting your score! Now tap Ooft to buff your creature.",
    highlight: null,
    highlightCardUid: "tut-ooft",
    tabHint: "Magic",
    expectedAction: "play_card",
    expectedPayload: { cardUid: "tut-ooft" },
    setupState: null,
    onComplete: (prevState) => {
      const state = JSON.parse(JSON.stringify(prevState));
      // Remove Ooft from hand
      state.players["tutorial-player"].hand = state.players[
        "tutorial-player"
      ].hand.filter((c) => c.uid !== "tut-ooft");
      state.players["tutorial-player"].handCount = 1;
      state.players["tutorial-player"].ap = 1;
      // Set pending target — TargetPicker will appear
      state.pendingTarget = {
        prompt: "Choose a creature to buff +200 ATK",
        targetType: "creature",
        validTargets: [
          {
            uid: "tut-happy-hippy",
            name: "Happy Hippy",
            ownerId: "tutorial-player",
          },
        ],
      };
      return state;
    },
  },

  // Step 10: Select target for buff
  {
    id: "select-target",
    title: "Choose Target",
    gnarlMessage:
      "Now pick who gets the buff! Tap Happy Hippy to give it +200 ATK!",
    instruction: "Select Happy Hippy to buff its ATK by +200!",
    highlight: null,
    tabHint: null,
    expectedAction: "select_target",
    expectedPayload: { targetUid: "tut-happy-hippy" },
    setupState: null,
    onComplete: (prevState) => {
      const state = JSON.parse(JSON.stringify(prevState));
      // Clear pending target
      state.pendingTarget = null;
      // Buff Happy Hippy ATK (+200 via _attackBuff so CardOnField displays it)
      state.players["tutorial-player"].swamp[0].currentAttack = 600;
      state.players["tutorial-player"].swamp[0]._attackBuff = 200;
      state.graveyardCount = 2;
      return state;
    },
  },

  // Step 11: End turn — opponent plays another creature
  {
    id: "end-turn-2",
    title: "End Your Turn",
    gnarlMessage:
      "600 ATK?! That's... that's fine. I'm not worried. End your turn — I dare you!",
    instruction:
      "Happy Hippy is powered up to 600 ATK! End your turn for the final strike.",
    highlight: '[data-tutorial="end-turn-btn"]',
    tabHint: null,
    expectedAction: "end_turn",
    opponentDelay: true,
    setupState: null,
    onComplete: (prevState) => {
      const state = JSON.parse(JSON.stringify(prevState));
      // Opponent plays another Stoner (SP boosted so final kill reaches 2000)
      const opponentStoner2 = stoner();
      opponentStoner2.uid = "tut-stoner-2";
      opponentStoner2.currentAttack = 300;
      opponentStoner2.currentDefence = 200;
      opponentStoner2.sp = 1080;
      opponentStoner2._slot = 0;
      state.players["tutorial-opponent"].swamp = [opponentStoner2];
      state.players["tutorial-opponent"].handCount = 3;
      // New turn for player
      state.currentPlayerId = "tutorial-player";
      state.turnNumber = 3;
      state.players["tutorial-player"].ap = 2;
      state.players["tutorial-player"].swamp[0].hasAttacked = false;
      state.players["tutorial-player"].swamp[0].turnsOnField = 2;
      return state;
    },
  },

  // Step 12: Final attack — win the game!
  {
    id: "final-attack",
    title: "Finish Him!",
    gnarlMessage:
      "No no no no — your 600 ATK vs my 200 DEF... that's 1,080 SP! You'll hit 2,000! Just... get it over with!",
    instruction:
      "Your 600 ATK vs 200 DEF — this kill earns 1,080 SP, hitting 2,000 for the win!",
    highlight: '[data-card-uid="tut-happy-hippy"]',
    tabHint: null,
    expectedAction: "attack",
    expectedPayload: { attackerUid: "tut-happy-hippy" },
    setupState: null,
    onComplete: (prevState) => {
      const state = JSON.parse(JSON.stringify(prevState));
      // Kill opponent creature
      state.players["tutorial-opponent"].swamp = [];
      // Player reaches win SP (920 + 1080 = 2000)
      state.players["tutorial-player"].sp = 2000;
      state.players["tutorial-player"].swamp[0].hasAttacked = true;
      state.graveyardCount = 3;
      // Attack animations
      state.animations = [
        {
          type: "attack",
          attacker: "tut-happy-hippy",
          defender: "tut-stoner-2",
          killshot: true,
        },
        { type: "damage", targetUid: "tut-stoner-2", amount: 600 },
        { type: "destroy", cardUid: "tut-stoner-2" },
        { type: "sp_change", playerId: "tutorial-player", amount: 1080 },
      ];
      // Victory!
      state.winner = "tutorial-player";
      return state;
    },
  },

  // Step 13: Victory! (completion screen)
  {
    id: "complete",
    title: "Victory!",
    gnarlMessage: null, // Victory overlay handles this
    instruction: null, // Completion overlay handles this
    highlight: null,
    tabHint: null,
    expectedAction: null, // No action — victory screen shown
    setupState: null,
    onComplete: null,
  },
];
