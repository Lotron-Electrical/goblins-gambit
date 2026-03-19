/**
 * Dungeon generator — converts the server's node graph into a tile-based dungeon layout.
 * Grid: 40 wide x 30 tall. Each node becomes a room. Corridors connect rooms via node connections.
 */

/** Tile type constants */
export const TILE = { WALL: 0, FLOOR: 1, CORRIDOR: 2, DOOR: 3, WATER: 4, GRASS: 5 };

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

  // Step 3.5: Environmental tiles (water pools + grass patches)
  generateEnvironment(tiles, rooms, rng);

  // Step 3.6: Decorations layer
  const decorations = generateDecorations(tiles, rooms, rng);

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
    decorations,
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
        if (atFromEdge)
          doorPositions.push({ x, y, roomNodeId: fromRoom.nodeId });
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
        if (atFromEdge)
          doorPositions.push({ x, y, roomNodeId: fromRoom.nodeId });
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

/** Place water pools and grass patches in rooms */
function generateEnvironment(tiles, rooms, rng) {
  for (const room of rooms) {
    // Water pools: 20% of rooms get a 2x3 or 3x2 pool in a corner
    if (rng() < 0.2) {
      const poolW = rng() > 0.5 ? 3 : 2;
      const poolH = poolW === 3 ? 2 : 3;
      // Pick a corner
      const cornerX = rng() > 0.5 ? room.x + 1 : room.x + room.w - poolW - 1;
      const cornerY = rng() > 0.5 ? room.y + 1 : room.y + room.h - poolH - 1;

      for (let dy = 0; dy < poolH; dy++) {
        for (let dx = 0; dx < poolW; dx++) {
          const wx = cornerX + dx;
          const wy = cornerY + dy;
          if (wx >= room.x && wx < room.x + room.w && wy >= room.y && wy < room.y + room.h) {
            // Never on room center
            if (wx === room.cx && wy === room.cy) continue;
            // Never adjacent to doors
            const idx = wy * GRID_W + wx;
            if (tiles[idx] === TILE.FLOOR) {
              let nearDoor = false;
              for (const dd of [[-1,0],[1,0],[0,-1],[0,1]]) {
                const ni = (wy + dd[1]) * GRID_W + (wx + dd[0]);
                if (ni >= 0 && ni < GRID_W * GRID_H && tiles[ni] === TILE.DOOR) nearDoor = true;
              }
              if (!nearDoor) tiles[idx] = TILE.WATER;
            }
          }
        }
      }
    }

    // Grass patches: 30% of rooms get 3-6 grass tiles along inner edges
    if (rng() < 0.3) {
      const count = 3 + Math.floor(rng() * 4);
      for (let i = 0; i < count; i++) {
        // Pick a tile 1 in from wall edge
        const edge = Math.floor(rng() * 4); // 0=top,1=right,2=bottom,3=left
        let gx, gy;
        if (edge === 0) { gx = room.x + 1 + Math.floor(rng() * (room.w - 2)); gy = room.y + 1; }
        else if (edge === 1) { gx = room.x + room.w - 2; gy = room.y + 1 + Math.floor(rng() * (room.h - 2)); }
        else if (edge === 2) { gx = room.x + 1 + Math.floor(rng() * (room.w - 2)); gy = room.y + room.h - 2; }
        else { gx = room.x + 1; gy = room.y + 1 + Math.floor(rng() * (room.h - 2)); }

        if (gx === room.cx && gy === room.cy) continue;
        const idx = gy * GRID_W + gx;
        if (tiles[idx] === TILE.FLOOR) {
          tiles[idx] = TILE.GRASS;
        }
      }
    }
  }
}

/** Generate decoration objects (torches, barrels, bones, cobwebs, cracks, rubble) */
function generateDecorations(tiles, rooms, rng) {
  const decorations = [];

  for (const room of rooms) {
    // Torches: 1-2 on wall tiles adjacent to floor (1 tile above room interior)
    const torchCount = 1 + Math.floor(rng() * 2);
    let placed = 0;
    for (let attempt = 0; attempt < 10 && placed < torchCount; attempt++) {
      const tx = room.x + 1 + Math.floor(rng() * (room.w - 2));
      const ty = room.y - 1; // wall tile above room
      if (ty >= 0 && tiles[ty * GRID_W + tx] === TILE.WALL) {
        decorations.push({ x: tx, y: ty, type: 'torch' });
        placed++;
      }
    }

    // Barrels: 20% of rooms, 1-2 in corners
    if (rng() < 0.2) {
      const barrelCount = 1 + Math.floor(rng() * 2);
      const corners = [
        { x: room.x + 1, y: room.y + 1 },
        { x: room.x + room.w - 2, y: room.y + 1 },
        { x: room.x + 1, y: room.y + room.h - 2 },
        { x: room.x + room.w - 2, y: room.y + room.h - 2 },
      ];
      for (let i = 0; i < barrelCount && corners.length > 0; i++) {
        const ci = Math.floor(rng() * corners.length);
        const c = corners.splice(ci, 1)[0];
        const t = tiles[c.y * GRID_W + c.x];
        if (t === TILE.FLOOR || t === TILE.GRASS) {
          decorations.push({ x: c.x, y: c.y, type: 'barrel' });
        }
      }
    }

    // Bones: 15% of rooms, 1-2 tiles
    if (rng() < 0.15) {
      const count = 1 + Math.floor(rng() * 2);
      for (let i = 0; i < count; i++) {
        const bx = room.x + 1 + Math.floor(rng() * (room.w - 2));
        const by = room.y + 1 + Math.floor(rng() * (room.h - 2));
        if (bx === room.cx && by === room.cy) continue;
        const t = tiles[by * GRID_W + bx];
        if (t === TILE.FLOOR) {
          decorations.push({ x: bx, y: by, type: 'bones' });
        }
      }
    }

    // Cobwebs: 25% per corner
    const cobCorners = [
      { x: room.x, y: room.y },
      { x: room.x + room.w - 1, y: room.y },
      { x: room.x, y: room.y + room.h - 1 },
      { x: room.x + room.w - 1, y: room.y + room.h - 1 },
    ];
    for (const cc of cobCorners) {
      if (rng() < 0.25) {
        const t = tiles[cc.y * GRID_W + cc.x];
        if (t === TILE.FLOOR) {
          decorations.push({ x: cc.x, y: cc.y, type: 'cobweb' });
        }
      }
    }
  }

  // Cracks: 10% of floor tiles
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (tiles[y * GRID_W + x] === TILE.FLOOR && rng() < 0.10) {
        decorations.push({ x, y, type: 'crack' });
      }
    }
  }

  // Rubble: 10% of corridor tiles
  for (let y = 0; y < GRID_H; y++) {
    for (let x = 0; x < GRID_W; x++) {
      if (tiles[y * GRID_W + x] === TILE.CORRIDOR && rng() < 0.10) {
        decorations.push({ x, y, type: 'rubble' });
      }
    }
  }

  return decorations;
}

/** Get the grid width/height constants */
export function getDungeonSize() {
  return { width: GRID_W, height: GRID_H };
}
