import { useLocation, useParams } from 'react-router';
import { NotFoundPage, PageLayout } from '../../../components';
import { useLogForEdit } from '../api';
import { LogForm } from '../components/LogForm';

/**
 * Where to go back to: the day view settings was opened from (it passes `state.from`), otherwise
 * /logs. Only a day view of this log is accepted, so a stale or odd value can't send you elsewhere.
 */
function useReturnTo(logId: string | undefined): string {
  const from: unknown = (useLocation().state as { from?: unknown } | null)?.from;
  return typeof from === 'string' && from.startsWith(`/logs/${logId}/days/`) ? from : '/logs';
}

export function LogSettingsPage() {
  const { logId } = useParams();
  const data = useLogForEdit(logId);
  const returnTo = useReturnTo(logId);

  if (data === null) return <NotFoundPage backTo="/logs" />;
  if (data === undefined) return <PageLayout title="Log settings" backTo={returnTo} />; // loading

  return <LogForm key={data.log.id} mode="edit" data={data} returnTo={returnTo} />;
}
