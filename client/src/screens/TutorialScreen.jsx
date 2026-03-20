import { useEffect, useState } from "react";
import { useStore } from "../store.js";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { soundManager } from "../audio/SoundManager.js";
import GameScreen from "./GameScreen.jsx";

export default function TutorialScreen() {
  const { startTutorial, tutorialEngine, endTutorial } = useStore();
  const isMobile = useIsMobile();
  const [showVictory, setShowVictory] = useState(false);

  useEffect(() => {
    startTutorial();
  }, []);

  const config = tutorialEngine?.getStepConfig();
  const isComplete = config?.id === "complete";

  // Delay victory screen to let animations finish
  useEffect(() => {
    if (isComplete && !showVictory) {
      const timer = setTimeout(() => {
        soundManager.play("victory");
        setShowVictory(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, showVictory]);

  const handleFinish = () => {
    localStorage.setItem("gg_tutorial_complete", "1");
    endTutorial();
  };

  return (
    <>
      <GameScreen />

      {/* Transitional victory state — waiting for animations */}
      {isComplete && !showVictory && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div
              className={`font-display text-[var(--color-gold-bright)] animate-pulse ${
                isMobile ? "text-3xl" : "text-4xl"
              }`}
            >
              Victory!
            </div>
          </div>
        </div>
      )}

      {/* Victory overlay */}
      {isComplete && showVictory && (
        <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
          <div
            className={`bg-gray-900 border-2 border-[var(--color-gold)] rounded-xl shadow-2xl text-center ${
              isMobile ? "mx-2 px-5 py-6 max-w-[340px]" : "px-8 py-8 max-w-md"
            }`}
          >
            <div
              className={`font-display text-[var(--color-gold-bright)] mb-2 ${
                isMobile ? "text-4xl" : "text-5xl"
              }`}
            >
              VICTORY!
            </div>
            <p
              className={`text-gray-300 mb-5 ${isMobile ? "text-[13px]" : "text-[15px]"}`}
            >
              You defeated Gnarl the Goblin!
            </p>
            <div
              className={`text-gray-400 text-left space-y-2 mb-6 ${isMobile ? "text-[12px]" : "text-[14px]"}`}
            >
              <p>
                <span className="text-blue-400 font-bold">Draw</span> cards to
                build your hand
              </p>
              <p>
                <span className="text-green-400 font-bold">Tricks</span> are
                free and give instant SP
              </p>
              <p>
                <span className="text-red-400 font-bold">Creatures</span> go to
                your Swamp — attack enemies to earn SP
              </p>
              <p>
                <span className="text-blue-300 font-bold">Magic</span> cards
                buff, debuff, and destroy
              </p>
              <p>
                <span className="text-gray-300 font-bold">Armour</span> equips
                to head, body, feet — complete a set for a bonus!
              </p>
            </div>
            <p
              className={`text-gray-500 italic mb-6 ${isMobile ? "text-[11px]" : "text-[13px]"}`}
            >
              In real games you'll also discover creature abilities, and chaotic
              events like Dragons and Volcanos!
            </p>
            <button
              onClick={handleFinish}
              className={`w-full bg-[var(--color-gold)] hover:bg-yellow-400 text-black font-bold rounded-lg transition ${
                isMobile ? "py-3 text-[15px]" : "py-3 text-lg"
              }`}
            >
              Enter the Swamp
            </button>
          </div>
        </div>
      )}
    </>
  );
}
