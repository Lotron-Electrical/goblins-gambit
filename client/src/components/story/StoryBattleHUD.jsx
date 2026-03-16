/**
 * StoryBattleHUD — overlay on GameScreen during story battles.
 * Shows lives, level name, character dialogue, item belt.
 */

import { useState } from "react";
import { useStoryStore } from "../../storyStore.js";
import { STORY_LEVELS, STORY_LEVEL_CONFIG } from "../../../../shared/src/constants.js";

export default function StoryBattleHUD() {
  const { storyRun, battleCharacter, useItem, showTrophyPicker, trophyCards, selectTrophyCard, closeTrophyPicker } = useStoryStore();
  const [dialogueDismissed, setDialogueDismissed] = useState(false);

  if (!storyRun) return null;

  const levelKey = STORY_LEVELS[storyRun.currentLevelIndex];
  const levelConfig = STORY_LEVEL_CONFIG[levelKey];
  const unusedItems = storyRun.items.filter((i) => !i.used);

  return (
    <>
      {/* Top bar overlay */}
      <div className="fixed top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-2 bg-gray-950/90 border-b border-amber-800/30">
        <div className="flex items-center gap-3">
          <span className="text-amber-400 font-display text-sm">{levelConfig?.name}</span>
          <span className="text-red-400 text-sm">{"\u2665".repeat(storyRun.lives)}</span>
        </div>
        <div className="text-xs text-gray-400">
          {storyRun.customCard.name} ({storyRun.customCard.attack}/{storyRun.customCard.defence}/{storyRun.customCard.sp})
        </div>
      </div>

      {/* Character dialogue (intro) */}
      {battleCharacter?.dialogue?.intro && !dialogueDismissed && (
        <div
          className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 bg-gray-900/95 border border-amber-600 rounded-xl px-6 py-4 max-w-md cursor-pointer"
          onClick={() => setDialogueDismissed(true)}
        >
          <div className="text-amber-400 font-bold text-sm mb-1">{battleCharacter.name}</div>
          <div className="text-gray-300 text-sm italic">"{battleCharacter.dialogue.intro}"</div>
          <div className="text-gray-600 text-xs mt-2 text-right">Click to dismiss</div>
        </div>
      )}

      {/* Item belt */}
      {unusedItems.length > 0 && (
        <div className="fixed bottom-2 left-1/2 -translate-x-1/2 z-30 flex gap-2">
          {unusedItems.map((item) => (
            <button
              key={item.id}
              onClick={() => useItem(item.id)}
              className="bg-gray-800 hover:bg-gray-700 border border-amber-600/50 rounded-lg px-3 py-2 text-xs text-amber-300 transition"
              title={item.description}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}

      {/* Sock Satchel trophy picker modal */}
      {showTrophyPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-gray-900 border-2 border-amber-600 rounded-xl p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-display text-amber-400 mb-4">Sock Satchel Portal</h3>
            <p className="text-gray-400 text-sm mb-4">Choose a trophy card to summon into your hand:</p>
            {trophyCards.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No trophy cards available.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {trophyCards.map((trophy, idx) => {
                  const card = trophy.trophy_card || trophy.trophyCard || {};
                  return (
                    <button
                      key={idx}
                      onClick={() => selectTrophyCard(card)}
                      className="bg-gray-800 hover:bg-gray-700 border border-amber-600/50 hover:border-amber-400 rounded-lg p-3 text-left transition"
                    >
                      <img src={`/cards/${card.image || "player_card_1.jpg"}`} alt="Trophy" className="w-10 h-10 object-cover rounded mb-1" />
                      <div className="text-amber-300 font-display text-sm mb-1 truncate">{card.name || "Trophy"}</div>
                      <div className="text-xs text-gray-400 space-y-0.5">
                        <div className="flex justify-between">
                          <span className="text-red-400">ATK</span>
                          <span>{card.attack || "?"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-400">DEF</span>
                          <span>{card.defence || "?"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-yellow-400">SP</span>
                          <span>{card.sp || "?"}</span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            <button
              onClick={closeTrophyPicker}
              className="mt-4 w-full bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold py-2 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
