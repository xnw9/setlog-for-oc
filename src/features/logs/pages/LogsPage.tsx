import { useState } from 'react';
import { Link } from 'react-router';
import { Avatar, Button, ConfirmDialog, IconButton, PageLayout } from '../../../components';
import { deleteLog, useLogSummaries, type LogSummary } from '../api';
import styles from './LogsPage.module.css';

const MAX_AVATARS = 5;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

export function LogsPage() {
  const summaries = useLogSummaries();
  const [deleting, setDeleting] = useState<LogSummary>();

  return (
    <PageLayout title="Logs" backTo="/">
      <Button to="/logs/new" block>
        + New log
      </Button>

      {summaries && summaries.length > 0 && (
        <ul className={styles.list}>
          {summaries.map((summary) => {
            const { log, members, dayCount } = summary;
            return (
              <li key={log.id} className={styles.item}>
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
                <div className={styles.actions}>
                  <IconButton to={`/logs/${log.id}/settings`} aria-label={`${log.name} settings`}>
                    ⚙
                  </IconButton>
                  <IconButton
                    aria-label={`Delete ${log.name}`}
                    onClick={() => setDeleting(summary)}
                  >
                    🗑
                  </IconButton>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={deleting !== undefined}
        title={`Delete ${deleting?.log.name}?`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          if (deleting) await deleteLog(deleting.log.id);
          setDeleting(undefined);
        }}
        onCancel={() => setDeleting(undefined)}
      >
        {deleting &&
          `This deletes its ${plural(deleting.dayCount, 'day')} and ` +
            `${plural(deleting.pictureCount, 'picture')}. It can't be undone.`}
      </ConfirmDialog>
    </PageLayout>
  );
}
