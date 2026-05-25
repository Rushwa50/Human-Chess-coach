/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        coach: {
          bg: "rgba(var(--coach-bg), <alpha-value>)",
          card: "rgba(var(--coach-card), <alpha-value>)",
          accent: "rgba(var(--coach-accent), <alpha-value>)",
          success: "rgba(var(--coach-success), <alpha-value>)",
          lesson: "rgba(var(--coach-lesson), <alpha-value>)",
          text: "rgba(var(--coach-text), <alpha-value>)",
          muted: "rgba(var(--coach-muted), <alpha-value>)",
          border: "rgba(var(--coach-border), <alpha-value>)"
        }
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out forwards',
        'slide-up': 'slideUp 0.6s ease-out forwards',
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        }
      }
    }
  },
  plugins: []
};
