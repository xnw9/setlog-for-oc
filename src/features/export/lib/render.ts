import { dayLabel } from '../../../lib/days';
import { initials } from '../../../lib/initials';
import { formatSlot } from '../../../lib/slots';
import type { Entry, Log, Person, ThemeName } from '../../../types';
import type { ExportFormat } from './fileName';
import { EXPORT_PALETTES, type ExportPalette } from './palette';

export interface ExportOptions {
  showAvatars: boolean;
  showEmpty: boolean;
  format: ExportFormat;
  width: 1080 | 2160;
  theme: ThemeName;
}

export interface SlotImageInput {
  log: Log;
  dayIndex: number;
  slotStartHour: number;
  /** Log members, in order. */
  members: Person[];
  /** The day's pictures (any slot); only this slot's are drawn. */
  entries: Entry[];
  /** Screen height ÷ width. For fit-to-screen logs the image takes this shape at its width. */
  screenAspect?: number;
}

export interface RenderedImage {
  blob: Blob;
  width: number;
  height: number;
  /** True when the width was lowered to fit the browser's canvas limit. */
  reduced: boolean;
}

/** iOS Safari's canvas limit (16.7 Mpx) and the largest side every major browser accepts. */
const MAX_AREA = 16_777_216;
const MAX_SIDE = 16_384;

const FONT = "'Nunito', 'M PLUS Rounded 1c', system-ui, sans-serif";

/** Sizes in px at 1080 wide; everything scales with the export width. */
const BASE = {
  pad: 56,
  title: 56,
  /** Space between the title and the date/time, side by side or stacked. */
  headerGap: 24,
  afterHeader: 48,
  avatar: 48,
  name: 34,
  nameGap: 16,
  radius: 28,
  caption: 30,
  captionLine: 40,
  captionGap: 16,
  rowGap: 48,
  emptyText: 32,
  /** Fit-to-screen: photos never get shorter than this; the image grows longer instead. */
  minFitPhoto: 160,
};

interface Row {
  person: Person;
  entry?: Entry;
  captionLines: string[];
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/)) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width <= maxWidth || !line) line = next;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** "Mon 5 Oct 2026 · 10:00–12:00", following the log's day and slot label settings. */
function whenLabel({ log, dayIndex, slotStartHour }: SlotImageInput): string {
  return (
    `${dayLabel(log.dayMode, log.firstDayKey, dayIndex)} · ` +
    formatSlot(slotStartHour, log.slotHours, log.labelMode)
  );
}

function layout(input: SlotImageInput, options: ExportOptions, width: number) {
  const s = width / 1080;
  const size = (key: keyof typeof BASE) => BASE[key] * s;
  const [rw, rh] = input.log.imageRatio.split(':').map(Number);
  const photoWidth = width - 2 * size('pad');
  let photoHeight = (photoWidth * rh) / rw;

  const measure = document.createElement('canvas').getContext('2d')!;

  // Title left, date and time right on the same line; if they'd collide, date/time goes below.
  const contentWidth = width - 2 * size('pad');
  measure.font = `800 ${size('title')}px ${FONT}`;
  const titleWidth = measure.measureText(input.log.name).width;
  measure.font = `700 ${size('title')}px ${FONT}`;
  const when = whenLabel(input);
  const whenWidth = measure.measureText(when).width;
  const stacked = titleWidth + size('headerGap') + whenWidth > contentWidth;

  measure.font = `600 ${size('caption')}px ${FONT}`;
  const rows: Row[] = input.members.flatMap((person) => {
    const entry = input.entries.find(
      (e) => e.personId === person.id && e.slotStartHour === input.slotStartHour,
    );
    if (!entry && !options.showEmpty) return [];
    const captionLines = entry?.caption ? wrap(measure, entry.caption, photoWidth) : [];
    return [{ person, entry, captionLines }];
  });

  const headerHeight = stacked ? 2 * size('title') + size('headerGap') / 2 : size('title');
  const captionHeight = (row: Row) =>
    row.captionLines.length
      ? size('captionGap') + row.captionLines.length * size('captionLine')
      : 0;

  // Fit-to-screen: the image is the screen's shape, and photos share the height left over.
  if (input.log.fitToScreen && input.screenAspect && rows.length > 0) {
    const fixed =
      2 * size('pad') +
      headerHeight +
      size('afterHeader') +
      rows.reduce((sum, row) => sum + size('avatar') + size('nameGap') + captionHeight(row), 0) +
      (rows.length - 1) * size('rowGap');
    const share = (width * input.screenAspect - fixed) / rows.length;
    photoHeight = Math.max(size('minFitPhoto'), share);
  }

  const rowHeight = (row: Row) =>
    size('avatar') + size('nameGap') + photoHeight + captionHeight(row);
  const height = Math.ceil(
    2 * size('pad') +
      headerHeight +
      size('afterHeader') +
      rows.reduce((sum, row) => sum + rowHeight(row), 0) +
      Math.max(0, rows.length - 1) * size('rowGap'),
  );
  return {
    s,
    size,
    rows,
    photoWidth,
    photoHeight,
    rowHeight,
    height,
    when,
    whenWidth,
    stacked,
  };
}

