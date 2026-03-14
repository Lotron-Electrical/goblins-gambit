import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store.js';
import { ICONS } from './icons.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import { THEME_EFFECTS } from '../../../../shared/src/constants.js';

const THEME_ICON = {
  swamp: '\u{1F33F}',
  blood: '\u{1F319}',
  frost: '\u{2744}\u{FE0F}',
};

export default function GameHUD() {
  const { gameState, setHelpOpen, setMenuOpen } = useStore();
  const isMobile = useIsMobile();

  if (!gameState) return null;

  const [tipDismissed, setTipDismissed] = useState(false);
  const [tipFading, setTipFading] = useState(false);
  const initialAnimRef = useRef(gameState.animations);
  const showTip = !tipDismissed && gameState.turnNumber <= 3;

  const themeInfo = THEME_EFFECTS[gameState.theme] || THEME_EFFECTS.swamp;
  const themeIcon = THEME_ICON[gameState.theme] || THEME_ICON.swamp;
  const playerCount = Object.keys(gameState.players).length;
  const alivePlayers = Object.values(gameState.players).filter(p => !p.eliminated).length;

  // Auto-fade on first action
  useEffect(() => {
    if (tipDismissed || !showTip) return;
    if (gameState.animations && gameState.animations !== initialAnimRef.current && gameState.animations.length > 0) {
      setTipFading(true);
      const timer = setTimeout(() => setTipDismissed(true), 800);
      return () => clearTimeout(timer);
    }
  }, [gameState.animations, tipDismissed, showTip]);

  return (
    <div className="fixed top-0 left-0 right-0 z-20 pointer-events-none">
      {/* Top bar — game status only */}
      <div className={`flex items-center justify-between ${isMobile ? 'px-2 py-1.5' : 'px-4 py-2'} bg-gray-950/90 border-b border-gray-800 pointer-events-auto`}>
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          {!isMobile && (
            <>
              <span className="font-display text-[var(--color-gold)] text-lg">Goblin's Gambit</span>
              <span className="text-gray-600 text-[10px]">v{__APP_VERSION__}</span>
            </>
          )}
          <span className={`${isMobile ? 'text-[10px]' : 'text-[12px]'}`}>
            <span className="mr-0.5">{themeIcon}</span>
            <span className="text-gray-300 font-medium">{themeInfo.name}</span>
          </span>
          <span className={`text-gray-500 ${isMobile ? 'text-[10px]' : 'text-[12px]'}`}>Turn {gameState.turnNumber}</span>
          <span className={`text-gray-500 ${isMobile ? 'text-[10px]' : 'text-[12px]'}`}>{alivePlayers}/{playerCount} alive</span>
          {!isMobile && (
            <>
              <span className="text-gray-500 text-[12px]">Deck: {gameState.deckCount}</span>
              <span className="text-gray-500 text-[12px]">Grave: {gameState.graveyardCount}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 md:gap-3">
          {isMobile && (
            <>
              <span className={`text-gray-500 text-[10px]`}>Deck: {gameState.deckCount}</span>
              <span className={`text-gray-500 text-[10px]`}>Grave: {gameState.graveyardCount}</span>
            </>
          )}
          {/* Help button */}
          <button
            onClick={() => setHelpOpen(true)}
            className={`flex items-center justify-center text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition ${
              isMobile ? 'w-7 h-7 text-[12px]' : 'w-8 h-8 text-[14px]'
            }`}
            title="Help"
          >
            ?
          </button>
          {/* Menu button (gear) */}
          <button
            onClick={() => setMenuOpen(true)}
            className={`flex items-center justify-center text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition ${
              isMobile ? 'w-7 h-7 text-[12px]' : 'w-8 h-8 text-[14px]'
            }`}
            title="Settings"
          >
            {ICONS.gear}
          </button>
        </div>
      </div>

      {/* First-turn instruction — fades out on first action */}
      {showTip && (
        <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-auto transition-opacity duration-700 ${tipFading ? 'opacity-0' : 'opacity-100'}`}>
          <div className={`bg-gray-900/90 border border-gray-700 rounded-lg px-3 py-2 text-gray-300 text-center flex items-center gap-3 ${
            isMobile ? 'text-[11px] max-w-[280px]' : 'text-[13px] max-w-sm'
          }`}>
            <span>Draw cards, play creatures to your swamp, and attack to earn SP!</span>
            <button onClick={() => { setTipFading(true); setTimeout(() => setTipDismissed(true), 700); }} className="text-gray-500 hover:text-white shrink-0 leading-none">&times;</button>
          </div>
        </div>
      )}

    </div>
  );
}
