/**
 * Simple player accounts using a JSON file for storage.
 * No external dependencies — uses Node.js built-in crypto for password hashing.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { randomBytes, createHash } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, 'data');
const ACCOUNTS_FILE = path.join(DATA_DIR, 'accounts.json');

// Ensure data directory exists
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

// In-memory store, synced to disk
let accounts = {};

// Load accounts from disk on startup
function loadAccounts() {
  if (existsSync(ACCOUNTS_FILE)) {
    try {
      accounts = JSON.parse(readFileSync(ACCOUNTS_FILE, 'utf-8'));
    } catch {
      accounts = {};
    }
  }
}

function saveAccounts() {
  writeFileSync(ACCOUNTS_FILE, JSON.stringify(accounts, null, 2), 'utf-8');
}

loadAccounts();

// Simple hash: SHA-256 with salt
function hashPassword(password, salt) {
  if (!salt) salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(salt + password).digest('hex');
  return { hash, salt };
}

function verifyPassword(password, storedHash, salt) {
  const { hash } = hashPassword(password, salt);
  return hash === storedHash;
}

// Simple token: random hex string
function generateToken() {
  return randomBytes(32).toString('hex');
}

// Token -> username mapping
const sessions = new Map();

export function register(username, password) {
  if (!username || !password) return { error: 'Username and password required' };
  if (username.length < 3 || username.length > 20) return { error: 'Username must be 3-20 characters' };
  if (password.length < 4) return { error: 'Password must be at least 4 characters' };
  if (!/^[a-zA-Z0-9_-]+$/.test(username)) return { error: 'Username can only contain letters, numbers, _ and -' };

  const key = username.toLowerCase();
  if (accounts[key]) return { error: 'Username already taken' };

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
  return { success: true, token, username };
}

export function login(username, password) {
  if (!username || !password) return { error: 'Username and password required' };

  const key = username.toLowerCase();
  const account = accounts[key];
  if (!account) return { error: 'Invalid username or password' };

  if (!verifyPassword(password, account.passwordHash, account.salt)) {
    return { error: 'Invalid username or password' };
  }

  const token = generateToken();
  sessions.set(token, account.username);
  return { success: true, token, username: account.username };
}

export function getProfile(username) {
  const key = username.toLowerCase();
  const account = accounts[key];
  if (!account) return null;

  return {
    username: account.username,
    createdAt: account.createdAt,
    stats: account.stats,
  };
}

export function getLeaderboard() {
  return Object.values(accounts)
    .map(a => ({
      username: a.username,
      gamesPlayed: a.stats.gamesPlayed,
      gamesWon: a.stats.gamesWon,
      winRate: a.stats.gamesPlayed > 0 ? Math.round((a.stats.gamesWon / a.stats.gamesPlayed) * 100) : 0,
      totalSP: a.stats.totalSP,
      creaturesKilled: a.stats.creaturesKilled,
    }))
    .sort((a, b) => b.gamesWon - a.gamesWon || b.winRate - a.winRate)
    .slice(0, 50);
}

export function validateToken(token) {
  if (!token) return null;
  return sessions.get(token) || null;
}

export function updateStatsAfterGame(gameState, winnerId) {
  for (const [playerId, playerStats] of Object.entries(gameState.stats)) {
    const player = gameState.players[playerId];
    if (!player || !player._accountUsername) continue;

    const key = player._accountUsername.toLowerCase();
    const account = accounts[key];
    if (!account) continue;

    account.stats.gamesPlayed++;
    if (playerId === winnerId) account.stats.gamesWon++;
    account.stats.totalSP += player.sp;
    account.stats.cardsPlayed += playerStats.cardsPlayed || 0;
    account.stats.creaturesKilled += playerStats.creaturesKilled || 0;

    // Track favourite card (most played creature)
    if (playerStats.creatureStats) {
      for (const [, cs] of Object.entries(playerStats.creatureStats)) {
        if (cs.name) {
          // Simple: last creature played becomes candidate
          if (!account.stats._cardCounts) account.stats._cardCounts = {};
          account.stats._cardCounts[cs.name] = (account.stats._cardCounts[cs.name] || 0) + 1;
        }
      }
      // Recalculate favourite
      if (account.stats._cardCounts) {
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

  saveAccounts();
}
