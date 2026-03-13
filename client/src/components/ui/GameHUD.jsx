import { useStore } from '../../store.js';
import { ICONS } from './icons.js';

export default function GameHUD() {
  const { gameState, setHelpOpen, setMenuOpen } = useStore();

  if (!gameState) return null;

  const myPlayer = gameState.players[gameState.myId];
  const isMyTurn = gameState.currentPlayerId === gameState.myId;
  const isEarlyTurn = gameState.turnNumber <= 3 && isMyTurn;

  return (
    <div className="fixed top-0 left-0 right-0 z-20 pointer-events-none">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-950/90 border-b border-gray-800 pointer-events-auto">
        <div className="flex items-center gap-4">
          <span className="font-display text-[var(--color-gold)] text-lg">Goblin's Gambit</span>
          <span className="text-gray-500 text-[12px]">Turn {gameState.turnNumber}</span>
          <span className="text-gray-500 text-[12px]">Deck: {gameState.deckCount}</span>
          <span className="text-gray-500 text-[12px]">Grave: {gameState.graveyardCount}</span>
        </div>
        <div className="flex items-center gap-3">
          {isMyTurn && (
            <span className="bg-[var(--color-gold)]/90 text-black font-display text-sm px-3 py-0.5 rounded shadow animate-pulse">
              YOUR TURN
            </span>
          )}
          <span className="text-yellow-400 font-bold text-[16px]">{myPlayer.sp} / {gameState.winSP} SP</span>
          <span className="text-blue-300 font-bold text-[14px]">{myPlayer.ap} AP</span>
          {/* Help button */}
          <button
            onClick={() => setHelpOpen(true)}
            className="w-8 h-8 flex items-center justify-center text-[14px] text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            title="Help"
          >
            ?
          </button>
          {/* Menu button (gear) */}
          <button
            onClick={() => setMenuOpen(true)}
            className="w-8 h-8 flex items-center justify-center text-[14px] text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            title="Settings"
          >
            {ICONS.gear}
          </button>
        </div>
      </div>

      {/* First-turn instruction */}
      {isEarlyTurn && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-gray-900/90 border border-gray-700 rounded-lg px-4 py-2 text-[13px] text-gray-300 text-center max-w-sm">
            Draw cards, play creatures to your swamp, and attack to earn SP!
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
