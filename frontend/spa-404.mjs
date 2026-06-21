// SPA deep-link fallback for GitHub Pages. The app uses BrowserRouter (history API), so a hard navigation / reload /
// shared link to a sub-route (e.g. /methodology) hits GitHub Pages directly, which has no such file and serves its 404.
// Copying the built index.html to dist/404.html makes Pages return the SPA shell for any unknown path; the bundled JS
// boots and BrowserRouter reads window.location.pathname to render the right page. Runs as `postbuild` (after vite build,
// so the hashed asset references in index.html are already final). Root-absolute asset paths (base '/') resolve from any
// depth, so a straight copy is correct.
import { copyFileSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const dist = resolve(dirname(fileURLToPath(import.meta.url)), 'dist');
const index = resolve(dist, 'index.html');
if (!existsSync(index)) {
  console.error('[spa-404] dist/index.html not found — run after `vite build`');
  process.exit(1);
}
copyFileSync(index, resolve(dist, '404.html'));
console.log('[spa-404] dist/index.html -> dist/404.html (SPA deep-link fallback)');
