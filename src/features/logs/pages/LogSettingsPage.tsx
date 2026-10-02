import { useParams } from 'react-router';
import { PageLayout } from '../../../components';

export function LogSettingsPage() {
  const { logId } = useParams();
  return <PageLayout title="Log settings" backTo={`/logs/${logId}`} />;
}
