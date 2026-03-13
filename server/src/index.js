import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { LobbyManager } from './lobby/LobbyManager.js';
import { setupSocketHandlers } from './socket/SocketHandler.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
  },
});

const lobby = new LobbyManager();

setupSocketHandlers(io, lobby);

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', rooms: lobby.getRoomList().length });
});

// In-game feedback -> create GitHub issue
app.post('/api/feedback', async (req, res) => {
  const { title, body, labels } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'GitHub token not configured' });
  }

  try {
    const response = await fetch('https://api.github.com/repos/Lotron-Electrical/goblins-gambit/issues', {
      method: 'POST',
      headers: {
        'Authorization': `token ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.github.v3+json',
      },
      body: JSON.stringify({
        title,
        body,
        labels: labels ? [labels] : [],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error('[Feedback] GitHub API error:', err);
      return res.status(response.status).json({ error: 'Failed to create issue' });
    }

    const issue = await response.json();
    res.json({ success: true, issueNumber: issue.number, url: issue.html_url });
  } catch (e) {
    console.error('[Feedback] Error:', e);
    res.status(500).json({ error: 'Failed to create issue' });
  }
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Goblin's Gambit server running on port ${PORT}`);
});
