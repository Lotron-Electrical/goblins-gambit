/**
 * StoryMenuScreen — entry point for story mode.
 * New Run / Continue / Trophy Cabinet.
 */

import { useEffect } from "react";
import { useStoryStore } from "../../storyStore.js";
import { useStore } from "../../store.js";

export default function StoryMenuScreen() {
  const { setStoryScreen, loadRun, fetchTrophies, hasSavedRun, storyError, clearStoryError, trophyCards } = useStoryStore();
  const { setScreen } = useStore();

  useEffect(() => {
    fetchTrophies();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-950 via-amber-950/20 to-gray-950 relative overflow-hidden">
      {/* Atmospheric background particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-amber-600/5 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/3 right-1/4 w-48 h-48 bg-red-600/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-amber-500/3 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      {/* Decorative top border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-600/60 to-transparent" />

      <div className="relative z-10 flex flex-col items-center">
        {/* Goblin emblem */}
        <div className="text-5xl mb-4 drop-shadow-[0_0_20px_rgba(217,119,6,0.4)]">
          {"\uD83D\uDC7A"}
        </div>

        <h1 className="text-5xl md:text-6xl font-display text-transparent bg-clip-text bg-gradient-to-b from-amber-300 via-amber-400 to-amber-600 drop-shadow-[0_0_40px_rgba(217,119,6,0.6)] mb-2 tracking-wide">
          Story Mode
        </h1>
        <div className="w-48 h-px bg-gradient-to-r from-transparent via-amber-500/60 to-transparent mb-2" />
        <p className="text-amber-700/80 text-sm mb-10 italic tracking-wider">
          A roguelike adventure through the goblin realms
        </p>

        {storyError && (
          <div className="bg-red-900/50 border border-red-500/60 text-red-200 px-4 py-2 rounded-lg mb-4 text-sm backdrop-blur-sm">
            {storyError}
            <button onClick={clearStoryError} className="ml-3 text-red-400 hover:text-white font-bold">X</button>
          </div>
        )}

        <div className="w-full max-w-sm space-y-3">
          {/* New Run - primary CTA */}
          <button
            onClick={() => setStoryScreen("creation")}
            className="group w-full bg-gradient-to-r from-amber-700 to-red-800 hover:from-amber-600 hover:to-red-700 text-white font-bold py-4 rounded-xl transition-all text-lg border border-amber-500/30 shadow-lg shadow-amber-900/30 hover:shadow-amber-800/50 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="flex items-center justify-center gap-3">
              <span className="text-xl opacity-80 group-hover:opacity-100 transition-opacity">{"\u2694\uFE0F"}</span>
              New Run
            </span>
          </button>

          {/* Continue Run */}
          {hasSavedRun && (
            <button
              onClick={loadRun}
              className="group w-full bg-gray-800/80 hover:bg-gray-700/80 text-white font-bold py-4 rounded-xl transition-all text-lg border border-gray-600/50 backdrop-blur-sm hover:border-amber-600/30 hover:scale-[1.02] active:scale-[0.98]"
            >
              <span className="flex items-center justify-center gap-3">
                <span className="text-xl opacity-60 group-hover:opacity-100 transition-opacity">{"\uD83D\uDDFA\uFE0F"}</span>
                Continue Run
              </span>
            </button>
          )}

          {/* Trophy Cabinet */}
          <button
            onClick={() => {
              fetchTrophies();
              setStoryScreen("trophies");
            }}
            className="group w-full bg-gray-800/80 hover:bg-gray-700/80 text-amber-300 font-bold py-4 rounded-xl transition-all text-lg border border-amber-700/30 backdrop-blur-sm hover:border-amber-500/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            <span className="flex items-center justify-center gap-3">
              <span className="text-xl opacity-70 group-hover:opacity-100 transition-opacity">{"\uD83C\uDFC6"}</span>
              Trophy Cabinet
              {trophyCards.length > 0 && (
                <span className="text-xs bg-amber-600/30 text-amber-300 px-2 py-0.5 rounded-full">{trophyCards.length}</span>
              )}
            </span>
          </button>

          {/* Back */}
          <button
            onClick={() => setScreen("lobby")}
            className="w-full bg-transparent hover:bg-gray-800/40 text-gray-500 hover:text-gray-300 font-bold py-3 rounded-xl transition-all text-sm border border-transparent hover:border-gray-700/30"
          >
            Back to Lobby
          </button>
        </div>

        {/* Journey overview */}
        <div className="mt-10 max-w-md">
          <div className="flex items-center justify-center gap-1 text-xs">
            {[
              { name: "Tavern", color: "text-amber-600" },
              { name: "Hills", color: "text-green-600" },
              { name: "Swamp", color: "text-emerald-700" },
              { name: "Tundra", color: "text-blue-400" },
              { name: "Cliffs", color: "text-stone-400" },
              { name: "Volcano", color: "text-red-500" },
            ].map((level, i) => (
              <span key={level.name} className="flex items-center gap-1">
                <span className={`${level.color} font-medium`}>{level.name}</span>
                {i < 5 && <span className="text-gray-700 mx-0.5">{"\u203A"}</span>}
              </span>
            ))}
          </div>
          <p className="text-gray-600 text-[11px] text-center mt-2 leading-relaxed">
            Create a custom creature card, battle through 6 themed levels, choose upgrades, survive with 3 lives.
          </p>
        </div>
      </div>
    </div>
  );
}
