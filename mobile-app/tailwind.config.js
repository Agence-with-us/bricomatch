/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        secondary: "#F95200",
        accent: "#FFF",
        muted: {
          DEFAULT: "#313131",
          disabled: "#515C6F",
        },
        background: {
          DEFAULT:"#F8F8F8",
          muted: "#EBEDEF"
        },
        online: "#31CC15",
        offline: "#bb3b3b"
      },
      fontFamily: {
        'akira-expanded': ['akira-expanded', 'sans-serif'],
      },
      boxShadow: {
        card: '0px 5px 20px rgba(0, 0, 0, 0.05)',
      },
    },
  },
  plugins: [],
}

