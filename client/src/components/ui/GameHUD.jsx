import { useState, useEffect } from 'react';
import { useStore } from '../../store.js';
import { ICONS } from './icons.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import { THEME_EFFECTS } from '../../../../shared/src/constants.js';

const THEME_ICON = {
  swamp: '\u{1F33F}',
  blood: '\u{1F319}',
  frost: '\u{2744}\u{FE0F}',
};

const FIRST_GAME_KEY = 'gg_seen_rules_prompt';

export default function GameHUD() {
  const { gameState, setHelpOpen, setMenuOpen } = useStore();
  const isMobile = useIsMobile();
  const [themeExpanded, setThemeExpanded] = useState(false);

  if (!gameState) return null;

  const themeInfo = THEME_EFFECTS[gameState.theme] || THEME_EFFECTS.swamp;
  const themeIcon = THEME_ICON[gameState.theme] || THEME_ICON.swamp;
  const playerCount = Object.keys(gameState.players).length;
  const alivePlayers = Object.values(gameState.players).filter(p => !p.eliminated).length;

  // First-game rules prompt — only shows once ever
  const [showRulesPrompt, setShowRulesPrompt] = useState(() => {
    return !localStorage.getItem(FIRST_GAME_KEY);
  });

  const handleRulesYes = () => {
    localStorage.setItem(FIRST_GAME_KEY, '1');
    setShowRulesPrompt(false);
    setHelpOpen(true);
  };

  const handleRulesNo = () => {
    localStorage.setItem(FIRST_GAME_KEY, '1');
    setShowRulesPrompt(false);
  };

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
          <button
            onClick={() => setThemeExpanded(!themeExpanded)}
            className={`${isMobile ? 'text-[10px]' : 'text-[12px]'} hover:opacity-80 transition`}
            title="Tap to see theme effects"
          >
            <span className="mr-0.5">{themeIcon}</span>
            <span className="text-gray-300 font-medium">{themeInfo.name}</span>
          </button>
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

      {/* Theme effects expandable */}
      {themeExpanded && gameState.theme !== 'swamp' && (
        <div
          className={`bg-gray-900/95 border-b border-gray-700 pointer-events-auto ${isMobile ? 'px-2 py-1.5 text-[10px]' : 'px-4 py-1.5 text-[12px]'}`}
          onClick={() => setThemeExpanded(false)}
        >
          <span className="text-gray-300">{themeIcon} {themeInfo.description}</span>
        </div>
      )}

      {/* First-game rules dialog */}
      {showRulesPrompt && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center pointer-events-auto">
          <div className={`bg-gray-900 border-2 border-[var(--color-gold)] rounded-xl shadow-2xl text-center ${
            isMobile ? 'mx-4 px-5 py-6 max-w-[300px]' : 'px-8 py-8 max-w-sm'
          }`}>
            <h2 className={`font-display text-[var(--color-gold)] mb-3 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
              First time playing?
            </h2>
            <p className={`text-gray-300 mb-5 ${isMobile ? 'text-[13px]' : 'text-[15px]'}`}>
              Would you like to read the rules before your first game?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleRulesYes}
                className={`flex-1 bg-[var(--color-card-green)] hover:bg-green-600 text-white font-bold rounded-lg transition ${
                  isMobile ? 'py-2.5 text-[13px]' : 'py-3 text-[15px]'
                }`}
              >
                Show me the rules
              </button>
              <button
                onClick={handleRulesNo}
                className={`flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-lg transition ${
                  isMobile ? 'py-2.5 text-[13px]' : 'py-3 text-[15px]'
                }`}
              >
                I'll figure it out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
