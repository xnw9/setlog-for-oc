import { HashRouter, Navigate, Route, Routes } from 'react-router';
import { DayViewPage } from '../features/day-view';
import { LandingPage, NewLogPage } from '../features/logs';
import { PeoplePage } from '../features/people';

// Hash URLs (/#/people) so the static site needs no server rewrites on GitHub/Cloudflare Pages.
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/people" element={<PeoplePage />} />
        <Route path="/logs/new" element={<NewLogPage />} />
        <Route path="/logs/:logId/days/:dayIndex" element={<DayViewPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </HashRouter>
  );
}
