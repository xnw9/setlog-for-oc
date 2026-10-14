import { useState } from 'react';
import type { Log } from '../../../types';
import type { ExportOptions } from '../lib/render';

const DEFAULTS: ExportOptions = { format: 'png', width: 1080 };

/** Keeps only valid values from what was stored, so an old or edited entry can't break export. */
function restore(stored: unknown): ExportOptions {
  const s = (stored ?? {}) as Partial<Record<keyof ExportOptions, unknown>>;
  return {
    format: s.format === 'png' || s.format === 'jpeg' ? s.format : DEFAULTS.format,
    width: s.width === 1080 || s.width === 2160 ? s.width : DEFAULTS.width,
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
      return restore(JSON.parse(localStorage.getItem(key) ?? 'null'));
    } catch {
      return DEFAULTS;
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
