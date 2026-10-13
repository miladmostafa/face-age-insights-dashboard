/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f3efe7",
        ink: "#1c1915",
        muted: "#5f584f",
        line: "#e3dbd0",
        teal: "#0f6e66",
        deep: "#123532",
        clay: "#c4542b",
        card: "#fffdf9",
      },
      fontFamily: {
        serif: ["var(--font-serif)", "Georgia", "serif"],
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(28, 25, 21, 0.04), 0 16px 40px rgba(28, 25, 21, 0.06)",
      },
    },
  },
  plugins: [],
};
