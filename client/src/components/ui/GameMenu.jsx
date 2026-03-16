import { useState, useEffect } from "react";
import { useStore } from "../../store.js";
import { soundManager } from "../../audio/SoundManager.js";
import { ICONS } from "./icons.js";

export default function GameMenu() {
  const {
    menuOpen,
    setMenuOpen,
    muted,
    setMuted,
    musicMuted,
    setMusicMuted,
    animationsOff,
    setAnimationsOff,
    handArc,
    setHandArc,
    leaveRoom,
    gameState,
    currentRoom,
    authToken,
    saveGame,
  } = useStore();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmSave, setConfirmSave] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  // Can save: logged in (not guest), game in progress (not finished), bot-only game
  const isLoggedIn = authToken && authToken !== "guest";
  const isPlaying = gameState?.phase === "playing";
  const isBotOnly =
    currentRoom && currentRoom.players.filter((p) => !p.isBot).length === 1;
  const canSave = isLoggedIn && isPlaying && isBotOnly;

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [menuOpen, setMenuOpen]);

  if (!menuOpen) return null;

  const handleSfxToggle = () => {
    soundManager.init();
    const newMuted = !muted;
    soundManager.setMuted(newMuted);
    setMuted(newMuted);
  };

  const handleMusicToggle = () => {
    if (musicMuted) {
      soundManager.startMusic();
    } else {
      soundManager.stopMusic();
    }
    setMusicMuted(!musicMuted);
  };

  const handleLeave = () => {
    if (!confirmLeave) {
      setConfirmLeave(true);
      return;
    }
    leaveRoom();
  };

  if (feedbackOpen) {
    return (
      <FeedbackModalInline
        onClose={() => setFeedbackOpen(false)}
        onCloseMenu={() => setMenuOpen(false)}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 pointer-events-auto"
      onClick={() => setMenuOpen(false)}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-sm shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-white text-lg font-display">Settings</h2>
          <button
            onClick={() => setMenuOpen(false)}
            className="text-gray-400 hover:text-white text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Toggles */}
        <div className="space-y-3 mb-5">
          <ToggleRow
            label="Sound Effects"
            icon={ICONS.sound}
            active={!muted}
            onToggle={handleSfxToggle}
          />
          <ToggleRow
            label="Music"
            icon={ICONS.music}
            active={!musicMuted}
            onToggle={handleMusicToggle}
          />
          <ToggleRow
            label="Animations"
            icon={ICONS.sparkles}
            active={!animationsOff}
            onToggle={() => setAnimationsOff(!animationsOff)}
          />
        </div>

        {/* Hand Arc slider */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-gray-300 text-sm">Hand Arc</span>
            <span className="text-gray-500 text-xs">
              {Math.round(handArc / 10)}/10
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="100"
            step="10"
            value={handArc}
            onChange={(e) => setHandArc(parseInt(e.target.value, 10))}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[var(--color-gold)]"
          />
          <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
            <span>Flat</span>
            <span>Fan</span>
          </div>
          {/* Arc preview */}
          <div className="flex justify-center items-end gap-0 mt-2 h-8">
            {[0, 1, 2, 3, 4].map((i) => {
              const mid = 2;
              const t = (i - mid) / mid; // -1 to 1
              const intensity = handArc / 100;
              const rotation = t * 20 * intensity;
              return (
                <div
                  key={i}
                  className="w-3 h-5 rounded-[2px] border border-gray-600 bg-gray-800"
                  style={{
                    transform: `rotate(${rotation}deg)`,
                    transformOrigin: "center bottom",
                    marginLeft: i === 0 ? 0 : "-2px",
                  }}
                />
              );
            })}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {gameState && (
            <button
              onClick={() => setFeedbackOpen(true)}
              className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white py-2 rounded-lg text-sm font-bold transition"
            >
              {ICONS.bug} Report Bug / Feature
            </button>
          )}

          {canSave && (
            <button
              disabled={saving}
              onClick={() => {
                if (!confirmSave) {
                  setConfirmSave(true);
                  return;
                }
                setSaving(true);
                saveGame((success) => {
                  setSaving(false);
                  if (!success) setConfirmSave(false);
                });
              }}
              className={`w-full py-2 rounded-lg text-sm font-bold transition ${
                confirmSave
                  ? "bg-[var(--color-card-blue)] hover:bg-blue-600 text-white"
                  : "bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white"
              }`}
            >
              {saving
                ? "Saving..."
                : confirmSave
                  ? "Confirm Save & Quit?"
                  : "Save & Quit"}
            </button>
          )}

          {gameState && (
            <button
              onClick={handleLeave}
              className={`w-full py-2 rounded-lg text-sm font-bold transition ${
                confirmLeave
                  ? "bg-red-700 hover:bg-red-600 text-white"
                  : "bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white"
              }`}
            >
              {confirmLeave ? "Confirm Leave Game?" : "Leave Game"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ToggleRow({ label, icon, active, onToggle }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-300 text-sm">
        {icon} {label}
      </span>
      <button
        onClick={onToggle}
        className={`w-12 h-6 rounded-full transition-colors relative ${active ? "bg-[var(--color-gold)]" : "bg-gray-700"}`}
      >
        <div
          className={`w-5 h-5 rounded-full bg-white shadow absolute top-0.5 transition-all ${active ? "left-6" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}

function FeedbackModalInline({ onClose, onCloseMenu }) {
  const { gameState } = useStore();
  const [type, setType] = useState("bug");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [screenshot, setScreenshot] = useState(null); // base64 data URL
  const [capturing, setCapturing] = useState(false);

  const captureScreenshot = async () => {
    setCapturing(true);
    setSubmitError(null);
    try {
      // Temporarily hide the modal overlay so it doesn't appear in screenshot
      const modalEl = document.querySelector("[data-feedback-modal]");
      if (modalEl) modalEl.style.visibility = "hidden";

      // Small delay to let the browser repaint without the modal
      await new Promise((r) => setTimeout(r, 100));

      const { default: html2canvas } = await import("html2canvas");
      const canvas = await html2canvas(document.body, {
        backgroundColor: "#000",
        scale: 1,
        logging: false,
        useCORS: true,
      });

      if (modalEl) modalEl.style.visibility = "";
      const dataUrl = canvas.toDataURL("image/png", 0.8);
      setScreenshot(dataUrl);
    } catch (e) {
      console.error("Screenshot capture failed:", e);
      const modalEl = document.querySelector("[data-feedback-modal]");
      if (modalEl) modalEl.style.visibility = "";
      setSubmitError(
        "Screenshot capture failed. Try attaching a file instead.",
      );
    } finally {
      setCapturing(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setScreenshot(reader.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    const label = type === "bug" ? "bug" : "enhancement";
    const gameContext = [
      `**Turn:** ${gameState.turnNumber}`,
      `**Players:** ${Object.values(gameState.players)
        .map((p) => p.name)
        .join(", ")}`,
      `**My SP:** ${gameState.players[gameState.myId]?.sp}`,
      `**My creatures:** ${gameState.players[gameState.myId]?.swamp?.map((c) => c.name).join(", ") || "none"}`,
    ].join("\n");
    const body = `## Description\n${description || "_No description provided_"}\n\n## Game Context\n${gameContext}\n\n---\n_Submitted from in-game feedback_`;

    // Extract base64 data without the data URL prefix
    const screenshotBase64 = screenshot
      ? screenshot.replace(/^data:image\/png;base64,/, "")
      : null;

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          labels: label,
          screenshot: screenshotBase64,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit");
      setSubmitted(true);
    } catch (e) {
      setSubmitError("Failed to submit. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-feedback-modal
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 pointer-events-auto"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {submitted ? (
          <div className="text-center py-4">
            <div className="text-3xl mb-3">{ICONS.sparkles}</div>
            <h3 className="text-white text-lg font-bold mb-2">
              Thanks for the feedback!
            </h3>
            <p className="text-gray-400 text-sm mb-4">
              Your feedback has been submitted.
            </p>
            <button
              onClick={() => {
                onClose();
                onCloseMenu();
              }}
              className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-2 rounded-lg transition"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <h3 className="text-white text-lg font-bold mb-4">
              Report a Bug or Request a Feature
            </h3>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setType("bug")}
                className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${type === "bug" ? "bg-red-700 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
              >
                {ICONS.bug} Bug Report
              </button>
              <button
                onClick={() => setType("feature")}
                className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${type === "feature" ? "bg-purple-700 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"}`}
              >
                {ICONS.sparkles} Feature Request
              </button>
            </div>
            <input
              type="text"
              placeholder={
                type === "bug"
                  ? "What went wrong?"
                  : "What would you like to see?"
              }
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm mb-3 focus:outline-none focus:border-[var(--color-gold)]"
              autoFocus
            />
            <textarea
              placeholder="Add any details... (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-white text-sm mb-3 focus:outline-none focus:border-[var(--color-gold)] resize-none"
            />
            {/* Screenshot capture */}
            <div className="mb-3">
              {screenshot ? (
                <div className="relative">
                  <img
                    src={screenshot}
                    alt="Screenshot"
                    className="w-full rounded-lg border border-gray-700"
                  />
                  <button
                    onClick={() => setScreenshot(null)}
                    className="absolute top-1 right-1 bg-red-800 text-white text-[10px] px-1.5 py-0.5 rounded hover:bg-red-700"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={captureScreenshot}
                    disabled={capturing}
                    className="flex-1 bg-gray-800 border border-gray-700 hover:border-gray-500 text-gray-300 text-sm py-2 rounded-lg transition flex items-center justify-center gap-1"
                  >
                    {capturing
                      ? "Capturing..."
                      : `${ICONS.camera} Capture Screen`}
                  </button>
                  <label className="flex-1 bg-gray-800 border border-gray-700 hover:border-gray-500 text-gray-300 text-sm py-2 rounded-lg transition flex items-center justify-center gap-1 cursor-pointer">
                    {ICONS.upload} Choose File
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              )}
            </div>
            <p className="text-gray-500 text-[11px] mb-4">
              Your game context will be automatically attached.
            </p>
            {submitError && (
              <p className="text-red-400 text-[12px] mb-3">{submitError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!title.trim() || submitting}
                className="flex-1 bg-[var(--color-gold)] hover:bg-yellow-400 disabled:bg-gray-700 disabled:text-gray-500 text-black font-bold py-2 rounded-lg transition"
              >
                {submitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
