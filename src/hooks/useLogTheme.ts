import { db, useLiveQuery } from '../db';
import { useDocumentTheme } from './useDocumentTheme';

/** Applies the log's theme to the page; falls back to pastel until the log loads or if it's missing. */
export function useLogTheme(logId: string | undefined) {
  const log = useLiveQuery(() => (logId ? db.logs.get(logId) : undefined), [logId]);
  useDocumentTheme(log?.theme);
}
