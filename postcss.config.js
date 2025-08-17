// postcss.config.js
module.exports = {
  plugins: [
    require('@tailwindcss/postcss')(), // ✅ use this instead of `tailwindcss`
    require('autoprefixer'),
  ],
};
