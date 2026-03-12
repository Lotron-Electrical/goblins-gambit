import { useStore } from '../store.js';
import { socket } from '../socket.js';

export default function RoomScreen() {
  const { currentRoom, leaveRoom, toggleReady, startGame } = useStore();

  if (!currentRoom) return null;

  const isHost = currentRoom.host === socket.id;
  const allReady = currentRoom.players.length >= 2 && currentRoom.players.every(p => p.ready);
  const myPlayer = currentRoom.players.find(p => p.id === socket.id);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <h2 className="text-3xl font-display text-[var(--color-gold-bright)] text-center mb-2">
          Game Lobby
        </h2>
        <p className="text-gray-400 text-center mb-1">
          Room: {currentRoom.id}
          {currentRoom.quickGame && <span className="text-yellow-400 ml-2">(Quick Game - 5K SP)</span>}
        </p>
        <p className="text-gray-500 text-center text-sm mb-6">
          Waiting for players... ({currentRoom.players.length}/{currentRoom.maxPlayers})
        </p>

        <div className="space-y-2 mb-8">
          {currentRoom.players.map((p) => (
            <div
              key={p.id}
              className={`flex items-center justify-between bg-gray-900/80 border rounded-lg p-4 transition ${
                p.ready ? 'border-green-500' : 'border-gray-700'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-white font-medium">{p.name}</span>
                {p.id === currentRoom.host && (
                  <span className="text-xs bg-[var(--color-gold)]/20 text-[var(--color-gold)] px-2 py-0.5 rounded">HOST</span>
                )}
              </div>
              <span className={p.ready ? 'text-green-400 font-bold' : 'text-gray-500'}>
                {p.ready ? 'READY' : 'Not Ready'}
              </span>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <button
            onClick={leaveRoom}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition"
          >
            Leave
          </button>
          <button
            onClick={toggleReady}
            className={`flex-1 font-bold py-3 px-6 rounded-lg transition ${
              myPlayer?.ready
                ? 'bg-yellow-600 hover:bg-yellow-500 text-white'
                : 'bg-green-700 hover:bg-green-600 text-white'
            }`}
          >
            {myPlayer?.ready ? 'Unready' : 'Ready Up'}
          </button>
          {isHost && (
            <button
              onClick={startGame}
              disabled={!allReady}
              className="flex-1 bg-[var(--color-gold)] hover:bg-yellow-500 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold py-3 px-6 rounded-lg transition"
            >
              Start Game
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
