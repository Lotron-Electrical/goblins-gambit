/**
 * Goblin's Gambit — Automated Playtest Script
 * Runs 10 complete bot-vs-bot games and reports statistics.
 */

import { GameEngine } from './server/src/game/GameEngine.js';
import { createBotId, getBotName, decideBotAction } from './server/src/bot/BotPlayer.js';
import { GAME_PHASE, ACTION } from './shared/src/constants.js';

const NUM_GAMES = 10;
const MAX_TURNS = 500; // safety limit to prevent infinite games

function runGame(gameNumber) {
  // Create 4 bot players
  const botIds = [];
  const botNames = [];
  for (let i = 0; i < 4; i++) {
    botIds.push(createBotId());
    botNames.push(getBotName());
  }

  const engine = new GameEngine(botIds, botNames, 10000, 'swamp', {
    eventsEnabled: gameNumber > NUM_GAMES / 2, // Second half of games have events enabled
  });

  // Track stats
  const cardsPlayed = {};       // cardName -> count
  const creatureTurnsAlive = {}; // cardName -> [turnsAlive, ...]
  const creatureKills = {};      // cardName -> killCount
  const spHistory = {};          // playerId -> [sp at each turn]

  for (const id of botIds) {
    spHistory[id] = [];
  }

  // Track creatures placed on field and when
  const creaturePlacedTurn = {}; // uid -> turnNumber

  let turns = 0;
  let gameOver = false;
  let winner = null;

  while (!gameOver && turns < MAX_TURNS) {
    const currentId = engine.getCurrentPlayerId();
    const botState = engine.getStateForPlayer(currentId);

    if (botState.phase !== GAME_PHASE.PLAYING) {
      if (botState.phase === GAME_PHASE.FINISHED) {
        gameOver = true;
        winner = engine.state.winner;
      }
      break;
    }

    // Track SP at start of each turn
    for (const id of botIds) {
      spHistory[id].push(engine.state.players[id].sp);
    }

    // Track creatures currently alive
    for (const id of botIds) {
      for (const c of engine.state.players[id].swamp) {
        if (!creaturePlacedTurn[c.uid]) {
          creaturePlacedTurn[c.uid] = { turn: engine.state.turnNumber, name: c.name };
        }
      }
    }

    // Get bot action
    let action = decideBotAction(botState);
    if (!action) {
      action = { type: ACTION.END_TURN };
    }

    // Track card plays
    if (action.type === ACTION.PLAY_CARD) {
      const me = engine.state.players[currentId];
      const card = me.hand.find(c => c.uid === action.cardUid);
      if (card) {
        cardsPlayed[card.name] = (cardsPlayed[card.name] || 0) + 1;
      }
    }

    // Track attacks for kill counting
    const preSwampCounts = {};
    if (action.type === ACTION.ATTACK) {
      for (const id of botIds) {
        preSwampCounts[id] = engine.state.players[id].swamp.map(c => c.uid);
      }
    }

    const result = engine.handleAction(currentId, action);

    // Track kills from attacks
    if (action.type === ACTION.ATTACK && result.success) {
      for (const id of botIds) {
        const currentUids = new Set(engine.state.players[id].swamp.map(c => c.uid));
        const preUids = preSwampCounts[id] || [];
        for (const uid of preUids) {
          if (!currentUids.has(uid)) {
            // This creature died - find attacker
            const me = engine.state.players[currentId];
            const attackerCard = me?.swamp.find(c => c.uid === action.attackerUid);
            if (attackerCard) {
              creatureKills[attackerCard.name] = (creatureKills[attackerCard.name] || 0) + 1;
            }
            // Record how long the dead creature lived
            const placed = creaturePlacedTurn[uid];
            if (placed) {
              const turnsAlive = engine.state.turnNumber - placed.turn;
              if (!creatureTurnsAlive[placed.name]) creatureTurnsAlive[placed.name] = [];
              creatureTurnsAlive[placed.name].push(turnsAlive);
              delete creaturePlacedTurn[uid];
            }
          }
        }
      }
    }

    if (!result.success && !result.needsTarget) {
      // Action failed, handle pending states or end turn
      if (botState.pendingTarget || botState.pendingChoice) {
        // Try to resolve pending states
        let resolved = false;
        for (let attempt = 0; attempt < 5; attempt++) {
          const freshState = engine.getStateForPlayer(currentId);
          const pendAction = decideBotAction(freshState);
          if (!pendAction) break;
          const pendResult = engine.handleAction(currentId, pendAction);
          if (pendResult.success || pendResult.gameOver) {
            resolved = true;
            if (pendResult.gameOver) {
              gameOver = true;
              winner = engine.state.winner;
            }
            break;
          }
        }
        if (!resolved) {
          engine.handleAction(currentId, { type: ACTION.END_TURN });
        }
      } else {
        engine.handleAction(currentId, { type: ACTION.END_TURN });
      }
    }

    if (result.gameOver) {
      gameOver = true;
      winner = engine.state.winner;
      break;
    }

    // Handle pending targets/choices from the action
    if (result.needsTarget || engine.state.pendingTarget || engine.state.pendingChoice) {
      for (let attempt = 0; attempt < 10; attempt++) {
        const pendingPlayerId = engine.state.pendingTarget?.playerId
          || engine.state.pendingChoice?.playerId
          || currentId;

        const freshState = engine.getStateForPlayer(pendingPlayerId);
        if (!freshState.pendingTarget && !freshState.pendingChoice) break;

        const pendAction = decideBotAction(freshState);
        if (!pendAction) break;

        const pendResult = engine.handleAction(pendingPlayerId, pendAction);
        if (pendResult.gameOver) {
          gameOver = true;
          winner = engine.state.winner;
          break;
        }
        if (!engine.state.pendingTarget && !engine.state.pendingChoice) break;
      }
    }

    if (gameOver) break;

    // Continue bot turns within the same "tick" if action wasn't END_TURN
    if (action.type !== ACTION.END_TURN) {
      // Bot may have more actions — loop back
      continue;
    }

    turns++;
  }

  // Record final creature lifetimes for survivors
  for (const id of botIds) {
    for (const c of engine.state.players[id].swamp) {
      const placed = creaturePlacedTurn[c.uid];
      if (placed) {
        const turnsAlive = engine.state.turnNumber - placed.turn;
        if (!creatureTurnsAlive[placed.name]) creatureTurnsAlive[placed.name] = [];
        creatureTurnsAlive[placed.name].push(turnsAlive);
      }
    }
  }

  return {
    gameNumber,
    winner,
    winnerName: winner ? engine.state.players[winner]?.name : null,
    winnerIndex: winner ? botIds.indexOf(winner) : -1,
    turnNumber: engine.state.turnNumber,
    timedOut: turns >= MAX_TURNS,
    cardsPlayed,
    creatureKills,
    creatureTurnsAlive,
    spHistory,
    finalSP: Object.fromEntries(botIds.map(id => [engine.state.players[id].name, engine.state.players[id].sp])),
    botNames: botNames.slice(),
  };
}

