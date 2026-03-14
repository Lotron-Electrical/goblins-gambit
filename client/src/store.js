import { create } from 'zustand';
import { socket } from './socket.js';
import { EVENTS, ACTION, CHAT_EMOTES } from '../../shared/src/constants.js';
import { login as apiLogin, register as apiRegister, getProfile as apiGetProfile } from './api.js';
import { TutorialEngine } from './tutorial/TutorialEngine.js';

export const useStore = create((set, get) => ({
  // Auth
  authToken: localStorage.getItem('gg_token') || null,
  authUser: null,
  authLoading: false,
  authError: null,

  // Connection
  connected: false,
  playerName: '',

  // Lobby
  screen: 'lobby', // 'lobby' | 'room' | 'game'
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

  // UI
  zoomedCard: null,
  helpOpen: false,
  menuOpen: false,
  muted: JSON.parse(localStorage.getItem('gg_sfxMuted') || 'false'),
  musicMuted: JSON.parse(localStorage.getItem('gg_musicMuted') || 'false'),
  animationsOff: JSON.parse(localStorage.getItem('gg_animationsOff') || 'false'),
  theme: 'swamp',
  hoveredCard: null,
  hoverPosition: null,
  graveyardOpen: false,

  // Tutorial
  tutorialMode: false,
  tutorialEngine: null,

  // Chat
  chatMessages: [],
  chatUnread: 0,
  chatOpen: false,

  // Actions
  setPlayerName: (name) => set({ playerName: name }),

  loginUser: async (username, password) => {
    set({ authLoading: true, authError: null });
    try {
      const data = await apiLogin(username, password);
      localStorage.setItem('gg_token', data.token);
      set({ authToken: data.token, authUser: data.user, authLoading: false, playerName: data.user.username });
    } catch (err) {
      set({ authLoading: false, authError: err.message });
    }
  },

  registerUser: async (username, password) => {
    set({ authLoading: true, authError: null });
    try {
      const data = await apiRegister(username, password);
      localStorage.setItem('gg_token', data.token);
      set({ authToken: data.token, authUser: data.user, authLoading: false, playerName: data.user.username });
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
      localStorage.removeItem('gg_token');
      set({ authToken: null, authUser: null });
    }
  },

  logout: () => {
    localStorage.removeItem('gg_token');
    set({ authToken: null, authUser: null, playerName: '', screen: 'lobby' });
  },

  clearAuthError: () => set({ authError: null }),

  skipAuth: () => {
    set({ authToken: 'guest' });
  },

  connect: () => {
    socket.connect();
  },

  createRoom: (options = {}) => {
    const { playerName } = get();
    socket.emit(EVENTS.CREATE_ROOM, { name: playerName, options }, (res) => {
      if (res.room) {
        sessionStorage.setItem('gg_roomId', res.room.id);
        set({ currentRoom: res.room, screen: 'room' });
      }
    });
  },

  joinRoom: (roomId) => {
    const { playerName } = get();
    socket.emit(EVENTS.JOIN_ROOM, { roomId, name: playerName }, (res) => {
      if (res.error) {
        set({ error: res.error });
      } else {
        sessionStorage.setItem('gg_roomId', res.room.id);
        set({ currentRoom: res.room, screen: 'room' });
      }
    });
  },

  leaveRoom: () => {
    socket.emit(EVENTS.LEAVE_ROOM);
    sessionStorage.removeItem('gg_roomId');
    set({ currentRoom: null, screen: 'lobby', gameState: null, chatMessages: [], chatUnread: 0, chatOpen: false, tutorialMode: false, tutorialEngine: null });
  },

  toggleReady: () => {
    socket.emit(EVENTS.READY_UP);
  },

  startGame: () => {
    socket.emit(EVENTS.START_GAME, null, (res) => {
      if (res?.error) set({ error: res.error });
    });
  },

  // Game actions
  drawCard: () => {
    if (get().tutorialMode) return get().tutorialAction(ACTION.DRAW_CARD);
    socket.emit(EVENTS.GAME_ACTION, { type: ACTION.DRAW_CARD }, (res) => {
      if (res?.error) set({ error: res.error });
    });
  },

  playCard: (cardUid, targetInfo) => {
    if (get().tutorialMode) return get().tutorialAction(ACTION.PLAY_CARD, { cardUid });
    socket.emit(EVENTS.GAME_ACTION, {
      type: ACTION.PLAY_CARD,
      cardUid,
      targetInfo,
    }, (res) => {
      if (res?.error) set({ error: res.error });
    });
    set({ selectedCard: null });
  },

  attack: (attackerUid, defenderOwnerId, defenderUid) => {
    if (get().tutorialMode) return get().tutorialAction(ACTION.ATTACK, { attackerUid, defenderOwnerId, defenderUid });
    socket.emit(EVENTS.GAME_ACTION, {
      type: ACTION.ATTACK,
      attackerUid,
      defenderOwnerId,
      defenderUid,
    }, (res) => {
      if (res?.error) set({ error: res.error });
    });
    set({ selectedCard: null, targetMode: false });
  },

  selectTarget: (targetOwnerId, targetUid, targets) => {
    if (get().tutorialMode) return get().tutorialAction(ACTION.SELECT_TARGET, { targetOwnerId, targetUid });
    socket.emit(EVENTS.GAME_ACTION, {
      type: ACTION.SELECT_TARGET,
      targetOwnerId,
      targetUid,
      targets,
    }, (res) => {
      if (res?.error) set({ error: res.error });
    });
    set({ targetMode: false });
  },

  useAbility: (cardUid, targetInfo) => {
    socket.emit(EVENTS.GAME_ACTION, {
      type: ACTION.USE_ABILITY,
      cardUid,
      targetInfo,
    }, (res) => {
      if (res?.error) set({ error: res.error });
    });
  },

  chooseCard: (cardUid) => {
    socket.emit(EVENTS.GAME_ACTION, {
      type: ACTION.CHOOSE_CARD,
      cardUid,
    }, (res) => {
      if (res?.error) set({ error: res.error });
    });
  },

  discardCard: (cardUid) => {
    socket.emit(EVENTS.GAME_ACTION, {
      type: ACTION.DISCARD_CARD,
      cardUid,
    }, (res) => {
      if (res?.error) set({ error: res.error });
    });
    set({ selectedCard: null, zoomedCard: null });
  },

  recycleCreature: (cardUid) => {
    socket.emit(EVENTS.GAME_ACTION, {
      type: ACTION.RECYCLE_CREATURE,
      cardUid,
    }, (res) => {
      if (res?.error) set({ error: res.error });
    });
    set({ selectedCard: null, zoomedCard: null });
  },

  endTurn: () => {
    if (get().tutorialMode) return get().tutorialAction(ACTION.END_TURN);
    socket.emit(EVENTS.GAME_ACTION, { type: ACTION.END_TURN }, (res) => {
      if (res?.error) set({ error: res.error });
    });
  },

  buyAP: () => {
    socket.emit(EVENTS.GAME_ACTION, { type: ACTION.BUY_AP }, (res) => {
      if (res?.error) set({ error: res.error });
    });
  },

  depositVolcano: (amount) => {
    socket.emit(EVENTS.GAME_ACTION, { type: ACTION.DEPOSIT_VOLCANO, amount }, (res) => {
      if (res?.error) set({ error: res.error });
    });
  },

  attackEvent: (attackerUid) => {
    socket.emit(EVENTS.GAME_ACTION, { type: ACTION.ATTACK_EVENT, attackerUid }, (res) => {
      if (res?.error) set({ error: res.error });
    });
    set({ selectedCard: null, targetMode: false });
  },

  buyFromJargon: () => {
    socket.emit(EVENTS.GAME_ACTION, { type: ACTION.BUY_FROM_JARGON }, (res) => {
      if (res?.error) set({ error: res.error });
    });
  },

  addBot: (difficulty = 'medium') => {
    socket.emit(EVENTS.ADD_BOT, { difficulty }, (res) => {
      if (res?.error) set({ error: res.error });
    });
  },

  removeBot: (botId) => {
    socket.emit(EVENTS.REMOVE_BOT, { botId }, (res) => {
      if (res?.error) set({ error: res.error });
    });
  },

  // Tutorial actions
  startTutorial: () => {
    const engine = new TutorialEngine();
    set({
      tutorialMode: true,
      tutorialEngine: engine,
      gameState: engine.getState(),
      screen: 'tutorial',
      selectedCard: null,
      targetMode: false,
    });
  },

  tutorialAction: (actionType, payload = {}) => {
    const engine = get().tutorialEngine;
    if (!engine) return;

    const { advanced, finished } = engine.handleAction(actionType, payload);
    if (advanced) {
      const newState = engine.getState();
      // Check if this step has opponent delay
      const config = engine.getStepConfig();
      if (config.opponentDelay) {
        // Show intermediate state, then after delay show final
        set({ gameState: { ...newState }, selectedCard: null, targetMode: false });
      } else {
        set({ gameState: { ...newState }, selectedCard: null, targetMode: false });
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
      screen: 'lobby',
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
    localStorage.setItem('gg_sfxMuted', JSON.stringify(muted));
    set({ muted });
  },
  setMusicMuted: (musicMuted) => {
    localStorage.setItem('gg_musicMuted', JSON.stringify(musicMuted));
    set({ musicMuted });
  },
  setAnimationsOff: (animationsOff) => {
    localStorage.setItem('gg_animationsOff', JSON.stringify(animationsOff));
    set({ animationsOff });
  },
  setTheme: (theme) => {
    if (theme === 'swamp') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    set({ theme });
  },
  setHoveredCard: (card, position) => set({ hoveredCard: card, hoverPosition: position }),
  clearHoveredCard: () => set({ hoveredCard: null, hoverPosition: null }),
  setAttackAnimation: (attackerUid, defenderUid) => set({ attackingCardUid: attackerUid, defendingCardUid: defenderUid }),
  clearAttackAnimation: () => set({ attackingCardUid: null, defendingCardUid: null }),
  setDraggingCard: (card) => set({ draggingCard: card }),
  clearDraggingCard: () => set({ draggingCard: null }),
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
socket.on('connect', () => {
  useStore.setState({ connected: true });

  // Re-authenticate if we have a token
  const { authToken } = useStore.getState();
  if (authToken && authToken !== 'guest') {
    socket.emit('authenticate', { token: authToken });
  }

  // Attempt to rejoin if we were in a room/game before disconnect
  const savedRoomId = sessionStorage.getItem('gg_roomId');
  const { playerName, screen } = useStore.getState();
  if (savedRoomId && playerName && (screen === 'game' || screen === 'room')) {
    socket.emit(EVENTS.REJOIN_ROOM, { roomId: savedRoomId, name: playerName }, (res) => {
      if (res?.error) {
        // Room gone — reset to lobby
        sessionStorage.removeItem('gg_roomId');
        useStore.setState({ screen: 'lobby', currentRoom: null, gameState: null });
      }
      // Success case handled by GAME_STATE / ROOM_UPDATE event listeners
    });
  } else {
    useStore.getState().refreshRooms();
  }
});

socket.on('disconnect', () => {
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
    if (!allCards.some(c => c.uid === hoveredUid)) {
      clearHover = true;
    }
  }

  useStore.setState({
    gameState: state,
    screen: 'game',
    ...(clearHover ? { hoveredCard: null, hoverPosition: null } : {}),
    ...(state.stats ? { gameStats: state.stats } : {}),
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
  sessionStorage.removeItem('gg_roomId');
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
