import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { LobbyManager } from './lobby/LobbyManager.js';
import { setupSocketHandlers } from './socket/SocketHandler.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
  },
});

const lobby = new LobbyManager();

setupSocketHandlers(io, lobby);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', rooms: lobby.getRoomList().length });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Goblin's Gambit server running on port ${PORT}`);
});
