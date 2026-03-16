// mapGenerator.js
// Generates randomized branching maps for story mode levels.
// Each map has 5 rows of nodes forming branching paths from start to boss.

/**
 * Generate a single map node.
 * @param {number} row - Row index (0-4)
 * @param {number} col - Column index within the row
 * @param {string} type - "battle" | "enhancement" | "boss"
 * @param {boolean} revealed - Whether the node is visible to the player
 * @returns {object} A node object
 */
function createNode(row, col, type, revealed) {
  return {
    id: `node_${row}_${col}`,
    row,
    col,
    type,
    connections: [],       // populated later with IDs of next-row nodes
    revealed,
    completed: false,
    characterId: null,     // filled in for battle/boss nodes at runtime
  };
}

/**
 * Pick a random integer in [min, max] (inclusive).
 */
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Choose a random node type for the middle rows.
 * ~60% chance of "battle", ~40% chance of "enhancement".
 */
function randomMiddleType() {
  return Math.random() < 0.6 ? 'battle' : 'enhancement';
}

/**
 * Connect nodes in `currentRow` to nodes in `nextRow`.
 *
 * Rules:
 *  - Each node in currentRow connects to 1-2 random nodes in nextRow.
 *  - Every node in nextRow must have at least 1 incoming connection.
 *
 * Strategy:
 *  1. First, give every nextRow node at least one incoming connection by
 *     assigning each nextRow node a random parent from currentRow.
 *  2. Then, for any currentRow node that still has 0 connections, assign it
 *     a random nextRow node.
 *  3. Finally, give each currentRow node a chance at a second connection
 *     (up to 2 total) to create branching paths.
 */
function connectRows(currentRow, nextRow) {
  const nextIds = nextRow.map((n) => n.id);

  // Track which currentRow nodes already have connections (by index)
  const currentConnSets = currentRow.map(() => new Set());

  // Step 1: Guarantee every nextRow node has at least one parent.
  for (let j = 0; j < nextRow.length; j++) {
    const parentIdx = randInt(0, currentRow.length - 1);
    currentConnSets[parentIdx].add(nextIds[j]);
  }

  // Step 2: Guarantee every currentRow node connects to at least one child.
  for (let i = 0; i < currentRow.length; i++) {
    if (currentConnSets[i].size === 0) {
      const childIdx = randInt(0, nextRow.length - 1);
      currentConnSets[i].add(nextIds[childIdx]);
    }
  }

  // Step 3: Optionally add a second connection for branching variety.
  for (let i = 0; i < currentRow.length; i++) {
    if (currentConnSets[i].size < 2 && nextRow.length > 1 && Math.random() < 0.5) {
      // Pick a next-row node not already connected
      const remaining = nextIds.filter((id) => !currentConnSets[i].has(id));
      if (remaining.length > 0) {
        const pick = remaining[randInt(0, remaining.length - 1)];
        currentConnSets[i].add(pick);
      }
    }
  }

  // Write connections back to the node objects.
  for (let i = 0; i < currentRow.length; i++) {
    currentRow[i].connections = Array.from(currentConnSets[i]);
  }
}

/**
 * Generate a complete branching map for a story level.
 *
 * @param {number} levelIndex - Zero-based index of the level
 * @param {string} levelName  - Display name (e.g. "The Tavern")
 * @returns {object} The map object with rows and a flat node lookup
 */
function generateMap(levelIndex, levelName) {
  const rows = [];

  // --- Row 0: single start node (always a battle) ---
  const startNode = createNode(0, 0, 'battle', true);
  rows.push([startNode]);

  // --- Rows 1-3: middle rows with 2-3 random nodes each ---
  for (let r = 1; r <= 3; r++) {
    const count = randInt(2, 3);
    const revealed = r <= 1; // only rows 0 and 1 start revealed
    const row = [];
    for (let c = 0; c < count; c++) {
      row.push(createNode(r, c, randomMiddleType(), revealed));
    }
    rows.push(row);
  }

  // --- Row 4: single boss node (always "boss") ---
  const bossNode = createNode(4, 0, 'boss', false);
  rows.push([bossNode]);

  // --- Wire up connections between adjacent rows ---
  for (let r = 0; r < rows.length - 1; r++) {
    connectRows(rows[r], rows[r + 1]);
  }

  // --- Build flat node lookup by ID ---
  const nodes = {};
  for (const row of rows) {
    for (const node of row) {
      nodes[node.id] = node;
    }
  }

  return {
    levelIndex,
    levelName,
    rows,
    nodes,
  };
}

export { generateMap };
