/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      colors: {
        surface: {
          primary: '#0A0A12',
          secondary: '#111119',
          card: '#1a1a2e',
          hover: '#222233',
        },
        text: {
          main: '#EAEAEA',
          muted: '#888899',
          label: '#666680',
        },
        border: {
          dim: '#333344',
          separator: '#222233',
        },
        accent: {
          red: '#FF6B6B',
          cyan: '#00FFD1',
          success: '#00FF88',
          warning: '#FFAA00',
          danger: '#FF4444',
          info: '#4ECDC4',
        },
      },
      borderRadius: {
        sm: '4px',
        md: '8px',
        lg: '12px',
      },
    },
  },
  plugins: [],
}
