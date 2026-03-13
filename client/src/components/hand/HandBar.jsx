import { useStore } from '../../store.js';
import CardInHand from './CardInHand.jsx';

export default function HandBar() {
  const { gameState, selectedCard, drawCard, endTurn, buyAP } = useStore();

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

  return (
    <div className="relative bg-gray-950/90 border-t border-gray-800 px-2 py-2">
      <div className="flex gap-1 justify-center items-end overflow-x-auto pb-1 pr-40">
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
