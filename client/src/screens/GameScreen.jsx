import { useEffect, useRef, useState, useCallback } from "react";
import { useStore } from "../store.js";
import { useAnimationQueue } from "../hooks/useAnimationQueue.js";
import useMusicDirector from "../hooks/useMusicDirector.js";
import { soundManager } from "../audio/SoundManager.js";
import { useIsMobile } from "../hooks/useIsMobile.js";
import PlayerField from "../components/board/PlayerField.jsx";
import CenterZone from "../components/board/CenterZone.jsx";
import HandBar from "../components/hand/HandBar.jsx";
import GameHUD from "../components/ui/GameHUD.jsx";
import GameMenu from "../components/ui/GameMenu.jsx";
import TargetPicker from "../components/ui/TargetPicker.jsx";
import CardZoom from "../components/ui/CardZoom.jsx";
import CardHoverPreview from "../components/ui/CardHoverPreview.jsx";
import CardAnnouncement from "../components/ui/CardAnnouncement.jsx";
import GameOverModal from "../components/ui/GameOverModal.jsx";
import GraveyardModal from "../components/ui/GraveyardModal.jsx";
import HelpPanel from "../components/ui/HelpPanel.jsx";
import CardChoiceModal from "../components/ui/CardChoiceModal.jsx";
import DamageNumber from "../components/ui/DamageNumber.jsx";
import DiceRoll from "../components/ui/DiceRoll.jsx";
import FieldParticles from "../components/ui/FieldParticles.jsx";
import SPParticles from "../components/ui/SPParticles.jsx";
import MobileActivityLog from "../components/ui/MobileActivityLog.jsx";
import ChatPanel from "../components/ui/ChatPanel.jsx";
import DragOverlay from "../components/ui/DragOverlay.jsx";
import { motion, AnimatePresence } from "framer-motion";

// Compact opponent bar for mobile — shows key info, tap to expand
function OpponentBar({
  player,
  playerId,
  isCurrentTurn,
  isExpanded,
  onTap,
  gameState,
}) {
  const creatureCount = player.swamp?.length || 0;
  const spPct = gameState?.winSP
    ? Math.min(100, (player.sp / gameState.winSP) * 100)
    : 0;
  return (
    <div
      onClick={onTap}
      className={`flex items-center justify-between px-2.5 py-2 rounded-xl cursor-pointer transition-all duration-200 border ${
        isCurrentTurn
          ? "bg-[var(--color-swamp)]/60 border-[var(--color-gold)]/30 shadow-sm shadow-[var(--color-gold)]/10"
          : "bg-gray-900/50 border-gray-800/40"
      } ${isExpanded ? "border-blue-500/40 bg-gray-900/70" : ""}`}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        {player.playerShield > 0 && (
          <span className="text-cyan-400 text-[9px] font-bold shrink-0">
            {player.playerShield}Sh
          </span>
        )}
        <span className="text-red-400 font-display font-bold text-[11px] truncate max-w-[100px]">
          {player.name}
        </span>
        {isCurrentTurn && (
          <span className="text-[var(--color-gold)] text-[9px] font-display shrink-0">
            TURN
          </span>
        )}
      </div>
      <div className="flex items-center gap-2 text-[10px]">
        <span className="text-gray-500">{creatureCount} creat.</span>
        <span className="text-yellow-400 font-bold">{player.sp} SP</span>
        <span className="text-blue-300 font-medium">{player.ap} AP</span>
        {/* SP mini progress */}
        <div className="w-8 h-1 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-yellow-500 rounded-full transition-all duration-500"
            style={{ width: `${spPct}%` }}
          />
        </div>
        <span className="text-gray-600 text-[8px]">
          {isExpanded ? "\u25B2" : "\u25BC"}
        </span>
      </div>
    </div>
  );
}

