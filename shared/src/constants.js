export const WIN_SP = 10000;
export const QUICK_WIN_SP = 5000;
export const STARTING_HAND_SIZE = 5;
export const BASE_AP = 2;
export const MAX_SWAMP_SIZE = 5;
export const MAX_GEAR_SIZE = 3;
export const MAX_HAND_SIZE = 10;
export const BUY_AP_COST = 1000; // SP cost to buy +1 AP

// Event system constants
export const EVENT_DRAGON_BASE_DEF = 1000; // Dragon DEF per player
export const EVENT_DRAGON_DAMAGE = 500; // Dragon SP damage per cycle
export const VOLCANO_TRIGGER_RATIO = 0.5; // Fraction of winSP to activate events
export const JARGON_CHANCE = 0.15; // 15% chance per cycle
export const JARGON_CARD_COST_MULTIPLIER = 100; // SP cost = card.cost * this
export const TURN_TIMER_SECONDS = 60;
export const RECONNECT_HOLD_SECONDS = 60;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;

// Theme gameplay effects
export const THEME_EFFECTS = {
  swamp: {
    name: "The Swamp",
    atkMultiplier: 1,
    defMultiplier: 1,
    spellCostMultiplier: 1,
    apPenalty: 0,
    berserkMultiplier: 0,
    description: "Normal — no modifiers",
  },
  blood: {
    name: "Blood Moon",
    atkMultiplier: 1.5,
    defMultiplier: 1,
    spellCostMultiplier: 2,
    apPenalty: 0,
    berserkMultiplier: 2,
    description:
      "1.5x ATK, last place goes Berserk (2x damage), spells cost 2x AP",
  },
  frost: {
    name: "Frozen Wastes",
    atkMultiplier: 1,
    defMultiplier: 1.5,
    spellCostMultiplier: 0,
    berserkMultiplier: 0,
    apPenalty: 1,
    description: "1.5x DEF, spells are free, -1 AP per turn",
  },
  inferno: {
    name: "The Inferno",
    atkMultiplier: 1.5,
    defMultiplier: 1.5,
    spellCostMultiplier: 0,
    apPenalty: 0,
    berserkMultiplier: 2,
    description: "1.5x ATK, 1.5x DEF, spells are free, Berserk active",
  },
};

// Story Mode constants
export const STORY_LEVELS = [
  "tavern",
  "hills",
  "swamp",
  "tundra",
  "cliffs",
  "volcano",
];

export const STORY_LEVEL_CONFIG = {
  tavern: {
    name: "The Tavern",
    theme: "swamp",
    difficulty: "easy",
    bonusAP: 1,
    winSPRange: [2000, 3000],
    cardPool: "limited",
  },
  hills: {
    name: "The Hills",
    theme: "swamp",
    difficulty: "easy+",
    bonusAP: 1,
    winSPRange: [2000, 4000],
    cardPool: "expanded",
  },
  swamp: {
    name: "The Swamp",
    theme: "swamp",
    difficulty: "medium",
    bonusAP: 0,
    winSPRange: [3000, 4000],
    cardPool: "all",
  },
  tundra: {
    name: "The Tundra",
    theme: "frost",
    difficulty: "medium+",
    bonusAP: 0,
    winSPRange: [3000, 5000],
    cardPool: "all",
  },
  cliffs: {
    name: "The Cliffs",
    theme: "blood",
    difficulty: "hard-",
    bonusAP: 0,
    winSPRange: [4000, 6000],
    cardPool: "all",
  },
  volcano: {
    name: "The Volcano",
    theme: "inferno",
    difficulty: "hard",
    bonusAP: 0,
    winSPRange: [6000, 10000],
    cardPool: "all",
  },
};

// Story Mode socket events
export const STORY_EVENTS = {
  STORY_START_RUN: "story_start_run",
  STORY_LOAD_RUN: "story_load_run",
  STORY_SELECT_NODE: "story_select_node",
  STORY_PICK_ENHANCEMENT: "story_pick_enhancement",
  STORY_USE_ITEM: "story_use_item",
  STORY_SAVE_RUN: "story_save_run",
  STORY_GET_TROPHIES: "story_get_trophies",
  STORY_RUN_STATE: "story_run_state",
  STORY_MAP_STATE: "story_map_state",
  STORY_ENHANCEMENT_OPTIONS: "story_enhancement_options",
  STORY_BATTLE_START: "story_battle_start",
  STORY_BATTLE_RESULT: "story_battle_result",
  STORY_DIALOGUE: "story_dialogue",
  STORY_RUN_OVER: "story_run_over",
  STORY_SELECT_TROPHY: "story_select_trophy",
};

