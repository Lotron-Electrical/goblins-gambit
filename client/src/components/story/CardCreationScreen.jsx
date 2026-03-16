/**
 * CardCreationScreen — name your custom creature and begin the adventure.
 */

import { useState, useMemo } from "react";
import { useStoryStore } from "../../storyStore.js";

const PLAYER_CARD_IMAGES = [
  "player_card_1.jpg",
  "player_card_2.jpg",
  "player_card_3.jpg",
  "player_card_4.jpg",
];

export default function CardCreationScreen() {
  const {
    startRun,
    setStoryScreen,
    storyLoading,
    storyError,
    clearStoryError,
  } = useStoryStore();
  const [cardName, setCardName] = useState("");
  const [nightmare, setNightmare] = useState(false);
  const [selectedImage, setSelectedImage] = useState(() =>
    Math.floor(Math.random() * PLAYER_CARD_IMAGES.length),
  );

  const handleStart = () => {
    if (!cardName.trim()) return;
    startRun(cardName.trim(), nightmare);
  };

  const stats = nightmare ? 50 : 100;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-950 via-amber-950/20 to-gray-950 relative overflow-hidden">
      {/* Ambient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-72 h-72 bg-amber-600/5 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-1/4 right-1/3 w-56 h-56 bg-red-600/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "1.5s" }}
        />
      </div>

      <div className="relative z-10 flex flex-col items-center w-full">
        <h2 className="text-3xl md:text-4xl font-display text-transparent bg-clip-text bg-gradient-to-b from-amber-300 to-amber-500 mb-1">
          Create Your Creature
        </h2>
        <div className="w-32 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent mb-6" />

        {/* Card preview — large, dramatic, centered */}
        <div
          className={`relative w-56 h-80 rounded-2xl p-1 mb-8 transition-all duration-500 ${
            nightmare
              ? "bg-gradient-to-b from-red-500 via-red-700 to-red-900 shadow-[0_0_40px_rgba(239,68,68,0.3)]"
              : "bg-gradient-to-b from-amber-400 via-amber-600 to-amber-800 shadow-[0_0_40px_rgba(217,119,6,0.3)]"
          }`}
        >
          <div className="w-full h-full bg-gray-950 rounded-xl p-4 flex flex-col items-center justify-between relative overflow-hidden">
            {/* Card inner glow */}
            <div
              className={`absolute inset-0 rounded-xl ${
                nightmare
                  ? "bg-gradient-to-b from-red-900/20 to-transparent"
                  : "bg-gradient-to-b from-amber-900/20 to-transparent"
              }`}
            />

            {/* Name banner */}
            <div
              className={`relative z-10 w-full text-center py-1 rounded-lg ${
                nightmare ? "bg-red-900/40" : "bg-amber-900/40"
              }`}
            >
              <div
                className={`font-display text-base tracking-wide truncate px-2 ${
                  nightmare ? "text-red-300" : "text-amber-300"
                }`}
              >
                {cardName || "Your Creature"}
              </div>
            </div>

            {/* Image area */}
            <div className="relative z-10 w-32 h-32 rounded-xl overflow-hidden border-2 border-gray-700/50 my-2">
              <img
                src={`/cards/${PLAYER_CARD_IMAGES[selectedImage]}`}
                alt="Creature"
                className="w-full h-full object-cover"
              />
              {/* Image selector dots */}
              <div className="absolute bottom-1 left-0 right-0 flex justify-center gap-1.5">
                {PLAYER_CARD_IMAGES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={`w-2 h-2 rounded-full transition-all ${
                      i === selectedImage
                        ? "bg-amber-400 scale-125"
                        : "bg-gray-500/60 hover:bg-gray-400/80"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="relative z-10 w-full space-y-1.5">
              {[
                {
                  label: "ATK",
                  value: stats,
                  color: "text-red-400",
                  barColor: "bg-red-500/60",
                },
                {
                  label: "DEF",
                  value: stats,
                  color: "text-blue-400",
                  barColor: "bg-blue-500/60",
                },
                {
                  label: "SP",
                  value: stats,
                  color: "text-yellow-400",
                  barColor: "bg-yellow-500/60",
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex items-center gap-2 text-xs"
                >
                  <span className={`${stat.color} font-bold w-7`}>
                    {stat.label}
                  </span>
                  <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${stat.barColor} rounded-full transition-all duration-500`}
                      style={{ width: `${stat.value}%` }}
                    />
                  </div>
                  <span className="text-white font-bold w-7 text-right">
                    {stat.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Form area */}
        <div className="w-full max-w-xs space-y-4">
          <div className="relative">
            <input
              type="text"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              placeholder="Name your creature..."
              maxLength={20}
              className="w-full bg-gray-900/80 border-2 border-gray-700/60 rounded-xl px-4 py-3.5 text-white text-lg focus:outline-none focus:border-amber-500/70 focus:shadow-[0_0_20px_rgba(217,119,6,0.15)] transition-all text-center backdrop-blur-sm placeholder:text-gray-600"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-600 text-xs">
              {cardName.length}/20
            </div>
          </div>

          {/* Nightmare mode toggle */}
          <div
            onClick={() => setNightmare(!nightmare)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all border ${
              nightmare
                ? "bg-red-900/30 border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.1)]"
                : "bg-gray-900/50 border-gray-700/40 hover:border-gray-600/60"
            }`}
          >
            <div
              className={`w-10 h-5 rounded-full transition-all relative ${
                nightmare ? "bg-red-600" : "bg-gray-700"
              }`}
            >
              <div
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all shadow-md ${
                  nightmare ? "left-5.5 left-[22px]" : "left-0.5"
                }`}
              />
            </div>
            <div className="flex-1">
              <span
                className={`text-sm font-bold ${nightmare ? "text-red-300" : "text-gray-400"}`}
              >
                Nightmare Mode
              </span>
              <div className="text-[11px] text-gray-600 mt-0.5">
                2 lives, harder bots, 50/50/50 starting stats
              </div>
            </div>
            {nightmare && (
              <span className="text-red-500 text-lg">{"\uD83D\uDD25"}</span>
            )}
          </div>

          {storyError && (
            <div className="bg-red-900/50 border border-red-500/60 rounded-xl px-4 py-2 text-red-300 text-sm text-center backdrop-blur-sm">
              {storyError}
            </div>
          )}

          <button
            onClick={() => {
              clearStoryError();
              handleStart();
            }}
            disabled={!cardName.trim() || storyLoading}
            className="w-full bg-gradient-to-r from-amber-700 to-red-800 hover:from-amber-600 hover:to-red-700 disabled:from-gray-700 disabled:to-gray-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all text-lg shadow-lg shadow-amber-900/20 hover:shadow-amber-800/40 hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 disabled:shadow-none"
          >
            {storyLoading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Summoning...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Begin Adventure
                <span className="opacity-70">{"\u2192"}</span>
              </span>
            )}
          </button>

          <button
            onClick={() => setStoryScreen("menu")}
            className="w-full bg-transparent hover:bg-gray-800/40 text-gray-500 hover:text-gray-300 py-2 rounded-xl transition-all text-sm"
          >
            Back
          </button>
        </div>
      </div>
    </div>
  );
}
