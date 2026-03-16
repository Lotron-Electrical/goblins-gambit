import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import { execSync } from "child_process";
const commitHash = execSync("git rev-parse --short HEAD").toString().trim();

// Goblin-themed codenames — two-word combos generated from hash
const FIRST = [
  "Sneaky",
  "Boggy",
  "Grim",
  "Foul",
  "Rusty",
  "Slimy",
  "Rotten",
  "Crusty",
  "Manky",
  "Grimy",
  "Musty",
  "Murky",
  "Scabby",
  "Wonky",
  "Filthy",
  "Lumpy",
  "Grotty",
  "Dank",
  "Mouldy",
  "Cursed",
  "Wicked",
  "Putrid",
  "Gnarly",
  "Festering",
  "Dodgy",
  "Grubby",
  "Rabid",
  "Toxic",
  "Savage",
  "Warty",
  "Busted",
  "Crooked",
  "Charred",
  "Soggy",
  "Tangled",
  "Bloated",
  "Jagged",
  "Twisted",
  "Barmy",
  "Craggy",
];
const SECOND = [
  "Goblin",
  "Toad",
  "Fang",
  "Lurker",
  "Brew",
  "Skull",
  "Snot",
  "Beetle",
  "Rat",
  "Brain",
  "Shank",
  "Tongue",
  "Witch",
  "Crawler",
  "Croak",
  "Muncher",
  "Snorkle",
  "Picker",
  "Spitter",
  "Guts",
  "Fungus",
  "Worm",
  "Stench",
  "Boggart",
  "Maggot",
  "Troll",
  "Badger",
  "Swamp",
  "Hag",
  "Roach",
  "Grub",
  "Boil",
  "Barnacle",
  "Serpent",
  "Pustule",
  "Mange",
  "Ghoul",
  "Giblet",
  "Splinter",
  "Sludge",
];
const hashNum = parseInt(commitHash, 16);
const first = FIRST[hashNum % FIRST.length];
const second = SECOND[Math.floor(hashNum / FIRST.length) % SECOND.length];
const APP_VERSION = `0.4.${first}-${second}`;

export default defineConfig({
  root: path.resolve(__dirname),
  plugins: [react(), tailwindcss()],
  define: {
    __APP_VERSION__: JSON.stringify(APP_VERSION),
    __COMMIT_HASH__: JSON.stringify(commitHash),
  },
  server: {
    port: 5173,
    proxy: {
      "/socket.io": {
        target: "http://localhost:3001",
        ws: true,
      },
      "/api": {
        target: "http://localhost:3001",
      },
    },
  },
});
