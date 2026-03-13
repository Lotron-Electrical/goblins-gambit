import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';
import { execSync } from 'child_process';

const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
const commitCount = execSync('git rev-list --count HEAD').toString().trim();
const APP_VERSION = `0.2.${commitCount}`;

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
