/**
 * DungeonScreen — main React component for the pixel dungeon crawler map.
 * Canvas rendering, input handling, game loop, HUD overlay.
 */

import { useRef, useEffect, useCallback, useState } from "react";
import { useStoryStore } from "../../../storyStore.js";
import {
  STORY_LEVELS,
  STORY_LEVEL_CONFIG,
} from "../../../../../shared/src/constants.js";
import { generateDungeon, TILE } from "./dungeonGenerator.js";
import { TILE_SIZE, generateTileCache } from "./tilesets.js";
import {
  renderDungeon,
  pixelToTile,
  computeVisibleTiles,
} from "./dungeonRenderer.js";
import { generateGoblinSprites } from "./playerSprite.js";
import { findPath } from "./pathfinding.js";

const MOVE_SPEED = 120; // ms per tile step
const VISIBILITY_RADIUS = 4;
const BASE_W = 640;
const BASE_H = 480;

export default function DungeonScreen() {
  const {
    storyRun,
    currentMap,
    selectNode,
    saveRun,
    setStoryScreen,
    storyLoading,
  } = useStoryStore();

  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const frameRef = useRef(0);

  // Dungeon state (refs for render loop, state for React HUD)
  const gridRef = useRef(null);
  const tileCacheRef = useRef(null);
  const spritesRef = useRef(null);
  const playerPosRef = useRef({ x: 0, y: 0 });
  const playerFacingRef = useRef("down");
  const walkFrameRef = useRef(0);
  const revealedRef = useRef(new Set());
  const isMovingRef = useRef(false);
  const pathRef = useRef(null);
  const pathIdxRef = useRef(0);
  const lastMoveTime = useRef(0);
  const showStairsRef = useRef(false);
  const scaleRef = useRef(2);
  const [hudUpdate, setHudUpdate] = useState(0); // trigger re-render for HUD

  // Track if encounter was triggered to prevent double-fire
  const encounterTriggeredRef = useRef(false);

  // Refs to avoid stale closures in game loop
  const selectableNodesRef = useRef(new Set());
  const selectNodeRef = useRef(selectNode);

  // Level transition state
  const [transitioning, setTransitioning] = useState(false);
  const [fadeOpacity, setFadeOpacity] = useState(0);
  const prevLevelRef = useRef(null);

  // Loading guard
  if (!storyRun || !currentMap) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500/40 border-t-amber-400 rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">Loading dungeon...</span>
        </div>
      </div>
    );
  }

  const levelKey = STORY_LEVELS[storyRun.currentLevelIndex];
  const levelConfig = STORY_LEVEL_CONFIG[levelKey];

  // Compute selectable nodes (same logic as StoryMapScreen)
  const selectableNodes = new Set();
  let highestCompletedRow = -1;
  for (const rows of currentMap.rows) {
    for (const node of rows) {
      if (node.completed && node.row > highestCompletedRow) {
        highestCompletedRow = node.row;
      }
    }
  }
  if (highestCompletedRow === -1) {
    if (currentMap.rows[0]) {
      for (const node of currentMap.rows[0]) {
        if (!node.completed) selectableNodes.add(node.id);
      }
    }
  } else {
    for (const rows of currentMap.rows) {
      for (const node of rows) {
        if (node.completed) {
          for (const connId of node.connections) {
            const connNode = currentMap.nodes[connId];
            if (
              connNode &&
              !connNode.completed &&
              connNode.row >= highestCompletedRow
            ) {
              selectableNodes.add(connId);
            }
          }
        }
      }
    }
  }

  const completedNodes = new Set();
  for (const rows of currentMap.rows) {
    for (const node of rows) {
      if (node.completed) completedNodes.add(node.id);
    }
  }

  // Keep refs in sync so the game loop always sees current values
  selectableNodesRef.current = selectableNodes;
  selectNodeRef.current = selectNode;

  // Check if boss is completed (show stairs)
  const bossRow = currentMap.rows[currentMap.rows.length - 1];
  const bossCompleted = bossRow && bossRow[0] && bossRow[0].completed;

  // Build locked doors set — doors belonging to non-selectable, non-completed rooms
  const getLockedDoors = useCallback((grid, sNodes, cNodes) => {
    const locked = new Set();
    if (!grid) return locked;

    const lockedNodeIds = new Set();
    for (const room of grid.rooms) {
      if (!sNodes.has(room.nodeId) && !cNodes.has(room.nodeId)) {
        lockedNodeIds.add(room.nodeId);
      }
    }

    for (const dp of grid.doorPositions) {
      if (dp.roomNodeId && lockedNodeIds.has(dp.roomNodeId)) {
        locked.add(`${dp.x},${dp.y}`);
      }
    }
    return locked;
  }, []);

  // Initialize / regenerate dungeon
  useEffect(() => {
    const seed =
      (storyRun.dungeonSeed || 42) + storyRun.currentLevelIndex * 1000;

    // Detect level change for transition effect
    if (
      prevLevelRef.current !== null &&
      prevLevelRef.current !== storyRun.currentLevelIndex
    ) {
      // Level transition
      setTransitioning(true);
      setFadeOpacity(1);
      setTimeout(() => {
        buildDungeon(seed);
        setFadeOpacity(0);
        setTimeout(() => setTransitioning(false), 500);
      }, 500);
    } else {
      buildDungeon(seed);
    }
    prevLevelRef.current = storyRun.currentLevelIndex;

    function buildDungeon(s) {
      const grid = generateDungeon(
        currentMap,
        s,
        completedNodes,
        selectableNodes,
      );
      gridRef.current = grid;
      tileCacheRef.current = generateTileCache(levelKey, s);
      spritesRef.current = generateGoblinSprites();
      showStairsRef.current = bossCompleted;
      encounterTriggeredRef.current = false;

      // Restore player to last completed room center, or spawn point
      let spawnPos = grid.playerSpawn;
      const lastCompleted =
        storyRun.completedNodes?.[storyRun.completedNodes.length - 1];
      if (lastCompleted) {
        const room = grid.rooms.find((r) => r.nodeId === lastCompleted);
        if (room) spawnPos = { x: room.cx, y: room.cy };
      }

      playerPosRef.current = { ...spawnPos };
      playerFacingRef.current = "up";
      isMovingRef.current = false;
      pathRef.current = null;

      // Initial reveal
      revealedRef.current = new Set();
      const visible = computeVisibleTiles(
        spawnPos.x,
        spawnPos.y,
        VISIBILITY_RADIUS,
        grid.width,
        grid.height,
      );
      for (const k of visible) revealedRef.current.add(k);

      setHudUpdate((n) => n + 1);
    }
  }, [currentMap, storyRun.currentLevelIndex, storyRun.dungeonSeed]);

  // Canvas sizing
  useEffect(() => {
    function resize() {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const parent = canvas.parentElement;
      const pw = parent.clientWidth;
      const ph = parent.clientHeight;

      // Fit 4:3 aspect ratio
      const ratio = BASE_W / BASE_H;
      let w, h;
      if (pw / ph > ratio) {
        h = ph;
        w = h * ratio;
      } else {
        w = pw;
        h = w / ratio;
      }

      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      canvas.style.width = `${Math.round(w)}px`;
      canvas.style.height = `${Math.round(h)}px`;

      // Scale so tiles fill the canvas nicely
      scaleRef.current = canvas.width / BASE_W;
    }

    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Game loop
  useEffect(() => {
    let running = true;

    function gameLoop(time) {
      if (!running) return;
      frameRef.current++;

      // Process movement
      if (isMovingRef.current && pathRef.current) {
        if (time - lastMoveTime.current >= MOVE_SPEED) {
          pathIdxRef.current++;
          if (pathIdxRef.current >= pathRef.current.length) {
            // Movement complete
            isMovingRef.current = false;
            pathRef.current = null;
            walkFrameRef.current = 0;

            // Check room entry
            checkRoomEntry();
          } else {
            const next = pathRef.current[pathIdxRef.current];
            const prev = playerPosRef.current;

            // Update facing
            if (next.x > prev.x) playerFacingRef.current = "right";
            else if (next.x < prev.x) playerFacingRef.current = "left";
            else if (next.y > prev.y) playerFacingRef.current = "down";
            else if (next.y < prev.y) playerFacingRef.current = "up";

            playerPosRef.current = { ...next };
            walkFrameRef.current = pathIdxRef.current % 2;
            lastMoveTime.current = time;

            // Update fog
            const visible = computeVisibleTiles(
              next.x,
              next.y,
              VISIBILITY_RADIUS,
              gridRef.current.width,
              gridRef.current.height,
            );
            for (const k of visible) revealedRef.current.add(k);
          }
        }
      } else {
        // Idle bob (subtle)
        walkFrameRef.current =
          Math.floor(frameRef.current / 24) % 2 === 0 ? 0 : 0;
      }

      // Render
      const canvas = canvasRef.current;
      if (canvas && gridRef.current && tileCacheRef.current) {
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = false;

        renderDungeon(ctx, {
          dungeonGrid: gridRef.current,
          tileCache: tileCacheRef.current,
          goblinSprites: spritesRef.current,
          playerPos: playerPosRef.current,
          playerFacing: playerFacingRef.current,
          walkFrame: walkFrameRef.current,
          revealedTiles: revealedRef.current,
          levelKey,
          frame: frameRef.current,
          showStairs: showStairsRef.current,
          canvasWidth: canvas.width,
          canvasHeight: canvas.height,
          scale: scaleRef.current,
        });
      }

      animRef.current = requestAnimationFrame(gameLoop);
    }

    animRef.current = requestAnimationFrame(gameLoop);

    return () => {
      running = false;
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [levelKey]);

  // Check if player is at a room center
  function checkRoomEntry() {
    if (!gridRef.current || encounterTriggeredRef.current) return;

    const pos = playerPosRef.current;
    const room = gridRef.current.rooms.find(
      (r) => r.cx === pos.x && r.cy === pos.y,
    );

    if (!room || room.completed) return;

    if (selectableNodesRef.current.has(room.nodeId)) {
      encounterTriggeredRef.current = true;
      selectNodeRef.current(room.nodeId);
    }

    // Check stairs
    if (showStairsRef.current) {
      const sp = gridRef.current.stairsPos;
      if (pos.x === sp.x && pos.y === sp.y) {
        // Level transition handled by server via next_level battle result
      }
    }
  }

  // Handle click/tap
  const handleCanvasClick = useCallback(
    (e) => {
      if (isMovingRef.current || storyLoading || !gridRef.current) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const canvasX = (e.clientX - rect.left) * dpr;
      const canvasY = (e.clientY - rect.top) * dpr;

      const tile = pixelToTile(
        canvasX,
        canvasY,
        playerPosRef.current,
        scaleRef.current,
        canvas.width,
        canvas.height,
        gridRef.current,
      );

      // Clamp to grid
      const tx = Math.max(0, Math.min(gridRef.current.width - 1, tile.x));
      const ty = Math.max(0, Math.min(gridRef.current.height - 1, tile.y));

      // If clicking inside a room, target the room center
      let targetX = tx;
      let targetY = ty;
      const clickedRoom = gridRef.current.rooms.find(
        (r) => tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h,
      );
      if (clickedRoom) {
        targetX = clickedRoom.cx;
        targetY = clickedRoom.cy;
      }

      // Build locked doors set
      const lockedDoors = getLockedDoors(
        gridRef.current,
        selectableNodes,
        completedNodes,
      );

      const path = findPath(
        gridRef.current,
        playerPosRef.current,
        { x: targetX, y: targetY },
        lockedDoors,
      );

      if (path && path.length > 1) {
        pathRef.current = path;
        pathIdxRef.current = 0;
        isMovingRef.current = true;
        lastMoveTime.current = performance.now();
        encounterTriggeredRef.current = false;
      }
    },
    [storyLoading, selectableNodes, completedNodes, getLockedDoors, selectNode],
  );

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-950 relative overflow-hidden">
      {/* Canvas container */}
      <div
        className="flex-1 w-full flex items-center justify-center relative"
        style={{ minHeight: 0 }}
      >
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          className="cursor-pointer"
          style={{
            imageRendering: "pixelated",
            maxWidth: "100%",
            maxHeight: "calc(100vh - 160px)",
          }}
        />

        {/* Level transition fade overlay */}
        {transitioning && (
          <div
            className="absolute inset-0 bg-black pointer-events-none z-20"
            style={{
              opacity: fadeOpacity,
              transition: "opacity 500ms ease-in-out",
            }}
          />
        )}
      </div>

      {/* HUD overlay */}
      <div className="w-full max-w-lg px-4 py-3 relative z-10">
        {/* Header row */}
        <div className="flex items-start justify-between mb-2">
          {/* Level info */}
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-0.5">
              Level {storyRun.currentLevelIndex + 1} of {STORY_LEVELS.length}
            </div>
            <h2 className="text-xl font-display text-amber-400 drop-shadow-[0_0_20px_rgba(217,119,6,0.3)]">
              {levelConfig?.name || "Unknown"}
            </h2>
            {/* Lives */}
            <div className="flex items-center gap-1 mt-1">
              {Array.from({ length: storyRun.nightmare ? 2 : 3 }).map(
                (_, i) => (
                  <span
                    key={i}
                    className={`text-lg transition-all ${
                      i < storyRun.lives
                        ? "text-red-500 drop-shadow-[0_0_6px_rgba(239,68,68,0.6)]"
                        : "text-gray-700"
                    }`}
                  >
                    {"\u2665"}
                  </span>
                ),
              )}
              {storyRun.nightmare && (
                <span className="text-[10px] text-red-400/70 ml-1 font-bold uppercase tracking-wider">
                  Nightmare
                </span>
              )}
            </div>
          </div>

          {/* Creature card */}
          <div className="bg-gray-900/80 border border-amber-600/30 rounded-xl px-3 py-2 backdrop-blur-sm">
            <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">
              Your Creature
            </div>
            <div className="text-sm text-amber-300 font-bold">
              {storyRun.customCard.name}
            </div>
            <div className="flex gap-2 mt-1 text-[11px]">
              <span className="text-red-400 font-medium">
                {storyRun.customCard.attack}
              </span>
              <span className="text-gray-600">/</span>
              <span className="text-blue-400 font-medium">
                {storyRun.customCard.defence}
              </span>
              <span className="text-gray-600">/</span>
              <span className="text-yellow-400 font-medium">
                {storyRun.customCard.sp}
              </span>
            </div>
          </div>
        </div>

        {/* Level progress bar */}
        <div className="mb-3">
          <div className="flex justify-between text-[10px] text-gray-600 mb-1">
            {STORY_LEVELS.map((lvl, i) => (
              <span
                key={lvl}
                className={`${
                  i < storyRun.currentLevelIndex
                    ? "text-amber-600"
                    : i === storyRun.currentLevelIndex
                      ? "text-amber-400 font-bold"
                      : "text-gray-700"
                }`}
              >
                {i + 1}
              </span>
            ))}
          </div>
          <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-600 to-amber-400 rounded-full transition-all duration-700"
              style={{
                width: `${(storyRun.currentLevelIndex / STORY_LEVELS.length) * 100}%`,
              }}
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => saveRun()}
            className="bg-gray-800/80 hover:bg-gray-700/80 text-gray-300 font-bold py-2 px-4 rounded-xl transition-all text-sm border border-gray-700/40 backdrop-blur-sm hover:border-gray-600/60"
          >
            Save & Quit
          </button>
          <button
            onClick={() => setStoryScreen("menu")}
            className="bg-transparent hover:bg-gray-800/40 text-gray-600 hover:text-gray-400 py-2 px-4 rounded-xl transition-all text-sm border border-transparent hover:border-gray-700/30"
          >
            Abandon Run
          </button>
        </div>
      </div>

      {/* Loading overlay */}
      {storyLoading && (
        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-30">
          <div className="w-8 h-8 border-2 border-amber-500/40 border-t-amber-400 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
