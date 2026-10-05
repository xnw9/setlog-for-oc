import { Navigate } from 'react-router';

/**
 * `/logs/:logId` opens the log's last day.
 * Until the database exists there are no days to look up, so it opens day 0.
 */
export function LogHomePage() {
  return <Navigate to="days/0" replace />;
}
