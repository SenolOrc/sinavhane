/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef2ff", 100: "#e0e7ff", 200: "#c7d2fe", 500: "#6366f1",
          600: "#4f46e5", 700: "#4338ca",
        },
        risk: { dikkat: "#eab308", kritik: "#ef4444" },
      },
      boxShadow: {
        card: "0 1px 2px 0 rgb(0 0 0 / 0.04), 0 1px 3px 0 rgb(0 0 0 / 0.06)",
        soft: "0 4px 16px -4px rgb(15 23 42 / 0.08)",
      },
      borderRadius: { xl: "0.85rem", "2xl": "1.1rem" },
    },
  },
  plugins: [],
};
