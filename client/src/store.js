import { create } from "zustand";
import { socket } from "./socket.js";
import { EVENTS, ACTION, CHAT_EMOTES } from "../../shared/src/constants.js";
import {
  login as apiLogin,
  register as apiRegister,
  getProfile as apiGetProfile,
} from "./api.js";
import { TutorialEngine } from "./tutorial/TutorialEngine.js";

export const useStore = create((set, get) => ({
  // Auth
  authToken: localStorage.getItem("gg_token") || null,
  authUser: null,
  authLoading: false,
  authError: null,
  guestAuthenticated: false,

  // Connection
  connected: false,
  playerName: "",

  // Lobby
  screen: "lobby", // 'lobby' | 'room' | 'game'
  rooms: [],
  currentRoom: null,

  // Game
  gameState: null,
  gameStats: null,
  error: null,
  selectedCard: null,
  targetMode: false,

  // Animation state
  attackingCardUid: null,
  defendingCardUid: null,

  // Drag and drop
  draggingCard: null,
  dragPosition: null,

  // Attack line drag
  attackDrag: null, // { attackerUid, from: {x,y}, to: {x,y} }

  // UI
  zoomedCard: null,
  helpOpen: false,
  menuOpen: false,
  muted: JSON.parse(localStorage.getItem("gg_sfxMuted") || "false"),
  musicMuted: JSON.parse(localStorage.getItem("gg_musicMuted") || "false"),
  animationsOff: JSON.parse(
    localStorage.getItem("gg_animationsOff") || "false",
  ),
  handArc: JSON.parse(localStorage.getItem("gg_handArc") || "0"),
  theme: "swamp",
  drawAnimActive: false,
  hoveredCard: null,
  hoverPosition: null,
  graveyardOpen: false,

  // Saved game
  savedGameInfo: null,

  // Multi-device mirror
  mirrorAvailable: null,

  // Story battle
  storyBattle: false,

  // Tutorial
  tutorialMode: false,
  tutorialEngine: null,
  tutorialPaused: false,

  // Layout
  centerZoneY: null,
  setCenterZoneY: (y) => set({ centerZoneY: y }),

  // Chat
  chatMessages: [],
  chatUnread: 0,
  chatOpen: false,

  // Actions
  setPlayerName: (name) => {
    set({ playerName: name });
    // Authenticate guests on the socket so story mode works
    const { authToken } = get();
    if (authToken === "guest" && name) {
      socket.emit("authenticate_guest", { playerName: name }, (res) => {
        if (res?.success) {
          set({ guestAuthenticated: true });
        }
      });
    }
  },
  setScreen: (screen) => set({ screen }),

  loginUser: async (username, password) => {
    set({ authLoading: true, authError: null });
    try {
      const data = await apiLogin(username, password);
      localStorage.setItem("gg_token", data.token);
      set({
        authToken: data.token,
        authUser: data.user,
        authLoading: false,
        playerName: data.user.username,
      });
    } catch (err) {
      set({ authLoading: false, authError: err.message });
    }
  },

  registerUser: async (username, password) => {
    set({ authLoading: true, authError: null });
    try {
      const data = await apiRegister(username, password);
      localStorage.setItem("gg_token", data.token);
      set({
        authToken: data.token,
        authUser: data.user,
        authLoading: false,
        playerName: data.user.username,
      });
    } catch (err) {
      set({ authLoading: false, authError: err.message });
    }
  },

  loadProfile: async () => {
    const token = get().authToken;
    if (!token) return;
    try {
      const data = await apiGetProfile();
      set({ authUser: data.user, playerName: data.user.username });
    } catch {
      // Token invalid — clear it
      localStorage.removeItem("gg_token");
      set({
        authToken: null,
        authUser: null,
        screen: "lobby",
        currentRoom: null,
        gameState: null,
      });
    }
  },

  logout: () => {
    localStorage.removeItem("gg_token");
    set({
      authToken: null,
      authUser: null,
      playerName: "",
      screen: "lobby",
      guestAuthenticated: false,
      mirrorAvailable: null,
    });
  },

  clearAuthError: () => set({ authError: null }),

  skipAuth: () => {
    set({ authToken: "guest", guestAuthenticated: false });
    // Pre-authenticate on the socket immediately so story mode works
    // The name will be updated later via setPlayerName if the user sets one
    const guestName = "Adventurer";
    if (socket.connected) {
      socket.emit("authenticate_guest", { playerName: guestName }, (res) => {
        if (res?.success) {
          set({ guestAuthenticated: true });
        }
      });
    }
  },

  connect: () => {
    socket.connect();
  },

  createRoom: (options = {}) => {
    const { playerName } = get();
    if (!socket.connected) {
      set({ error: "Not connected to server — try refreshing" });
      return;
    }
    socket.emit(EVENTS.CREATE_ROOM, { name: playerName, options }, (res) => {
      if (res?.error) {
        set({ error: res.error });
      } else if (res?.room) {
        sessionStorage.setItem("gg_roomId", res.room.id);
        set({ currentRoom: res.room, screen: "room" });
      } else {
        set({ error: "Failed to create room — no response from server" });
      }
    });
  },

  joinRoom: (roomId) => {
    const { playerName } = get();
    socket.emit(EVENTS.JOIN_ROOM, { roomId, name: playerName }, (res) => {
      if (res?.error) {
        set({ error: res.error });
      } else {
        sessionStorage.setItem("gg_roomId", res?.room?.id);
        set({ currentRoom: res.room, screen: "room" });
      }
    });
  },

  leaveRoom: () => {
    socket.emit(EVENTS.LEAVE_ROOM);
    sessionStorage.removeItem("gg_roomId");
    set({
      currentRoom: null,
      screen: "lobby",
      gameState: null,
      chatMessages: [],
      chatUnread: 0,
      chatOpen: false,
      tutorialMode: false,
      tutorialEngine: null,
      selectedCard: null,
      targetMode: null,
      error: null,
      gameStats: null,
      zoomedCard: null,
      helpOpen: false,
      menuOpen: false,
      graveyardOpen: false,
      hoveredCard: null,
      hoverPosition: null,
      storyBattle: false,
    });
  },

  toggleReady: () => {
    if (!socket.connected) {
      set({ error: "Not connected to server — try refreshing" });
      return;
    }
    socket.emit(EVENTS.READY_UP);
  },

  startGame: () => {
    if (!socket.connected) {
      set({ error: "Not connected to server — try refreshing" });
      return;
    }
    socket.emit(EVENTS.START_GAME, null, (res) => {
      if (res?.error) set({ error: res.error });
    });
  },

  // Helper: emit game action to correct event (story vs normal)
  _emitAction: (action, callback) => {
    const event = get().storyBattle ? "story_game_action" : EVENTS.GAME_ACTION;
    socket.emit(event, action, (res) => {
      if (res?.error) set({ error: res.error });
      callback?.(res);
    });
  },
  setStoryBattle: (active) => set({ storyBattle: active }),

  // Game actions
  drawCard: () => {
    if (get().tutorialMode) return get().tutorialAction(ACTION.DRAW_CARD);
    get()._emitAction({ type: ACTION.DRAW_CARD });
  },

  playCard: (cardUid, targetInfo) => {
    if (get().tutorialMode)
      return get().tutorialAction(ACTION.PLAY_CARD, { cardUid });
    get()._emitAction({ type: ACTION.PLAY_CARD, cardUid, targetInfo });
    set({ selectedCard: null });
  },

  attack: (attackerUid, defenderOwnerId, defenderUid) => {
    if (get().tutorialMode)
      return get().tutorialAction(ACTION.ATTACK, {
        attackerUid,
        defenderOwnerId,
        defenderUid,
      });
    get()._emitAction({
      type: ACTION.ATTACK,
      attackerUid,
      defenderOwnerId,
      defenderUid,
    });
    set({ selectedCard: null, targetMode: false });
  },

  selectTarget: (targetOwnerId, targetUid, targets) => {
    if (get().tutorialMode)
      return get().tutorialAction(ACTION.SELECT_TARGET, {
        targetOwnerId,
        targetUid,
      });
    get()._emitAction({
      type: ACTION.SELECT_TARGET,
      targetOwnerId,
      targetUid,
      targets,
    });
    set({ targetMode: false });
  },

  useAbility: (cardUid, targetInfo) => {
    get()._emitAction({ type: ACTION.USE_ABILITY, cardUid, targetInfo });
  },

  chooseCard: (cardUid) => {
    get()._emitAction({ type: ACTION.CHOOSE_CARD, cardUid });
  },

  discardCard: (cardUid) => {
    get()._emitAction({ type: ACTION.DISCARD_CARD, cardUid });
    set({ selectedCard: null, zoomedCard: null });
  },

  recycleCreature: (cardUid) => {
    get()._emitAction({ type: ACTION.RECYCLE_CREATURE, cardUid });
    set({ selectedCard: null, zoomedCard: null });
  },

  endTurn: () => {
    if (get().tutorialMode) return get().tutorialAction(ACTION.END_TURN);
    get()._emitAction({ type: ACTION.END_TURN });
  },

  buyAP: () => {
    get()._emitAction({ type: ACTION.BUY_AP });
  },

  depositVolcano: (amount) => {
    get()._emitAction({ type: ACTION.DEPOSIT_VOLCANO, amount });
  },

  attackEvent: (attackerUid) => {
    get()._emitAction({ type: ACTION.ATTACK_EVENT, attackerUid });
    set({ selectedCard: null, targetMode: false });
  },

  buyFromJargon: () => {
    get()._emitAction({ type: ACTION.BUY_FROM_JARGON });
  },

  addBot: (difficulty = "medium") => {
    socket.emit(EVENTS.ADD_BOT, { difficulty }, (res) => {
      if (res?.error) set({ error: res.error });
    });
  },

  removeBot: (botId) => {
    socket.emit(EVENTS.REMOVE_BOT, { botId }, (res) => {
      if (res?.error) set({ error: res.error });
    });
  },

  // Saved game actions
  fetchSavedGameInfo: () => {
    socket.emit(EVENTS.SAVED_GAME_INFO, null, (info) => {
      set({ savedGameInfo: info || { hasSave: false } });
    });
  },

  saveGame: (callback) => {
    socket.emit(EVENTS.SAVE_GAME, null, (res) => {
      if (res?.error) {
        set({ error: res.error });
        callback?.(false);
      } else {
        sessionStorage.removeItem("gg_roomId");
        set({
          currentRoom: null,
          screen: "lobby",
          gameState: null,
          chatMessages: [],
          chatUnread: 0,
          chatOpen: false,
          menuOpen: false,
        });
        // Refresh saved game info for lobby
        get().fetchSavedGameInfo();
        callback?.(true);
      }
    });
  },

  loadSavedGame: () => {
    socket.emit(EVENTS.LOAD_GAME, null, (res) => {
      if (res?.error) {
        set({ error: res.error });
      } else if (res?.room) {
        sessionStorage.setItem("gg_roomId", res.room.id);
        set({ currentRoom: res.room, savedGameInfo: { hasSave: false } });
        // Game state arrives via GAME_STATE event
      }
    });
  },

  deleteSavedGame: () => {
    socket.emit(EVENTS.DELETE_SAVE, null, (res) => {
      if (res?.error) {
        set({ error: res.error });
      } else {
        set({ savedGameInfo: { hasSave: false } });
      }
    });
  },

  // Multi-device link
  linkDevice: () => {
    socket.emit(EVENTS.LINK_DEVICE, null, (res) => {
      if (res?.error) {
        set({ mirrorAvailable: null, error: res.error });
        return;
      }
      if (res?.success) {
        sessionStorage.setItem("gg_roomId", res.roomId);
        set({ currentRoom: res.room, mirrorAvailable: null });
        // GAME_STATE may have already arrived — transition now if so
        if (useStore.getState().gameState) {
          set({ screen: "game" });
        }
      }
    });
  },

  // Tutorial actions
  startTutorial: () => {
    const engine = new TutorialEngine();
    set({
      tutorialMode: true,
      tutorialEngine: engine,
      gameState: engine.getState(),
      screen: "tutorial",
      selectedCard: null,
      targetMode: false,
      chatMessages: [],
      chatUnread: 0,
    });
    // Gnarl's opening taunt after a short delay
    setTimeout(() => {
      const msg = {
        id: "tut-chat-0",
        playerId: "tutorial-opponent",
        playerName: "Gnarl the Goblin",
        timestamp: Date.now(),
        text: "Welcome to the swamp, smoothskin! Try not to embarrass yourself.",
      };
      const { chatMessages, chatOpen } = get();
      set({
        chatMessages: [...chatMessages, msg],
        ...(!chatOpen ? { chatUnread: (get().chatUnread || 0) + 1 } : {}),
      });
    }, 2000);
  },

  tutorialAction: (actionType, payload = {}) => {
    const engine = get().tutorialEngine;
    if (!engine) return;

    const prevStep = engine.steps[engine.currentStepIndex];
    const delayAfter = prevStep?.delayAfter || 0;
    const { advanced, finished } = engine.handleAction(actionType, payload);
    if (advanced) {
      const newState = engine.getState();
      if (delayAfter > 0) {
        // Pause tutorial UI — update game state but suppress next step's highlights
        set({
          gameState: { ...newState },
          selectedCard: null,
          targetMode: false,
          tutorialPaused: true,
        });
        setTimeout(() => {
          set({ tutorialPaused: false });
        }, delayAfter);
      } else {
        set({
          gameState: { ...newState },
          selectedCard: null,
          targetMode: false,
        });
      }
      // Clear animations from engine state after they've been set so they don't replay
      if (newState.animations?.length) {
        engine.gameState = { ...engine.gameState, animations: [] };
      }
      // Tutorial bot chat — Gnarl reacts to player actions
      const GNARL_CHAT = {
        "play-trick": "A trick? Pfft, that won't save you!",
        "play-creature": "Oh look, a creature! How cute. Mine's bigger.",
        "end-turn": "Finally! Watch THIS!",
        attack: "OI! That was me best one! You'll pay for that!",
        "equip-armour-3": "All that armour?! That's not fair!",
        "play-magic": "Magic?! Goblins don't need magic... usually.",
        "final-attack": "NO! IMPOSSIBLE! How did you—",
      };
      const stepId = prevStep?.id;
      if (stepId && GNARL_CHAT[stepId]) {
        setTimeout(() => {
          const chatMsg = {
            id: `tut-chat-${stepId}`,
            playerId: "tutorial-opponent",
            playerName: "Gnarl the Goblin",
            timestamp: Date.now(),
            text: GNARL_CHAT[stepId],
          };
          const { chatMessages: msgs, chatOpen: isOpen } = get();
          set({
            chatMessages: [...msgs, chatMsg],
            ...(!isOpen ? { chatUnread: (get().chatUnread || 0) + 1 } : {}),
          });
        }, 1500);
      }
      // Auto-select the highlighted card for the next step (after optional delay)
      const nextConfig = engine.getStepConfig();
      if (nextConfig.highlightCardUid) {
        const hand = newState.players?.["tutorial-player"]?.hand;
        const targetCard = hand?.find(
          (c) => c.uid === nextConfig.highlightCardUid,
        );
        if (targetCard) {
          setTimeout(() => {
            set({ selectedCard: { ...targetCard, _zone: "hand" } });
          }, delayAfter + 100);
        }
      }
    }
    if (finished) {
      // Stay in tutorial mode — completion overlay handles the exit
    }
  },

  endTutorial: () => {
    set({
      tutorialMode: false,
      tutorialEngine: null,
      gameState: null,
      screen: "lobby",
      selectedCard: null,
      targetMode: false,
    });
  },

  // Chat actions
  sendChatMessage: (text) => {
    socket.emit(EVENTS.CHAT_MESSAGE, { text });
  },
  sendChatEmote: (emoteKey) => {
    socket.emit(EVENTS.CHAT_MESSAGE, { emoteKey });
  },
  setChatOpen: (open) => {
    set({ chatOpen: open, ...(open ? { chatUnread: 0 } : {}) });
  },

  selectCard: (card) => set({ selectedCard: card }),
  setTargetMode: (mode) => set({ targetMode: mode }),
  setZoomedCard: (card) => set({ zoomedCard: card }),
  setHelpOpen: (open) => set({ helpOpen: open }),
  setMenuOpen: (open) => set({ menuOpen: open }),
  setMuted: (muted) => {
    localStorage.setItem("gg_sfxMuted", JSON.stringify(muted));
    set({ muted });
  },
  setMusicMuted: (musicMuted) => {
    localStorage.setItem("gg_musicMuted", JSON.stringify(musicMuted));
    set({ musicMuted });
  },
  setAnimationsOff: (animationsOff) => {
    localStorage.setItem("gg_animationsOff", JSON.stringify(animationsOff));
    set({ animationsOff });
  },
  setHandArc: (handArc) => {
    localStorage.setItem("gg_handArc", JSON.stringify(handArc));
    set({ handArc });
  },
  setTheme: (theme) => {
    if (theme === "swamp") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
    set({ theme });
  },
  setHoveredCard: (card, position) =>
    set({ hoveredCard: card, hoverPosition: position }),
  clearHoveredCard: () => set({ hoveredCard: null, hoverPosition: null }),
  setAttackAnimation: (attackerUid, defenderUid) =>
    set({ attackingCardUid: attackerUid, defendingCardUid: defenderUid }),
  clearAttackAnimation: () =>
    set({ attackingCardUid: null, defendingCardUid: null }),
  setDraggingCard: (card) => set({ draggingCard: card }),
  clearDraggingCard: () => set({ draggingCard: null, dragPosition: null }),
  setDragPosition: (pos) => set({ dragPosition: pos }),
  setAttackDrag: (drag) => set({ attackDrag: drag }),
  clearAttackDrag: () => set({ attackDrag: null }),
  setGraveyardOpen: (open) => set({ graveyardOpen: open }),
  clearError: () => set({ error: null }),
  setRoomSettings: (settings) => {
    socket.emit(EVENTS.SET_ROOM_SETTINGS, { settings }, (res) => {
      if (res?.error) set({ error: res.error });
    });
  },
  setRoomTheme: (theme) => {
    socket.emit(EVENTS.SET_THEME, { theme }, (res) => {
      if (res?.error) set({ error: res.error });
    });
  },
  refreshRooms: () => {
    socket.emit(EVENTS.ROOM_LIST, null, (rooms) => {
      set({ rooms: rooms || [] });
    });
  },
}));

