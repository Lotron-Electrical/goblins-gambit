import { useState } from 'react';
import { useStore } from '../store.js';
import { socket } from '../socket.js';

const THEME_OPTIONS = [
  { id: 'swamp', name: 'Swamp', icon: '\u{1F438}', desc: 'Goblin swamp — murky, squelchy, banjo', bg: 'bg-green-900/40', border: 'border-green-600', ring: 'ring-green-500' },
  { id: 'blood', name: 'Blood Moon', icon: '\u{1F319}', desc: 'Dark ritual — aggressive, pulsing dread', bg: 'bg-red-900/40', border: 'border-red-600', ring: 'ring-red-500' },
  { id: 'frost', name: 'Frost', icon: '\u{2744}\u{FE0F}', desc: 'Frozen wastes — ethereal, crystalline', bg: 'bg-blue-900/40', border: 'border-blue-600', ring: 'ring-blue-500' },
];

export default function RoomScreen() {
  const { currentRoom, leaveRoom, toggleReady, startGame, addBot, removeBot, setRoomTheme, setRoomSettings, theme } = useStore();
  const [showSettings, setShowSettings] = useState(false);

  if (!currentRoom) return null;

  const isHost = currentRoom.host === socket.id;
  const allReady = currentRoom.players.length >= 2 && currentRoom.players.every(p => p.ready);
  const myPlayer = currentRoom.players.find(p => p.id === socket.id);
  const isFull = currentRoom.players.length >= currentRoom.maxPlayers;

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
                {p.isBot && (
                  <span className="text-xs bg-purple-600/20 text-purple-400 px-2 py-0.5 rounded">BOT</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className={p.ready ? 'text-green-400 font-bold' : 'text-gray-500'}>
                  {p.ready ? 'READY' : 'Not Ready'}
                </span>
                {isHost && p.isBot && (
                  <button
                    onClick={() => removeBot(p.id)}
                    className="text-red-400 hover:text-red-300 text-sm ml-2 px-2 py-0.5 rounded bg-red-900/30 hover:bg-red-900/50 transition"
                  >
                    Kick
                  </button>
                )}
              </div>
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

        {/* Theme selector (host only) */}
        {isHost && (
          <div className="mt-4">
            <label className="block text-gray-400 text-xs mb-2 uppercase tracking-wide">Battlefield Theme</label>
            <div className="grid grid-cols-3 gap-2">
              {THEME_OPTIONS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setRoomTheme(t.id)}
                  className={`relative rounded-lg border-2 px-2 py-3 text-center transition-all duration-300 ${
                    theme === t.id
                      ? `${t.border} ${t.bg} ring-2 ${t.ring} scale-[1.03]`
                      : 'border-gray-700 bg-gray-900/60 hover:border-gray-500'
                  }`}
                >
                  <div className="text-2xl mb-1">{t.icon}</div>
                  <div className={`text-sm font-bold ${theme === t.id ? 'text-white' : 'text-gray-400'}`}>{t.name}</div>
                  <div className="text-[10px] text-gray-500 leading-tight mt-0.5 hidden md:block">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Non-host theme display */}
        {!isHost && currentRoom.theme && currentRoom.theme !== 'swamp' && (
          <div className="mt-4 text-center text-gray-400 text-sm">
            Theme: <span className="text-white font-bold">{THEME_OPTIONS.find(t => t.id === currentRoom.theme)?.name || currentRoom.theme}</span>
          </div>
        )}

        {/* Game Settings (host only) */}
        {isHost && (
          <div className="mt-4">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="w-full text-left text-gray-400 text-xs uppercase tracking-wide flex items-center justify-between hover:text-gray-300 transition"
            >
              <span>Game Settings</span>
              <span>{showSettings ? '\u25B2' : '\u25BC'}</span>
            </button>
            {showSettings && (
              <div className="mt-2 bg-gray-900/60 border border-gray-700 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-gray-300 text-sm">Starting SP</label>
                  <select
                    value={currentRoom.startingSP || 0}
                    onChange={(e) => setRoomSettings({ startingSP: Number(e.target.value) })}
                    className="bg-gray-800 border border-gray-600 text-white rounded px-2 py-1 text-sm"
                  >
                    <option value={0}>0</option>
                    <option value={500}>500</option>
                    <option value={1000}>1000</option>
                    <option value={2000}>2000</option>
                    <option value={5000}>5000</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-gray-300 text-sm">Max Players</label>
                  <select
                    value={currentRoom.maxPlayers || 6}
                    onChange={(e) => setRoomSettings({ maxPlayers: Number(e.target.value) })}
                    className="bg-gray-800 border border-gray-600 text-white rounded px-2 py-1 text-sm"
                  >
                    {[2, 3, 4, 5, 6].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-gray-300 text-sm">Starting Hand</label>
                  <select
                    value={currentRoom.startingHandSize || 5}
                    onChange={(e) => setRoomSettings({ startingHandSize: Number(e.target.value) })}
                    className="bg-gray-800 border border-gray-600 text-white rounded px-2 py-1 text-sm"
                  >
                    {[3, 4, 5, 6, 7, 8].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-gray-300 text-sm">Base AP / Turn</label>
                  <select
                    value={currentRoom.baseAP || 2}
                    onChange={(e) => setRoomSettings({ baseAP: Number(e.target.value) })}
                    className="bg-gray-800 border border-gray-600 text-white rounded px-2 py-1 text-sm"
                  >
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Add Bot button */}
        {isHost && !isFull && (
          <button
            onClick={addBot}
            className="w-full mt-4 bg-purple-700 hover:bg-purple-600 text-white font-bold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2"
          >
            <span className="text-lg">+</span> Add Bot
          </button>
        )}
      </div>
    </div>
  );
}
