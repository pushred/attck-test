const browserSync = require('browser-sync').create();
const historyApiFallback = require('connect-history-api-fallback');

browserSync.init({
  server: true,
  files: ['index.html', 'bundle.css', 'bundle.js'],
  middleware: [historyApiFallback()],
  notify: false,
  open: false
});
