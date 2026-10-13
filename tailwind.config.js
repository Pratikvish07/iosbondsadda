/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        navy: { DEFAULT: "#0F2A47", light: "#1B3D63", dark: "#0A1E33" },
        brand: { blue: "#0B5E96", orange: "#FF5F3A" },
        success: { DEFAULT: "#16A34A", light: "#DCFCE7", dark: "#15803D" },
        warning: { DEFAULT: "#B45309", light: "#FEF3C7" },
        danger: { DEFAULT: "#DC2626", light: "#FEE2E2" },
        surface: "#F5F7FA",
        line: "#E5E9F0",
        ink: { DEFAULT: "#0F172A", muted: "#64748B", faint: "#94A3B8" },
      },
    },
  },
  plugins: [],
};
