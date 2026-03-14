import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { execSync } from 'child_process';

const commitHash = execSync('git rev-parse --short HEAD').toString().trim();

// Goblin-themed codenames — one per build, picked by commit hash
const CODENAMES = [
  'Sneaky Goblin', 'Bog Lurker', 'Swamp Thing', 'Grim Toad',
  'Foul Brew', 'Mud Fang', 'Rat King', 'Sludge Lord',
  'Cave Creep', 'Wart Nose', 'Stink Eye', 'Bone Picker',
  'Muck Raker', 'Frog Breath', 'Snaggletooth', 'Dung Beetle',
  'Moss Brain', 'Rusty Shank', 'Belly Flop', 'Troll Snot',
  'Grub Muncher', 'Bog Witch', 'Slime Trail', 'Night Crawler',
  'Fizz Bang', 'Skull Bash', 'Ankle Biter', 'Doom Croak',
  'Gutter Rat', 'Blister Pop', 'Worm Tongue', 'Puddle Jump',
];
const hashNum = parseInt(commitHash, 16);
const codename = CODENAMES[hashNum % CODENAMES.length];
const APP_VERSION = `0.2.${codename.replace(' ', '-')}-${commitHash}`;

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
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
      '/api': {
        target: 'http://localhost:3001',
      },
    },
  },
});
