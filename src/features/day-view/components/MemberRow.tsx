import { useRef, useState, type KeyboardEvent } from 'react';
import { Avatar, ConfirmDialog, IconButton } from '../../../components';
import { useBlobImage } from '../../../hooks/useBlobImage';
import type { Entry, ImageRatio, Person } from '../../../types';
import { CAPTION_MAX_LENGTH } from '../api';
import styles from './MemberRow.module.css';

interface MemberRowProps {
  person: Person;
  /** This member's photo in the current slot, if any. */
  entry?: Entry;
  /** The frame's shape; omit to stretch it to fill the row (the log's "fit to screen" mode). */
  imageRatio?: ImageRatio;
  /** The current slot, e.g. "10:00–12:00", shown on the frame so it's always visible. */
  slotLabel: string;
  onPhoto: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  /** Saves the caption; an empty string removes it. */
  onCaption: (caption: string) => Promise<void>;
}

/** One member in the current slot: name, then their photo in the log's ratio, labelled with the slot. */
export function MemberRow({
  person,
  entry,
  imageRatio,
  slotLabel,
  onPhoto,
  onRemove,
  onCaption,
}: MemberRowProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const imageRef = useBlobImage(entry?.imageBlob);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [confirmRemove, setConfirmRemove] = useState(false);
  /** The caption being typed, or undefined when not editing. */
  const [captionDraft, setCaptionDraft] = useState<string>();
  const cancelledEdit = useRef(false);

  function finishCaption() {
    if (captionDraft === undefined) return;
    if (!cancelledEdit.current && captionDraft.trim() !== (entry?.caption ?? '')) {
      void onCaption(captionDraft);
    }
    cancelledEdit.current = false;
    setCaptionDraft(undefined);
  }

  function onCaptionKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') event.currentTarget.blur(); // blur saves
    if (event.key === 'Escape') {
      cancelledEdit.current = true;
      event.currentTarget.blur();
    }
  }

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
    <li className={[styles.row, !imageRatio && styles.fill].filter(Boolean).join(' ')}>
      <div className={styles.who}>
        <Avatar name={person.name} color={person.color} imageBlob={person.avatarBlob} size={32} />
        <span className={styles.name}>{person.name}</span>
      </div>

      <div
        className={styles.frame}
        style={imageRatio ? { aspectRatio: imageRatio.replace(':', ' / ') } : undefined}
      >
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
            <div className={styles.labels}>
              <span className={styles.badge}>{slotLabel}</span>
              {captionDraft !== undefined ? (
                <input
                  className={`${styles.badge} ${styles.captionInput}`}
                  aria-label={`Caption for ${person.name}'s photo`}
                  value={captionDraft}
                  maxLength={CAPTION_MAX_LENGTH}
                  placeholder="Add a caption"
                  autoFocus
                  onChange={(event) => setCaptionDraft(event.target.value)}
                  onKeyDown={onCaptionKey}
                  onBlur={finishCaption}
                />
              ) : (
                entry.caption && (
                  <span className={`${styles.badge} ${styles.caption}`}>{entry.caption}</span>
                )
              )}
            </div>
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
            <IconButton
              variant="filled"
              className={styles.captionButton}
              aria-label={`${entry.caption ? 'Edit' : 'Add'} caption for ${person.name}'s photo`}
              onClick={() => setCaptionDraft(entry.caption ?? '')}
              disabled={busy || captionDraft !== undefined}
            >
              ✎
            </IconButton>
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
