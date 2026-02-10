/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        primary: {
            DEFAULT: '#00C853', // Vivid Green
            50: '#E0F7FA',
            100: '#B9F6CA',
            200: '#69F0AE',
            300: '#00E676',
            400: '#00C853',
            500: '#00C853',
            600: '#009624', // Darker green for contrast
            700: '#00600F',
            800: '#003300',
            900: '#00251a',
        },
        background: {
            light: '#F5F7F8', // Soft white/mint
            dark: '#1B5E20', // Deep Forest Green (Splash)
        }
      },
    },
  },
  plugins: [],
}
