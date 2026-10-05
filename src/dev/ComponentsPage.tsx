import { useState } from 'react';
import {
  Avatar,
  Button,
  Card,
  ConfirmDialog,
  IconButton,
  PageLayout,
  SegmentedControl,
  TextField,
} from '../components';
import { useDocumentTheme } from '../hooks/useDocumentTheme';
import type { ImageRatio, SlotHours, ThemeName } from '../types';
import styles from './ComponentsPage.module.css';

/** Dev-only gallery of the shared components (/#/dev/components). Not in production builds. */
export default function ComponentsPage() {
  const [name, setName] = useState('');
  const [slotHours, setSlotHours] = useState<SlotHours>(2);
  const [ratio, setRatio] = useState<ImageRatio>('16:9');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lastChoice, setLastChoice] = useState('none yet');
  const [theme, setTheme] = useState<ThemeName>('pastel');
  useDocumentTheme(theme);

  return (
    <PageLayout title="Components" backTo="/">
      <Card className={styles.section}>
        <SegmentedControl<ThemeName>
          label="Theme"
          options={[
            { value: 'pastel', label: 'Pastel' },
            { value: 'mint', label: 'Mint' },
            { value: 'peach', label: 'Peach' },
            { value: 'lavender', label: 'Lavender' },
          ]}
          value={theme}
          onChange={setTheme}
        />
      </Card>

      <Card className={styles.section}>
        <h2>Button</h2>
        <div className={styles.row}>
          <Button>Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button disabled>Disabled</Button>
        </div>
      </Card>

      <Card className={styles.section}>
        <h2>IconButton</h2>
        <div className={styles.row}>
          <IconButton aria-label="Previous">‹</IconButton>
          <IconButton aria-label="Next">›</IconButton>
          <IconButton aria-label="Export" variant="filled">
            ⤓
          </IconButton>
          <IconButton aria-label="Disabled" disabled>
            ›
          </IconButton>
        </div>
      </Card>

      <Card className={styles.section}>
        <h2>Avatar</h2>
        <div className={styles.row}>
          <Avatar name="Ava Chen" color="#f7a8c4" />
          <Avatar name="Ben" color="#c9e4ff" size={56} />
          <Avatar name="Cleo Park" color="#c8f0d8" size={72} />
        </div>
      </Card>

      <Card className={styles.section}>
        <h2>TextField</h2>
        <TextField
          label="Name"
          placeholder="e.g. Ava"
          value={name}
          onChange={(event) => setName(event.target.value)}
          hint="Shown on cards and exports."
        />
        <TextField label="With error" defaultValue="" error="Name is required." />
      </Card>

      <Card className={styles.section}>
        <h2>SegmentedControl</h2>
        <SegmentedControl<SlotHours>
          label="Slot length"
          options={[
            { value: 1, label: '1 h' },
            { value: 2, label: '2 h' },
            { value: 4, label: '4 h' },
          ]}
          value={slotHours}
          onChange={setSlotHours}
        />
        <SegmentedControl<ImageRatio>
          label="Image ratio"
          options={[
            { value: '16:9', label: '16:9' },
            { value: '4:3', label: '4:3' },
            { value: '3:2', label: '3:2' },
          ]}
          value={ratio}
          onChange={setRatio}
        />
        <SegmentedControl<SlotHours>
          label="Locked (log has pictures)"
          options={[
            { value: 1, label: '1 h' },
            { value: 2, label: '2 h' },
            { value: 4, label: '4 h' },
          ]}
          value={2}
          onChange={() => {}}
          disabled
        />
      </Card>

      <Card className={styles.section}>
        <h2>ConfirmDialog</h2>
        <div className={styles.row}>
          <Button variant="ghost" onClick={() => setDialogOpen(true)}>
            Open dialog
          </Button>
          <span>Last choice: {lastChoice}</span>
        </div>
        <ConfirmDialog
          open={dialogOpen}
          title="Delete 3 pictures?"
          confirmLabel="Delete"
          destructive
          onConfirm={() => {
            setLastChoice('confirmed');
            setDialogOpen(false);
          }}
          onCancel={() => {
            setLastChoice('cancelled');
            setDialogOpen(false);
          }}
        >
          Narrowing the hours removes the 20:00–22:00 slot, which has 3 pictures.
        </ConfirmDialog>
      </Card>
    </PageLayout>
  );
}
