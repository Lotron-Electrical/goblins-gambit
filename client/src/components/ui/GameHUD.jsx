import { useState, useEffect } from "react";
import { useStore } from "../../store.js";
import { ICONS } from "./icons.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { THEME_EFFECTS } from "../../../../shared/src/constants.js";

const THEME_ICON = {
  swamp: "\u{1F33F}",
  blood: "\u{1F319}",
  frost: "\u{2744}\u{FE0F}",
};

const FIRST_GAME_KEY = "gg_seen_rules_prompt";

export default function GameHUD({
  mobileLogOpen,
  setMobileLogOpen,
  chatOpen,
  setChatOpen,
}) {
  const { gameState, setHelpOpen, setMenuOpen, chatUnread, tutorialMode } =
    useStore();
  const isMobile = useIsMobile();
  const [themeExpanded, setThemeExpanded] = useState(false);

  if (!gameState) return null;

  const themeInfo = THEME_EFFECTS[gameState.theme] || THEME_EFFECTS.swamp;
  const themeIcon = THEME_ICON[gameState.theme] || THEME_ICON.swamp;
  const playerCount = Object.keys(gameState.players).length;
  const alivePlayers = Object.values(gameState.players).filter(
    (p) => !p.eliminated,
  ).length;

  // First-game rules prompt — only shows once ever, skip if tutorial was completed
  const [showRulesPrompt, setShowRulesPrompt] = useState(() => {
    if (tutorialMode) return false;
    if (localStorage.getItem("gg_tutorial_complete")) return false;
    return !localStorage.getItem(FIRST_GAME_KEY);
  });

  const handleRulesYes = () => {
    localStorage.setItem(FIRST_GAME_KEY, "1");
    setShowRulesPrompt(false);
    setHelpOpen(true);
  };

  const handleRulesNo = () => {
    localStorage.setItem(FIRST_GAME_KEY, "1");
    setShowRulesPrompt(false);
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-20 pointer-events-none">
      {/* Top bar */}
      {isMobile ? (
        <div className="flex items-center justify-evenly px-1.5 py-1.5 bg-gradient-to-b from-gray-950/95 to-gray-900/90 border-b border-gray-700/40 pointer-events-auto backdrop-blur-sm">
          <button
            onClick={() => setThemeExpanded(!themeExpanded)}
            className="text-[10px] hover:opacity-80 transition"
            title="Tap to see theme effects"
          >
            <span className="mr-0.5">{themeIcon}</span>
            <span className="text-gray-300 font-medium">{themeInfo.name}</span>
          </button>
          <span className="text-gray-500 text-[10px]">
            Turn {gameState.turnNumber}
          </span>
          <span className="text-gray-500 text-[10px]">
            {alivePlayers}/{playerCount}
          </span>
          <span className="text-gray-500 text-[10px]">
            Dk {gameState.deckCount}
          </span>
          <span className="text-gray-500 text-[10px]">
            Gv {gameState.graveyardCount}
          </span>
          {setChatOpen && (
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={`relative flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-lg transition w-7 h-7 text-[12px] ${chatOpen ? "text-white" : "text-gray-400"}`}
              title="Chat"
            >
              {"\u{1F4AC}"}
              {chatUnread > 0 && !chatOpen && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5">
                  {chatUnread > 9 ? "9+" : chatUnread}
                </span>
              )}
            </button>
          )}
          {setMobileLogOpen && (
            <button
              onClick={() => setMobileLogOpen(!mobileLogOpen)}
              className={`flex items-center justify-center bg-gray-800 hover:bg-gray-700 rounded-lg transition w-7 h-7 text-[12px] ${mobileLogOpen ? "text-white" : "text-gray-400"}`}
              title="Activity Log"
            >
              {"\u{1F4DC}"}
            </button>
          )}
          {!tutorialMode && (
            <button
              onClick={() => setHelpOpen(true)}
              className="flex items-center justify-center text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition w-7 h-7 text-[12px]"
              title="Help"
            >
              ?
            </button>
          )}
          <button
            onClick={() => setMenuOpen(true)}
            className="flex items-center justify-center text-gray-400 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition w-7 h-7 text-[12px]"
            title="Settings"
          >
            {ICONS.gear}
          </button>
        </div>
      ) : (
        <div className="relative flex items-center px-4 py-2 bg-gradient-to-b from-gray-950/95 to-gray-900/90 border-b border-gray-700/40 pointer-events-auto backdrop-blur-sm">
          {/* LEFT -- brand */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="font-display text-[var(--color-gold)] text-lg leading-none drop-shadow-[0_0_6px_rgba(212,160,23,0.3)]">
              Goblin's Gambit
            </span>
            <span className="text-gray-600 text-[10px]">
              v{__APP_VERSION__}
            </span>
          </div>

          {/* CENTER -- game stats */}
          <div className="absolute inset-x-0 flex items-center justify-center pointer-events-none">
            <div className="flex items-center gap-3 pointer-events-auto">
              <button
                onClick={() => setThemeExpanded(!themeExpanded)}
                className="text-[12px] hover:opacity-80 transition"
                title="Click to see theme effects"
              >
                <span className="mr-0.5">{themeIcon}</span>
                <span className="text-gray-300 font-medium">
                  {themeInfo.name}
                </span>
              </button>
              <span className="text-gray-700/60">|</span>
              <span className="text-gray-400 text-[12px] font-medium">
                Turn {gameState.turnNumber}
              </span>
              <span className="text-gray-500 text-[12px]">
                {alivePlayers}/{playerCount} alive
              </span>
              <span className="text-gray-500 text-[12px]">
                Deck {gameState.deckCount}
              </span>
              <span className="text-gray-500 text-[12px]">
                Grave {gameState.graveyardCount}
              </span>
            </div>
          </div>

          {/* RIGHT -- buttons */}
          <div className="flex items-center gap-1.5 ml-auto shrink-0">
            {setChatOpen && (
              <button
                onClick={() => setChatOpen(!chatOpen)}
                className={`relative flex items-center justify-center rounded-lg transition-all duration-150 w-8 h-8 text-[14px] ${chatOpen ? "text-white bg-gray-700 ring-1 ring-gray-600" : "text-gray-400 bg-gray-800/80 hover:bg-gray-700 hover:text-gray-200"}`}
                title="Chat"
              >
                {"\u{1F4AC}"}
                {chatUnread > 0 && !chatOpen && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5 shadow-lg shadow-red-500/30">
                    {chatUnread > 9 ? "9+" : chatUnread}
                  </span>
                )}
              </button>
            )}
            {!tutorialMode && (
              <button
                onClick={() => setHelpOpen(true)}
                className="flex items-center justify-center text-gray-400 hover:text-white bg-gray-800/80 hover:bg-gray-700 rounded-lg transition-all duration-150 w-8 h-8 text-[14px] font-display"
                title="Help"
              >
                ?
              </button>
            )}
            <button
              onClick={() => setMenuOpen(true)}
              className="flex items-center justify-center text-gray-400 hover:text-white bg-gray-800/80 hover:bg-gray-700 rounded-lg transition-all duration-150 w-8 h-8 text-[14px]"
              title="Settings"
            >
              {ICONS.gear}
            </button>
          </div>
        </div>
      )}

      {/* Theme effects expandable */}
      {themeExpanded && gameState.theme !== "swamp" && (
        <div
          className={`bg-gradient-to-r from-gray-900/95 via-gray-900/98 to-gray-900/95 border-b border-gray-700/40 pointer-events-auto backdrop-blur-sm ${isMobile ? "px-3 py-2 text-[10px]" : "px-4 py-2 text-[12px]"}`}
          onClick={() => setThemeExpanded(false)}
        >
          <span className="text-gray-300">
            {themeIcon} {themeInfo.description}
          </span>
        </div>
      )}

      {/* First-game rules dialog */}
      {showRulesPrompt && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center pointer-events-auto">
          <div
            className={`bg-gray-900 border-2 border-[var(--color-gold)] rounded-xl shadow-2xl text-center ${
              isMobile ? "mx-4 px-5 py-6 max-w-[300px]" : "px-8 py-8 max-w-sm"
            }`}
          >
            <h2
              className={`font-display text-[var(--color-gold)] mb-3 ${isMobile ? "text-xl" : "text-2xl"}`}
            >
              First time playing?
            </h2>
            <p
              className={`text-gray-300 mb-5 ${isMobile ? "text-[13px]" : "text-[15px]"}`}
            >
              Would you like to read the rules before your first game?
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleRulesYes}
                className={`flex-1 bg-[var(--color-card-green)] hover:bg-green-600 text-white font-bold rounded-lg transition ${
                  isMobile ? "py-2.5 text-[13px]" : "py-3 text-[15px]"
                }`}
              >
                Show me the rules
              </button>
              <button
                onClick={handleRulesNo}
                className={`flex-1 bg-gray-800 hover:bg-gray-700 text-gray-300 font-bold rounded-lg transition ${
                  isMobile ? "py-2.5 text-[13px]" : "py-3 text-[15px]"
                }`}
              >
                I'll figure it out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