export default function GameScreen() {
  const { gameState, musicMuted, theme, tutorialMode, setCenterZoneY } =
    useStore();
  const error = useStore((s) => s.error);
  const clearError = useStore((s) => s.clearError);
  const boardRef = useRef(null);
  const midZoneRef = useRef(null);
  const isMobile = useIsMobile();
  const centerZoneY = useStore((s) => s.centerZoneY);

  // Lock body scroll on mobile while game is active
  useEffect(() => {
    document.documentElement.classList.add("game-active");
    return () => document.documentElement.classList.remove("game-active");
  }, []);

  // Track vertical center of the mid-zone (between opponents and my field)
  useEffect(() => {
    if (!midZoneRef.current) return;
    const update = () => {
      const rect = midZoneRef.current?.getBoundingClientRect();
      if (rect) setCenterZoneY(Math.round(rect.top + rect.height / 2));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(midZoneRef.current);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  // Apply saved theme on mount + sync to sound manager
  useEffect(() => {
    if (theme && theme !== "swamp") {
      document.documentElement.setAttribute("data-theme", theme);
    }
    soundManager.setTheme(theme);
    return () => {
      document.documentElement.removeAttribute("data-theme");
    };
  }, [theme]);

  // Initialize sound + start music
  useEffect(() => {
    const muted = useStore.getState().muted;
    const musMuted = useStore.getState().musicMuted;
    let clickHandler = null;

    // If audio already initialized (from lobby), start music immediately
    if (soundManager.initialized) {
      soundManager.setMuted(muted);
      if (!musMuted) soundManager.startMusic();
    } else {
      // Need a click to unlock AudioContext
      clickHandler = () => {
        soundManager.init();
        soundManager.setMuted(muted);
        if (!musMuted) soundManager.startMusic();
        document.removeEventListener("click", clickHandler);
        clickHandler = null;
      };
      document.addEventListener("click", clickHandler);
    }
    return () => {
      soundManager.stopMusic();
      if (clickHandler) document.removeEventListener("click", clickHandler);
    };
  }, []);

  useMusicDirector();

  // Start ambient sounds on mount
  useEffect(() => {
    const handler = () => {
      soundManager.startAmbient();
    };
    document.addEventListener("click", handler, { once: true });
    return () => {
      document.removeEventListener("click", handler);
      soundManager.stopAmbient();
    };
  }, []);

  // Mobile: activity log toggle (driven from HUD button)
  const [mobileLogOpen, setMobileLogOpen] = useState(false);

  // Chat panel
  const { setChatOpen: storeChatOpen, chatOpen } = useStore();
  const handleSetChatOpen = useCallback(
    (open) => {
      storeChatOpen(open);
      if (open) setMobileLogOpen(false); // close log when opening chat
    },
    [storeChatOpen],
  );
  const handleSetMobileLogOpen = useCallback(
    (open) => {
      setMobileLogOpen(open);
      if (open) storeChatOpen(false); // close chat when opening log
    },
    [storeChatOpen],
  );

  // Close chat when game ends
  useEffect(() => {
    if (gameState?.winner && chatOpen) {
      storeChatOpen(false);
    }
  }, [gameState?.winner]);

  // Mobile: track which opponent is expanded (defaults to current turn player)
  const [expandedOpponent, setExpandedOpponent] = useState(null);
  const prevTurnRef = useRef(null);
  const opponentScrollRef = useRef(null);

  // Auto-expand: opponent whose turn it is, or first opponent when it's my turn
  useEffect(() => {
    if (!isMobile || !gameState) return;
    const currentId = gameState.currentPlayerId;
    if (currentId !== prevTurnRef.current) {
      prevTurnRef.current = currentId;
      if (currentId !== gameState.myId) {
        setExpandedOpponent(currentId);
      } else {
        // My turn — auto-expand first opponent so I can see their creatures
        const firstOpponent = Object.keys(gameState.players).find(
          (id) => id !== gameState.myId,
        );
        if (firstOpponent) setExpandedOpponent(firstOpponent);
      }
    }
  }, [gameState?.currentPlayerId, isMobile, gameState]);

  // Auto-scroll to show expanded opponent field
  useEffect(() => {
    if (!isMobile || !expandedOpponent || !opponentScrollRef.current) return;
    // Small delay to let the DOM render the expanded field
    const timer = setTimeout(() => {
      const el = opponentScrollRef.current?.querySelector(
        `[data-opponent="${expandedOpponent}"]`,
      );
      if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }, 50);
    return () => clearTimeout(timer);
  }, [expandedOpponent, isMobile]);

  // Tutorial: auto-scroll opponent into view during attack steps
  const tutorialEngine = useStore((s) => s.tutorialEngine);
  useEffect(() => {
    if (!isMobile || !tutorialEngine || !opponentScrollRef.current) return;
    const config = tutorialEngine.getStepConfig();
    if (config.expectedAction === "attack") {
      // Scroll opponent field into view so the player can see the target
      const timer = setTimeout(() => {
        const opEl =
          opponentScrollRef.current?.querySelector("[data-opponent]");
        if (opEl) opEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isMobile, tutorialEngine, tutorialEngine?.getCurrentStep()]);

  const { currentAnimation, isAnimating, announcement } = useAnimationQueue(
    gameState?.animations,
  );

  // Staged card stack (shown in center when played)
  const [stagedCards, setStagedCards] = useState([]);
  const stagedIdRef = useRef(0);

  // Draw card reveal animation
  const [drawnCard, setDrawnCard] = useState(null); // { card, phase: 'reveal'|'fly' }

  // VFX state
  const [activeDamages, setActiveDamages] = useState([]);
  const [spEvents, setSPEvents] = useState([]);
  const [diceData, setDiceData] = useState(null);
  const [attackLine, setAttackLine] = useState(null);
  const damageIdRef = useRef(0);
  const spIdRef = useRef(0);

  // Cache creature positions so attack lines work even after killed creatures leave the DOM
  const cardPositionCache = useRef({});
  useEffect(() => {
    const update = () => {
      document.querySelectorAll("[data-card-uid]").forEach((el) => {
        const uid = el.getAttribute("data-card-uid");
        const rect = el.getBoundingClientRect();
        if (rect.width > 0) {
          cardPositionCache.current[uid] = {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
          };
        }
      });
    };
    update();
  }, [gameState]);

  const { setAttackAnimation, clearAttackAnimation } = useStore();
  const attackDrag = useStore((s) => s.attackDrag);

  // Wire damage numbers to animation events
  useEffect(() => {
    if (!currentAnimation) return;

    // Attack animation: set attacking/defending card UIDs + attack line
    if (currentAnimation.type === "attack" && currentAnimation.attacker) {
      setAttackAnimation(currentAnimation.attacker, currentAnimation.defender);

      // Capture DOM positions for attack line SVG
      const isDirect = !!currentAnimation.directAttack;

      // Get attacker position (from DOM or cache)
      const attackerEl = document.querySelector(
        `[data-card-uid="${currentAnimation.attacker}"]`,
      );
      let fromPos = attackerEl
        ? (() => {
            const r = attackerEl.getBoundingClientRect();
            return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
          })()
        : cardPositionCache.current[currentAnimation.attacker];

      // Get defender position (from DOM or cache; direct attacks target SP counter)
      let toPos = null;
      if (isDirect) {
        const spEl = document.querySelector(
          `[data-player-sp="${currentAnimation.defender}"]`,
        );
        if (spEl) {
          const r = spEl.getBoundingClientRect();
          toPos = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
        }
      } else {
        const defenderEl = document.querySelector(
          `[data-card-uid="${currentAnimation.defender}"]`,
        );
        toPos = defenderEl
          ? (() => {
              const r = defenderEl.getBoundingClientRect();
              return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
            })()
          : cardPositionCache.current[currentAnimation.defender];
      }

      // For direct attacks, find the attacker's owner SP counter for the return line
      let ownerSpPos = null;
      if (isDirect) {
        // The attacker creature belongs to whichever player's swamp it's in
        for (const [pid, p] of Object.entries(gameState.players)) {
          if (p.swamp?.some((c) => c.uid === currentAnimation.attacker)) {
            const ownerSpEl = document.querySelector(
              `[data-player-sp="${pid}"]`,
            );
            if (ownerSpEl) {
              const r = ownerSpEl.getBoundingClientRect();
              ownerSpPos = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
            }
            break;
          }
        }
      }

      if (fromPos && toPos) {
        const lineData = {
          from: fromPos,
          to: toPos,
          ownerPos: ownerSpPos, // SP counter of the attacking player
          killshot: !!currentAnimation.killshot,
          direct: isDirect,
          phase: isDirect ? "out" : null, // direct attacks: "out" then "return"
        };
        setAttackLine(lineData);

        if (isDirect) {
          // Phase 1 (0-500ms): cyan line out. Phase 2 (500ms+): gold return only.
          setTimeout(
            () =>
              setAttackLine((prev) =>
                prev ? { ...prev, phase: "return" } : null,
              ),
            500,
          );
          setTimeout(() => setAttackLine(null), 1200);
          setTimeout(() => soundManager.play("coin_clink"), 700);
        } else {
          setTimeout(
            () => setAttackLine(null),
            currentAnimation.killshot ? 600 : 400,
          );
        }
      }

      setTimeout(() => clearAttackAnimation(), 350);
    }

    // Draw card reveal: show card in center then fly to hand
    if (
      currentAnimation.type === "draw_card" &&
      currentAnimation.card &&
      currentAnimation.playerId === gameState?.myId &&
      !animationsOff
    ) {
      setDrawnCard({ card: currentAnimation.card, phase: "reveal" });
      setTimeout(() => {
        // Calculate fly target: hand strip on mobile, card row on desktop
        let flyTarget = null;
        const stripEl = document.querySelector("[data-hand-strip]");
        if (stripEl) {
          const r = stripEl.getBoundingClientRect();
          flyTarget = { x: r.left + r.width * 0.3, y: r.top + r.height / 2 };
        }
        setDrawnCard((prev) =>
          prev ? { ...prev, phase: "fly", flyTarget } : null,
        );
      }, 600);
      setTimeout(() => setDrawnCard(null), 1100);
    }

    // Stage played cards briefly in center
    if (
      currentAnimation.type === "card_played" &&
      currentAnimation.card &&
      currentAnimation.card.type !== "Creature"
    ) {
      const id = ++stagedIdRef.current;
      const rotation = (Math.random() - 0.5) * 10; // -5 to +5 degrees
      setStagedCards((prev) => [
        ...prev,
        { ...currentAnimation.card, _stagedId: id, _rotation: rotation },
      ]);
      setTimeout(() => {
        setStagedCards((prev) => prev.filter((c) => c._stagedId !== id));
      }, 5000);
    }

    if (currentAnimation.type === "damage" && currentAnimation.amount) {
      const cardUid = currentAnimation.targetUid || currentAnimation.cardUid;
      // Find card DOM element position
      let x = "50%";
      let y = "40%";
      if (cardUid) {
        const el = document.querySelector(`[data-card-uid="${cardUid}"]`);
        if (el) {
          const rect = el.getBoundingClientRect();
          x = rect.left + rect.width / 2;
          y = rect.top + rect.height / 3;
        } else if (cardPositionCache.current[cardUid]) {
          x = cardPositionCache.current[cardUid].x;
          y = cardPositionCache.current[cardUid].y - 10;
        }
      }
      const id = ++damageIdRef.current;
      const dmg = { id, cardUid, x, y, amount: -currentAnimation.amount };
      setActiveDamages((prev) => [...prev, dmg]);
      setTimeout(() => {
        setActiveDamages((prev) => prev.filter((d) => d.id !== id));
      }, 800);
    }

    if (currentAnimation.type === "sp_change" && currentAnimation.amount > 0) {
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
      setSPEvents((prev) => [
        ...prev,
        { id, x, y, amount: currentAnimation.amount },
      ]);
      setTimeout(() => {
        setSPEvents((prev) => prev.filter((e) => e.id !== id));
      }, 1000);
    }

    if (currentAnimation.type === "dice_roll") {
      setDiceData({
        dice: currentAnimation.dice || [
          currentAnimation.roll1 || 1,
          currentAnimation.roll2 || 1,
        ],
        result: currentAnimation.result || currentAnimation.outcome || "",
      });
    }
  }, [currentAnimation, setAttackAnimation, clearAttackAnimation]);

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

  const animationsOff = useStore((s) => s.animationsOff);

  // Screen shake on big damage
  const isShaking =
    !animationsOff &&
    currentAnimation?.type === "damage" &&
    currentAnimation.amount >= 500;
  const isScreenShake = !animationsOff && currentAnimation?.type === "destroy";

  const compact = opponents.length >= 3;

  return (
    <motion.div
      ref={boardRef}
      className="h-dvh flex flex-col overflow-hidden select-none relative bg-gradient-to-b from-gray-950/40 via-transparent to-gray-950/40"
      animate={
        isShaking || isScreenShake
          ? {
              x: [0, -4, 4, -3, 3, 0],
              transition: { duration: isScreenShake ? 0.25 : 0.15 },
            }
          : {}
      }
    >
      {/* Field particles behind everything */}
      <FieldParticles />

      {/* Opponent fields */}
      {isMobile ? (
        <div
          ref={opponentScrollRef}
          className="flex-1 overflow-y-auto p-1 pt-12 min-h-0"
        >
          <div className="flex flex-col gap-1">
            {opponents.map(({ id, player }) => {
              const isExpanded = expandedOpponent === id;
              const isTurn = gameState.currentPlayerId === id;
              const is1v1 = opponents.length === 1;
              return (
                <div key={id} data-opponent={id}>
                  {!is1v1 && (
                    <OpponentBar
                      player={player}
                      playerId={id}
                      isCurrentTurn={isTurn}
                      isExpanded={isExpanded}
                      onTap={() => setExpandedOpponent(isExpanded ? null : id)}
                      gameState={gameState}
                    />
                  )}
                  {(is1v1 || isExpanded) && (
                    <div
                      className={is1v1 ? "" : "mt-1"}
                      data-opponent-field={id}
                    >
                      <PlayerField
                        player={player}
                        playerId={id}
                        isOpponent={true}
                        isCurrentTurn={isTurn}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden p-2 pt-12 min-h-0">
          <div
            className="grid gap-2.5"
            style={{
              gridTemplateColumns:
                opponents.length <= 3
                  ? `repeat(${opponents.length}, 1fr)`
                  : `repeat(${Math.ceil(opponents.length / 2)}, 1fr)`,
            }}
          >
            {opponents.map(({ id, player }) => (
              <div key={id} className="min-w-0" data-opponent-field={id}>
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
      )}

      {/* Center zone: deck + graveyard */}
      <div ref={midZoneRef}>
        <CenterZone
          deckCount={gameState.deckCount}
          graveyardCount={gameState.graveyardCount}
          graveyard={gameState.graveyard || []}
          stagedCards={stagedCards}
          volcano={gameState.volcano}
          dragon={gameState.dragon}
          jargon={gameState.jargon}
        />
      </div>

      {/* My field */}
      <div className="p-1.5 md:p-2.5 shrink-0">
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
      <GameHUD
        mobileLogOpen={mobileLogOpen}
        setMobileLogOpen={handleSetMobileLogOpen}
        chatOpen={chatOpen}
        setChatOpen={handleSetChatOpen}
      />
      <GameMenu />

      {/* Target picker overlay */}
      {gameState.pendingTarget && (
        <TargetPicker mobileCenterY={isMobile ? centerZoneY : null} />
      )}

      {/* Card choice modal (Dead Meme, Woke) */}
      {gameState.pendingChoice && (
        <CardChoiceModal mobileCenterY={isMobile ? centerZoneY : null} />
      )}

      {/* Game over (not during tutorial — TutorialOverlay handles victory) */}
      {gameState.winner && !tutorialMode && <GameOverModal />}

      {/* Card zoom panel */}
      <CardZoom />

      {/* Card hover preview */}
      <CardHoverPreview />

      {/* Graveyard modal */}
      <GraveyardModal />

      {/* Help panel */}
      <HelpPanel />

      {/* Mobile activity log */}
      {isMobile && (
        <MobileActivityLog
          expanded={mobileLogOpen}
          onClose={() => handleSetMobileLogOpen(false)}
        />
      )}

      {/* Chat panel */}
      <ChatPanel expanded={chatOpen} onClose={() => handleSetChatOpen(false)} />

      {/* Card play announcement */}
      <CardAnnouncement
        announcement={announcement}
        mobileCenterY={isMobile ? centerZoneY : null}
      />

      {/* VFX overlays */}
      <DamageNumber damages={activeDamages} />
      <SPParticles spEvents={spEvents} />
      {diceData && (
        <DiceRoll
          dice={diceData.dice}
          result={diceData.result}
          onComplete={handleDiceComplete}
          mobileCenterY={isMobile ? centerZoneY : null}
        />
      )}

      {/* In-game error toast — centered between deck and grave */}
      <AnimatePresence>
        {error && (
          <motion.div
            key="game-error"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="fixed left-1/2 -translate-x-1/2 z-50 pointer-events-auto"
            style={{ top: centerZoneY ? `${centerZoneY}px` : "50%" }}
          >
            {(() => {
              const isInfo = /\b(reconnected|disconnected)\b/i.test(error);
              return (
                <div
                  className={`px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm whitespace-nowrap ${
                    isInfo
                      ? "bg-blue-900/90 border border-blue-500 text-blue-100"
                      : "bg-amber-900/90 border border-amber-500 text-amber-100"
                  }`}
                  onClick={clearError}
                  style={{ cursor: "pointer" }}
                >
                  <span className={isInfo ? "text-blue-300" : "text-amber-300"}>
                    {isInfo ? "\u2139" : "!"}
                  </span>
                  <span>{error}</span>
                </div>
              );
            })()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drag and drop overlay */}
      <DragOverlay />

      {/* Attack drag line (draw-a-line to attack) */}
      {attackDrag && (
        <svg
          style={{
            position: "fixed",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
            zIndex: 45,
          }}
        >
          <defs>
            <linearGradient
              id="attack-drag-grad"
              x1={attackDrag.from.x}
              y1={attackDrag.from.y}
              x2={attackDrag.to.x}
              y2={attackDrag.to.y}
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
            <filter id="attack-drag-glow">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* Glow line */}
          <line
            x1={attackDrag.from.x}
            y1={attackDrag.from.y}
            x2={attackDrag.to.x}
            y2={attackDrag.to.y}
            stroke="url(#attack-drag-grad)"
            strokeWidth="8"
            strokeLinecap="round"
            filter="url(#attack-drag-glow)"
            opacity="0.4"
          />
          {/* Main line */}
          <line
            x1={attackDrag.from.x}
            y1={attackDrag.from.y}
            x2={attackDrag.to.x}
            y2={attackDrag.to.y}
            stroke="url(#attack-drag-grad)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {/* Endpoint circle */}
          <circle
            cx={attackDrag.to.x}
            cy={attackDrag.to.y}
            r="8"
            fill="#ef4444"
            opacity="0.6"
          />
          {/* Crosshair at endpoint */}
          <circle
            cx={attackDrag.to.x}
            cy={attackDrag.to.y}
            r="12"
            fill="none"
            stroke="#ef4444"
            strokeWidth="1.5"
            opacity="0.5"
          />
        </svg>
      )}

      {/* Attack line SVG overlay */}
      {attackLine &&
        !animationsOff &&
        (() => {
          const k = attackLine.killshot;
          const d = attackLine.direct;
          const phase = attackLine.phase; // "out", "return", or null (non-direct)
          const showCyan = !d || phase === "out"; // cyan elements: non-direct always, direct only during "out"
          const showReturn = d && phase === "return"; // gold return: only during "return" phase
          const dx = attackLine.to.x - attackLine.from.x;
          const dy = attackLine.to.y - attackLine.from.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          const dur = d ? "0.5s" : k ? "0.6s" : "0.4s";
          const drawDur = d ? "0.2s" : k ? "0.15s" : "0.2s";
          // Colors: direct=holy white-cyan, killshot=white-gold, normal=red-orange
          const c1 = d ? "#ffffff" : k ? "#ffffff" : "#ef4444";
          const c2 = d ? "#67e8f9" : k ? "#fbbf24" : "#f97316";
          const blur = d ? 10 : k ? 8 : 4;
          const glowW = d ? 16 : k ? 12 : 6;
          const lineW = d ? 4 : k ? 5 : 3;
          return (
            <svg
              style={{
                position: "fixed",
                inset: 0,
                width: "100%",
                height: "100%",
                pointerEvents: "none",
                zIndex: 40,
              }}
            >
              <defs>
                <linearGradient
                  id="attack-grad"
                  x1="0%"
                  y1="0%"
                  x2="100%"
                  y2="0%"
                >
                  <stop offset="0%" stopColor={c1} />
                  <stop offset="100%" stopColor={c2} />
                </linearGradient>
                {d && (
                  <linearGradient
                    id="return-grad"
                    x1="0%"
                    y1="0%"
                    x2="100%"
                    y2="0%"
                  >
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#fbbf24" />
                  </linearGradient>
                )}
                <filter id="attack-glow">
                  <feGaussianBlur stdDeviation={blur} result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                {d && (
                  <filter id="return-glow">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                )}
              </defs>
              {/* Glow line */}
              {showCyan && (
                <line
                  x1={attackLine.from.x}
                  y1={attackLine.from.y}
                  x2={attackLine.to.x}
                  y2={attackLine.to.y}
                  stroke="url(#attack-grad)"
                  strokeWidth={glowW}
                  strokeLinecap="round"
                  filter="url(#attack-glow)"
                  opacity="0.5"
                >
                  <animate
                    attributeName="opacity"
                    values={d ? "0;0.6;0" : k ? "0;0.7;0" : "0;0.5;0"}
                    dur={d ? "0.45s" : dur}
                    fill="freeze"
                  />
                </line>
              )}
              {/* Main slash line */}
              {showCyan && (
                <line
                  x1={attackLine.from.x}
                  y1={attackLine.from.y}
                  x2={attackLine.to.x}
                  y2={attackLine.to.y}
                  stroke="url(#attack-grad)"
                  strokeWidth={lineW}
                  strokeLinecap="round"
                  strokeDasharray={`${len}`}
                  strokeDashoffset={len}
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from={len}
                    to="0"
                    dur={drawDur}
                    fill="freeze"
                  />
                  <animate
                    attributeName="opacity"
                    values="1;1;0"
                    keyTimes={d ? "0;0.8;1" : "0;0.5;1"}
                    dur={d ? "0.45s" : dur}
                    fill="freeze"
                  />
                </line>
              )}
              {/* Impact burst at endpoint */}
              {showCyan && (
                <circle
                  cx={attackLine.to.x}
                  cy={attackLine.to.y}
                  r="0"
                  fill={d ? "#67e8f9" : k ? "#fbbf24" : "#f97316"}
                  opacity="0"
                >
                  <animate
                    attributeName="r"
                    values={d ? "0;30;0" : k ? "0;24;0" : "0;12;0"}
                    dur={d ? "0.6s" : k ? "0.4s" : "0.3s"}
                    begin={d ? "0.1s" : "0.15s"}
                    fill="freeze"
                  />
                  <animate
                    attributeName="opacity"
                    values={d ? "0;0.9;0" : k ? "0;1;0" : "0;0.8;0"}
                    dur={d ? "0.6s" : k ? "0.4s" : "0.3s"}
                    begin={d ? "0.1s" : "0.15s"}
                    fill="freeze"
                  />
                </circle>
              )}
              {/* Killshot: shockwave ring */}
              {k && !d && (
                <circle
                  cx={attackLine.to.x}
                  cy={attackLine.to.y}
                  r="0"
                  fill="none"
                  stroke="#ffffff"
                  strokeWidth="2"
                  opacity="0"
                >
                  <animate
                    attributeName="r"
                    values="0;40;60"
                    dur="0.5s"
                    begin="0.2s"
                    fill="freeze"
                  />
                  <animate
                    attributeName="opacity"
                    values="0;0.6;0"
                    dur="0.5s"
                    begin="0.2s"
                    fill="freeze"
                  />
                  <animate
                    attributeName="stroke-width"
                    values="3;1;0"
                    dur="0.5s"
                    begin="0.2s"
                    fill="freeze"
                  />
                </circle>
              )}
              {/* Direct attack: expanding holy rings */}
              {d &&
                showCyan &&
                [0, 1, 2].map((i) => (
                  <circle
                    key={i}
                    cx={attackLine.to.x}
                    cy={attackLine.to.y}
                    r="0"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                    opacity="0"
                  >
                    <animate
                      attributeName="r"
                      values="0;30;50"
                      dur="0.6s"
                      begin={`${0.1 + i * 0.15}s`}
                      fill="freeze"
                    />
                    <animate
                      attributeName="opacity"
                      values={`0;${0.5 - i * 0.15};0`}
                      dur="0.6s"
                      begin={`${0.1 + i * 0.15}s`}
                      fill="freeze"
                    />
                  </circle>
                ))}
              {/* Direct attack: SP return line (gold, defender SP to attacker's owner SP) */}
              {showReturn &&
                (() => {
                  const retTarget = attackLine.ownerPos || attackLine.from;
                  const rdx = retTarget.x - attackLine.to.x;
                  const rdy = retTarget.y - attackLine.to.y;
                  const retLen = Math.sqrt(rdx * rdx + rdy * rdy);
                  return (
                    <>
                      {/* Return glow line */}
                      <line
                        x1={attackLine.to.x}
                        y1={attackLine.to.y}
                        x2={retTarget.x}
                        y2={retTarget.y}
                        stroke="url(#return-grad)"
                        strokeWidth="10"
                        strokeLinecap="round"
                        filter="url(#return-glow)"
                        opacity="0"
                      >
                        <animate
                          attributeName="opacity"
                          values="0;0.5;0"
                          dur="0.5s"
                          fill="freeze"
                        />
                      </line>
                      {/* Return main line */}
                      <line
                        x1={attackLine.to.x}
                        y1={attackLine.to.y}
                        x2={retTarget.x}
                        y2={retTarget.y}
                        stroke="url(#return-grad)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={`${retLen}`}
                        strokeDashoffset={retLen}
                      >
                        <animate
                          attributeName="stroke-dashoffset"
                          from={retLen}
                          to="0"
                          dur="0.25s"
                          fill="freeze"
                        />
                        <animate
                          attributeName="opacity"
                          values="0;1;1;0"
                          keyTimes="0;0.1;0.6;1"
                          dur="0.55s"
                          fill="freeze"
                        />
                      </line>
                      {/* SP burst at owner SP counter (gold) */}
                      <circle
                        cx={retTarget.x}
                        cy={retTarget.y}
                        r="0"
                        fill="#fbbf24"
                        opacity="0"
                      >
                        <animate
                          attributeName="r"
                          values="0;18;0"
                          dur="0.4s"
                          begin="0.25s"
                          fill="freeze"
                        />
                        <animate
                          attributeName="opacity"
                          values="0;0.8;0"
                          dur="0.4s"
                          begin="0.25s"
                          fill="freeze"
                        />
                      </circle>
                    </>
                  );
                })()}
            </svg>
          );
        })()}
      {/* Direct attack text overlay */}
      <AnimatePresence>
        {attackLine?.direct && (
          <motion.div
            key="direct-attack-text"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="fixed left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
            style={{ top: centerZoneY ? `${centerZoneY}px` : "50%" }}
          >
            <div className="text-center">
              <div
                className="font-display text-xl md:text-2xl font-bold text-transparent bg-clip-text"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, #22d3ee, #ffffff, #22d3ee)",
                  textShadow: "0 0 20px rgba(34,211,238,0.5)",
                  filter: "drop-shadow(0 0 8px rgba(34,211,238,0.6))",
                }}
              >
                Direct Attack!
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Draw card reveal overlay */}
      <AnimatePresence>
        {drawnCard && (
          <motion.div
            key="drawn-card-reveal"
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 50,
              pointerEvents: "none",
              ...(drawnCard.phase === "fly" && drawnCard.flyTarget
                ? {}
                : {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }),
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <motion.div
              className={`rounded-xl border-2 overflow-hidden shadow-2xl ${
                {
                  Creature: "border-red-500",
                  Magic: "border-blue-500",
                  Armour: "border-gray-400",
                  Tricks: "border-green-500",
                }[drawnCard.card.type] || "border-gray-500"
              }`}
              initial={{ scale: 0.3, opacity: 0, y: 40 }}
              animate={
                drawnCard.phase === "reveal"
                  ? { scale: 1, opacity: 1, y: 0 }
                  : drawnCard.flyTarget
                    ? {
                        scale: 0.15,
                        opacity: 0,
                        x: drawnCard.flyTarget.x - window.innerWidth / 2,
                        y: drawnCard.flyTarget.y - window.innerHeight / 2,
                      }
                    : { scale: 0.25, opacity: 0.6, y: 0 }
              }
              transition={
                drawnCard.phase === "reveal"
                  ? {
                      type: "spring",
                      stiffness: 300,
                      damping: 20,
                      duration: 0.4,
                    }
                  : { duration: 0.4, ease: "easeInOut" }
              }
              style={{
                width: isMobile ? 120 : 160,
                height: isMobile ? 168 : 224,
              }}
            >
              {drawnCard.card.image ? (
                <img
                  src={`/cards/${drawnCard.card.image}`}
                  alt={drawnCard.card.name}
                  className="w-full h-[155%] object-cover object-top"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full bg-gray-800 flex items-center justify-center text-white text-sm">
                  {drawnCard.card.name}
                </div>
              )}
            </motion.div>
            {drawnCard.phase === "reveal" && (
              <motion.div
                className="absolute text-white font-display text-lg drop-shadow-lg"
                style={{
                  bottom: isMobile ? "calc(50% - 110px)" : "calc(50% - 140px)",
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.3 }}
              >
                {drawnCard.card.name}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
