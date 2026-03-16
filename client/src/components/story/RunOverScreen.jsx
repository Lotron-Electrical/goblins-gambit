/**
 * RunOverScreen — victory or defeat screen with run stats.
 */

import { useStoryStore } from "../../storyStore.js";
import { useStore } from "../../store.js";

export default function RunOverScreen() {
  const { runResult, returnToMenu, fetchTrophies, setStoryScreen } = useStoryStore();
  const { setScreen } = useStore();

  if (!runResult) return null;

  const { victory, run } = runResult;

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden ${
      victory
        ? "bg-gradient-to-b from-gray-950 via-amber-950/30 to-gray-950"
        : "bg-gradient-to-b from-gray-950 via-red-950/30 to-gray-950"
    }`}>
      {/* Atmospheric effects */}
      <div className="absolute inset-0 pointer-events-none">
        {victory ? (
          <>
            <div className="absolute top-1/4 left-1/3 w-72 h-72 bg-amber-500/8 rounded-full blur-3xl animate-pulse" />
            <div className="absolute top-1/3 right-1/4 w-56 h-56 bg-yellow-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
            <div className="absolute bottom-1/3 left-1/2 w-80 h-80 bg-amber-400/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "2s" }} />
          </>
        ) : (
          <>
            <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-red-600/8 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/3 right-1/3 w-48 h-48 bg-red-800/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1.5s" }} />
          </>
        )}
      </div>

      {/* Decorative lines */}
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent ${
        victory ? "via-amber-500/60" : "via-red-500/40"
      } to-transparent`} />

      <div className="relative z-10 flex flex-col items-center w-full max-w-md">
        {/* Big icon */}
        <div className={`text-6xl mb-4 ${
          victory
            ? "drop-shadow-[0_0_30px_rgba(251,191,36,0.5)]"
            : "drop-shadow-[0_0_20px_rgba(239,68,68,0.4)]"
        }`}>
          {victory ? "\uD83C\uDFC6" : "\uD83D\uDC80"}
        </div>

        {/* Title */}
        <h1 className={`text-5xl md:text-6xl font-display mb-2 tracking-wide ${
          victory
            ? "text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-amber-400 to-amber-600 drop-shadow-[0_0_40px_rgba(217,119,6,0.5)]"
            : "text-transparent bg-clip-text bg-gradient-to-b from-red-400 via-red-500 to-red-700"
        }`}>
          {victory ? "Victory!" : "Defeated"}
        </h1>

        <div className={`w-40 h-px mb-3 bg-gradient-to-r from-transparent ${
          victory ? "via-amber-500/50" : "via-red-500/30"
        } to-transparent`} />

        <p className="text-gray-400 text-lg mb-8 italic">
          {victory
            ? "You conquered all six realms!"
            : "Your adventure has ended..."}
        </p>

        {/* Run stats card */}
        <div className={`w-full bg-gray-900/80 border rounded-2xl p-6 mb-6 backdrop-blur-sm ${
          victory ? "border-amber-600/30" : "border-gray-700/50"
        }`}>
          <h3 className={`font-display text-lg mb-4 pb-2 border-b ${
            victory
              ? "text-amber-400 border-amber-700/30"
              : "text-gray-400 border-gray-700/50"
          }`}>Run Summary</h3>

          <div className="space-y-3">
            {[
              { label: "Battles Won", value: run.stats.battlesWon, color: "text-green-400", icon: "\u2694\uFE0F" },
              { label: "Battles Lost", value: run.stats.battlesLost, color: "text-red-400", icon: "\uD83D\uDCA5" },
              { label: "Levels Cleared", value: run.stats.levelsCompleted, color: "text-blue-300", icon: "\uD83C\uDFF0" },
              { label: "Enhancements", value: run.stats.enhancementsPicked, color: "text-emerald-400", icon: "\u2B50" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-gray-400">
                  <span className="text-base opacity-70">{stat.icon}</span>
                  {stat.label}
                </span>
                <span className={`${stat.color} font-bold text-lg tabular-nums`}>{stat.value}</span>
              </div>
            ))}
          </div>

          {/* Final card showcase */}
          <div className={`mt-4 pt-4 border-t ${victory ? "border-amber-700/30" : "border-gray-700/40"}`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Final Card</div>
                <div className="text-amber-300 font-bold text-base">{run.customCard.name}</div>
              </div>
              <div className="flex gap-3 text-sm">
                <div className="text-center">
                  <div className="text-[10px] text-red-400/70">ATK</div>
                  <div className="text-red-400 font-bold">{run.customCard.attack}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-blue-400/70">DEF</div>
                  <div className="text-blue-400 font-bold">{run.customCard.defence}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-yellow-400/70">SP</div>
                  <div className="text-yellow-400 font-bold">{run.customCard.sp}</div>
                </div>
              </div>
            </div>
          </div>

          {run.nightmare && (
            <div className="mt-3 flex items-center justify-center gap-2 bg-red-900/30 border border-red-500/30 rounded-lg py-1.5">
              <span className="text-sm">{"\uD83D\uDD25"}</span>
              <span className="text-red-400 text-xs font-bold uppercase tracking-wider">Nightmare Mode</span>
            </div>
          )}
        </div>

        {victory && (
          <div className="flex items-center gap-2 text-amber-400/80 text-sm mb-6 bg-amber-900/20 border border-amber-600/20 rounded-xl px-4 py-2">
            <span>{"\uD83C\uDFC6"}</span>
            <span>Your creature has been immortalized in the Trophy Cabinet!</span>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap justify-center gap-3">
          <button
            onClick={returnToMenu}
            className="bg-gradient-to-r from-amber-700 to-red-800 hover:from-amber-600 hover:to-red-700 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-amber-900/20 hover:shadow-amber-800/40 hover:scale-[1.02] active:scale-[0.98]"
          >
            Play Again
          </button>
          {victory && (
            <button
              onClick={() => { fetchTrophies(); setStoryScreen("trophies"); }}
              className="bg-gray-800/80 hover:bg-gray-700/80 text-amber-300 font-bold py-3 px-6 rounded-xl transition-all border border-amber-700/30 hover:border-amber-600/50 backdrop-blur-sm hover:scale-[1.02] active:scale-[0.98]"
            >
              View Trophies
            </button>
          )}
          <button
            onClick={() => { returnToMenu(); setScreen("lobby"); }}
            className="bg-transparent hover:bg-gray-800/40 text-gray-500 hover:text-gray-300 py-3 px-6 rounded-xl transition-all text-sm border border-transparent hover:border-gray-700/30"
          >
            Back to Lobby
          </button>
        </div>
      </div>
    </div>
  );
}
