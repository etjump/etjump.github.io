/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // ETJump brand color
        etjump: {
          DEFAULT: "#77E848",
          50: "#E5FBDB",
          100: "#D6F9C8",
          200: "#B8F4A1",
          300: "#9AEF7A",
          400: "#7CEA53",
          500: "#77E848",
          600: "#52D41E",
          700: "#3FA317",
          800: "#2C7210",
          900: "#194109",
        },
      },
    },
  },
  plugins: [],
};
