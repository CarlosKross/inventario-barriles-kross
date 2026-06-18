/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        kross: {
          black: "#111111",
          gold: "#d9a441",
          amber: "#b66b2b",
          green: "#2f6b4f",
          cream: "#f7f3e8"
        }
      },
      boxShadow: {
        soft: "0 18px 45px rgba(17, 17, 17, 0.08)"
      }
    }
  },
  plugins: []
};
