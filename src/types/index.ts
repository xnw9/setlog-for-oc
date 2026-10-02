// Data model from docs/PLAN.md §2. Grid layout is deferred (§12), so there is no layout field.

export type DayMode = 'date' | 'weekday';
export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';
export type SlotHours = 1 | 2 | 4;
export type LabelMode = 'range' | 'start';
export type ImageRatio = '16:9' | '4:3' | '3:2';
export type ThemeName = 'pastel' | 'mint' | 'peach' | 'lavender';

/** Global People library entry. */
export interface Person {
  id: string;
  name: string;
  /** Uploaded avatar; falls back to colour + initials when absent. */
  avatarBlob?: Blob;
  color: string;
}

export interface Log {
  id: string;
  name: string;
  /** Ordered subset of the People library. */
  memberIds: string[];
  /** Locked while the log has entries. */
  dayMode: DayMode;
  /** ISO date (YYYY-MM-DD) in date mode, or the starting weekday in weekday mode. */
  firstDayKey: string;
  /** Locked while the log has entries. */
  slotHours: SlotHours;
  /** 0–23, aligned to slotHours. */
  startHour: number;
  /** 0–23. endHour <= startHour means the day ends on the next calendar day. */
  endHour: number;
  labelMode: LabelMode;
  /** Shape of every photo row; always landscape. Default '16:9'. */
  imageRatio: ImageRatio;
  theme: ThemeName;
}

/** Days are contiguous per log: index 0..n-1. */
export interface Day {
  id: string;
  logId: string;
  index: number;
}

/** Focal point (0–1 on each axis) plus zoom, so a crop survives image-ratio changes. */
export interface Crop {
  x: number;
  y: number;
  zoom: number;
}

export interface Entry {
  id: string;
  dayId: string;
  personId: string;
  /** Keyed by clock hour, not slot position, so editing start/end hours never moves pictures. */
  slotStartHour: number;
  imageBlob: Blob;
  width: number;
  height: number;
  crop: Crop;
  caption?: string;
}
