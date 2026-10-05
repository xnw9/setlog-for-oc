import { useRef, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { Avatar, Button, ConfirmDialog, PageLayout, TextField } from '../../../components';
import { randomAvatarColor } from '../../../lib/avatarColors';
import { squareImage } from '../../../lib/image';
import type { Person } from '../../../types';
import { savePerson } from '../api';
import styles from './PersonForm.module.css';

interface PersonFormProps {
  title: string;
  /** The person being edited; omit to add a new one. */
  initial?: Person;
  /** Extra content below the form, e.g. the delete section. */
  children?: ReactNode;
}

/**
 * Page with the photo + name form, shared by Add and Edit person. Save, Cancel and the header
 * back button all return to /people; Cancel and Back ask first if there are unsaved changes.
 */
export function PersonForm({ title, initial, children }: PersonFormProps) {
  const navigate = useNavigate();
  const fileInput = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(initial?.name ?? '');
  const [avatarBlob, setAvatarBlob] = useState(initial?.avatarBlob);
  const [color] = useState(() => initial?.color ?? randomAvatarColor());
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [processingPhoto, setProcessingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState<string>();
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const trimmedName = name.trim();
  const nameError = submitted && !trimmedName ? 'Name is required.' : undefined;
  const dirty = trimmedName !== (initial?.name ?? '') || avatarBlob !== initial?.avatarBlob;

  async function choosePhoto(file: File | undefined) {
    if (!file) return;
    setPhotoError(undefined);
    setProcessingPhoto(true);
    try {
      setAvatarBlob(await squareImage(file));
    } catch {
      setPhotoError("Couldn't read that image. Try a JPEG or PNG.");
    } finally {
      setProcessingPhoto(false);
    }
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (!trimmedName) return;
    setSaving(true);
    await savePerson({ name: trimmedName, color, avatarBlob }, initial?.id);
    navigate('/people');
  }

  function cancel() {
    if (dirty) setConfirmDiscard(true);
    else navigate('/people');
  }

  return (
    <PageLayout
      title={title}
      backTo="/people"
      onBack={(event) => {
        if (!dirty) return; // follow the link
        event.preventDefault();
        setConfirmDiscard(true);
      }}
    >
      <form className={styles.form} onSubmit={save} noValidate>
        <div className={styles.photo}>
          <Avatar name={trimmedName || '?'} color={color} imageBlob={avatarBlob} size={112} />
          <div className={styles.photoActions}>
            <Button
              variant="secondary"
              onClick={() => fileInput.current?.click()}
              disabled={processingPhoto}
            >
              {processingPhoto ? 'Processing…' : avatarBlob ? 'Change photo' : 'Add photo'}
            </Button>
            {avatarBlob && (
              <Button variant="ghost" onClick={() => setAvatarBlob(undefined)}>
                Remove photo
              </Button>
            )}
          </div>
          {photoError && (
            <p className={styles.photoError} role="alert">
              {photoError}
            </p>
          )}
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(event) => {
              void choosePhoto(event.target.files?.[0]);
              event.target.value = ''; // allow picking the same file again
            }}
          />
        </div>

        <TextField
          label="Name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          error={nameError}
          maxLength={60}
          autoComplete="off"
          required
        />

        <div className={styles.actions}>
          <Button variant="ghost" onClick={cancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving || processingPhoto}>
            Save
          </Button>
        </div>

        <ConfirmDialog
          open={confirmDiscard}
          title="Discard changes?"
          confirmLabel="Discard"
          cancelLabel="Keep editing"
          destructive
          onConfirm={() => navigate('/people')}
          onCancel={() => setConfirmDiscard(false)}
        >
          Your changes to this person won't be saved.
        </ConfirmDialog>
      </form>
      {children}
    </PageLayout>
  );
}
