/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans:    ['Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Light theme backgrounds
        bg:       '#F0F4FF',
        surface:  '#FFFFFF',
        card:     '#FFFFFF',
        panel:    '#F7F9FF',
        border:   '#E2E8F8',
        // Brand
        indigo:   '#5B5BD6',
        indigo2:  '#4747B8',
        mint:     '#10B981',
        mint2:    '#059669',
        // Text
        ink:      '#1A1A3E',
        sub:      '#4A5580',
        mute:     '#8892B0',
        faint:    '#C5CCE0',
        // Status
        green:    '#10B981',
        amber:    '#F59E0B',
        red:      '#EF4444',
        blue:     '#3B82F6',
      },
    },
  },
  plugins: [],
}
