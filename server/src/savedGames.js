/**
 * Saved games — Postgres when DATABASE_URL is set, JSON file fallback for local dev.
 * One save slot per player (overwrite on re-save).
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const SAVES_FILE = path.join(DATA_DIR, "saved_games.json");

// ---------- Detect storage mode ----------

const usePostgres = !!process.env.DATABASE_URL;
let pool = null;

if (usePostgres) {
  const { default: pg } = await import("pg");
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
}

// ---------- Postgres helpers ----------

async function initSavedGames() {
  if (!usePostgres) {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    loadSaves();
    console.log("[SavedGames] Using JSON file storage");
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS gg_saved_games (
      username VARCHAR(20) PRIMARY KEY,
      game_state JSONB NOT NULL,
      room_settings JSONB NOT NULL,
      saved_at BIGINT NOT NULL
    );
  `);
  console.log("[SavedGames] Postgres table ready");
}

// ---------- JSON file helpers (fallback) ----------

let saves = {};

function loadSaves() {
  if (existsSync(SAVES_FILE)) {
    try {
      saves = JSON.parse(readFileSync(SAVES_FILE, "utf-8"));
    } catch {
      saves = {};
    }
  }
}

function writeSaves() {
  const tmpFile = SAVES_FILE + ".tmp";
  try {
    writeFileSync(tmpFile, JSON.stringify(saves, null, 2), "utf-8");
    renameSync(tmpFile, SAVES_FILE);
  } catch (err) {
    console.error("[SavedGames] Failed to write saves file:", err.message);
    throw err;
  }
}

// ---------- Public API ----------

async function saveGame(username, gameState, roomSettings) {
  if (!username) throw new Error("saveGame: username is required");
  if (!gameState) throw new Error("saveGame: gameState is required");
  if (!roomSettings) throw new Error("saveGame: roomSettings is required");
  const key = username.toLowerCase();
  const savedAt = Date.now();

  if (usePostgres) {
    await pool.query(
      `INSERT INTO gg_saved_games (username, game_state, room_settings, saved_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (username) DO UPDATE SET
         game_state = $2, room_settings = $3, saved_at = $4`,
      [key, JSON.stringify(gameState), JSON.stringify(roomSettings), savedAt],
    );
  } else {
    saves[key] = { gameState, roomSettings, savedAt };
    writeSaves();
  }
}

async function loadGame(username) {
  if (!username) return null;
  const key = username.toLowerCase();

  if (usePostgres) {
    const result = await pool.query(
      "SELECT game_state, room_settings, saved_at FROM gg_saved_games WHERE username = $1",
      [key],
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      gameState: row.game_state,
      roomSettings: row.room_settings,
      savedAt: Number(row.saved_at),
    };
  }

  const save = saves[key];
  if (!save) return null;
  return { ...save };
}

async function deleteSavedGame(username) {
  if (!username) return;
  const key = username.toLowerCase();

  if (usePostgres) {
    await pool.query("DELETE FROM gg_saved_games WHERE username = $1", [key]);
  } else {
    delete saves[key];
    writeSaves();
  }
}

async function hasSavedGame(username) {
  if (!username) return false;
  const key = username.toLowerCase();

  if (usePostgres) {
    const result = await pool.query(
      "SELECT saved_at FROM gg_saved_games WHERE username = $1",
      [key],
    );
    return result.rows.length > 0;
  }

  return !!saves[key];
}

async function getSavedGameInfo(username) {
  const save = await loadGame(username);
  if (!save) return { hasSave: false };

  const { gameState, roomSettings } = save;
  const players = (gameState && gameState.players) ? Object.values(gameState.players) : [];
  const botCount = players.filter((p) => p && p.isBot).length;

  return {
    hasSave: true,
    turnNumber: (gameState && gameState.turnNumber) || 1,
    theme: (roomSettings && roomSettings.theme) || "swamp",
    botCount,
    savedAt: save.savedAt,
  };
}

export {
  initSavedGames,
  saveGame,
  loadGame,
  deleteSavedGame,
  hasSavedGame,
  getSavedGameInfo,
};
