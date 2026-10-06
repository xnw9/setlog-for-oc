import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { Button, ConfirmDialog, IconButton, PageLayout } from '../../../components';
import { useDocumentTheme } from '../../../hooks/useDocumentTheme';
import { ExportDialog, type SlotImageInput } from '../../export';
import { addDays, dayLabel } from '../../../lib/days';
import { currentSlot, formatSlot, slotsFor } from '../../../lib/slots';
import {
  clearDay,
  createNextDay,
  removePhoto,
  setPhoto,
  updateCaption,
  type DayViewData,
} from '../api';
import { MemberRow } from './MemberRow';
import { SlotList } from './SlotList';
import { Switcher } from './Switcher';
import styles from './DayView.module.css';

const SWIPE_MIN_PX = 50;

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

/**
 * One day of a log, one slot at a time. The slot lives in the URL (?slot=08) so reloads keep it;
 * without one, today's day opens on the current slot and any other day on its first slot.
 */
export function DayView({ data }: { data: DayViewData }) {
  const { log, day, dayCount, members, entries } = data;
  const navigate = useNavigate();
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const [slotListOpen, setSlotListOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [exporting, setExporting] = useState<'slot' | 'day'>();
  const swipeStart = useRef<{ x: number; y: number }>(undefined);
  useDocumentTheme(log.theme);

  const slots = slotsFor(log.startHour, log.endHour, log.slotHours);
  const now = log.dayMode === 'date' ? currentSlot(log) : null;
  const isToday = now !== null && now.date === addDays(log.firstDayKey, day.index);
  const fromUrl = slots.findIndex((slot) => slot.startHour === Number(params.get('slot') ?? NaN));
  const fallback = isToday ? slots.findIndex((slot) => slot.startHour === now.slotStartHour) : 0;
  const current = fromUrl >= 0 ? fromUrl : Math.max(0, fallback);
  const slot = slots[current];

  // Replace history entries: Back should leave the log, not step through every slot and day.
  const goToSlot = (index: number) =>
    setParams({ slot: String(slots[index].startHour).padStart(2, '0') }, { replace: true });
  const goToDay = (index: number) => navigate(`/logs/${log.id}/days/${index}`, { replace: true });

  const entryFor = (personId: string, startHour: number) =>
    entries.find((entry) => entry.personId === personId && entry.slotStartHour === startHour);
  const label = (startHour: number) => formatSlot(startHour, log.slotHours, log.labelMode);
  const isLastDay = day.index === dayCount - 1;
  const hasPhotos = (startHour: number) =>
    entries.some((entry) => entry.slotStartHour === startHour);
  const exportInput = (startHour: number): SlotImageInput => ({
    log,
    dayIndex: day.index,
    slotStartHour: startHour,
    members,
    entries,
  });

  // ← / → change slot, unless typing in a field or a dialog is open.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement || document.querySelector('dialog[open]')) {
        return;
      }
      if (event.key === 'ArrowLeft' && current > 0) goToSlot(current - 1);
      if (event.key === 'ArrowRight' && current < slots.length - 1) goToSlot(current + 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <PageLayout
      title={log.name}
      backTo="/logs"
      actions={
        <>
          <IconButton
            to={`/logs/${log.id}/settings`}
            state={{ from: location.pathname + location.search }} // settings returns here
            aria-label="Log settings"
          >
            ⚙
          </IconButton>
          <IconButton
            aria-label="Clear day"
            disabled={entries.length === 0}
            onClick={() => setConfirmClear(true)}
          >
            🧹
          </IconButton>
        </>
      }
    >
      <Switcher
        unit="day"
        label={dayLabel(log.dayMode, log.firstDayKey, day.index)}
        hasPrevious={day.index > 0}
        hasNext={!isLastDay}
        onPrevious={() => goToDay(day.index - 1)}
        onNext={() => goToDay(day.index + 1)}
      />
      <div className={styles.slotRow}>
        <Switcher
          unit="slot"
          label={`${label(slot.startHour)}  (${current + 1}/${slots.length})`}
          labelDescription={`Slot ${label(slot.startHour)}, ${current + 1} of ${slots.length}. Show all slots`}
          hasPrevious={current > 0}
          hasNext={current < slots.length - 1}
          onPrevious={() => goToSlot(current - 1)}
          onNext={() => goToSlot(current + 1)}
          onLabelClick={() => setSlotListOpen(true)}
        />
        <IconButton
          aria-label="Export this slot"
          disabled={!hasPhotos(slot.startHour)}
          onClick={() => setExporting('slot')}
        >
          ⤓
        </IconButton>
      </div>

      <ul
        className={styles.rows}
        onPointerDown={(event) => (swipeStart.current = { x: event.clientX, y: event.clientY })}
        onPointerUp={(event) => {
          const start = swipeStart.current;
          swipeStart.current = undefined;
          if (!start) return;
          const dx = event.clientX - start.x;
          if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(event.clientY - start.y))
            return;
          if (dx < 0 && current < slots.length - 1) goToSlot(current + 1);
          if (dx > 0 && current > 0) goToSlot(current - 1);
        }}
      >
        {members.map((person) => {
          const entry = entryFor(person.id, slot.startHour);
          return (
            <MemberRow
              key={person.id}
              person={person}
              entry={entry}
              imageRatio={log.imageRatio}
              slotLabel={label(slot.startHour)}
              onPhoto={(file) => setPhoto(day, person.id, slot.startHour, file)}
              onRemove={async () => {
                if (entry) await removePhoto(entry.id);
              }}
              onCaption={async (caption) => {
                if (entry) await updateCaption(entry.id, caption);
              }}
            />
          );
        })}
      </ul>

      <div className={styles.dayActions}>
        <Button variant="ghost" disabled={entries.length === 0} onClick={() => setExporting('day')}>
          Export day
        </Button>
        {isLastDay && (
          <Button variant="secondary" onClick={async () => goToDay(await createNextDay(log.id))}>
            + Create new day
          </Button>
        )}
      </div>

      {exporting && (
        <ExportDialog
          key={exporting} // a fresh dialog for each export
          title={
            exporting === 'slot'
              ? `Export ${label(slot.startHour)}`
              : `Export ${dayLabel(log.dayMode, log.firstDayKey, day.index)}`
          }
          log={log}
          slots={
            exporting === 'slot'
              ? [exportInput(slot.startHour)]
              : slots
                  .filter(({ startHour }) => hasPhotos(startHour))
                  .map(({ startHour }) => exportInput(startHour))
          }
          onClose={() => setExporting(undefined)}
        />
      )}

      <SlotList
        open={slotListOpen}
        slots={slots.map(({ startHour }) => ({
          startHour,
          label: label(startHour),
          filled: entries.filter((entry) => entry.slotStartHour === startHour).length,
        }))}
        memberCount={members.length}
        current={current}
        onPick={(index) => {
          goToSlot(index);
          setSlotListOpen(false);
        }}
        onClose={() => setSlotListOpen(false)}
      />

      <ConfirmDialog
        open={confirmClear}
        title={`Clear ${dayLabel(log.dayMode, log.firstDayKey, day.index)}?`}
        confirmLabel="Clear day"
        destructive
        onConfirm={async () => {
          setConfirmClear(false);
          await clearDay(day.id);
        }}
        onCancel={() => setConfirmClear(false)}
      >
        This deletes {plural(entries.length, 'picture')} from this day. The day itself stays.
      </ConfirmDialog>
    </PageLayout>
  );
}