// --- Run all games ---
console.log('='.repeat(70));
console.log('  GOBLIN\'S GAMBIT — AUTOMATED PLAYTEST (10 games, 4 bots each)');
console.log('='.repeat(70));
console.log();

const allResults = [];
const aggregateCardsPlayed = {};
const aggregateKills = {};
const aggregateSurvival = {};
const winsByPosition = [0, 0, 0, 0]; // track wins by turn order position
const gameLengths = [];

for (let i = 1; i <= NUM_GAMES; i++) {
  const result = runGame(i);
  allResults.push(result);

  // Print per-game summary
  const status = result.timedOut ? 'TIMED OUT' : 'COMPLETE';
  const winnerStr = result.winnerName || 'No winner';
  console.log(`Game ${i}: ${status} | Turn ${result.turnNumber} | Winner: ${winnerStr}`);

  // Print final SP
  const spStr = Object.entries(result.finalSP).map(([n, sp]) => `${n}: ${sp}`).join(' | ');
  console.log(`  SP: ${spStr}`);

  // Aggregate
  gameLengths.push(result.turnNumber);
  if (result.winnerIndex >= 0) winsByPosition[result.winnerIndex]++;

  for (const [name, count] of Object.entries(result.cardsPlayed)) {
    aggregateCardsPlayed[name] = (aggregateCardsPlayed[name] || 0) + count;
  }
  for (const [name, count] of Object.entries(result.creatureKills)) {
    aggregateKills[name] = (aggregateKills[name] || 0) + count;
  }
  for (const [name, turns] of Object.entries(result.creatureTurnsAlive)) {
    if (!aggregateSurvival[name]) aggregateSurvival[name] = [];
    aggregateSurvival[name].push(...turns);
  }
}

