import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the build works from any static-host sub-path (GitHub Pages, Cloudflare Pages).
export default defineConfig({
  base: './',
  plugins: [react()],
});
