import { useRef, useState } from 'react';
import { Avatar, ConfirmDialog, IconButton } from '../../../components';
import { useBlobImage } from '../../../hooks/useBlobImage';
import type { Entry, ImageRatio, Person } from '../../../types';
import styles from './MemberRow.module.css';

interface MemberRowProps {
  person: Person;
  /** This member's photo in the current slot, if any. */
  entry?: Entry;
  imageRatio: ImageRatio;
  /** The current slot, e.g. "10:00–12:00", shown on the frame so it's always visible. */
  slotLabel: string;
  onPhoto: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
}

/** One member in the current slot: name, then their photo in the log's ratio, labelled with the slot. */
export function MemberRow({
  person,
  entry,
  imageRatio,
  slotLabel,
  onPhoto,
  onRemove,
}: MemberRowProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const imageRef = useBlobImage(entry?.imageBlob);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [confirmRemove, setConfirmRemove] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(undefined);
    setBusy(true);
    try {
      await onPhoto(file);
    } catch {
      setError("Couldn't read that image. Try a JPEG or PNG.");
    } finally {
      setBusy(false);
    }
  }

  const chooseFile = () => fileInput.current?.click();

  return (
    <li className={styles.row}>
      <div className={styles.who}>
        <Avatar name={person.name} color={person.color} imageBlob={person.avatarBlob} size={32} />
        <span className={styles.name}>{person.name}</span>
      </div>

      <div className={styles.frame} style={{ aspectRatio: imageRatio.replace(':', ' / ') }}>
        {entry ? (
          <>
            <img
              ref={imageRef}
              alt={`${person.name}'s photo`}
              className={styles.photo}
              style={{
                // Zoom around the crop's focal point, which also positions the cover-fit.
                objectPosition: `${entry.crop.x * 100}% ${entry.crop.y * 100}%`,
                transformOrigin: `${entry.crop.x * 100}% ${entry.crop.y * 100}%`,
                transform: `scale(${entry.crop.zoom})`,
              }}
            />
            <span className={styles.slotBadge}>{slotLabel}</span>
            <div className={styles.photoActions}>
              <IconButton
                variant="filled"
                aria-label={`Replace ${person.name}'s photo`}
                onClick={chooseFile}
                disabled={busy}
              >
                ⟳
              </IconButton>
              <IconButton
                variant="filled"
                aria-label={`Remove ${person.name}'s photo`}
                onClick={() => setConfirmRemove(true)}
                disabled={busy}
              >
                ✕
              </IconButton>
            </div>
          </>
        ) : (
          <button
            type="button"
            className={styles.add}
            onClick={chooseFile}
            disabled={busy}
            aria-label={`Add ${person.name}'s photo`}
          >
            {busy ? 'Adding…' : slotLabel}
          </button>
        )}
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          void pick(event.target.files?.[0]);
          event.target.value = ''; // allow picking the same file again
        }}
      />

      <ConfirmDialog
        open={confirmRemove}
        title={`Remove ${person.name}'s photo?`}
        confirmLabel="Remove"
        destructive
        onConfirm={async () => {
          setConfirmRemove(false);
          await onRemove();
        }}
        onCancel={() => setConfirmRemove(false)}
      >
        It's only removed from this slot.
      </ConfirmDialog>
    </li>
  );
}
