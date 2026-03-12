import { EVENTS, ACTION } from '../../../shared/src/constants.js';
import { createBotId, getBotName, decideBotAction } from '../bot/BotPlayer.js';

export function setupSocketHandlers(io, lobby) {
  // Track which rooms have bots and bot IDs
  const botIds = new Set();

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
    const currentId = engine.getCurrentPlayerId();
    if (!botIds.has(currentId)) return;

    // Small delay to feel natural
    const tick = () => {
      const botState = engine.getStateForPlayer(currentId);
      if (botState.phase !== 'playing') return;

      // Check if bot needs to respond to pending target/choice
      const needsResponse = botState.pendingTarget?.playerId === currentId
        || botState.pendingChoice?.playerId === currentId;

      if (botState.currentPlayerId !== currentId && !needsResponse) return;

      const action = decideBotAction(botState);
      if (!action) return;

      const result = engine.handleAction(currentId, action);
      broadcastState(roomId, engine);

      if (result.gameOver) {
        io.to(roomId).emit(EVENTS.GAME_OVER, {
          winner: result.winner,
          winnerName: engine.state.players[result.winner].name,
        });
        return;
      }

      // If bot ended turn, check if next player is also a bot
      if (action.type === ACTION.END_TURN) {
        const nextId = engine.getCurrentPlayerId();
        if (botIds.has(nextId)) {
          setTimeout(tick, 800);
        }
        return;
      }

      // Continue bot's turn if it still has actions
      if (botState.currentPlayerId === currentId || needsResponse) {
        setTimeout(tick, 600 + Math.random() * 400);
      }
    };

    setTimeout(tick, 1000 + Math.random() * 500);
  }

  io.on('connection', (socket) => {
    let playerName = 'Player';

    socket.on(EVENTS.CREATE_ROOM, ({ name, options }, callback) => {
      playerName = name || 'Player';
      const room = lobby.createRoom(socket.id, playerName, options);
      socket.join(room.id);
      callback?.({ room });
      io.emit(EVENTS.ROOM_LIST, lobby.getRoomList());
    });

    socket.on(EVENTS.JOIN_ROOM, ({ roomId, name }, callback) => {
      playerName = name || 'Player';
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
    socket.on(EVENTS.ADD_BOT, (_, callback) => {
      const roomId = lobby.getPlayerRoom(socket.id);
      if (!roomId) return;
      const room = lobby.getRoom(roomId);
      if (!room || room.host !== socket.id) {
        callback?.({ error: 'Only host can add bots' });
        return;
      }
      if (room.started) {
        callback?.({ error: 'Game already started' });
        return;
      }
      if (room.players.length >= room.maxPlayers) {
        callback?.({ error: 'Room is full' });
        return;
      }

      const botId = createBotId();
      const botName = getBotName();
      botIds.add(botId);

      // Add bot to room directly
      room.players.push({ id: botId, name: botName, ready: true, isBot: true });
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
        callback?.({ error: 'Only host can remove bots' });
        return;
      }
      if (!botIds.has(botId)) {
        callback?.({ error: 'Not a bot' });
        return;
      }

      room.players = room.players.filter(p => p.id !== botId);
      lobby.playerRooms.delete(botId);
      botIds.delete(botId);

      io.to(roomId).emit(EVENTS.ROOM_UPDATE, room);
      io.emit(EVENTS.ROOM_LIST, lobby.getRoomList());
      callback?.({ success: true });
    });

    socket.on(EVENTS.START_GAME, (_, callback) => {
      const roomId = lobby.getPlayerRoom(socket.id);
      if (!roomId) return;
      const room = lobby.getRoom(roomId);
      if (!room || room.host !== socket.id) {
        callback?.({ error: 'Only host can start' });
        return;
      }

      const result = lobby.startGame(roomId);
      if (result.error) {
        callback?.({ error: result.error });
        return;
      }

      // Send initial state to each human player
      for (const p of result.room.players) {
        if (botIds.has(p.id)) continue;
        io.to(p.id).emit(EVENTS.GAME_STATE, result.engine.getStateForPlayer(p.id));
      }
      callback?.({ success: true });
      io.emit(EVENTS.ROOM_LIST, lobby.getRoomList());

      // If first player is a bot, start their turn
      runBotTurn(roomId, result.engine);
    });

    socket.on(EVENTS.GAME_ACTION, (action, callback) => {
      const roomId = lobby.getPlayerRoom(socket.id);
      if (!roomId) return;
      const engine = lobby.getGame(roomId);
      if (!engine) {
        callback?.({ error: 'No active game' });
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
        io.to(roomId).emit(EVENTS.GAME_OVER, {
          winner: result.winner,
          winnerName: engine.state.players[result.winner].name,
        });
        return;
      }

      // After human action, check if a bot needs to respond or if it's bot's turn
      setTimeout(() => runBotTurn(roomId, engine), 500);
    });

    socket.on(EVENTS.ROOM_LIST, (_, callback) => {
      callback?.(lobby.getRoomList());
    });

    socket.on('disconnect', () => {
      const roomId = lobby.getPlayerRoom(socket.id);
      if (!roomId) return;

      const game = lobby.getGame(roomId);
      if (game) {
        // Mark player disconnected but keep in game
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
        }
      } else {
        // Not in game, just leave lobby
        const result = lobby.leaveRoom(socket.id);
        if (result && !result.deleted) {
          io.to(roomId).emit(EVENTS.ROOM_UPDATE, result.room);
        }
        io.emit(EVENTS.ROOM_LIST, lobby.getRoomList());
      }
    });
  });
}
