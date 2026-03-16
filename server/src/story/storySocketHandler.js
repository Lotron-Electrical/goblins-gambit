/**
 * Story Mode socket handlers — separate from main SocketHandler to avoid bloat.
 * Called from within the main socket connection handler.
 */

import { StoryModeEngine } from "./StoryModeEngine.js";
import {
  saveStoryRun, loadStoryRun, deleteStoryRun,
  saveTrophyCard, getTrophyCards,
  unlockAchievement, getAchievements
} from "./storyPersistence.js";
import { generateEnhancements } from "./enhancementGenerator.js";
import { STORY_EVENTS, STORY_LEVELS, ACTION, EVENTS } from "../../../shared/src/constants.js";
import { decideBotAction } from "../bot/BotPlayer.js";

// Active story engines per username
const storyEngines = new Map();

/**
 * Set up story mode socket handlers for a given socket.
 * @param {Socket} socket - Socket.IO socket
 * @param {Server} io - Socket.IO server
 * @param {Function} getUsername - Returns the authenticated username for this socket
 * @param {Map} botIds - Set of bot IDs from main handler (for compatibility)
 */
export function setupStoryHandlers(socket, io, getUsername) {

  socket.on(STORY_EVENTS.STORY_START_RUN, async ({ cardName, nightmare }, callback) => {
    const username = getUsername();
    console.log("[STORY] STORY_START_RUN, socket:", socket.id, "username:", username);
    if (!username) { console.log("[STORY] REJECTED - no username for socket", socket.id); callback?.({ error: "Must be logged in" }); return; }

    const engine = new StoryModeEngine();
    const result = engine.startRun(username, { name: cardName || "Custom Goblin" }, nightmare || false);
    storyEngines.set(username, engine);

    // Join a story-specific room
    const roomId = `story_room_${username}`;
    socket.join(roomId);

    callback?.({ success: true, run: result.run, map: result.map });
  });

  socket.on(STORY_EVENTS.STORY_LOAD_RUN, async (_, callback) => {
    const username = getUsername();
    if (!username) { callback?.({ error: "Must be logged in" }); return; }

    try {
      const runState = await loadStoryRun(username);
      if (!runState) { callback?.({ error: "No saved story run" }); return; }

      const engine = new StoryModeEngine();
      const result = engine.loadRun(runState.runState);
      storyEngines.set(username, engine);

      const roomId = `story_room_${username}`;
      socket.join(roomId);

      callback?.({ success: true, run: result.run, map: result.map });
    } catch (err) {
      console.error("[StoryLoad] Error:", err);
      callback?.({ error: "Failed to load story run" });
    }
  });

  socket.on(STORY_EVENTS.STORY_SELECT_NODE, async ({ nodeId }, callback) => {
    const username = getUsername();
    const engine = storyEngines.get(username);
    if (!engine) { callback?.({ error: "No active story run" }); return; }

    const result = engine.selectNode(nodeId);
    if (result.error) { callback?.({ error: result.error }); return; }

    if (result.type === "battle") {
      // Start a battle — run the bot in story mode
      const { gameEngine, playerId, botId, botDifficulty, character } = result;
      const roomId = `story_room_${username}`;

      // Store battle context on the engine
      engine._battleContext = { playerId, botId, botDifficulty, roomId };

      // Wire up timeout callbacks
      gameEngine._onPendingChoiceTimeout = () => {
        broadcastStoryBattleState(socket, engine);
        runStoryBotTurn(engine, socket, io);
      };
      gameEngine._onPendingTargetTimeout = () => {
        broadcastStoryBattleState(socket, engine);
        runStoryBotTurn(engine, socket, io);
      };

      // Send initial state via callback and also emit GAME_STATE so main store picks it up
      const state = gameEngine.getStateForPlayer(playerId);
      callback?.({
        success: true,
        type: "battle",
        character,
        gameState: state,
      });

      // Emit GAME_STATE so GameScreen renders the board
      setTimeout(() => {
        broadcastStoryBattleState(socket, engine);

        // If bot goes first, start bot turn
        if (gameEngine.getCurrentPlayerId() === botId) {
          setTimeout(() => runStoryBotTurn(engine, socket, io), 1000);
        }
      }, 300);
    } else if (result.type === "enhancement") {
      // Generate enhancement options
      const levelKey = STORY_LEVELS[engine.run.currentLevelIndex];
      let options;
      try {
        // Dynamic import to avoid circular deps if needed
        const { generateEnhancements: genEnh } = await import("./enhancementGenerator.js");
        options = genEnh(levelKey, engine.run);
      } catch {
        options = [
          { type: "stat_boost", stat: "attack", amount: 50, description: "+50 ATK" },
          { type: "stat_boost", stat: "defence", amount: 50, description: "+50 DEF" },
          { type: "stat_boost", stat: "sp", amount: 50, description: "+50 SP" },
        ];
      }
      callback?.({ success: true, type: "enhancement", options, run: engine.run, map: engine.run.currentMap });
    }
  });

  // Handle game actions during story battles (reuses existing GAME_ACTION event name)
  socket.on("story_game_action", (action, callback) => {
    const username = getUsername();
    const engine = storyEngines.get(username);
    if (!engine?.gameEngine) { callback?.({ error: "No active battle" }); return; }

    const ctx = engine._battleContext;
    const result = engine.gameEngine.handleAction(ctx.playerId, action);

    if (!result.success && !result.needsTarget) {
      callback?.({ error: result.error });
      return;
    }

    callback?.({ success: true });
    broadcastStoryBattleState(socket, engine);

    if (result.gameOver) {
      const won = result.winner === ctx.playerId;
      const battleResult = engine.resolveBattleResult(won);

      socket.emit(STORY_EVENTS.STORY_BATTLE_RESULT, {
        won,
        battleResult,
        run: engine.run,
        map: engine.run.currentMap,
      });

      // Check achievements
      checkAchievements(username, engine);

      // Save trophy card at end of any completed run
      if (battleResult.type === "run_over") {
        saveTrophyCard(username, engine.run.customCard,
          STORY_LEVELS[Math.max(0, engine.run.currentLevelIndex - (battleResult.victory ? 1 : 0))] || "tavern",
          engine.run.nightmare
        ).catch(err => console.error("[StoryTrophy] Error:", err));
      }
      return;
    }

    // Trigger bot turn
    setTimeout(() => runStoryBotTurn(engine, socket, io), 500);
  });

  socket.on(STORY_EVENTS.STORY_PICK_ENHANCEMENT, ({ enhancement }, callback) => {
    const username = getUsername();
    const engine = storyEngines.get(username);
    if (!engine) { callback?.({ error: "No active story run" }); return; }

    const result = engine.pickEnhancement(enhancement);
    callback?.({ success: true, run: result.run, map: engine.run.currentMap });
  });

  socket.on(STORY_EVENTS.STORY_USE_ITEM, ({ itemId }, callback) => {
    const username = getUsername();
    const engine = storyEngines.get(username);
    if (!engine) { callback?.({ error: "No active story run" }); return; }

    const result = engine.useItem(itemId);
    if (result.error) { callback?.({ error: result.error }); return; }

    if (result.success) {
      broadcastStoryBattleState(socket, engine);
      callback?.({ success: true, effect: result.effect, needsTrophySelection: result.needsTrophySelection });
    }
  });

  socket.on(STORY_EVENTS.STORY_SELECT_TROPHY, async ({ trophyCard }, callback) => {
    const username = getUsername();
    const engine = storyEngines.get(username);
    if (!engine) { callback?.({ error: "No active story run" }); return; }
    if (!engine.gameEngine) { callback?.({ error: "No active battle" }); return; }

    const result = engine.addTrophyCardToHand(trophyCard);
    if (result.error) { callback?.({ error: result.error }); return; }

    broadcastStoryBattleState(socket, engine);
    callback?.({ success: true });
  });

  socket.on(STORY_EVENTS.STORY_SAVE_RUN, async (_, callback) => {
    const username = getUsername();
    const engine = storyEngines.get(username);
    if (!engine) { callback?.({ error: "No active story run" }); return; }

    // Can only save between battles (not during)
    if (engine.gameEngine) { callback?.({ error: "Cannot save during battle" }); return; }

    try {
      await saveStoryRun(username, engine.getRunState());
      storyEngines.delete(username);
      callback?.({ success: true });
    } catch (err) {
      console.error("[StorySave] Error:", err);
      callback?.({ error: "Failed to save story run" });
    }
  });

  socket.on(STORY_EVENTS.STORY_GET_TROPHIES, async (_, callback) => {
    const username = getUsername();
    if (!username) { callback?.({ error: "Must be logged in" }); return; }

    try {
      const trophies = await getTrophyCards(username);
      const achievements = await getAchievements(username);
      callback?.({ trophies, achievements });
    } catch (err) {
      console.error("[StoryTrophies] Error:", err);
      callback?.({ trophies: [], achievements: [] });
    }
  });
}

