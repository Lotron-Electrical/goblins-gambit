export const WIN_SP = 10000;
export const QUICK_WIN_SP = 5000;
export const STARTING_HAND_SIZE = 5;
export const BASE_AP = 2;
export const MAX_SWAMP_SIZE = 5;
export const MAX_GEAR_SIZE = 3;
export const MAX_HAND_SIZE = 10;
export const BUY_AP_COST = 1000; // SP cost to buy +1 AP
export const TURN_TIMER_SECONDS = 60;
export const RECONNECT_HOLD_SECONDS = 60;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

// Theme gameplay effects
export const THEME_EFFECTS = {
  swamp: {
    name: 'The Swamp',
    atkMultiplier: 1,
    defMultiplier: 1,
    spellCostMultiplier: 1,
    apPenalty: 0,
    berserkMultiplier: 0,
    description: 'Normal — no modifiers',
  },
  blood: {
    name: 'Blood Moon',
    atkMultiplier: 1.5,
    defMultiplier: 1,
    spellCostMultiplier: 2,
    apPenalty: 0,
    berserkMultiplier: 2,
    description: '1.5x ATK, last place goes Berserk (2x damage), spells cost 2x AP',
  },
  frost: {
    name: 'Frozen Wastes',
    atkMultiplier: 1,
    defMultiplier: 1.5,
    spellCostMultiplier: 0,
    berserkMultiplier: 0,
    apPenalty: 1,
    description: '1.5x DEF, spells are free, -1 AP per turn',
  },
};

// Card types
export const CARD_TYPE = {
  CREATURE: 'Creature',
  MAGIC: 'Magic',
  ARMOUR: 'Armour',
  TRICKS: 'Tricks',
};

// Card colors (matching physical card colors)
export const CARD_COLOR = {
  [CARD_TYPE.CREATURE]: 'red',
  [CARD_TYPE.MAGIC]: 'blue',
  [CARD_TYPE.ARMOUR]: 'black',
  [CARD_TYPE.TRICKS]: 'green',
};

// Armour slots
export const ARMOUR_SLOT = {
  HEAD: 'head',
  BODY: 'body',
  FEET: 'feet',
};

// Armour sets
export const ARMOUR_SET = {
  CURSED: 'cursed',
  HESSIAN: 'hessian',
  RUSTY: 'rusty',
  LUCKY: 'lucky',
  CRYSTAL: 'crystal',
};

// Game phases
export const GAME_PHASE = {
  LOBBY: 'lobby',
  PLAYING: 'playing',
  FINISHED: 'finished',
};

// Turn phases
export const TURN_PHASE = {
  MAIN: 'main',
  TARGETING: 'targeting',
  DICE_ROLL: 'dice_roll',
  CHOOSE_CARD: 'choose_card',
};

// Action types (client -> server intents)
export const ACTION = {
  PLAY_CARD: 'play_card',
  ATTACK: 'attack',
  DRAW_CARD: 'draw_card',
  END_TURN: 'end_turn',
  SELECT_TARGET: 'select_target',
  BUY_AP: 'buy_ap',
  USE_ABILITY: 'use_ability',
  CHOOSE_CARD: 'choose_card',
  DISCARD_CARD: 'discard_card',
  RECYCLE_CREATURE: 'recycle_creature',
};

// Socket events
export const EVENTS = {
  // Lobby
  CREATE_ROOM: 'create_room',
  JOIN_ROOM: 'join_room',
  LEAVE_ROOM: 'leave_room',
  READY_UP: 'ready_up',
  START_GAME: 'start_game',
  ROOM_UPDATE: 'room_update',
  ROOM_LIST: 'room_list',

  // Game
  GAME_STATE: 'game_state',
  GAME_ACTION: 'game_action',
  GAME_ERROR: 'game_error',
  GAME_OVER: 'game_over',
  ANIMATION_EVENT: 'animation_event',
  TARGET_REQUEST: 'target_request',
  CARD_CHOICE: 'card_choice',

  // Room settings
  SET_THEME: 'set_theme',
  SET_ROOM_SETTINGS: 'set_room_settings',

  // Bots
  ADD_BOT: 'add_bot',
  REMOVE_BOT: 'remove_bot',

  // Reconnection
  REJOIN_ROOM: 'rejoin_room',

  // System
  PLAYER_DISCONNECTED: 'player_disconnected',
  PLAYER_RECONNECTED: 'player_reconnected',
};
