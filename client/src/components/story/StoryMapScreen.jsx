/**
 * StoryMapScreen — branching node map with fog of war and connection lines.
 */

import { useStoryStore } from "../../storyStore.js";
import {
  STORY_LEVELS,
  STORY_LEVEL_CONFIG,
} from "../../../../shared/src/constants.js";

/** Per-level theme colors for the map background and accents */
const LEVEL_THEMES = {
  tavern: {
    bg: "from-gray-950 via-amber-950/20 to-gray-950",
    accent: "amber",
    glow: "rgba(217,119,6,0.08)",
  },
  hills: {
    bg: "from-gray-950 via-green-950/20 to-gray-950",
    accent: "green",
    glow: "rgba(34,197,94,0.06)",
  },
  swamp: {
    bg: "from-gray-950 via-emerald-950/25 to-gray-950",
    accent: "emerald",
    glow: "rgba(16,185,129,0.08)",
  },
  tundra: {
    bg: "from-gray-950 via-blue-950/20 to-gray-950",
    accent: "blue",
    glow: "rgba(59,130,246,0.06)",
  },
  cliffs: {
    bg: "from-gray-950 via-stone-900/30 to-gray-950",
    accent: "stone",
    glow: "rgba(168,162,158,0.06)",
  },
  volcano: {
    bg: "from-gray-950 via-red-950/25 to-gray-950",
    accent: "red",
    glow: "rgba(239,68,68,0.08)",
  },
};

