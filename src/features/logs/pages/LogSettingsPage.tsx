import { useParams } from 'react-router';
import { PageLayout } from '../../../components';
import { useLogTheme } from '../../../hooks/useLogTheme';

export function LogSettingsPage() {
  const { logId } = useParams();
  useLogTheme(logId);
  return <PageLayout title="Log settings" backTo={`/logs/${logId}`} />;
}
