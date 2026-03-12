import { useStore } from '../../store.js';

export default function GameOverModal() {
  const { gameState } = useStore();

  if (!gameState?.winner) return null;

  const winnerPlayer = gameState.players[gameState.winner];
  const isMe = gameState.winner === gameState.myId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="text-center">
        <div className={`text-6xl font-display mb-4 ${isMe ? 'text-[var(--color-gold-bright)]' : 'text-red-500'}`}>
          {isMe ? 'VICTORY!' : 'DEFEAT'}
        </div>
        <div className="text-2xl text-white mb-2">
          {winnerPlayer.name} wins with {winnerPlayer.sp} SP!
        </div>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 bg-[var(--color-gold)] hover:bg-yellow-400 text-black font-bold py-3 px-8 rounded-lg transition text-lg"
        >
          Back to Lobby
        </button>
      </div>
    </div>
  );
}