export default function StoryMapScreen() {
  const {
    storyRun,
    currentMap,
    selectNode,
    saveRun,
    setStoryScreen,
    storyLoading,
  } = useStoryStore();

  if (!storyRun || !currentMap) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-amber-500/40 border-t-amber-400 rounded-full animate-spin" />
          <span className="text-gray-500 text-sm">Loading map...</span>
        </div>
      </div>
    );
  }

  const levelKey = STORY_LEVELS[storyRun.currentLevelIndex];
  const levelConfig = STORY_LEVEL_CONFIG[levelKey];
  const theme = LEVEL_THEMES[levelKey] || LEVEL_THEMES.tavern;

  // Determine which nodes are selectable
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

  const nodeTypeIcon = (type) => {
    switch (type) {
      case "battle":
        return "\u2694\uFE0F";
      case "boss":
        return "\uD83D\uDC80";
      case "enhancement":
        return "\u2B50";
      default:
        return "?";
    }
  };

  const nodeTypeLabel = (type) => {
    switch (type) {
      case "battle":
        return "Battle";
      case "boss":
        return "BOSS";
      case "enhancement":
        return "Upgrade";
      default:
        return "";
    }
  };

  const nodeBaseStyles = (type) => {
    switch (type) {
      case "battle":
        return {
          border: "border-red-500/70",
          bg: "bg-gradient-to-b from-red-900/40 to-red-950/60",
          glow: "shadow-red-500/20",
        };
      case "boss":
        return {
          border: "border-amber-400/80",
          bg: "bg-gradient-to-b from-amber-900/40 to-amber-950/60",
          glow: "shadow-amber-400/30",
        };
      case "enhancement":
        return {
          border: "border-green-500/70",
          bg: "bg-gradient-to-b from-green-900/40 to-green-950/60",
          glow: "shadow-green-500/20",
        };
      default:
        return {
          border: "border-gray-600",
          bg: "bg-gray-800",
          glow: "",
        };
    }
  };

  // Build node position lookup for SVG lines
  // Each row is centered horizontally; nodes are ~80px wide with 16px gap
  const nodeWidth = 72;
  const nodeGap = 20;
  const rowGap = 80;
  const mapWidth = 400;

  const getNodeCenter = (node, rowLength) => {
    const totalRowWidth = rowLength * nodeWidth + (rowLength - 1) * nodeGap;
    const startX = (mapWidth - totalRowWidth) / 2;
    const colIdx = currentMap.rows[node.row].indexOf(node);
    const x = startX + colIdx * (nodeWidth + nodeGap) + nodeWidth / 2;
    const y = node.row * rowGap + nodeWidth / 2;
    return { x, y };
  };

  // Collect all connection lines
  const connectionLines = [];
  for (const rows of currentMap.rows) {
    for (const node of rows) {
      if (!node.connections) continue;
      const fromPos = getNodeCenter(node, rows.length);
      for (const connId of node.connections) {
        const connNode = currentMap.nodes[connId];
        if (!connNode) continue;
        const connRow = currentMap.rows[connNode.row];
        const toPos = getNodeCenter(connNode, connRow ? connRow.length : 1);
        const bothCompleted = node.completed && connNode.completed;
        const isActive = node.completed && selectableNodes.has(connId);
        connectionLines.push({
          key: `${node.id}-${connId}`,
          x1: fromPos.x,
          y1: fromPos.y,
          x2: toPos.x,
          y2: toPos.y,
          completed: bothCompleted,
          active: isActive,
        });
      }
    }
  }

  const svgHeight = currentMap.rows.length * rowGap;

  return (
    <div
      className={`min-h-screen flex flex-col items-center p-4 bg-gradient-to-b ${theme.bg} relative overflow-hidden`}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-3xl animate-pulse"
          style={{ background: theme.glow }}
        />
      </div>

      {/* Header */}
      <div className="relative z-10 w-full max-w-lg mb-6">
        <div className="flex items-start justify-between">
          {/* Level info */}
          <div>
            <div className="text-xs text-gray-500 uppercase tracking-widest mb-0.5">
              Level {storyRun.currentLevelIndex + 1} of {STORY_LEVELS.length}
            </div>
            <h2 className="text-2xl font-display text-amber-400 drop-shadow-[0_0_20px_rgba(217,119,6,0.3)]">
              {levelConfig?.name || "Unknown"}
            </h2>
            {/* Lives display */}
            <div className="flex items-center gap-1 mt-1.5">
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

          {/* Custom card mini display */}
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
        <div className="mt-3 w-full">
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
      </div>

      {/* Map with SVG connection lines */}
      <div
        className="relative z-10 w-full max-w-lg"
        style={{ minHeight: svgHeight }}
      >
        {/* SVG layer for connection lines */}
        <svg
          className="absolute inset-0 pointer-events-none"
          width={mapWidth}
          height={svgHeight}
          viewBox={`0 0 ${mapWidth} ${svgHeight}`}
          style={{ left: "50%", transform: "translateX(-50%)" }}
        >
          {connectionLines.map((line) => (
            <line
              key={line.key}
              x1={line.x1}
              y1={line.y1}
              x2={line.x2}
              y2={line.y2}
              stroke={
                line.completed
                  ? "rgba(34,197,94,0.4)"
                  : line.active
                    ? "rgba(251,191,36,0.5)"
                    : "rgba(75,85,99,0.25)"
              }
              strokeWidth={line.active ? 2.5 : 1.5}
              strokeDasharray={line.completed || line.active ? "none" : "4 4"}
            />
          ))}
        </svg>

        {/* Node rows */}
        <div className="relative z-10 space-y-4" style={{ paddingTop: 0 }}>
          {currentMap.rows.map((row, rowIdx) => (
            <div
              key={rowIdx}
              className="flex justify-center gap-5"
              style={{ height: `${rowGap}px`, alignItems: "center" }}
            >
              {row.map((node) => {
                const isSelectable = selectableNodes.has(node.id);
                const isRevealed = node.revealed;
                const isCompleted = node.completed;
                const styles = nodeBaseStyles(node.type);

                return (
                  <button
                    key={node.id}
                    onClick={() =>
                      isSelectable && !storyLoading && selectNode(node.id)
                    }
                    disabled={!isSelectable || storyLoading}
                    className={`relative flex flex-col items-center justify-center transition-all duration-300 rounded-xl border-2 ${
                      isCompleted
                        ? "border-green-700/50 bg-gray-900/60 opacity-60 w-[72px] h-[72px]"
                        : isSelectable
                          ? `${styles.border} ${styles.bg} w-[72px] h-[72px] hover:scale-110 cursor-pointer shadow-lg ${styles.glow} ring-2 ring-amber-400/40`
                          : isRevealed
                            ? `${styles.border} ${styles.bg} opacity-40 w-[72px] h-[72px]`
                            : "border-gray-700/40 bg-gray-900/30 opacity-20 w-[72px] h-[72px]"
                    }`}
                  >
                    {/* Selectable pulse ring */}
                    {isSelectable && (
                      <span
                        className="absolute inset-0 rounded-xl border-2 border-amber-400/30 animate-ping"
                        style={{ animationDuration: "2s" }}
                      />
                    )}

                    {isRevealed || isCompleted ? (
                      <>
                        <span
                          className={`text-xl ${isCompleted ? "grayscale opacity-60" : ""}`}
                        >
                          {nodeTypeIcon(node.type)}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider mt-0.5 ${
                            isCompleted ? "text-green-600" : "text-gray-500"
                          }`}
                        >
                          {isCompleted
                            ? "\u2713 Done"
                            : nodeTypeLabel(node.type)}
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="text-gray-700 text-xl">?</span>
                        <span className="text-[9px] text-gray-700">
                          Unknown
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Bottom actions */}
      <div className="relative z-10 mt-8 flex gap-3">
        <button
          onClick={() => saveRun()}
          className="bg-gray-800/80 hover:bg-gray-700/80 text-gray-300 font-bold py-2.5 px-5 rounded-xl transition-all text-sm border border-gray-700/40 backdrop-blur-sm hover:border-gray-600/60"
        >
          Save & Quit
        </button>
        <button
          onClick={() => setStoryScreen("menu")}
          className="bg-transparent hover:bg-gray-800/40 text-gray-600 hover:text-gray-400 py-2.5 px-5 rounded-xl transition-all text-sm border border-transparent hover:border-gray-700/30"
        >
          Abandon Run
        </button>
      </div>
    </div>
  );
}
