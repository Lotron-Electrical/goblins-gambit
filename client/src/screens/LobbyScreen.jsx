import { useState, useEffect, useMemo } from 'react';
import { useStore } from '../store.js';
import { soundManager } from '../audio/SoundManager.js';
import SparkleParticles from '../components/ui/SparkleParticles.jsx';
import LeaderboardModal from '../components/ui/LeaderboardModal.jsx';

const WELCOME_LINES = [
  '{name} is ready to destroy',
  '{name} has entered the swamp',
  '{name} sharpens their claws',
  '{name} smells blood',
  '{name} crawls from the muck',
  '{name} hungers for SP',
  '{name} is here for chaos',
  'The goblins fear {name}',
  '{name} cracks their knuckles',
  '{name} has returned for vengeance',
  '{name} emerges from the shadows',
  'All tremble before {name}',
  '{name} is out for blood',
  '{name} lights the swamp fires',
  'The cards bow to {name}',
  '{name} has unfinished business',
];

export default function LobbyScreen() {
  const { playerName, setPlayerName, rooms, createRoom, joinRoom, refreshRooms, authUser, authToken, logout, startTutorial } = useStore();
  const [name, setName] = useState(playerName || '');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const isGuest = authToken === 'guest';
  const showTutorialBanner = !localStorage.getItem('gg_tutorial_complete') && !bannerDismissed;

  // Auto-set name from account for logged-in users
  useEffect(() => {
    if (authUser?.username && !isGuest) {
      setName(authUser.username);
      setPlayerName(authUser.username);
    }
  }, [authUser]);

  const welcomeLine = useMemo(() => {
    if (!authUser?.username) return '';
    return WELCOME_LINES[Math.floor(Math.random() * WELCOME_LINES.length)]
      .replace('{name}', authUser.username);
  }, [authUser?.username]);

  useEffect(() => {
    refreshRooms();
    const interval = setInterval(refreshRooms, 3000);
    return () => clearInterval(interval);
  }, []);

  // Lobby always shows swamp theme — room controls the theme now
  useEffect(() => {
    document.documentElement.removeAttribute('data-theme');
    soundManager.setTheme('swamp');
  }, []);

  // Start menu music on first click, stop on unmount
  useEffect(() => {
    const handler = () => {
      soundManager.init();
      // Read current muted state at click time, not closure time
      if (!useStore.getState().musicMuted) soundManager.startMenuMusic();
      document.removeEventListener('click', handler);
    };
    document.addEventListener('click', handler);
    return () => {
      document.removeEventListener('click', handler);
      soundManager.stopMenuMusic();
    };
  }, []);

  const handleCreate = () => {
    if (!name.trim()) return;
    setPlayerName(name.trim());
    createRoom();
  };

  const handleJoin = (roomId) => {
    if (!name.trim()) return;
    setPlayerName(name.trim());
    joinRoom(roomId);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 relative">
      <SparkleParticles />

      {/* User header bar */}
      <div className="fixed top-0 left-0 right-0 z-20 flex items-center justify-evenly px-4 py-2 bg-gray-950/80 border-b border-gray-800">
        {authUser ? (
          <span className="text-[var(--color-gold)] font-bold text-[14px]">{authUser.username}</span>
        ) : isGuest ? (
          <span className="text-gray-400 text-[14px]">Guest</span>
        ) : <span />}
        {authUser && (
          <button
            onClick={() => setShowStats(!showStats)}
            className="text-gray-400 hover:text-white text-[12px] transition"
          >
            Stats
          </button>
        )}
        <button
          onClick={() => startTutorial()}
          className="text-gray-400 hover:text-[var(--color-gold)] text-[12px] transition"
        >
          Tutorial
        </button>
        <button
          onClick={() => setShowLeaderboard(true)}
          className="text-gray-400 hover:text-[var(--color-gold)] text-[12px] transition"
        >
          Leaderboard
        </button>
        <button
          onClick={logout}
          className="text-gray-500 hover:text-red-400 text-[12px] transition"
        >
          {isGuest ? 'Sign In' : 'Logout'}
        </button>
      </div>

      <div className="text-center mb-8 relative z-10">
        <h1 className="text-3xl md:text-6xl font-display text-[var(--color-gold-bright)] drop-shadow-[0_0_30px_rgba(212,160,23,0.5)] mb-2">
          Goblin's Gambit
        </h1>
        <p className="text-gray-400 text-lg">A card game of cunning and chaos</p>
        <p className="text-gray-600 text-[11px] mt-1">v{__APP_VERSION__}</p>
      </div>

      <div className="w-full max-w-md space-y-5 relative z-10">
        {showTutorialBanner && (
          <div className="bg-gray-900/90 border-2 border-[var(--color-gold)] rounded-xl p-5 text-center">
            <p className="font-display text-[var(--color-gold)] text-lg mb-2">New to Goblin's Gambit?</p>
            <p className="text-gray-400 text-[13px] mb-4">Learn the basics in a quick guided tutorial</p>
            <button
              onClick={() => startTutorial()}
              className="w-full bg-[var(--color-card-green)] hover:bg-green-600 text-white font-bold py-3 rounded-lg transition text-lg mb-2"
            >
              Play the Tutorial
            </button>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-gray-500 hover:text-gray-300 text-[12px] transition"
            >
              Skip — I'll learn as I go
            </button>
          </div>
        )}

        {authUser && !isGuest ? (
          <div className="text-center py-2">
            <p className="text-[var(--color-gold)] font-display text-lg italic">{welcomeLine}</p>
          </div>
        ) : (
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
        )}

        <div className="flex gap-3">
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="flex-1 bg-[var(--color-card-green)] hover:bg-green-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold py-3 px-6 rounded-lg transition text-lg"
          >
            Create Game
          </button>
        </div>

        {rooms.length > 0 && (
          <div className="mt-6">
            <h2 className="text-xl font-display text-[var(--color-gold)] mb-3">Open Games</h2>
            <div className="space-y-2">
              {rooms.map((room) => {
                const themeIcon = { swamp: '\u{1F33F}', blood: '\u{1F319}', frost: '\u{2744}\u{FE0F}' }[room.theme] || '\u{1F33F}';
                const themeName = { swamp: 'Swamp', blood: 'Blood Moon', frost: 'Frost' }[room.theme] || 'Swamp';
                return (
                  <div
                    key={room.id}
                    className="bg-gray-900/80 border border-gray-700 rounded-lg p-4 flex items-center justify-between hover:border-[var(--color-gold)]/50 transition"
                  >
                    <div className="min-w-0">
                      <span className="text-white font-medium font-display">{room.name || `${room.host}'s game`}</span>
                      <span className="text-gray-400 ml-3 text-sm">
                        {room.playerCount}/{room.maxPlayers} players
                      </span>
                      <div className="flex items-center gap-3 mt-1 text-[12px]">
                        <span className="text-gray-500">Host: {room.host}</span>
                        <span className="text-gray-400">{themeIcon} {themeName}</span>
                        <span className="text-yellow-400">{(room.winSP || 10000).toLocaleString()} SP</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoin(room.id)}
                      disabled={!name.trim()}
                      className="bg-[var(--color-card-blue)] hover:bg-blue-600 disabled:bg-gray-700 text-white font-bold py-2 px-4 rounded transition shrink-0"
                    >
                      Join
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {rooms.length === 0 && (
          <p className="text-gray-500 text-center mt-6">No open games. Create one to get started.</p>
        )}
      </div>

      {/* Stats popup */}
      {showStats && authUser && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setShowStats(false)}>
          <div className="w-full max-w-xs bg-gray-950 border-2 border-[var(--color-gold)] rounded-xl shadow-2xl p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="font-display text-xl text-[var(--color-gold)] mb-4 text-center">{authUser.username}</h2>
            <div className="space-y-2 text-[14px]">
              <div className="flex justify-between"><span className="text-gray-400">Games Played</span><span className="text-white font-bold">{authUser.stats?.gamesPlayed ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Wins</span><span className="text-green-400 font-bold">{authUser.stats?.gamesWon ?? 0}</span></div>
              <div className="flex justify-between"><span className="text-gray-400">Losses</span><span className="text-red-400 font-bold">{(authUser.stats?.gamesPlayed ?? 0) - (authUser.stats?.gamesWon ?? 0)}</span></div>
              <div className="flex justify-between">
                <span className="text-gray-400">Win Rate</span>
                <span className="text-blue-300 font-bold">
                  {(authUser.stats?.gamesPlayed ?? 0) > 0 ? Math.round(((authUser.stats?.gamesWon ?? 0) / authUser.stats.gamesPlayed) * 100) : 0}%
                </span>
              </div>
            </div>
            <button onClick={() => setShowStats(false)} className="w-full mt-4 bg-gray-800 hover:bg-gray-700 text-white font-bold py-2 rounded-lg text-[14px] transition">Close</button>
          </div>
        </div>
      )}

      {/* Leaderboard modal */}
      {showLeaderboard && <LeaderboardModal onClose={() => setShowLeaderboard(false)} />}
    </div>
  );
}
