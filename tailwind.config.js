/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
            DEFAULT: '#CD853F', // Terracotta Orange (From Snippet)
            terracotta: '#CD853F',
            50: '#FBE9E7',
            100: '#FFCCBC',
            200: '#FFAB91',
            300: '#FF8A65',
            400: '#FF7043',
            500: '#D2691E',
            600: '#BF360C',
            700: '#D84315',
            800: '#BE561B', 
            900: '#3E2723',
        },
        emerald: {
            deep: '#064E3B', // bg-emerald (From Snippet)
            card: '#065F46', // card-emerald (From Snippet)
            light: '#065f46',
            950: '#022c22',
        },
        beige: {
            DEFAULT: '#F5F0E1', // creamy-beige (From Snippet)
            calendar: '#FDFBF7', // calendar-bg (From Snippet)
        },
        background: {
            light: '#F8FAFC', 
            dark: '#0F172A',
            DEFAULT: '#F8FAFC',
        },
        slate: {
            900: '#0F172A',
            800: '#1E293B',
            700: '#334155',
            500: '#64748B',
            400: '#94A3B8',
            200: '#E2E8F0',
        },
      },
    },
  },
  plugins: [],
}
