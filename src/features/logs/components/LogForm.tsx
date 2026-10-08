import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router';
import {
  Button,
  Card,
  ConfirmDialog,
  PageLayout,
  SegmentedControl,
  SelectField,
  TextField,
} from '../../../components';
import { useDocumentTheme } from '../../../hooks/useDocumentTheme';
import { dayLabel, isIsoDate, todayIsoDate, WEEKDAYS, WEEKDAY_NAMES } from '../../../lib/days';
import {
  alignEndHour,
  crossesMidnight,
  endHourOptions,
  formatHour,
  slotsFor,
  spanHours,
} from '../../../lib/slots';
import type { DayMode, ImageRatio, LabelMode, SlotHours, ThemeName, Weekday } from '../../../types';
import { usePeople } from '../../people';
import { createLog, updateLog, type LogForEdit, type NewLog } from '../api';
import { picturesToRemove, type Removal } from '../lib/removals';
import { MemberPicker } from './MemberPicker';
import styles from './LogForm.module.css';

interface Draft {
  name: string;
  memberIds: string[];
  dayMode: DayMode;
  startDate: string;
  startWeekday: Weekday;
  /** New log only. Kept as typed so the field can be cleared while editing. */
  dayCount: string;
  /** Settings only: the range of existing days to keep, inclusive. */
  keepFrom: number;
  keepUntil: number;
  slotHours: SlotHours;
  startHour: number;
  endHour: number;
  labelMode: LabelMode;
  imageRatio: ImageRatio;
  fitToScreen: boolean;
  theme: ThemeName;
}

const newDraft = (): Draft => ({
  name: '',
  memberIds: [],
  dayMode: 'date',
  startDate: todayIsoDate(),
  startWeekday: 'mon',
  dayCount: '1',
  keepFrom: 0,
  keepUntil: 0,
  slotHours: 2,
  startHour: 8,
  endHour: 22,
  labelMode: 'range',
  imageRatio: '16:9',
  fitToScreen: false,
  theme: 'pastel',
});

