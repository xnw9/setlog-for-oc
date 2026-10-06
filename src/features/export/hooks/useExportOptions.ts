import { useState } from 'react';
import type { Log, ThemeName } from '../../../types';
import type { ExportOptions } from '../lib/render';

const THEMES: ThemeName[] = ['pastel', 'mint', 'peach', 'lavender'];

const defaults = (log: Log): ExportOptions => ({
  showAvatars: true,
  showEmpty: true,
  format: 'png',
  width: 1080,
  theme: log.theme,
});

/** Keeps only valid values from what was stored, so an old or edited entry can't break export. */
function restore(stored: unknown, fallback: ExportOptions): ExportOptions {
  const s = (stored ?? {}) as Partial<Record<keyof ExportOptions, unknown>>;
  return {
    showAvatars: typeof s.showAvatars === 'boolean' ? s.showAvatars : fallback.showAvatars,
    showEmpty: typeof s.showEmpty === 'boolean' ? s.showEmpty : fallback.showEmpty,
    format: s.format === 'png' || s.format === 'jpeg' ? s.format : fallback.format,
    width: s.width === 1080 || s.width === 2160 ? s.width : fallback.width,
    theme: THEMES.includes(s.theme as ThemeName) ? (s.theme as ThemeName) : fallback.theme,
  };
}

/**
 * A log's export options, remembered in this browser only (a per-viewer convenience: if storage
 * is blocked or cleared, the defaults are used).
 */
export function useExportOptions(log: Log) {
  const key = `setlog.export.${log.id}`;
  const [options, setOptions] = useState<ExportOptions>(() => {
    try {
      return restore(JSON.parse(localStorage.getItem(key) ?? 'null'), defaults(log));
    } catch {
      return defaults(log);
    }
  });

  const update = (next: ExportOptions) => {
    setOptions(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Storage unavailable (private mode, blocked): keep the options for this visit only.
    }
  };

  return [options, update] as const;
}
