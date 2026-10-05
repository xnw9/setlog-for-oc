import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router';
import { DayViewPage } from '../features/day-view';
import { LandingPage, LogHomePage, LogSettingsPage, NewLogPage } from '../features/logs';
import { PeoplePage } from '../features/people';

// Dev-only component gallery. In production builds import.meta.env.DEV is false, so Vite drops it.
const ComponentsPage = import.meta.env.DEV ? lazy(() => import('../dev/ComponentsPage')) : null;

// Hash URLs (/#/people) so the static site needs no server rewrites on GitHub/Cloudflare Pages.
export function App() {
  return (
    <HashRouter>
      <Suspense>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/people" element={<PeoplePage />} />
          <Route path="/logs/new" element={<NewLogPage />} />
          <Route path="/logs/:logId" element={<LogHomePage />} />
          <Route path="/logs/:logId/settings" element={<LogSettingsPage />} />
          <Route path="/logs/:logId/days/:dayIndex" element={<DayViewPage />} />
          {ComponentsPage && <Route path="/dev/components" element={<ComponentsPage />} />}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </HashRouter>
  );
}
