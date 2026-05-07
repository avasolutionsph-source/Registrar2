import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        app: '#f8f8f5',
        sidebar: '#f1efea',
        panel: '#ffffff',
        'panel-alt': '#fafaf6',
        border: { DEFAULT: '#e7e3da', soft: '#f0ede4' },
        ink: {
          primary: '#1f1f1b',
          secondary: '#6b6b65',
          muted: '#8a8478',
        },
        accent: '#1f1f1b',
        'nps-red': {
          DEFAULT: '#c41e3a',
          dark: '#a51730',
          light: '#e3324f',
        },
        // Aliases used by the Guidance Office PDS module
        npsRed: '#C8102E',
        npsYellow: '#F2C94C',
        ok: { bg: '#ecf3e9', fg: '#3f6233' },
        pending: { bg: '#fbf3e3', fg: '#8a6c1d' },
        na: { bg: '#f0ede4', fg: '#8a8478' },
      },
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'sans-serif',
        ],
      },
      borderRadius: { sm: '6px', DEFAULT: '8px', md: '10px', lg: '12px' },
      fontSize: {
        label: ['11px', { letterSpacing: '0.06em', lineHeight: '1.2' }],
      },
    },
  },
  plugins: [],
} satisfies Config;
