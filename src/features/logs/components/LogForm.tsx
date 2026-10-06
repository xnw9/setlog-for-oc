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
import { createLog } from '../api';
import { MemberPicker } from './MemberPicker';
import styles from './LogForm.module.css';

interface Draft {
  name: string;
  memberIds: string[];
  dayMode: DayMode;
  startDate: string;
  startWeekday: Weekday;
  /** Kept as typed so the field can be cleared while editing. */
  dayCount: string;
  slotHours: SlotHours;
  startHour: number;
  endHour: number;
  labelMode: LabelMode;
  imageRatio: ImageRatio;
  theme: ThemeName;
}

const newDraft = (): Draft => ({
  name: '',
  memberIds: [],
  dayMode: 'date',
  startDate: todayIsoDate(),
  startWeekday: 'mon',
  dayCount: '1',
  slotHours: 2,
  startHour: 8,
  endHour: 22,
  labelMode: 'range',
  imageRatio: '16:9',
  theme: 'pastel',
});

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

const HOURS = Array.from({ length: 24 }, (_, hour) => ({ value: hour, label: formatHour(hour) }));

/** The New log page. Cancel and the back button return to /logs, asking first if anything changed. */
export function LogForm() {
  const navigate = useNavigate();
  const people = usePeople();
  const [initial] = useState(newDraft);
  const [draft, setDraft] = useState(initial);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  useDocumentTheme(draft.theme); // live preview of the chosen theme

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((current) => ({ ...current, [key]: value }));

  const dirty = JSON.stringify(draft) !== JSON.stringify(initial);
  const firstDayKey = draft.dayMode === 'date' ? draft.startDate : draft.startWeekday;
  const dayCount = /^\d+$/.test(draft.dayCount) ? Number(draft.dayCount) : 0;
  const slots = slotsFor(draft.startHour, draft.endHour, draft.slotHours);

  const errors = {
    name: draft.name.trim() ? undefined : 'Name is required.',
    members: draft.memberIds.length > 0 ? undefined : 'Pick at least one person.',
    startDate:
      draft.dayMode === 'weekday' || isIsoDate(draft.startDate) ? undefined : 'Pick a date.',
    dayCount: dayCount >= 1 ? undefined : 'Enter a whole number of days, 1 or more.',
  };
  const shown = (error: string | undefined) => (submitted ? error : undefined);

  const dayPreview =
    dayCount >= 1 && !errors.startDate
      ? `${plural(dayCount, 'day')}: ${dayLabel(draft.dayMode, firstDayKey, 0)}` +
        (dayCount > 1 ? ` → ${dayLabel(draft.dayMode, firstDayKey, dayCount - 1)}` : '')
      : undefined;
  const slotRange = (i: number) =>
    `${formatHour(slots[i].startHour)}–${formatHour(slots[i].endHour)}`;
  const slotPreview =
    `${plural(slots.length, 'slot')}: ${slotRange(0)}` +
    (slots.length > 1 ? ` … ${slotRange(slots.length - 1)}` : '');

  async function create(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    if (Object.values(errors).some(Boolean)) return;
    setSaving(true);
    const id = await createLog(
      {
        name: draft.name.trim(),
        memberIds: draft.memberIds,
        dayMode: draft.dayMode,
        firstDayKey,
        slotHours: draft.slotHours,
        startHour: draft.startHour,
        endHour: draft.endHour,
        labelMode: draft.labelMode,
        imageRatio: draft.imageRatio,
        theme: draft.theme,
      },
      dayCount,
    );
    navigate(`/logs/${id}`);
  }

  function cancel() {
    if (dirty) setConfirmDiscard(true);
    else navigate('/logs');
  }

  return (
    <PageLayout
      title="New log"
      backTo="/logs"
      onBack={(event) => {
        if (!dirty) return;
        event.preventDefault();
        setConfirmDiscard(true);
      }}
    >
      <form className={styles.form} onSubmit={create} noValidate>
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
          />
          {draft.dayMode === 'date' ? (
            <TextField
              label="First day"
              type="date"
              value={draft.startDate}
              onChange={(event) => set('startDate', event.target.value)}
              error={shown(errors.startDate)}
            />
          ) : (
            <SelectField<Weekday>
              label="First day"
              options={WEEKDAYS.map((day) => ({ value: day, label: WEEKDAY_NAMES[day] }))}
              value={draft.startWeekday}
              onChange={(startWeekday) => set('startWeekday', startWeekday)}
            />
          )}
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
          {dayPreview && <p className={styles.preview}>{dayPreview}</p>}
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
          />
          <div className={styles.hours}>
            <SelectField<number>
              label="Start"
              options={HOURS}
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
          <SegmentedControl<ImageRatio>
            label="Photo shape"
            options={[
              { value: '16:9', label: '16:9' },
              { value: '4:3', label: '4:3' },
              { value: '3:2', label: '3:2' },
            ]}
            value={draft.imageRatio}
            onChange={(imageRatio) => set('imageRatio', imageRatio)}
          />
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
            Create log
          </Button>
        </div>
      </form>

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard this log?"
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        destructive
        onConfirm={() => navigate('/logs')}
        onCancel={() => setConfirmDiscard(false)}
      >
        It hasn't been created yet, so your settings will be lost.
      </ConfirmDialog>
    </PageLayout>
  );
}
