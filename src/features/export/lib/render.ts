import { dayLabel } from '../../../lib/days';
import { initials } from '../../../lib/initials';
import { formatSlot } from '../../../lib/slots';
import type { Entry, Log, Person } from '../../../types';
import type { ExportFormat } from './fileName';
import { EXPORT_PALETTES } from './palette';

/** Only the file is configurable; the layout always matches the day view. */
export interface ExportOptions {
  format: ExportFormat;
  width: 1080 | 2160;
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
const LINE_HEIGHT = 1.5;

/** The image is the day view on a screen this many CSS px wide, scaled up to the export width. */
const VIEW_WIDTH = 432;

/** The day view's sizes in CSS px (PageLayout and MemberRow styles). Keep them in step. */
const CSS_PX = {
  pagePad: 16,
  title: 24,
  headerGap: 12,
  afterHeader: 24,
  avatar: 32,
  name: 16,
  nameGap: 8,
  rowGap: 16,
  radius: 20,
  labelsInsetX: 16,
  labelGap: 8,
  textPadX: 16,
  textPadY: 4,
  labelText: 18,
  captionText: 16,
  commentText: 16,
  commentInset: 8,
  commenter: 40,
  commenterRing: 2,
  commentGap: 8,
  minFitFrame: 160,
};

type Px = (key: keyof typeof CSS_PX) => number;

const pxAt =
  (scale: number): Px =>
  (key) =>
    CSS_PX[key] * scale;

const TEXT_ON_PHOTO = '#ffffff';
const PILL = 'rgb(30 20 40 / 0.4)';
/** The .glow text-shadow stack, widest first: blur and y offset in CSS px, then opacity. */
const GLOW: [blur: number, offsetY: number, alpha: number][] = [
  [14, 0, 0.3],
  [6, 0, 0.45],
  [2, 1, 0.5],
  [1, 0, 0.6],
];
const glowColour = (alpha: number) => `rgb(46 26 71 / ${alpha})`;

type Box = { x: number; y: number; w: number; h: number };

/** Shortens `text` with "…" until it fits `maxWidth`. */
function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut && ctx.measureText(`${cut}…`).width > maxWidth) cut = cut.slice(0, -1);
  return `${cut.trimEnd()}…`;
}

