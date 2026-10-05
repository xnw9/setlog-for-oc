import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, ConfirmDialog } from '../../../components';
import type { Person } from '../../../types';
import { deletePerson, useLogsWithMember } from '../api';
import styles from './DeletePerson.module.css';

/** Delete button for the Edit person page; disabled while the person is in any log. */
export function DeletePerson({ person }: { person: Person }) {
  const navigate = useNavigate();
  const logs = useLogsWithMember(person.id);
  const [confirming, setConfirming] = useState(false);

  const inLogs = logs !== undefined && logs.length > 0;

  return (
    <section className={styles.section}>
      <Button
        variant="danger"
        block
        disabled={logs === undefined || inLogs}
        onClick={() => setConfirming(true)}
      >
        Delete person
      </Button>
      {inLogs && (
        <p className={styles.note}>
          In {logs.length === 1 ? '1 log' : `${logs.length} logs`}:{' '}
          {logs.map((log) => log.name).join(', ')}. Remove {person.name} from{' '}
          {logs.length === 1 ? 'that log' : 'those logs'} first.
        </p>
      )}

      <ConfirmDialog
        open={confirming}
        title={`Delete ${person.name}?`}
        confirmLabel="Delete"
        destructive
        onConfirm={async () => {
          await deletePerson(person.id);
          navigate('/people', { replace: true });
        }}
        onCancel={() => setConfirming(false)}
      >
        This can't be undone.
      </ConfirmDialog>
    </section>
  );
}
