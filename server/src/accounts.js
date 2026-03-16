/**
 * Player accounts — Postgres when DATABASE_URL is set, JSON file fallback for local dev.
 * No external dependencies beyond `pg` for Postgres.
 */

import { randomBytes, createHash } from "crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const ACCOUNTS_FILE = path.join(DATA_DIR, "accounts.json");

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

async function initDatabase() {
  if (!usePostgres) {
    // JSON file mode — ensure data dir exists
    if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
    loadAccounts();
    console.log("[Accounts] Using JSON file storage (no DATABASE_URL)");
    return;
  }

  await pool.query(`
    CREATE TABLE IF NOT EXISTS gg_accounts (
      username VARCHAR(20) PRIMARY KEY,
      display_name VARCHAR(20) NOT NULL,
      password_hash VARCHAR(64) NOT NULL,
      salt VARCHAR(32) NOT NULL,
      created_at BIGINT NOT NULL,
      games_played INT DEFAULT 0,
      games_won INT DEFAULT 0,
      total_sp INT DEFAULT 0,
      cards_played INT DEFAULT 0,
      creatures_killed INT DEFAULT 0,
      favourite_card VARCHAR(50),
      card_counts JSONB DEFAULT '{}',
      session_token VARCHAR(64)
    );
  `);
  // Add session_token column if upgrading from older schema
  await pool.query(`
    ALTER TABLE gg_accounts ADD COLUMN IF NOT EXISTS session_token VARCHAR(64);
  `);
  console.log("[Accounts] Postgres connected, gg_accounts table ready");
}

// ---------- JSON file helpers (fallback) ----------

let accounts = {};

function loadAccounts() {
  if (existsSync(ACCOUNTS_FILE)) {
    try {
      accounts = JSON.parse(readFileSync(ACCOUNTS_FILE, "utf-8"));
    } catch {
      accounts = {};
    }
  }
}

function saveAccounts() {
  writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), "utf-8");
}

// ---------- Shared helpers ----------

function hashPassword(password, salt) {
  if (!salt) salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256")
    .update(salt + password)
    .digest("hex");
  return { hash, salt };
}

function verifyPassword(password, storedHash, salt) {
  const { hash } = hashPassword(password, salt);
  return hash === storedHash;
}

function generateToken() {
  return randomBytes(32).toString("hex");
}

// Token -> username mapping (in-memory, ephemeral)
const sessions = new Map();

// ---------- Public API ----------

