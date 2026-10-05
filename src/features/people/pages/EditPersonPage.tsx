import { useParams } from 'react-router';
import { NotFoundPage, PageLayout } from '../../../components';
import { usePerson } from '../api';
import { DeletePerson } from '../components/DeletePerson';
import { PersonForm } from '../components/PersonForm';

export function EditPersonPage() {
  const { personId } = useParams();
  const person = usePerson(personId);

  if (person === null) return <NotFoundPage backTo="/people" />;
  if (person === undefined) return <PageLayout title="Edit person" backTo="/people" />; // loading

  return (
    <PersonForm key={person.id} title="Edit person" initial={person}>
      <DeletePerson person={person} />
    </PersonForm>
  );
}
