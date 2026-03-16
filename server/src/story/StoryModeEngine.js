/**
 * StoryModeEngine — server-side orchestrator for story mode.
 * Wraps GameEngine via composition. Each battle creates a fresh GameEngine instance.
 */

import { GameEngine } from "../game/GameEngine.js";
import { createStoryRun } from "./StoryRunState.js";
import { generateMap } from "./mapGenerator.js";
import { buildStoryDeck } from "./cardPools.js";
import { getRandomCharacter, getBossCharacter } from "./storyCharacters.js";
import { STORY_LEVELS, STORY_LEVEL_CONFIG, BASE_AP } from "../../../shared/src/constants.js";

export class StoryModeEngine {
  constructor() {
    this.run = null;          // StoryRunState
    this.gameEngine = null;   // Current battle's GameEngine (null between battles)
    this.currentCharacter = null; // Current opponent character
    this.usedCharacterIds = [];   // Track used characters to avoid repeats
  }

  /** Start a new story run */
  startRun(username, customCard, nightmare = false) {
    this.run = createStoryRun(username, customCard, nightmare);
    this._generateCurrentMap();
    return {
      run: this.run,
      map: this.run.currentMap,
    };
  }

  /** Load an existing run from persistence */
  loadRun(runState) {
    this.run = runState;
    // Restore used character IDs from completed battle nodes on the current map
    this.usedCharacterIds = [];
    if (this.run.currentMap) {
      for (const row of this.run.currentMap.rows) {
        for (const node of row) {
          if (node.completed && node.characterId) {
            this.usedCharacterIds.push(node.characterId);
          }
        }
      }
    }
    return {
      run: this.run,
      map: this.run.currentMap,
    };
  }

  /** Select a node on the map */
  selectNode(nodeId) {
    const node = this.run.currentMap.nodes[nodeId];
    if (!node) return { error: "Invalid node" };
    if (node.completed) return { error: "Node already completed" };

    // Check node is reachable (row 0 always reachable, otherwise must connect from a completed node)
    if (node.row > 0) {
      const prevRow = this.run.currentMap.rows[node.row - 1];
      const canReach = prevRow.some(
        (n) => n.completed && n.connections.includes(nodeId)
      );
      if (!canReach) return { error: "Node not reachable" };
    }

    // Prevent going backward or sideways — can't select nodes on or before the highest completed row
    let highestCompletedRow = -1;
    for (const row of this.run.currentMap.rows) {
      for (const n of row) {
        if (n.completed && n.row > highestCompletedRow) {
          highestCompletedRow = n.row;
        }
      }
    }
    if (highestCompletedRow >= 0 && node.row <= highestCompletedRow) {
      return { error: "Cannot go backward" };
    }

    // Reveal connected nodes
    for (const connId of node.connections) {
      if (this.run.currentMap.nodes[connId]) {
        this.run.currentMap.nodes[connId].revealed = true;
      }
    }

    this.run.currentNodeId = nodeId;

    if (node.type === "battle" || node.type === "boss") {
      return this._startBattle(node);
    } else if (node.type === "enhancement") {
      node.completed = true;
      this.run.completedNodes.push(nodeId);
      return { type: "enhancement", nodeId };
    }

    return { error: "Unknown node type" };
  }

  /** Start a battle for the given node */
  _startBattle(node) {
    const levelKey = STORY_LEVELS[this.run.currentLevelIndex];
    const config = STORY_LEVEL_CONFIG[levelKey];

    // Pick character
    if (node.type === "boss") {
      this.currentCharacter = getBossCharacter(levelKey);
    } else {
      this.currentCharacter = getRandomCharacter(levelKey, this.usedCharacterIds);
      if (this.currentCharacter) {
        this.usedCharacterIds.push(this.currentCharacter.id);
      }
    }

    // Store character ID on the node for persistence/display
    if (this.currentCharacter) {
      node.characterId = this.currentCharacter.id;
    }

    // Random winSP from level range (in 1000-block increments)
    const [minSP, maxSP] = config.winSPRange;
    const blocks = Math.floor((maxSP - minSP) / 1000) + 1;
    const winSP = minSP + Math.floor(Math.random() * blocks) * 1000;

    // Calculate base AP with bonus
    const baseAP = (config.bonusAP || 0) + BASE_AP;

    // Build deck from card pool
    const deck = buildStoryDeck(config.cardPool);

    // Create player and bot IDs
    const playerId = "story_player";
    const botId = "story_bot";
    const playerName = this.run.username;
    const botName = this.currentCharacter?.name || "Opponent";

    // Create GameEngine
    this.gameEngine = new GameEngine(
      [playerId, botId],
      [playerName, botName],
      winSP,
      config.theme,
      { baseAP }
    );

    // Replace deck with story deck
    this.gameEngine.state.deck = deck;

    // Inject custom card into player's hand
    const customCardInstance = {
      ...this.run.customCard,
      uid: `custom_creature_${Date.now()}`,
    };
    const player = this.gameEngine.state.players[playerId];
    if (player.hand.length >= 10) {
      // Replace the last card if hand is somehow full
      player.hand[player.hand.length - 1] = customCardInstance;
    } else {
      player.hand.push(customCardInstance);
    }

    return {
      type: "battle",
      nodeId: node.id,
      character: this.currentCharacter,
      gameEngine: this.gameEngine,
      playerId,
      botId,
      botDifficulty: config.difficulty,
    };
  }

