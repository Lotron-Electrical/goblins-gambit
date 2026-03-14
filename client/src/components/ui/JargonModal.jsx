import { useStore } from '../../store.js';

export default function JargonModal({ graveyardCount, onClose }) {
  const { buyFromJargon, gameState } = useStore();
  const myId = gameState?.myId;
  const myPlayer = gameState?.players?.[myId];
  const isMyTurn = gameState?.currentPlayerId === myId;

  const handleBuy = () => {
    buyFromJargon();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70" onClick={onClose}>
      <div
        className="bg-gray-900 border-2 border-purple-600 rounded-xl p-5 max-w-sm w-full mx-4 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-purple-400 font-display text-xl">&#x1F9D9; Jargon the Vendor</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-lg">x</button>
        </div>

        <div className="text-gray-300 text-sm mb-4">
          Buy a random card from the graveyard. Cost = card's AP cost x 100 SP (min 100 SP).
          You don't choose — Jargon picks!
        </div>

        <div className="bg-gray-800 rounded-lg p-3 mb-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Cards in Graveyard</span>
            <span className="text-purple-400 font-bold">{graveyardCount}</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-400">Your SP</span>
            <span className="text-yellow-400 font-bold">{myPlayer?.sp || 0} SP</span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-400">Estimated Cost</span>
            <span className="text-gray-300">100-300 SP</span>
          </div>
        </div>

        {isMyTurn && graveyardCount > 0 ? (
          <button
            onClick={handleBuy}
            disabled={(myPlayer?.sp || 0) < 100}
            className="w-full bg-purple-700 hover:bg-purple-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-2.5 rounded-lg transition"
          >
            Buy Random Card
          </button>
        ) : (
          <div className="text-gray-500 text-sm text-center">
            {graveyardCount === 0 ? 'Graveyard is empty' : 'Wait for your turn to buy'}
          </div>
        )}
      </div>
    </div>
  );
}
