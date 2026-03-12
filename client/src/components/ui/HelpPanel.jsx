import { useStore } from '../../store.js';

const GLOSSARY = [
  { term: 'SP', def: 'Swamp Points - the victory currency. Reach the target SP to win.' },
  { term: 'AP', def: 'Action Points - spend to draw, play cards, attack, or use abilities. Reset each turn.' },
  { term: 'ATK', def: 'Attack - damage dealt when this creature attacks.' },
  { term: 'DEF', def: 'Defence - health pool. When it reaches 0, the creature dies.' },
  { term: 'Swamp', def: 'Your battlefield. Up to 5 creatures at a time.' },
  { term: 'Gear', def: 'Armour slots (Head, Body, Feet). Sets give bonus effects.' },
  { term: 'Graveyard', def: 'Where destroyed/used cards go. Deck reshuffles from here when empty.' },
  { term: 'Creature', def: 'Placed in your swamp. Can attack opponent creatures. Many have special abilities.' },
  { term: 'Magic', def: 'One-time spells. Buffs, damage, control effects. Goes to graveyard after use.' },
  { term: 'Armour', def: 'Equip to gear slots. Passive effects. Collect sets for bonuses.' },
  { term: 'Tricks', def: 'Free actions (0 AP). Gain SP instantly.' },
  { term: 'Taunt', def: 'You must attack this creature before any others (Gamer Boy).' },
  { term: 'Silence', def: 'Disables a creature\'s ability for 1 turn (STFU).' },
];

export default function HelpPanel() {
  const { helpOpen, setHelpOpen } = useStore();

  if (!helpOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setHelpOpen(false)}>
      <div className="bg-gray-900 border border-[var(--color-gold)] rounded-xl p-6 max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl text-[var(--color-gold)]">How to Play</h2>
          <button onClick={() => setHelpOpen(false)} className="w-11 h-11 flex items-center justify-center text-gray-400 hover:text-white bg-gray-800 rounded-lg">X</button>
        </div>

        <div className="text-[14px] text-gray-300 mb-4 leading-relaxed">
          Draw cards, play creatures to your swamp, equip armour, cast magic spells, and pull off tricks
          to earn SP. First to reach the target SP wins!
        </div>

        <h3 className="font-display text-[16px] text-white mb-2">Glossary</h3>
        <div className="space-y-2">
          {GLOSSARY.map(({ term, def }) => (
            <div key={term} className="flex gap-2">
              <span className="text-[var(--color-gold)] font-bold text-[13px] shrink-0 w-20">{term}</span>
              <span className="text-[13px] text-gray-300">{def}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
