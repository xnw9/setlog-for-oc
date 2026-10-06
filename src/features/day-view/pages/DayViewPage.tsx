import { useParams } from 'react-router';
import { NotFoundPage, PageLayout } from '../../../components';
import { useDayView } from '../api';
import { DayView } from '../components/DayView';

export function DayViewPage() {
  const { logId, dayIndex } = useParams();
  // Day indexes are 0, 1, 2… Anything else (e.g. /days/abc) is not a real day.
  const index = /^\d+$/.test(dayIndex ?? '') ? Number(dayIndex) : -1;
  const data = useDayView(logId, index);

  if (index < 0 || data === null) return <NotFoundPage backTo="/logs" />;
  if (data === undefined) return <PageLayout title="" backTo="/logs" />; // loading

  return <DayView key={data.day.id} data={data} />;
}
