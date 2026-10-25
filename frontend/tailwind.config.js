/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        fundo: '#0a0a0b',
        superficie: { DEFAULT: '#141416', 2: '#1c1c1f' },
        ouro: { DEFAULT: '#e6c766', claro: '#f3dc8a', escuro: '#b8862f' },
        borda: 'rgba(255,255,255,.08)',
        texto: { DEFAULT: '#f5f5f4', 2: '#a1a1aa', 3: '#8b8b94' },
      },
      fontFamily: {
        display: ['"Barlow Condensed"', 'Inter', 'sans-serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
