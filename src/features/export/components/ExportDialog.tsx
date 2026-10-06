import { useEffect, useId, useRef, useState } from 'react';
import { Button, SegmentedControl } from '../../../components';
import type { Log, ThemeName } from '../../../types';
import { useExportOptions } from '../hooks/useExportOptions';
import { exportFileName } from '../lib/fileName';
import { renderSlot, type ExportOptions, type SlotImageInput } from '../lib/render';
import { saveFiles, saveMethodFor, type ExportFile, type SaveMethod } from '../lib/save';
import styles from './ExportDialog.module.css';

interface ExportDialogProps {
  title: string;
  log: Log;
  /** One image per entry: a single slot, or every filled slot of a day. */
  slots: SlotImageInput[];
  onClose: () => void;
}

type Step =
  | { step: 'options' }
  | { step: 'rendering'; done: number }
  | { step: 'ready'; files: ExportFile[]; method: SaveMethod; reducedWidth?: number }
  | { step: 'saved' }
  | { step: 'error'; message: string };

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

const SAVE_LABEL: Record<SaveMethod, (count: number) => string> = {
  share: (n) => `Share ${plural(n, 'image')}`,
  folder: () => 'Choose folder and save',
  download: (n) => `Download ${plural(n, 'image')}`,
};

/**
 * Export options, then two steps: prepare the images, then save them. Saving is its own click
 * because the share sheet and folder picker only open straight from a tap.
 */
export function ExportDialog({ title, log, slots, onClose }: ExportDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [options, setOptions] = useExportOptions(log);
  const [state, setState] = useState<Step>({ step: 'options' });
  const set = <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) =>
    setOptions({ ...options, [key]: value });

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  async function prepare() {
    try {
      const files: ExportFile[] = [];
      let reducedWidth: number | undefined;
      for (const [index, slot] of slots.entries()) {
        setState({ step: 'rendering', done: index });
        const image = await renderSlot(slot, options);
        if (image.reduced) reducedWidth = Math.min(reducedWidth ?? Infinity, image.width);
        files.push({
          name: exportFileName(log, slot.dayIndex, slot.slotStartHour, options.format),
          blob: image.blob,
        });
      }
      setState({ step: 'ready', files, method: saveMethodFor(files), reducedWidth });
    } catch {
      setState({ step: 'error', message: "Couldn't create the images. Please try again." });
    }
  }

  async function save(files: ExportFile[], method: SaveMethod) {
    try {
      if (await saveFiles(files, method)) setState({ step: 'saved' });
    } catch {
      setState({ step: 'error', message: "Couldn't save the images. Please try again." });
    }
  }

  const busy = state.step === 'rendering';

  return (
    <dialog
      ref={ref}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>

      {(state.step === 'options' || state.step === 'rendering') && (
        <fieldset className={styles.options} disabled={busy}>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={options.showAvatars}
              onChange={(event) => set('showAvatars', event.target.checked)}
            />
            Show avatars
          </label>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={options.showEmpty}
              onChange={(event) => set('showEmpty', event.target.checked)}
            />
            Show members without a photo
          </label>
          <SegmentedControl<ExportOptions['format']>
            label="Format"
            options={[
              { value: 'png', label: 'PNG' },
              { value: 'jpeg', label: 'JPEG' },
            ]}
            value={options.format}
            onChange={(format) => set('format', format)}
          />
          <SegmentedControl<ExportOptions['width']>
            label="Width"
            options={[
              { value: 1080, label: '1080 px' },
              { value: 2160, label: '2160 px' },
            ]}
            value={options.width}
            onChange={(width) => set('width', width)}
          />
          <SegmentedControl<ThemeName>
            label="Theme"
            options={[
              { value: 'pastel', label: 'Pastel' },
              { value: 'mint', label: 'Mint' },
              { value: 'peach', label: 'Peach' },
              { value: 'lavender', label: 'Lavender' },
            ]}
            value={options.theme}
            onChange={(theme) => set('theme', theme)}
          />
        </fieldset>
      )}

      {state.step === 'rendering' && (
        <p className={styles.status} role="status">
          Preparing {state.done + 1} of {slots.length}…
        </p>
      )}
      {state.step === 'ready' && (
        <div className={styles.status} role="status">
          <p>{plural(state.files.length, 'image')} ready.</p>
          {state.reducedWidth && (
            <p className={styles.note}>
              {state.files.length === 1 ? 'It was' : 'Some were'} made{' '}
              {state.reducedWidth.toLocaleString()} px wide to fit your browser's size limit.
            </p>
          )}
        </div>
      )}
      {state.step === 'saved' && (
        <p className={styles.status} role="status">
          Saved.
        </p>
      )}
      {state.step === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}

      <div className={styles.actions}>
        {state.step === 'saved' || state.step === 'error' ? (
          <Button onClick={onClose}>Close</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose} disabled={busy}>
              Cancel
            </Button>
            {state.step === 'ready' ? (
              <Button onClick={() => save(state.files, state.method)}>
                {SAVE_LABEL[state.method](state.files.length)}
              </Button>
            ) : (
              <Button onClick={prepare} disabled={busy}>
                {slots.length === 1 ? 'Export image' : `Export ${plural(slots.length, 'image')}`}
              </Button>
            )}
          </>
        )}
      </div>
    </dialog>
  );
}