const draftFromLog = ({ log, days }: LogForEdit): Draft => {
  const { id: _id, firstDayKey: _firstDayKey, ...settings } = log; // the draft splits the first day by mode
  return {
    ...newDraft(),
    ...settings,
    fitToScreen: log.fitToScreen ?? false,
    startDate: log.dayMode === 'date' ? log.firstDayKey : todayIsoDate(),
    startWeekday: log.dayMode === 'weekday' ? (log.firstDayKey as Weekday) : 'mon',
    dayCount: String(days.length),
    keepFrom: 0,
    keepUntil: days.length - 1,
  };
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

const HOURS = Array.from({ length: 24 }, (_, hour) => ({ value: hour, label: formatHour(hour) }));

const slotLabel = (startHour: number, slotHours: SlotHours) =>
  `${formatHour(startHour)}–${formatHour((startHour + slotHours) % 24)}`;

type LogFormProps =
  | { mode: 'create' }
  | {
      mode: 'edit';
      data: LogForEdit;
      /** Where Back, Cancel and Save go: /logs, or the day view settings was opened from. */
      returnTo: string;
    };

/**
 * A day view path after a save that kept days keepFrom..: the same day under its new index, or
 * the nearest kept day if it was trimmed. Other paths are returned as they are.
 */
function afterTrim(path: string, keepFrom: number, keptCount: number): string {
  return path.replace(/\/days\/(\d+)/, (_, index: string) => {
    const shifted = Math.min(Math.max(Number(index) - keepFrom, 0), keptCount - 1);
    return `/days/${shifted}`;
  });
}

/**
 * The New log and Log settings pages. Settings can only trim days, and locks day mode, first day
 * and slot length while the log has pictures. Cancel, Back and Save return to /logs (settings: to
 * wherever it was opened from), asking first if anything changed; saving warns before deleting
 * pictures.
 */
export function LogForm(props: LogFormProps) {
  const data = props.mode === 'edit' ? props.data : undefined;
  const returnTo = props.mode === 'edit' ? props.returnTo : '/logs';
  const navigate = useNavigate();
  const people = usePeople();
  const [initial] = useState(() => (data ? draftFromLog(data) : newDraft()));
  const [draft, setDraft] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [pendingRemovals, setPendingRemovals] = useState<Removal[]>();
  useDocumentTheme(draft.theme); // live preview of the chosen theme

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  /** Day mode, first day and slot length can't change once the log has pictures. */
  const locked = (data?.entries.length ?? 0) > 0;
  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const firstDayKey = draft.dayMode === 'date' ? draft.startDate : draft.startWeekday;
  const dayCount = data
    ? draft.keepUntil - draft.keepFrom + 1
    : /^\d+$/.test(draft.dayCount)
      ? Number(draft.dayCount)
      : 0;
  const slots = slotsFor(draft.startHour, draft.endHour, draft.slotHours);
  // With pictures, the start moves in whole slots so every picture stays on a slot boundary.
  const startOptions = locked
    ? HOURS.filter(({ value }) => (value - initial.startHour + 24) % draft.slotHours === 0)
    : HOURS;

  const errors = {
    name: draft.name.trim() ? undefined : 'Name is required.',
    members: draft.memberIds.length > 0 ? undefined : 'Pick at least one person.',
    startDate:
      draft.dayMode === 'weekday' || isIsoDate(draft.startDate) ? undefined : 'Pick a date.',
    dayCount: dayCount >= 1 ? undefined : 'Enter a whole number of days, 1 or more.',
  };
  const shown = (error: string | undefined) => (submitted ? error : undefined);

  const label = (index: number) => dayLabel(draft.dayMode, firstDayKey, index);
  const dayPreview = data
    ? `${plural(dayCount, 'day')} kept` +
      (data.days.length > dayCount ? `, ${plural(data.days.length - dayCount, 'day')} removed` : '')
    : dayCount >= 1 && !errors.startDate
      ? `${plural(dayCount, 'day')}: ${label(0)}` +
        (dayCount > 1 ? ` → ${label(dayCount - 1)}` : '')
      : undefined;
  const slotRange = (i: number) => slotLabel(slots[i].startHour, draft.slotHours);
  const slotPreview =
    `${plural(slots.length, 'slot')}: ${slotRange(0)}` +
    (slots.length > 1 ? ` … ${slotRange(slots.length - 1)}` : '');

  const fields = (): NewLog => ({
    name: draft.name.trim(),
    memberIds: draft.memberIds,
    dayMode: draft.dayMode,
    firstDayKey,
    slotHours: draft.slotHours,
    startHour: draft.startHour,
    endHour: draft.endHour,
    labelMode: draft.labelMode,
    imageRatio: draft.imageRatio,
    fitToScreen: draft.fitToScreen,
    theme: draft.theme,
  });
  const slotStartHours = slots.map((slot) => slot.startHour);

  async function save() {
    setSaving(true);
    if (data) {
      await updateLog(data.log.id, {
        fields: fields(),
        keepFrom: draft.keepFrom,
        keepUntil: draft.keepUntil,
        slotStartHours,
      });
      navigate(afterTrim(returnTo, draft.keepFrom, dayCount));
    } else {
      navigate(`/logs/${await createLog(fields(), dayCount)}`);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    const removals = data
      ? picturesToRemove(data.entries, {
          days: data.days,
          keepFrom: draft.keepFrom,
          keepUntil: draft.keepUntil,
          memberIds: draft.memberIds,
          slotStartHours,
        })
      : [];
    if (removals.length > 0) setPendingRemovals(removals);
    else void save();
  }

  function cancel() {
    if (dirty) setConfirmDiscard(true);
    else navigate(returnTo);
  }

  /** "2 in removed days: Monday #2, Tuesday #2" and so on, one line per reason. */
  function removalSummary(removals: Removal[]) {
    const names = new Map(people?.map((person) => [person.id, person.name]));
    const group = (reason: Removal['reason'], describe: (removal: Removal) => string) => {
      const matching = removals.filter((removal) => removal.reason === reason);
      return { count: matching.length, items: [...new Set(matching.map(describe))].join(', ') };
    };
    return [
      { ...group('day', (r) => label(r.dayIndex)), what: 'in removed days' },
      { ...group('member', (r) => names.get(r.entry.personId) ?? '?'), what: 'of removed members' },
      {
        ...group('slot', (r) => slotLabel(r.entry.slotStartHour, draft.slotHours)),
        what: 'in removed slots',
      },
    ].filter((line) => line.count > 0);
  }

  return (
    <PageLayout
      title={data ? 'Log settings' : 'New log'}
      backTo={returnTo}
      onBack={(event) => {
        if (!dirty) return;
        event.preventDefault();
        setConfirmDiscard(true);
      }}
    >
      <form className={styles.form} onSubmit={submit} noValidate>
        <Card className={styles.section}>
          <TextField
            label="Name"
            value={draft.name}
            onChange={(event) => set('name', event.target.value)}
            error={shown(errors.name)}
            maxLength={60}
            autoComplete="off"
            required
          />
          {people && (
            <MemberPicker
              people={people}
              value={draft.memberIds}
              onChange={(memberIds) => set('memberIds', memberIds)}
              error={shown(errors.members)}
            />
          )}
        </Card>

        <Card className={styles.section}>
          <h2 className={styles.heading}>Days</h2>
          <SegmentedControl<DayMode>
            label="Label days by"
            options={[
              { value: 'date', label: 'Dates' },
              { value: 'weekday', label: 'Weekdays' },
            ]}
            value={draft.dayMode}
            onChange={(dayMode) => set('dayMode', dayMode)}
            disabled={locked}
          />
          {draft.dayMode === 'date' ? (
            <TextField
              label="First day"
              type="date"
              value={draft.startDate}
              onChange={(event) => set('startDate', event.target.value)}
              error={shown(errors.startDate)}
              disabled={locked}
            />
          ) : (
            <SelectField<Weekday>
              label="First day"
              options={WEEKDAYS.map((day) => ({ value: day, label: WEEKDAY_NAMES[day] }))}
              value={draft.startWeekday}
              onChange={(startWeekday) => set('startWeekday', startWeekday)}
              disabled={locked}
            />
          )}
          {data ? (
            <div className={styles.pair}>
              <SelectField<number>
                label="Keep from"
                options={data.days.map((day) => ({ value: day.index, label: label(day.index) }))}
                value={draft.keepFrom}
                onChange={(keepFrom) =>
                  setDraft((current) => ({
                    ...current,
                    keepFrom,
                    keepUntil: Math.max(current.keepUntil, keepFrom),
                  }))
                }
              />
              <SelectField<number>
                label="Keep until"
                options={data.days
                  .filter((day) => day.index >= draft.keepFrom)
                  .map((day) => ({ value: day.index, label: label(day.index) }))}
                value={draft.keepUntil}
                onChange={(keepUntil) => set('keepUntil', keepUntil)}
              />
            </div>
          ) : (
            <TextField
              label="Number of days"
              type="number"
              inputMode="numeric"
              min={1}
              step={1}
              value={draft.dayCount}
              onChange={(event) => set('dayCount', event.target.value)}
              error={shown(errors.dayCount)}
              hint="You can add more days later."
            />
          )}
          {dayPreview && <p className={styles.preview}>{dayPreview}</p>}
          {data && (
            <p className={styles.note}>
              {locked ? 'This log has pictures, so day mode and the first day are locked. ' : ''}
              Days can only be removed here. Add days from the log itself.
            </p>
          )}
        </Card>

        <Card className={styles.section}>
          <h2 className={styles.heading}>Time slots</h2>
          <SegmentedControl<SlotHours>
            label="Slot length"
            options={[
              { value: 1, label: '1 h' },
              { value: 2, label: '2 h' },
              { value: 4, label: '4 h' },
            ]}
            value={draft.slotHours}
            onChange={(slotHours) =>
              setDraft((current) => ({
                ...current,
                slotHours,
                endHour: alignEndHour(current.startHour, current.endHour, slotHours),
              }))
            }
            disabled={locked}
          />
          <div className={styles.pair}>
            <SelectField<number>
              label="Start"
              options={startOptions}
              value={draft.startHour}
              onChange={(startHour) =>
                // Keep the same number of slots when the start moves.
                setDraft((current) => ({
                  ...current,
                  startHour,
                  endHour: (startHour + spanHours(current.startHour, current.endHour)) % 24,
                }))
              }
            />
            <SelectField<number>
              label="End"
              options={endHourOptions(draft.startHour, draft.slotHours).map((hour) => ({
                value: hour,
                label:
                  formatHour(hour) + (crossesMidnight(draft.startHour, hour) ? ' (next day)' : ''),
              }))}
              value={draft.endHour}
              onChange={(endHour) => set('endHour', endHour)}
            />
          </div>
          <p className={styles.preview}>{slotPreview}</p>
          {locked && (
            <p className={styles.note}>
              This log has pictures, so the slot length is locked and the start moves in whole
              slots.
            </p>
          )}
          <SegmentedControl<LabelMode>
            label="Slot labels"
            options={[
              { value: 'range', label: 'Time range' },
              { value: 'start', label: 'Start time' },
            ]}
            value={draft.labelMode}
            onChange={(labelMode) => set('labelMode', labelMode)}
          />
        </Card>

        <Card className={styles.section}>
          <h2 className={styles.heading}>Look</h2>
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={draft.fitToScreen}
              onChange={(event) => set('fitToScreen', event.target.checked)}
            />
            Keep all photos within the screen
          </label>
          <SegmentedControl<ImageRatio>
            label="Photo shape"
            options={[
              { value: '16:9', label: '16:9' },
              { value: '4:3', label: '4:3' },
              { value: '3:2', label: '3:2' },
            ]}
            value={draft.imageRatio}
            onChange={(imageRatio) => set('imageRatio', imageRatio)}
            disabled={draft.fitToScreen}
          />
          {draft.fitToScreen && <p className={styles.note}>Photos are sized to fit the screen.</p>}
          <SegmentedControl<ThemeName>
            label="Theme"
            options={[
              { value: 'pastel', label: 'Pastel' },
              { value: 'mint', label: 'Mint' },
              { value: 'peach', label: 'Peach' },
              { value: 'lavender', label: 'Lavender' },
            ]}
            value={draft.theme}
            onChange={(theme) => set('theme', theme)}
          />
        </Card>

        <div className={styles.actions}>
          <Button variant="ghost" onClick={cancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={saving}>
            {data ? 'Save' : 'Create log'}
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDiscard}
        title={data ? 'Discard changes?' : 'Discard this log?'}
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => navigate(returnTo)}
        onCancel={() => setConfirmDiscard(false)}
      >
        {data
          ? "Your changes to this log won't be saved."
          : "It hasn't been created yet, so your settings will be lost."}
      </ConfirmDialog>

      <ConfirmDialog
        open={pendingRemovals !== undefined}
        title={`Delete ${plural(pendingRemovals?.length ?? 0, 'picture')}?`}
        confirmLabel="Delete and save"
        destructive
        onConfirm={() => {
          setPendingRemovals(undefined);
          void save();
        }}
        onCancel={() => setPendingRemovals(undefined)}
      >
        <p>These changes remove pictures:</p>
        <ul className={styles.removals}>
          {pendingRemovals &&
            removalSummary(pendingRemovals).map((line) => (
              <li key={line.what}>
                {line.count} {line.what}: {line.items}
              </li>
            ))}
        </ul>
      </ConfirmDialog>
    </PageLayout>
  );
}
