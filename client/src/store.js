import { create } from 'zustand';
import { socket } from './socket.js';
import { EVENTS, ACTION } from '../../shared/src/constants.js';

export const useStore = create((set, get) => ({
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

  // Actions
  setPlayerName: (name) => set({ playerName: name }),

  connect: () => {
    socket.connect();
  },

  createRoom: (options = {}) => {
    const { playerName } = get();
    socket.emit(EVENTS.CREATE_ROOM, { name: playerName, options }, (res) => {
      if (res.room) {
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
        set({ currentRoom: res.room, screen: 'room' });
      }
    });
  },

  leaveRoom: () => {
    socket.emit(EVENTS.LEAVE_ROOM);
    set({ currentRoom: null, screen: 'lobby' });
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
    socket.emit(EVENTS.GAME_ACTION, { type: ACTION.DRAW_CARD }, (res) => {
      if (res?.error) set({ error: res.error });
    });
  },

  playCard: (cardUid, targetInfo) => {
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

  endTurn: () => {
    socket.emit(EVENTS.GAME_ACTION, { type: ACTION.END_TURN }, (res) => {
      if (res?.error) set({ error: res.error });
    });
  },

  buyAP: () => {
    socket.emit(EVENTS.GAME_ACTION, { type: ACTION.BUY_AP }, (res) => {
      if (res?.error) set({ error: res.error });
    });
  },

  addBot: () => {
    socket.emit(EVENTS.ADD_BOT, null, (res) => {
      if (res?.error) set({ error: res.error });
    });
  },

  removeBot: (botId) => {
    socket.emit(EVENTS.REMOVE_BOT, { botId }, (res) => {
      if (res?.error) set({ error: res.error });
    });
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
  useStore.getState().refreshRooms();
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
});

socket.on(EVENTS.PLAYER_DISCONNECTED, ({ playerName }) => {
  useStore.setState({ error: `${playerName} disconnected` });
});