// Socket event listeners
socket.on("connect", () => {
  useStore.setState({ connected: true });

  // Helper: attempt to rejoin a room/game after authentication completes
  const attemptRejoin = () => {
    const savedRoomId = sessionStorage.getItem("gg_roomId");
    const { playerName } = useStore.getState();
    if (savedRoomId && playerName) {
      socket.emit(
        EVENTS.REJOIN_ROOM,
        { roomId: savedRoomId, name: playerName },
        (res) => {
          if (res?.error) {
            // Room gone — reset to lobby
            sessionStorage.removeItem("gg_roomId");
            useStore.setState({
              screen: "lobby",
              currentRoom: null,
              gameState: null,
            });
          }
          // Success case handled by GAME_STATE / ROOM_UPDATE event listeners
        },
      );
    } else {
      useStore.getState().refreshRooms();
    }
  };

  // Re-authenticate if we have a token, then rejoin
  const { authToken, playerName: savedName } = useStore.getState();
  if (authToken && authToken !== "guest") {
    socket.emit("authenticate", { token: authToken }, (res) => {
      // After auth, check for saved games
      useStore.getState().fetchSavedGameInfo();

      if (res?.mirrorAvailable) {
        // Active game on another device — show link card in lobby
        console.log("[auth] mirrorAvailable:", res.mirrorAvailable);
        useStore.setState({ mirrorAvailable: res.mirrorAvailable });
        useStore.getState().refreshRooms();
      } else {
        console.log("[auth] no mirror available, res:", res);
        // Now it's safe to rejoin — server knows who we are
        attemptRejoin();
      }
    });
  } else if (authToken === "guest") {
    // Authenticate guests with their player name so story mode works
    const guestName = savedName || "Adventurer";
    socket.emit("authenticate_guest", { playerName: guestName }, () => {
      useStore.setState({ guestAuthenticated: true });
      attemptRejoin();
    });
  } else {
    // No auth needed — just rejoin or refresh
    attemptRejoin();
  }
});