// --- Print Summary ---
console.log();
console.log('='.repeat(70));
console.log('  SUMMARY');
console.log('='.repeat(70));

// Win rates by position
console.log();
console.log('--- Win Rate by Turn Order Position ---');
for (let i = 0; i < 4; i++) {
  const pct = ((winsByPosition[i] / NUM_GAMES) * 100).toFixed(0);
  console.log(`  Position ${i + 1}: ${winsByPosition[i]}/${NUM_GAMES} wins (${pct}%)`);
}

// Game length
const avgLen = (gameLengths.reduce((a, b) => a + b, 0) / gameLengths.length).toFixed(1);
const minLen = Math.min(...gameLengths);
const maxLen = Math.max(...gameLengths);
console.log();
console.log('--- Game Length (turns) ---');
console.log(`  Average: ${avgLen} | Min: ${minLen} | Max: ${maxLen}`);

// Most played cards
const sortedPlayed = Object.entries(aggregateCardsPlayed).sort((a, b) => b[1] - a[1]);
console.log();
console.log('--- Most Played Cards (top 15) ---');
for (const [name, count] of sortedPlayed.slice(0, 15)) {
  console.log(`  ${name}: ${count} plays`);
}

// Least played cards
console.log();
console.log('--- Least Played Cards (bottom 10) ---');
for (const [name, count] of sortedPlayed.slice(-10).reverse()) {
  console.log(`  ${name}: ${count} plays`);
}

// Cards never played
const allCardNames = new Set();
// Get all card names from the deck by importing
import { getAllCards } from './server/src/game/CardRegistry.js';
for (const c of getAllCards()) {
  if (c.type !== 'Event') allCardNames.add(c.name);
}
const neverPlayed = [...allCardNames].filter(n => !aggregateCardsPlayed[n]);
console.log();
console.log(`--- Cards Never Played (${neverPlayed.length}) ---`);
if (neverPlayed.length === 0) {
  console.log('  All cards were played at least once!');
} else {
  for (const name of neverPlayed) {
    console.log(`  ${name}`);
  }
}

// Most lethal creatures
const sortedKills = Object.entries(aggregateKills).sort((a, b) => b[1] - a[1]);
console.log();
console.log('--- Most Lethal Creatures (by kills) ---');
for (const [name, kills] of sortedKills.slice(0, 10)) {
  console.log(`  ${name}: ${kills} kills`);
}

// Longest surviving creatures
const avgSurvival = Object.entries(aggregateSurvival)
  .map(([name, turns]) => [name, turns.reduce((a, b) => a + b, 0) / turns.length, turns.length])
  .sort((a, b) => b[1] - a[1]);

console.log();
console.log('--- Longest Surviving Creatures (avg turns alive) ---');
for (const [name, avg, count] of avgSurvival.slice(0, 10)) {
  console.log(`  ${name}: ${avg.toFixed(1)} avg turns (${count} samples)`);
}

// Shortest surviving creatures
console.log();
console.log('--- Shortest Surviving Creatures (avg turns alive) ---');
for (const [name, avg, count] of avgSurvival.slice(-5).reverse()) {
  console.log(`  ${name}: ${avg.toFixed(1)} avg turns (${count} samples)`);
}

console.log();
console.log('='.repeat(70));
console.log('  Playtest complete.');
console.log('='.repeat(70));