/** Wraps at spaces, and breaks a word too long on its own (like CSS overflow-wrap: anywhere). */
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const fits = (s: string) => ctx.measureText(s).width <= maxWidth;
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (fits(next)) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = '';
    for (const char of word) {
      if (line && !fits(line + char)) {
        lines.push(line);
        line = '';
      }
      line += char;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function layout(input: SlotImageInput, width: number) {
  const scale = width / VIEW_WIDTH;
  const px = pxAt(scale);
  const [rw, rh] = input.log.imageRatio.split(':').map(Number);
  const contentWidth = width - 2 * px('pagePad');
  let frameHeight = (contentWidth * rh) / rw;

  // Log name left, day right on the same line; if they'd collide, the day goes below.
  const measure = document.createElement('canvas').getContext('2d')!;
  const day = dayLabel(input.log.dayMode, input.log.firstDayKey, input.dayIndex);
  measure.font = `800 ${px('title')}px ${FONT}`;
  const titleWidth = measure.measureText(input.log.name).width;
  measure.font = `700 ${px('title')}px ${FONT}`;
  const dayWidth = measure.measureText(day).width;
  const stacked = titleWidth + px('headerGap') + dayWidth > contentWidth;
  const titleLine = px('title') * LINE_HEIGHT;
  const headerHeight = stacked ? 2 * titleLine : titleLine;

  const rows = input.members.length;
  const heightWithoutFrames =
    2 * px('pagePad') +
    headerHeight +
    px('afterHeader') +
    rows * (px('avatar') + px('nameGap')) +
    Math.max(0, rows - 1) * px('rowGap');

  if (input.log.fitToScreen && input.screenAspect && rows > 0) {
    const screenHeight = width * input.screenAspect;
    frameHeight = Math.max(px('minFitFrame'), (screenHeight - heightWithoutFrames) / rows);
  }

  return {
    scale,
    contentWidth,
    frameHeight,
    height: Math.ceil(heightWithoutFrames + rows * frameHeight),
    day,
    dayWidth,
    stacked,
    titleLine,
  };
}

/** Draws `bitmap` to cover the box, positioned and zoomed like the day view (object-position + scale). */
function drawCover(
  ctx: CanvasRenderingContext2D,
  bitmap: ImageBitmap,
  box: Box,
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

/** White centred lines with the soft glow, the first centred on `firstLineY`. */
function drawGlowText(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  centreX: number,
  firstLineY: number,
  lineHeight: number,
  scale: number,
) {
  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = TEXT_ON_PHOTO;
  lines.forEach((line, i) => {
    const y = firstLineY + i * lineHeight;
    // One shadow per draw, so draw once per layer. Canvas shadows ignore the scale; apply it here.
    for (const [blur, offsetY, alpha] of GLOW) {
      ctx.shadowColor = glowColour(alpha);
      ctx.shadowBlur = blur * scale;
      ctx.shadowOffsetY = offsetY * scale;
      ctx.fillText(line, centreX, y);
    }
  });
  ctx.restore();
}

/** One line of white text in the dark pill, starting at `left` and centred on `centreY`. */
function drawPill(
  ctx: CanvasRenderingContext2D,
  text: string,
  left: number,
  centreY: number,
  px: Px,
) {
  const h = px('commentText') * LINE_HEIGHT + 2 * px('textPadY');
  const w = ctx.measureText(text).width + 2 * px('textPadX');
  ctx.fillStyle = PILL;
  ctx.beginPath();
  ctx.roundRect(left, centreY - h / 2, w, h, h / 2);
  ctx.fill();
  ctx.fillStyle = TEXT_ON_PHOTO;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, left + px('textPadX'), centreY);
}

/** The time label's height on every frame: centred together with one caption line below it. */
function labelCentreY(frame: Box, px: Px): number {
  const captionLine = px('captionText') * LINE_HEIGHT + 2 * px('textPadY');
  return frame.y + (frame.h - px('labelGap') - captionLine) / 2;
}

/** The time label, and the caption below it growing downwards. */
function drawLabels(
  ctx: CanvasRenderingContext2D,
  slotLabel: string,
  caption: string | undefined,
  frame: Box,
  scale: number,
) {
  const px = pxAt(scale);
  const maxTextWidth = frame.w - 2 * px('labelsInsetX') - 2 * px('textPadX');
  const centreX = frame.x + frame.w / 2;
  const labelY = labelCentreY(frame, px);

  ctx.font = `700 ${px('labelText')}px ${FONT}`;
  const labelLine = px('labelText') * LINE_HEIGHT;
  drawGlowText(ctx, [ellipsize(ctx, slotLabel, maxTextWidth)], centreX, labelY, labelLine, scale);
  if (!caption) return;

  ctx.font = `600 ${px('captionText')}px ${FONT}`;
  const captionLine = px('captionText') * LINE_HEIGHT;
  const labelBottom = labelY + labelLine / 2 + px('textPadY');
  const firstCaptionY = labelBottom + px('labelGap') + px('textPadY') + captionLine / 2;
  const lines = wrap(ctx, caption, maxTextWidth);
  drawGlowText(ctx, lines, centreX, firstCaptionY, captionLine, scale);
}

/**
 * The commenter's avatar in a white ring in the bottom-left corner, then their text in a pill.
 * Skipped if the commenter is no longer a member.
 */
async function drawComment(
  ctx: CanvasRenderingContext2D,
  entry: Entry,
  members: Person[],
  frame: Box,
  px: Px,
) {
  const commenter = members.find((member) => member.id === entry.comment?.personId);
  if (!commenter || !entry.comment) return;
  const inset = px('commentInset');
  const ring = px('commenterRing');
  const d = px('commenter');
  const outer = d + 2 * ring;
  const x = frame.x + inset;
  const y = frame.y + frame.h - inset - outer;

  ctx.beginPath();
  ctx.arc(x + outer / 2, y + outer / 2, outer / 2, 0, Math.PI * 2);
  ctx.fillStyle = TEXT_ON_PHOTO;
  ctx.fill();
  await drawAvatar(ctx, commenter, x + ring, y + ring, d);

  if (!entry.comment.text) return;
  ctx.font = `600 ${px('commentText')}px ${FONT}`;
  const left = x + outer + px('commentGap');
  const maxTextWidth = frame.x + frame.w - inset - left - 2 * px('textPadX');
  drawPill(ctx, ellipsize(ctx, entry.comment.text, maxTextWidth), left, y + outer / 2, px);
}

/** The empty frame's dashed "add" outline, with the time label where it sits on a photo. */
function drawEmptyFrame(
  ctx: CanvasRenderingContext2D,
  slotLabel: string,
  frame: Box,
  colours: { border: string; text: string },
  scale: number,
) {
  const px = pxAt(scale);
  const inset = 2 * scale;
  ctx.beginPath();
  ctx.roundRect(
    frame.x + inset,
    frame.y + inset,
    frame.w - 2 * inset,
    frame.h - 2 * inset,
    px('radius') - inset,
  );
  ctx.setLineDash([6 * scale, 6 * scale]);
  ctx.lineWidth = 2 * scale;
  ctx.strokeStyle = colours.border;
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = colours.text;
  ctx.font = `700 ${px('labelText')}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(slotLabel, frame.x + frame.w / 2, labelCentreY(frame, px));
}

/**
 * Draws one slot as an image that matches the day view: the log name and day, then every member's
 * avatar, name and frame, with the time label, caption and comment on the photo. Height grows
 * with the members; if the image would pass the browser's canvas limit, the width is lowered
 * until it fits.
 */
export async function renderSlot(
  input: SlotImageInput,
  options: ExportOptions,
): Promise<RenderedImage> {
  let width: number = options.width;
  let plan = layout(input, width);
  while (width * plan.height > MAX_AREA || plan.height > MAX_SIDE) {
    const fit = Math.min(Math.sqrt(MAX_AREA / (width * plan.height)), MAX_SIDE / plan.height);
    width = Math.floor((width * fit) / 10) * 10;
    plan = layout(input, width);
  }
  const { scale, contentWidth, frameHeight, height, day, dayWidth, stacked, titleLine } = plan;
  const px = pxAt(scale);
  const palette = EXPORT_PALETTES[input.log.theme];
  const { log } = input;
  const slotLabel = formatSlot(input.slotStartHour, log.slotHours, log.labelMode);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');

  ctx.fillStyle = palette.background;
  ctx.fillRect(0, 0, width, height);

  const pad = px('pagePad');
  let y = pad;
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = palette.text;
  ctx.font = `800 ${px('title')}px ${FONT}`;
  const titleRoom = stacked ? contentWidth : contentWidth - dayWidth - px('headerGap');
  ctx.fillText(ellipsize(ctx, log.name, titleRoom), pad, y + titleLine / 2);
  if (stacked) y += titleLine;
  ctx.fillStyle = palette.muted;
  ctx.font = `700 ${px('title')}px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(ellipsize(ctx, day, contentWidth), width - pad, y + titleLine / 2);
  y += titleLine + px('afterHeader');

  for (const person of input.members) {
    const entry = input.entries.find(
      (e) => e.personId === person.id && e.slotStartHour === input.slotStartHour,
    );

    const avatar = px('avatar');
    await drawAvatar(ctx, person, pad, y, avatar);
    const nameX = pad + avatar + px('nameGap');
    ctx.fillStyle = palette.text;
    ctx.font = `700 ${px('name')}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(ellipsize(ctx, person.name, width - nameX - pad), nameX, y + avatar / 2);
    y += avatar + px('nameGap');

    const frame = { x: pad, y, w: contentWidth, h: frameHeight };
    const radius = px('radius');
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(frame.x, frame.y, frame.w, frame.h, radius);
    ctx.fillStyle = palette.surface;
    ctx.fill();
    ctx.clip();
    if (entry) {
      const bitmap = await createImageBitmap(entry.imageBlob);
      drawCover(ctx, bitmap, frame, entry.crop);
      bitmap.close();
      drawLabels(ctx, slotLabel, entry.caption, frame, scale);
      await drawComment(ctx, entry, input.members, frame, px);
    } else {
      drawEmptyFrame(ctx, slotLabel, frame, { border: palette.border, text: palette.muted }, scale);
    }
    ctx.restore();

    ctx.beginPath();
    ctx.roundRect(
      frame.x + scale / 2,
      frame.y + scale / 2,
      frame.w - scale,
      frame.h - scale,
      radius,
    );
    ctx.lineWidth = scale;
    ctx.strokeStyle = palette.border;
    ctx.stroke();

    y += frameHeight + px('rowGap');
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
