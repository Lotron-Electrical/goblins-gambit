import { useEffect, useRef } from 'react';
import { useStore } from '../store.js';
import { usePlayerLayout } from '../hooks/usePlayerLayout.js';
import { useAnimationQueue } from '../hooks/useAnimationQueue.js';
import { soundManager } from '../audio/SoundManager.js';
import PlayerField from '../components/board/PlayerField.jsx';
import HandBar from '../components/hand/HandBar.jsx';
import GameHUD from '../components/ui/GameHUD.jsx';
import TargetPicker from '../components/ui/TargetPicker.jsx';
import CardZoom from '../components/ui/CardZoom.jsx';
import CardAnnouncement from '../components/ui/CardAnnouncement.jsx';
import GameOverModal from '../components/ui/GameOverModal.jsx';
import HelpPanel from '../components/ui/HelpPanel.jsx';
import CardChoiceModal from '../components/ui/CardChoiceModal.jsx';
import { motion } from 'framer-motion';

export default function GameScreen() {
  const { gameState } = useStore();
  const boardRef = useRef(null);
  const initRef = useRef(false);

  // Initialize sound + start music on first click
  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      const handler = () => {
        soundManager.init();
        soundManager.startMusic();
        document.removeEventListener('click', handler);
      };
      document.addEventListener('click', handler);
    }
    return () => {
      soundManager.stopMusic();
    };
  }, []);

  const { currentAnimation, isAnimating, announcement } = useAnimationQueue(
    gameState?.animations
  );

  if (!gameState) return null;

  const myId = gameState.myId;
  const myPlayer = gameState.players[myId];
  const isMyTurn = gameState.currentPlayerId === myId;

  const { positions, layout } = usePlayerLayout(gameState.turnOrder, myId);

  // Organize opponents by position
  const opponents = Object.entries(gameState.players)
    .filter(([id]) => id !== myId)
    .map(([id, player]) => ({
      id,
      player,
      position: positions[id] || 'top',
    }));

  const topOpponents = opponents.filter(o => o.position.startsWith('top'));
  const leftOpponent = opponents.find(o => o.position === 'left');
  const rightOpponent = opponents.find(o => o.position === 'right');

  // Screen shake on big damage
  const isShaking = currentAnimation?.type === 'damage' && currentAnimation.amount >= 500;
  const isScreenShake = currentAnimation?.type === 'destroy';

  const compact = opponents.length >= 3;

  return (
    <motion.div
      ref={boardRef}
      className="h-screen flex flex-col overflow-hidden select-none"
      animate={isShaking || isScreenShake ? {
        x: [0, -4, 4, -3, 3, 0],
        transition: { duration: isScreenShake ? 0.25 : 0.15 }
      } : {}}
    >
      {/* Turn banner */}
      {isMyTurn && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 animate-pulse">
          <div className="bg-[var(--color-gold)]/90 text-black font-display text-2xl px-8 py-2 rounded-lg shadow-lg">
            YOUR TURN
          </div>
        </div>
      )}

      {/* Opponent fields */}
      <div className="flex-1 flex flex-col overflow-auto">
        {/* Side + top layout for 4+ players */}
        {(leftOpponent || rightOpponent) ? (
          <div className="flex flex-1">
            {/* Left opponent */}
            {leftOpponent && (
              <div className="w-48 shrink-0 p-1">
                <PlayerField
                  player={leftOpponent.player}
                  playerId={leftOpponent.id}
                  isOpponent={true}
                  isCurrentTurn={gameState.currentPlayerId === leftOpponent.id}
                  compact={true}
                />
              </div>
            )}

            {/* Top opponents (center) */}
            <div className="flex-1 flex flex-col gap-1 p-2">
              <div className={`flex gap-1 ${topOpponents.length > 2 ? 'justify-between' : 'justify-center'}`}>
                {topOpponents.map(({ id, player }) => (
                  <div key={id} className="flex-1 max-w-md">
                    <PlayerField
                      player={player}
                      playerId={id}
                      isOpponent={true}
                      isCurrentTurn={gameState.currentPlayerId === id}
                      compact={compact}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Right opponent */}
            {rightOpponent && (
              <div className="w-48 shrink-0 p-1">
                <PlayerField
                  player={rightOpponent.player}
                  playerId={rightOpponent.id}
                  isOpponent={true}
                  isCurrentTurn={gameState.currentPlayerId === rightOpponent.id}
                  compact={true}
                />
              </div>
            )}
          </div>
        ) : (
          // 2-3 players: opponents across top
          <div className={`flex gap-1 p-2 ${topOpponents.length > 1 ? 'justify-between' : 'justify-center'}`}>
            {topOpponents.map(({ id, player }) => (
              <div key={id} className={topOpponents.length > 1 ? 'flex-1 max-w-md' : 'flex-1'}>
                <PlayerField
                  player={player}
                  playerId={id}
                  isOpponent={true}
                  isCurrentTurn={gameState.currentPlayerId === id}
                  compact={compact}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Divider */}
      <div className="h-px bg-[var(--color-gold)]/30 mx-4" />

      {/* My field */}
      <div className="p-2">
        <PlayerField
          player={myPlayer}
          playerId={myId}
          isOpponent={false}
          isCurrentTurn={isMyTurn}
        />
      </div>

      {/* My hand */}
      <HandBar />

      {/* HUD overlay */}
      <GameHUD />

      {/* Target picker overlay */}
      {gameState.pendingTarget && <TargetPicker />}

      {/* Card choice modal (Dead Meme, Woke) */}
      {gameState.pendingChoice && <CardChoiceModal />}

      {/* Game over */}
      {gameState.winner && <GameOverModal />}

      {/* Card zoom panel */}
      <CardZoom />

      {/* Help panel */}
      <HelpPanel />

      {/* Card play announcement */}
      <CardAnnouncement announcement={announcement} />
    </motion.div>
  );
}
