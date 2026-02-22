/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html",
    "./index.html"
  ],
  darkMode: 'class', 
  theme: {
    extend: {
      colors: {
        bg: 'rgb(var(--bg) / <alpha-value>)',
        surface: 'rgb(var(--surface) / <alpha-value>)',
        'surface-raised': 'rgb(var(--surface-raised) / <alpha-value>)',
        border: 'rgb(var(--border) / <alpha-value>)',
        'border-strong': 'rgb(var(--border-strong) / <alpha-value>)',
        accent: 'rgb(var(--accent) / <alpha-value>)',
        'accent-hover': 'rgb(var(--accent-hover) / <alpha-value>)',
        'accent-soft': 'rgb(var(--accent-soft) / <alpha-value>)',
        'st-pending': 'rgb(var(--st-pending) / <alpha-value>)',
        'st-progress': 'rgb(var(--st-progress) / <alpha-value>)',
        'st-assigned': 'rgb(var(--st-assigned) / <alpha-value>)',
        'st-resolved': 'rgb(var(--st-resolved) / <alpha-value>)',
        'st-rejected': 'rgb(var(--st-rejected) / <alpha-value>)',
        'st-spam': 'rgb(var(--st-spam) / <alpha-value>)',
        danger: 'rgb(var(--danger) / <alpha-value>)',
      },
      borderRadius: {
        'sm': 'var(--radius-sm, 6px)',
        'md': 'var(--radius-md, 10px)',
        'lg': 'var(--radius-lg, 14px)',
      },
      boxShadow: {
        'sm': 'var(--shadow-sm)',
        'md': 'var(--shadow-md)',
        'lg': 'var(--shadow-lg)',
      }
    }
  },
  plugins: [],
}
