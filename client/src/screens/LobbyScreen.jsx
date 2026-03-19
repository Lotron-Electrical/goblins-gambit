import { useState, useEffect, useMemo } from "react";
import { useStore } from "../store.js";
import { soundManager } from "../audio/SoundManager.js";
import SparkleParticles from "../components/ui/SparkleParticles.jsx";
import LeaderboardModal from "../components/ui/LeaderboardModal.jsx";
import GameMenu from "../components/ui/GameMenu.jsx";
import { ICONS } from "../components/ui/icons.js";

const WELCOME_LINES = [
  "{name} is ready to destroy",
  "{name} has entered the swamp",
  "{name} sharpens their claws",
  "{name} smells blood",
  "{name} crawls from the muck",
  "{name} hungers for SP",
  "{name} is here for chaos",
  "The goblins fear {name}",
  "{name} cracks their knuckles",
  "{name} has returned for vengeance",
  "{name} emerges from the shadows",
  "All tremble before {name}",
  "{name} is out for blood",
  "{name} lights the swamp fires",
  "The cards bow to {name}",
  "{name} has unfinished business",
];

export default function LobbyScreen() {
  const {
    playerName,
    setPlayerName,
    rooms,
    createRoom,
    joinRoom,
    refreshRooms,
    authUser,
    authToken,
    logout,
    startTutorial,
    savedGameInfo,
    loadSavedGame,
    deleteSavedGame,
    setMenuOpen,
    mirrorAvailable,
    linkDevice,
  } = useStore();
  const [name, setName] = useState(playerName || "");
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [confirmDeleteSave, setConfirmDeleteSave] = useState(false);
  const isGuest = authToken === "guest";
  const showTutorialBanner =
    !localStorage.getItem("gg_tutorial_complete") && !bannerDismissed;

  // Auto-set name from account for logged-in users
  useEffect(() => {
    if (authUser?.username && !isGuest) {
      setName(authUser.username);
      setPlayerName(authUser.username);
    }
  }, [authUser]);

  const welcomeLine = useMemo(() => {
    if (!authUser?.username) return "";
    return WELCOME_LINES[
      Math.floor(Math.random() * WELCOME_LINES.length)
    ].replace("{name}", authUser.username);
  }, [authUser?.username]);

  useEffect(() => {
    refreshRooms();
    const interval = setInterval(refreshRooms, 3000);
    return () => clearInterval(interval);
  }, []);

  // Lobby always shows swamp theme — room controls the theme now
  useEffect(() => {
    document.documentElement.removeAttribute("data-theme");
    soundManager.setTheme("swamp");
  }, []);

  // Start menu music on first click, stop on unmount
  useEffect(() => {
    const handler = () => {
      soundManager.init();
      // Read current muted state at click time, not closure time
      if (!useStore.getState().musicMuted) soundManager.startMenuMusic();
      document.removeEventListener("click", handler);
    };
    document.addEventListener("click", handler);
    return () => {
      document.removeEventListener("click", handler);
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
      <div className="fixed top-0 left-0 right-0 z-20 flex items-center justify-evenly px-4 py-2.5 bg-gray-950/90 border-b border-gray-800/60 backdrop-blur-sm">
        {authUser ? (
          <span className="text-[var(--color-gold)] font-display font-bold text-[14px] drop-shadow-[0_0_8px_rgba(212,160,23,0.3)]">
            {authUser.username}
          </span>
        ) : isGuest ? (
          <span className="text-gray-500 text-[14px] italic">Guest</span>
        ) : (
          <span />
        )}
        {authUser && (
          <button
            onClick={() => setShowStats(!showStats)}
            className="text-gray-400 hover:text-white text-[12px] transition-colors duration-200 hover:drop-shadow-[0_0_6px_rgba(255,255,255,0.3)]"
          >
            Stats
          </button>
        )}
        <button
          onClick={() => startTutorial()}
          className="text-gray-400 hover:text-[var(--color-gold)] text-[12px] transition-colors duration-200"
        >
          Tutorial
        </button>
        <button
          onClick={() => setShowLeaderboard(true)}
          className="text-gray-400 hover:text-[var(--color-gold)] text-[12px] transition-colors duration-200"
        >
          Leaderboard
        </button>
        <button
          onClick={() => setMenuOpen(true)}
          className="text-gray-400 hover:text-[var(--color-gold)] text-[14px] transition-colors duration-200"
          title="Settings"
        >
          {ICONS.gear}
        </button>
        <button
          onClick={logout}
          className="text-gray-500 hover:text-red-400 text-[12px] transition-colors duration-200"
        >
          {isGuest ? "Sign In" : "Logout"}
        </button>
      </div>

      {/* Title */}
      <div className="text-center mb-10 relative z-10">
        <h1 className="text-4xl md:text-7xl font-display text-[var(--color-gold-bright)] drop-shadow-[0_0_40px_rgba(212,160,23,0.6)] mb-3 tracking-wide animate-[pulse_4s_ease-in-out_infinite]">
          Goblin's Gambit
        </h1>
        <div className="w-24 h-0.5 mx-auto bg-gradient-to-r from-transparent via-[var(--color-gold)] to-transparent mb-3" />
        <p className="text-gray-400 tracking-widest uppercase text-[13px]">
          A card game of cunning and chaos
        </p>
        <p className="text-gray-700 text-[11px] mt-1.5">v{__APP_VERSION__}</p>
      </div>

      <div className="w-full max-w-md space-y-5 relative z-10">
        {/* Tutorial banner */}
        {showTutorialBanner && (
          <div className="bg-gray-950/80 border-2 border-[var(--color-gold)] rounded-2xl p-6 text-center shadow-[0_0_30px_rgba(212,160,23,0.15)] backdrop-blur-sm">
            <p className="font-display text-[var(--color-gold)] text-xl mb-2 drop-shadow-[0_0_10px_rgba(212,160,23,0.3)]">
              New to Goblin's Gambit?
            </p>
            <p className="text-gray-400 text-[13px] mb-5">
              Learn the basics in a quick guided tutorial
            </p>
            <button
              onClick={() => startTutorial()}
              className="w-full bg-gradient-to-b from-[var(--color-card-green)] to-green-800 hover:from-green-600 hover:to-green-700 text-white font-display font-bold py-3.5 rounded-lg transition-all duration-300 text-lg shadow-[0_4px_16px_rgba(21,128,61,0.3)] hover:shadow-[0_4px_24px_rgba(21,128,61,0.5)] hover:scale-[1.02] active:scale-[0.98] border border-green-600/30 mb-3"
            >
              Play the Tutorial
            </button>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-gray-500 hover:text-gray-300 text-[12px] transition-colors duration-200"
            >
              Skip — I'll learn as I go
            </button>
          </div>
        )}

        {/* Saved game card */}
        {savedGameInfo?.hasSave && (
          <div className="bg-gray-950/80 border-2 border-[var(--color-card-blue)] rounded-2xl p-6 shadow-[0_0_30px_rgba(29,78,216,0.15)] backdrop-blur-sm">
            <p className="font-display text-[var(--color-card-blue)] text-xl mb-1 drop-shadow-[0_0_10px_rgba(29,78,216,0.3)]">
              Continue Game
            </p>
            <div className="text-gray-400 text-[13px] mb-5 space-y-0.5">
              <p>
                Turn {savedGameInfo.turnNumber} &middot;{" "}
                {savedGameInfo.botCount} bot
                {savedGameInfo.botCount !== 1 ? "s" : ""} &middot;{" "}
                {{
                  swamp: "The Swamp",
                  blood: "Blood Moon",
                  frost: "Frozen Wastes",
                }[savedGameInfo.theme] || "The Swamp"}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={loadSavedGame}
                className="flex-1 bg-gradient-to-b from-[var(--color-card-blue)] to-blue-800 hover:from-blue-600 hover:to-blue-700 text-white font-display font-bold py-3 rounded-lg transition-all duration-300 text-lg shadow-[0_4px_16px_rgba(29,78,216,0.3)] hover:shadow-[0_4px_24px_rgba(29,78,216,0.5)] hover:scale-[1.02] active:scale-[0.98] border border-blue-600/30"
              >
                Continue
              </button>
              <button
                onClick={() => {
                  if (!confirmDeleteSave) {
                    setConfirmDeleteSave(true);
                    return;
                  }
                  deleteSavedGame();
                  setConfirmDeleteSave(false);
                }}
                className={`px-4 py-3 rounded-lg font-bold transition-all duration-300 text-sm ${
                  confirmDeleteSave
                    ? "bg-red-700 hover:bg-red-600 text-white shadow-[0_0_12px_rgba(185,28,28,0.4)]"
                    : "bg-gray-800/80 hover:bg-gray-700 text-gray-400 border border-gray-700/50"
                }`}
              >
                {confirmDeleteSave ? "Confirm?" : "Delete"}
              </button>
            </div>
          </div>
        )}

        {/* Link Device card — mirror into active game on another device */}
        {mirrorAvailable && (
          <div className="bg-gray-950/80 border-2 border-purple-500 rounded-2xl p-6 shadow-[0_0_30px_rgba(168,85,247,0.15)] backdrop-blur-sm">
            <p className="font-display text-purple-400 text-xl mb-1 drop-shadow-[0_0_10px_rgba(168,85,247,0.3)]">
              Game In Progress
            </p>
            <div className="text-gray-400 text-[13px] mb-5 space-y-0.5">
              <p>
                Turn {mirrorAvailable.turnNumber} &middot;{" "}
                {mirrorAvailable.playerCount} player
                {mirrorAvailable.playerCount !== 1 ? "s" : ""} &middot;{" "}
                {{
                  swamp: "The Swamp",
                  blood: "Blood Moon",
                  frost: "Frozen Wastes",
                }[mirrorAvailable.theme] || "The Swamp"}
              </p>
            </div>
            <button
              onClick={linkDevice}
              className="w-full bg-gradient-to-b from-purple-600 to-purple-800 hover:from-purple-500 hover:to-purple-700 text-white font-display font-bold py-3 rounded-lg transition-all duration-300 text-lg shadow-[0_4px_16px_rgba(168,85,247,0.3)] hover:shadow-[0_4px_24px_rgba(168,85,247,0.5)] hover:scale-[1.02] active:scale-[0.98] border border-purple-500/30"
            >
              Link Device
            </button>
          </div>
        )}

        {/* Welcome line or name input */}
        {authUser && !isGuest ? (
          <div className="text-center py-3">
            <p className="text-[var(--color-gold)]/80 font-display text-lg italic drop-shadow-[0_0_10px_rgba(212,160,23,0.2)]">
              {welcomeLine}
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-[var(--color-gold)]/70 text-xs font-bold uppercase tracking-wider mb-2">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name..."
              maxLength={20}
              className="w-full bg-gray-900/80 border border-gray-700/60 rounded-lg px-4 py-3 text-white text-lg placeholder-gray-600 focus:outline-none focus:border-[var(--color-gold)] focus:shadow-[0_0_12px_rgba(212,160,23,0.15)] transition-all duration-300"
            />
          </div>
        )}

        {/* Create Game button */}
        <div className="flex gap-3">
          <button
            onClick={handleCreate}
            disabled={!name.trim()}
            className="flex-1 bg-gradient-to-b from-[var(--color-card-green)] to-green-800 hover:from-green-600 hover:to-green-700 disabled:from-gray-700 disabled:to-gray-800 disabled:text-gray-500 text-white font-display font-bold py-3.5 px-6 rounded-lg transition-all duration-300 text-lg shadow-[0_4px_16px_rgba(21,128,61,0.3)] hover:shadow-[0_4px_24px_rgba(21,128,61,0.5)] disabled:shadow-none hover:scale-[1.02] active:scale-[0.98] border border-green-600/30 disabled:border-gray-600/30"
          >
            Create Game
          </button>
        </div>

        {/* Story Mode button */}
        {authUser && !isGuest && (
          <button
            onClick={() => useStore.getState().setScreen("story")}
            className="w-full bg-gradient-to-r from-amber-800 to-red-900 hover:from-amber-700 hover:to-red-800 text-white font-display font-bold py-3.5 px-6 rounded-lg transition-all duration-300 text-lg border border-amber-500/30 shadow-[0_4px_16px_rgba(180,83,9,0.3)] hover:shadow-[0_4px_24px_rgba(180,83,9,0.5)] hover:scale-[1.02] active:scale-[0.98]"
          >
            Story Mode
          </button>
        )}

        {/* Open games list */}
        {rooms.length > 0 && (
          <div className="mt-8">
            <h2 className="text-xl font-display text-[var(--color-gold)] mb-4 flex items-center gap-2">
              <span className="w-8 h-px bg-gradient-to-r from-transparent to-[var(--color-gold)]/50" />
              Open Games
              <span className="flex-1 h-px bg-gradient-to-r from-[var(--color-gold)]/50 to-transparent" />
            </h2>
            <div className="space-y-3">
              {rooms.map((room) => {
                const themeIcon =
                  {
                    swamp: "\u{1F33F}",
                    blood: "\u{1F319}",
                    frost: "\u{2744}\u{FE0F}",
                  }[room.theme] || "\u{1F33F}";
                const themeName =
                  { swamp: "Swamp", blood: "Blood Moon", frost: "Frost" }[
                    room.theme
                  ] || "Swamp";
                return (
                  <div
                    key={room.id}
                    className="group bg-gray-950/70 border border-gray-700/50 rounded-xl p-4 flex items-center justify-between hover:border-[var(--color-gold)]/40 hover:bg-gray-900/70 transition-all duration-300 backdrop-blur-sm hover:shadow-[0_0_20px_rgba(212,160,23,0.08)]"
                  >
                    <div className="min-w-0">
                      <span className="text-white font-medium font-display group-hover:text-[var(--color-gold-bright)] transition-colors duration-300">
                        {room.name || `${room.host}'s game`}
                      </span>
                      <span className="text-gray-400 ml-3 text-sm">
                        {room.playerCount}/{room.maxPlayers} players
                      </span>
                      <div className="flex items-center gap-3 mt-1.5 text-[12px]">
                        <span className="text-gray-500">Host: {room.host}</span>
                        <span className="text-gray-400">
                          {themeIcon} {themeName}
                        </span>
                        <span className="text-yellow-400 font-medium">
                          {(room.winSP || 10000).toLocaleString()} SP
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleJoin(room.id)}
                      disabled={!name.trim()}
                      className="bg-gradient-to-b from-[var(--color-card-blue)] to-blue-800 hover:from-blue-600 hover:to-blue-700 disabled:from-gray-700 disabled:to-gray-800 text-white font-bold py-2.5 px-5 rounded-lg transition-all duration-300 shrink-0 shadow-[0_2px_8px_rgba(29,78,216,0.3)] hover:shadow-[0_2px_12px_rgba(29,78,216,0.5)] hover:scale-105 active:scale-95 border border-blue-600/30 disabled:border-gray-600/30 disabled:shadow-none"
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
          <p className="text-gray-600 text-center mt-8 text-sm italic">
            No open games. Create one to get started.
          </p>
        )}
      </div>

      {/* Stats popup */}
      {showStats && authUser && (
        <div
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={() => setShowStats(false)}
        >
          <div
            className="w-full max-w-xs bg-gray-950 border-2 border-[var(--color-gold)] rounded-2xl shadow-[0_0_40px_rgba(212,160,23,0.2)] p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-2xl text-[var(--color-gold)] mb-5 text-center drop-shadow-[0_0_10px_rgba(212,160,23,0.3)]">
              {authUser.username}
            </h2>
            <div className="space-y-3 text-[14px]">
              <div className="flex justify-between items-center py-1 border-b border-gray-800/50">
                <span className="text-gray-400">Games Played</span>
                <span className="text-white font-bold">
                  {authUser.stats?.gamesPlayed ?? 0}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-800/50">
                <span className="text-gray-400">Wins</span>
                <span className="text-green-400 font-bold">
                  {authUser.stats?.gamesWon ?? 0}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-gray-800/50">
                <span className="text-gray-400">Losses</span>
                <span className="text-red-400 font-bold">
                  {(authUser.stats?.gamesPlayed ?? 0) -
                    (authUser.stats?.gamesWon ?? 0)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-gray-400">Win Rate</span>
                <span className="text-blue-300 font-bold">
                  {(authUser.stats?.gamesPlayed ?? 0) > 0
                    ? Math.round(
                        ((authUser.stats?.gamesWon ?? 0) /
                          authUser.stats.gamesPlayed) *
                          100,
                      )
                    : 0}
                  %
                </span>
              </div>
            </div>
            <button
              onClick={() => setShowStats(false)}
              className="w-full mt-5 bg-gray-800 hover:bg-gray-700 text-white font-bold py-2.5 rounded-lg text-[14px] transition-all duration-200 border border-gray-700/50 hover:border-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Leaderboard modal */}
      {showLeaderboard && (
        <LeaderboardModal onClose={() => setShowLeaderboard(false)} />
      )}

      {/* Settings menu */}
      <GameMenu />
    </div>
  );
}
