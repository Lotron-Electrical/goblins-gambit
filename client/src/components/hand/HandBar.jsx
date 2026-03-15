import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useStore } from '../../store.js';
import { motion, AnimatePresence } from 'framer-motion';
import CardInHand from './CardInHand.jsx';
import ActivityLog from '../ui/ActivityLog.jsx';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import { TYPE_ICON } from '../ui/icons.js';
import { THEME_EFFECTS } from '../../../../shared/src/constants.js';

const REACTION_ABILITIES = ['stfu_silence', 'lagg_delay'];
const TYPE_ORDER = { Creature: 0, Magic: 1, Armour: 2, Tricks: 3 };

function ScrollableCardRow({ cardRowRef, sortedHand, mobileSelectedCard, handleMobileSelect, reorderDragIdx, handleReorderStart, handleReorderMove, handleReorderEnd, sortMode }) {
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = useCallback(() => {
    const el = cardRowRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 5);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 5);
  }, [cardRowRef]);

  useEffect(() => {
    const el = cardRowRef.current;
    if (!el) return;
    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    return () => { el.removeEventListener('scroll', checkScroll); ro.disconnect(); };
  }, [cardRowRef, checkScroll, sortedHand.length]);

  return (
    <div className="relative">
      {/* Left scroll indicator */}
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-gray-950/90 to-transparent z-10 flex items-center justify-start pl-0.5 pointer-events-none">
          <span className="text-gray-400 text-[16px] animate-pulse">&lsaquo;</span>
        </div>
      )}
      {/* Right scroll indicator */}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-gray-950/90 to-transparent z-10 flex items-center justify-end pr-0.5 pointer-events-none">
          <span className="text-gray-400 text-[16px] animate-pulse">&rsaquo;</span>
        </div>
      )}
      <div
        ref={cardRowRef}
        className="flex items-end overflow-x-auto px-3 pb-3 pt-1"
        style={{ WebkitOverflowScrolling: 'touch' }}
        onTouchMove={handleReorderMove}
        onTouchEnd={handleReorderEnd}
        onTouchCancel={handleReorderEnd}
      >
        {sortedHand.length > 0 ? sortedHand.map((card, idx) => (
          <div
            key={card.uid}
            data-reorder-idx={idx}
            style={{ marginRight: '-15px' }}
            className={`shrink-0 transition-transform ${reorderDragIdx === idx ? 'scale-110 opacity-70 z-20' : ''}`}
            onTouchStart={(e) => {
              // Long-press to initiate reorder (separate from card long-press zoom)
              // We use a data attribute so the card's own touch handlers work normally
            }}
          >
            <div
              onTouchStart={(e) => {
                if (!sortMode) {
                  // Start a reorder timer — if held without moving for 500ms
                  const timer = setTimeout(() => handleReorderStart(idx, e), 500);
                  e.currentTarget._reorderTimer = timer;
                }
              }}
              onTouchEnd={(e) => {
                if (e.currentTarget._reorderTimer) {
                  clearTimeout(e.currentTarget._reorderTimer);
                  e.currentTarget._reorderTimer = null;
                }
              }}
              onTouchMove={(e) => {
                if (e.currentTarget._reorderTimer) {
                  clearTimeout(e.currentTarget._reorderTimer);
                  e.currentTarget._reorderTimer = null;
                }
              }}
            >
              <CardInHand
                card={card}
                isSelected={mobileSelectedCard?.uid === card.uid}
                variant="row"
                onSelect={handleMobileSelect}
              />
            </div>
          </div>
        )) : (
          <div className="text-gray-600 py-4 text-[11px] w-full text-center">No cards in hand</div>
        )}
        {sortedHand.length > 0 && <div className="shrink-0 w-4" />}
      </div>
    </div>
  );
}

