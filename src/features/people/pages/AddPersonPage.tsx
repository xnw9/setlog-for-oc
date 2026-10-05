import { PageLayout } from '../../../components';
import { PersonForm } from '../components/PersonForm';

// No header back button: Cancel is the way out, so unsaved changes get the discard prompt.
export function AddPersonPage() {
  return (
    <PageLayout title="Add person">
      <PersonForm />
    </PageLayout>
  );
}
