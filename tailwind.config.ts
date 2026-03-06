import type { Config } from 'tailwindcss'

export default {
  darkMode: 'class',
  content: [
    './app/**/*.{vue,js,ts}',
    './components/**/*.{vue,js,ts}',
    './pages/**/*.{vue,js,ts}',
    './layouts/**/*.{vue,js,ts}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          pink: '#ff006e',
          orange: '#fb5607',
          violet: '#8338ec',
          cyan: '#06ffa5',
          yellow: '#ffbe0b',
        },
        surface: {
          base: '#0a0a0f',
          card: '#111118',
          elevated: '#1a1a24',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        '4xl': '2rem',
      },
      animation: {
        'oil-slick': 'oilSlick 8s ease infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        shimmer: 'shimmer 3s linear infinite',
      },
    },
  },
  plugins: [],
} satisfies Config
