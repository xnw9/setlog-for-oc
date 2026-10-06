import { useParams } from 'react-router';
import { NotFoundPage, PageLayout } from '../../../components';
import { useLogTheme } from '../../../hooks/useLogTheme';

export function DayViewPage() {
  const { logId, dayIndex } = useParams();
  useLogTheme(logId);

  // Day indexes are 0, 1, 2… Anything else (e.g. /days/abc) is not a real day.
  if (!/^\d+$/.test(dayIndex ?? '')) return <NotFoundPage />;

  return <PageLayout title="Day" backTo="/logs" />;
}
