import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Satellite } from 'lucide-react';
import { AppShell, applyTheme, readTheme, CitationsProvider, type ShellConfig } from '@fasl-work/caos-app-shell';
import '@fasl-work/caos-app-shell/styles.css';
import './tailwatch.css';
import { CITATIONS } from './data/citations';
import Tool from './pages/Tool';
import Methodology from './pages/Methodology';
import Decision from './pages/Decision';
import Cases from './pages/Cases';
import Experiments from './pages/Experiments';
import About from './pages/About';

applyTheme(readTheme());

const config: ShellConfig = {
  product: { name: 'TailWatch', mark: <Satellite size={18} aria-hidden="true" /> },
  routes: [
    { path: '/', en: 'App', es: 'App' },
    { path: '/methodology', en: 'Methodology', es: 'Metodología' },
    { path: '/decision', en: 'Decision', es: 'Decisión' },
    { path: '/cases', en: 'Cases', es: 'Casos' },
    { path: '/experiments', en: 'Experiments', es: 'Experimentos' },
    { path: '/about', en: 'About', es: 'Acerca' },
  ],
  links: { github: 'https://github.com/fsantibanezleal/CAOS_TailWatch' },
  version: '0.05.000',
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <CitationsProvider items={CITATIONS}>
        <AppShell config={config}>
          <Routes>
            <Route path="/" element={<Tool />} />
            <Route path="/methodology" element={<Methodology />} />
            <Route path="/decision" element={<Decision />} />
            <Route path="/cases" element={<Cases />} />
            <Route path="/experiments" element={<Experiments />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<Tool />} />
          </Routes>
        </AppShell>
      </CitationsProvider>
    </BrowserRouter>
  </StrictMode>,
);
