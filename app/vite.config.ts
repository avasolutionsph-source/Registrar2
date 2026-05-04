import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';

// https://vite.dev/config/
// PostCSS config is inlined here (not in a config file) so Vite doesn't
// climb the parent directory tree looking for one — there's a Tailwind v4
// postcss.config.js in the user's home folder that would otherwise win.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  css: {
    postcss: {
      plugins: [tailwindcss, autoprefixer],
    },
  },
  server: { port: 5173 },
});
