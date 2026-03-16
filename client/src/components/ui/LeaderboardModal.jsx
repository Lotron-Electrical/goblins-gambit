import { useState, useEffect } from "react";
import { getLeaderboard } from "../../api.js";

export default function LeaderboardModal({ onClose }) {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  useEffect(() => {
    getLeaderboard()
      .then((data) =>
        setPlayers(Array.isArray(data) ? data : data.players || []),
      )
      .catch(() => setPlayers([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-gray-950 border-2 border-[var(--color-gold)] rounded-xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gray-900 px-4 py-3 flex items-center justify-between border-b border-gray-800">
          <h2 className="font-display text-xl text-[var(--color-gold)]">
            Leaderboard
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-lg font-bold"
          >
            X
          </button>
        </div>

        {/* Player detail panel */}
        {selectedPlayer && (
          <div className="bg-gray-900/80 border-b border-gray-800 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-white font-bold text-base">
                {selectedPlayer.username}
              </h3>
              <button
                onClick={() => setSelectedPlayer(null)}
                className="text-gray-500 hover:text-white text-xs"
              >
                Back
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="bg-gray-800/60 rounded px-3 py-2">
                <div className="text-gray-500 text-[10px] uppercase">Rank</div>
                <div className="text-[var(--color-gold)] font-bold">
                  #{selectedPlayer.rank || "-"}
                </div>
              </div>
              <div className="bg-gray-800/60 rounded px-3 py-2">
                <div className="text-gray-500 text-[10px] uppercase">
                  Win Rate
                </div>
                <div className="text-blue-300 font-bold">
                  {selectedPlayer.winRate}%
                </div>
              </div>
              <div className="bg-gray-800/60 rounded px-3 py-2">
                <div className="text-gray-500 text-[10px] uppercase">
                  Games Won
                </div>
                <div className="text-green-400 font-bold">
                  {selectedPlayer.gamesWon}
                </div>
              </div>
              <div className="bg-gray-800/60 rounded px-3 py-2">
                <div className="text-gray-500 text-[10px] uppercase">
                  Games Played
                </div>
                <div className="text-gray-300 font-bold">
                  {selectedPlayer.gamesPlayed}
                </div>
              </div>
              <div className="bg-gray-800/60 rounded px-3 py-2">
                <div className="text-gray-500 text-[10px] uppercase">
                  Total SP Earned
                </div>
                <div className="text-yellow-400 font-bold">
                  {selectedPlayer.totalSP?.toLocaleString() || 0}
                </div>
              </div>
              <div className="bg-gray-800/60 rounded px-3 py-2">
                <div className="text-gray-500 text-[10px] uppercase">
                  Creatures Killed
                </div>
                <div className="text-red-400 font-bold">
                  {selectedPlayer.creaturesKilled || 0}
                </div>
              </div>
              <div className="bg-gray-800/60 rounded px-3 py-2">
                <div className="text-gray-500 text-[10px] uppercase">
                  Cards Played
                </div>
                <div className="text-purple-300 font-bold">
                  {selectedPlayer.cardsPlayed || 0}
                </div>
              </div>
              <div className="bg-gray-800/60 rounded px-3 py-2">
                <div className="text-gray-500 text-[10px] uppercase">
                  Favourite Card
                </div>
                <div className="text-orange-300 font-bold text-xs truncate">
                  {selectedPlayer.favouriteCard || "-"}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="p-4 max-h-[400px] overflow-y-auto">
          {loading ? (
            <p className="text-gray-400 text-center py-4">Loading...</p>
          ) : players.length === 0 ? (
            <p className="text-gray-400 text-center py-4">No players yet.</p>
          ) : (
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-gray-400 border-b border-gray-800">
                  <th className="text-left py-2 px-2">#</th>
                  <th className="text-left py-2 px-2">Player</th>
                  <th className="text-right py-2 px-2">Wins</th>
                  <th className="text-right py-2 px-2">Played</th>
                  <th className="text-right py-2 px-2">Win%</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p, i) => (
                  <tr
                    key={p.username}
                    onClick={() => setSelectedPlayer(p)}
                    className={`border-b border-gray-800/50 cursor-pointer transition ${
                      selectedPlayer?.username === p.username
                        ? "bg-[var(--color-gold)]/10"
                        : "hover:bg-gray-900/50"
                    }`}
                  >
                    <td
                      className={`py-2 px-2 font-bold ${i < 3 ? "text-[var(--color-gold)]" : "text-gray-500"}`}
                    >
                      {p.rank || i + 1}
                    </td>
                    <td className="py-2 px-2 text-white">{p.username}</td>
                    <td className="py-2 px-2 text-right text-green-400">
                      {p.gamesWon}
                    </td>
                    <td className="py-2 px-2 text-right text-gray-300">
                      {p.gamesPlayed}
                    </td>
                    <td className="py-2 px-2 text-right text-blue-300">
                      {p.winRate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
