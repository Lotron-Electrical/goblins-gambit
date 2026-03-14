import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store.js';
import { useIsMobile } from '../hooks/useIsMobile.js';

export default function TutorialOverlay() {
  const { tutorialEngine, endTutorial } = useStore();
  const isMobile = useIsMobile();
  const [spotlightRect, setSpotlightRect] = useState(null);
  const [showOpponentThinking, setShowOpponentThinking] = useState(false);
  const rafRef = useRef(null);

  if (!tutorialEngine) return null;

  const config = tutorialEngine.getStepConfig();
  const isComplete = config.id === 'complete';

  // Track the highlighted element position
  const updateSpotlight = useCallback(() => {
    if (!config.highlight) {
      setSpotlightRect(null);
      return;
    }
    const el = document.querySelector(config.highlight);
    if (el) {
      const rect = el.getBoundingClientRect();
      setSpotlightRect({
        top: rect.top - 8,
        left: rect.left - 8,
        width: rect.width + 16,
        height: rect.height + 16,
      });
    } else {
      setSpotlightRect(null);
    }
  }, [config.highlight]);

  useEffect(() => {
    updateSpotlight();
    // Poll for position changes (layout shifts, scroll)
    const interval = setInterval(updateSpotlight, 300);
    return () => clearInterval(interval);
  }, [updateSpotlight]);

  // Handle opponent thinking interstitial after end turn
  useEffect(() => {
    if (config.opponentDelay && showOpponentThinking) {
      const timer = setTimeout(() => setShowOpponentThinking(false), 1500);
      return () => clearTimeout(timer);
    }
  }, [showOpponentThinking, config.opponentDelay]);

  const handleFinish = () => {
    localStorage.setItem('gg_tutorial_complete', '1');
    endTutorial();
  };

  // Completion screen
  if (isComplete) {
    return (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <div className={`bg-gray-900 border-2 border-[var(--color-gold)] rounded-xl shadow-2xl text-center ${
          isMobile ? 'mx-2 px-5 py-6 max-w-[340px]' : 'px-8 py-8 max-w-md'
        }`}>
          <h2 className={`font-display text-[var(--color-gold-bright)] mb-4 ${
            isMobile ? 'text-2xl' : 'text-3xl'
          }`}>
            You've learned the basics!
          </h2>
          <div className={`text-gray-300 text-left space-y-2 mb-6 ${isMobile ? 'text-[13px]' : 'text-[15px]'}`}>
            <p><span className="text-blue-400 font-bold">Draw</span> cards to build your hand</p>
            <p><span className="text-green-400 font-bold">Tricks</span> are free and give instant SP</p>
            <p><span className="text-red-400 font-bold">Creatures</span> go to your Swamp — attack enemies to earn SP</p>
            <p><span className="text-blue-300 font-bold">Magic</span> cards buff, debuff, and destroy</p>
          </div>
          <p className={`text-gray-500 italic mb-6 ${isMobile ? 'text-[12px]' : 'text-[13px]'}`}>
            In real games you'll also discover Armour sets, creature abilities, and chaotic events like Dragons and Volcanos!
          </p>
          <button
            onClick={handleFinish}
            className={`w-full bg-[var(--color-card-green)] hover:bg-green-600 text-white font-bold rounded-lg transition ${
              isMobile ? 'py-3 text-[15px]' : 'py-3 text-lg'
            }`}
          >
            Enter the Swamp
          </button>
        </div>
      </div>
    );
  }

  // Opponent thinking interstitial
  if (showOpponentThinking) {
    return (
      <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center pointer-events-none">
        <div className="bg-gray-900 border border-gray-600 rounded-xl px-8 py-5 text-center">
          <p className="text-[var(--color-gold)] font-display text-xl animate-pulse">
            Gnarl is thinking...
          </p>
        </div>
      </div>
    );
  }

  // Spotlight dimming overlay + instruction panel
  const spotlightShadow = spotlightRect
    ? `0 0 0 9999px rgba(0,0,0,0.6)`
    : 'none';

  return (
    <>
      {/* Dim overlay — allows clicks through on non-dimmed area */}
      {spotlightRect && (
        <div
          className="fixed inset-0 z-40 pointer-events-none"
          style={{
            background: 'transparent',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: spotlightRect.top,
              left: spotlightRect.left,
              width: spotlightRect.width,
              height: spotlightRect.height,
              borderRadius: '8px',
              boxShadow: spotlightShadow,
            }}
          />
        </div>
      )}

      {/* Instruction panel */}
      {config.instruction && (
        <div className={`fixed z-50 pointer-events-auto ${
          isMobile
            ? 'top-12 left-2 right-2'
            : 'top-14 left-1/2 -translate-x-1/2 max-w-md w-full'
        }`}>
          <div className={`bg-gray-900/95 border-2 border-[var(--color-gold)] rounded-xl shadow-2xl ${
            isMobile ? 'px-4 py-3' : 'px-6 py-4'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-gray-500 ${isMobile ? 'text-[10px]' : 'text-[12px]'}`}>
                Step {config.stepNumber} of {config.totalSteps - 1}
              </span>
              <span className={`font-display text-[var(--color-gold)] ${
                isMobile ? 'text-[14px]' : 'text-[16px]'
              }`}>
                {config.title}
              </span>
            </div>
            <p className={`text-gray-200 leading-relaxed ${isMobile ? 'text-[13px]' : 'text-[14px]'}`}>
              {config.instruction}
            </p>
          </div>
        </div>
      )}

      {/* Skip Tutorial button */}
      <button
        onClick={() => endTutorial()}
        className={`fixed z-50 text-gray-500 hover:text-gray-300 transition ${
          isMobile
            ? 'bottom-2 right-2 text-[11px] px-2 py-1'
            : 'bottom-4 right-4 text-[13px] px-3 py-1.5'
        } bg-gray-900/80 border border-gray-700 rounded`}
      >
        Skip Tutorial
      </button>
    </>
  );
}

// Export a function to trigger opponent thinking delay
export function useTutorialOpponentDelay() {
  const [show, setShow] = useState(false);
  const trigger = useCallback(() => {
    setShow(true);
    return new Promise(resolve => setTimeout(() => {
      setShow(false);
      resolve();
    }, 1500));
  }, []);
  return { showOpponentThinking: show, triggerOpponentDelay: trigger };
}
