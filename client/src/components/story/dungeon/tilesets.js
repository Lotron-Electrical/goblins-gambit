/**
 * Themed tile palettes and programmatic tile drawing for the dungeon crawler.
 * Each tile is 16x16 pixels, drawn to an offscreen canvas and cached as ImageBitmap.
 */

export const TILE_SIZE = 16;

/** Seeded PRNG (Mulberry32) for deterministic tile noise */
function mulberry32(seed) {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 6 themed palettes keyed by level name */
export const PALETTES = {
  tavern: {
    floor: "#8B6914",
    floorAlt: "#7A5C12",
    wall: "#4A4A4A",
    wallDark: "#3A3A3A",
    corridor: "#6B5210",
    door: "#D97706",
    accent: "#D97706",
    fog: "#0A0A0A",
  },
  hills: {
    floor: "#3A6B35",
    floorAlt: "#2F5A2B",
    wall: "#5C4033",
    wallDark: "#4A3228",
    corridor: "#2D5428",
    door: "#22C55E",
    accent: "#22C55E",
    fog: "#0A0F0A",
  },
  swamp: {
    floor: "#1A3A2A",
    floorAlt: "#152E22",
    wall: "#3D5A3D",
    wallDark: "#2D4A2D",
    corridor: "#13321F",
    door: "#10B981",
    accent: "#10B981",
    fog: "#050F0A",
  },
  tundra: {
    floor: "#B8D4E3",
    floorAlt: "#A0C0D4",
    wall: "#6B7B8D",
    wallDark: "#556575",
    corridor: "#95B5CA",
    door: "#3B82F6",
    accent: "#3B82F6",
    fog: "#0A0D10",
  },
  cliffs: {
    floor: "#6B6B6B",
    floorAlt: "#5E5E5E",
    wall: "#3A3A3A",
    wallDark: "#2A2A2A",
    corridor: "#585858",
    door: "#A8A29E",
    accent: "#A8A29E",
    fog: "#0A0A0A",
  },
  volcano: {
    floor: "#3A1010",
    floorAlt: "#2E0C0C",
    wall: "#1A1A2E",
    wallDark: "#101020",
    corridor: "#2A0808",
    door: "#EF4444",
    accent: "#EF4444",
    fog: "#0A0505",
  },
};

/** Parse hex color to [r, g, b] */
function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Lighten/darken a hex color by amount (-1 to 1) */
function adjustColor(hex, amount) {
  const [r, g, b] = hexToRgb(hex);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const adj = Math.round(amount * 40);
  return `rgb(${clamp(r + adj)},${clamp(g + adj)},${clamp(b + adj)})`;
}

/**
 * Generate all tile images for a given palette.
 * Returns an object of CanvasImageSource keyed by tile name.
 */
export function generateTileCache(levelKey, seed = 0) {
  const pal = PALETTES[levelKey] || PALETTES.tavern;
  const rng = mulberry32(seed);
  const cache = {};

  function makeTile(drawFn) {
    const c = document.createElement("canvas");
    c.width = TILE_SIZE;
    c.height = TILE_SIZE;
    const ctx = c.getContext("2d");
    drawFn(ctx, pal, rng);
    return c;
  }

  // Wall tile — solid with pixel noise
  cache.wall = makeTile((ctx, p, r) => {
    ctx.fillStyle = p.wall;
    ctx.fillRect(0, 0, 16, 16);
    // Add noise pixels
    for (let i = 0; i < 12; i++) {
      const x = Math.floor(r() * 16);
      const y = Math.floor(r() * 16);
      ctx.fillStyle = r() > 0.5 ? p.wallDark : adjustColor(p.wall, 0.3);
      ctx.fillRect(x, y, 1, 1);
    }
    // Bottom edge highlight
    ctx.fillStyle = adjustColor(p.wall, -0.4);
    ctx.fillRect(0, 15, 16, 1);
  });

  // Floor tiles (3 variants)
  for (let v = 0; v < 3; v++) {
    cache[`floor${v}`] = makeTile((ctx, p, r) => {
      ctx.fillStyle = v === 1 ? p.floorAlt : p.floor;
      ctx.fillRect(0, 0, 16, 16);
      // Subtle detail dots
      const dots = 2 + Math.floor(r() * 3);
      for (let i = 0; i < dots; i++) {
        const x = Math.floor(r() * 14) + 1;
        const y = Math.floor(r() * 14) + 1;
        ctx.fillStyle = adjustColor(p.floor, r() > 0.5 ? -0.15 : 0.15);
        ctx.fillRect(x, y, 1, 1);
      }
    });
  }

  // Corridor floor
  cache.corridor = makeTile((ctx, p, r) => {
    ctx.fillStyle = p.corridor;
    ctx.fillRect(0, 0, 16, 16);
    for (let i = 0; i < 3; i++) {
      const x = Math.floor(r() * 14) + 1;
      const y = Math.floor(r() * 14) + 1;
      ctx.fillStyle = adjustColor(p.corridor, -0.1);
      ctx.fillRect(x, y, 1, 1);
    }
  });

  // Door (open) — archway shape
  cache.doorOpen = makeTile((ctx, p) => {
    ctx.fillStyle = p.corridor;
    ctx.fillRect(0, 0, 16, 16);
    // Doorframe
    ctx.fillStyle = p.door;
    ctx.fillRect(0, 0, 3, 16);
    ctx.fillRect(13, 0, 3, 16);
    ctx.fillRect(0, 0, 16, 3);
  });

  // Door (locked) — barred
  cache.doorLocked = makeTile((ctx, p) => {
    ctx.fillStyle = p.wall;
    ctx.fillRect(0, 0, 16, 16);
    // Bars
    ctx.fillStyle = adjustColor(p.wall, -0.3);
    for (let x = 3; x < 14; x += 3) {
      ctx.fillRect(x, 2, 1, 12);
    }
    // Horizontal bar
    ctx.fillRect(2, 7, 12, 1);
    ctx.fillRect(2, 8, 12, 1);
  });

  // Stairs (spiral pattern)
  cache.stairs = makeTile((ctx, p) => {
    ctx.fillStyle = p.floor;
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = p.accent;
    // Spiral steps
    ctx.fillRect(4, 4, 8, 2);
    ctx.fillRect(10, 4, 2, 8);
    ctx.fillRect(4, 10, 8, 2);
    ctx.fillRect(4, 6, 2, 6);
    ctx.fillRect(6, 6, 4, 2);
    // Center
    ctx.fillStyle = adjustColor(p.accent, -0.3);
    ctx.fillRect(7, 7, 2, 2);
  });

  return cache;
}

/**
 * Draw an encounter icon at the given pixel position.
 * type: 'battle' | 'enhancement' | 'boss' | 'completed'
 */
export function drawEncounterIcon(ctx, type, px, py, palette, frame) {
  const cx = px + 8;
  const cy = py + 8;
  const bob = Math.sin(frame * 0.05) * 1.5;

  ctx.save();
  switch (type) {
    case "battle": {
      // Crossed swords — two lines
      ctx.strokeStyle = "#EF4444";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy - 5 + bob);
      ctx.lineTo(cx + 5, cy + 5 + bob);
      ctx.moveTo(cx + 5, cy - 5 + bob);
      ctx.lineTo(cx - 5, cy + 5 + bob);
      ctx.stroke();
      break;
    }
    case "enhancement": {
      // Star shape
      ctx.fillStyle = "#FBBF24";
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const angle = (i * 4 * Math.PI) / 5 - Math.PI / 2;
        const r = i === 0 ? 0 : undefined;
        const x = cx + Math.cos(angle) * 6;
        const y = cy + Math.sin(angle) * 6 + bob;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "boss": {
      // Skull — circle + jaw
      ctx.fillStyle = "#F59E0B";
      ctx.beginPath();
      ctx.arc(cx, cy - 1 + bob, 5, 0, Math.PI * 2);
      ctx.fill();
      // Eyes
      ctx.fillStyle = "#000";
      ctx.fillRect(cx - 3, cy - 2 + bob, 2, 2);
      ctx.fillRect(cx + 1, cy - 2 + bob, 2, 2);
      // Jaw
      ctx.fillStyle = "#F59E0B";
      ctx.fillRect(cx - 3, cy + 2 + bob, 6, 2);
      break;
    }
    case "completed": {
      // Checkmark
      ctx.strokeStyle = "#22C55E";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 4, cy);
      ctx.lineTo(cx - 1, cy + 4);
      ctx.lineTo(cx + 5, cy - 4);
      ctx.stroke();
      break;
    }
  }
  ctx.restore();
}
