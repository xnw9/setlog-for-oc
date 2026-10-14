import { useRef, useState } from 'react';
import { Avatar, ConfirmDialog, IconButton } from '../../../components';
import { useBlobImage } from '../../../hooks/useBlobImage';
import type { Entry, ImageRatio, Person } from '../../../types';
import { InlineEdit } from './InlineEdit';
import { PersonPicker } from './PersonPicker';
import styles from './MemberRow.module.css';

interface MemberRowProps {
  person: Person;
  /** This member's photo in the current slot, if any. */
  entry?: Entry;
  /** The log's members, who can comment on the photo. */
  members: Person[];
  /** The frame's shape; omit to stretch it to fill the row (the log's "fit to screen" mode). */
  imageRatio?: ImageRatio;
  /** The current slot, e.g. "10:00–12:00", shown on the frame so it's always visible. */
  slotLabel: string;
  onPhoto: (file: File) => Promise<void>;
  onRemove: () => Promise<void>;
  /** Saves the caption; an empty string removes it. */
  onCaption: (caption: string) => Promise<void>;
  /** Saves who commented and what they said. */
  onComment: (personId: string, text: string) => Promise<void>;
  onRemoveComment: () => Promise<void>;
}

/** One member in the current slot: name, then their photo in the log's ratio, labelled with the slot. */
export function MemberRow({
  person,
  entry,
  members,
  imageRatio,
  slotLabel,
  onPhoto,
  onRemove,
  onCaption,
  onComment,
  onRemoveComment,
}: MemberRowProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const imageRef = useBlobImage(entry?.imageBlob);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [editingCaption, setEditingCaption] = useState(false);
  const [editingComment, setEditingComment] = useState(false);
  const [pickingCommenter, setPickingCommenter] = useState(false);

  // A comment by someone who's no longer a member shows as no comment.
  const commenter = members.find((member) => member.id === entry?.comment?.personId);
  const comment = commenter && entry?.comment;

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
              <span className={`${styles.photoText} ${styles.glow}`}>{slotLabel}</span>
              {editingCaption ? (
                <InlineEdit
                  className={`${styles.photoText} ${styles.pill} ${styles.captionInput}`}
                  aria-label={`Caption for ${person.name}'s photo`}
                  placeholder="Add a caption"
                  initial={entry.caption ?? ''}
                  onSave={(caption) => void onCaption(caption)}
                  onDone={() => setEditingCaption(false)}
                />
              ) : (
                entry.caption && (
                  <span className={`${styles.photoText} ${styles.glow} ${styles.caption}`}>
                    {entry.caption}
                  </span>
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

            {/* Bottom-left: 💬, or the commenter's avatar and what they said. */}
            <div className={styles.comment}>
              {comment ? (
                <>
                  <button
                    type="button"
                    className={styles.commenter}
                    aria-label={`Comment by ${commenter.name}. Change who's commenting`}
                    onClick={() => setPickingCommenter(true)}
                  >
                    <Avatar
                      name={commenter.name}
                      color={commenter.color}
                      imageBlob={commenter.avatarBlob}
                      size={40}
                    />
                  </button>
                  {editingComment ? (
                    <InlineEdit
                      className={`${styles.photoText} ${styles.pill} ${styles.commentInput}`}
                      aria-label={`${commenter.name}'s comment on ${person.name}'s photo`}
                      placeholder="Add a comment"
                      initial={comment.text}
                      onSave={(text) => void onComment(commenter.id, text)}
                      onDone={() => setEditingComment(false)}
                    />
                  ) : (
                    <button
                      type="button"
                      className={`${styles.photoText} ${styles.pill} ${styles.commentText}`}
                      aria-label={`Edit ${commenter.name}'s comment`}
                      onClick={() => setEditingComment(true)}
                    >
                      {comment.text || <span className={styles.placeholder}>Add a comment</span>}
                    </button>
                  )}
                </>
              ) : (
                <IconButton
                  variant="filled"
                  aria-label={`Comment on ${person.name}'s photo`}
                  onClick={() => setPickingCommenter(true)}
                  disabled={busy}
                >
                  💬
                </IconButton>
              )}
            </div>

            <IconButton
              variant="filled"
              className={styles.captionButton}
              aria-label={`${entry.caption ? 'Edit' : 'Add'} caption for ${person.name}'s photo`}
              onClick={() => setEditingCaption(true)}
              disabled={busy || editingCaption}
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

      {pickingCommenter && (
        <PersonPicker
          title="Who's commenting?"
          people={members}
          selectedId={comment ? commenter.id : undefined}
          onPick={async (personId) => {
            setPickingCommenter(false);
            await onComment(personId, comment ? comment.text : '');
            setEditingComment(true); // straight on to writing the comment
          }}
          onRemove={
            comment
              ? async () => {
                  setPickingCommenter(false);
                  await onRemoveComment();
                }
              : undefined
          }
          onClose={() => setPickingCommenter(false)}
        />
      )}

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
