import { useStore } from '../../store.js';
import CardInHand from './CardInHand.jsx';
import ActivityLog from '../ui/ActivityLog.jsx';
import { useIsMobile } from '../../hooks/useIsMobile.js';

export default function HandBar() {
  const { gameState, selectedCard, drawCard, endTurn, buyAP } = useStore();
  const isMobile = useIsMobile();

  if (!gameState) return null;

  const myPlayer = gameState.players[gameState.myId];
  const hand = myPlayer?.hand || [];
  const isMyTurn = gameState.currentPlayerId === gameState.myId;

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

  if (isMobile) {
    return (
      <div className="relative bg-gray-950/90 border-t border-gray-800 px-1 py-1 shrink-0 overflow-visible z-30">
        {/* Cards row */}
        <div className="flex gap-0.5 justify-start items-end overflow-x-auto overflow-y-visible pb-1 px-1">
          {hand.map((card) => (
            <CardInHand
              key={card.uid}
              card={card}
              isSelected={selectedCard?.uid === card.uid}
            />
          ))}
          {hand.length === 0 && (
            <div className="text-gray-600 py-2 text-[11px]">No cards in hand</div>
          )}
        </div>
        {/* Action buttons — horizontal row below cards */}
        {isMyTurn && (
          <div className="flex gap-1.5 px-1 pt-1">
            <button
              onClick={drawCard}
              disabled={myPlayer.ap < 1}
              className="flex-1 bg-blue-700 hover:bg-blue-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-1.5 rounded-lg shadow transition text-[11px]"
            >
              Draw
            </button>
            <button
              onClick={buyAP}
              disabled={!canBuyAP}
              className="flex-1 bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-1.5 rounded-lg shadow transition text-[11px]"
            >
              Buy AP
            </button>
            <button
              onClick={endTurn}
              className="flex-1 bg-[var(--color-gold)] hover:bg-yellow-400 text-black font-bold py-1.5 rounded-lg shadow transition text-[12px]"
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
