import {
  MIN_PLAYERS,
  MAX_PLAYERS,
  WIN_SP,
  QUICK_WIN_SP,
} from "../../../shared/src/constants.js";
import { GameEngine } from "../game/GameEngine.js";

const ROOM_ADJ = [
  "Grimy",
  "Sneaky",
  "Rotten",
  "Murky",
  "Cursed",
  "Soggy",
  "Festering",
  "Twisted",
  "Putrid",
  "Dodgy",
  "Wonky",
  "Slimy",
  "Boggy",
  "Crusty",
  "Dank",
  "Filthy",
  "Grotty",
  "Manky",
  "Toxic",
  "Warty",
  "Charred",
  "Jagged",
  "Bloated",
  "Crooked",
  "Savage",
  "Rabid",
  "Barmy",
  "Craggy",
];
const ROOM_NOUN = [
  "Burrow",
  "Den",
  "Pit",
  "Hollow",
  "Lair",
  "Cavern",
  "Hovel",
  "Stump",
  "Marsh",
  "Bog",
  "Mire",
  "Grotto",
  "Crypt",
  "Shanty",
  "Hut",
  "Cellar",
  "Hole",
  "Nest",
  "Trench",
  "Swamp",
  "Gutter",
  "Sewer",
  "Dungeon",
  "Warren",
  "Foxhole",
  "Bunker",
  "Ditch",
  "Tomb",
];

let nextRoomId = 1;

function generateRoomName() {
  const adj = ROOM_ADJ[Math.floor(Math.random() * ROOM_ADJ.length)];
  const noun = ROOM_NOUN[Math.floor(Math.random() * ROOM_NOUN.length)];
  return `${adj} ${noun}`;
}

export class LobbyManager {
  constructor() {
    this.rooms = new Map(); // roomId -> room
    this.games = new Map(); // roomId -> GameEngine
    this.playerRooms = new Map(); // socketId -> roomId
  }

  createRoom(hostId, hostName, options = {}) {
    const roomId = `room_${nextRoomId++}`;
    const room = {
      id: roomId,
      name: generateRoomName(),
      host: hostId,
      players: [{ id: hostId, name: hostName, ready: false }],
      maxPlayers: options.maxPlayers || MAX_PLAYERS,
      quickGame: options.quickGame || false,
      theme: "swamp",
      started: false,
      createdAt: Date.now(),
    };
    this.rooms.set(roomId, room);
    this.playerRooms.set(hostId, roomId);
    return room;
  }

  joinRoom(roomId, playerId, playerName) {
    const room = this.rooms.get(roomId);
    if (!room) return { error: "Room not found" };
    if (room.started) return { error: "Game already started" };
    if (room.players.length >= room.maxPlayers)
      return { error: "Room is full" };
    if (room.players.some((p) => p.id === playerId))
      return { error: "Already in room" };

    room.players.push({ id: playerId, name: playerName, ready: false });
    this.playerRooms.set(playerId, roomId);
    return { room };
  }

  leaveRoom(playerId) {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return;
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.players = room.players.filter((p) => p.id !== playerId);
    this.playerRooms.delete(playerId);

    if (room.players.length === 0) {
      this.rooms.delete(roomId);
      this.games.delete(roomId);
      return { deleted: true };
    }

    // Transfer host
    if (room.host === playerId) {
      room.host = room.players[0].id;
    }

    return { room };
  }

  toggleReady(playerId) {
    const roomId = this.playerRooms.get(playerId);
    if (!roomId) return null;
    const room = this.rooms.get(roomId);
    if (!room) return null;

    const player = room.players.find((p) => p.id === playerId);
    if (player) player.ready = !player.ready;
    return room;
  }

  canStart(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return false;
    if (room.players.length < MIN_PLAYERS) return false;
    return room.players.every((p) => p.ready);
  }

  startGame(roomId) {
    const room = this.rooms.get(roomId);
    if (!room) return { error: "Room not found" };
    if (!this.canStart(roomId))
      return { error: "Not all players ready or not enough players" };

    room.started = true;
    const playerIds = room.players.map((p) => p.id);
    const playerNames = room.players.map((p) => p.name);
    const winSP = room.winSP || WIN_SP;

    const engine = new GameEngine(playerIds, playerNames, winSP, room.theme, {
      startingSP: room.startingSP || 0,
      startingHandSize: room.startingHandSize,
      baseAP: room.baseAP,
      eventsEnabled: room.eventsEnabled || false,
    });
    this.games.set(roomId, engine);

    return { engine, room };
  }

  getGame(roomId) {
    return this.games.get(roomId);
  }

  getPlayerRoom(playerId) {
    return this.playerRooms.get(playerId);
  }

  getRoom(roomId) {
    return this.rooms.get(roomId);
  }

  getRoomList() {
    const list = [];
    for (const room of this.rooms.values()) {
      if (!room.started) {
        list.push({
          id: room.id,
          name: room.name,
          host: room.players.find((p) => p.id === room.host)?.name || "Unknown",
          playerCount: room.players.length,
          maxPlayers: room.maxPlayers,
          quickGame: room.quickGame,
          theme: room.theme || "swamp",
          winSP: room.winSP || (room.quickGame ? QUICK_WIN_SP : WIN_SP),
        });
      }
    }
    return list;
  }
}