/** Draws `bitmap` to cover the box, positioned and zoomed like the day view (object-position + scale). */
function drawCover(
  ctx: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  box: { x: number; y: number; w: number; h: number },
  crop: { x: number; y: number; zoom: number },
) {
  const cover = Math.max(box.w / bitmap.width, box.h / bitmap.height);
  const w = bitmap.width * cover;
  const h = bitmap.height * cover;
  const originX = crop.x * box.w;
  const originY = crop.y * box.h;
  const x = originX + ((box.w - w) * crop.x - originX) * crop.zoom;
  const y = originY + ((box.h - h) * crop.y - originY) * crop.zoom;
  ctx.drawImage(bitmap, box.x + x, box.y + y, w * crop.zoom, h * crop.zoom);
}

async function drawAvatar(
  ctx: CanvasRenderingContext2D,
  person: Person,
  x: number,
  y: number,
  d: number,
) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2);
  ctx.clip();
  if (person.avatarBlob) {
    const bitmap = await createImageBitmap(person.avatarBlob);
    drawCover(ctx, bitmap, { x, y, w: d, h: d }, { x: 0.5, y: 0.5, zoom: 1 });
    bitmap.close();
  } else {
    ctx.fillStyle = person.color;
    ctx.fillRect(x, y, d, d);
    ctx.fillStyle = '#3a3346';
    ctx.font = `800 ${d * 0.4}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(initials(person.name), x + d / 2, y + d / 2);
  }
  ctx.restore();
}

/**
 * Draws one slot as an image: header (log, day, slot), then each member's name and photo in the
 * log's ratio, with captions below. Height grows with the members; if the image would pass the
 * browser's canvas limit, the width is lowered until it fits.
 */
export async function renderSlot(
  input: SlotImageInput,
  options: ExportOptions,
): Promise<RenderedImage> {
  let width: number = options.width;
  let plan = layout(input, options, width);
  while (width * plan.height > MAX_AREA || plan.height > MAX_SIDE) {
    const fit = Math.min(Math.sqrt(MAX_AREA / (width * plan.height)), MAX_SIDE / plan.height);
    width = Math.floor((width * fit) / 10) * 10;
    plan = layout(input, options, width);
  }
  const { size, rows, photoWidth, photoHeight, rowHeight, height, when, whenWidth, stacked } = plan;
  const palette: ExportPalette = EXPORT_PALETTES[options.theme];

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');

  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, width, height);

  // Header.
  const pad = size('pad');
  let y = pad;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  const contentWidth = width - 2 * pad;
  ctx.fillStyle = palette.text;
  ctx.font = `800 ${size('title')}px ${FONT}`;
  // Side by side, the title gets whatever the date/time leaves; stacked, it gets the full width.
  const titleRoom = stacked ? contentWidth : contentWidth - whenWidth - size('headerGap');
  ctx.fillText(input.log.name, pad, y, titleRoom);
  if (stacked) y += size('title') + size('headerGap') / 2;
  ctx.fillStyle = palette.muted;
  ctx.font = `700 ${size('title')}px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(when, width - pad, y, contentWidth);
  ctx.textAlign = 'left';
  y += size('title') + size('afterHeader');

  for (const row of rows) {
    const top = y;
    // Name line.
    const avatar = size('avatar');
    let nameX = pad;
    if (options.showAvatars) {
      await drawAvatar(ctx, row.person, pad, y, avatar);
      nameX += avatar + size('nameGap');
    }
    ctx.fillStyle = palette.text;
    ctx.font = `700 ${size('name')}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(row.person.name, nameX, y + avatar / 2, width - nameX - pad);
    y += avatar + size('nameGap');

    // Photo, or an empty frame.
    const box = { x: pad, y, w: photoWidth, h: photoHeight };
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(box.x, box.y, box.w, box.h, size('radius'));
    if (row.entry) {
      ctx.clip();
      const bitmap = await createImageBitmap(row.entry.imageBlob);
      drawCover(ctx, bitmap, box, row.entry.crop);
      bitmap.close();
    } else {
      ctx.fillStyle = palette.surface;
      ctx.fill();
      ctx.setLineDash([12 * plan.s, 10 * plan.s]);
      ctx.lineWidth = 3 * plan.s;
      ctx.strokeStyle = palette.border;
      ctx.stroke();
      ctx.fillStyle = palette.muted;
      ctx.font = `700 ${size('emptyText')}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('No photo', box.x + box.w / 2, box.y + box.h / 2);
    }
    ctx.restore();
    y += photoHeight;

    // Caption, centred like in the day view.
    if (row.captionLines.length) {
      y += size('captionGap');
      ctx.fillStyle = palette.text;
      ctx.font = `600 ${size('caption')}px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      for (const line of row.captionLines) {
        ctx.fillText(line, width / 2, y);
        y += size('captionLine');
      }
    }

    y = top + rowHeight(row) + size('rowGap');
  }

  const type = options.format === 'jpeg' ? 'image/jpeg' : 'image/png';
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error('Could not encode image'))),
      type,
      0.92,
    ),
  );
  return { blob, width, height, reduced: width < options.width };
}
