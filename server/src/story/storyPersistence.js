/**
 * Story persistence — Postgres when DATABASE_URL is set, JSON file fallback for local dev.
 * Manages story runs, trophy cards, and achievement unlocks.
 */

import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  renameSync,
} from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "..", "data");
const STORY_FILE = path.join(DATA_DIR, "story_data.json");

// ---------- Detect storage mode ----------

const usePostgres = !!process.env.DATABASE_URL;
let pool = null;

if (usePostgres) {
  const { default: pg } = await import("pg");
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });
}

// ---------- Postgres helpers ----------

async function initStoryPersistence() {
  if (!usePostgres) {
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    loadData();
    console.log("[StoryPersistence] Using JSON file storage");
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS gg_story_runs (
      username VARCHAR(20) PRIMARY KEY,
      run_state JSONB NOT NULL,
      saved_at BIGINT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS gg_story_trophies (
      id SERIAL PRIMARY KEY,
      username VARCHAR(20) NOT NULL,
      trophy_card JSONB NOT NULL,
      level_reached VARCHAR(20) NOT NULL,
      nightmare BOOLEAN DEFAULT FALSE,
      completed_at BIGINT NOT NULL
    );
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS gg_story_achievements (
      username VARCHAR(20) NOT NULL,
      achievement_id VARCHAR(50) NOT NULL,
      unlocked_at BIGINT NOT NULL,
      PRIMARY KEY (username, achievement_id)
    );
  `);

  console.log("[StoryPersistence] Postgres tables ready");
}

// ---------- JSON file helpers (fallback) ----------

let data = { runs: {}, trophies: {}, achievements: {} };

function loadData() {
  if (existsSync(STORY_FILE)) {
    try {
      const parsed = JSON.parse(readFileSync(STORY_FILE, "utf-8"));
      data = {
        runs: (parsed && parsed.runs) || {},
        trophies: (parsed && parsed.trophies) || {},
        achievements: (parsed && parsed.achievements) || {},
      };
    } catch (err) {
      console.error(
        "[StoryPersistence] Failed to parse story data, resetting:",
        err.message,
      );
      data = { runs: {}, trophies: {}, achievements: {} };
    }
  }
}

function writeData() {
  const tmpFile = STORY_FILE + ".tmp";
  try {
    writeFileSync(tmpFile, JSON.stringify(data, null, 2), "utf-8");
    renameSync(tmpFile, STORY_FILE);
  } catch (err) {
    console.error("[StoryPersistence] Failed to write data file:", err.message);
    throw err;
  }
}

// ---------- Public API — Runs ----------

async function saveStoryRun(username, runState) {
  if (!username) throw new Error("saveStoryRun: username is required");
  if (!runState) throw new Error("saveStoryRun: runState is required");
  const key = username.toLowerCase();
  const savedAt = Date.now();

  if (usePostgres) {
    await pool.query(
      `INSERT INTO gg_story_runs (username, run_state, saved_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (username) DO UPDATE SET
         run_state = $2, saved_at = $3`,
      [key, JSON.stringify(runState), savedAt],
    );
  } else {
    data.runs[key] = { runState, savedAt };
    writeData();
  }
}

async function loadStoryRun(username) {
  if (!username) return null;
  const key = username.toLowerCase();

  if (usePostgres) {
    const result = await pool.query(
      "SELECT run_state, saved_at FROM gg_story_runs WHERE username = $1",
      [key],
    );
    if (result.rows.length === 0) return null;
    const row = result.rows[0];
    return {
      runState: row.run_state,
      savedAt: Number(row.saved_at),
    };
  }

  const run = data.runs[key];
  if (!run) return null;
  return { ...run };
}

async function deleteStoryRun(username) {
  if (!username) return;
  const key = username.toLowerCase();

  if (usePostgres) {
    await pool.query("DELETE FROM gg_story_runs WHERE username = $1", [key]);
  } else {
    delete data.runs[key];
    writeData();
  }
}

async function hasStoryRun(username) {
  if (!username) return false;
  const key = username.toLowerCase();

  if (usePostgres) {
    const result = await pool.query(
      "SELECT saved_at FROM gg_story_runs WHERE username = $1",
      [key],
    );
    return result.rows.length > 0;
  }

  return !!data.runs[key];
}

// ---------- Public API — Trophies ----------

async function saveTrophyCard(username, trophyCard, levelReached, nightmare) {
  if (!username) throw new Error("saveTrophyCard: username is required");
  if (!trophyCard) throw new Error("saveTrophyCard: trophyCard is required");
  const key = username.toLowerCase();
  const completedAt = Date.now();

  if (usePostgres) {
    await pool.query(
      `INSERT INTO gg_story_trophies (username, trophy_card, level_reached, nightmare, completed_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [key, JSON.stringify(trophyCard), levelReached, !!nightmare, completedAt],
    );
  } else {
    if (!data.trophies[key]) data.trophies[key] = [];
    data.trophies[key].push({
      trophyCard,
      levelReached,
      nightmare: !!nightmare,
      completedAt,
    });
    writeData();
  }
}

async function getTrophyCards(username) {
  if (!username) return [];
  const key = username.toLowerCase();

  if (usePostgres) {
    const result = await pool.query(
      "SELECT trophy_card, level_reached, nightmare, completed_at FROM gg_story_trophies WHERE username = $1 ORDER BY completed_at ASC",
      [key],
    );
    return result.rows.map((row) => ({
      trophyCard: row.trophy_card,
      levelReached: row.level_reached,
      nightmare: row.nightmare,
      completedAt: Number(row.completed_at),
    }));
  }

  return (data.trophies[key] || []).map((t) => ({ ...t }));
}

// ---------- Public API — Achievements ----------

async function unlockAchievement(username, achievementId) {
  if (!username) throw new Error("unlockAchievement: username is required");
  if (!achievementId)
    throw new Error("unlockAchievement: achievementId is required");
  const key = username.toLowerCase();
  const unlockedAt = Date.now();

  if (usePostgres) {
    await pool.query(
      `INSERT INTO gg_story_achievements (username, achievement_id, unlocked_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (username, achievement_id) DO NOTHING`,
      [key, achievementId, unlockedAt],
    );
  } else {
    if (!data.achievements[key]) data.achievements[key] = {};
    if (!data.achievements[key][achievementId]) {
      data.achievements[key][achievementId] = { unlockedAt };
      writeData();
    }
  }
}

async function getAchievements(username) {
  if (!username) return [];
  const key = username.toLowerCase();

  if (usePostgres) {
    const result = await pool.query(
      "SELECT achievement_id, unlocked_at FROM gg_story_achievements WHERE username = $1 ORDER BY unlocked_at ASC",
      [key],
    );
    return result.rows.map((row) => ({
      achievementId: row.achievement_id,
      unlockedAt: Number(row.unlocked_at),
    }));
  }

  const userAchievements = data.achievements[key] || {};
  return Object.entries(userAchievements).map(([achievementId, entry]) => ({
    achievementId,
    unlockedAt: entry.unlockedAt,
  }));
}

export {
  initStoryPersistence,
  saveStoryRun,
  loadStoryRun,
  deleteStoryRun,
  hasStoryRun,
  saveTrophyCard,
  getTrophyCards,
  unlockAchievement,
  getAchievements,
};