export default function HandBar() {
  const { gameState, selectedCard, drawCard, endTurn, buyAP } = useStore();
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

  // Tutorial: auto-expand and scroll to highlighted card
  const tutorialEngine = useStore(s => s.tutorialEngine);
  const tutorialHighlightUid = tutorialEngine ? tutorialEngine.getStepConfig()?.highlightCardUid : null;
  const tutorialTabHint = tutorialEngine ? tutorialEngine.getStepConfig()?.tabHint : null;
  useEffect(() => {
    if (!isMobile || !tutorialEngine) return;
    const config = tutorialEngine.getStepConfig();
    if (config.highlightCardUid || config.tabHint) {
      setHandExpanded(true);
      // Scroll to highlighted card after expansion
      if (config.highlightCardUid) {
        setTimeout(() => {
          const el = cardRowRef.current?.querySelector(`[data-card-uid="${config.highlightCardUid}"]`);
          el?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }, 300);
      }
    }
  }, [tutorialEngine, isMobile, tutorialHighlightUid, tutorialTabHint]);

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

  const handleMobileSelect = useCallback((card) => {
    setMobileSelectedCard(prev => prev?.uid === card.uid ? null : card);
  }, []);

  // Sorting: null = custom/default order, 'type' = by category, 'cost' = by AP cost
  const [sortMode, setSortMode] = useState(null);
  // Custom order: array of uids representing manual arrangement
  const [customOrder, setCustomOrder] = useState(null);

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

  // Drag reorder state
  const dragIdx = useRef(null);
  const dragOverIdx = useRef(null);
  const [reorderDragIdx, setReorderDragIdx] = useState(null);

  const handleReorderStart = useCallback((idx, e) => {
    if (sortMode) return; // Only allow manual reorder in custom mode
    dragIdx.current = idx;
    setReorderDragIdx(idx);
    // Haptic feedback if available
    if (navigator.vibrate) navigator.vibrate(30);
  }, [sortMode]);

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
  }, []);

  if (isMobile) {
    return (
      <div className="relative shrink-0 z-30">
        {/* Reaction banner — always visible */}
        {hasReaction && (
          <div className="bg-orange-600/20 border border-orange-500/40 rounded px-2 py-0.5 mx-1 mb-0.5 text-center animate-[pulse_0.6s_ease-in-out_2]">
            <span className="text-orange-300 text-[9px] font-bold">REACT to {currentPlayerName}'s turn!</span>
          </div>
        )}

        {/* Expanded overlay backdrop */}
        <AnimatePresence>
          {handExpanded && (
            <motion.div
              className="fixed inset-0 bg-black/60 z-20"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => { setHandExpanded(false); setMobileSelectedCard(null); }}
            />
          )}
        </AnimatePresence>

        {/* Collapsed strip */}
        {!handExpanded && (
          <div
            className={`bg-gray-950/90 border-t border-gray-800 px-2 py-1 ${
              stripFlash ? 'ring-2 ring-[var(--color-gold)] animate-[pulse_0.3s_ease-in-out_2]' : ''
            }`}
            onClick={() => hand.length > 0 && setHandExpanded(true)}
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

        {/* Expanded panel */}
        <AnimatePresence>
          {handExpanded && (
            <motion.div
              className="fixed bottom-0 left-0 right-0 z-30 bg-gray-950/95 border-t border-gray-700 rounded-t-xl"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            >
              {/* Collapse handle */}
              <div
                className="flex justify-center py-1.5 cursor-pointer"
                onClick={() => { setHandExpanded(false); setMobileSelectedCard(null); }}
              >
                <div className="w-10 h-1 bg-gray-600 rounded-full" />
              </div>

              {/* Selected card popup */}
              <AnimatePresence mode="wait">
                {mobileSelectedCard && hand.some(c => c.uid === mobileSelectedCard.uid) && (
                  <motion.div
                    key={mobileSelectedCard.uid}
                    className="flex justify-center pb-2"
                    initial={{ scale: 0.8, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.8, opacity: 0, y: 20 }}
                    transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                  >
                    <CardInHand
                      card={mobileSelectedCard}
                      isSelected={true}
                      variant="popup"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Action buttons + sort row */}
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
                  onClick={endTurn}
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
              </div>

              {/* Horizontal scrollable card row with scroll indicators */}
              <ScrollableCardRow
                cardRowRef={cardRowRef}
                sortedHand={sortedHand}
                mobileSelectedCard={mobileSelectedCard}
                handleMobileSelect={handleMobileSelect}
                reorderDragIdx={reorderDragIdx}
                handleReorderStart={handleReorderStart}
                handleReorderMove={handleReorderMove}
                handleReorderEnd={handleReorderEnd}
                sortMode={sortMode}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

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
        <div className="flex gap-1 justify-center items-end overflow-x-auto overflow-y-visible pb-1 flex-1 pr-40">
          {hand.map((card) => (
            <CardInHand
              key={card.uid}
              card={card}
              isSelected={selectedCard?.uid === card.uid}
            />
          ))}
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