  /** Resolve the result of a completed battle */
  resolveBattleResult(won) {
    const node = this.run.currentMap.nodes[this.run.currentNodeId];

    if (won) {
      this.run.stats.battlesWon++;
      node.completed = true;
      this.run.completedNodes.push(node.id);

      // Collect SP earned from the battle
      if (this.gameEngine) {
        const player = this.gameEngine.state.players["story_player"];
        if (player) {
          this.run.stats.totalSPEarned += player.sp;
        }
      }
    } else {
      this.run.stats.battlesLost++;
      this.run.lives--;
      // Mark non-boss nodes as completed so player can proceed past them.
      // Boss nodes stay incomplete so the player can retry if they have lives left.
      if (node.type !== "boss") {
        node.completed = true;
        this.run.completedNodes.push(node.id);
      }
    }

    this.gameEngine = null;
    this.currentCharacter = null;

    // Check if run is over (no lives left)
    if (this.run.lives <= 0) {
      return { type: "run_over", victory: false, run: this.run };
    }

    // Check if this was the boss (last row)
    if (node.type === "boss") {
      if (won) {
        return this._advanceToNextLevel();
      }
      // Lost to boss but have lives — can retry
    }

    return { type: "continue", run: this.run, map: this.run.currentMap };
  }

  /** Apply an enhancement choice to the custom card */
  pickEnhancement(enhancement) {
    const card = this.run.customCard;

    switch (enhancement.type) {
      case "stat_boost":
        if (enhancement.stat === "attack") card.attack += enhancement.amount;
        if (enhancement.stat === "defence") card.defence += enhancement.amount;
        if (enhancement.stat === "sp") card.sp += enhancement.amount;
        break;
      case "ability":
        card.abilityId = enhancement.abilityId;
        card.effect = enhancement.description;
        break;
      case "life":
        this.run.lives = Math.min(this.run.lives + 1, this.run.nightmare ? 2 : 3);
        break;
      case "item":
        this.run.items.push({
          id: enhancement.itemId,
          name: enhancement.itemName,
          description: enhancement.itemDescription,
          used: false,
        });
        break;
      case "draw_boost":
        card._drawChanceBoost = (card._drawChanceBoost || 0) + 1;
        break;
    }

    this.run.stats.enhancementsPicked++;
    return { run: this.run };
  }

  /** Use an item during battle */
  useItem(itemId) {
    const item = this.run.items.find((i) => i.id === itemId && !i.used);
    if (!item) return { error: "Item not found or already used" };
    if (!this.gameEngine) return { error: "No active battle" };

    item.used = true;

    if (item.id === "berserk_charm") {
      // Double ATK for all player creatures for 10 turns
      const player = this.gameEngine.state.players["story_player"];
      for (const creature of player.swamp) {
        creature._attackBuff = (creature._attackBuff || 0) + (creature.attack || 0);
      }
      this.gameEngine.state._berserkCharmActive = true;
      this.gameEngine.state._berserkCharmTurnsLeft = 10;
      return { success: true, effect: "Berserk Charm activated! ATK doubled for 10 turns" };
    }

    if (item.id === "sock_satchel") {
      // Client will show trophy picker; selected trophy injected via addTrophyCardToHand
      return { success: true, effect: "sock_satchel", needsTrophySelection: true };
    }

    return { error: "Unknown item" };
  }

  /** Add a trophy card into the player's hand during battle */
  addTrophyCardToHand(trophyCard) {
    if (!this.gameEngine) return { error: "No active battle" };

    const player = this.gameEngine.state.players["story_player"];
    if (!player) return { error: "Player not found" };

    const cardInstance = {
      ...trophyCard,
      uid: `trophy_${trophyCard.name}_${Date.now()}`,
      type: "Creature",
    };

    if (player.hand.length >= 10) {
      return { error: "Hand is full" };
    }

    player.hand.push(cardInstance);
    return { success: true, card: cardInstance };
  }

  /** Advance to the next level */
  _advanceToNextLevel() {
    this.run.currentLevelIndex++;
    this.run.stats.levelsCompleted++;
    this.usedCharacterIds = []; // Reset character tracking for new level

    // Check if all levels completed
    if (this.run.currentLevelIndex >= STORY_LEVELS.length) {
      return { type: "run_over", victory: true, run: this.run };
    }

    this._generateCurrentMap();
    return { type: "next_level", run: this.run, map: this.run.currentMap };
  }

  /** Generate map for the current level */
  _generateCurrentMap() {
    const levelKey = STORY_LEVELS[this.run.currentLevelIndex];
    const config = STORY_LEVEL_CONFIG[levelKey];
    this.run.currentMap = generateMap(this.run.currentLevelIndex, config.name);
    this.run.completedNodes = [];
    this.run.currentNodeId = null;
  }

  /** Get the current run state (for persistence) */
  getRunState() {
    return this.run;
  }

  /** Get current level config */
  getCurrentLevelConfig() {
    const levelKey = STORY_LEVELS[this.run.currentLevelIndex];
    return STORY_LEVEL_CONFIG[levelKey];
  }
}
