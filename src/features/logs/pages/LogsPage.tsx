import { Link } from 'react-router';
import { Avatar, Button, PageLayout } from '../../../components';
import { useLogSummaries } from '../api';
import styles from './LogsPage.module.css';

const MAX_AVATARS = 5;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

export function LogsPage() {
  const summaries = useLogSummaries();

  return (
    <PageLayout title="Logs" backTo="/">
      <Button to="/logs/new" block>
        + New log
      </Button>

      {summaries && summaries.length > 0 && (
        <ul className={styles.list}>
          {summaries.map(({ log, members, dayCount }) => (
            <li key={log.id}>
              <Link to={`/logs/${log.id}`} className={styles.card}>
                <span className={styles.name}>{log.name}</span>
                <span className={styles.meta}>
                  {plural(dayCount, 'day')} · {plural(members.length, 'member')}
                </span>
                <span className={styles.avatars}>
                  {members.slice(0, MAX_AVATARS).map((person) => (
                    <Avatar
                      key={person.id}
                      name={person.name}
                      color={person.color}
                      imageBlob={person.avatarBlob}
                      size={32}
                    />
                  ))}
                  {members.length > MAX_AVATARS && (
                    <span className={styles.more}>+{members.length - MAX_AVATARS}</span>
                  )}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageLayout>
  );
}
