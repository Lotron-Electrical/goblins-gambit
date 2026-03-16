import { useState } from "react";
import { useStore } from "../../store.js";

export default function VolcanoModal({ volcano, onClose }) {
  const { depositVolcano, gameState } = useStore();
  const [amount, setAmount] = useState("");
  const myId = gameState?.myId;
  const myPlayer = gameState?.players?.[myId];
  const isMyTurn = gameState?.currentPlayerId === myId;
  const myDeposits = volcano?.myDeposits || [];

  const handleDeposit = () => {
    const val = parseInt(amount);
    if (!val || val <= 0) return;
    depositVolcano(val);
    setAmount("");
  };

  const presets = [500, 1000, 2000];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border-2 border-orange-600 rounded-xl p-5 max-w-sm w-full mx-4 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-orange-400 font-display text-xl">
            &#x1F30B; Volcano Bank
          </h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white text-lg"
          >
            x
          </button>
        </div>

        <div className="text-gray-300 text-sm mb-3">
          Deposit SP for interest. Roll D6 = lock duration + interest rate (D6 x
          10%).
          <span className="text-red-400 block mt-1">
            Warning: If a Dragon appears, deposits are frozen and the slayer
            takes everything!
          </span>
        </div>

        <div className="bg-gray-800 rounded-lg p-3 mb-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Total Banked</span>
            <span className="text-orange-400 font-bold">
              {volcano.totalBanked} SP
            </span>
          </div>
          <div className="flex justify-between text-sm mt-1">
            <span className="text-gray-400">Your SP</span>
            <span className="text-yellow-400 font-bold">
              {myPlayer?.sp || 0} SP
            </span>
          </div>
        </div>

        {/* My active deposits */}
        {myDeposits.length > 0 && (
          <div className="mb-3">
            <h4 className="text-gray-400 text-xs uppercase mb-1">
              Your Deposits
            </h4>
            <div className="space-y-1">
              {myDeposits.map((dep, i) => (
                <div
                  key={i}
                  className="flex justify-between text-xs bg-gray-800/60 rounded px-2 py-1"
                >
                  <span className="text-orange-300">
                    {dep.amount} SP @ {dep.interestRate}%
                  </span>
                  <span className="text-gray-400">
                    {dep.maturesIn} cycles left
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Deposit controls */}
        {isMyTurn && (myPlayer?.ap || 0) >= 1 && (
          <div>
            <div className="flex gap-2 mb-2">
              {presets.map((p) => (
                <button
                  key={p}
                  onClick={() => setAmount(String(p))}
                  disabled={(myPlayer?.sp || 0) < p}
                  className="flex-1 bg-orange-800/40 hover:bg-orange-800/60 disabled:opacity-30 text-orange-300 text-xs py-1.5 rounded transition"
                >
                  {p}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Amount"
                min={1}
                max={myPlayer?.sp || 0}
                className="flex-1 bg-gray-800 border border-gray-600 text-white rounded px-2 py-1.5 text-sm"
              />
              <button
                onClick={handleDeposit}
                disabled={
                  !amount ||
                  parseInt(amount) <= 0 ||
                  parseInt(amount) > (myPlayer?.sp || 0)
                }
                className="bg-orange-700 hover:bg-orange-600 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold px-4 py-1.5 rounded transition"
              >
                Deposit (1 AP)
              </button>
            </div>
          </div>
        )}

        {!isMyTurn && (
          <div className="text-gray-500 text-sm text-center">
            Wait for your turn to deposit
          </div>
        )}
      </div>
    </div>
  );
}
