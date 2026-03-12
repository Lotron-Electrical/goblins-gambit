import { useState } from 'react';
import { useStore } from '../../store.js';
import { soundManager } from '../../audio/SoundManager.js';
import { ICONS } from './icons.js';

export default function GameHUD() {
  const { gameState, drawCard, endTurn, buyAP, setHelpOpen, muted, setMuted } = useStore();
  const [musicOn, setMusicOn] = useState(true);

  if (!gameState) return null;

  const myPlayer = gameState.players[gameState.myId];
  const isMyTurn = gameState.currentPlayerId === gameState.myId;
  const isEarlyTurn = gameState.turnNumber <= 3 && isMyTurn;

  const handleMuteToggle = () => {
    soundManager.init();
    const newMuted = soundManager.toggleMute();
    setMuted(newMuted);
  };

  const handleMusicToggle = () => {
    if (musicOn) {
      soundManager.stopMusic();
    } else {
      soundManager.startMusic();
    }
    setMusicOn(!musicOn);
  };

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
          {/* Mute SFX button */}
          <button
            onClick={handleMuteToggle}
            className="w-8 h-8 flex items-center justify-center text-[14px] text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            title={muted ? 'Unmute SFX' : 'Mute SFX'}
          >
            {muted ? ICONS.muted : ICONS.sound}
          </button>
          {/* Music toggle */}
          <button
            onClick={handleMusicToggle}
            className={`w-8 h-8 flex items-center justify-center text-[14px] ${musicOn ? 'text-yellow-400' : 'text-gray-400'} hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition`}
            title={musicOn ? 'Stop music' : 'Play music'}
          >
            {musicOn ? ICONS.music : ICONS.musicOff}
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

      {/* Action buttons (bottom right) */}
      {isMyTurn && (
        <div className="fixed bottom-[170px] right-4 flex flex-col gap-2 pointer-events-auto z-30">
          <button
            onClick={drawCard}
            disabled={myPlayer.ap < 1}
            className="bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition text-[13px]"
          >
            Draw (1 AP)
          </button>
          <button
            onClick={buyAP}
            className="bg-purple-700 hover:bg-purple-600 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition text-[13px]"
          >
            Buy AP ({myPlayer.sp >= 1000 ? '1000' : myPlayer.sp} SP)
          </button>
          <button
            onClick={endTurn}
            className="bg-[var(--color-gold)] hover:bg-yellow-400 text-black font-bold py-3 px-6 rounded-lg shadow-lg transition text-[14px]"
          >
            End Turn
          </button>
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