/** Send current battle state to the story player */
function broadcastStoryBattleState(socket, engine) {
  if (!engine.gameEngine || !engine._battleContext) return;
  const state = engine.gameEngine.getStateForPlayer(engine._battleContext.playerId);
  socket.emit(EVENTS.GAME_STATE, state);
}

/** Run a bot turn in a story battle */
function runStoryBotTurn(engine, socket, io) {
  if (!engine.gameEngine || !engine._battleContext) return;
  const ctx = engine._battleContext;
  const ge = engine.gameEngine;

  const botState = ge.getStateForPlayer(ctx.botId);
  if (botState.phase !== "playing") return;

  const needsResponse =
    botState.pendingTarget?.playerId === ctx.botId ||
    botState.pendingChoice?.playerId === ctx.botId;

  if (ge.getCurrentPlayerId() !== ctx.botId && !needsResponse) return;

  const action = decideBotAction(botState, ctx.botDifficulty);
  if (!action) {
    if (ge.getCurrentPlayerId() === ctx.botId) {
      ge.handleAction(ctx.botId, { type: ACTION.END_TURN });
      broadcastStoryBattleState(socket, engine);
    }
    return;
  }

  const result = ge.handleAction(ctx.botId, action);

  if (!result.success && !result.needsTarget) {
    if (ge.getCurrentPlayerId() === ctx.botId) {
      ge.handleAction(ctx.botId, { type: ACTION.END_TURN });
    }
    broadcastStoryBattleState(socket, engine);
    return;
  }

  broadcastStoryBattleState(socket, engine);

  if (result.gameOver) {
    const won = result.winner === ctx.playerId;
    const battleResult = engine.resolveBattleResult(won);
    socket.emit(STORY_EVENTS.STORY_BATTLE_RESULT, {
      won,
      battleResult,
      run: engine.run,
      map: engine.run.currentMap,
    });

    if (battleResult.type === "run_over") {
      const uname = engine.run.username;
      saveTrophyCard(uname, engine.run.customCard,
        STORY_LEVELS[Math.max(0, engine.run.currentLevelIndex - (battleResult.victory ? 1 : 0))] || "tavern",
        engine.run.nightmare
      ).catch(err => console.error("[StoryTrophy] Error:", err));
    }
    return;
  }

  // Continue bot turn
  const updatedState = ge.getStateForPlayer(ctx.botId);
  const stillNeeds =
    updatedState.currentPlayerId === ctx.botId ||
    updatedState.pendingTarget?.playerId === ctx.botId ||
    updatedState.pendingChoice?.playerId === ctx.botId;

  if (stillNeeds) {
    setTimeout(() => runStoryBotTurn(engine, socket, io), 600 + Math.random() * 400);
  }
}

/** Check and unlock achievements after battles */
async function checkAchievements(username, engine) {
  const run = engine.run;
  try {
    if (run.stats.battlesWon === 1) await unlockAchievement(username, "first_blood");
    if (run.stats.battlesWon >= 5) await unlockAchievement(username, "tavern_regular");
    if (run.stats.creaturesKilled >= 50) await unlockAchievement(username, "goblin_slayer");
    if (run.stats.levelsCompleted >= 6) await unlockAchievement(username, "story_complete");
    if (run.customCard.attack >= 500 && run.customCard.defence >= 500 && run.customCard.sp >= 500) {
      await unlockAchievement(username, "fully_loaded");
    }
    if (run.nightmare && run.stats.levelsCompleted >= 6) {
      await unlockAchievement(username, "nightmare_survivor");
    }
  } catch (err) {
    console.error("[StoryAchievements] Error:", err);
  }
}

/** Clean up story engine on disconnect */
export function cleanupStoryEngine(username) {
  storyEngines.delete(username);
}
