import { useState, useEffect } from 'react';
import { useStore } from '../store.js';

export default function LobbyScreen() {
  const { playerName, setPlayerName, rooms, createRoom, joinRoom, refreshRooms } = useStore();
  const [name, setName] = useState(playerName || '');
  const [quickGame, setQuickGame] = useState(false);

  useEffect(() => {
    refreshRooms();
    const interval = setInterval(refreshRooms, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = () => {
    if (!name.trim()) return;
    setPlayerName(name.trim());
    createRoom({ quickGame });
  };

  const handleJoin = (roomId) => {
    if (!name.trim()) return;
    setPlayerName(name.trim());
    joinRoom(roomId);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12">
        <h1 className="text-6xl font-display text-[var(--color-gold-bright)] drop-shadow-[0_0_30px_rgba(212,160,23,0.5)] mb-2">
          Goblin's Gambit
        </h1>
        <p className="text-gray-400 text-lg">A card game of cunning and chaos</p>
      </div>

      <div className="w-full max-w-md space-y-6">
        <div>
          <label className="block text-gray-300 text-sm mb-1">Your Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter your name..."
            maxLength={20}
            className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 text-white text-lg focus:outline-none focus:border-[var(--color-gold)] transition"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="flex-1 bg-[var(--color-card-green)] hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 px-6 rounded-lg transition text-lg"
          >
            Create Game
          </button>
          <label className="flex items-center gap-2 text-gray-300 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={quickGame}
              onChange={(e) => setQuickGame(e.target.checked)}
              className="accent-[var(--color-gold)]"
            />
            Quick (5K SP)
          </label>
        </div>

        {rooms.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-display text-[var(--color-gold)] mb-3">Open Games</h2>
            <div className="space-y-2">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="bg-gray-900/80 border border-gray-700 rounded-lg p-4 flex items-center justify-between hover:border-[var(--color-gold)]/50 transition"
                >
                  <div>
                    <span className="text-white font-medium">{room.host}'s game</span>
                    <span className="text-gray-400 ml-3 text-sm">
                      {room.playerCount}/{room.maxPlayers} players
                      {room.quickGame && ' (Quick)'}
                    </span>
                  </div>
                  <button
                    onClick={() => handleJoin(room.id)}
                    disabled={!name.trim()}
                    className="bg-[var(--color-card-blue)] hover:bg-blue-600 disabled:bg-gray-700 text-white font-bold py-2 px-4 rounded transition"
                  >
                    Join
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {rooms.length === 0 && (
          <p className="text-gray-500 text-center mt-8">No open games. Create one to get started.</p>
        )}
      </div>
    </div>
  );
}
