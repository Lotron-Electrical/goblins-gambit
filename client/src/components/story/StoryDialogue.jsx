/**
 * StoryDialogue — typewriter text overlay for character dialogue.
 */

import { useState, useEffect } from "react";

export default function StoryDialogue({ characterName, text, onDismiss }) {
  const [displayedText, setDisplayedText] = useState("");
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!text) return;
    setDisplayedText("");
    setIsComplete(false);
    let idx = 0;
    const interval = setInterval(() => {
      idx++;
      if (idx >= text.length) {
        setDisplayedText(text);
        setIsComplete(true);
        clearInterval(interval);
      } else {
        setDisplayedText(text.slice(0, idx));
      }
    }, 30);
    return () => clearInterval(interval);
  }, [text]);

  const handleClick = () => {
    if (!isComplete) {
      setDisplayedText(text);
      setIsComplete(true);
    } else {
      onDismiss?.();
    }
  };

  if (!text) return null;

  return (
    <div
      className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 bg-gray-950/95 border-2 border-amber-600 rounded-xl px-6 py-4 max-w-md cursor-pointer shadow-2xl shadow-amber-900/20"
      onClick={handleClick}
    >
      <div className="text-amber-400 font-display text-sm mb-1">
        {characterName}
      </div>
      <div className="text-gray-200 text-sm min-h-[2.5em]">
        "{displayedText}"
        {!isComplete && <span className="animate-pulse text-amber-400">|</span>}
      </div>
      <div className="text-gray-600 text-[10px] mt-2 text-right">
        {isComplete ? "Click to continue" : "Click to skip"}
      </div>
    </div>
  );
}
