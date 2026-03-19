/**
 * Dungeon generator — converts the server's node graph into a tile-based dungeon layout.
 * Grid: 40 wide x 30 tall. Each node becomes a room. Corridors connect rooms via node connections.
 */

/** Tile type constants */
export const TILE = { WALL: 0, FLOOR: 1, CORRIDOR: 2, DOOR: 3 };

/** Seeded PRNG (Mulberry32) */
function mulberry32(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const GRID_W = 40;
const GRID_H = 30;

/**
 * Generate a dungeon from the server's node map.
 * @param {object} currentMap - { rows, nodes } from server
 * @param {number} seed - deterministic seed
 * @param {Set<string>} completedNodeIds - set of completed node IDs
 * @param {Set<string>} selectableNodeIds - set of currently selectable node IDs
 * @returns {object} DungeonGrid
 */
export function generateDungeon(
  currentMap,
  seed,
  completedNodeIds,
  selectableNodeIds,
) {
  const rng = mulberry32(seed);
  const tiles = new Uint8Array(GRID_W * GRID_H); // all WALL (0) by default
  const rooms = [];

  const totalRows = currentMap.rows.length; // typically 5

  // Step 1: Assign room positions based on node row/col
  const nodeRooms = new Map(); // nodeId -> room data

  for (let rowIdx = 0; rowIdx < totalRows; rowIdx++) {
    const row = currentMap.rows[rowIdx];
    const numNodes = row.length;

    for (let colIdx = 0; colIdx < numNodes; colIdx++) {
      const node = row[colIdx];

      // Calculate base position
      // Y: distribute rows from bottom to top (row 0 = bottom, row 4 = top)
      const baseY = Math.round(
        GRID_H - 5 - ((GRID_H - 10) * rowIdx) / Math.max(1, totalRows - 1),
      );

      // X: spread horizontally based on column position
      let baseX;
      if (numNodes === 1) {
        baseX = Math.round(GRID_W / 2);
      } else {
        const spacing = Math.round((GRID_W - 16) / (numNodes - 1));
        baseX = 8 + colIdx * spacing;
      }

      // Add seeded jitter
      const jitterX = Math.round((rng() - 0.5) * 4);
      const jitterY = Math.round((rng() - 0.5) * 2);

      // Room size
      const w = 5 + Math.floor(rng() * 4); // 5-8
      const h = 5 + Math.floor(rng() * 3); // 5-7

      // Room top-left corner (centered on base position)
      let rx = Math.round(baseX - w / 2) + jitterX;
      let ry = Math.round(baseY - h / 2) + jitterY;

      // Clamp to grid bounds (leave 1-tile border)
      rx = Math.max(1, Math.min(GRID_W - w - 1, rx));
      ry = Math.max(1, Math.min(GRID_H - h - 1, ry));

      const room = {
        nodeId: node.id,
        x: rx,
        y: ry,
        w,
        h,
        cx: Math.floor(rx + w / 2),
        cy: Math.floor(ry + h / 2),
        type: node.type,
        completed: completedNodeIds.has(node.id),
        selectable: selectableNodeIds.has(node.id),
        revealed: node.revealed || false,
      };

      nodeRooms.set(node.id, room);
      rooms.push(room);
    }
  }

  // Step 1.5: Resolve room overlaps
  resolveOverlaps(rooms, rng);

  // Recalculate centers after overlap resolution
  for (const room of rooms) {
    room.cx = Math.floor(room.x + room.w / 2);
    room.cy = Math.floor(room.y + room.h / 2);
  }

  // Step 2: Carve rooms
  for (const room of rooms) {
    for (let y = room.y; y < room.y + room.h; y++) {
      for (let x = room.x; x < room.x + room.w; x++) {
        if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H) {
          tiles[y * GRID_W + x] = TILE.FLOOR;
        }
      }
    }
  }

  // Step 3: Carve corridors between connected rooms
  const doorPositions = []; // { x, y }
  const allNodes = currentMap.nodes;

  for (const nodeId in allNodes) {
    const node = allNodes[nodeId];
    if (!node.connections) continue;

    const fromRoom = nodeRooms.get(nodeId);
    if (!fromRoom) continue;

    for (const connId of node.connections) {
      const toRoom = nodeRooms.get(connId);
      if (!toRoom) continue;

      carveCorridor(tiles, fromRoom, toRoom, doorPositions, rng);
    }
  }

  // Step 4: Player spawn — entrance room (row 0) doorway area
  const entranceNode = currentMap.rows[0][0];
  const entranceRoom = nodeRooms.get(entranceNode.id);
  const playerSpawn = {
    x: entranceRoom.cx,
    y: entranceRoom.cy + Math.floor(entranceRoom.h / 2) - 1,
  };

  // Step 5: Stairs position — boss room center
  const bossRow = currentMap.rows[totalRows - 1];
  const bossNode = bossRow[0];
  const bossRoom = nodeRooms.get(bossNode.id);
  const stairsPos = { x: bossRoom.cx, y: bossRoom.cy };

  return {
    width: GRID_W,
    height: GRID_H,
    tiles,
    rooms,
    playerSpawn,
    stairsPos,
    seed,
    doorPositions,
  };
}

