import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// GitHub Pages has no SPA fallback: a direct hit / refresh on a client route (e.g. /methodology)
// returns the host 404 page. Copying the built index.html to 404.html makes Pages serve the app for
// any unknown path, so the React router can render deep links. Runs after the bundle is written, so
// 404.html carries the correct hashed asset references (a static public/404.html would not).
function spaFallback(): Plugin {
  return {
    name: 'spa-404-fallback',
    apply: 'build',
    closeBundle() {
      const idx = resolve(__dirname, 'dist/index.html');
      if (existsSync(idx)) copyFileSync(idx, resolve(__dirname, 'dist/404.html'));
    },
  };
}

// Static SPA for GitHub Pages at tailwatch.fasl-work.com (custom domain → base '/').
export default defineConfig({
  base: '/',
  plugins: [react(), spaFallback()],
  build: { target: 'es2022', outDir: 'dist', sourcemap: false },
});