// Card types
export const CARD_TYPE = {
  CREATURE: "Creature",
  MAGIC: "Magic",
  ARMOUR: "Armour",
  TRICKS: "Tricks",
};

// Card colors (matching physical card colors)
export const CARD_COLOR = {
  [CARD_TYPE.CREATURE]: "red",
  [CARD_TYPE.MAGIC]: "blue",
  [CARD_TYPE.ARMOUR]: "black",
  [CARD_TYPE.TRICKS]: "green",
};

// Armour slots
export const ARMOUR_SLOT = {
  HEAD: "head",
  BODY: "body",
  FEET: "feet",
};

// Armour sets
export const ARMOUR_SET = {
  CURSED: "cursed",
  HESSIAN: "hessian",
  RUSTY: "rusty",
  LUCKY: "lucky",
  CRYSTAL: "crystal",
};

// Game phases
export const GAME_PHASE = {
  LOBBY: "lobby",
  PLAYING: "playing",
  FINISHED: "finished",
};

// Turn phases
export const TURN_PHASE = {
  MAIN: "main",
  TARGETING: "targeting",
  DICE_ROLL: "dice_roll",
  CHOOSE_CARD: "choose_card",
};

// Action types (client -> server intents)
export const ACTION = {
  PLAY_CARD: "play_card",
  ATTACK: "attack",
  DRAW_CARD: "draw_card",
  END_TURN: "end_turn",
  SELECT_TARGET: "select_target",
  BUY_AP: "buy_ap",
  USE_ABILITY: "use_ability",
  CHOOSE_CARD: "choose_card",
  DISCARD_CARD: "discard_card",
  RECYCLE_CREATURE: "recycle_creature",
  DEPOSIT_VOLCANO: "deposit_volcano",
  ATTACK_EVENT: "attack_event",
  BUY_FROM_JARGON: "buy_from_jargon",
};

// Socket events
export const EVENTS = {
  // Lobby
  CREATE_ROOM: "create_room",
  JOIN_ROOM: "join_room",
  LEAVE_ROOM: "leave_room",
  READY_UP: "ready_up",
  START_GAME: "start_game",
  ROOM_UPDATE: "room_update",
  ROOM_LIST: "room_list",

  // Game
  GAME_STATE: "game_state",
  GAME_ACTION: "game_action",
  GAME_ERROR: "game_error",
  GAME_OVER: "game_over",
  ANIMATION_EVENT: "animation_event",
  TARGET_REQUEST: "target_request",
  CARD_CHOICE: "card_choice",

  // Room settings
  SET_THEME: "set_theme",
  SET_ROOM_SETTINGS: "set_room_settings",

  // Bots
  ADD_BOT: "add_bot",
  REMOVE_BOT: "remove_bot",

  // Reconnection
  REJOIN_ROOM: "rejoin_room",

  // Chat
  CHAT_MESSAGE: "chat_message",

  // Saved games
  SAVE_GAME: "save_game",
  LOAD_GAME: "load_game",
  DELETE_SAVE: "delete_save",
  SAVED_GAME_INFO: "saved_game_info",

  // System
  PLAYER_DISCONNECTED: "player_disconnected",
  PLAYER_RECONNECTED: "player_reconnected",
};

// Chat emotes (goblin-themed)
export const CHAT_EMOTES = [
  { key: "gg", label: "GG", emoji: "\u2694\uFE0F" },
  { key: "heh", label: "Heh heh heh", emoji: "\uD83D\uDE08" },
  { key: "rage", label: "WAAGH!", emoji: "\uD83E\uDD2C" },
  { key: "skull", label: "Yer dead!", emoji: "\uD83D\uDC80" },
  { key: "smug", label: "Too easy", emoji: "\uD83D\uDE0F" },
  { key: "goblin", label: "Goblin time", emoji: "\uD83D\uDC7A" },
];
