/**
 * TrophyCabinetScreen — displays past trophy cards from completed runs.
 */

import { useEffect } from "react";
import { useStoryStore } from "../../storyStore.js";

export default function TrophyCabinetScreen() {
  const { trophyCards, achievements, fetchTrophies, setStoryScreen } =
    useStoryStore();

  useEffect(() => {
    fetchTrophies();
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center p-4 bg-gradient-to-b from-gray-950 via-amber-950/10 to-gray-950 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl animate-pulse" />
      </div>

      {/* Top border */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-600/50 to-transparent" />

      <div className="relative z-10 flex flex-col items-center w-full">
        {/* Header */}
        <div className="text-4xl mb-3 drop-shadow-[0_0_20px_rgba(251,191,36,0.4)]">
          {"\uD83C\uDFC6"}
        </div>
        <h2 className="text-3xl md:text-4xl font-display text-transparent bg-clip-text bg-gradient-to-b from-amber-300 to-amber-500 mb-1">
          Trophy Cabinet
        </h2>
        <div className="w-32 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent mb-2" />
        <p className="text-gray-600 text-sm mb-8">
          {trophyCards.length === 0
            ? "Your victories will be displayed here"
            : `${trophyCards.length} ${trophyCards.length === 1 ? "trophy" : "trophies"} collected`}
        </p>

        {trophyCards.length === 0 ? (
          <div className="flex flex-col items-center mt-8">
            <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-gray-700/50 flex items-center justify-center mb-4">
              <span className="text-3xl text-gray-700">{"\uD83C\uDFC6"}</span>
            </div>
            <p className="text-gray-500 text-center max-w-xs leading-relaxed">
              Complete a story run to earn your first trophy! Your victorious
              creatures will be immortalized here.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 max-w-3xl w-full">
            {trophyCards.map((trophy, idx) => {
              const card = trophy.trophy_card || trophy.trophyCard || {};
              const isNightmare = trophy.nightmare;

              return (
                <div
                  key={idx}
                  className={`group relative rounded-2xl p-0.5 transition-all hover:scale-105 ${
                    isNightmare
                      ? "bg-gradient-to-b from-red-500/70 via-red-700/50 to-red-900/70 hover:shadow-[0_0_25px_rgba(239,68,68,0.2)]"
                      : "bg-gradient-to-b from-amber-400/60 via-amber-600/40 to-amber-800/60 hover:shadow-[0_0_25px_rgba(217,119,6,0.2)]"
                  }`}
                >
                  <div className="bg-gray-950 rounded-[14px] p-4 flex flex-col items-center h-full relative overflow-hidden">
                    {/* Card inner ambiance */}
                    <div
                      className={`absolute inset-0 rounded-[14px] ${
                        isNightmare
                          ? "bg-gradient-to-b from-red-900/10 to-transparent"
                          : "bg-gradient-to-b from-amber-900/10 to-transparent"
                      }`}
                    />

                    {/* Nightmare badge */}
                    {isNightmare && (
                      <div className="absolute top-2 right-2 text-[10px] bg-red-900/60 text-red-300 px-1.5 py-0.5 rounded-md font-bold border border-red-500/30">
                        {"\uD83D\uDD25"}
                      </div>
                    )}

                    {/* Name */}
                    <div
                      className={`relative z-10 font-display text-sm mb-2 truncate w-full text-center ${
                        isNightmare ? "text-red-300" : "text-amber-300"
                      }`}
                    >
                      {card.name || "Trophy"}
                    </div>

                    {/* Image */}
                    <div className="relative z-10 w-20 h-20 rounded-xl overflow-hidden border-2 border-gray-700/40 mb-3">
                      <img
                        src={`/cards/${card.image || "player_card_1.jpg"}`}
                        alt="Trophy"
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>

                    {/* Stats with bars */}
                    <div className="relative z-10 w-full space-y-1.5 text-xs">
                      {[
                        {
                          label: "ATK",
                          value: card.attack,
                          color: "text-red-400",
                          barColor: "bg-red-500/50",
                        },
                        {
                          label: "DEF",
                          value: card.defence,
                          color: "text-blue-400",
                          barColor: "bg-blue-500/50",
                        },
                        {
                          label: "SP",
                          value: card.sp,
                          color: "text-yellow-400",
                          barColor: "bg-yellow-500/50",
                        },
                      ].map((stat) => (
                        <div
                          key={stat.label}
                          className="flex items-center gap-1.5"
                        >
                          <span
                            className={`${stat.color} font-bold w-6 text-[10px]`}
                          >
                            {stat.label}
                          </span>
                          <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${stat.barColor} rounded-full`}
                              style={{
                                width: `${Math.min(100, (stat.value || 0) / 3)}%`,
                              }}
                            />
                          </div>
                          <span className="text-white font-bold w-6 text-right text-[10px]">
                            {stat.value || "?"}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Level info */}
                    <div className="relative z-10 mt-2 text-[10px] text-gray-500 text-center">
                      {trophy.level_reached || trophy.levelReached || "?"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Achievements */}
        {achievements.length > 0 && (
          <div className="mt-10 w-full max-w-lg">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">{"\u2B50"}</span>
              <h3 className="text-xl font-display text-amber-400">
                Achievements
              </h3>
              <span className="text-xs text-gray-600 ml-auto">
                {achievements.length} unlocked
              </span>
            </div>
            <div className="space-y-2">
              {achievements.map((ach, idx) => (
                <div
                  key={idx}
                  className="bg-gray-900/60 border border-amber-700/20 rounded-xl px-4 py-3 flex items-center gap-3 backdrop-blur-sm hover:bg-gray-800/60 transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-900/30 border border-amber-600/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-amber-400 text-sm">{"\u2B50"}</span>
                  </div>
                  <span className="text-white text-sm font-medium">
                    {ach.achievement_id || ach.achievementId}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setStoryScreen("menu")}
          className="mt-10 bg-gray-800/80 hover:bg-gray-700/80 text-gray-300 font-bold py-2.5 px-8 rounded-xl transition-all border border-gray-700/40 backdrop-blur-sm hover:border-gray-600/60"
        >
          Back
        </button>
      </div>
    </div>
  );
}
