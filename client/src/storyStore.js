/**
 * Story Mode Zustand store — manages all story-specific client state.
 */

import { create } from "zustand";
import { socket } from "./socket.js";
import { STORY_EVENTS, EVENTS } from "../../shared/src/constants.js";
import { useStore } from "./store.js";

let battleResultTimeout = null;

export const useStoryStore = create((set, get) => ({
  // Screen state
  storyScreen: "menu", // 'menu' | 'creation' | 'map' | 'battle' | 'enhancement' | 'run_over' | 'trophies'

  // Run state
  storyRun: null,
  currentMap: null,

  // Battle state
  battleCharacter: null,
  battleDialogue: null,

  // Enhancement state
  enhancementOptions: [],

  // Trophy state
  trophyCards: [],
  achievements: [],

  // Run over state
  runResult: null,

  // Sock Satchel trophy picker
  showTrophyPicker: false,

  // Loading
  storyLoading: false,
  storyError: null,

  // Has saved run
  hasSavedRun: false,

  // Actions
  setStoryScreen: (screen) => set({ storyScreen: screen }),
  clearStoryError: () => set({ storyError: null }),

  startRun: (cardName, nightmare = false) => {
    set({ storyLoading: true, storyError: null });
    socket.emit(STORY_EVENTS.STORY_START_RUN, { cardName, nightmare }, (res) => {
      if (res?.error) {
        set({ storyLoading: false, storyError: res.error });
      } else {
        set({
          storyLoading: false,
          storyRun: res.run,
          currentMap: res.map,
          storyScreen: "map",
        });
      }
    });
  },

  loadRun: () => {
    set({ storyLoading: true, storyError: null });
    socket.emit(STORY_EVENTS.STORY_LOAD_RUN, null, (res) => {
      if (res?.error) {
        set({ storyLoading: false, storyError: res.error });
      } else {
        set({
          storyLoading: false,
          storyRun: res.run,
          currentMap: res.map,
          storyScreen: "map",
        });
      }
    });
  },

  selectNode: (nodeId) => {
    set({ storyLoading: true, storyError: null });
    socket.emit(STORY_EVENTS.STORY_SELECT_NODE, { nodeId }, (res) => {
      if (res?.error) {
        set({ storyLoading: false, storyError: res.error });
        return;
      }

      if (res.type === "battle") {
        // Tell main store to route game actions through story_game_action
        useStore.getState().setStoryBattle(true);
        // Set initial game state so GameScreen can render immediately
        if (res.gameState) {
          useStore.setState({ gameState: res.gameState });
        }
        set({
          storyLoading: false,
          storyScreen: "battle",
          battleCharacter: res.character,
        });
      } else if (res.type === "enhancement") {
        set({
          storyLoading: false,
          storyScreen: "enhancement",
          enhancementOptions: res.options,
          storyRun: res.run,
          currentMap: res.map,
        });
      } else {
        set({ storyLoading: false, storyError: "Unknown node type" });
      }
    });
  },

  sendStoryAction: (action, callback) => {
    socket.emit("story_game_action", action, (res) => {
      if (res?.error) {
        set({ storyError: res.error });
      }
      callback?.(res);
    });
  },

  pickEnhancement: (enhancement) => {
    socket.emit(STORY_EVENTS.STORY_PICK_ENHANCEMENT, { enhancement }, (res) => {
      if (res?.error) {
        set({ storyError: res.error });
      } else {
        set({
          storyRun: res.run,
          currentMap: res.map,
          storyScreen: "map",
          enhancementOptions: [],
        });
      }
    });
  },

  useItem: (itemId, callback) => {
    socket.emit(STORY_EVENTS.STORY_USE_ITEM, { itemId }, (res) => {
      if (res?.error) {
        set({ storyError: res.error });
      } else if (res?.needsTrophySelection) {
        // Fetch trophies and show picker
        get().fetchTrophies();
        set({ showTrophyPicker: true });
      }
      callback?.(res);
    });
  },

  selectTrophyCard: (trophyCard) => {
    socket.emit(STORY_EVENTS.STORY_SELECT_TROPHY, { trophyCard }, (res) => {
      if (res?.error) {
        set({ storyError: res.error });
      }
      set({ showTrophyPicker: false });
    });
  },

  closeTrophyPicker: () => set({ showTrophyPicker: false }),

  saveRun: (callback) => {
    socket.emit(STORY_EVENTS.STORY_SAVE_RUN, null, (res) => {
      if (res?.error) {
        set({ storyError: res.error });
        callback?.(false);
      } else {
        set({
          storyRun: null,
          currentMap: null,
          storyScreen: "menu",
          hasSavedRun: true,
        });
        callback?.(true);
      }
    });
  },

  fetchTrophies: () => {
    socket.emit(STORY_EVENTS.STORY_GET_TROPHIES, null, (res) => {
      set({
        trophyCards: res?.trophies || [],
        achievements: res?.achievements || [],
      });
    });
  },

  exitStoryMode: () => {
    if (battleResultTimeout) {
      clearTimeout(battleResultTimeout);
      battleResultTimeout = null;
    }
    useStore.getState().setStoryBattle(false);
    useStore.setState({ gameState: null, selectedCard: null, targetMode: null });
    set({
      storyScreen: "menu",
      storyRun: null,
      currentMap: null,
      battleCharacter: null,
      battleDialogue: null,
      enhancementOptions: [],
      runResult: null,
      showTrophyPicker: false,
      storyLoading: false,
      storyError: null,
    });
  },

  returnToMenu: () => {
    if (battleResultTimeout) {
      clearTimeout(battleResultTimeout);
      battleResultTimeout = null;
    }
    useStore.getState().setStoryBattle(false);
    set({
      storyScreen: "menu",
      storyRun: null,
      currentMap: null,
      battleCharacter: null,
      battleDialogue: null,
      enhancementOptions: [],
      runResult: null,
      showTrophyPicker: false,
      storyLoading: false,
      storyError: null,
    });
  },
}));

// Listen for story battle results
socket.on(STORY_EVENTS.STORY_BATTLE_RESULT, ({ won, battleResult, run, map }) => {
  // Clear story battle flag so actions route normally again
  useStore.getState().setStoryBattle(false);

  useStoryStore.setState({
    storyRun: run,
    currentMap: map,
  });

  if (battleResult.type === "run_over") {
    useStoryStore.setState({
      storyScreen: "run_over",
      runResult: { victory: battleResult.victory, run },
    });
  } else if (battleResult.type === "next_level") {
    // New level reached — update map immediately and show map after delay
    useStoryStore.setState({
      storyRun: run,
      currentMap: map,
    });
    battleResultTimeout = setTimeout(() => {
      battleResultTimeout = null;
      useStoryStore.setState({ storyScreen: "map" });
    }, 2500);
  } else {
    // Normal continue — short delay before returning to map
    battleResultTimeout = setTimeout(() => {
      battleResultTimeout = null;
      useStoryStore.setState({ storyScreen: "map" });
    }, 2000);
  }
});
