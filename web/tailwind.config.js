/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1769FF",
          dark: "#0F52CC",
        },
        ink: "#102044",
        surface: "#F5F8FC",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 8px 24px -8px rgba(16, 32, 68, 0.12)",
        card: "0 2px 12px -2px rgba(16, 32, 68, 0.08)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
