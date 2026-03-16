import { EVENTS, ACTION, CHAT_EMOTES } from "../../../shared/src/constants.js";
import {
  createBotId,
  getBotName,
  releaseBotName,
  decideBotAction,
} from "../bot/BotPlayer.js";
import {
  generateBotChat,
  generateBotReply,
  generateBotReaction,
  clearBotChat,
} from "../bot/BotChat.js";
import { validateToken, updateStatsAfterGame } from "../accounts.js";

export function setupSocketHandlers(io, lobby) {
  // Track which rooms have bots and bot IDs + difficulty
  const botIds = new Set();
  const botDifficulty = new Map(); // botId -> 'easy' | 'medium' | 'hard'
  const lastChatTime = new Map(); // socketId -> timestamp
  const disconnectTimers = new Map(); // socketId -> timeout handle for grace period

  function broadcastState(roomId, engine) {
    const room = lobby.getRoom(roomId);
    if (!room) return;
    for (const p of room.players) {
      const state = engine.getStateForPlayer(p.id);
      if (botIds.has(p.id)) continue; // Don't emit to bots
      io.to(p.id).emit(EVENTS.GAME_STATE, state);
    }
  }

  function runBotTurn(roomId, engine) {
    const botId = engine.getCurrentPlayerId();
    if (!botIds.has(botId)) {
      // Current player isn't a bot, but check if any bot has a pending response
      const state = engine.state;
      const pendingBotId =
        state.pendingTarget?.playerId || state.pendingChoice?.playerId;
      if (pendingBotId && botIds.has(pendingBotId)) {
        scheduleBotTick(roomId, engine, pendingBotId, 600);
      }
      return;
    }

    scheduleBotTick(roomId, engine, botId, 1000 + Math.random() * 500);
  }

  function scheduleBotTick(roomId, engine, botId, delay) {
    if (pendingBotTicks.has(botId)) return; // prevent duplicate scheduling
    pendingBotTicks.add(botId);
    setTimeout(() => botTick(roomId, engine, botId), delay);
  }

  // Track pending bot ticks to prevent duplicates
  const pendingBotTicks = new Set();

  function cleanupFinishedGame(roomId) {
    const room = lobby.getRoom(roomId);
    if (room) {
      // Release bot names and clean up bot tracking
      for (const p of room.players) {
        if (botIds.has(p.id)) {
          releaseBotName(p.name);
          clearBotChat(p.id);
          botIds.delete(p.id);
          botDifficulty.delete(p.id);
          pendingBotTicks.delete(p.id);
        }
        lobby.playerRooms.delete(p.id);
      }
    }
    lobby.rooms.delete(roomId);
    lobby.games.delete(roomId);
  }

  async function botTick(roomId, engine, botId) {
    pendingBotTicks.delete(botId);

    try {
      if (!botIds.has(botId)) return;

      const botState = engine.getStateForPlayer(botId);
      if (botState.phase !== "playing") return;

      // Check if bot needs to respond to pending target/choice
      const needsResponse =
        botState.pendingTarget?.playerId === botId ||
        botState.pendingChoice?.playerId === botId;

      if (botState.currentPlayerId !== botId && !needsResponse) return;

      // Wait if a human player has a pending choice (e.g. Dead Meme)
      const pendingForHuman =
        engine.state.pendingChoice &&
        !botIds.has(engine.state.pendingChoice.playerId);
      if (pendingForHuman) return;

      const action = decideBotAction(
        botState,
        botDifficulty.get(botId) || "medium",
      );
      if (!action) {
        // Bot is stuck — force end turn to prevent freeze
        if (botState.currentPlayerId === botId) {
          engine.handleAction(botId, { type: ACTION.END_TURN });
          broadcastState(roomId, engine);
          const nextId = engine.getCurrentPlayerId();
          if (botIds.has(nextId)) {
            scheduleBotTick(roomId, engine, nextId, 800);
          }
        }
        return;
      }

      const result = engine.handleAction(botId, action);

      if (!result.success && !result.needsTarget) {
        // Action failed — check if it's because a human has a pending choice
        if (result.error === "Waiting for another player to choose") {
          // Don't force end turn — just wait for the human to respond
          return;
        }
        // Otherwise force end turn to prevent freeze
        console.error(`Bot ${botId} action failed:`, result.error);
        if (botState.currentPlayerId === botId) {
          engine.handleAction(botId, { type: ACTION.END_TURN });
        }
        broadcastState(roomId, engine);
        const nextId = engine.getCurrentPlayerId();
        if (botIds.has(nextId)) {
          scheduleBotTick(roomId, engine, nextId, 800);
        }
        return;
      }

      broadcastState(roomId, engine);

      // Bot chat — send a message based on action
      const room = lobby.getRoom(roomId);
      const botPlayer = room?.players.find((p) => p.id === botId);
      if (botPlayer) {
        const chatMsg = generateBotChat(botId, action, result);
        if (chatMsg) {
          const msg = {
            id: `${botId}-${Date.now()}`,
            playerId: botId,
            playerName: botPlayer.name,
            timestamp: Date.now(),
            ...chatMsg,
          };
          io.to(roomId).emit(EVENTS.CHAT_MESSAGE, msg);
        }
      }

      // Check if another bot needs to respond (e.g. Dead Meme graveyard pick)
      const pendingBotRespondId =
        engine.state.pendingChoice?.playerId ||
        engine.state.pendingTarget?.playerId;
      if (
        pendingBotRespondId &&
        botIds.has(pendingBotRespondId) &&
        pendingBotRespondId !== botId
      ) {
        scheduleBotTick(roomId, engine, pendingBotRespondId, 600);
      }

      if (result.gameOver) {
        await updateStatsAfterGame(engine.state, result.winner);
        io.to(roomId).emit(EVENTS.GAME_OVER, {
          winner: result.winner,
          winnerName: engine.state.players[result.winner]?.name || "Unknown",
          stats: engine.state.stats,
        });
        cleanupFinishedGame(roomId);
        return;
      }

      // If bot ended turn, check if next player is also a bot
      if (action.type === ACTION.END_TURN) {
        const nextId = engine.getCurrentPlayerId();
        if (botIds.has(nextId)) {
          scheduleBotTick(roomId, engine, nextId, 800);
        }
        return;
      }

      // Re-fetch state after action to check current situation
      const updatedState = engine.getStateForPlayer(botId);
      const stillNeedsAction =
        updatedState.currentPlayerId === botId ||
        updatedState.pendingTarget?.playerId === botId ||
        updatedState.pendingChoice?.playerId === botId;

      if (stillNeedsAction) {
        scheduleBotTick(roomId, engine, botId, 600 + Math.random() * 400);
      }
    } catch (err) {
      console.error(`Bot ${botId} tick crashed:`, err);
      // Recover: force end turn so game doesn't freeze
      try {
        const currentId = engine.getCurrentPlayerId();
        if (currentId === botId) {
          engine.handleAction(botId, { type: ACTION.END_TURN });
        }
        broadcastState(roomId, engine);
        const nextId = engine.getCurrentPlayerId();
        if (botIds.has(nextId)) {
          scheduleBotTick(roomId, engine, nextId, 800);
        }
      } catch (e) {
        console.error("Bot crash recovery also failed:", e);
      }
    }
  }

  // Track socket -> account username for logged-in players
  const socketAccounts = new Map(); // socketId -> username

  io.on("connection", (socket) => {
    let playerName = "Player";

    // Authenticate socket with account token
    socket.on("authenticate", async ({ token }, callback) => {
      const username = await validateToken(token);
      if (username) {
        socketAccounts.set(socket.id, username);
        callback?.({ success: true, username });
      } else {
        callback?.({ error: "Invalid token" });
      }
    });

    socket.on(EVENTS.CREATE_ROOM, ({ name, options }, callback) => {
      playerName = name || "Player";
      const room = lobby.createRoom(socket.id, playerName, options);
      socket.join(room.id);
      callback?.({ room });
      io.emit(EVENTS.ROOM_LIST, lobby.getRoomList());
    });

    socket.on(EVENTS.JOIN_ROOM, ({ roomId, name }, callback) => {
      playerName = name || "Player";
      const result = lobby.joinRoom(roomId, socket.id, playerName);
      if (result.error) {
        callback?.({ error: result.error });
        return;
      }
      socket.join(roomId);
      callback?.({ room: result.room });
      io.to(roomId).emit(EVENTS.ROOM_UPDATE, result.room);
      io.emit(EVENTS.ROOM_LIST, lobby.getRoomList());
    });

    // --- Reconnection: rejoin an active game with a new socket ---
    socket.on(EVENTS.REJOIN_ROOM, ({ roomId, name }, callback) => {
      playerName = name || "Player";
      const room = lobby.getRoom(roomId);
      if (!room) {
        callback?.({ error: "Room no longer exists" });
        return;
      }

      // Find the old player entry by name
      const oldPlayer = room.players.find(
        (p) => p.name === playerName && !botIds.has(p.id),
      );
      if (!oldPlayer) {
        callback?.({ error: "Player not found in room" });
        return;
      }

      const oldId = oldPlayer.id;
      const newId = socket.id;

      // Update player ID in room
      oldPlayer.id = newId;
      if (room.host === oldId) room.host = newId;

      // Update lobby tracking
      lobby.playerRooms.delete(oldId);
      lobby.playerRooms.set(newId, roomId);
      socket.join(roomId);

      // Transfer account tracking
      const username = socketAccounts.get(oldId);
      if (username) {
        socketAccounts.delete(oldId);
        socketAccounts.set(newId, username);
      }

      const game = lobby.getGame(roomId);
      if (game) {
        // Cancel disconnect grace period timer if active
        if (disconnectTimers.has(oldId)) {
          clearTimeout(disconnectTimers.get(oldId));
          disconnectTimers.delete(oldId);
        }

        // Remap player in game state
        const playerState = game.state.players[oldId];
        if (playerState) {
          playerState.id = newId;
          playerState.connected = true;
          game.state.players[newId] = playerState;
          delete game.state.players[oldId];
        }

        // Update turn order
        const turnIdx = game.state.turnOrder.indexOf(oldId);
        if (turnIdx !== -1) game.state.turnOrder[turnIdx] = newId;

        // Update stats tracking
        if (game.state.stats[oldId]) {
          game.state.stats[newId] = game.state.stats[oldId];
          delete game.state.stats[oldId];
        }

        // Update any pending target/choice referencing old ID
        if (game.state.pendingTarget?.playerId === oldId) {
          game.state.pendingTarget.playerId = newId;
        }
        if (game.state.pendingChoice?.playerId === oldId) {
          game.state.pendingChoice.playerId = newId;
        }

        // Update creature references (_controller, _originalOwner, _harambeOwner)
        for (const [pid, p] of Object.entries(game.state.players)) {
          for (const c of p.swamp) {
            if (c._controller === oldId) c._controller = newId;
            if (c._originalOwner === oldId) c._originalOwner = newId;
            if (c._harambeOwner === oldId) c._harambeOwner = newId;
          }
        }

        // Notify other players
        for (const p of room.players) {
          if (p.id !== newId && !botIds.has(p.id)) {
            io.to(p.id).emit(EVENTS.PLAYER_RECONNECTED, {
              playerId: newId,
              playerName,
            });
          }
        }

        // Send current game state to reconnected player
        const state = game.getStateForPlayer(newId);
        callback?.({ success: true, room, gameState: state });

        // Also emit GAME_STATE so the client's listener picks it up
        socket.emit(EVENTS.GAME_STATE, state);

        // If it's this player's turn and they were being skipped, they can now play
        // Broadcast updated state to all players
        broadcastState(roomId, game);
      } else {
        // Game hasn't started yet — just rejoin the room
        callback?.({ success: true, room });
        io.to(roomId).emit(EVENTS.ROOM_UPDATE, room);
      }
    });

    socket.on(EVENTS.LEAVE_ROOM, () => {
      const roomId = lobby.getPlayerRoom(socket.id);
      if (!roomId) return;
      socket.leave(roomId);
      const result = lobby.leaveRoom(socket.id);
      if (result && !result.deleted) {
        io.to(roomId).emit(EVENTS.ROOM_UPDATE, result.room);
      }
      io.emit(EVENTS.ROOM_LIST, lobby.getRoomList());
    });

    socket.on(EVENTS.READY_UP, () => {
      const roomId = lobby.getPlayerRoom(socket.id);
      if (!roomId) return;
      const room = lobby.toggleReady(socket.id);
      if (room) {
        io.to(roomId).emit(EVENTS.ROOM_UPDATE, room);
      }
    });

    // --- Bot management ---
    socket.on(EVENTS.ADD_BOT, (data, callback) => {
      const roomId = lobby.getPlayerRoom(socket.id);
      if (!roomId) return;
      const room = lobby.getRoom(roomId);
      if (!room || room.host !== socket.id) {
        callback?.({ error: "Only host can add bots" });
        return;
      }
      if (room.started) {
        callback?.({ error: "Game already started" });
        return;
      }
      if (room.players.length >= room.maxPlayers) {
        callback?.({ error: "Room is full" });
        return;
      }

      const difficulty = data?.difficulty || "medium";
      const botId = createBotId();
      const botName = getBotName();
      botIds.add(botId);
      botDifficulty.set(botId, difficulty);

      const diffLabel =
        difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
      // Add bot to room directly
      room.players.push({
        id: botId,
        name: `${botName}`,
        ready: true,
        isBot: true,
        difficulty,
      });
      lobby.playerRooms.set(botId, roomId);

      io.to(roomId).emit(EVENTS.ROOM_UPDATE, room);
      io.emit(EVENTS.ROOM_LIST, lobby.getRoomList());
      callback?.({ success: true, botId, botName });
    });

    socket.on(EVENTS.REMOVE_BOT, ({ botId }, callback) => {
      const roomId = lobby.getPlayerRoom(socket.id);
      if (!roomId) return;
      const room = lobby.getRoom(roomId);
      if (!room || room.host !== socket.id) {
        callback?.({ error: "Only host can remove bots" });
        return;
      }
      if (!botIds.has(botId)) {
        callback?.({ error: "Not a bot" });
        return;
      }

      const bot = room.players.find((p) => p.id === botId);
      if (bot) {
        releaseBotName(bot.name);
        clearBotChat(botId);
      }
      room.players = room.players.filter((p) => p.id !== botId);
      lobby.playerRooms.delete(botId);
      botIds.delete(botId);
      botDifficulty.delete(botId);

      io.to(roomId).emit(EVENTS.ROOM_UPDATE, room);
      io.emit(EVENTS.ROOM_LIST, lobby.getRoomList());
      callback?.({ success: true });
    });

    socket.on(EVENTS.SET_ROOM_SETTINGS, ({ settings }, callback) => {
      const roomId = lobby.getPlayerRoom(socket.id);
      if (!roomId) return;
      const room = lobby.getRoom(roomId);
      if (!room || room.host !== socket.id) {
        callback?.({ error: "Only host can change settings" });
        return;
      }
      if (room.started) {
        callback?.({ error: "Game already started" });
        return;
      }
      // Validate and apply settings
      if (settings.winSP != null)
        room.winSP = Math.max(
          1000,
          Math.min(20000, Number(settings.winSP) || 10000),
        );
      if (settings.startingSP != null)
        room.startingSP = Math.max(
          0,
          Math.min(5000, Number(settings.startingSP) || 0),
        );
      if (settings.maxPlayers != null)
        room.maxPlayers = Math.max(
          2,
          Math.min(6, Number(settings.maxPlayers) || 6),
        );
      if (settings.startingHandSize != null)
        room.startingHandSize = Math.max(
          3,
          Math.min(10, Number(settings.startingHandSize) || 5),
        );
      if (settings.baseAP != null)
        room.baseAP = Math.max(1, Math.min(5, Number(settings.baseAP) || 2));
      if (settings.eventsEnabled != null)
        room.eventsEnabled = !!settings.eventsEnabled;
      io.to(roomId).emit(EVENTS.ROOM_UPDATE, room);
      callback?.({ success: true });
    });

    socket.on(EVENTS.SET_THEME, ({ theme }, callback) => {
      const roomId = lobby.getPlayerRoom(socket.id);
      if (!roomId) return;
      const room = lobby.getRoom(roomId);
      if (!room || room.host !== socket.id) {
        callback?.({ error: "Only host can set theme" });
        return;
      }
      if (!["swamp", "blood", "frost"].includes(theme)) {
        callback?.({ error: "Invalid theme" });
        return;
      }
      room.theme = theme;
      io.to(roomId).emit(EVENTS.ROOM_UPDATE, room);
      callback?.({ success: true });
    });

    socket.on(EVENTS.START_GAME, (_, callback) => {
      const roomId = lobby.getPlayerRoom(socket.id);
      if (!roomId) return;
      const room = lobby.getRoom(roomId);
      if (!room || room.host !== socket.id) {
        callback?.({ error: "Only host can start" });
        return;
      }

      const result = lobby.startGame(roomId);
      if (result.error) {
        callback?.({ error: result.error });
        return;
      }

      // Attach account usernames to player state for stat tracking
      for (const p of result.room.players) {
        const username = socketAccounts.get(p.id);
        if (username && result.engine.state.players[p.id]) {
          result.engine.state.players[p.id]._accountUsername = username;
        }
      }

      // Wire up pending choice timeout callback (broadcasts state + triggers bots)
      result.engine._onPendingChoiceTimeout = () => {
        broadcastState(roomId, result.engine);
        runBotTurn(roomId, result.engine);
      };

      // Wire up pending target timeout callback
      result.engine._onPendingTargetTimeout = () => {
        broadcastState(roomId, result.engine);
        runBotTurn(roomId, result.engine);
      };

      // Send initial state to each human player
      for (const p of result.room.players) {
        if (botIds.has(p.id)) continue;
        io.to(p.id).emit(
          EVENTS.GAME_STATE,
          result.engine.getStateForPlayer(p.id),
        );
      }
      callback?.({ success: true });
      io.emit(EVENTS.ROOM_LIST, lobby.getRoomList());

      // If first player is a bot, start their turn
      runBotTurn(roomId, result.engine);
    });

    socket.on(EVENTS.GAME_ACTION, async (action, callback) => {
      const roomId = lobby.getPlayerRoom(socket.id);
      if (!roomId) return;
      const engine = lobby.getGame(roomId);
      if (!engine) {
        callback?.({ error: "No active game" });
        return;
      }

      const result = engine.handleAction(socket.id, action);

      if (!result.success && !result.needsTarget) {
        callback?.({ error: result.error });
        socket.emit(EVENTS.GAME_ERROR, { error: result.error });
        return;
      }

      callback?.({ success: true });
      broadcastState(roomId, engine);

      if (result.gameOver) {
        await updateStatsAfterGame(engine.state, result.winner);
        io.to(roomId).emit(EVENTS.GAME_OVER, {
          winner: result.winner,
          winnerName: engine.state.players[result.winner].name,
          stats: engine.state.stats,
        });
        cleanupFinishedGame(roomId);
        return;
      }

      // After human action, check if a bot needs to respond or if it's bot's turn
      setTimeout(() => runBotTurn(roomId, engine), 500);
    });

    // --- Chat ---
    socket.on(EVENTS.CHAT_MESSAGE, (data) => {
      const roomId = lobby.getPlayerRoom(socket.id);
      if (!roomId) return;
      const game = lobby.getGame(roomId);
      if (!game) return; // only during active games

      // Rate limit: 1 msg/sec
      const now = Date.now();
      const last = lastChatTime.get(socket.id) || 0;
      if (now - last < 1000) return; // silent drop
      lastChatTime.set(socket.id, now);

      const player = game.state.players[socket.id];
      if (!player) return;

      const msg = {
        id: `${socket.id}-${now}`,
        playerId: socket.id,
        playerName: player.name,
        timestamp: now,
      };

      if (data.emoteKey) {
        const validEmote = CHAT_EMOTES.find((e) => e.key === data.emoteKey);
        if (!validEmote) return;
        msg.emoteKey = data.emoteKey;
      } else if (typeof data.text === "string") {
        const text = data.text.trim().slice(0, 100);
        if (!text) return;
        msg.text = text;
      } else {
        return;
      }

      io.to(roomId).emit(EVENTS.CHAT_MESSAGE, msg);

      // Bot replies to player messages
      const room = lobby.getRoom(roomId);
      if (room) {
        for (const p of room.players) {
          if (!botIds.has(p.id)) continue;
          const reply = generateBotReply(p.id);
          if (reply) {
            // Delay bot reply 1-3 seconds for realism
            const delay = 1000 + Math.random() * 2000;
            setTimeout(() => {
              const botMsg = {
                id: `${p.id}-${Date.now()}`,
                playerId: p.id,
                playerName: p.name,
                timestamp: Date.now(),
                ...reply,
              };
              io.to(roomId).emit(EVENTS.CHAT_MESSAGE, botMsg);
            }, delay);
          }
        }
      }
    });

    socket.on(EVENTS.ROOM_LIST, (_, callback) => {
      callback?.(lobby.getRoomList());
    });

    socket.on("disconnect", () => {
      lastChatTime.delete(socket.id);
      const roomId = lobby.getPlayerRoom(socket.id);
      if (!roomId) {
        socketAccounts.delete(socket.id);
        return;
      }

      const game = lobby.getGame(roomId);
      if (game) {
        // Mark player disconnected but keep in game — don't delete playerRooms or socketAccounts
        // so the rejoin handler can find them
        const player = game.state.players[socket.id];
        if (player) {
          player.connected = false;
          const room = lobby.getRoom(roomId);
          if (room) {
            for (const p of room.players) {
              if (p.id !== socket.id && !botIds.has(p.id)) {
                io.to(p.id).emit(EVENTS.PLAYER_DISCONNECTED, {
                  playerId: socket.id,
                  playerName: player.name,
                });
              }
            }
          }

          // If it was this player's turn, give 15s grace period before force-ending
          if (game.getCurrentPlayerId() === socket.id) {
            const timer = setTimeout(() => {
              disconnectTimers.delete(socket.id);
              // Only force end turn if still this player's turn and still disconnected
              const p = game.state.players[socket.id];
              if (
                p &&
                !p.connected &&
                game.getCurrentPlayerId() === socket.id
              ) {
                game.handleAction(socket.id, { type: ACTION.END_TURN });
                broadcastState(roomId, game);
                runBotTurn(roomId, game);
              }
            }, 15000);
            disconnectTimers.set(socket.id, timer);
          }
        }
      } else {
        // Not in game, just leave lobby
        socketAccounts.delete(socket.id);
        const result = lobby.leaveRoom(socket.id);
        if (result && !result.deleted) {
          io.to(roomId).emit(EVENTS.ROOM_UPDATE, result.room);
        }
        io.emit(EVENTS.ROOM_LIST, lobby.getRoomList());
      }
    });
  });
}
