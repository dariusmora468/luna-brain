/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@tremor/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        luna: {
          50: "#f0fdf9",
          100: "#ccfbef",
          200: "#99f6df",
          300: "#5ceacc",
          400: "#2dd4b3",
          500: "#14b89a",
          600: "#0d947e",
          700: "#0f7666",
          800: "#115e53",
          900: "#134e45",
          950: "#042f2a",
        },
      },
    },
  },
  plugins: [],
};
