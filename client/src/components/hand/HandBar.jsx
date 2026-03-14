import { useState, useEffect, useRef } from 'react';
import { useStore } from '../../store.js';
import CardInHand from './CardInHand.jsx';
import ActivityLog from '../ui/ActivityLog.jsx';
import { useIsMobile } from '../../hooks/useIsMobile.js';
import { TYPE_ICON } from '../ui/icons.js';

const REACTION_ABILITIES = ['stfu_silence', 'lagg_delay'];

const TAB_LABELS = { Creature: 'Creat.', Magic: 'Magic', Armour: 'Armr.', Tricks: 'Tricks' };

const HAND_TABS = [
  { type: 'Creature', inactive: 'bg-red-950/40 border-red-800/50 text-red-400', active: 'bg-red-700 border-red-500 text-white' },
  { type: 'Magic', inactive: 'bg-blue-950/40 border-blue-800/50 text-blue-400', active: 'bg-blue-700 border-blue-500 text-white' },
  { type: 'Armour', inactive: 'bg-gray-900/40 border-gray-600/50 text-gray-400', active: 'bg-gray-600 border-gray-400 text-white' },
  { type: 'Tricks', inactive: 'bg-green-950/40 border-green-800/50 text-green-400', active: 'bg-green-700 border-green-500 text-white' },
];

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

  // Mobile: tabbed hand by card type
  const [activeTab, setActiveTab] = useState('Creature');

  // Track hand counts per type for draw glow
  const prevCountsRef = useRef({});
  const [glowingTabs, setGlowingTabs] = useState({});

  useEffect(() => {
    const newCounts = {};
    for (const tab of HAND_TABS) {
      newCounts[tab.type] = hand.filter(c => c.type === tab.type).length;
    }
    const prev = prevCountsRef.current;
    prevCountsRef.current = newCounts;
    if (Object.keys(prev).length > 0) {
      const glows = {};
      for (const type of Object.keys(newCounts)) {
        if (newCounts[type] > (prev[type] || 0)) {
          glows[type] = true;
        }
      }
      if (Object.keys(glows).length > 0) {
        setGlowingTabs(glows);
        const timer = setTimeout(() => setGlowingTabs({}), 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [hand.length]);

  if (isMobile) {
    const filteredCards = hand.filter(c => c.type === activeTab);
    const tabCounts = {};
    for (const tab of HAND_TABS) {
      tabCounts[tab.type] = hand.filter(c => c.type === tab.type).length;
    }

    return (
      <div className="relative bg-gray-950/90 border-t border-gray-800 shrink-0 overflow-visible z-30">
        {/* Reaction banner */}
        {hasReaction && (
          <div className="bg-orange-600/20 border border-orange-500/40 rounded px-2 py-1 mb-1 mx-1 mt-1 text-center animate-[pulse_0.6s_ease-in-out_2] shadow-[0_0_8px_rgba(234,88,12,0.3)]">
            <span className="text-orange-300 text-[10px] font-bold">You can react to {currentPlayerName}'s turn! Tap a REACT card.</span>
          </div>
        )}
        {/* Type tabs */}
        <div className="flex">
          {HAND_TABS.map(tab => {
            const isActive = activeTab === tab.type;
            const count = tabCounts[tab.type];
            const isGlowing = glowingTabs[tab.type];
            return (
              <button
                key={tab.type}
                onClick={() => setActiveTab(tab.type)}
                className={`flex-1 flex items-center justify-center gap-1 py-2.5 text-[12px] font-bold transition-colors border-b-2 ${
                  isActive ? tab.active : tab.inactive
                } ${isGlowing ? 'animate-[pulse_0.4s_ease-in-out_3] ring-1 ring-white/40' : ''}`}
              >
                <span className="text-[13px]">{TYPE_ICON[tab.type]}</span>
                <span className="truncate">{TAB_LABELS[tab.type]}</span>
                {count > 0 && (
                  <span className={`text-[10px] rounded-full min-w-[16px] h-[16px] flex items-center justify-center ${
                    isActive ? 'bg-white/20' : 'bg-gray-700'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {/* Cards for active tab */}
        <div className="flex gap-0.5 justify-start items-end overflow-x-auto overflow-y-visible pb-1 px-1 pt-1 min-h-[120px]">
          {filteredCards.map((card) => (
            <CardInHand
              key={card.uid}
              card={card}
              isSelected={selectedCard?.uid === card.uid}
            />
          ))}
          {filteredCards.length === 0 && (
            <div className="text-gray-600 py-2 text-[11px] w-full text-center">No {activeTab.toLowerCase()} cards</div>
          )}
        </div>
        {/* Action buttons — horizontal row below cards */}
        {isMyTurn && (
          <div className="flex gap-1.5 px-1 py-1">
            <button
              onClick={drawCard}
              disabled={myPlayer.ap < 1}
              className="flex-1 bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-lg shadow transition text-[12px]"
            >
              Draw
            </button>
            <button
              onClick={buyAP}
              disabled={!canBuyAP}
              className="flex-1 bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 rounded-lg shadow transition text-[12px]"
            >
              Buy AP
            </button>
            <button
              onClick={endTurn}
              className="flex-1 bg-[var(--color-gold)] hover:bg-yellow-400 text-black font-bold py-3 rounded-lg shadow transition text-[13px]"
            >
              End Turn
            </button>
          </div>
        )}
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
            className="bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition text-[13px] whitespace-nowrap"
          >
            Draw (1 AP)
          </button>
          <button
            onClick={buyAP}
            disabled={!canBuyAP}
            className="bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-2 px-4 rounded-lg shadow-lg transition text-[13px] whitespace-nowrap"
          >
            Buy AP ({buyAPCost} SP)
          </button>
          <button
            onClick={endTurn}
            className="bg-[var(--color-gold)] hover:bg-yellow-400 text-black font-bold py-3 px-6 rounded-lg shadow-lg transition text-[14px] whitespace-nowrap"
          >
            End Turn
          </button>
        </div>
      )}
    </div>
  );
}