/** Resolve overlapping rooms by pushing them apart */
function resolveOverlaps(rooms, rng) {
  for (let iter = 0; iter < 20; iter++) {
    let anyOverlap = false;

    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const a = rooms[i];
        const b = rooms[j];
        const pad = 2; // minimum gap between rooms

        // Check overlap with padding
        if (
          a.x - pad < b.x + b.w &&
          a.x + a.w + pad > b.x &&
          a.y - pad < b.y + b.h &&
          a.y + a.h + pad > b.y
        ) {
          anyOverlap = true;

          // Push apart
          const acx = a.x + a.w / 2;
          const acy = a.y + a.h / 2;
          const bcx = b.x + b.w / 2;
          const bcy = b.y + b.h / 2;

          let dx = acx - bcx;
          let dy = acy - bcy;

          // If perfectly overlapping, pick a random direction
          if (dx === 0 && dy === 0) {
            dx = rng() > 0.5 ? 1 : -1;
            dy = rng() > 0.5 ? 1 : -1;
          }

          const pushX = dx > 0 ? 1 : -1;
          const pushY = dy > 0 ? 1 : -1;

          // Push the room further from center more
          a.x = Math.max(1, Math.min(GRID_W - a.w - 1, a.x + pushX));
          b.x = Math.max(1, Math.min(GRID_W - b.w - 1, b.x - pushX));
          a.y = Math.max(1, Math.min(GRID_H - a.h - 1, a.y + pushY));
          b.y = Math.max(1, Math.min(GRID_H - b.h - 1, b.y - pushY));
        }
      }
    }

    if (!anyOverlap) break;
  }
}

/** Carve an L-shaped corridor between two rooms */
function carveCorridor(tiles, fromRoom, toRoom, doorPositions, rng) {
  const fx = fromRoom.cx;
  const fy = fromRoom.cy;
  const tx = toRoom.cx;
  const ty = toRoom.cy;

  // Decide whether to go horizontal-first or vertical-first
  const horizFirst = rng() > 0.5;

  if (horizFirst) {
    carveHLine(tiles, fy, fx, tx, fromRoom, toRoom, doorPositions);
    carveVLine(tiles, tx, fy, ty, fromRoom, toRoom, doorPositions);
  } else {
    carveVLine(tiles, fx, fy, ty, fromRoom, toRoom, doorPositions);
    carveHLine(tiles, ty, fx, tx, fromRoom, toRoom, doorPositions);
  }
}

function carveHLine(tiles, y, x1, x2, fromRoom, toRoom, doorPositions) {
  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);

  for (let x = minX; x <= maxX; x++) {
    if (y < 0 || y >= GRID_H || x < 0 || x >= GRID_W) continue;
    const idx = y * GRID_W + x;

    // Check if this is a room-corridor boundary
    const inFromRoom = isInRoom(x, y, fromRoom);
    const inToRoom = isInRoom(x, y, toRoom);

    if (tiles[idx] === TILE.WALL) {
      // Check if we're at a room edge (entering/leaving a room)
      const atFromEdge = isRoomEdge(x, y, fromRoom);
      const atToEdge = isRoomEdge(x, y, toRoom);

      if (atFromEdge || atToEdge) {
        tiles[idx] = TILE.DOOR;
        if (atFromEdge) doorPositions.push({ x, y, roomNodeId: fromRoom.nodeId });
        if (atToEdge) doorPositions.push({ x, y, roomNodeId: toRoom.nodeId });
      } else if (!inFromRoom && !inToRoom) {
        tiles[idx] = TILE.CORRIDOR;
      }
    }
  }
}

function carveVLine(tiles, x, y1, y2, fromRoom, toRoom, doorPositions) {
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  for (let y = minY; y <= maxY; y++) {
    if (y < 0 || y >= GRID_H || x < 0 || x >= GRID_W) continue;
    const idx = y * GRID_W + x;

    const inFromRoom = isInRoom(x, y, fromRoom);
    const inToRoom = isInRoom(x, y, toRoom);

    if (tiles[idx] === TILE.WALL) {
      const atFromEdge = isRoomEdge(x, y, fromRoom);
      const atToEdge = isRoomEdge(x, y, toRoom);

      if (atFromEdge || atToEdge) {
        tiles[idx] = TILE.DOOR;
        if (atFromEdge) doorPositions.push({ x, y, roomNodeId: fromRoom.nodeId });
        if (atToEdge) doorPositions.push({ x, y, roomNodeId: toRoom.nodeId });
      } else if (!inFromRoom && !inToRoom) {
        tiles[idx] = TILE.CORRIDOR;
      }
    }
  }
}

function isInRoom(x, y, room) {
  return (
    x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h
  );
}

function isRoomEdge(x, y, room) {
  // Check if this tile is just outside the room boundary (within 1 tile)
  const inRoom = isInRoom(x, y, room);
  if (inRoom) return false;

  // Check if adjacent to room
  return (
    (x >= room.x - 1 &&
      x <= room.x + room.w &&
      y >= room.y &&
      y < room.y + room.h) ||
    (y >= room.y - 1 &&
      y <= room.y + room.h &&
      x >= room.x &&
      x < room.x + room.w)
  );
}

/** Get the grid width/height constants */
export function getDungeonSize() {
  return { width: GRID_W, height: GRID_H };
}
