/**
 * Programmatically drawn goblin sprite — 4 directions, 2-frame walk animation.
 * Each sprite is 16x16 pixels (drawn into a 12x14 region centered).
 */

import { TILE_SIZE } from "./tilesets.js";

const GOBLIN_GREEN = "#3D8B37";
const GOBLIN_DARK = "#2A6B25";
const GOBLIN_LIGHT = "#5AAF50";
const EYE_COLOR = "#FF4444";
const LOINCLOTH = "#8B6914";

/**
 * Generate all 8 goblin sprite frames (4 directions x 2 walk frames).
 * Returns { down0, down1, up0, up1, left0, left1, right0, right1 }
 */
export function generateGoblinSprites() {
  const sprites = {};

  function makeSprite(drawFn) {
    const c = document.createElement("canvas");
    c.width = TILE_SIZE;
    c.height = TILE_SIZE;
    const ctx = c.getContext("2d");
    drawFn(ctx);
    return c;
  }

  // Helper to draw the basic goblin shape facing down
  function drawGoblinDown(ctx, frame) {
    const ox = 2; // offset x for centering in 16px
    const oy = 1;
    // Head
    ctx.fillStyle = GOBLIN_GREEN;
    ctx.fillRect(ox + 3, oy + 0, 6, 5);
    // Ears
    ctx.fillRect(ox + 1, oy + 1, 2, 3);
    ctx.fillRect(ox + 9, oy + 1, 2, 3);
    // Eyes
    ctx.fillStyle = EYE_COLOR;
    ctx.fillRect(ox + 4, oy + 2, 1, 1);
    ctx.fillRect(ox + 7, oy + 2, 1, 1);
    // Body
    ctx.fillStyle = GOBLIN_GREEN;
    ctx.fillRect(ox + 3, oy + 5, 6, 5);
    // Loincloth
    ctx.fillStyle = LOINCLOTH;
    ctx.fillRect(ox + 4, oy + 8, 4, 2);
    // Arms
    ctx.fillStyle = GOBLIN_DARK;
    if (frame === 0) {
      ctx.fillRect(ox + 1, oy + 5, 2, 4);
      ctx.fillRect(ox + 9, oy + 5, 2, 4);
    } else {
      ctx.fillRect(ox + 1, oy + 6, 2, 4);
      ctx.fillRect(ox + 9, oy + 4, 2, 4);
    }
    // Legs
    ctx.fillStyle = GOBLIN_DARK;
    if (frame === 0) {
      ctx.fillRect(ox + 4, oy + 10, 2, 3);
      ctx.fillRect(ox + 7, oy + 10, 2, 3);
    } else {
      ctx.fillRect(ox + 3, oy + 10, 2, 3);
      ctx.fillRect(ox + 8, oy + 10, 2, 3);
    }
  }

  function drawGoblinUp(ctx, frame) {
    const ox = 2;
    const oy = 1;
    // Head (back of head)
    ctx.fillStyle = GOBLIN_GREEN;
    ctx.fillRect(ox + 3, oy + 0, 6, 5);
    // Ears
    ctx.fillRect(ox + 1, oy + 1, 2, 3);
    ctx.fillRect(ox + 9, oy + 1, 2, 3);
    // Hair tuft
    ctx.fillStyle = GOBLIN_DARK;
    ctx.fillRect(ox + 5, oy + 0, 2, 2);
    // Body
    ctx.fillStyle = GOBLIN_GREEN;
    ctx.fillRect(ox + 3, oy + 5, 6, 5);
    // Loincloth
    ctx.fillStyle = LOINCLOTH;
    ctx.fillRect(ox + 4, oy + 8, 4, 2);
    // Arms
    ctx.fillStyle = GOBLIN_DARK;
    if (frame === 0) {
      ctx.fillRect(ox + 1, oy + 5, 2, 4);
      ctx.fillRect(ox + 9, oy + 5, 2, 4);
    } else {
      ctx.fillRect(ox + 1, oy + 4, 2, 4);
      ctx.fillRect(ox + 9, oy + 6, 2, 4);
    }
    // Legs
    ctx.fillStyle = GOBLIN_DARK;
    if (frame === 0) {
      ctx.fillRect(ox + 4, oy + 10, 2, 3);
      ctx.fillRect(ox + 7, oy + 10, 2, 3);
    } else {
      ctx.fillRect(ox + 3, oy + 10, 2, 3);
      ctx.fillRect(ox + 8, oy + 10, 2, 3);
    }
  }

  function drawGoblinLeft(ctx, frame) {
    const ox = 3;
    const oy = 1;
    // Head
    ctx.fillStyle = GOBLIN_GREEN;
    ctx.fillRect(ox + 2, oy + 0, 5, 5);
    // Ear (left side only visible)
    ctx.fillRect(ox + 0, oy + 1, 2, 3);
    // Eye
    ctx.fillStyle = EYE_COLOR;
    ctx.fillRect(ox + 3, oy + 2, 1, 1);
    // Body
    ctx.fillStyle = GOBLIN_GREEN;
    ctx.fillRect(ox + 2, oy + 5, 5, 5);
    // Loincloth
    ctx.fillStyle = LOINCLOTH;
    ctx.fillRect(ox + 3, oy + 8, 3, 2);
    // Arm
    ctx.fillStyle = GOBLIN_DARK;
    if (frame === 0) {
      ctx.fillRect(ox + 1, oy + 5, 2, 4);
    } else {
      ctx.fillRect(ox + 0, oy + 6, 2, 4);
    }
    // Legs
    ctx.fillStyle = GOBLIN_DARK;
    if (frame === 0) {
      ctx.fillRect(ox + 3, oy + 10, 2, 3);
      ctx.fillRect(ox + 5, oy + 10, 2, 3);
    } else {
      ctx.fillRect(ox + 2, oy + 10, 2, 3);
      ctx.fillRect(ox + 6, oy + 10, 2, 3);
    }
  }

  function drawGoblinRight(ctx, frame) {
    const ox = 2;
    const oy = 1;
    // Head
    ctx.fillStyle = GOBLIN_GREEN;
    ctx.fillRect(ox + 3, oy + 0, 5, 5);
    // Ear
    ctx.fillRect(ox + 8, oy + 1, 2, 3);
    // Eye
    ctx.fillStyle = EYE_COLOR;
    ctx.fillRect(ox + 6, oy + 2, 1, 1);
    // Body
    ctx.fillStyle = GOBLIN_GREEN;
    ctx.fillRect(ox + 3, oy + 5, 5, 5);
    // Loincloth
    ctx.fillStyle = LOINCLOTH;
    ctx.fillRect(ox + 4, oy + 8, 3, 2);
    // Arm
    ctx.fillStyle = GOBLIN_DARK;
    if (frame === 0) {
      ctx.fillRect(ox + 7, oy + 5, 2, 4);
    } else {
      ctx.fillRect(ox + 8, oy + 6, 2, 4);
    }
    // Legs
    ctx.fillStyle = GOBLIN_DARK;
    if (frame === 0) {
      ctx.fillRect(ox + 3, oy + 10, 2, 3);
      ctx.fillRect(ox + 5, oy + 10, 2, 3);
    } else {
      ctx.fillRect(ox + 2, oy + 10, 2, 3);
      ctx.fillRect(ox + 6, oy + 10, 2, 3);
    }
  }

  sprites.down0 = makeSprite((ctx) => drawGoblinDown(ctx, 0));
  sprites.down1 = makeSprite((ctx) => drawGoblinDown(ctx, 1));
  sprites.up0 = makeSprite((ctx) => drawGoblinUp(ctx, 0));
  sprites.up1 = makeSprite((ctx) => drawGoblinUp(ctx, 1));
  sprites.left0 = makeSprite((ctx) => drawGoblinLeft(ctx, 0));
  sprites.left1 = makeSprite((ctx) => drawGoblinLeft(ctx, 1));
  sprites.right0 = makeSprite((ctx) => drawGoblinRight(ctx, 0));
  sprites.right1 = makeSprite((ctx) => drawGoblinRight(ctx, 1));

  return sprites;
}

/**
 * Get the correct sprite key for current facing + walk frame.
 * @param {string} facing - 'up' | 'down' | 'left' | 'right'
 * @param {number} walkFrame - 0 or 1
 * @returns {string} sprite key like 'down0'
 */
export function getSpriteKey(facing, walkFrame) {
  return `${facing}${walkFrame}`;
}
