import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import path from "path";
import { fileURLToPath } from "url";
import { LobbyManager } from "./lobby/LobbyManager.js";
import { setupSocketHandlers } from "./socket/SocketHandler.js";
import {
  initDatabase,
  register,
  login,
  getProfile,
  getLeaderboard,
  validateToken,
} from "./accounts.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === "production";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: isProduction
    ? {}
    : {
        origin: [
          "http://localhost:5173",
          "http://localhost:5174",
          "http://localhost:3000",
        ],
        methods: ["GET", "POST"],
      },
});

const lobby = new LobbyManager();

setupSocketHandlers(io, lobby);

app.use(express.json({ limit: "5mb" }));

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", rooms: lobby.getRoomList().length });
});

// --- Player Accounts ---

app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  const result = await register(username, password);
  if (result.error) return res.status(400).json({ error: result.error });
  const profile = await getProfile(username);
  res.json({ token: result.token, user: profile });
});

app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const result = await login(username, password);
  if (result.error) return res.status(401).json({ error: result.error });
  const profile = await getProfile(result.username);
  res.json({ token: result.token, user: profile });
});

app.get("/api/profile", async (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const username = await validateToken(token);
  if (!username) return res.status(401).json({ error: "Not authenticated" });
  const profile = await getProfile(username);
  if (!profile) return res.status(404).json({ error: "User not found" });
  res.json({ user: profile });
});

app.get("/api/profile/:username", async (req, res) => {
  const profile = await getProfile(req.params.username);
  if (!profile) return res.status(404).json({ error: "User not found" });
  res.json(profile);
});

app.get("/api/leaderboard", async (req, res) => {
  res.json(await getLeaderboard());
});

// In-game feedback -> create GitHub issue (with optional screenshot)
app.post("/api/feedback", async (req, res) => {
  const { title, body, labels, screenshot } = req.body;
  if (!title) return res.status(400).json({ error: "Title required" });

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: "GitHub token not configured" });
  }

  try {
    let screenshotUrl = null;

    // Upload screenshot to repo if provided
    if (screenshot) {
      const filename = `screenshots/feedback-${Date.now()}.png`;
      const uploadRes = await fetch(
        `https://api.github.com/repos/Lotron-Electrical/goblins-gambit/contents/${filename}`,
        {
          method: "PUT",
          headers: {
            Authorization: `token ${token}`,
            "Content-Type": "application/json",
            Accept: "application/vnd.github.v3+json",
          },
          body: JSON.stringify({
            message: `Screenshot for feedback: ${title}`,
            content: screenshot,
            branch: "master",
          }),
        },
      );
      if (uploadRes.ok) {
        const uploadData = await uploadRes.json();
        screenshotUrl = uploadData.content?.download_url;
      } else {
        console.error(
          "[Feedback] Screenshot upload failed:",
          await uploadRes.text(),
        );
      }
    }

    // Build issue body with screenshot if available
    let issueBody = body;
    if (screenshotUrl) {
      issueBody += `\n\n## Screenshot\n![Screenshot](${screenshotUrl})`;
    }

    const response = await fetch(
      "https://api.github.com/repos/Lotron-Electrical/goblins-gambit/issues",
      {
        method: "POST",
        headers: {
          Authorization: `token ${token}`,
          "Content-Type": "application/json",
          Accept: "application/vnd.github.v3+json",
        },
        body: JSON.stringify({
          title,
          body: issueBody,
          labels: labels ? [labels] : [],
        }),
      },
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("[Feedback] GitHub API error:", err);
      return res
        .status(response.status)
        .json({ error: "Failed to create issue" });
    }

    const issue = await response.json();
    res.json({ success: true, issueNumber: issue.number, url: issue.html_url });
  } catch (e) {
    console.error("[Feedback] Error:", e);
    res.status(500).json({ error: "Failed to create issue" });
  }
});

// Serve built client in production
const clientDist = path.join(__dirname, "../../client/dist");
// Cache-bust index.html so deploys are picked up immediately
app.use(
  express.static(clientDist, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith("index.html")) {
        res.set("Cache-Control", "no-cache, must-revalidate");
      }
    },
  }),
);
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api") || req.path.startsWith("/socket.io"))
    return next();
  res.set("Cache-Control", "no-cache, must-revalidate");
  res.sendFile(path.join(clientDist, "index.html"));
});

const PORT = process.env.PORT || 3001;

await initDatabase();

httpServer.listen(PORT, () => {
  console.log(`Goblin's Gambit server running on port ${PORT}`);
});
