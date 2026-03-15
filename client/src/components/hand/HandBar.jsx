import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useStore } from '../../store.js';
import { motion, AnimatePresence } from 'framer-motion';
import CardInHand from './CardInHand.jsx';
import ActivityLog from '../ui/ActivityLog.jsx';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import { ICONS, TYPE_ICON } from '../ui/icons.js';
import { THEME_EFFECTS } from '../../../../shared/src/constants.js';
import { soundManager } from '../../audio/SoundManager.js';
import { hasActivatedAbility } from '../ui/abilityInfo.js';

const REACTION_ABILITIES = ['stfu_silence', 'lagg_delay'];
const TYPE_ORDER = { Creature: 0, Magic: 1, Armour: 2, Tricks: 3 };

function MobileCardInfoPanel({ card, onClose, onPlaceCreature, onPlayNonCreature }) {
  const { playCard, discardCard, gameState, tutorialEngine } = useStore();
  const [confirmAction, setConfirmAction] = useState(null);

  const myId = gameState?.myId;
  const myPlayer = myId ? gameState.players[myId] : null;
  const isMyTurn = gameState?.currentPlayerId === myId;
  const isInMyHand = myPlayer?.hand?.some(c => c.uid === card.uid);
  // In tutorial, only allow playing the highlighted card
  const tutStepConfig = tutorialEngine ? tutorialEngine.getStepConfig() : null;
  const isTutorialBlocked = tutorialEngine && tutStepConfig?.highlightCardUid && tutStepConfig.highlightCardUid !== card.uid;
  const isTutorialHighlighted = tutorialEngine && tutStepConfig?.highlightCardUid === card.uid;
  const canPlay = isInMyHand && isMyTurn && !isTutorialBlocked;
  const canDiscard = isInMyHand && isMyTurn && !isTutorialBlocked;

  const themeEffects = THEME_EFFECTS[gameState?.theme] || THEME_EFFECTS.swamp;
  const effectiveCost = card.type === 'Magic' && card.cost !== undefined && themeEffects.spellCostMultiplier !== undefined
    ? Math.floor(card.cost * themeEffects.spellCostMultiplier)
    : card.cost;
  const costModified = effectiveCost !== card.cost;
  const canAfford = effectiveCost === 0 || (myPlayer?.ap >= effectiveCost);

  return (
    <motion.div
      key={card.uid}
      className={`mx-3 mb-2 rounded-xl overflow-hidden shadow-2xl ${
        isTutorialHighlighted
          ? 'relative z-50 border-2 border-[var(--color-gold)] ring-2 ring-[var(--color-gold)]/50 bg-gray-900/95 shadow-[0_0_20px_rgba(212,175,55,0.3)]'
          : 'border border-gray-700 bg-gray-950/95'
      }`}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0.95, opacity: 0 }}
      transition={{ duration: 0.1, ease: 'easeOut' }}
    >
      <div className="flex gap-2 p-2">
        {/* Card image thumbnail */}
        {card.image && (
          <div className={`w-[80px] h-[112px] rounded-lg overflow-hidden shrink-0 border ${
            isTutorialHighlighted ? 'border-[var(--color-gold)]/60 shadow-[0_0_8px_rgba(212,175,55,0.4)]' : 'border-gray-700'
          }`}>
            <img src={`/cards/${card.image}`} alt={card.name} className="w-full h-[155%] object-cover object-top" style={isTutorialHighlighted ? { filter: 'brightness(1.15)' } : undefined} draggable={false} />
          </div>
        )}

        {/* Card info */}
        <div className="flex-1 min-w-0 space-y-1">
          <div>
            <h3 className="font-display text-[14px] text-white leading-tight truncate">{card.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[11px]">{TYPE_ICON[card.type]}</span>
              <span className="text-[11px] text-gray-400">{card.type}</span>
              {card.cost !== undefined && (
                <span className={`text-[11px] ml-auto font-bold ${effectiveCost === 0 ? 'text-green-400' : costModified ? 'text-red-400' : 'text-blue-300'}`}>
                  {effectiveCost === 0 ? 'FREE' : `${effectiveCost} AP`}
                </span>
              )}
            </div>
          </div>

          {/* Creature stats */}
          {card.type === 'Creature' && (
            <div className="flex gap-2 text-[11px]">
              <span className="text-red-400 font-bold">{ICONS.swords} {card.attack}</span>
              <span className="text-blue-400 font-bold">{ICONS.shield} {card.defence}</span>
              <span className="text-yellow-400 font-bold">{ICONS.coin} {card.sp}</span>
            </div>
          )}

          {/* Armour info */}
          {card.type === 'Armour' && (
            <div className="text-[11px] text-gray-300 space-y-0.5">
              <div>Slot: <span className="text-white capitalize">{card.slot}</span> | Set: <span className="text-purple-300 capitalize">{card.set}</span></div>
              {card.shieldAmount && <div>Shield: <span className="text-green-400">+{card.shieldAmount}</span></div>}
              {card.incomeAmount && <div>Income: <span className="text-yellow-400">+{card.incomeAmount} SP/turn</span></div>}
              {card.discountAmount && <div>Discount: <span className="text-blue-400">-{card.discountAmount} SP</span></div>}
              {card.blockedType && <div>Blocks: <span className="text-red-400">{card.blockedType}</span></div>}
            </div>
          )}

          {/* Ability indicator */}
          {card.abilityId && (
            <div className="text-[10px] text-yellow-400 flex items-center gap-1">
              <span>{ICONS.lightning}</span>
              {hasActivatedAbility(card.abilityId) ? 'Activated ability' : 'Special ability'}
            </div>
          )}
        </div>
      </div>

      {/* Effect text */}
      {card.effect && (
        <div className="text-[11px] text-gray-300 leading-relaxed px-2 pb-1.5 border-t border-gray-800 pt-1.5 mx-1">
          {card.effect}
        </div>
      )}

      {/* Tutorial: wrong card hint */}
      {isTutorialBlocked && tutStepConfig?.highlightCardUid && (
        <div className="px-2 pb-2 pt-1">
          <div className="bg-[var(--color-gold)]/10 border border-[var(--color-gold)]/40 rounded-lg py-2 text-center">
            <span className="text-[var(--color-gold)] text-[11px] font-bold">
              Swipe to find the highlighted card
            </span>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {canPlay && (
        <div className="px-2 pb-2 pt-1">
          {confirmAction === 'discard' ? (
            <div className="bg-red-950 border border-red-700 rounded-lg p-2 space-y-1.5">
              <p className="text-[11px] text-red-200 text-center">Discard {card.name}? Cannot be undone.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmAction(null)} className="flex-1 bg-gray-700 text-white font-bold py-1.5 rounded text-[11px]">Cancel</button>
                <button onClick={() => discardCard(card.uid)} className="flex-1 bg-red-700 text-white font-bold py-1.5 rounded text-[11px]">Confirm</button>
              </div>
            </div>
          ) : (
            <div className="flex gap-1.5">
              {card.type === 'Creature' ? (
                <button
                  onClick={onPlaceCreature}
                  disabled={!canAfford}
                  data-tutorial={isTutorialHighlighted ? 'play-btn' : undefined}
                  className="flex-1 bg-green-800 disabled:bg-gray-800 disabled:text-gray-600 border border-green-600 disabled:border-gray-700 text-white font-bold py-2 rounded-lg text-[12px] transition"
                >
                  Place on Field
                </button>
              ) : (
                <button
                  onClick={() => { playCard(card.uid); onPlayNonCreature?.(); }}
                  disabled={!canAfford}
                  data-tutorial={isTutorialHighlighted ? 'play-btn' : undefined}
                  className="flex-1 bg-green-800 disabled:bg-gray-800 disabled:text-gray-600 border border-green-600 disabled:border-gray-700 text-white font-bold py-2 rounded-lg text-[12px] transition"
                >
                  Play
                </button>
              )}
              {canDiscard && (
                <button
                  onClick={() => setConfirmAction('discard')}
                  className="bg-red-900/80 border border-red-700 text-red-200 font-bold px-3 py-2 rounded-lg text-[12px] transition"
                >
                  Discard
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}

function CircularCardRow({ cardRowRef, sortedHand, mobileSelectedCard, handleMobileSelect, reorderMode, reorderDragIdx, handleReorderStart, handleReorderMove, handleReorderEnd, scrollToIndex, scrollLocked }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartX = useRef(null);
  const touchStartIndex = useRef(0);
  const lastTickIndex = useRef(0);
  const isDragging = useRef(false);
  const rafId = useRef(null);
  const pendingIndex = useRef(null);
  const lastSelectedIdx = useRef(-1);
  const velocityRef = useRef(0);
  const lastTouchX = useRef(null);
  const lastTouchTime = useRef(null);
  const inertiaRaf = useRef(null);
  const currentIndexRef = useRef(0); // mirror state for inertia loop
  const RADIUS = 450; // Circle radius — controls arc curvature
  const ANGLE_STEP = 7; // Degrees between cards — tighter = closer together
  const CARD_WIDTH = 90; // Match CardInHand row variant width
  const Y_OFFSET = 12; // Push cards down so tops don't overlap with buttons above
  const FRICTION = 0.92;
  const VELOCITY_THRESHOLD = 0.005;

  // Keep ref in sync with state
  useEffect(() => { currentIndexRef.current = currentIndex; }, [currentIndex]);

  const stopInertia = useCallback(() => {
    if (inertiaRaf.current) {
      cancelAnimationFrame(inertiaRaf.current);
      inertiaRaf.current = null;
    }
  }, []);

  // Clamp currentIndex when hand size changes
  useEffect(() => {
    if (sortedHand.length > 0 && currentIndex >= sortedHand.length) {
      setCurrentIndex(sortedHand.length - 1);
    }
  }, [sortedHand.length, currentIndex]);

  // External scroll-to (draw feedback, tap side card, tutorial)
  useEffect(() => {
    if (scrollToIndex !== null && scrollToIndex !== undefined && scrollToIndex !== currentIndex) {
      stopInertia();
      // Smooth lerp to target index
      const target = scrollToIndex;
      const easeToTarget = () => {
        const cur = currentIndexRef.current;
        const diff = target - cur;
        if (Math.abs(diff) < 0.005) {
          setCurrentIndex(target);
          currentIndexRef.current = target;
          inertiaRaf.current = null;
          return;
        }
        const next = cur + diff * 0.18;
        currentIndexRef.current = next;
        setCurrentIndex(next);
        inertiaRaf.current = requestAnimationFrame(easeToTarget);
      };
      inertiaRaf.current = requestAnimationFrame(easeToTarget);
    }
  }, [scrollToIndex, stopInertia]);

  // Auto-select the centred card — only when the rounded index changes
  useEffect(() => {
    if (reorderMode || sortedHand.length === 0) return;
    const idx = Math.round(Math.max(0, Math.min(currentIndex, sortedHand.length - 1)));
    if (idx === lastSelectedIdx.current) return;
    lastSelectedIdx.current = idx;
    const card = sortedHand[idx];
    if (card) handleMobileSelect(card, true);
  }, [currentIndex, sortedHand, handleMobileSelect, reorderMode]);

  const handleTouchStart = useCallback((e) => {
    if (reorderMode) return;
    stopInertia();
    touchStartX.current = e.touches[0].clientX;
    touchStartIndex.current = currentIndex;
    lastTickIndex.current = Math.round(currentIndex);
    lastTouchX.current = e.touches[0].clientX;
    lastTouchTime.current = performance.now();
    velocityRef.current = 0;
    isDragging.current = true;
  }, [currentIndex, reorderMode, stopInertia]);

  const handleTouchMove = useCallback((e) => {
    if (reorderMode || touchStartX.current === null) return;
    const touchX = e.touches[0].clientX;
    const now = performance.now();
    // Track velocity (cards per ms)
    if (lastTouchX.current !== null && lastTouchTime.current !== null) {
      const dt = now - lastTouchTime.current;
      if (dt > 0) {
        const dCards = -(touchX - lastTouchX.current) / 70; // same sensitivity
        velocityRef.current = dCards / dt;
      }
    }
    lastTouchX.current = touchX;
    lastTouchTime.current = now;

    const dx = touchX - touchStartX.current;
    const sensitivity = 70; // pixels per card
    const newIndex = touchStartIndex.current - dx / sensitivity;
    const clamped = Math.max(-0.4, Math.min(newIndex, sortedHand.length - 0.6));
    // Throttle state updates to animation frames
    pendingIndex.current = clamped;
    if (!rafId.current) {
      rafId.current = requestAnimationFrame(() => {
        rafId.current = null;
        if (pendingIndex.current !== null) {
          setCurrentIndex(pendingIndex.current);
          const rounded = Math.round(Math.max(0, Math.min(pendingIndex.current, sortedHand.length - 1)));
          if (rounded !== lastTickIndex.current) {
            lastTickIndex.current = rounded;
            soundManager.play('card_tick');
          }
        }
      });
    }
  }, [reorderMode, sortedHand.length]);

  const handleTouchEnd = useCallback(() => {
    if (touchStartX.current === null) return;
    touchStartX.current = null;
    isDragging.current = false;
    pendingIndex.current = null;
    if (rafId.current) {
      cancelAnimationFrame(rafId.current);
      rafId.current = null;
    }
    // Start inertia animation
    const maxIdx = sortedHand.length - 1;
    let vel = velocityRef.current * 16; // convert per-ms to per-frame (~16ms)
    // Cap velocity to prevent wild flings
    vel = Math.max(-3, Math.min(3, vel));
    const runInertia = () => {
      vel *= FRICTION;
      const cur = currentIndexRef.current + vel;
      const clamped = Math.max(-0.4, Math.min(cur, sortedHand.length - 0.6));
      currentIndexRef.current = clamped;
      setCurrentIndex(clamped);
      const rounded = Math.round(Math.max(0, Math.min(clamped, maxIdx)));
      if (rounded !== lastTickIndex.current) {
        lastTickIndex.current = rounded;
        soundManager.play('card_tick');
      }
      if (Math.abs(vel) > VELOCITY_THRESHOLD) {
        inertiaRaf.current = requestAnimationFrame(runInertia);
      } else {
        // Smooth ease to nearest card instead of hard snap
        const target = Math.round(Math.max(0, Math.min(currentIndexRef.current, maxIdx)));
        const easeToTarget = () => {
          const cur = currentIndexRef.current;
          const diff = target - cur;
          if (Math.abs(diff) < 0.005) {
            setCurrentIndex(target);
            currentIndexRef.current = target;
            inertiaRaf.current = null;
            return;
          }
          const next = cur + diff * 0.18;
          currentIndexRef.current = next;
          setCurrentIndex(next);
          inertiaRaf.current = requestAnimationFrame(easeToTarget);
        };
        inertiaRaf.current = requestAnimationFrame(easeToTarget);
      }
    };
    if (Math.abs(vel) > VELOCITY_THRESHOLD) {
      inertiaRaf.current = requestAnimationFrame(runInertia);
    } else {
      // Smooth ease to nearest card instead of hard snap
      const maxIdx2 = sortedHand.length - 1;
      const target = Math.round(Math.max(0, Math.min(currentIndexRef.current, maxIdx2)));
      const easeToTarget = () => {
        const cur = currentIndexRef.current;
        const diff = target - cur;
        if (Math.abs(diff) < 0.005) {
          setCurrentIndex(target);
          currentIndexRef.current = target;
          inertiaRaf.current = null;
          return;
        }
        const next = cur + diff * 0.18;
        currentIndexRef.current = next;
        setCurrentIndex(next);
        inertiaRaf.current = requestAnimationFrame(easeToTarget);
      };
      inertiaRaf.current = requestAnimationFrame(easeToTarget);
    }
  }, [sortedHand.length, FRICTION, VELOCITY_THRESHOLD]);

  // Tap side card to scroll to it
  const handleCardTap = useCallback((card, idx) => {
    const centredIdx = Math.round(Math.max(0, Math.min(currentIndex, sortedHand.length - 1)));
    if (idx !== centredIdx) {
      // Not the centred card — scroll to it
      stopInertia();
      setCurrentIndex(idx);
    } else {
      // Already centred — normal select behaviour
      handleMobileSelect(card);
    }
  }, [currentIndex, sortedHand.length, handleMobileSelect, stopInertia]);

  if (sortedHand.length === 0) {
    return <div className="text-gray-600 py-4 text-[11px] w-full text-center">No cards in hand</div>;
  }

  const containerWidth = typeof window !== 'undefined' ? window.innerWidth : 375;
  const centreX = containerWidth / 2 - CARD_WIDTH / 2;

  return (
    <div className="relative" style={{ height: '150px', overflow: 'hidden' }}>
      <div
        ref={cardRowRef}
        className="relative w-full h-full"
        onTouchStart={scrollLocked ? undefined : (reorderMode ? undefined : handleTouchStart)}
        onTouchMove={scrollLocked ? undefined : (reorderMode ? handleReorderMove || handleTouchMove : handleTouchMove)}
        onTouchEnd={scrollLocked ? undefined : (reorderMode ? handleReorderEnd || handleTouchEnd : handleTouchEnd)}
        onTouchCancel={scrollLocked ? undefined : (reorderMode ? handleReorderEnd : handleTouchEnd)}
      >
        {sortedHand.map((card, idx) => {
          const angleDeg = (idx - currentIndex) * ANGLE_STEP;
          const angleRad = (angleDeg * Math.PI) / 180;
          // Position on circle rim
          const x = centreX + RADIUS * Math.sin(angleRad);
          const y = RADIUS - RADIUS * Math.cos(angleRad);
          // Scale: centre card slightly larger, others shrink
          const scale = Math.max(0.6, 1 - Math.abs(angleDeg) / 80);
          // Opacity: gentle fade toward edges
          const opacity = Math.max(0.3, 1 - Math.abs(angleDeg) / 40);
          // z-index: centre card on top, decreasing outward
          const zIndex = 100 - Math.round(Math.abs(angleDeg));
          // Cull cards too far around the circle
          if (Math.abs(angleDeg) > 40) return null;
          const isSelected = mobileSelectedCard?.uid === card.uid;

          return (
            <div
              key={card.uid}
              data-reorder-idx={idx}
              className="absolute"
              style={{
                left: `${x}px`,
                top: `${y + Y_OFFSET}px`,
                transform: `rotate(${angleDeg}deg) scale(${scale})`,
                transformOrigin: 'center bottom',
                opacity,
                zIndex,
                willChange: 'transform, opacity',
                transition: isDragging.current ? 'none' : 'transform 0.25s ease-out, opacity 0.25s ease-out',
              }}
            >
              <div onTouchStart={reorderMode ? () => handleReorderStart(idx) : undefined}>
                <CardInHand
                  card={card}
                  isSelected={isSelected}
                  variant="row"
                  onSelect={reorderMode ? undefined : (c) => handleCardTap(c, idx)}
                  disableTouch={reorderMode}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function HandBar() {
  const { gameState, selectedCard, selectCard, drawCard, endTurn, buyAP } = useStore();
  const handArc = useStore(s => s.handArc);
  const isMobile = useIsMobile();

  if (!gameState) return null;

  const myPlayer = gameState.players[gameState.myId];
  const hand = myPlayer?.hand || [];
  const isMyTurn = gameState.currentPlayerId === gameState.myId;
  const hasReaction = !isMyTurn && hand.some(c => REACTION_ABILITIES.includes(c.abilityId));
  const currentPlayerName = isMyTurn ? null : Object.values(gameState.players).find(p => p.id === gameState.currentPlayerId)?.name;

  // Compute effective Buy AP cost (Hessian discount)
  let buyAPCost = 1000;
  for (const slot of ['head', 'body', 'feet']) {
    const armour = myPlayer.gear?.[slot];
    if (armour?.abilityId === 'hessian_discount') {
      buyAPCost -= armour.discountAmount || 0;
    }
  }
  buyAPCost = Math.max(0, buyAPCost);
  const canBuyAP = myPlayer.sp >= buyAPCost;

  // Mobile: collapsed/expanded hand (no tabs)
  const [handExpanded, setHandExpanded] = useState(false);
  const [mobileSelectedCard, setMobileSelectedCard] = useState(null);
  const cardRowRef = useRef(null);

  // Tutorial store values (useEffect that depends on sortedHand is below, after sortedHand declaration)
  const tutorialEngine = useStore(s => s.tutorialEngine);
  const tutorialPaused = useStore(s => s.tutorialPaused);
  const tutorialHighlightUid = tutorialEngine ? tutorialEngine.getStepConfig()?.highlightCardUid : null;
  const tutorialTabHint = tutorialEngine ? tutorialEngine.getStepConfig()?.tabHint : null;

  // Track hand count for draw flash on collapsed strip
  const prevHandCount = useRef(hand.length);
  const [stripFlash, setStripFlash] = useState(false);
  useEffect(() => {
    if (hand.length > prevHandCount.current && !handExpanded) {
      setStripFlash(true);
      const t = setTimeout(() => setStripFlash(false), 800);
      prevHandCount.current = hand.length;
      return () => clearTimeout(t);
    }
    prevHandCount.current = hand.length;
  }, [hand.length, handExpanded]);

  // Sorting: null = custom/default order, 'type' = by category, 'cost' = by AP cost
  const [sortMode, setSortMode] = useState(null);
  // Custom order: array of uids representing manual arrangement
  const [customOrder, setCustomOrder] = useState(null);
  // Reorder mode toggle (replaces long-press)
  const [reorderMode, setReorderMode] = useState(false);

  // When new cards appear, append them to custom order
  useEffect(() => {
    const handUids = hand.map(c => c.uid);
    setCustomOrder(prev => {
      if (!prev) return handUids;
      // Keep existing order, remove gone cards, append new ones
      const kept = prev.filter(uid => handUids.includes(uid));
      const newUids = handUids.filter(uid => !prev.includes(uid));
      return [...kept, ...newUids];
    });
  }, [hand]);

  // Compute effective cost for sorting (theme-aware)
  const themeEffects = THEME_EFFECTS[gameState?.theme] || THEME_EFFECTS.swamp;
  const getEffectiveCost = useCallback((card) => {
    if (card.type === 'Magic' && themeEffects.spellCostMultiplier !== undefined) {
      return Math.floor(card.cost * themeEffects.spellCostMultiplier);
    }
    return card.cost;
  }, [themeEffects]);

  const sortedHand = useMemo(() => {
    if (sortMode === 'type') {
      return [...hand].sort((a, b) => (TYPE_ORDER[a.type] ?? 9) - (TYPE_ORDER[b.type] ?? 9) || getEffectiveCost(a) - getEffectiveCost(b));
    }
    if (sortMode === 'cost') {
      return [...hand].sort((a, b) => getEffectiveCost(a) - getEffectiveCost(b));
    }
    // Custom/default order
    if (customOrder) {
      const orderMap = {};
      customOrder.forEach((uid, i) => orderMap[uid] = i);
      return [...hand].sort((a, b) => (orderMap[a.uid] ?? 999) - (orderMap[b.uid] ?? 999));
    }
    return hand;
  }, [hand, sortMode, customOrder, getEffectiveCost]);

  // Draw card feedback: scroll carousel to newly drawn card
  const [carouselScrollTo, setCarouselScrollTo] = useState(null);
  const prevHandCountExpanded = useRef(hand.length);
  useEffect(() => {
    if (handExpanded && hand.length > prevHandCountExpanded.current) {
      // New card drawn while expanded — scroll to it after React renders
      const timer = setTimeout(() => setCarouselScrollTo(sortedHand.length - 1), 50);
      prevHandCountExpanded.current = hand.length;
      return () => clearTimeout(timer);
    }
    prevHandCountExpanded.current = hand.length;
  }, [hand.length, handExpanded, sortedHand.length]);
  // Clear scrollTo after it's consumed
  useEffect(() => {
    if (carouselScrollTo !== null) {
      const t = setTimeout(() => setCarouselScrollTo(null), 100);
      return () => clearTimeout(t);
    }
  }, [carouselScrollTo]);

  // Tutorial: auto-expand and scroll fan to highlighted card
  // (must be after sortedHand + carouselScrollTo declarations to avoid TDZ)
  useEffect(() => {
    if (!isMobile || !tutorialEngine || tutorialPaused) return;
    const config = tutorialEngine.getStepConfig();
    if (config.highlightCardUid || config.tabHint) {
      setHandExpanded(true);
      // Scroll fan to highlighted card after expansion
      if (config.highlightCardUid) {
        setTimeout(() => {
          const idx = sortedHand.findIndex(c => c.uid === config.highlightCardUid);
          if (idx >= 0) setCarouselScrollTo(idx);
        }, 300);
      }
    }
  }, [tutorialEngine, isMobile, tutorialHighlightUid, tutorialTabHint, tutorialPaused, sortedHand]);

  // Auto-collapse when hand empties
  useEffect(() => {
    if (hand.length === 0 && handExpanded) setHandExpanded(false);
  }, [hand.length, handExpanded]);

  // Clear mobile selection if card leaves hand
  useEffect(() => {
    if (mobileSelectedCard && !hand.some(c => c.uid === mobileSelectedCard.uid)) {
      setMobileSelectedCard(null);
    }
  }, [hand, mobileSelectedCard]);

  const handleMobileSelect = useCallback((card, fromScroll) => {
    if (fromScroll) {
      // Scroll-based auto-select: always set, never toggle off
      setMobileSelectedCard(prev => prev?.uid === card.uid ? prev : card);
    } else {
      setMobileSelectedCard(prev => prev?.uid === card.uid ? null : card);
    }
  }, []);

  // Drag reorder state
  const dragIdx = useRef(null);
  const dragOverIdx = useRef(null);
  const [reorderDragIdx, setReorderDragIdx] = useState(null);

  const handleReorderStart = useCallback((idx) => {
    dragIdx.current = idx;
    setReorderDragIdx(idx);
    if (navigator.vibrate) navigator.vibrate(30);
  }, []);

  const handleReorderMove = useCallback((e) => {
    if (dragIdx.current === null || !cardRowRef.current) return;
    const touch = e.touches[0];
    const cards = cardRowRef.current.querySelectorAll('[data-reorder-idx]');
    for (const el of cards) {
      const rect = el.getBoundingClientRect();
      if (touch.clientX >= rect.left && touch.clientX <= rect.right) {
        const overIdx = parseInt(el.getAttribute('data-reorder-idx'), 10);
        if (overIdx !== dragOverIdx.current && overIdx !== dragIdx.current) {
          dragOverIdx.current = overIdx;
        }
        break;
      }
    }
  }, []);

  const handleReorderEnd = useCallback(() => {
    if (dragIdx.current !== null && dragOverIdx.current !== null && dragIdx.current !== dragOverIdx.current) {
      setCustomOrder(prev => {
        if (!prev) return prev;
        const sorted = sortMode ? sortedHand.map(c => c.uid) : prev;
        const newOrder = [...sorted];
        const [moved] = newOrder.splice(dragIdx.current, 1);
        newOrder.splice(dragOverIdx.current, 0, moved);
        return newOrder;
      });
      setSortMode(null); // Switch to custom mode after manual reorder
    }
    dragIdx.current = null;
    dragOverIdx.current = null;
    setReorderDragIdx(null);
  }, [sortMode, sortedHand]);

  const cycleSortMode = useCallback(() => {
    setSortMode(prev => prev === null ? 'type' : prev === 'type' ? 'cost' : null);
    setReorderMode(false);
  }, []);

  const toggleReorderMode = useCallback(() => {
    setReorderMode(prev => !prev);
    setSortMode(null); // Reorder only works in custom order
  }, []);

  if (isMobile) {
    return (
      <div className={`relative shrink-0 ${tutorialHighlightUid ? 'z-50' : 'z-30'}`}>
        {/* Reaction banner — always visible */}
        {hasReaction && (
          <div className="bg-orange-600/20 border border-orange-500/40 rounded px-2 py-0.5 mx-1 mb-0.5 text-center animate-[pulse_0.6s_ease-in-out_2]">
            <span className="text-orange-300 text-[9px] font-bold">REACT to {currentPlayerName}'s turn!</span>
          </div>
        )}

        {/* Expanded overlay backdrop — lighter dim */}
        <AnimatePresence>
          {handExpanded && (
            <motion.div
              className="fixed inset-0 bg-black/40 z-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              onClick={() => { setHandExpanded(false); setMobileSelectedCard(null); setReorderMode(false); }}
            />
          )}
        </AnimatePresence>

        {/* Collapsed strip */}
        {!handExpanded && (
          <div
            className={`bg-gray-950/90 border-t border-gray-800 px-2 py-1 ${
              stripFlash ? 'ring-2 ring-[var(--color-gold)] animate-[pulse_0.3s_ease-in-out_2]' : ''
            }`}
            onClick={() => { if (hand.length > 0) { setHandExpanded(true); selectCard(null); } }}
          >
            {/* Action buttons row — right-aligned above strip */}
            <div className="flex items-center justify-between mb-1">
              <span className="text-gray-500 text-[10px]">{hand.length} card{hand.length !== 1 ? 's' : ''} — tap to view</span>
              <div className="flex gap-0.5">
                <button
                  onClick={(e) => { e.stopPropagation(); drawCard(); }}
                  disabled={!isMyTurn || myPlayer.ap < 1}
                  data-tutorial="draw-btn"
                  className="bg-blue-700 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold px-3 py-1.5 rounded text-[11px] transition"
                >
                  Draw
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); buyAP(); }}
                  disabled={!isMyTurn || !canBuyAP}
                  data-tutorial="buy-ap-btn"
                  className="bg-purple-700 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold px-3 py-1.5 rounded text-[11px] transition"
                >
                  Buy
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); endTurn(); }}
                  disabled={!isMyTurn}
                  data-tutorial="end-turn-btn"
                  className="bg-[var(--color-gold)] disabled:bg-gray-800 disabled:text-gray-600 text-black font-bold px-3 py-1.5 rounded text-[11px] transition"
                >
                  End
                </button>
              </div>
            </div>
            {/* Overlapping card tops */}
            <div className="flex items-center pl-1 h-[34px]">
              {hand.length > 0 ? sortedHand.map(card => (
                <CardInHand key={card.uid} card={card} variant="collapsed" />
              )) : (
                <span className="text-gray-600 text-[10px]">No cards</span>
              )}
            </div>
          </div>
        )}

        {/* Expanded panel — transparent, cards float over dimmed field */}
        <AnimatePresence>
          {handExpanded && (
            <motion.div
              className={`fixed bottom-0 left-0 right-0 ${tutorialHighlightUid ? 'z-50' : 'z-30'}`}
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              {/* Collapse handle */}
              <div
                className="flex justify-center py-1.5 cursor-pointer"
                onClick={() => { setHandExpanded(false); setMobileSelectedCard(null); setReorderMode(false); }}
              >
                <div className="w-10 h-1 bg-gray-500/60 rounded-full" />
              </div>

              {/* Selected card info panel */}
              <AnimatePresence mode="wait">
                {mobileSelectedCard && hand.some(c => c.uid === mobileSelectedCard.uid) && (
                  <MobileCardInfoPanel
                    key={mobileSelectedCard.uid}
                    card={mobileSelectedCard}
                    onClose={() => setMobileSelectedCard(null)}
                    onPlaceCreature={() => {
                      selectCard(mobileSelectedCard);
                      setMobileSelectedCard(null);
                      setHandExpanded(false);
                    }}
                    onPlayNonCreature={() => {
                      setMobileSelectedCard(null);
                      setHandExpanded(false);
                    }}
                  />
                )}
              </AnimatePresence>

              {/* Action buttons + sort + custom row */}
              <div className="flex justify-center items-center gap-1.5 px-2 pb-2">
                <button
                  onClick={drawCard}
                  disabled={!isMyTurn || myPlayer.ap < 1}
                  data-tutorial="draw-btn"
                  className="bg-blue-700 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold px-4 py-2 rounded text-[12px] transition"
                >
                  Draw
                </button>
                <button
                  onClick={buyAP}
                  disabled={!isMyTurn || !canBuyAP}
                  data-tutorial="buy-ap-btn"
                  className="bg-purple-700 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold px-4 py-2 rounded text-[12px] transition"
                >
                  Buy
                </button>
                <button
                  onClick={() => { endTurn(); setHandExpanded(false); setMobileSelectedCard(null); }}
                  disabled={!isMyTurn}
                  data-tutorial="end-turn-btn"
                  className="bg-[var(--color-gold)] disabled:bg-gray-800 disabled:text-gray-600 text-black font-bold px-4 py-2 rounded text-[12px] transition"
                >
                  End
                </button>
                <div className="w-px h-6 bg-gray-700 mx-0.5" />
                <button
                  onClick={cycleSortMode}
                  className={`px-3 py-2 rounded text-[11px] font-bold transition ${
                    sortMode ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  {sortMode === 'type' ? 'Type' : sortMode === 'cost' ? 'Cost' : 'Sort'}
                </button>
                <button
                  onClick={toggleReorderMode}
                  className={`px-3 py-2 rounded text-[11px] font-bold transition ${
                    reorderMode ? 'bg-[var(--color-gold)] text-black' : 'bg-gray-800 text-gray-400'
                  }`}
                >
                  Custom
                </button>
              </div>

              {/* Horizontal scrollable card row with subtle background */}
              <div className="bg-black/30 rounded-t-lg mx-1">
                {reorderMode && (
                  <div className="text-center text-[10px] text-gray-400 pt-1">Drag cards to reorder</div>
                )}
                <CircularCardRow
                  cardRowRef={cardRowRef}
                  sortedHand={sortedHand}
                  mobileSelectedCard={mobileSelectedCard}
                  handleMobileSelect={handleMobileSelect}
                  reorderMode={reorderMode}
                  reorderDragIdx={reorderDragIdx}
                  handleReorderStart={handleReorderStart}
                  handleReorderMove={handleReorderMove}
                  handleReorderEnd={handleReorderEnd}
                  scrollToIndex={carouselScrollTo}
                  scrollLocked={!!tutorialHighlightUid}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Desktop layout — rotation around distant origin creates natural arc
  const desktopArcTransforms = useMemo(() => {
    if (!handArc || hand.length <= 1) return null;
    const n = hand.length;
    const mid = (n - 1) / 2;
    const intensity = handArc / 100;
    // Total arc grows with card count, capped at 45 degrees
    const totalArc = Math.min(n * 4, 45) * intensity;
    return hand.map((_, i) => {
      const t = n > 1 ? (i - mid) / ((n - 1) / 2) : 0; // -1 to 1
      const rotation = t * (totalArc / 2);
      return { rotation };
    });
  }, [handArc, hand.length]);

  return (
    <div className="relative bg-gray-950/90 border-t border-gray-800 px-2 py-2 shrink-0 overflow-visible z-30">
      {/* Reaction banner */}
      {hasReaction && (
        <div className="bg-orange-600/20 border border-orange-500/40 rounded px-3 py-1.5 mb-2 text-center animate-[pulse_0.6s_ease-in-out_2] shadow-[0_0_8px_rgba(234,88,12,0.3)]">
          <span className="text-orange-300 text-sm font-bold">You can react to {currentPlayerName}'s turn! Click a REACT card to interrupt.</span>
        </div>
      )}
      <div className="flex items-end gap-2">
        {/* Activity log — inline bottom-left */}
        <div className="shrink-0 self-end" style={{ width: '240px' }}>
          <ActivityLog />
        </div>
        {/* Cards */}
        <div className="flex justify-center items-end overflow-x-auto overflow-y-visible pb-1 flex-1 pr-40">
          {hand.map((card, idx) => {
            const arc = desktopArcTransforms?.[idx];
            return (
              <div
                key={card.uid}
                style={{
                  marginLeft: idx === 0 ? '0' : '-20px',
                  zIndex: idx,
                  ...(arc ? { transform: `rotate(${arc.rotation}deg)`, transformOrigin: 'center 500px' } : {}),
                }}
              >
                <CardInHand
                  card={card}
                  isSelected={selectedCard?.uid === card.uid}
                />
              </div>
            );
          })}
          {hand.length === 0 && (
            <div className="text-gray-600 py-4">No cards in hand</div>
          )}
        </div>
      </div>
      {isMyTurn && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-1.5">
          <button
            onClick={drawCard}
            disabled={myPlayer.ap < 1}
            data-tutorial="draw-btn"
            className="bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition text-[13px] whitespace-nowrap"
          >
            Draw (1 AP)
          </button>
          <button
            onClick={buyAP}
            disabled={!canBuyAP}
            data-tutorial="buy-ap-btn"
            className="bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition text-[13px] whitespace-nowrap"
          >
            Buy AP ({buyAPCost} SP)
          </button>
          <button
            onClick={endTurn}
            data-tutorial="end-turn-btn"
            className="bg-[var(--color-gold)] hover:bg-yellow-400 text-black font-bold py-3 px-6 rounded-lg shadow-lg transition text-[14px] whitespace-nowrap"
          >
            End Turn
          </button>
        </div>
      )}
    </div>
  );
}