socket.on("disconnect", () => {
  useStore.setState({ connected: false });
});

socket.on(EVENTS.ROOM_UPDATE, (room) => {
  useStore.setState({ currentRoom: room });
  // Apply host's theme to all room members
  if (room.theme) {
    useStore.getState().setTheme(room.theme);
  }
});

socket.on(EVENTS.ROOM_LIST, (rooms) => {
  useStore.setState({ rooms });
});

socket.on(EVENTS.GAME_STATE, (state) => {
  const current = useStore.getState();
  const hoveredUid = current.hoveredCard?.uid;

  // Clear stale hover if the hovered card is no longer on any field or hand
  let clearHover = false;
  if (hoveredUid && state) {
    const allCards = [];
    for (const p of Object.values(state.players)) {
      allCards.push(...(p.swamp || []), ...(p.hand || []));
    }
    if (!allCards.some((c) => c.uid === hoveredUid)) {
      clearHover = true;
    }
  }

  useStore.setState({
    gameState: state,
    // Don't switch screen during story battles or if player has left the room
    ...(current.storyBattle || !current.currentRoom ? {} : { screen: "game" }),
    ...(clearHover ? { hoveredCard: null, hoverPosition: null } : {}),
    ...(state.stats
      ? { gameStats: state.stats }
      : state.turnNumber <= 1
        ? { gameStats: null }
        : {}),
  });
});

socket.on(EVENTS.GAME_ERROR, ({ error }) => {
  useStore.setState({ error });
});

socket.on(EVENTS.GAME_OVER, ({ winner, winnerName, stats }) => {
  if (stats) {
    useStore.setState({ gameStats: stats });
  }
  // Game is over — clear saved room so we don't try to rejoin
  sessionStorage.removeItem("gg_roomId");
});

socket.on(EVENTS.PLAYER_DISCONNECTED, ({ playerName }) => {
  useStore.setState({ error: `${playerName} disconnected` });
});

socket.on(EVENTS.PLAYER_RECONNECTED, ({ playerName }) => {
  useStore.setState({ error: `${playerName} reconnected` });
});

socket.on(EVENTS.CHAT_MESSAGE, (msg) => {
  const { chatMessages, chatOpen } = useStore.getState();
  const updated = [...chatMessages, msg].slice(-50);
  useStore.setState({
    chatMessages: updated,
    ...(!chatOpen ? { chatUnread: useStore.getState().chatUnread + 1 } : {}),
  });
});
