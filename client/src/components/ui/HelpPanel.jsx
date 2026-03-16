import { useEffect } from "react";
import { useStore } from "../../store.js";
import { THEME_EFFECTS } from "../../../../shared/src/constants.js";

const GLOSSARY = [
  {
    term: "SP",
    def: "Swamp Points - the victory currency. Reach the target SP to win.",
  },
  {
    term: "AP",
    def: "Action Points - spend to draw, play cards, attack, or use abilities. Reset each turn.",
  },
  { term: "ATK", def: "Attack - damage dealt when this creature attacks." },
  {
    term: "DEF",
    def: "Defence - health pool. When it reaches 0, the creature dies.",
  },
  { term: "Swamp", def: "Your battlefield. Up to 5 creatures at a time." },
  {
    term: "Gear",
    def: "Armour slots (Head, Body, Feet). Sets give bonus effects.",
  },
  {
    term: "Graveyard",
    def: "Where destroyed/used cards go. Deck reshuffles from here when empty.",
  },
  {
    term: "Creature",
    def: "Placed in your swamp. Can attack opponent creatures. Many have special abilities.",
  },
  {
    term: "Magic",
    def: "One-time spells. Buffs, damage, control effects. Goes to graveyard after use.",
  },
  {
    term: "Armour",
    def: "Equip to gear slots. Passive effects. Collect sets for bonuses.",
  },
  { term: "Tricks", def: "Free actions (0 AP). Gain SP instantly." },
  {
    term: "Taunt",
    def: "You must attack this creature before any others (Gamer Boy).",
  },
  { term: "Silence", def: "Disables a creature's ability for 1 turn (STFU)." },
];

const THEME_ICON = {
  swamp: "\u{1F33F}",
  blood: "\u{1F319}",
  frost: "\u{2744}\u{FE0F}",
};

export default function HelpPanel() {
  const { helpOpen, setHelpOpen } = useStore();

  useEffect(() => {
    if (!helpOpen) return;
    const handler = (e) => {
      if (e.key === "Escape") setHelpOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [helpOpen, setHelpOpen]);

  if (!helpOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={() => setHelpOpen(false)}
    >
      <div
        className="bg-gray-900 border border-[var(--color-gold)] rounded-xl p-6 max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl text-[var(--color-gold)]">
            How to Play
          </h2>
          <button
            onClick={() => setHelpOpen(false)}
            className="w-11 h-11 flex items-center justify-center text-gray-400 hover:text-white bg-gray-800 rounded-lg"
          >
            X
          </button>
        </div>

        {/* How to Win */}
        <h3 className="font-display text-[16px] text-white mb-1">How to Win</h3>
        <p className="text-[13px] text-gray-300 mb-3 leading-relaxed">
          Earn SP by attacking opponents with your creatures. First player to
          reach the target SP wins the game.
        </p>

        {/* Turn Structure */}
        <h3 className="font-display text-[16px] text-white mb-1">
          Turn Structure
        </h3>
        <ol className="text-[13px] text-gray-300 mb-3 leading-relaxed list-decimal list-inside space-y-0.5">
          <li>Draw cards (costs 1 AP each)</li>
          <li>Play cards from your hand (creatures, magic, armour, tricks)</li>
          <li>Attack with your creatures</li>
          <li>End your turn</li>
        </ol>

        {/* Card Types */}
        <h3 className="font-display text-[16px] text-white mb-1">Card Types</h3>
        <div className="text-[13px] text-gray-300 mb-3 space-y-1">
          <div>
            <span className="text-red-400 font-bold">\u2694 Creature</span> —
            Place on the field. Attacks opponents to earn SP.
          </div>
          <div>
            <span className="text-blue-400 font-bold">\u2728 Magic</span> —
            One-time spells: buffs, damage, control. Costs AP.
          </div>
          <div>
            <span className="text-gray-300 font-bold">\uD83D\uDEE1 Armour</span>{" "}
            — Equip to gear slots for passive effects. Collect sets for bonuses.
          </div>
          <div>
            <span className="text-green-400 font-bold">
              \uD83C\uDFB2 Tricks
            </span>{" "}
            — Free actions (0 AP). Gain SP instantly.
          </div>
        </div>

        {/* Themes */}
        <h3 className="font-display text-[16px] text-white mb-1">Themes</h3>
        <div className="text-[13px] text-gray-300 mb-4 space-y-1">
          {Object.entries(THEME_EFFECTS).map(([key, t]) => (
            <div key={key}>
              <span className="font-bold">
                {THEME_ICON[key]} {t.name}
              </span>{" "}
              — {t.description}
            </div>
          ))}
        </div>

        {/* Glossary */}
        <h3 className="font-display text-[16px] text-white mb-2">Glossary</h3>
        <div className="space-y-2">
          {GLOSSARY.map(({ term, def }) => (
            <div key={term} className="flex gap-2">
              <span className="text-[var(--color-gold)] font-bold text-[13px] shrink-0 w-20">
                {term}
              </span>
              <span className="text-[13px] text-gray-300">{def}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
