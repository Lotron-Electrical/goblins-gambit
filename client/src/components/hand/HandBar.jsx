import { useState, useEffect, useRef, useCallback } from 'react';
import { useStore } from '../../store.js';
import { motion, AnimatePresence } from 'framer-motion';
import CardInHand from './CardInHand.jsx';
import ActivityLog from '../ui/ActivityLog.jsx';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import { TYPE_ICON } from '../ui/icons.js';

const REACTION_ABILITIES = ['stfu_silence', 'lagg_delay'];

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
              {hand.length > 0 ? hand.map(card => (
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

              {/* Action buttons row */}
              <div className="flex justify-center gap-1.5 px-2 pb-2">
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
              </div>

              {/* Horizontal scrollable card row */}
              <div
                ref={cardRowRef}
                className="flex items-end overflow-x-auto px-3 pb-3 pt-1 gap-[-15px]"
                style={{ WebkitOverflowScrolling: 'touch' }}
              >
                {hand.length > 0 ? hand.map(card => (
                  <div key={card.uid} style={{ marginRight: '-15px' }} className="shrink-0">
                    <CardInHand
                      card={card}
                      isSelected={mobileSelectedCard?.uid === card.uid}
                      variant="row"
                      onSelect={handleMobileSelect}
                    />
                  </div>
                )) : (
                  <div className="text-gray-600 py-4 text-[11px] w-full text-center">No cards in hand</div>
                )}
                {/* Spacer so last card isn't cut off */}
                {hand.length > 0 && <div className="shrink-0 w-4" />}
              </div>
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
