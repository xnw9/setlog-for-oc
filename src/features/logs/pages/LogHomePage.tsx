import { Navigate, useParams } from 'react-router';
import { NotFoundPage } from '../../../components';
import { useOpeningDayIndex } from '../api';

/** `/logs/:logId` opens the latest day with photos, or the first day if there are none yet. */
export function LogHomePage() {
  const { logId } = useParams();
  const index = useOpeningDayIndex(logId);

  if (index === null) return <NotFoundPage backTo="/logs" />;
  if (index === undefined) return null; // loading
  return <Navigate to={`days/${index}`} replace />;
}
