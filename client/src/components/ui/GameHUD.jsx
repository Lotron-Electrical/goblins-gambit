import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store.js';
import { ICONS } from './icons.js';
import { useIsMobile } from '../../hooks/useIsMobile.js';

export default function GameHUD() {
  const { gameState, setHelpOpen, setMenuOpen } = useStore();
  const isMobile = useIsMobile();

  if (!gameState) return null;

  const myPlayer = gameState.players[gameState.myId];
  const isMyTurn = gameState.currentPlayerId === gameState.myId;
  const [tipDismissed, setTipDismissed] = useState(false);
  const [tipFading, setTipFading] = useState(false);
  const initialAnimRef = useRef(gameState.animations);
  const showTip = !tipDismissed && gameState.turnNumber <= 3;

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
      {/* Top bar */}
      <div className={`flex items-center justify-between ${isMobile ? 'px-2 py-1.5' : 'px-4 py-2'} bg-gray-950/90 border-b border-gray-800 pointer-events-auto`}>
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          {!isMobile && (
            <>
              <span className="font-display text-[var(--color-gold)] text-lg">Goblin's Gambit</span>
              <span className="text-gray-600 text-[10px]">v{__APP_VERSION__}</span>
            </>
          )}
          <span className={`text-gray-500 ${isMobile ? 'text-[10px]' : 'text-[12px]'}`}>Turn {gameState.turnNumber}</span>
          {!isMobile && (
            <>
              <span className="text-gray-500 text-[12px]">Deck: {gameState.deckCount}</span>
              <span className="text-gray-500 text-[12px]">Grave: {gameState.graveyardCount}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-1.5 md:gap-3">
          {isMyTurn && (
            <span className={`bg-[var(--color-gold)]/90 text-black font-display rounded shadow animate-pulse ${
              isMobile ? 'text-[10px] px-2 py-0.5' : 'text-sm px-3 py-0.5'
            }`}>
              YOUR TURN
            </span>
          )}
          <span className={`text-yellow-400 font-bold ${isMobile ? 'text-[12px]' : 'text-[16px]'}`}>{myPlayer.sp}/{gameState.winSP}</span>
          <span className={`text-blue-300 font-bold ${isMobile ? 'text-[11px]' : 'text-[14px]'}`}>{myPlayer.ap} AP</span>
          {myPlayer.playerShield > 0 && (
            <span className={`text-cyan-400 font-bold ${isMobile ? 'text-[11px]' : 'text-[14px]'}`}>{myPlayer.playerShield} Sh</span>
          )}
          <span className={`text-gray-400 ${isMobile ? 'text-[10px]' : 'text-[13px]'}`}>{myPlayer.hand?.length ?? myPlayer.handCount ?? 0} cards</span>
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

      {/* SP Progress bar */}
      <div className="fixed top-12 left-0 right-0 pointer-events-none">
        <div className="h-1 bg-gray-800">
          <div
            className="h-full bg-gradient-to-r from-[var(--color-gold)] to-yellow-400 transition-all duration-500"
            style={{ width: `${Math.min(100, (myPlayer.sp / gameState.winSP) * 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
