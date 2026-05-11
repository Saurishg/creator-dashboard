import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './hooks/**/*.{ts,tsx}',
    './lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:      '#07090f',
        bg2:     '#0c1220',
        card:    '#0f1629',
        card2:   '#131d35',
        border:  '#1c2a47',
        border2: '#253352',
        indigo:  '#6366f1',
        purple:  '#8b5cf6',
        green:   '#10b981',
        red:     '#ef4444',
        amber:   '#f59e0b',
        cyan:    '#06b6d4',
        text:    '#f0f4ff',
        muted:   '#64748b',
        muted2:  '#94a3b8',
      },
      borderRadius: {
        card: '14px',
        sm:   '8px',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}

export default config
