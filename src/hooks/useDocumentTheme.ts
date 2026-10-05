import { useEffect } from 'react';
import type { ThemeName } from '../types';

/** Applies a colour theme to the whole page while the calling component is mounted. */
export function useDocumentTheme(theme: ThemeName | undefined) {
  useEffect(() => {
    if (!theme || theme === 'pastel') return; // pastel is the default, no attribute needed
    const root = document.documentElement;
    root.dataset.theme = theme;
    return () => {
      delete root.dataset.theme;
    };
  }, [theme]);
}
