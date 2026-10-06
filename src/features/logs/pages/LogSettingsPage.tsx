import { useParams } from 'react-router';
import { NotFoundPage, PageLayout } from '../../../components';
import { useLogForEdit } from '../api';
import { LogForm } from '../components/LogForm';

export function LogSettingsPage() {
  const { logId } = useParams();
  const data = useLogForEdit(logId);

  if (data === null) return <NotFoundPage backTo="/logs" />;
  if (data === undefined) return <PageLayout title="Log settings" backTo="/logs" />; // loading

  return <LogForm key={data.log.id} mode="edit" data={data} />;
}
