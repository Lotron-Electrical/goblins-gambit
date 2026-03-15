import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../store.js';
import { useIsMobile } from '../hooks/useIsMobile.js';
import { soundManager } from '../audio/SoundManager.js';

export default function TutorialOverlay() {
  const { tutorialEngine, endTutorial, gameState, selectedCard } = useStore();
  const centerY = useStore(s => s.centerZoneY);
  const isMobile = useIsMobile();
  const [spotlightRect, setSpotlightRect] = useState(null);
  const [showOpponentThinking, setShowOpponentThinking] = useState(false);
  const [showVictory, setShowVictory] = useState(false);
  const rafRef = useRef(null);

  if (!tutorialEngine) return null;

  const config = tutorialEngine.getStepConfig();
  const isComplete = config.id === 'complete';

  // Delay victory screen to let animations finish, then play victory sound
  useEffect(() => {
    if (isComplete && !showVictory) {
      const timer = setTimeout(() => {
        soundManager.play('victory');
        setShowVictory(true);
      }, 2000); // Wait for attack + damage + destroy + sp_change animations
      return () => clearTimeout(timer);
    }
  }, [isComplete, showVictory]);

  // Build the effective highlight selector
  // For attack steps: once the player selects their creature, shift spotlight to opponent's creature
  let effectiveHighlight = config.highlight
    || (config.highlightCardUid ? `[data-card-uid="${config.highlightCardUid}"]` : null);

  if (config.expectedAction === 'attack' && selectedCard) {
    // Player selected their attacker — now highlight the opponent's creature
    const opponentSwamp = gameState?.players?.['tutorial-opponent']?.swamp;
    if (opponentSwamp?.length > 0) {
      effectiveHighlight = `[data-card-uid="${opponentSwamp[0].uid}"]`;
    }
  }

  // Track the highlighted element position
  const updateSpotlight = useCallback(() => {
    if (!effectiveHighlight) {
      setSpotlightRect(null);
      return;
    }
    const el = document.querySelector(effectiveHighlight);
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
  }, [effectiveHighlight]);

  useEffect(() => {
    updateSpotlight();
    // Run again after next frame to catch Framer Motion layout shifts
    const raf = requestAnimationFrame(() => updateSpotlight());
    // Poll for position changes (layout shifts, scroll)
    const interval = setInterval(updateSpotlight, 300);
    return () => { cancelAnimationFrame(raf); clearInterval(interval); };
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

  // Victory / completion screen — delayed until animations finish
  if (isComplete && showVictory) {
    return (
      <div className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4">
        <div className={`bg-gray-900 border-2 border-[var(--color-gold)] rounded-xl shadow-2xl text-center ${
          isMobile ? 'mx-2 px-5 py-6 max-w-[340px]' : 'px-8 py-8 max-w-md'
        }`}>
          <div className={`font-display text-[var(--color-gold-bright)] mb-2 ${
            isMobile ? 'text-4xl' : 'text-5xl'
          }`}>
            VICTORY!
          </div>
          <p className={`text-gray-300 mb-5 ${isMobile ? 'text-[13px]' : 'text-[15px]'}`}>
            You defeated Gnarl the Goblin!
          </p>
          <div className={`text-gray-400 text-left space-y-2 mb-6 ${isMobile ? 'text-[12px]' : 'text-[14px]'}`}>
            <p><span className="text-blue-400 font-bold">Draw</span> cards to build your hand</p>
            <p><span className="text-green-400 font-bold">Tricks</span> are free and give instant SP</p>
            <p><span className="text-red-400 font-bold">Creatures</span> go to your Swamp — attack enemies to earn SP</p>
            <p><span className="text-blue-300 font-bold">Magic</span> cards buff, debuff, and destroy</p>
            <p><span className="text-gray-300 font-bold">Armour</span> equips to head, body, feet — complete a set for a bonus!</p>
          </div>
          <p className={`text-gray-500 italic mb-6 ${isMobile ? 'text-[11px]' : 'text-[13px]'}`}>
            In real games you'll also discover creature abilities, and chaotic events like Dragons and Volcanos!
          </p>
          <button
            onClick={handleFinish}
            className={`w-full bg-[var(--color-gold)] hover:bg-yellow-400 text-black font-bold rounded-lg transition ${
              isMobile ? 'py-3 text-[15px]' : 'py-3 text-lg'
            }`}
          >
            Enter the Swamp
          </button>
        </div>
      </div>
    );
  }

  // Transitional victory state — show immediate feedback while waiting for animations
  if (isComplete && !showVictory) {
    return (
      <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center pointer-events-none">
        <div className="text-center">
          <div className={`font-display text-[var(--color-gold-bright)] animate-pulse ${
            isMobile ? 'text-3xl' : 'text-4xl'
          }`}>
            Victory!
          </div>
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

  // Hide instruction panel when TargetPicker is showing or waiting for victory animations
  const hideInstruction = !!gameState?.pendingTarget || (isComplete && !showVictory);

  // Spotlight dimming overlay + instruction panel
  const spotlightShadow = spotlightRect
    ? `0 0 0 9999px rgba(0,0,0,0.6)`
    : 'none';

  // Position prompt above center zone so it doesn't cover player UI
  // During attack targeting (player selected their creature, now picking opponent's), move prompt to bottom
  // so it doesn't obscure the opponent's creature
  const isAttackTargeting = config.expectedAction === 'attack' && selectedCard;
  const promptTop = isAttackTargeting && isMobile ? undefined : (isMobile ? '80px' : (centerY ? `${centerY - 40}px` : '35%'));
  const promptBottom = isAttackTargeting && isMobile ? '140px' : undefined;

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

      {/* Instruction panel — positioned above center zone */}
      {config.instruction && !hideInstruction && (
        <div className={`fixed z-50 pointer-events-auto left-1/2 -translate-x-1/2 ${
          isMobile ? 'w-[calc(100%-16px)]' : 'max-w-md w-full -translate-y-1/2'
        }`}
          style={{ top: promptTop, bottom: promptBottom }}
        >
          <div className={`bg-gray-900/95 border-2 border-[var(--color-gold)] rounded-xl shadow-2xl ${
            isMobile ? 'px-3 py-2' : 'px-6 py-4'
          }`}>
            <div className={`flex items-center justify-between ${isMobile ? 'mb-1' : 'mb-2'}`}>
              <span className={`text-gray-500 ${isMobile ? 'text-[10px]' : 'text-[12px]'}`}>
                Step {config.displayStepNumber} of {config.displayTotalSteps}
              </span>
              <span className={`font-display text-[var(--color-gold)] ${
                isMobile ? 'text-[13px]' : 'text-[16px]'
              }`}>
                {config.title}
              </span>
            </div>
            <p className={`text-gray-200 ${isMobile ? 'text-[12px] leading-snug' : 'text-[14px] leading-relaxed'}`}>
              {config.instruction}
            </p>
          </div>
        </div>
      )}

      {/* Bouncing arrow pointing to spotlight target */}
      {spotlightRect && !hideInstruction && (
        <div
          className="fixed z-50 pointer-events-none"
          style={{
            left: spotlightRect.left + spotlightRect.width / 2 - 12,
            top: spotlightRect.top - 28,
          }}
        >
          <div className="animate-bounce text-[var(--color-gold)] text-[20px] drop-shadow-[0_0_6px_rgba(212,175,55,0.8)]">
            &#9660;
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
