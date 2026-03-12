import { useStore } from '../../store.js';
import CardInHand from './CardInHand.jsx';

export default function HandBar() {
  const { gameState, selectedCard } = useStore();

  if (!gameState) return null;

  const myPlayer = gameState.players[gameState.myId];
  const hand = myPlayer?.hand || [];

  return (
    <div className="bg-gray-950/90 border-t border-gray-800 px-2 py-2">
      <div className="flex gap-1 justify-center overflow-x-auto pb-1">
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
  );
}
