/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:  ['DM Sans', 'system-ui', 'sans-serif'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
      },
      colors: {
        // Core backgrounds
        void:    '#07111f',
        depth:   '#050c18',
        surface: '#0a1426',
        panel:   '#0f1e35',
        card:    '#0a1426',
        border:  '#1e3a5f',

        // Text
        bright:  '#f1f5f9',
        text:    '#cbd5e1',
        muted:   '#475569',
        faint:   '#2d4a6e',

        // Brand colors
        sky:    '#38bdf8',
        azure:  '#0ea5e9',
        violet: '#8b5cf6',
        cyan:   '#06b6d4',
        amber:  '#f59e0b',
        emerald:'#22c55e',
        rose:   '#f43f5e',
        coral:  '#f97316',
      },
      animation: {
        'fade-up':   'fadeUp 0.4s ease-out both',
        'fade-in':   'fadeIn 0.35s ease-out both',
        'scale-in':  'scaleIn 0.35s cubic-bezier(0.34,1.3,0.64,1) both',
        'spin-slow': 'spin 2s linear infinite',
      },
      keyframes: {
        fadeUp:  { from: { opacity: 0, transform: 'translateY(12px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fadeIn:  { from: { opacity: 0 },                                to: { opacity: 1 } },
        scaleIn: { from: { opacity: 0, transform: 'scale(0.94)' },     to: { opacity: 1, transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
}