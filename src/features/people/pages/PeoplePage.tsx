import { Link } from 'react-router';
import { Avatar, Button, PageLayout } from '../../../components';
import { usePeople } from '../api';
import styles from './PeoplePage.module.css';

export function PeoplePage() {
  const people = usePeople();

  return (
    <PageLayout title="People" backTo="/">
      <Button to="/people/new" block>
        + Add person
      </Button>

      {people && people.length > 0 && (
        <ul className={styles.list}>
          {people.map((person) => (
            <li key={person.id}>
              <Link to={`/people/${person.id}`} className={styles.row}>
                <Avatar name={person.name} color={person.color} imageBlob={person.avatarBlob} />
                <span className={styles.name}>{person.name}</span>
                <span className={styles.chevron} aria-hidden="true">
                  ›
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageLayout>
  );
}
