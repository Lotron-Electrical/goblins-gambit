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
    wallFace: "#252525",
    corridor: "#6B5210",
    door: "#D97706",
    accent: "#D97706",
    fog: "#0A0A0A",
    water: "#1A3A5A",
    waterLight: "#2A5A8A",
    grass: "#3A7A30",
  },
  hills: {
    floor: "#3A6B35",
    floorAlt: "#2F5A2B",
    wall: "#5C4033",
    wallDark: "#4A3228",
    wallFace: "#321E15",
    corridor: "#2D5428",
    door: "#22C55E",
    accent: "#22C55E",
    fog: "#0A0F0A",
    water: "#1A4A6A",
    waterLight: "#2A6A9A",
    grass: "#4A8A40",
  },
  swamp: {
    floor: "#1A3A2A",
    floorAlt: "#152E22",
    wall: "#3D5A3D",
    wallDark: "#2D4A2D",
    wallFace: "#1A301A",
    corridor: "#13321F",
    door: "#10B981",
    accent: "#10B981",
    fog: "#050F0A",
    water: "#0A2A3A",
    waterLight: "#1A4A5A",
    grass: "#2A6A30",
  },
  tundra: {
    floor: "#B8D4E3",
    floorAlt: "#A0C0D4",
    wall: "#6B7B8D",
    wallDark: "#556575",
    wallFace: "#3A4A5A",
    corridor: "#95B5CA",
    door: "#3B82F6",
    accent: "#3B82F6",
    fog: "#0A0D10",
    water: "#3A6A9A",
    waterLight: "#5A8ABA",
    grass: "#7AAA80",
  },
  cliffs: {
    floor: "#6B6B6B",
    floorAlt: "#5E5E5E",
    wall: "#3A3A3A",
    wallDark: "#2A2A2A",
    wallFace: "#181818",
    corridor: "#585858",
    door: "#A8A29E",
    accent: "#A8A29E",
    fog: "#0A0A0A",
    water: "#1A3A5A",
    waterLight: "#2A5A7A",
    grass: "#4A6A40",
  },
  volcano: {
    floor: "#3A1010",
    floorAlt: "#2E0C0C",
    wall: "#1A1A2E",
    wallDark: "#101020",
    wallFace: "#080810",
    corridor: "#2A0808",
    door: "#EF4444",
    accent: "#EF4444",
    fog: "#0A0505",
    water: "#1A1A4A",
    waterLight: "#2A2A6A",
    grass: "#2A4A20",
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

/** Draw a brick pattern on the context */
function drawBricks(ctx, p, w, h) {
  ctx.fillStyle = p.wallDark; // mortar
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = p.wall;
  // Row 1: bricks at y=0..3
  for (let bx = 0; bx < w; bx += 5) {
    ctx.fillRect(bx + 1, 0, 4, 3);
  }
  // Row 2: offset bricks at y=4..7
  for (let bx = -2; bx < w; bx += 5) {
    ctx.fillRect(bx + 1, 4, 4, 3);
  }
  // Row 3: bricks at y=8..11
  for (let bx = 0; bx < w; bx += 5) {
    ctx.fillRect(bx + 1, 8, 4, 3);
  }
  // Row 4: offset bricks at y=12..14
  for (let bx = -2; bx < w; bx += 5) {
    ctx.fillRect(bx + 1, 12, 4, 2);
  }
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

  // Wall tile — brick pattern
  cache.wall = makeTile((ctx, p, r) => {
    drawBricks(ctx, p, 16, 16);
    // Add a few noise pixels for texture
    for (let i = 0; i < 6; i++) {
      const x = Math.floor(r() * 16);
      const y = Math.floor(r() * 16);
      ctx.fillStyle =
        r() > 0.5 ? adjustColor(p.wall, -0.2) : adjustColor(p.wall, 0.2);
      ctx.fillRect(x, y, 1, 1);
    }
    // Bottom shadow strip
    ctx.fillStyle = adjustColor(p.wall, -0.5);
    ctx.fillRect(0, 14, 16, 2);
  });

  // Wall-top tile — brick top + dark face bottom (depth effect)
  cache.wallTop = makeTile((ctx, p, r) => {
    // Top 10px: brick pattern
    drawBricks(ctx, p, 16, 10);
    // Bottom 6px: dark wall face
    ctx.fillStyle = p.wallFace;
    ctx.fillRect(0, 10, 16, 6);
    // Subtle vertical lines on face for texture
    ctx.fillStyle = adjustColor(p.wallFace, 0.15);
    for (let x = 2; x < 16; x += 4) {
      ctx.fillRect(x, 10, 1, 6);
    }
    // Top edge of face = highlight line
    ctx.fillStyle = adjustColor(p.wallFace, 0.3);
    ctx.fillRect(0, 10, 16, 1);
  });

  // Floor tiles (3 variants) — with grid lines and detail
  for (let v = 0; v < 3; v++) {
    cache[`floor${v}`] = makeTile((ctx, p, r) => {
      ctx.fillStyle = v === 1 ? p.floorAlt : p.floor;
      ctx.fillRect(0, 0, 16, 16);

      // Grid lines at edges (stone block borders)
      ctx.fillStyle = adjustColor(p.floor, -0.25);
      ctx.fillRect(0, 0, 16, 1); // top edge
      ctx.fillRect(0, 0, 1, 16); // left edge

      if (v === 0) {
        // Variant 0: noise dots
        for (let i = 0; i < 4; i++) {
          const x = 1 + Math.floor(r() * 14);
          const y = 1 + Math.floor(r() * 14);
          ctx.fillStyle = adjustColor(p.floor, r() > 0.5 ? -0.15 : 0.15);
          ctx.fillRect(x, y, 1, 1);
        }
      } else if (v === 1) {
        // Variant 1: 2x2 wear patch
        const wx = 3 + Math.floor(r() * 10);
        const wy = 3 + Math.floor(r() * 10);
        ctx.fillStyle = adjustColor(p.floorAlt, -0.2);
        ctx.fillRect(wx, wy, 2, 2);
      } else {
        // Variant 2: crack pattern (2-3 connected dark pixels)
        const cx = 4 + Math.floor(r() * 8);
        const cy = 4 + Math.floor(r() * 8);
        ctx.fillStyle = adjustColor(p.floor, -0.35);
        ctx.fillRect(cx, cy, 1, 1);
        ctx.fillRect(cx + 1, cy + 1, 1, 1);
        ctx.fillRect(cx + 2, cy, 1, 1);
      }
    });
  }

  // Corridor floor — with center-line pattern
  cache.corridor = makeTile((ctx, p, r) => {
    ctx.fillStyle = p.corridor;
    ctx.fillRect(0, 0, 16, 16);

    // Grid lines
    ctx.fillStyle = adjustColor(p.corridor, -0.2);
    ctx.fillRect(0, 0, 16, 1);
    ctx.fillRect(0, 0, 1, 16);

    // Faint center lines
    ctx.fillStyle = adjustColor(p.corridor, -0.1);
    ctx.fillRect(7, 1, 1, 15);
    ctx.fillRect(8, 1, 1, 15);

    // A few noise dots
    for (let i = 0; i < 3; i++) {
      const x = Math.floor(r() * 14) + 1;
      const y = Math.floor(r() * 14) + 1;
      ctx.fillStyle = adjustColor(p.corridor, -0.12);
      ctx.fillRect(x, y, 1, 1);
    }
  });

  // Door (open) — proper door frame
  cache.doorOpen = makeTile((ctx, p) => {
    // Floor visible through the gap
    ctx.fillStyle = p.corridor;
    ctx.fillRect(0, 0, 16, 16);
    // Left column
    ctx.fillStyle = p.door;
    ctx.fillRect(0, 0, 3, 16);
    // Right column
    ctx.fillRect(13, 0, 3, 16);
    // Top beam
    ctx.fillRect(0, 0, 16, 3);
    // Column inner shadow
    ctx.fillStyle = adjustColor(p.door, -0.3);
    ctx.fillRect(3, 3, 1, 13);
    ctx.fillRect(12, 3, 1, 13);
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
    ctx.fillRect(4, 4, 8, 2);
    ctx.fillRect(10, 4, 2, 8);
    ctx.fillRect(4, 10, 8, 2);
    ctx.fillRect(4, 6, 2, 6);
    ctx.fillRect(6, 6, 4, 2);
    ctx.fillStyle = adjustColor(p.accent, -0.3);
    ctx.fillRect(7, 7, 2, 2);
  });

  // Water tile — dark blue-green with wavy lines
  cache.water = makeTile((ctx, p, r) => {
    ctx.fillStyle = p.water;
    ctx.fillRect(0, 0, 16, 16);
    // Wavy lighter lines
    ctx.fillStyle = p.waterLight;
    for (let row = 0; row < 3; row++) {
      const baseY = 3 + row * 5;
      for (let x = 0; x < 16; x++) {
        const wave = Math.round(Math.sin((x + row * 3) * 0.8) * 0.8);
        ctx.fillRect(x, baseY + wave, 1, 1);
      }
    }
    // A couple shimmer dots
    for (let i = 0; i < 2; i++) {
      ctx.fillStyle = adjustColor(p.waterLight, 0.3);
      ctx.fillRect(2 + Math.floor(r() * 12), 1 + Math.floor(r() * 14), 1, 1);
    }
  });

  // Grass tile — floor base with green tufts
  cache.grass = makeTile((ctx, p, r) => {
    ctx.fillStyle = p.floor;
    ctx.fillRect(0, 0, 16, 16);
    // Grid lines like floor
    ctx.fillStyle = adjustColor(p.floor, -0.25);
    ctx.fillRect(0, 0, 16, 1);
    ctx.fillRect(0, 0, 1, 16);
    // Green tufts (3-5 vertical lines sprouting up)
    const tufts = 3 + Math.floor(r() * 3);
    for (let i = 0; i < tufts; i++) {
      const tx = 2 + Math.floor(r() * 12);
      const th = 2 + Math.floor(r() * 2); // 2-3px tall
      const ty = 14 - th - Math.floor(r() * 8);
      ctx.fillStyle = p.grass;
      ctx.fillRect(tx, ty, 1, th);
      // Lighter tip
      ctx.fillStyle = adjustColor(p.grass, 0.3);
      ctx.fillRect(tx, ty, 1, 1);
    }
  });

  // Decoration sprites (transparent background overlays)
  // Torch
  cache.deco_torch = makeTile((ctx, p) => {
    // Brown stick
    ctx.fillStyle = "#6B4226";
    ctx.fillRect(7, 8, 2, 6);
    // Flame base (orange)
    ctx.fillStyle = "#D97706";
    ctx.fillRect(6, 5, 4, 4);
    // Flame inner (yellow)
    ctx.fillStyle = "#FBBF24";
    ctx.fillRect(7, 4, 2, 3);
    // Flame tip
    ctx.fillStyle = "#FDE68A";
    ctx.fillRect(7, 3, 1, 2);
  });

  // Barrel
  cache.deco_barrel = makeTile((ctx, p) => {
    // Body
    ctx.fillStyle = "#6B4226";
    ctx.fillRect(5, 5, 6, 7);
    // Rounded top/bottom
    ctx.fillRect(6, 4, 4, 1);
    ctx.fillRect(6, 12, 4, 1);
    // Dark band
    ctx.fillStyle = "#4A2E18";
    ctx.fillRect(5, 7, 6, 1);
    ctx.fillRect(5, 10, 6, 1);
    // Highlight
    ctx.fillStyle = "#8B5A3A";
    ctx.fillRect(6, 5, 1, 7);
  });

  // Bones
  cache.deco_bones = makeTile((ctx) => {
    ctx.fillStyle = "#D4D0C8";
    // X shape
    ctx.fillRect(6, 6, 1, 1);
    ctx.fillRect(7, 7, 1, 1);
    ctx.fillRect(8, 8, 1, 1);
    ctx.fillRect(9, 9, 1, 1);
    ctx.fillRect(9, 6, 1, 1);
    ctx.fillRect(8, 7, 1, 1);
    ctx.fillRect(6, 9, 1, 1);
    ctx.fillRect(7, 8, 1, 1);
    // Small skull circle
    ctx.fillStyle = "#C8C4BC";
    ctx.fillRect(10, 10, 2, 2);
  });

  // Cobweb
  cache.deco_cobweb = makeTile((ctx) => {
    ctx.fillStyle = "rgba(200,200,200,0.5)";
    // Diagonal lines from top-left corner (5x5 triangle)
    ctx.fillRect(0, 0, 1, 5);
    ctx.fillRect(0, 0, 5, 1);
    ctx.fillRect(1, 1, 1, 1);
    ctx.fillRect(2, 2, 1, 1);
    ctx.fillRect(3, 3, 1, 1);
    ctx.fillRect(4, 4, 1, 1);
    // Cross strands
    ctx.fillRect(0, 2, 3, 1);
    ctx.fillRect(2, 0, 1, 3);
  });

  // Crack
  cache.deco_crack = makeTile((ctx, p) => {
    ctx.fillStyle = adjustColor(p.floor, -0.4);
    // Dark line pattern
    ctx.fillRect(6, 6, 1, 1);
    ctx.fillRect(7, 7, 1, 1);
    ctx.fillRect(8, 7, 1, 1);
    ctx.fillRect(9, 8, 1, 1);
    ctx.fillRect(7, 8, 1, 1);
  });

  // Rubble
  cache.deco_rubble = makeTile((ctx, p) => {
    ctx.fillStyle = adjustColor(p.wall, -0.1);
    ctx.fillRect(5, 10, 2, 2);
    ctx.fillRect(8, 9, 3, 2);
    ctx.fillRect(7, 11, 2, 2);
    ctx.fillStyle = adjustColor(p.wall, 0.1);
    ctx.fillRect(10, 11, 2, 1);
  });

  // Fog edge tiles (gradient overlays)
  for (const dir of ["Top", "Bottom", "Left", "Right"]) {
    cache[`fogEdge${dir}`] = makeTile((ctx) => {
      let grad;
      if (dir === "Top") {
        grad = ctx.createLinearGradient(0, 0, 0, 16);
        grad.addColorStop(0, "rgba(0,0,0,0.35)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
      } else if (dir === "Bottom") {
        grad = ctx.createLinearGradient(0, 0, 0, 16);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, "rgba(0,0,0,0.35)");
      } else if (dir === "Left") {
        grad = ctx.createLinearGradient(0, 0, 16, 0);
        grad.addColorStop(0, "rgba(0,0,0,0.35)");
        grad.addColorStop(1, "rgba(0,0,0,0)");
      } else {
        grad = ctx.createLinearGradient(0, 0, 16, 0);
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, "rgba(0,0,0,0.35)");
      }
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 16, 16);
    });
  }

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
