/**
 * A* pathfinding on the dungeon tile grid.
 * 4-directional movement on a flat Uint8Array grid.
 */

import { TILE } from "./dungeonGenerator.js";

/** Check if a tile type is walkable */
function isWalkable(tileType, doorStates) {
  if (tileType === TILE.FLOOR || tileType === TILE.CORRIDOR) return true;
  if (tileType === TILE.DOOR) return true; // doors are walkable if path exists to them
  return false;
}

/**
 * Find shortest path from start to end using A*.
 * @param {object} grid - { width, height, tiles: Uint8Array }
 * @param {{ x: number, y: number }} start
 * @param {{ x: number, y: number }} end
 * @param {Set<string>} [lockedDoors] - Set of "x,y" strings for locked door positions
 * @returns {Array<{ x: number, y: number }>|null} - path including start and end, or null if unreachable
 */
export function findPath(grid, start, end, lockedDoors = new Set()) {
  const { width, height, tiles } = grid;

  // Bounds check
  if (
    start.x < 0 ||
    start.x >= width ||
    start.y < 0 ||
    start.y >= height ||
    end.x < 0 ||
    end.x >= width ||
    end.y < 0 ||
    end.y >= height
  ) {
    return null;
  }

  const endTile = tiles[end.y * width + end.x];
  if (!isWalkable(endTile) || lockedDoors.has(`${end.x},${end.y}`)) {
    return null;
  }

  const key = (x, y) => y * width + x;
  const heuristic = (x, y) => Math.abs(x - end.x) + Math.abs(y - end.y);

  // Open set as a simple sorted array (grid is only 1200 tiles, perf is trivial)
  const open = [];
  const gScore = new Map();
  const cameFrom = new Map();
  const closed = new Set();

  const startKey = key(start.x, start.y);
  gScore.set(startKey, 0);
  open.push({ x: start.x, y: start.y, f: heuristic(start.x, start.y) });

  const dirs = [
    { dx: 0, dy: -1 },
    { dx: 1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: -1, dy: 0 },
  ];

  while (open.length > 0) {
    // Find node with lowest f score
    let bestIdx = 0;
    for (let i = 1; i < open.length; i++) {
      if (open[i].f < open[bestIdx].f) bestIdx = i;
    }
    const current = open.splice(bestIdx, 1)[0];
    const ck = key(current.x, current.y);

    if (current.x === end.x && current.y === end.y) {
      // Reconstruct path
      const path = [{ x: end.x, y: end.y }];
      let k = ck;
      while (cameFrom.has(k)) {
        k = cameFrom.get(k);
        path.push({ x: k % width, y: Math.floor(k / width) });
      }
      path.reverse();
      return path;
    }

    closed.add(ck);

    for (const { dx, dy } of dirs) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;

      const nk = key(nx, ny);
      if (closed.has(nk)) continue;

      const tileType = tiles[ny * width + nx];
      if (!isWalkable(tileType)) continue;
      if (tileType === TILE.DOOR && lockedDoors.has(`${nx},${ny}`)) continue;

      const tentG = gScore.get(ck) + 1;
      if (tentG < (gScore.get(nk) ?? Infinity)) {
        gScore.set(nk, tentG);
        cameFrom.set(nk, ck);
        const f = tentG + heuristic(nx, ny);
        // Add to open if not already there
        if (!open.find((n) => n.x === nx && n.y === ny)) {
          open.push({ x: nx, y: ny, f });
        }
      }
    }
  }

  return null; // No path found
}
