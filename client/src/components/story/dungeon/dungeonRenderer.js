/**
 * Dungeon renderer — 3-layer canvas rendering (tiles, entities, fog).
 * Uses cached tile images from tilesets.js for fast blitting.
 */

import { TILE_SIZE, generateTileCache, drawEncounterIcon, PALETTES } from "./tilesets.js";
import { TILE } from "./dungeonGenerator.js";
import { getSpriteKey } from "./playerSprite.js";

/**
 * Render the complete dungeon frame.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} state - all render state
 */
export function renderDungeon(ctx, state) {
  const {
    dungeonGrid,
    tileCache,
    goblinSprites,
    playerPos,
    playerFacing,
    walkFrame,
    revealedTiles,
    levelKey,
    frame,
    showStairs,
    canvasWidth,
    canvasHeight,
    scale,
  } = state;

  if (!dungeonGrid || !tileCache) return;

  const { width, height, tiles, rooms } = dungeonGrid;
  const pal = PALETTES[levelKey] || PALETTES.tavern;

  ctx.save();

  // Clear
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Calculate camera offset to center on player
  const camX = Math.round(playerPos.x * TILE_SIZE * scale - canvasWidth / 2);
  const camY = Math.round(playerPos.y * TILE_SIZE * scale - canvasHeight / 2);

  // Clamp camera to grid bounds
  const maxCamX = width * TILE_SIZE * scale - canvasWidth;
  const maxCamY = height * TILE_SIZE * scale - canvasHeight;
  const offsetX = -Math.max(0, Math.min(maxCamX, camX));
  const offsetY = -Math.max(0, Math.min(maxCamY, camY));

  ctx.translate(offsetX, offsetY);
  ctx.scale(scale, scale);

  // Current visibility set
  const visibleSet = getVisibleTiles(playerPos.x, playerPos.y, 4, width, height);

  // Layer 1: Dungeon tiles
  renderTiles(ctx, tiles, width, height, tileCache, revealedTiles, visibleSet);

  // Layer 1.5: Stairs (if visible)
  if (showStairs && tileCache.stairs) {
    const sp = dungeonGrid.stairsPos;
    const stairKey = `${sp.x},${sp.y}`;
    if (visibleSet.has(stairKey) || revealedTiles.has(stairKey)) {
      ctx.drawImage(tileCache.stairs, sp.x * TILE_SIZE, sp.y * TILE_SIZE);
    }
  }

  // Layer 2: Entity layer — encounter icons + player
  renderEntities(ctx, rooms, goblinSprites, playerPos, playerFacing, walkFrame, frame, visibleSet, revealedTiles, showStairs, dungeonGrid);

  // Layer 3: Fog of war
  renderFog(ctx, width, height, revealedTiles, visibleSet, pal);

  ctx.restore();
}

/** Get set of tiles visible from player position within given radius */
function getVisibleTiles(px, py, radius, gridW, gridH) {
  const visible = new Set();
  const r2 = radius * radius;

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy <= r2) {
        const tx = px + dx;
        const ty = py + dy;
        if (tx >= 0 && tx < gridW && ty >= 0 && ty < gridH) {
          visible.add(`${tx},${ty}`);
        }
      }
    }
  }

  return visible;
}

/** Render tile layer */
function renderTiles(ctx, tiles, width, height, tileCache, revealed, visible) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = `${x},${y}`;
      if (!visible.has(key) && !revealed.has(key)) continue;

      const tileType = tiles[y * width + x];
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;

      let tileImg;
      switch (tileType) {
        case TILE.WALL:
          tileImg = tileCache.wall;
          break;
        case TILE.FLOOR:
          tileImg = tileCache[`floor${(x + y) % 3}`];
          break;
        case TILE.CORRIDOR:
          tileImg = tileCache.corridor;
          break;
        case TILE.DOOR:
          tileImg = tileCache.doorOpen;
          break;
        default:
          tileImg = tileCache.wall;
      }

      if (tileImg) {
        ctx.drawImage(tileImg, px, py);
      }
    }
  }
}

/** Render entity layer — encounter icons and player sprite */
function renderEntities(ctx, rooms, goblinSprites, playerPos, playerFacing, walkFrame, frame, visible, revealed, showStairs, dungeonGrid) {
  // Draw room encounter icons
  for (const room of rooms) {
    const key = `${room.cx},${room.cy}`;
    if (!visible.has(key) && !revealed.has(key)) continue;

    const px = room.cx * TILE_SIZE;
    const py = room.cy * TILE_SIZE;

    if (room.completed) {
      drawEncounterIcon(ctx, "completed", px, py, null, frame);
    } else if (room.selectable || room.revealed) {
      drawEncounterIcon(ctx, room.type, px, py, null, frame);
    }
  }

  // Draw player
  if (goblinSprites) {
    const spriteKey = getSpriteKey(playerFacing, walkFrame);
    const sprite = goblinSprites[spriteKey];
    if (sprite) {
      ctx.drawImage(sprite, playerPos.x * TILE_SIZE, playerPos.y * TILE_SIZE);
    }
  }
}

/** Render fog of war layer */
function renderFog(ctx, width, height, revealed, visible, pal) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const key = `${x},${y}`;
      const px = x * TILE_SIZE;
      const py = y * TILE_SIZE;

      if (visible.has(key)) {
        // Fully visible — no fog
        continue;
      } else if (revealed.has(key)) {
        // Previously seen — dim fog
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      } else {
        // Never seen — full black
        ctx.fillStyle = "#000";
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
      }
    }
  }
}

/**
 * Convert canvas pixel coordinates to tile coordinates.
 * @param {number} canvasX - pixel x on canvas
 * @param {number} canvasY - pixel y on canvas
 * @param {object} playerPos - { x, y } tile coords
 * @param {number} scale - current render scale
 * @param {number} canvasWidth
 * @param {number} canvasHeight
 * @param {object} dungeonGrid - { width, height }
 * @returns {{ x: number, y: number }} tile coords
 */
export function pixelToTile(canvasX, canvasY, playerPos, scale, canvasWidth, canvasHeight, dungeonGrid) {
  const { width, height } = dungeonGrid;

  // Reverse the camera transform
  const camX = playerPos.x * TILE_SIZE * scale - canvasWidth / 2;
  const camY = playerPos.y * TILE_SIZE * scale - canvasHeight / 2;

  const maxCamX = width * TILE_SIZE * scale - canvasWidth;
  const maxCamY = height * TILE_SIZE * scale - canvasHeight;
  const offsetX = -Math.max(0, Math.min(maxCamX, camX));
  const offsetY = -Math.max(0, Math.min(maxCamY, camY));

  const worldX = (canvasX - offsetX) / scale;
  const worldY = (canvasY - offsetY) / scale;

  return {
    x: Math.floor(worldX / TILE_SIZE),
    y: Math.floor(worldY / TILE_SIZE),
  };
}

/**
 * Get the set of visible tiles around a position. Used by the store for reveal tracking.
 */
export function computeVisibleTiles(px, py, radius, gridW, gridH) {
  return getVisibleTiles(px, py, radius, gridW, gridH);
}
