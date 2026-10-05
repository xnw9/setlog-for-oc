import { useParams } from 'react-router';
import { NotFoundPage, PageLayout } from '../../../components';
import { usePerson } from '../api';
import { DeletePerson } from '../components/DeletePerson';
import { PersonForm } from '../components/PersonForm';

// No header back button: Cancel is the way out, so unsaved changes get the discard prompt.
export function EditPersonPage() {
  const { personId } = useParams();
  const person = usePerson(personId);

  if (person === null) return <NotFoundPage />;

  return (
    <PageLayout title="Edit person">
      {person && (
        <>
          <PersonForm key={person.id} initial={person} />
          <DeletePerson person={person} />
        </>
      )}
    </PageLayout>
  );
}
