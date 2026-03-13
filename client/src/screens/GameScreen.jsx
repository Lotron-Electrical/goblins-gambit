import { useEffect, useRef, useState, useCallback } from 'react';
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
import ActivityLog from '../components/ui/ActivityLog.jsx';
import DamageNumber from '../components/ui/DamageNumber.jsx';
import DiceRoll from '../components/ui/DiceRoll.jsx';
import SPParticles from '../components/ui/SPParticles.jsx';
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

  // Initialize sound + start music
  useEffect(() => {
    const muted = useStore.getState().muted;
    const musMuted = useStore.getState().musicMuted;

    // If audio already initialized (from lobby), start music immediately
    if (soundManager.initialized) {
      soundManager.setMuted(muted);
      if (!musMuted) soundManager.startMusic();
    } else if (!initRef.current) {
      // First time ever — need a click to unlock AudioContext
      initRef.current = true;
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

  // Start ambient sounds on mount
  useEffect(() => {
    const handler = () => {
      soundManager.startAmbient();
    };
    document.addEventListener('click', handler, { once: true });
    return () => {
      document.removeEventListener('click', handler);
      soundManager.stopAmbient();
    };
  }, []);

  const { currentAnimation, isAnimating, announcement } = useAnimationQueue(
    gameState?.animations
  );

  // Staged card (briefly shown in center when played)
  const [stagedCard, setStagedCard] = useState(null);

  // VFX state
  const [activeDamages, setActiveDamages] = useState([]);
  const [spEvents, setSPEvents] = useState([]);
  const [diceData, setDiceData] = useState(null);
  const damageIdRef = useRef(0);
  const spIdRef = useRef(0);

  // Wire damage numbers to animation events
  useEffect(() => {
    if (!currentAnimation) return;
    // Stage played cards briefly in center
    if (currentAnimation.type === 'card_played' && currentAnimation.card) {
      setStagedCard(currentAnimation.card);
      setTimeout(() => setStagedCard(null), 1200);
    }

    if (currentAnimation.type === 'damage' && currentAnimation.amount) {
      const cardUid = currentAnimation.targetUid || currentAnimation.cardUid;
      // Find card DOM element position
      let x = '50%';
      let y = '40%';
      if (cardUid) {
        const el = document.querySelector(`[data-card-uid="${cardUid}"]`);
        if (el) {
          const rect = el.getBoundingClientRect();
          x = rect.left + rect.width / 2;
          y = rect.top + rect.height / 3;
        }
      }
      const id = ++damageIdRef.current;
      const dmg = { id, cardUid, x, y, amount: -(currentAnimation.amount) };
      setActiveDamages(prev => [...prev, dmg]);
      setTimeout(() => {
        setActiveDamages(prev => prev.filter(d => d.id !== id));
      }, 800);
    }

    if (currentAnimation.type === 'sp_change' && currentAnimation.amount > 0) {
      const playerId = currentAnimation.playerId;
      // Position near the player's SP counter
      let x = window.innerWidth / 2;
      let y = window.innerHeight * 0.35;
      if (playerId) {
        const spEl = document.querySelector(`[data-player-sp="${playerId}"]`);
        if (spEl) {
          const rect = spEl.getBoundingClientRect();
          x = rect.left + rect.width / 2;
          y = rect.top;
        }
      }
      const id = ++spIdRef.current;
      setSPEvents(prev => [...prev, { id, x, y, amount: currentAnimation.amount }]);
      setTimeout(() => {
        setSPEvents(prev => prev.filter(e => e.id !== id));
      }, 1000);
    }

    if (currentAnimation.type === 'dice_roll') {
      setDiceData({
        dice: currentAnimation.dice || [currentAnimation.roll1 || 1, currentAnimation.roll2 || 1],
        result: currentAnimation.result || currentAnimation.outcome || '',
      });
    }
  }, [currentAnimation]);

  const handleDiceComplete = useCallback(() => {
    setDiceData(null);
  }, []);

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
      <div className="flex-1 overflow-auto p-2 min-h-0">
        <div
          className="grid gap-2"
          style={{
            gridTemplateColumns:
              opponents.length <= 3
                ? `repeat(${opponents.length}, 1fr)`
                : `repeat(${Math.ceil(opponents.length / 2)}, 1fr)`,
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
        stagedCard={stagedCard}
      />

      {/* My field */}
      <div className="p-2 shrink-0">
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

      {/* Activity log */}
      <ActivityLog />

      {/* Card play announcement */}
      <CardAnnouncement announcement={announcement} />

      {/* VFX overlays */}
      <DamageNumber damages={activeDamages} />
      <SPParticles spEvents={spEvents} />
      {diceData && (
        <DiceRoll
          dice={diceData.dice}
          result={diceData.result}
          onComplete={handleDiceComplete}
        />
      )}
    </motion.div>
  );
}
