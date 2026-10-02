import { useParams } from 'react-router';
import { NotFoundPage, PageLayout } from '../../../components';

export function DayViewPage() {
  const { dayIndex } = useParams();

  // Day indexes are 0, 1, 2… Anything else (e.g. /days/abc) is not a real day.
  if (!/^\d+$/.test(dayIndex ?? '')) return <NotFoundPage />;

  return <PageLayout title="Day" backTo="/" />;
}
