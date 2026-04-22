/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        tdfYellow: "#FFE100",
        tdfGreen: "#00A550",
        tdfRed: "#EF4135",
      },
    },
  },
  plugins: [],
}

