import { useEffect, useRef } from 'react';
import { useStore } from '../store.js';
import { useAnimationQueue } from '../hooks/useAnimationQueue.js';
import useMusicDirector from '../hooks/useMusicDirector.js';
import { soundManager } from '../audio/SoundManager.js';
import PlayerField from '../components/board/PlayerField.jsx';
import CenterZone from '../components/board/CenterZone.jsx';
import HandBar from '../components/hand/HandBar.jsx';
import GameHUD from '../components/ui/GameHUD.jsx';
import GameMenu from '../components/ui/GameMenu.jsx';
import TargetPicker from '../components/ui/TargetPicker.jsx';
import CardZoom from '../components/ui/CardZoom.jsx';
import CardHoverPreview from '../components/ui/CardHoverPreview.jsx';
import CardAnnouncement from '../components/ui/CardAnnouncement.jsx';
import GameOverModal from '../components/ui/GameOverModal.jsx';
import GraveyardModal from '../components/ui/GraveyardModal.jsx';
import HelpPanel from '../components/ui/HelpPanel.jsx';
import CardChoiceModal from '../components/ui/CardChoiceModal.jsx';
import { motion } from 'framer-motion';

export default function GameScreen() {
  const { gameState, musicMuted, theme } = useStore();
  const boardRef = useRef(null);
  const initRef = useRef(false);

  // Apply saved theme on mount
  useEffect(() => {
    if (theme && theme !== 'swamp') {
      document.documentElement.setAttribute('data-theme', theme);
    }
    return () => {
      document.documentElement.removeAttribute('data-theme');
    };
  }, [theme]);

  // Initialize sound + start music on first click
  useEffect(() => {
    if (!initRef.current) {
      initRef.current = true;
      const muted = useStore.getState().muted;
      const musMuted = useStore.getState().musicMuted;
      const handler = () => {
        soundManager.init();
        soundManager.setMuted(muted);
        if (!musMuted) soundManager.startMusic();
        document.removeEventListener('click', handler);
      };
      document.addEventListener('click', handler);
    }
    return () => {
      soundManager.stopMusic();
    };
  }, []);

  useMusicDirector();

  const { currentAnimation, isAnimating, announcement } = useAnimationQueue(
    gameState?.animations
  );

  if (!gameState) return null;

  const myId = gameState.myId;
  const myPlayer = gameState.players[myId];
  const isMyTurn = gameState.currentPlayerId === myId;

  const opponents = Object.entries(gameState.players)
    .filter(([id]) => id !== myId)
    .map(([id, player]) => ({ id, player }));

  const animationsOff = useStore(s => s.animationsOff);

  // Screen shake on big damage
  const isShaking = !animationsOff && currentAnimation?.type === 'damage' && currentAnimation.amount >= 500;
  const isScreenShake = !animationsOff && currentAnimation?.type === 'destroy';

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
      {/* Opponent fields */}
      <div className="flex-1 overflow-auto p-2">
        <div
          className="grid gap-2 h-full"
          style={{
            gridTemplateColumns:
              opponents.length <= 3
                ? `repeat(${opponents.length}, 1fr)`
                : `repeat(auto-fill, minmax(280px, 1fr))`,
          }}
        >
          {opponents.map(({ id, player }) => (
            <div key={id} className="min-w-0">
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

      {/* Center zone: deck + graveyard */}
      <CenterZone
        deckCount={gameState.deckCount}
        graveyardCount={gameState.graveyardCount}
        graveyard={gameState.graveyard || []}
      />

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
      <GameMenu />

      {/* Target picker overlay */}
      {gameState.pendingTarget && <TargetPicker />}

      {/* Card choice modal (Dead Meme, Woke) */}
      {gameState.pendingChoice && <CardChoiceModal />}

      {/* Game over */}
      {gameState.winner && <GameOverModal />}

      {/* Card zoom panel */}
      <CardZoom />

      {/* Card hover preview */}
      <CardHoverPreview />

      {/* Graveyard modal */}
      <GraveyardModal />

      {/* Help panel */}
      <HelpPanel />

      {/* Card play announcement */}
      <CardAnnouncement announcement={announcement} />
    </motion.div>
  );
}