async function register(username, password) {
  if (!username || !password)
    return { error: "Username and password required" };
  if (username.length < 3 || username.length > 20)
    return { error: "Username must be 3-20 characters" };
  if (password.length < 4)
    return { error: "Password must be at least 4 characters" };
  if (!/^[a-zA-Z0-9_-]+$/.test(username))
    return { error: "Username can only contain letters, numbers, _ and -" };

  const key = username.toLowerCase();

  if (usePostgres) {
    const existing = await pool.query(
      "SELECT 1 FROM gg_accounts WHERE username = $1",
      [key],
    );
    if (existing.rows.length > 0) return { error: "Username already taken" };

    const { hash, salt } = hashPassword(password);
    await pool.query(
      `INSERT INTO gg_accounts (username, display_name, password_hash, salt, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [key, username, hash, salt, Date.now()],
    );

    const token = generateToken();
    sessions.set(token, username);
    await pool.query(
      "UPDATE gg_accounts SET session_token = $1 WHERE username = $2",
      [token, key],
    );
    return { success: true, token, username };
  }

  // JSON fallback
  if (accounts[key]) return { error: "Username already taken" };

  const { hash, salt } = hashPassword(password);
  accounts[key] = {
    username,
    passwordHash: hash,
    salt,
    createdAt: Date.now(),
    stats: {
      gamesPlayed: 0,
      gamesWon: 0,
      totalSP: 0,
      cardsPlayed: 0,
      creaturesKilled: 0,
      favouriteCard: null,
    },
  };
  saveAccounts();

  const token = generateToken();
  sessions.set(token, username);
  accounts[key].sessionToken = token;
  saveAccounts();
  return { success: true, token, username };
}

async function login(username, password) {
  if (!username || !password)
    return { error: "Username and password required" };

  const key = username.toLowerCase();

  if (usePostgres) {
    const result = await pool.query(
      "SELECT display_name, password_hash, salt FROM gg_accounts WHERE username = $1",
      [key],
    );
    if (result.rows.length === 0)
      return { error: "Invalid username or password" };

    const row = result.rows[0];
    if (!verifyPassword(password, row.password_hash, row.salt)) {
      return { error: "Invalid username or password" };
    }

    const token = generateToken();
    sessions.set(token, row.display_name);
    await pool.query(
      "UPDATE gg_accounts SET session_token = $1 WHERE username = $2",
      [token, key],
    );
    return { success: true, token, username: row.display_name };
  }

  // JSON fallback
  const account = accounts[key];
  if (!account) return { error: "Invalid username or password" };

  if (!verifyPassword(password, account.passwordHash, account.salt)) {
    return { error: "Invalid username or password" };
  }

  const token = generateToken();
  sessions.set(token, account.username);
  account.sessionToken = token;
  saveAccounts();
  return { success: true, token, username: account.username };
}

async function logout(token) {
  if (!token) return;
  const username = sessions.get(token);
  sessions.delete(token);

  if (username) {
    const key = username.toLowerCase();
    if (usePostgres) {
      await pool.query(
        "UPDATE gg_accounts SET session_token = NULL WHERE username = $1 AND session_token = $2",
        [key, token],
      );
    } else {
      const account = accounts[key];
      if (account && account.sessionToken === token) {
        account.sessionToken = null;
        saveAccounts();
      }
    }
  }
}

async function getProfile(username) {
  const key = username.toLowerCase();

  if (usePostgres) {
    const result = await pool.query(
      `SELECT display_name, created_at, games_played, games_won, total_sp,
              cards_played, creatures_killed, favourite_card
       FROM gg_accounts WHERE username = $1`,
      [key],
    );
    if (result.rows.length === 0) return null;

    const r = result.rows[0];
    return {
      username: r.display_name,
      createdAt: Number(r.created_at),
      stats: {
        gamesPlayed: r.games_played,
        gamesWon: r.games_won,
        totalSP: r.total_sp,
        cardsPlayed: r.cards_played,
        creaturesKilled: r.creatures_killed,
        favouriteCard: r.favourite_card,
      },
    };
  }

  // JSON fallback
  const account = accounts[key];
  if (!account) return null;
  return {
    username: account.username,
    createdAt: account.createdAt,
    stats: account.stats,
  };
}

async function getLeaderboard() {
  if (usePostgres) {
    const result = await pool.query(
      `SELECT display_name, games_played, games_won, total_sp, creatures_killed,
              cards_played, favourite_card, created_at
       FROM gg_accounts
       ORDER BY games_won DESC,
         CASE WHEN games_played > 0
              THEN ROUND((games_won::numeric / games_played) * 100)
              ELSE 0 END DESC,
         created_at ASC
       LIMIT 100`,
    );
    return result.rows.map((r, i) => ({
      rank: i + 1,
      username: r.display_name,
      gamesPlayed: r.games_played,
      gamesWon: r.games_won,
      winRate:
        r.games_played > 0
          ? Math.round((r.games_won / r.games_played) * 100)
          : 0,
      totalSP: r.total_sp,
      creaturesKilled: r.creatures_killed,
      cardsPlayed: r.cards_played,
      favouriteCard: r.favourite_card,
    }));
  }

  // JSON fallback
  return Object.values(accounts)
    .map((a) => ({
      username: a.username,
      gamesPlayed: a.stats.gamesPlayed,
      gamesWon: a.stats.gamesWon,
      winRate:
        a.stats.gamesPlayed > 0
          ? Math.round((a.stats.gamesWon / a.stats.gamesPlayed) * 100)
          : 0,
      totalSP: a.stats.totalSP,
      creaturesKilled: a.stats.creaturesKilled,
      cardsPlayed: a.stats.cardsPlayed || 0,
      favouriteCard: a.stats.favouriteCard || null,
    }))
    .sort((a, b) => b.gamesWon - a.gamesWon || b.winRate - a.winRate)
    .map((a, i) => ({ ...a, rank: i + 1 }))
    .slice(0, 100);
}

async function validateToken(token) {
  if (!token) return null;
  // Check in-memory first
  const cached = sessions.get(token);
  if (cached) return cached;
  // Check Postgres if available
  if (usePostgres) {
    const result = await pool.query(
      "SELECT display_name FROM gg_accounts WHERE session_token = $1",
      [token],
    );
    if (result.rows.length > 0) {
      const username = result.rows[0].display_name;
      sessions.set(token, username); // Re-cache
      return username;
    }
  }
  // Check JSON accounts file (survives server restarts in dev)
  if (!usePostgres) {
    // Re-read from disk in case accounts changed since last load
    loadAccounts();
    for (const account of Object.values(accounts)) {
      if (account.sessionToken === token) {
        sessions.set(token, account.username); // Re-cache
        return account.username;
      }
    }
  }
  return null;
}

async function updateStatsAfterGame(gameState, winnerId) {
  for (const [playerId, playerStats] of Object.entries(gameState.stats)) {
    const player = gameState.players[playerId];
    if (!player || !player._accountUsername) continue;

    const key = player._accountUsername.toLowerCase();
    const isWinner = playerId === winnerId;
    const sp = player.sp || 0;
    const cardsPlayed = playerStats.cardsPlayed || 0;
    const creaturesKilled = playerStats.creaturesKilled || 0;

    // Build card counts from this game
    const gameCardCounts = {};
    if (playerStats.creatureStats) {
      for (const [, cs] of Object.entries(playerStats.creatureStats)) {
        if (cs.name) {
          gameCardCounts[cs.name] = (gameCardCounts[cs.name] || 0) + 1;
        }
      }
    }

    if (usePostgres) {
      // Merge card counts and recalculate favourite in one query
      const gameCountsJson = JSON.stringify(gameCardCounts);
      await pool.query(
        `UPDATE gg_accounts SET
           games_played = games_played + 1,
           games_won = games_won + $2,
           total_sp = total_sp + $3,
           cards_played = cards_played + $4,
           creatures_killed = creatures_killed + $5,
           card_counts = (
             SELECT COALESCE(jsonb_object_agg(key, val), '{}') FROM (
               SELECT key, SUM(val)::int AS val FROM (
                 SELECT key, value::int AS val FROM jsonb_each_text(card_counts)
                 UNION ALL
                 SELECT key, value::int AS val FROM jsonb_each_text($6::jsonb)
               ) combined GROUP BY key
             ) merged
           ),
           favourite_card = (
             SELECT key FROM (
               SELECT key, SUM(val)::int AS total FROM (
                 SELECT key, value::int AS val FROM jsonb_each_text(card_counts)
                 UNION ALL
                 SELECT key, value::int AS val FROM jsonb_each_text($6::jsonb)
               ) combined GROUP BY key
             ) merged ORDER BY total DESC LIMIT 1
           )
         WHERE username = $1`,
        [
          key,
          isWinner ? 1 : 0,
          sp,
          cardsPlayed,
          creaturesKilled,
          gameCountsJson,
        ],
      );
    } else {
      // JSON fallback
      const account = accounts[key];
      if (!account) continue;

      account.stats.gamesPlayed++;
      if (isWinner) account.stats.gamesWon++;
      account.stats.totalSP += sp;
      account.stats.cardsPlayed += cardsPlayed;
      account.stats.creaturesKilled += creaturesKilled;

      if (Object.keys(gameCardCounts).length > 0) {
        if (!account.stats._cardCounts) account.stats._cardCounts = {};
        for (const [name, count] of Object.entries(gameCardCounts)) {
          account.stats._cardCounts[name] =
            (account.stats._cardCounts[name] || 0) + count;
        }
        let maxCount = 0;
        for (const [name, count] of Object.entries(account.stats._cardCounts)) {
          if (count > maxCount) {
            maxCount = count;
            account.stats.favouriteCard = name;
          }
        }
      }
    }
  }

  if (!usePostgres) saveAccounts();
}

export {
  initDatabase,
  register,
  login,
  logout,
  getProfile,
  getLeaderboard,
  validateToken,
  updateStatsAfterGame,
};
