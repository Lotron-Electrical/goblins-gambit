/**
 * EnhancementScreen — pick 1 of 3 upgrade options.
 */

import { useStoryStore } from "../../storyStore.js";

export default function EnhancementScreen() {
  const { enhancementOptions, pickEnhancement, storyRun } = useStoryStore();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-b from-gray-950 via-green-950/20 to-gray-950">
      <h2 className="text-3xl font-display text-green-400 mb-2">
        Choose an Enhancement
      </h2>
      <p className="text-gray-400 text-sm mb-8">
        Pick one upgrade for your creature
      </p>

      <div className="flex gap-4 flex-wrap justify-center max-w-2xl">
        {enhancementOptions.map((opt, idx) => (
          <button
            key={idx}
            onClick={() => pickEnhancement(opt)}
            className="w-56 bg-gray-900 border-2 border-green-700/50 hover:border-green-400 rounded-xl p-5 transition hover:scale-105 flex flex-col items-center gap-3 text-center"
          >
            <span className="text-3xl">
              {opt.type === "stat_boost"
                ? "\uD83D\uDCAA"
                : opt.type === "ability"
                  ? "\u2728"
                  : opt.type === "life"
                    ? "\u2764\uFE0F"
                    : opt.type === "item"
                      ? "\uD83C\uDF92"
                      : "\u2B50"}
            </span>
            <span className="text-white font-bold text-sm">
              {opt.description}
            </span>
            <span className="text-gray-500 text-xs">
              {opt.type === "stat_boost" &&
                `+${opt.amount} ${opt.stat?.toUpperCase()}`}
              {opt.type === "ability" && `Ability: ${opt.abilityId}`}
              {opt.type === "life" && "+1 Life"}
              {opt.type === "item" && opt.itemName}
            </span>
          </button>
        ))}
      </div>

      {storyRun && (
        <div className="mt-6 text-xs text-gray-500">
          Current stats: {storyRun.customCard.attack}/
          {storyRun.customCard.defence}/{storyRun.customCard.sp}
          {storyRun.customCard.abilityId &&
            ` | Ability: ${storyRun.customCard.abilityId}`}
        </div>
      )}
    </div>
  );
}
