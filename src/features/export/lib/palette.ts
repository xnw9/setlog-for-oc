import type { ThemeName } from '../../../types';

export interface ExportPalette {
  background: string;
  surface: string;
  border: string;
  text: string;
  muted: string;
  primary: string;
}

const base = { surface: '#ffffff', text: '#3a3346', muted: '#6f6680' };

/**
 * Light theme colours for exported images, so a shared image looks the same whatever device made
 * it. Mirrors the light values in styles/global.css (pastel) and styles/themes.css.
 */
export const EXPORT_PALETTES: Record<ThemeName, ExportPalette> = {
  pastel: { ...base, background: '#fff8fb', border: '#f0e4ee', primary: '#f7a8c4' },
  mint: { ...base, background: '#f5fcf9', border: '#dcefe7', primary: '#8fdcc0' },
  peach: { ...base, background: '#fff8f3', border: '#f6e3d6', primary: '#ffbe98' },
  lavender: { ...base, background: '#faf8ff', border: '#e8e2f7', primary: '#c8b6ff' },
};
