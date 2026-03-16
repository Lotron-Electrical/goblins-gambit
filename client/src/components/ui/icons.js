/**
 * Icon constants used across card components.
 * Using string variables to avoid JSX Unicode escape issues.
 */

export const ICONS = {
  swords: "\u2694", // ⚔
  sparkles: "\u2728", // ✨
  shield: "\uD83D\uDEE1", // 🛡
  die: "\uD83C\uDFB2", // 🎲
  lightning: "\u26A1", // ⚡
  coin: "\uD83E\uDE99", // 🪙
  muted: "\uD83D\uDD07", // 🔇
  sound: "\uD83D\uDD0A", // 🔊
  ghost: "\uD83D\uDC7B", // 👻
  clock: "\u23F0", // ⏰
  music: "\uD83C\uDFB5", // 🎵
  musicOff: "\uD83D\uDD15", // 🔕
  bug: "\uD83D\uDC1B", // 🐛
  gear: "\u2699", // ⚙
};

export const TYPE_ICON = {
  Creature: ICONS.swords,
  Magic: ICONS.sparkles,
  Armour: ICONS.shield,
  Tricks: ICONS.die,
};
